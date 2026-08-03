import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import * as exifr from 'exifr';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestError } from '../errors';
import { storage } from './storage';
import {
  DISPLAY_JPEG_QUALITY,
  DISPLAY_MAX_DIMENSION,
  THUMB_JPEG_QUALITY,
  THUMB_MAX_DIMENSION,
} from './image-variants';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export interface StoredUpload {
  // Original
  imageUrl: string;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  buffer: Buffer;
  /** When the photo was taken, parsed from the uploaded bytes' EXIF
   *  `DateTimeOriginal` (falls back to `DateTime`). `null` when the image has
   *  no usable EXIF date — e.g. screenshots, PNGs, or HEIC the parser can't
   *  read. Used as the fallback when the client doesn't send `capturedAt`. */
  exifCapturedAt: Date | null;
  // 1024px JPEG used for display and the LLM call
  display: {
    imageUrl: string;
    storageKey: string;
    mimeType: string;
    buffer: Buffer;
    width: number;
    height: number;
  };
  // 160px JPEG thumbnail
  thumbnail: {
    imageUrl: string;
    storageKey: string;
    width: number;
    height: number;
  };
}

/**
 * Parse an EXIF date string (`"YYYY:MM:DD HH:MM:SS"`, no timezone) into a
 * `Date`, or `null` when missing/unparseable. EXIF dates carry no timezone, so
 * the wall-clock is treated as UTC — the stored date then matches what the user
 * sees in the file, independent of the server's local timezone. (Sanity
 * checks — future / pre-2000 — are applied by the caller in `reports.ts`.)
 */
export function parseExifDateTime(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw === '') return null;
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!match) return null;
  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1, // EXIF month is 1-indexed; Date expects 0-indexed.
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    ),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Read the photo's capture date from the uploaded bytes' EXIF metadata.
 * `reviveValues: false` keeps the raw EXIF string so we control the timezone
 * handling ourselves (see `parseExifDateTime`). Returns `null` if the image has
 * no EXIF or the date can't be parsed — never throws.
 */
async function extractExifCaptureDate(buffer: Buffer): Promise<Date | null> {
  try {
    const exif = await exifr.parse(buffer, { reviveValues: false });
    return parseExifDateTime(exif?.DateTimeOriginal ?? exif?.DateTime);
  } catch {
    return null;
  }
}

export async function storePlantPhoto(
  file: MultipartFile,
): Promise<StoredUpload> {
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new BadRequestError('Unsupported image type');
  }

  const originalExtension = extname(file.filename || '').toLowerCase();
  const extension =
    originalExtension || extensionByMimeType[file.mimetype] || '';
  const dateSegment = new Date().toISOString().slice(0, 10);
  const id = randomUUID();
  const storageKey = `${dateSegment}/${id}${extension}`;
  const displayStorageKey = `${dateSegment}/${id}-1024.jpg`;
  const thumbStorageKey = `${dateSegment}/${id}-thumb.jpg`;
  const buffer = await file.toBuffer();

  // Decode the image once to capture original dimensions, then build the two
  // derived variants from independent sharp instances. Using fresh pipelines
  // (rather than .clone() of a shared instance) keeps the parallel resize
  // calls independent and predictable.
  const sourceImage = sharp(buffer, { failOn: 'none' });
  const originalMetadata = await sourceImage.metadata();

  const displayPipeline = sharp(buffer, { failOn: 'none' })
    .resize({
      fit: 'inside',
      width: DISPLAY_MAX_DIMENSION,
      height: DISPLAY_MAX_DIMENSION,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: DISPLAY_JPEG_QUALITY,
      progressive: true,
      force: true,
    });

  const thumbPipeline = sharp(buffer, { failOn: 'none' })
    .resize({
      fit: 'inside',
      width: THUMB_MAX_DIMENSION,
      height: THUMB_MAX_DIMENSION,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: THUMB_JPEG_QUALITY,
      progressive: true,
      force: true,
    });

  // Render the derived variants to memory first. A corrupt or spoofed upload
  // fails here — before anything is persisted — so we never leave an orphaned
  // original behind. EXIF parsing runs in the same batch — it reads only the
  // small EXIF segment, so it's effectively free alongside the pixel work.
  const [displayResult, thumbResult, exifCapturedAt] = await Promise.all([
    displayPipeline.toBuffer({ resolveWithObject: true }),
    thumbPipeline.toBuffer({ resolveWithObject: true }),
    extractExifCaptureDate(buffer),
  ]);

  // All three buffers are ready — persist them as a set, in parallel. If any
  // write fails (e.g. disk full / S3 error), roll back the ones that landed so
  // we don't leave a partial set behind. Writing in parallel collapses three
  // sequential network round-trips (notable on S3) into one without changing
  // the rollback guarantee.
  const writes = [
    { key: storageKey, data: buffer, mimeType: file.mimetype },
    { key: displayStorageKey, data: displayResult.data, mimeType: 'image/jpeg' },
    { key: thumbStorageKey, data: thumbResult.data, mimeType: 'image/jpeg' },
  ];
  const results = await Promise.allSettled(
    writes.map((write) => storage.putObject(write.key, write.data, write.mimeType)),
  );
  const firstFailure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (firstFailure) {
    const writtenKeys = writes
      .filter((_, index) => results[index].status === 'fulfilled')
      .map((write) => write.key);
    await Promise.all(writtenKeys.map((key) => storage.deleteObject(key)));
    throw firstFailure.reason;
  }

  return {
    imageUrl: storage.publicUrl(storageKey),
    storageKey,
    mimeType: file.mimetype,
    width: originalMetadata.width ?? null,
    height: originalMetadata.height ?? null,
    buffer,
    exifCapturedAt,
    display: {
      imageUrl: storage.publicUrl(displayStorageKey),
      storageKey: displayStorageKey,
      mimeType: 'image/jpeg',
      buffer: displayResult.data,
      width: displayResult.info.width,
      height: displayResult.info.height,
    },
    thumbnail: {
      imageUrl: storage.publicUrl(thumbStorageKey),
      storageKey: thumbStorageKey,
      width: thumbResult.info.width,
      height: thumbResult.info.height,
    },
  };
}
