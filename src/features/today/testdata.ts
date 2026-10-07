// Test fixtures for the Today+Habits engines (imported by *.test.ts only).
import { COLLECTIONS, type Data, type Day, type Habit, type Profile, type Workout } from '../../types';
import { DEFAULT_HABITS } from '../../data/plan';

export function emptyTestData(): Data {
  const d = {} as Data;
  for (const c of COLLECTIONS) (d as Record<string, unknown>)[c] = {};
  return d;
}

export function profile(p: Partial<Profile> = {}): Profile {
  return {
    id: 'me', updatedAt: 1, name: 'Arun', startDate: '2026-10-01', heightCm: 185, weightKg: 72, bodyType: 'average',
    diet: 'non_veg', currency: 'INR', theme: 'auto', monthlyBudget: 20000, onboarded: true, ...p,
  };
}

/** Data with a profile and the built-in habits (optionally only some of them). */
export function makeData(opts: { start?: string; habits?: string[]; proteinTargetG?: number } = {}): Data {
  const data = emptyTestData();
  data.profile.me = profile({ startDate: opts.start ?? '2026-10-01', proteinTargetG: opts.proteinTargetG });
  for (const h of DEFAULT_HABITS) {
    if (opts.habits && !opts.habits.includes(h.id)) continue;
    data.habits[h.id] = { ...h, updatedAt: 1 } as Habit;
  }
  return data;
}

export function setDay(data: Data, date: string, habits: Day['habits']): void {
  const cur = data.days[date] ?? { id: date, date, habits: {}, updatedAt: 1 };
  data.days[date] = { ...cur, habits: { ...cur.habits, ...habits } };
}

let seq = 0;
export function addWorkout(data: Data, date: string, session: string, finished = true): Workout {
  const w: Workout = { id: `wk_${++seq}`, updatedAt: seq, date, session, minutes: 60, exercises: [], finished };
  data.workouts[w.id] = w;
  return w;
}

export function habit(h: Partial<Habit> & Pick<Habit, 'id'>): Habit {
  return {
    name: h.id, icon: 'dot', group: 'personal', type: 'check', target: 1, schedule: { kind: 'daily' }, order: 99,
    archived: false, updatedAt: 1, ...h,
  };
}
