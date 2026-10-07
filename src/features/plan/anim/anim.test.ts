import { describe, expect, it } from 'vitest';
import { SESSIONS, isGymSession } from '../../../data/sessions';
import { BODY, dist, fitBox, frameAt, frameShapes, loopLength, paramsAt, tempoText, type Frame, type MoveDef, type Shape, type Vec } from './engine';
import { MOVES, PLAYLISTS, moveFor } from './moves';

const gymIds = [...new Set(
  Object.values(SESSIONS).flatMap((s) => (isGymSession(s) ? s.exercises.map((e) => e.id) : [])),
)];
const allMoves = Object.values(MOVES);

/** Frames at every key pose plus evenly spaced samples through the loop. */
function frames(m: MoveDef, n = 60): { t: number; f: Frame }[] {
  const T = loopLength(m);
  const times: number[] = [];
  let acc = 0;
  for (const s of m.steps) {
    times.push(acc, acc + (s.hold ?? 0));
    acc += (s.hold ?? 0) + s.move;
  }
  for (let i = 0; i < n; i++) times.push((i / n) * T);
  return times.map((t) => ({ t, f: frameAt(m, t) }));
}
const pts = (s: Shape): Vec[] => (s.t === 'line' ? [s.a, s.b] : s.t === 'path' ? s.pts : [s.c]);
const finite = (p: Vec) => Number.isFinite(p.x) && Number.isFinite(p.y);
const keyFrame = (m: MoveDef, k: number) => {
  let t = 0;
  for (let i = 0; i < k; i++) t += (m.steps[i].hold ?? 0) + m.steps[i].move;
  return frameAt(m, t);
};

