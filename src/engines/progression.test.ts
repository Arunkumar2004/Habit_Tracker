import { describe, expect, it } from 'vitest';
import type { Data, Workout, WorkoutSet } from '../types';
import { SESSIONS, isGymSession, type Exercise } from '../data/sessions';
import { emptyData } from '../store/storage';
import {
  PLATEAU_TEXT, easySets, easyWeekStatus, isPlateau, lastLine, lastPerformance, pbsBeaten, personalBests, sessionScore,
  suggestNext,
} from './progression';

const set = (kg: number, reps: number, done = true): WorkoutSet => ({ kg, reps, done });
let seq = 0;
function wk(date: string, exs: Record<string, WorkoutSet[]>, finished = true, session = 'upper_a'): Workout {
  seq++;
  return {
    id: `wk_${seq}`, updatedAt: seq, date, session, minutes: 60, finished,
    exercises: Object.entries(exs).map(([ex, sets]) => ({ ex, sets })),
  };
}
function dataWith(...ws: Workout[]): Data {
  const d = emptyData();
  for (const w of ws) d.workouts[w.id] = w;
  return d;
}
function exOf(session: 'upper_a' | 'lower_a' | 'upper_b' | 'lower_b', id: string): Exercise {
  const s = SESSIONS[session];
  if (!isGymSession(s)) throw new Error('not gym');
  const e = s.exercises.find((x) => x.id === id);
  if (!e) throw new Error(id);
  return e;
}

