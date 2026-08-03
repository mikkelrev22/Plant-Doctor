/**
 * Parse an EXIF date string (`"YYYY:MM:DD HH:MM:SS"`, no timezone — the
 * capturing device's local time) into an ISO string, or `undefined` when the
 * value is missing or unparseable.
 *
 * EXIF dates carry no timezone. The mobile app runs on the user's own device,
 * so constructing a local `Date` and emitting its UTC ISO form yields the
 * capture date in the user's timezone — correct for a plant health-progress
 * timeline. (The backend, which runs on a server in an arbitrary timezone,
 * instead treats the EXIF wall-clock as UTC — see `parseExifDateTime` there.)
 *
 * `DateTimeOriginal` is the preferred tag; `DateTime` is the fallback (it's the
 * file-modification time on some devices).
 */
export function parseExifDate(
  raw: string | undefined | null,
): string | undefined {
  if (!raw) return undefined;
  const match = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!match) return undefined;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1, // EXIF month is 1-indexed; Date expects 0-indexed.
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}