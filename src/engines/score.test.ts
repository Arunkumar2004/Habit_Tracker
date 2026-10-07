import { describe, expect, it } from 'vitest';
import { bandOf, dayScore, dayStreak } from './score';
import { makeData, setDay } from '../features/today/testdata';

const FULL = { gym: true, walk: true, skin_am: true, skin_pm: true, posture: true, no_junk: true, protein: 130, steps: 10000, water: 3500, sleep: 8 };

describe('dayScore', () => {
  it('the blueprint example day: 4 checks + part credit for counters and sleep', () => {
    const d = makeData({ proteinTargetG: 130 });
    // Thu 8 Oct: all 10 built-in habits are due (gym Mon–Sat, walk 0 of 5 this week).
    setDay(d, '2026-10-08', { gym: true, skin_am: true, posture: true, no_junk: true, water: 2500, protein: 96, steps: 7400, sleep: 7.5 });
    const s = dayScore(d, '2026-10-08');
    expect(s.total).toBe(10);
    expect(s.done).toBe(4);
    // 4 + 2500/3500 + 96/130 + 7400/10000 + 7.5/8 = 7.1302 → 0.713
    expect(s.score).toBeCloseTo(0.713, 3);
    expect(s.band).toBe('ok');
  });
  it('counters give part credit (2.5 of 3.5 L = 0.71) and cap at 1', () => {
    const d = makeData({ habits: ['water', 'sleep'] });
    setDay(d, '2026-10-08', { water: 2500, sleep: 10 });
    const s = dayScore(d, '2026-10-08');
    expect(s.score).toBeCloseTo((2500 / 3500 + 1) / 2, 4);
    expect(s.done).toBe(1);
  });
  it('protein uses the nutrition target, not habit.target', () => {
    const d = makeData({ habits: ['protein'], proteinTargetG: 150 });
    setDay(d, '2026-10-08', { protein: 130 }); // would be 100% against habit.target 130
    expect(dayScore(d, '2026-10-08').score).toBeCloseTo(130 / 150, 4);
  });
  it('unscheduled habits do not count (gym on Sunday)', () => {
    const d = makeData({ habits: ['gym', 'skin_am'] });
    setDay(d, '2026-10-11', { skin_am: true });
    expect(dayScore(d, '2026-10-11')).toEqual({ score: 1, done: 1, total: 1, band: 'great' });
  });
  it('archived habits do not count; nothing due gives 0', () => {
    const d = makeData({ habits: ['skin_am'] });
    d.habits.skin_am.archived = true;
    expect(dayScore(d, '2026-10-08')).toEqual({ score: 0, done: 0, total: 0, band: 'missed' });
  });
  it('bands: 80%+ great, 50–79% ok, under 50% missed', () => {
    expect(bandOf(0.8)).toBe('great');
    expect(bandOf(0.79)).toBe('ok');
    expect(bandOf(0.5)).toBe('ok');
    expect(bandOf(0.49)).toBe('missed');
  });
});

describe('dayStreak', () => {
  it('counts days in a row at 80%+, ending today', () => {
    const d = makeData();
    for (const day of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']) setDay(d, day, FULL);
    expect(dayStreak(d, '2026-10-08')).toBe(4);
  });
  it('today not yet at 80% does not break the streak (counts to yesterday)', () => {
    const d = makeData();
    for (const day of ['2026-10-05', '2026-10-06', '2026-10-07']) setDay(d, day, FULL);
    setDay(d, '2026-10-08', { skin_am: true });
    expect(dayStreak(d, '2026-10-08')).toBe(3);
  });
  it('a day under 80% breaks it', () => {
    const d = makeData();
    setDay(d, '2026-10-05', FULL);
    setDay(d, '2026-10-06', { skin_am: true, skin_pm: true }); // low
    setDay(d, '2026-10-07', FULL);
    expect(dayStreak(d, '2026-10-07')).toBe(1);
  });
  it('stops at the plan start date', () => {
    const d = makeData({ start: '2026-10-06' });
    for (const day of ['2026-10-05', '2026-10-06', '2026-10-07']) setDay(d, day, FULL);
    expect(dayStreak(d, '2026-10-07')).toBe(2);
  });
});