describe('plan content', () => {
  it('has every exercise from the blueprint with sets and ranges', () => {
    const counts = (['upper_a', 'lower_a', 'upper_b', 'lower_b'] as const).map((k) => {
      const s = SESSIONS[k];
      return isGymSession(s) ? s.exercises.length : 0;
    });
    expect(counts).toEqual([7, 7, 7, 6]);
    const lat = exOf('upper_b', 'lateral_raise');
    expect([lat.sets, lat.repLow, lat.repHigh, lat.priority]).toEqual([4, 12, 15, true]);
    expect(exOf('upper_a', 'lateral_raise').sets).toBe(3);
    expect(exOf('lower_a', 'walking_lunge').unit).toBe('per leg');
    expect(exOf('lower_a', 'plank').unit).toBe('sec');
    expect(exOf('upper_a', 'bench_press').priority).toBe(false);
    for (const k of ['upper_a', 'lower_a', 'upper_b', 'lower_b'] as const) {
      const s = SESSIONS[k];
      if (!isGymSession(s)) continue;
      for (const e of s.exercises) {
        expect(e.how).toHaveLength(3);
        expect(e.avoid.length).toBeGreaterThanOrEqual(1);
        expect(e.avoid.length).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('suggestNext', () => {
  const bench = exOf('upper_a', 'bench_press'); // compound 3×6–10
  const lateral = exOf('upper_b', 'lateral_raise'); // isolation 4×12–15
  const pullUp = exOf('upper_b', 'pull_up');

  it('every set at the top of the range → +2.5 kg for a compound lift', () => {
    const s = suggestNext(bench, [set(60, 10), set(60, 10), set(60, 10)]);
    expect(s.action).toBe('increase');
    expect(s.kg).toBe(62.5);
    expect(s.text).toBe('Next: 62.5 kg (+2.5 kg)');
  });

  it('every set at the top → +1–2 kg for an isolation lift', () => {
    const s = suggestNext(lateral, [set(6, 15), set(6, 15), set(6, 15), set(6, 16)]);
    expect(s.action).toBe('increase');
    expect(s.kg).toBe(7);
    expect(s.text).toBe('Next: 7–8 kg (+1–2 kg)');
  });

  it('one set short of the top → same weight, beat last by 1 rep (blueprint example)', () => {
    const s = suggestNext(lateral, [set(6, 15), set(6, 15), set(6, 14), set(6, 13)]);
    expect(s.action).toBe('same');
    expect(s.kg).toBe(6);
    expect(s.text).toBe('Next: stay 6 kg, beat 1 rep');
  });

  it('fewer sets than planned is not "every set" → same weight', () => {
    expect(suggestNext(bench, [set(60, 10), set(60, 10)]).action).toBe('same');
  });

  it('ignores sets that were not ticked', () => {
    expect(suggestNext(bench, [set(60, 10), set(60, 10), set(60, 10), set(60, 4, false)]).action).toBe('increase');
  });

  it('no history → start light', () => {
    expect(suggestNext(bench, null).action).toBe('start');
    expect(suggestNext(bench, []).text).toMatch(/Start light/);
  });

  it('bodyweight pull-ups at the top → add 2.5 kg', () => {
    const s = suggestNext(pullUp, [set(0, 12), set(0, 12), set(0, 12)]);
    expect(s).toMatchObject({ action: 'increase', kg: 2.5 });
    expect(suggestNext(pullUp, [set(0, 9), set(0, 8), set(0, 7)]).text).toBe('Next: stay bodyweight, beat 1 rep');
  });

  it('per-leg exercises say "each leg"', () => {
    const lunge = exOf('lower_a', 'walking_lunge');
    expect(suggestNext(lunge, [set(10, 10), set(10, 9), set(10, 8)]).text).toBe('Next: stay 10 kg, beat 1 rep each leg');
  });
});

describe('lastPerformance', () => {
  it('returns the newest finished session with done sets, skipping unfinished and excluded ones', () => {
    const a = wk('2026-10-01', { lateral_raise: [set(5, 15), set(5, 14)] });
    const b = wk('2026-10-05', { lateral_raise: [set(6, 15), set(6, 15), set(6, 14), set(6, 13)] });
    const draft = wk('2026-10-08', { lateral_raise: [set(7, 12)] }, false);
    const d = dataWith(a, b, draft);
    const last = lastPerformance(d, 'lateral_raise');
    expect(last?.date).toBe('2026-10-05');
    expect(lastLine(last!.sets, 'reps')).toBe('6 kg · 15 15 14 13');
    expect(lastPerformance(d, 'lateral_raise', { excludeId: b.id })?.date).toBe('2026-10-01');
    expect(lastPerformance(d, 'lateral_raise', { onOrBefore: '2026-10-02' })?.date).toBe('2026-10-01');
    expect(lastPerformance(d, 'squat')).toBeNull();
  });
});

describe('plateau (no progress for 3 weeks)', () => {
  const today = '2026-10-29';
  it('flags when the last 3 weeks never beat the best from before', () => {
    const d = dataWith(
      wk('2026-09-24', { bench_press: [set(60, 8)] }),
      wk('2026-10-08', { bench_press: [set(60, 8)] }),
      wk('2026-10-15', { bench_press: [set(60, 7)] }),
      wk('2026-10-22', { bench_press: [set(57.5, 8)] }),
    );
    expect(isPlateau(d, 'bench_press', today)).toBe(true);
    expect(PLATEAU_TEXT).toBe('Check sleep + protein, then eat a bit more.');
  });
  it('does not flag when a recent session beat it (one more rep counts)', () => {
    const d = dataWith(
      wk('2026-09-24', { bench_press: [set(60, 8)] }),
      wk('2026-10-15', { bench_press: [set(60, 8)] }),
      wk('2026-10-22', { bench_press: [set(60, 9)] }),
    );
    expect(isPlateau(d, 'bench_press', today)).toBe(false);
  });
  it('needs history: too new to call a plateau', () => {
    const d = dataWith(wk('2026-10-15', { bench_press: [set(60, 8)] }), wk('2026-10-22', { bench_press: [set(60, 8)] }));
    expect(isPlateau(d, 'bench_press', today)).toBe(false);
  });
  it('sessionScore uses estimated 1RM for loaded sets and reps for bodyweight', () => {
    expect(sessionScore([set(60, 10)])).toBe(80);
    expect(sessionScore([set(0, 12), set(0, 9)])).toBe(12);
  });
});

describe('easy week every 8–10 weeks', () => {
  it('is due after 8 hard weeks (week 9) and not before', () => {
    expect(easyWeekStatus(8, []).due).toBe(false);
    expect(easyWeekStatus(9, []).due).toBe(true);
    expect(easyWeekStatus(10, []).due).toBe(true);
  });
  it('resets after an easy week', () => {
    expect(easyWeekStatus(9, [9])).toMatchObject({ due: false, inEasy: true });
    expect(easyWeekStatus(12, [9]).due).toBe(false);
    expect(easyWeekStatus(18, [9]).due).toBe(true);
  });
  it('halves the sets, rounded up', () => {
    expect([easySets(4), easySets(3), easySets(2), easySets(1)]).toEqual([2, 2, 1, 1]);
  });
});

describe('personal bests', () => {
  it('tracks the heaviest bench, squat and pulldown, and reports PBs beaten', () => {
    const a = wk('2026-10-01', { bench_press: [set(55, 8), set(57.5, 6)], lat_pulldown: [set(45, 10)] });
    const b = wk('2026-10-02', { squat: [set(70, 8)] }, true, 'lower_a');
    const unfinished = wk('2026-10-03', { bench_press: [set(100, 1)] }, false);
    const d = dataWith(a, b, unfinished);
    expect(personalBests(d)).toEqual({ bench: 57.5, squat: 70, pulldown: 45 });

    const today = wk('2026-10-05', { bench_press: [set(60, 6)], lat_pulldown: [set(45, 12)] });
    d.workouts[today.id] = today;
    expect(pbsBeaten(d, today)).toEqual([{ lift: 'bench', label: 'Bench press', kg: 60, prev: 57.5 }]);
  });
});
