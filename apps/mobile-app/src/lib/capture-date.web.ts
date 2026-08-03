import type { ImagePickerAsset } from 'expo-image-picker';
import * as exifr from 'exifr';
import { parseExifDate } from './parse-exif-date';

/**
 * Web implementation of {@link readCaptureDate}.
 *
 * `expo-image-picker` doesn't surface EXIF in the browser, so fetch the
 * original file bytes (the picker returns a `blob:` URL) and parse
 * `DateTimeOriginal` with `exifr`. The bytes still carry EXIF here because we
 * read them *before* `normalizeToJpeg` re-encodes to a fresh JPEG (which strips
 * EXIF) — the extracted date is then sent as the `capturedAt` form field.
 *
 * This module is only resolved on web (Metro picks `capture-date.web.ts` over
 * `capture-date.ts`), keeping `exifr` out of the native bundle.
 */
export async function readCaptureDate(
  asset: ImagePickerAsset,
): Promise<string | undefined> {
  try {
    const blob = await (await fetch(asset.uri)).blob();
    const exif = await exifr.parse(blob, { reviveValues: false });
    return parseExifDate(exif?.DateTimeOriginal ?? exif?.DateTime);
  } catch {
    // No/invalid EXIF (e.g. PNG screenshot) — let the backend fall back to now.
    return undefined;
  }
}