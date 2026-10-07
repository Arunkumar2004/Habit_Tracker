import { describe, expect, it } from 'vitest';
import { emptyData } from '../../store/storage';
import type { Data } from '../../types';
import { lowestArea, signals, weekLog, weekStarts } from './logic';

function base(): Data {
  const d = emptyData();
  d.profile.me = {
    id: 'me', updatedAt: 1, name: 'Arun', startDate: '2026-10-05', heightCm: 185, weightKg: 72, bodyType: 'average',
    diet: 'non_veg', currency: 'INR', theme: 'auto', monthlyBudget: 20000, onboarded: true, proteinTargetG: 130,
  };
  return d;
}
const day = (d: Data, date: string, habits: Record<string, boolean | number>, weightKg?: number) =>
  (d.days[date] = { id: date, date, updatedAt: 1, habits, weightKg });

describe('weekly log', () => {
  it('fills a week from days, workouts and the review', () => {
    const d = base();
    day(d, '2026-10-05', { gym: true, protein: 140, sleep: 7, walk: true }, 72.4);
    day(d, '2026-10-06', { gym: true, protein: 100, sleep: 8 }, 72.0);
    day(d, '2026-10-07', { walk: true, protein: 130 });
    d.workouts.w1 = { id: 'w1', updatedAt: 1, date: '2026-10-05', session: 'upper_a', minutes: 60, exercises: [], finished: true };
    d.workouts.w2 = { id: 'w2', updatedAt: 1, date: '2026-10-10', session: 'cardio_skills', minutes: 40, exercises: [], finished: true };
    d.measurements.m1 = { id: 'm1', updatedAt: 1, date: '2026-10-05', waistCm: 82 };
    d.reviews['2026-10-05'] = {
      id: '2026-10-05', updatedAt: 1, weekStart: '2026-10-05', weekNo: 1, lowest: 'posture', fixOne: 'Wall hold',
      scores: { physique: 5, posture: 3, skin: 6, hair_beard: 6, walk: 4, posing: 4, style: 5, sleep: 7, food: 6, confidence: 5 },
    };
    const w = weekLog(d, '2026-10-05', '2026-10-11');
    expect(w).toMatchObject({
      weekNo: 1, weight: 72.2, waist: 82, gym: 1, sleepAvg: 7.5, proteinDays: 2, cardio: 1, walks: 2,
      lowest: 'posture', lowestScore: 3, notes: 'Wall hold',
    });
  });
  it('falls back to gym ticks when no workouts were logged', () => {
    const d = base();
    for (const date of ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09', '2026-10-10']) day(d, date, { gym: true });
    expect(weekLog(d, '2026-10-05', '2026-10-11').gym).toBe(4);
  });
  it('lists weeks newest first from the start week', () => {
    expect(weekStarts(base(), '2026-10-21')).toEqual(['2026-10-19', '2026-10-12', '2026-10-05']);
  });
});

describe('lowest area', () => {
  it('picks the lowest, first listed on a tie', () => {
    const s = { physique: 5, posture: 3, skin: 3, hair_beard: 6, walk: 4, posing: 4, style: 5, sleep: 7, food: 6, confidence: 5 };
    expect(lowestArea(s)).toBe('posture');
  });
});

describe('signals', () => {
  it('reads body from waist vs start and walk from the last 7 days', () => {
    const d = base();
    d.measurements.a = { id: 'a', updatedAt: 1, date: '2026-10-05', waistCm: 84, shouldersCm: 112 };
    d.measurements.b = { id: 'b', updatedAt: 1, date: '2026-11-02', waistCm: 82.5, shouldersCm: 114 };
    for (const date of ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-31']) day(d, date, { walk: true, skin_am: true, skin_pm: true });
    const s = signals(d, '2026-11-02');
    expect(s[0]).toMatchObject({ id: 'body', state: 'ok', detail: 'Waist −1.5 cm vs start' });
    expect(s[2]).toMatchObject({ id: 'walk', state: 'ok' });
    expect(s[1]).toMatchObject({ id: 'face', state: 'warn' });
  });
});
