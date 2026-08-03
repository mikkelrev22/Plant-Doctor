import { describe, expect, it } from 'vitest';
import { isAbsoluteUrl } from './urls';

describe('isAbsoluteUrl', () => {
  it('returns true for http(s) URLs', () => {
    expect(isAbsoluteUrl('http://localhost:4100/uploads/a.jpg')).toBe(true);
    expect(isAbsoluteUrl('https://example.com/x.png')).toBe(true);
    expect(isAbsoluteUrl('HTTPS://Example.com')).toBe(true);
  });

  it('returns false for non-absolute inputs', () => {
    expect(isAbsoluteUrl('/uploads/a.jpg')).toBe(false);
    expect(isAbsoluteUrl('uploads/a.jpg')).toBe(false);
    expect(isAbsoluteUrl('')).toBe(false);
    expect(isAbsoluteUrl(null)).toBe(false);
    expect(isAbsoluteUrl(undefined)).toBe(false);
  });
});