import { describe, expect, it } from 'vitest';
import { compact, labelEvery, linear, niceStep, niceTicks } from './scale';

describe('niceStep', () => {
  it('picks 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(87, 4)).toBe(25);
    expect(niceStep(10, 4)).toBe(2.5);
    expect(niceStep(7, 4)).toBe(2);
    expect(niceStep(1_000, 3)).toBe(500);
    expect(niceStep(0.9, 4)).toBe(0.25);
  });
  it('falls back to 1 for empty or invalid ranges', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(NaN)).toBe(1);
  });
});

describe('niceTicks', () => {
  it('covers the range on whole steps', () => {
    expect(niceTicks(0, 100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(0, 87)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(0, 42_000, 4)).toEqual([0, 20_000, 40_000, 60_000]);
    expect(niceTicks(0, 38_000, 4)).toEqual([0, 10_000, 20_000, 30_000, 40_000]);
  });
  it('handles ranges that do not start at zero', () => {
    expect(niceTicks(71.4, 74.2, 4)).toEqual([71, 72, 73, 74, 75]);
    expect(niceTicks(-30, 70, 4)).toEqual([-50, -25, 0, 25, 50, 75]);
  });
  it('keeps decimal ticks exact', () => {
    expect(niceTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(0.1, 0.3, 2)).toEqual([0.1, 0.2, 0.3]);
  });
  it('widens a flat range towards zero', () => {
    expect(niceTicks(0, 0)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(50, 50)[0]).toBe(0);
    expect(niceTicks(50, 50).at(-1)).toBeGreaterThanOrEqual(50);
    expect(niceTicks(-8, -8).at(-1)).toBe(0);
  });
  it('accepts reversed bounds and rejects non-finite input', () => {
    expect(niceTicks(100, 0)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(NaN, 3)).toEqual([0, 1]);
  });
  it('never returns negative zero', () => {
    for (const t of niceTicks(-1, 1)) expect(Object.is(t, -0)).toBe(false);
  });
});

describe('linear', () => {
  it('maps the domain onto the range, including inverted ranges', () => {
    const y = linear(0, 100, 200, 0);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });
  it('maps a zero-width domain to the middle', () => {
    expect(linear(5, 5, 0, 10)(5)).toBe(5);
  });
});

describe('labelEvery', () => {
  it('thins labels that would overlap', () => {
    expect(labelEvery(30, 10, 30)).toBe(4);
    expect(labelEvery(7, 50, 24)).toBe(1);
    expect(labelEvery(1, 5, 100)).toBe(1);
  });
});

describe('compact', () => {
  it('shortens big numbers with Indian units', () => {
    expect(compact(950)).toBe('950');
    expect(compact(12_500)).toBe('12.5k');
    expect(compact(250_000)).toBe('2.5L');
    expect(compact(30_000_000)).toBe('3Cr');
    expect(compact(-1_500)).toBe('−1.5k');
    expect(compact(0.25)).toBe('0.25');
  });
});
