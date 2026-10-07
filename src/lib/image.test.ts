import { describe, expect, it } from 'vitest';
import { fitSize, pickEncoding, MAX_BYTES } from './image';

// Fake encoder: data URL length grows with pixels and quality.
const fake = (bytesPerPixelAtQ1: number) => (w: number, h: number, q: number) =>
  'x'.repeat(Math.round(w * h * q * bytesPerPixelAtQ1));

describe('fitSize', () => {
  it('scales the long edge down to 1080', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1080, height: 810 });
    expect(fitSize(3000, 4000)).toEqual({ width: 810, height: 1080 });
  });
  it('never scales up', () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it('handles empty images', () => {
    expect(fitSize(0, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe('pickEncoding', () => {
  it('keeps the first quality when it is small enough', () => {
    const r = pickEncoding(4000, 3000, fake(0.1));
    expect(r.quality).toBe(0.85);
    expect(r.width).toBe(1080);
    expect(r.dataUrl.length).toBeLessThanOrEqual(MAX_BYTES);
  });
  it('steps the quality down until it fits', () => {
    // 1080×810 = 874,800 px; at 0.3 bytes/px: q .85 → 223 KB, .65 → 171 KB, .55 → 144 KB
    const r = pickEncoding(4000, 3000, fake(0.3));
    expect(r.quality).toBe(0.55);
    expect(r.width).toBe(1080);
    expect(r.dataUrl.length).toBeLessThanOrEqual(MAX_BYTES);
  });
  it('shrinks the size when even the lowest quality is too big', () => {
    const r = pickEncoding(4000, 3000, fake(1));
    expect(r.width).toBeLessThan(1080);
    expect(r.dataUrl.length).toBeLessThanOrEqual(MAX_BYTES);
  });
  it('returns the smallest attempt when nothing fits', () => {
    const r = pickEncoding(4000, 3000, () => 'x'.repeat(MAX_BYTES + 10));
    expect(r.dataUrl.length).toBe(MAX_BYTES + 10);
  });
});
