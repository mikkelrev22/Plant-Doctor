import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { readFile, mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { config } from '../../config';

export interface Storage {
  /** Persist a file under the given (relative) key. */
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Read a file previously written with putObject. */
  getObject(key: string): Promise<{ buffer: Buffer; mimeType: string }>;
  /** Remove a file previously written with putObject. No-op if missing. */
  deleteObject(key: string): Promise<void>;
  /** Public URL the client can fetch the stored object from. */
  publicUrl(key: string): string;
}

const mimeTypeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

function mimeTypeFromKey(key: string): string {
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
  return mimeTypeByExtension[ext] ?? 'application/octet-stream';
}

let cachedS3: S3Client | null = null;
function s3Client(): S3Client {
  if (!cachedS3) {
    // Credentials are auto-loaded from the environment — on EC2, from the IAM
    // instance profile via IMDS, so no keys need to be configured.
    cachedS3 = new S3Client({ region: config.s3Region });
  }
  return cachedS3;
}

function s3Key(key: string): string {
  return `${config.s3Prefix}${key}`;
}

function s3BaseUrl(): string {
  return (
    config.s3PublicBaseUrl ||
    `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com`
  );
}

const s3Storage: Storage = {
  async putObject(key, body, contentType) {
    // No ACL: the bucket policy grants public s3:GetObject to everyone, so
    // objects are publicly readable without a per-object ACL. (Per-object ACLs
    // are disabled by default on modern buckets — Bucket owner enforced — and
    // sending one would fail with AccessControlListNotSupported.)
    await s3Client().send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: s3Key(key),
        Body: body,
        ContentType: contentType,
      }),
    );
  },
  async getObject(key) {
    const response = await s3Client().send(
      new GetObjectCommand({ Bucket: config.s3Bucket, Key: s3Key(key) }),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    return {
      buffer: Buffer.concat(chunks),
      mimeType: response.ContentType ?? mimeTypeFromKey(key),
    };
  },
  async deleteObject(key) {
    await s3Client().send(
      new DeleteObjectCommand({
        Bucket: config.s3Bucket,
        Key: s3Key(key),
      }),
    );
  },
  publicUrl(key) {
    return `${s3BaseUrl()}/${s3Key(key)}`;
  },
};

const localStorage: Storage = {
  async putObject(key, body) {
    const uploadRoot = resolve(process.cwd(), config.uploadDir);
    const absolutePath = join(uploadRoot, key);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body);
  },
  async getObject(key) {
    const uploadRoot = resolve(process.cwd(), config.uploadDir);
    const buffer = await readFile(join(uploadRoot, key));
    return { buffer, mimeType: mimeTypeFromKey(key) };
  },
  async deleteObject(key) {
    const uploadRoot = resolve(process.cwd(), config.uploadDir);
    await rm(join(uploadRoot, key), { force: true });
  },
  publicUrl(key) {
    return `${config.backendUrl}/uploads/plant-photos/${key}`;
  },
};

export const storage: Storage =
  config.storageDriver === 's3' ? s3Storage : localStorage;