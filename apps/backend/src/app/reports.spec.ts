import { resolveCapturedAt, sanitizeCaptureDate } from './routes/reports';

describe('resolveCapturedAt', () => {
  it('returns null for missing/empty input', () => {
    expect(resolveCapturedAt(undefined)).toBeNull();
    expect(resolveCapturedAt(null)).toBeNull();
    expect(resolveCapturedAt('')).toBeNull();
  });

  it('returns null for unparseable strings', () => {
    expect(resolveCapturedAt('not-a-date')).toBeNull();
    expect(resolveCapturedAt('garbage')).toBeNull();
  });

  it('returns the parsed date for a valid past ISO string', () => {
    const iso = '2024-03-15T10:30:00.000Z';
    const result = resolveCapturedAt(iso);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(new Date(iso).getTime());
  });

  it('returns null for a future date (clock skew / spoofed EXIF)', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    expect(resolveCapturedAt(future)).toBeNull();
  });

  it('returns null for implausibly old dates (before 2000)', () => {
    expect(resolveCapturedAt('1999-01-01T00:00:00.000Z')).toBeNull();
    expect(resolveCapturedAt('1970-01-01T00:00:00.000Z')).toBeNull();
  });

  it('accepts a date at the 2000 boundary', () => {
    const iso = '2000-01-01T00:00:00.000Z';
    expect(resolveCapturedAt(iso)).toBeInstanceOf(Date);
  });
});

describe('sanitizeCaptureDate', () => {
  it('returns null for null/undefined', () => {
    expect(sanitizeCaptureDate(null)).toBeNull();
    expect(sanitizeCaptureDate(undefined)).toBeNull();
  });

  it('returns null for an invalid Date (NaN)', () => {
    expect(sanitizeCaptureDate(new Date('not-a-date'))).toBeNull();
  });

  it('returns the date unchanged when valid', () => {
    const d = new Date('2024-03-15T10:30:00.000Z');
    expect(sanitizeCaptureDate(d)).toBe(d);
  });

  it('returns null for a future date', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(sanitizeCaptureDate(future)).toBeNull();
  });

  it('returns null for dates before 2000', () => {
    expect(sanitizeCaptureDate(new Date('1999-12-31T23:59:59.000Z'))).toBeNull();
  });
});