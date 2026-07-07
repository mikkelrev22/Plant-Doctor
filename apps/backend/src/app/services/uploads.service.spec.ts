import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import type { MultipartFile } from '@fastify/multipart';

// Mock config before importing the service under test.
jest.mock('../../config', () => ({
  config: {
    uploadDir: 'uploads/plant-photos',
    backendUrl: 'http://test.local',
  },
}));

import { storePlantPhoto } from './uploads.service';

function makeMultipartFile(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): MultipartFile {
  return {
    filename,
    mimetype,
    encoding: '7bit',
    fieldname: 'image',
    type: 'file',
    toBuffer: async () => buffer,
    file: {
      truncated: false,
    } as MultipartFile['file'],
  } as unknown as MultipartFile;
}

async function makeJpegBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 80, g: 160, b: 90 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe('storePlantPhoto', () => {
  let cwd: string;
  let originalCwd: string;

  beforeAll(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'uploads-svc-'));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it('rejects unsupported mime types', async () => {
    const file = makeMultipartFile(Buffer.from('not an image'), 'a.gif', 'image/gif');
    await expect(storePlantPhoto(file)).rejects.toThrow('Unsupported image type');
  });

  it('writes original, 1024px display, and 160px thumbnail and returns their metadata', async () => {
    const big = await makeJpegBuffer(2400, 1600);
    const file = makeMultipartFile(big, 'plant.jpg', 'image/jpeg');

    const result = await storePlantPhoto(file);

    // Three files on disk. storageKey already begins with `<dateSegment>/`,
    // so the on-disk path is `<uploadRoot>/<storageKey>`.
    const dateSegment = new Date().toISOString().slice(0, 10);
    const dateDir = join(cwd, 'uploads', 'plant-photos');
    const originalPath = join(dateDir, result.storageKey);
    const displayPath = join(dateDir, result.display.storageKey);
    const thumbPath = join(dateDir, result.thumbnail.storageKey);

    const [originalStat, displayStat, thumbStat] = await Promise.all([
      stat(originalPath),
      stat(displayPath),
      stat(thumbPath),
    ]);

    expect(originalStat.isFile()).toBe(true);
    expect(displayStat.isFile()).toBe(true);
    expect(thumbStat.isFile()).toBe(true);

    // Sanity: the dateSegment appears exactly once in the storage keys.
    expect(result.storageKey.startsWith(`${dateSegment}/`)).toBe(true);
    expect(result.display.storageKey.startsWith(`${dateSegment}/`)).toBe(true);
    expect(result.thumbnail.storageKey.startsWith(`${dateSegment}/`)).toBe(true);

    // The original is preserved byte-for-byte
    const originalBytes = await readFile(originalPath);
    expect(originalBytes.equals(big)).toBe(true);

    // Display variant: long edge ≤ 1024, mime JPEG
    expect(result.display.mimeType).toBe('image/jpeg');
    expect(Math.max(result.display.width, result.display.height)).toBeLessThanOrEqual(1024);
    const displayMeta = await sharp(await readFile(displayPath)).metadata();
    expect(displayMeta.format).toBe('jpeg');

    // Thumbnail: long edge ≤ 160
    expect(Math.max(result.thumbnail.width, result.thumbnail.height)).toBeLessThanOrEqual(160);
    const thumbMeta = await sharp(await readFile(thumbPath)).metadata();
    expect(thumbMeta.format).toBe('jpeg');

    // URLs are well-formed and point to the right keys
    expect(result.imageUrl).toBe(`http://test.local/uploads/plant-photos/${result.storageKey}`);
    expect(result.display.imageUrl).toBe(
      `http://test.local/uploads/plant-photos/${result.display.storageKey}`,
    );
    expect(result.thumbnail.imageUrl).toBe(
      `http://test.local/uploads/plant-photos/${result.thumbnail.storageKey}`,
    );
  });

  it('does not upscale images that already fit inside the display limit', async () => {
    // 400x300 fits inside the 1024x1024 display box, so withoutEnlargement
    // keeps it at the source dimensions. The thumbnail's 160 max is smaller
    // than the source's long edge, so the thumb IS downscaled — verifying
    // both behaviors in one case.
    const small = await makeJpegBuffer(400, 300);
    const file = makeMultipartFile(small, 'p.jpg', 'image/jpeg');

    const result = await storePlantPhoto(file);

    expect(result.display.width).toBe(400);
    expect(result.display.height).toBe(300);

    // Thumbnail is downscaled to fit inside 160x160, preserving aspect.
    expect(Math.max(result.thumbnail.width, result.thumbnail.height)).toBeLessThanOrEqual(160);
    // Aspect ratio is preserved (4:3 source → 4:3 thumb)
    expect(result.thumbnail.width / result.thumbnail.height).toBeCloseTo(400 / 300, 2);
  });
});
