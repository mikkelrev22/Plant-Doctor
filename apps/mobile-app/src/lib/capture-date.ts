import type { ImagePickerAsset } from 'expo-image-picker';
import { parseExifDate } from './parse-exif-date';

/**
 * Read the photo's capture date from the picker asset's EXIF.
 *
 * `expo-image-picker` only populates `asset.exif` on Android/iOS (the `exif:
 * true` option is documented as a no-op on web). The web build has a separate
 * implementation in `capture-date.web.ts`, which Metro resolves only for the web
 * platform — so this native path (and the `exifr` dependency it would need) is
 * never bundled into the native app.
 */
export async function readCaptureDate(
  asset: ImagePickerAsset,
): Promise<string | undefined> {
  return parseExifDate(asset.exif?.DateTimeOriginal ?? asset.exif?.DateTime);
}