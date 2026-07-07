import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { config } from '../../config';
import { BadRequestError } from '../errors';
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
  const uploadRoot = resolve(process.cwd(), config.uploadDir);
  const absolutePath = join(uploadRoot, storageKey);
  const displayStorageKey = `${dateSegment}/${id}-1024.jpg`;
  const thumbStorageKey = `${dateSegment}/${id}-thumb.jpg`;
  const displayAbsolutePath = join(uploadRoot, displayStorageKey);
  const thumbAbsolutePath = join(uploadRoot, thumbStorageKey);
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
  // original on disk.
  const [displayResult, thumbResult] = await Promise.all([
    displayPipeline.toBuffer({ resolveWithObject: true }),
    thumbPipeline.toBuffer({ resolveWithObject: true }),
  ]);

  // All three buffers are ready — persist them as a set. If any write fails
  // (e.g. disk full), roll back the ones that landed so we don't leave a
  // partial set behind.
  const writtenPaths: string[] = [];
  try {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    writtenPaths.push(absolutePath);
    await writeFile(displayAbsolutePath, displayResult.data);
    writtenPaths.push(displayAbsolutePath);
    await writeFile(thumbAbsolutePath, thumbResult.data);
    writtenPaths.push(thumbAbsolutePath);
  } catch (error) {
    await Promise.all(
      writtenPaths.map((path) => rm(path, { force: true })),
    );
    throw error;
  }

  return {
    imageUrl: `${config.backendUrl}/uploads/plant-photos/${storageKey}`,
    storageKey,
    mimeType: file.mimetype,
    width: originalMetadata.width ?? null,
    height: originalMetadata.height ?? null,
    buffer,
    display: {
      imageUrl: `${config.backendUrl}/uploads/plant-photos/${displayStorageKey}`,
      storageKey: displayStorageKey,
      mimeType: 'image/jpeg',
      buffer: displayResult.data,
      width: displayResult.info.width,
      height: displayResult.info.height,
    },
    thumbnail: {
      imageUrl: `${config.backendUrl}/uploads/plant-photos/${thumbStorageKey}`,
      storageKey: thumbStorageKey,
      width: thumbResult.info.width,
      height: thumbResult.info.height,
    },
  };
}
