/**
 * Shared date formatting helpers. Both call sites that previously inlined their
 * own formatter (the report detail screen and the report list item) now use
 * these, so the `NaN`-guard and locale handling live in one place.
 *
 * Pure data (no React) so it's trivially unit-testable.
 */

/**
 * Formats an ISO timestamp as a full localized date+time string.
 * Falls back to the raw input when it can't be parsed (NaN date).
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/**
 * Formats an ISO timestamp as a short localized date (e.g. "Mar 15, 2024").
 * Falls back to the raw input when it can't be parsed (NaN date).
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}