describe('exercise demos', () => {
  it('has a demo for every exercise in the gym sessions', () => {
    expect(gymIds.length).toBeGreaterThanOrEqual(20);
    for (const id of gymIds) expect(moveFor(id), id).not.toBeNull();
    for (const l of Object.values(PLAYLISTS)) for (const k of l.playlist) expect(MOVES[k], k).toBeDefined();
  });

  it('returns null for unknown ids', () => {
    expect(moveFor('no_such_move')).toBeNull();
  });

  it('every keyframe and sample gives finite coordinates', () => {
    for (const m of allMoves) {
      for (const { t, f } of frames(m)) {
        for (const s of frameShapes(f)) for (const p of pts(s)) expect(finite(p), `${m.id} @${t.toFixed(2)}`).toBe(true);
        for (const [k, p] of Object.entries(f.joints)) expect(finite(p), `${m.id} ${k}`).toBe(true);
      }
      const b = fitBox(m);
      expect(Math.abs(b.w / b.h - 4 / 3)).toBeLessThan(1e-6);
    }
  });

  it('keeps hands on bars and handles and feet on the floor all through the loop', () => {
    for (const m of allMoves) {
      for (const { t, f } of frames(m, 90)) {
        for (const c of f.contacts) {
          const d = dist(c.p, c.q);
          expect(d, `${m.id} · ${c.label} @${t.toFixed(2)}s is ${d.toFixed(2)} off`).toBeLessThanOrEqual(c.tol ?? 1.5);
        }
      }
    }
  });

  it('declares the contacts each move needs', () => {
    const labels = (id: string) => new Set(frameAt(MOVES[id], 0).contacts.map((c) => c.label));
    const handsOn = ['bench_press', 'incline_db_press', 'lat_pulldown', 'pull_up', 'hanging_knee_raise', 'shoulder_press', 'seated_cable_row', 'squat', 'romanian_deadlift'];
    for (const id of handsOn) expect([...labels(id)].some((l) => l.startsWith('near hand')), id).toBe(true);
    const feetDown = ['bench_press', 'incline_db_press', 'lat_pulldown', 'shoulder_press', 'biceps_curl', 'triceps_pushdown', 'squat', 'romanian_deadlift'];
    for (const id of feetDown) expect(labels(id).has('near heel') && labels(id).has('near ball'), id).toBe(true);
    for (const id of ['lateral_raise', 'rear_delt_fly']) expect(labels(id).has('left foot'), id).toBe(true);
    for (const id of ['plank', 'side_plank']) expect(labels(id).has('elbow'), id).toBe(true);
    expect(labels('calf_raise').has('near ball on step')).toBe(true);
    expect(labels('bulgarian_split_squat').has('back foot on bench')).toBe(true);
  });

  it('keeps limb lengths constant (forward kinematics)', () => {
    for (const id of ['squat', 'romanian_deadlift', 'walking_lunge', 'bulgarian_split_squat', 'calf_raise', 'biceps_curl']) {
      for (const { f } of frames(MOVES[id], 20)) {
        const j = f.joints;
        expect(dist(j.hip, j.knee)).toBeCloseTo(BODY.thigh, 3);
        expect(dist(j.knee, j.ankle)).toBeCloseTo(BODY.shin, 3);
        if (id !== 'squat') expect(dist(j.shoulder, j.elbow)).toBeCloseTo(BODY.upper, 3); // squat arms are foreshortened (wide grip)
      }
    }
  });

  it('squat: hips back and down to parallel, knees forward, bar over mid-foot', () => {
    const m = MOVES.squat;
    const top = keyFrame(m, 0).joints, bottom = keyFrame(m, 1).joints;
    expect(bottom.hip.x).toBeLessThan(top.hip.x - 10); // hips go back
    expect(Math.abs(bottom.hip.y - bottom.knee.y)).toBeLessThan(4); // thighs about parallel
    expect(bottom.knee.x).toBeGreaterThan(bottom.ankle.x + 12); // knees travel forward
    expect(bottom.knee.x).toBeLessThan(bottom.toe.x + 8); // ...to about the toes
    for (const { f } of frames(m)) {
      const bar = f.joints.hand; // hands hold the bar on the back
      expect(bar.x).toBeGreaterThan(f.joints.ankle.x - 2);
      expect(bar.x).toBeLessThan(f.joints.ankle.x + 12);
    }
  });

  it('romanian deadlift: hinge with soft knees, bar close to the legs', () => {
    const m = MOVES.romanian_deadlift;
    const b = keyFrame(m, 1).joints;
    const kneeBend = 180 - angleAt(b.hip, b.knee, b.ankle);
    expect(kneeBend).toBeLessThan(35);
    expect(Math.abs(b.shoulder.y - b.hip.y)).toBeLessThan(10); // back near parallel at the bottom
    expect(b.hand.y).toBeLessThan(b.knee.y - 5); // bar below the knees
    for (const { f } of frames(m)) expect(f.joints.hand.x - f.joints.knee.x).toBeLessThan(10);
  });

  it('lateral raise reaches shoulder height; pull-up gets the chin over the bar', () => {
    const lr = keyFrame(MOVES.lateral_raise, 1).joints;
    expect(Math.abs(lr.eR.y - lr.sR.y)).toBeLessThan(3);
    expect(Math.abs(lr.hR.y - lr.sR.y)).toBeLessThan(6);
    const pu = keyFrame(MOVES.pull_up, 1).joints;
    expect(pu.head.y - BODY.headR * 0.6).toBeGreaterThan(pu.hand.y); // chin above the hands on the bar
  });

  it('walking lunge: back knee nearly touches the floor, front shin near upright', () => {
    const j = keyFrame(MOVES.walking_lunge, 0).joints;
    expect(j.knee2.y).toBeLessThan(10);
    expect(j.knee2.y).toBeGreaterThan(3);
    expect(Math.abs(j.knee.x - j.ankle.x)).toBeLessThan(8);
  });

  it('builds a tempo caption from the keyframes', () => {
    expect(tempoText(MOVES.squat)).toBe('Down 2 s · Up 1.1 s');
    expect(tempoText(MOVES.plank)).toMatch(/Hold/);
    for (const m of allMoves) expect(tempoText(m).length, m.id).toBeGreaterThan(3);
  });

  it('interpolates smoothly and wraps travelling moves', () => {
    const m = MOVES.walking_lunge;
    const T = loopLength(m);
    const a = paramsAt(m, T - 1e-4), b = paramsAt(m, T + 1e-4);
    expect(a.hx - b.hx).toBeCloseTo(m.wrap!.hx, 1);
  });
});

function angleAt(a: Vec, b: Vec, c: Vec): number {
  const u = { x: a.x - b.x, y: a.y - b.y }, w = { x: c.x - b.x, y: c.y - b.y };
  return (Math.acos((u.x * w.x + u.y * w.y) / (Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y))) * 180) / Math.PI;
}
