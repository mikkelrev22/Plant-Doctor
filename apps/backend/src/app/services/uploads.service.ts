import type { MultipartFile } from '@fastify/multipart';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { config } from '../../config';

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
  imageUrl: string;
  storageKey: string;
  mimeType: string;
  buffer: Buffer;
}

export async function storePlantPhoto(
  file: MultipartFile,
): Promise<StoredUpload> {
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new Error('Unsupported image type');
  }

  const originalExtension = extname(file.filename || '').toLowerCase();
  const extension =
    originalExtension || extensionByMimeType[file.mimetype] || '';
  const dateSegment = new Date().toISOString().slice(0, 10);
  const storageKey = `${dateSegment}/${randomUUID()}${extension}`;
  const uploadRoot = resolve(process.cwd(), config.uploadDir);
  const absolutePath = join(uploadRoot, storageKey);
  const buffer = await file.toBuffer();

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    imageUrl: `${config.backendUrl}/uploads/plant-photos/${storageKey}`,
    storageKey,
    mimeType: file.mimetype,
    buffer,
  };
}
