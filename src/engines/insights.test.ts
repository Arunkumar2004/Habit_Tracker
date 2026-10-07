import { describe, expect, it } from 'vitest';
import {
  backupInsight, bestStreakInsight, foodSpendInsight, gymProgressInsight, habitStreak, insights, nextMeasureDate,
  proteinInsight, remeasureInsight,
} from './insights';
import { emptyData } from '../store/storage';
import type { Data, Habit, Workout } from '../types';
import { addDays } from '../lib/date';

const TODAY = '2026-10-21'; // Wednesday

function base(): Data {
  const d = emptyData();
  d.profile.me = {
    id: 'me', updatedAt: 1, name: 'Arun', startDate: '2026-09-01', heightCm: 185, weightKg: 72, bodyType: 'average',
    diet: 'non_veg', currency: 'INR', theme: 'auto', monthlyBudget: 20000, onboarded: true, proteinTargetG: 130,
  };
  return d;
}
function habit(id: string, name: string, extra: Partial<Habit> = {}): Habit {
  return { id, name, icon: 'dot', group: 'model', type: 'check', target: 1, schedule: { kind: 'daily' }, order: 1, archived: false, updatedAt: 1, ...extra };
}
function setDay(d: Data, date: string, habits: Record<string, boolean | number>) {
  const cur = d.days[date] ?? { id: date, date, habits: {}, updatedAt: 1 };
  d.days[date] = { ...cur, habits: { ...cur.habits, ...habits } };
}

describe('protein', () => {
  it('counts the last 7 full days against the target', () => {
    const d = base();
    for (let i = 1; i <= 7; i++) setDay(d, addDays(TODAY, -i), { protein: i <= 3 ? 135 : 90 });
    setDay(d, TODAY, { protein: 200 }); // today does not count
    expect(proteinInsight(d, TODAY)).toEqual({ id: 'protein', text: 'Protein hit only 3/7 days last week', tone: 'warn' });
  });
  it('is good at 6/7', () => {
    const d = base();
    for (let i = 1; i <= 6; i++) setDay(d, addDays(TODAY, -i), { protein: 130 });
    expect(proteinInsight(d, TODAY)?.tone).toBe('good');
    expect(proteinInsight(d, TODAY)?.text).toBe('Protein hit 6/7 days last week');
  });
  it('waits for 3 days of history', () => {
    const d = base();
    d.profile.me!.startDate = addDays(TODAY, -2);
    expect(proteinInsight(d, TODAY)).toBeNull();
  });
});

describe('food spend', () => {
  it('compares this month so far with the same days last month', () => {
    const d = base();
    const tx = (id: string, date: string, amount: number, category = 'food') =>
      (d.transactions[id] = { id, updatedAt: 1, type: 'expense', amount, category, account: 'upi', date, career: false });
    tx('a', '2026-09-05', 2000);
    tx('b', '2026-09-25', 9000); // after the 21st: not compared
    tx('c', '2026-10-03', 2500);
    tx('d', '2026-10-04', 999, 'transport');
    expect(foodSpendInsight(d, TODAY)).toEqual({ id: 'food_spend', text: 'Food spend +25% vs last month', tone: 'warn' });
  });
  it('says nothing under 10% or without last month', () => {
    const d = base();
    d.transactions.c = { id: 'c', updatedAt: 1, type: 'expense', amount: 500, category: 'food', account: 'upi', date: '2026-10-03', career: false };
    expect(foodSpendInsight(d, TODAY)).toBeNull();
  });
});

