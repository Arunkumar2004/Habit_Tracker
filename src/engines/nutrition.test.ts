import { describe, expect, it } from 'vitest';
import { goalFor, kcalAdjustment, targets, weeklyAverages } from './nutrition';
import { DAY_MENUS } from '../data/food';

describe('targets', () => {
  it('kcal = weight × 32 + body-type adjustment', () => {
    expect(targets({ weightKg: 70, bodyType: 'skinny' }).kcal).toBe(2515); // 2240 + 275
    expect(targets({ weightKg: 70, bodyType: 'average' }).kcal).toBe(2240);
    expect(targets({ weightKg: 85, bodyType: 'more_fat' }).kcal).toBe(2270); // 2720 − 450
  });
  it('protein = 1.6–2.0 g per kg, target 1.8 g/kg', () => {
    expect(targets({ weightKg: 72, bodyType: 'average' })).toMatchObject({ proteinMin: 115, proteinMax: 144, proteinTarget: 130 });
  });
  it('uses the protein override when set', () => {
    expect(targets({ weightKg: 72, bodyType: 'average', proteinTargetG: 140 }).proteinTarget).toBe(140);
  });
  it('falls back to 70 kg when weight is missing', () => {
    expect(targets({ weightKg: 0, bodyType: 'average' }).kcal).toBe(2240);
  });
});

describe('2-weekly ±200 kcal check', () => {
  it('gaining too slowly → +200', () => {
    expect(kcalAdjustment([65, 65.1, 65.1], 'gain')).toMatchObject({ delta: 200, change: 0.1 });
  });
  it('gaining too fast → −200', () => {
    expect(kcalAdjustment([65, 65.8, 66.4], 'gain').delta).toBe(-200);
  });
  it('gain on track → 0', () => {
    expect(kcalAdjustment([65, 65.3, 65.6], 'gain').delta).toBe(0);
  });
  it('losing: not dropping → −200, dropping too fast → +200, on track → 0', () => {
    expect(kcalAdjustment([85, 85, 84.9], 'lose').delta).toBe(-200);
    expect(kcalAdjustment([85, 84, 83.5], 'lose').delta).toBe(200);
    expect(kcalAdjustment([85, 84.7, 84.4], 'lose').delta).toBe(0);
  });
  it('holding: within ±0.5 kg stays the same', () => {
    expect(kcalAdjustment([72, 72.3, 72.4], 'hold').delta).toBe(0);
    expect(kcalAdjustment([72, 72.5, 72.8], 'hold').delta).toBe(-200);
  });
  it('compares the newest week with 2 weeks before it, and needs 3 weeks', () => {
    expect(kcalAdjustment([60, 65, 65.1, 65.2], 'gain')).toMatchObject({ change: 0.2, delta: 200 });
    expect(kcalAdjustment([65, 65.5], 'gain')).toMatchObject({ delta: 0, change: null });
    expect(kcalAdjustment([65, NaN, 65.2, 65.3], 'gain').change).toBe(0.3);
  });
  it('goal follows body type', () => {
    expect([goalFor('skinny'), goalFor('average'), goalFor('more_fat')]).toEqual(['gain', 'hold', 'lose']);
  });
  it('weeklyAverages averages each week and gives NaN for empty weeks', () => {
    const avgs = weeklyAverages(
      [{ date: '2026-10-05', kg: 70 }, { date: '2026-10-07', kg: 71 }, { date: '2026-10-19', kg: 72 }],
      ['2026-10-05', '2026-10-12', '2026-10-19'],
    );
    expect(avgs[0]).toBe(70.5);
    expect(Number.isNaN(avgs[1])).toBe(true);
    expect(avgs[2]).toBe(72);
  });
});

describe('day menus', () => {
  it('veg ≈ 2,300 kcal and 128 g protein; non-veg ≈ 2,300 kcal and 141 g', () => {
    expect([DAY_MENUS.veg.kcal, DAY_MENUS.veg.protein]).toEqual([2300, 128]);
    expect([DAY_MENUS.non_veg.kcal, DAY_MENUS.non_veg.protein]).toEqual([2300, 141]);
  });
});
