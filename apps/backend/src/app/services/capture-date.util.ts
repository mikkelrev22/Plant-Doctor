/** Earliest plausible capture date — digital photos predate this only with
 *  garbage EXIF, so anything older is treated as "no date". */
const MIN_CAPTURE_DATE_MS = new Date('2000-01-01T00:00:00Z').getTime();

/**
 * Sanity-check a parsed capture date: drop `NaN`, future dates (clock skew or a
 * spoofed EXIF tag — a report must not pre-date "now"), and implausibly old
 * dates (before 2000). Returns the same `Date` when valid, otherwise `null`.
 */
export function sanitizeCaptureDate(
  date: Date | null | undefined,
): Date | null {
  if (!date) return null;
  const ms = date.getTime();
  if (Number.isNaN(ms)) return null;
  if (ms > Date.now()) return null;
  if (ms < MIN_CAPTURE_DATE_MS) return null;
  return date;
}

/**
 * Turn the client-sent `capturedAt` (an ISO string from the mobile app, which
 * read EXIF `DateTimeOriginal` in the picker) into a sanitized `Date`, or
 * `null` when it should be ignored. The mobile app re-encodes its upload and
 * strips EXIF from the bytes, so it sends the date as this separate field.
 */
export function resolveCapturedAt(
  raw: string | undefined | null,
): Date | null {
  if (raw === undefined || raw === null || raw === '') return null;
  return sanitizeCaptureDate(new Date(raw));
}