describe('streaks', () => {
  it('skips unscheduled days and leaves today open', () => {
    const d = base();
    const gym = habit('gym', 'Gym', { schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5, 6] } });
    d.habits.gym = gym;
    // Tue 20, Mon 19, (Sun 18 unscheduled), Sat 17, Fri 16 done; Thu 15 missed
    for (const date of ['2026-10-20', '2026-10-19', '2026-10-17', '2026-10-16']) setDay(d, date, { gym: true });
    expect(habitStreak(d, gym, TODAY)).toBe(4);
    setDay(d, TODAY, { gym: true });
    expect(habitStreak(d, gym, TODAY)).toBe(5);
  });
  it('names the best current streak', () => {
    const d = base();
    d.habits.skin_am = habit('skin_am', 'Skincare AM');
    d.habits.water = habit('water', 'Water', { type: 'counter', target: 3500 });
    for (let i = 0; i < 21; i++) setDay(d, addDays(TODAY, -i), { skin_am: true, water: i < 5 ? 3500 : 1000 });
    expect(bestStreakInsight(d, TODAY)).toEqual({ id: 'streak', text: 'Best streak: Skincare AM (21 days)', tone: 'good' });
  });
});

describe('re-measure', () => {
  it('is due 28 days after the last measurement', () => {
    const d = base();
    d.measurements.m1 = { id: 'm1', updatedAt: 1, date: '2026-09-25' };
    expect(nextMeasureDate(d, TODAY)).toBe('2026-10-23');
    expect(remeasureInsight(d, TODAY)).toEqual({ id: 'remeasure', text: 'Re-measure due in 2 days', tone: 'info' });
    expect(remeasureInsight(d, '2026-10-23')?.tone).toBe('warn');
    expect(remeasureInsight(d, '2026-10-25')?.text).toBe('Re-measure overdue by 2 days');
    expect(remeasureInsight(d, '2026-10-01')).toBeNull();
  });
  it('asks for start measurements first', () => {
    expect(remeasureInsight(base(), TODAY)?.tone).toBe('info');
  });
});

describe('gym progress', () => {
  const wk = (id: string, date: string, kg: number, reps: number): Workout => ({
    id, date, updatedAt: 1, session: 'upper_a', minutes: 60, finished: true,
    exercises: [{ ex: 'bench_press', sets: [{ kg, reps, done: true }] }],
  });
  it('warns when nothing beat the earlier best in 3 weeks', () => {
    const d = base();
    d.workouts.a = wk('a', '2026-09-20', 60, 8);
    d.workouts.b = wk('b', '2026-10-06', 60, 8);
    d.workouts.c = wk('c', '2026-10-13', 57.5, 8);
    expect(gymProgressInsight(d, TODAY)?.id).toBe('gym_progress');
  });
  it('is quiet when a lift went up or there is no history', () => {
    const d = base();
    d.workouts.a = wk('a', '2026-09-20', 60, 8);
    d.workouts.b = wk('b', '2026-10-13', 60, 9);
    expect(gymProgressInsight(d, TODAY)).toBeNull();
    delete d.workouts.a;
    expect(gymProgressInsight(d, TODAY)).toBeNull();
  });
});

describe('backup', () => {
  const now = new Date(2026, 9, 21, 12).getTime();
  it('reminds after 30 days', () => {
    const d = base();
    d.profile.me!.lastBackupAt = now - 31 * 86_400_000;
    expect(backupInsight(d, now)?.text).toBe('Last backup 31 days ago. Export a new one in Settings.');
    d.profile.me!.lastBackupAt = now - 5 * 86_400_000;
    expect(backupInsight(d, now)).toBeNull();
  });
  it('reminds when there was never a backup', () => {
    expect(backupInsight(base(), now)?.text).toBe('No backup yet. Export one in Settings.');
  });
});

describe('insights', () => {
  it('puts warnings first', () => {
    const d = base();
    d.habits.skin_am = habit('skin_am', 'Skincare AM');
    for (let i = 0; i < 5; i++) setDay(d, addDays(TODAY, -i), { skin_am: true });
    const out = insights(d, TODAY, new Date(2026, 9, 21).getTime());
    expect(out[0].tone).toBe('warn');
    expect(out[out.length - 1].tone).toBe('good');
  });
});
