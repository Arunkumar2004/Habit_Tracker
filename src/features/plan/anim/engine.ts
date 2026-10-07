// Tiny 2D pose engine for the exercise demos. Pure functions, no DOM.
// World units: an adult about 133 units tall (1 unit ≈ 1.3 cm). y points UP, the floor is y = 0.
// A move is a list of keyframe parameter sets; each frame interpolates the parameters with easing,
// then the move's rig turns them into joint positions (forward kinematics from angles, plus two-bone
// IK where a hand or foot must stay on a bar, handle, pad or the floor) and equipment shapes.

export interface Vec { x: number; y: number }
export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => v(a.x + b.x, a.y + b.y);
export const sub = (a: Vec, b: Vec): Vec => v(a.x - b.x, a.y - b.y);
export const mul = (a: Vec, k: number): Vec => v(a.x * k, a.y * k);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const RAD = Math.PI / 180;
/** Unit vector at `deg` degrees (0 = +x, 90 = up). */
export const dir = (deg: number): Vec => v(Math.cos(deg * RAD), Math.sin(deg * RAD));
export const angleOf = (a: Vec): number => Math.atan2(a.y, a.x) / RAD;
export const rot = (p: Vec, deg: number): Vec => {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD);
  return v(p.x * c - p.y * s, p.x * s + p.y * c);
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpV = (a: Vec, b: Vec, t: number): Vec => v(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
/** Point `along` a→b plus `side` units to the left of that direction. */
export const at = (a: Vec, b: Vec, along: number, side = 0): Vec => {
  const d = sub(b, a);
  const L = Math.hypot(d.x, d.y) || 1;
  const u = mul(d, 1 / L);
  return add(add(a, mul(u, along)), mul(v(-u.y, u.x), side));
};

/** Two-bone IK. The end point is built by FK from the solved angles, so it falls short of an unreachable target. */
export function ik2(root: Vec, target: Vec, l1: number, l2: number, hint: Vec): { mid: Vec; end: Vec } {
  const d0 = dist(root, target);
  const d = clamp(d0, Math.abs(l1 - l2) + 1e-6, l1 + l2 - 1e-6);
  const base = d0 < 1e-9 ? angleOf(hint) : angleOf(sub(target, root));
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) / RAD;
  const m1 = add(root, mul(dir(base + a), l1));
  const m2 = add(root, mul(dir(base - a), l1));
  const mid = dot(sub(m1, root), hint) >= dot(sub(m2, root), hint) ? m1 : m2;
  const end = add(mid, mul(dir(angleOf(sub(target, mid))), l2));
  return { mid, end };
}

// ---------- shapes ----------
export type Tone = 'ink' | 'muted' | 'line' | 'accent' | 'bg' | 'none';
export type Shape =
  | { t: 'line'; a: Vec; b: Vec; w: number; tone: Tone; butt?: boolean; op?: number }
  | { t: 'path'; pts: Vec[]; w: number; tone: Tone; fill?: Tone; closed?: boolean; op?: number }
  | { t: 'circle'; c: Vec; r: number; tone: Tone; fill?: Tone; w?: number; op?: number }
  | { t: 'ellipse'; c: Vec; rx: number; ry: number; angle: number; fill: Tone; op?: number };

export interface Contact { label: string; p: Vec; q: Vec; tol?: number }

export interface Frame {
  back: Shape[];
  far: Shape[];
  mid: Shape[];
  near: Shape[];
  front: Shape[];
  contacts: Contact[];
  joints: Record<string, Vec>;
  /** Scrolls the floor marks (walking moves keep the person centred). */
  floorShift?: number;
}

// ---------- body proportions ----------
export const BODY = {
  torso: 38, neck: 7, headR: 8.5, upper: 25, fore: 22, thigh: 33, shin: 33,
  wUpper: 6.6, wFore: 5.6, fist: 3.2, wThigh: 9.6, wShin: 7, wFoot: 4.4, wNeck: 5.6,
};
/** Foot points relative to the ankle at foot angle 0 (toes to +x, sole on y = -5). */
export const FOOT = { heel: v(-4.5, -5), ball: v(11, -5), toe: v(15, -5), dHeel: v(-3.4, -2.8), dBall: v(10.4, -2.8) };
export const footPt = (ankle: Vec, angle: number, local: Vec): Vec => add(ankle, rot(local, angle));
/** Ankle position for a foot whose ball (or other local point) sits at `p`. */
export const ankleFrom = (p: Vec, angle: number, local: Vec = FOOT.ball): Vec => sub(p, rot(local, angle));

export type Limb = ({ a: number; b: number } | { to: Vec; hint: Vec }) & { s1?: number; s2?: number };
/** `foot`: heel → toe angle. `toe`: angle of the toes beyond the ball (defaults to the foot angle; 0 keeps them flat on the floor when up on the ball). */
export type Leg = Limb & { foot: number; toe?: number };
export type Hl = 'chest' | 'back' | 'shoulder' | 'core' | 'glutes' | 'upperArm' | 'forearm' | 'thigh' | 'shin';

function solveLimb(root: Vec, l: Limb, L1: number, L2: number): { mid: Vec; end: Vec } {
  const l1 = L1 * (l.s1 ?? 1), l2 = L2 * (l.s2 ?? 1);
  if ('to' in l) return ik2(root, l.to, l1, l2, l.hint);
  const mid = add(root, mul(dir(l.a), l1));
  return { mid, end: add(mid, mul(dir(l.b), l2)) };
}

/** Drawn centre line of a side-view foot: ankle, heel, ball, toe tip. */
function footPath(ankle: Vec, l: Leg): Vec[] {
  const ball = footPt(ankle, l.foot, FOOT.dBall);
  return [ankle, footPt(ankle, l.foot, FOOT.dHeel), ball, add(ball, mul(dir(l.toe ?? l.foot), 3.4))];
}
const toePt = (ankle: Vec, l: Leg): Vec => add(footPt(ankle, l.foot, FOOT.ball), mul(dir(l.toe ?? l.foot), 3.6));

/** Background-coloured outline that separates a near limb from the dark shapes behind it. */
const HALO = 2.6;
const halo = (a: Vec, b: Vec, w: number): Shape => ({ t: 'line', a, b, w: w + HALO, tone: 'bg' });
const armHalo = (s: Vec, e: Vec, h: Vec): Shape[] => [
  halo(at(s, e, 9), e, BODY.wUpper), halo(e, h, BODY.wFore), { t: 'circle', c: h, r: BODY.fist + HALO / 2, tone: 'none', fill: 'bg' },
];

const line = (a: Vec, b: Vec, w: number, tone: Tone = 'ink'): Shape => ({ t: 'line', a, b, w, tone });

// ---------- side view ----------
export interface SideBody {
  hip: Vec;
  /** Direction hip → mid spine, degrees. */
  torso: number;
  /** Upper-spine flexion towards the chest, degrees. */
  curl?: number;
  /** 1: chest on the clockwise side of the spine direction (faces right when upright). */
  facing?: 1 | -1;
  /** Head nod towards the chest, degrees. */
  nod?: number;
  /** 0..1 chest expansion while breathing. */
  breath?: number;
  arms: [Limb, Limb];
  legs: [Leg, Leg];
  hl?: Hl[];
}

export interface SideOut {
  near: Shape[];
  far: Shape[];
  j: {
    hip: Vec; mid: Vec; shoulder: Vec; neck: Vec; head: Vec;
    elbow: Vec; hand: Vec; elbow2: Vec; hand2: Vec;
    knee: Vec; ankle: Vec; heel: Vec; ball: Vec; toe: Vec;
    knee2: Vec; ankle2: Vec; heel2: Vec; ball2: Vec; toe2: Vec;
  };
  /** Unit vector pointing out of the chest at the upper torso. */
  chestN: Vec;
  /** Torso point at fraction t (0 hip, 1 shoulder), pushed `off` units towards the chest (negative: back). */
  onTorso: (t: number, off: number) => Vec;
}

export function sideBody(b: SideBody): SideOut {
  const f = b.facing ?? 1;
  const hl = new Set(b.hl ?? []);
  const half = BODY.torso / 2;
  const upA = b.torso - f * (b.curl ?? 0);
  const mid = add(b.hip, mul(dir(b.torso), half));
  const shoulder = add(mid, mul(dir(upA), half));
  const nN = (a: number) => rot(dir(a), -90 * f);
  const chestN = nN(upA);
  const onTorso = (t: number, off: number): Vec => {
    const a = t < 0.5 ? b.torso : upA;
    const base = t < 0.5 ? add(b.hip, mul(dir(b.torso), t * BODY.torso)) : add(mid, mul(dir(upA), (t - 0.5) * BODY.torso));
    return add(base, mul(nN(a), off));
  };
  // Torso outline: chest side then back side. Widths are half-depths before the 3-unit rounding stroke.
  const br = 1 + 0.09 * (b.breath ?? 0);
  const chestW: [number, number][] = [[0, 5], [0.35, 4.6 * (1 + 0.05 * (b.breath ?? 0))], [0.72, 7.2 * br], [0.92, 5.6], [1, 3.6]];
  const backW: [number, number][] = [[1, 4.2], [0.85, 6.3], [0.5, 5], [0.25, 5.2], [0, 6.6]];
  const tPts = [
    ...chestW.map(([t, w]) => onTorso(t, w)),
    add(shoulder, mul(dir(upA), 2.5)),
    ...backW.map(([t, w]) => onTorso(t, -w)),
    add(onTorso(0, -4), mul(dir(b.torso), -3.5)), // seat of the glutes, just below the hip joint
  ];
  const nd = upA - f * (b.nod ?? 0);
  const neck = add(shoulder, mul(dir(nd), BODY.neck));
  const head = add(add(neck, mul(dir(nd), 6.8)), mul(nN(nd), 1.4));

  const arm = solveLimb(shoulder, b.arms[0], BODY.upper, BODY.fore);
  const arm2 = solveLimb(shoulder, b.arms[1], BODY.upper, BODY.fore);
  const leg = solveLimb(b.hip, b.legs[0], BODY.thigh, BODY.shin);
  const leg2 = solveLimb(b.hip, b.legs[1], BODY.thigh, BODY.shin);
  const fa = b.legs[0].foot, fa2 = b.legs[1].foot;

  const tone = (k: Hl): Tone => (hl.has(k) ? 'accent' : 'ink');
  const legShapes = (hip: Vec, knee: Vec, ankle: Vec, l: Leg, h = false): Shape[] => [
    ...(h ? [halo(at(hip, knee, 14), knee, BODY.wThigh), halo(knee, ankle, BODY.wShin), { t: 'path', pts: footPath(ankle, l), w: BODY.wFoot + HALO, tone: 'bg' } as Shape] : []),
    { t: 'path', pts: footPath(ankle, l), w: BODY.wFoot, tone: 'ink' },
    line(knee, ankle, BODY.wShin, tone('shin')),
    line(hip, knee, BODY.wThigh, tone('thigh')),
  ];
  const armShapes = (s: Vec, e: Vec, h: Vec, hal = false): Shape[] => [
    ...(hal ? armHalo(s, e, h) : []),
    line(s, e, BODY.wUpper, tone('upperArm')),
    line(e, h, BODY.wFore, tone('forearm')),
    { t: 'circle', c: h, r: BODY.fist, tone: 'none', fill: 'ink' },
  ];
  const torsoShape: Shape = { t: 'path', pts: tPts, w: 3, tone: 'ink', fill: 'ink', closed: true };
  const headShapes: Shape[] = [
    line(shoulder, neck, BODY.wNeck),
    { t: 'circle', c: head, r: BODY.headR, tone: 'none', fill: 'ink' },
    { t: 'circle', c: add(add(head, mul(nN(nd), BODY.headR - 0.6)), mul(dir(nd), -1)), r: 1.9, tone: 'none', fill: 'ink' },
  ];
  const blobs: Shape[] = [];
  const along = dir(upA);
  const ang = angleOf(along);
  if (hl.has('chest')) blobs.push({ t: 'ellipse', c: onTorso(0.74, 3.6), rx: 6.5, ry: 3.6, angle: ang, fill: 'accent' });
  if (hl.has('back')) blobs.push({ t: 'ellipse', c: onTorso(0.66, -3.4), rx: 10, ry: 3.4, angle: ang, fill: 'accent' });
  if (hl.has('core')) blobs.push({ t: 'ellipse', c: onTorso(0.33, 2.6), rx: 8, ry: 3, angle: angleOf(dir(b.torso)), fill: 'accent' });
  if (hl.has('glutes')) blobs.push({ t: 'ellipse', c: add(onTorso(0, -3.5), mul(dir(b.torso), -1)), rx: 5.5, ry: 4.6, angle: ang, fill: 'accent' });
  const delt: Shape[] = hl.has('shoulder')
    ? [{ t: 'ellipse', c: add(shoulder, mul(dir(angleOf(sub(arm.mid, shoulder))), 3)), rx: 6.2, ry: 4.8, angle: angleOf(sub(arm.mid, shoulder)), fill: 'accent' }]
    : [];

  const far = [...legShapes(b.hip, leg2.mid, leg2.end, b.legs[1]), ...armShapes(shoulder, arm2.mid, arm2.end)];
  const near = [torsoShape, ...blobs, ...headShapes, ...legShapes(b.hip, leg.mid, leg.end, b.legs[0], true), ...armShapes(shoulder, arm.mid, arm.end, true), ...delt];
  return {
    near, far, chestN, onTorso,
    j: {
      hip: b.hip, mid, shoulder, neck, head, elbow: arm.mid, hand: arm.end, elbow2: arm2.mid, hand2: arm2.end,
      knee: leg.mid, ankle: leg.end, heel: footPt(leg.end, fa, FOOT.heel), ball: footPt(leg.end, fa, FOOT.ball), toe: toePt(leg.end, b.legs[0]),
      knee2: leg2.mid, ankle2: leg2.end, heel2: footPt(leg2.end, fa2, FOOT.heel), ball2: footPt(leg2.end, fa2, FOOT.ball), toe2: toePt(leg2.end, b.legs[1]),
    },
  };
}

// ---------- front view ----------
export interface FrontBody {
  /** Centre of the pelvis. */
  pelvis: Vec;
  /** Direction pelvis → neck, degrees (90 = upright). */
  torso?: number;
  /** Apparent torso length factor (a forward hinge seen from the front looks shorter). */
  tLen?: number;
  /** 0..1: head drops in front of the chest (bent-over). */
  headDrop?: number;
  /** [screen-left, screen-right]. */
  arms: [Limb, Limb];
  legs: [Leg, Leg];
  hl?: Hl[];
  /** Foot drawing: 'stand' points the feet at the viewer, 'side' lays them along the floor. */
  feet?: 'stand' | 'side';
  breath?: number;
}
export interface FrontOut {
  shapes: Shape[];
  j: { pelvis: Vec; neck: Vec; head: Vec; sL: Vec; sR: Vec; eL: Vec; eR: Vec; hL: Vec; hR: Vec; hipL: Vec; hipR: Vec; kL: Vec; kR: Vec; aL: Vec; aR: Vec };
  footBottom: [Vec, Vec];
}

export function frontBody(b: FrontBody): FrontOut {
  const hl = new Set(b.hl ?? []);
  const ta = b.torso ?? 90;
  const u = dir(ta);
  const r = rot(u, -90); // screen right when upright
  const T = BODY.torso * (b.tLen ?? 1);
  const P = b.pelvis;
  const p = (along: number, side: number) => add(add(P, mul(u, along * T)), mul(r, side));
  const br = 1 + 0.05 * (b.breath ?? 0);
  const sL = p(0.95, -16), sR = p(0.95, 16);
  const hipL = p(-0.04, -8.5), hipR = p(-0.04, 8.5);
  const torsoPts = [
    p(-0.1, -12.6), p(0.12, -13.6), p(0.42, -11), p(0.72, -14 * br), p(0.94, -16.5), p(1.02, -13), p(1.05, -4),
    p(1.05, 4), p(1.02, 13), p(0.94, 16.5), p(0.72, 14 * br), p(0.42, 11), p(0.12, 13.6), p(-0.1, 12.6), p(-0.16, 0),
  ];
  const neckBase = p(1.0, 0);
  const drop = b.headDrop ?? 0;
  const neckTop = add(neckBase, mul(u, BODY.neck * (1 - drop)));
  const head = add(neckBase, mul(u, 14.6 * (1 - drop) - 4.5 * drop));
  const armL = solveLimb(sL, b.arms[0], BODY.upper, BODY.fore);
  const armR = solveLimb(sR, b.arms[1], BODY.upper, BODY.fore);
  const legL = solveLimb(hipL, b.legs[0], BODY.thigh, BODY.shin);
  const legR = solveLimb(hipR, b.legs[1], BODY.thigh, BODY.shin);
  const tone = (k: Hl): Tone => (hl.has(k) ? 'accent' : 'ink');
  const foot = (ankle: Vec, side: -1 | 1, a: number): Shape =>
    b.feet === 'side'
      ? { t: 'path', pts: footPath(ankle, { a: 0, b: 0, foot: a }), w: BODY.wFoot, tone: 'ink' }
      : { t: 'path', pts: [add(ankle, v(-side * 1.2, 0)), add(ankle, v(-side * 0.8, -2.9)), add(ankle, v(side * 4.2, -2.9))], w: BODY.wFoot + 0.6, tone: 'ink' };
  const limb = (s: Vec, m: Vec, e: Vec, w1: number, w2: number, k1: Hl, k2: Hl): Shape[] => [line(s, m, w1, tone(k1)), line(m, e, w2, tone(k2))];
  const shapes: Shape[] = [
    foot(legL.end, -1, b.legs[0].foot), foot(legR.end, 1, b.legs[1].foot),
    ...limb(hipL, legL.mid, legL.end, BODY.wThigh + 0.6, BODY.wShin + 0.4, 'thigh', 'shin'),
    ...limb(hipR, legR.mid, legR.end, BODY.wThigh + 0.6, BODY.wShin + 0.4, 'thigh', 'shin'),
    { t: 'path', pts: torsoPts, w: 3, tone: 'ink', fill: 'ink', closed: true },
  ];
  if (hl.has('back')) shapes.push({ t: 'ellipse', c: p(0.62, 0), rx: 11, ry: 6 * (b.tLen ?? 1) + 2, angle: angleOf(r), fill: 'accent' });
  if (hl.has('core')) shapes.push({ t: 'ellipse', c: p(0.32, 0), rx: 7, ry: 7 * (b.tLen ?? 1), angle: angleOf(r), fill: 'accent' });
  const headShapes: Shape[] = [
    line(neckBase, neckTop, BODY.wNeck + 0.8),
    ...(drop > 0.3 ? [{ t: 'ellipse', c: head, rx: 7.4 + HALO / 2, ry: 9 - 1.4 * drop + HALO / 2, angle: ta - 90, fill: 'bg' } as Shape] : []),
    { t: 'ellipse', c: head, rx: 7.4, ry: 9 - 1.4 * drop, angle: ta - 90, fill: 'ink' },
  ];
  const arms: Shape[] = [
    halo(at(sL, armL.mid, 8), armL.mid, BODY.wUpper + 0.4), halo(armL.mid, armL.end, BODY.wFore + 0.3),
    halo(at(sR, armR.mid, 8), armR.mid, BODY.wUpper + 0.4), halo(armR.mid, armR.end, BODY.wFore + 0.3),
    ...limb(sL, armL.mid, armL.end, BODY.wUpper + 0.4, BODY.wFore + 0.3, 'upperArm', 'forearm'),
    ...limb(sR, armR.mid, armR.end, BODY.wUpper + 0.4, BODY.wFore + 0.3, 'upperArm', 'forearm'),
    { t: 'circle', c: armL.end, r: BODY.fist, tone: 'none', fill: 'ink' },
    { t: 'circle', c: armR.end, r: BODY.fist, tone: 'none', fill: 'ink' },
  ];
  const delts: Shape[] = hl.has('shoulder')
    ? [sL, sR].map((s, i) => {
        const m = i ? armR.mid : armL.mid;
        return { t: 'ellipse', c: add(s, mul(dir(angleOf(sub(m, s))), 2.5)), rx: 6.4, ry: 5.2, angle: angleOf(sub(m, s)), fill: 'accent' } as Shape;
      })
    : [];
  // A dropped head sits in front of the chest, so it is drawn after the arms' roots.
  if (drop > 0.3) shapes.push(...arms, ...delts, ...headShapes);
  else shapes.push(...headShapes, ...arms, ...delts);
  const fb = (ankle: Vec, a: number): Vec => (b.feet === 'side' ? footPt(ankle, a, v(4, -5)) : add(ankle, v(0, -5.1)));
  return {
    shapes,
    j: { pelvis: P, neck: neckTop, head, sL, sR, eL: armL.mid, eR: armR.mid, hL: armL.end, hR: armR.end, hipL, hipR, kL: legL.mid, kR: legR.mid, aL: legL.end, aR: legR.end },
    footBottom: [fb(legL.end, b.legs[0].foot), fb(legR.end, b.legs[1].foot)],
  };
}

// ---------- equipment ----------
export const eq = {
  dumbbell: (c: Vec, r = 5): Shape[] => [
    { t: 'circle', c, r, tone: 'muted', fill: 'line', w: 1.6 },
    { t: 'circle', c, r: 1.6, tone: 'none', fill: 'muted' },
  ],
  plate: (c: Vec, r = 13): Shape[] => [
    { t: 'circle', c, r, tone: 'muted', fill: 'line', w: 1.8 },
    { t: 'circle', c, r: r * 0.55, tone: 'muted', fill: 'none', w: 1 },
    { t: 'circle', c, r: 2.4, tone: 'none', fill: 'muted' },
  ],
  /** A rounded pad from a to b, `thick` units deep on the right-hand side of a→b. */
  pad: (a: Vec, b: Vec, thick: number): Shape => {
    const d = sub(b, a);
    const L = Math.hypot(d.x, d.y) || 1;
    const n = v(d.y / L, -d.x / L);
    return { t: 'path', pts: [a, b, add(b, mul(n, thick)), add(a, mul(n, thick))], w: 1.6, tone: 'muted', fill: 'line', closed: true };
  },
  rect: (x: number, y: number, w: number, h: number): Shape => ({
    t: 'path', pts: [v(x, y), v(x + w, y), v(x + w, y + h), v(x, y + h)], w: 1.6, tone: 'muted', fill: 'line', closed: true,
  }),
  post: (a: Vec, b: Vec, w = 3): Shape => ({ t: 'line', a, b, w, tone: 'muted' }),
  cable: (a: Vec, b: Vec): Shape => ({ t: 'line', a, b, w: 1, tone: 'muted' }),
  pulley: (c: Vec): Shape[] => [
    { t: 'circle', c, r: 3.6, tone: 'muted', fill: 'bg', w: 1.4 },
    { t: 'circle', c, r: 1, tone: 'none', fill: 'muted' },
  ],
  /** Weight stack: frame from floor to `top`, plates lifted by `lift`. */
  stack: (x: number, top: number, lift: number): Shape[] => {
    const out: Shape[] = [eq.post(v(x - 9, 0), v(x - 9, top)), eq.post(v(x + 9, 0), v(x + 9, top)), eq.post(v(x - 10, top), v(x + 10, top))];
    for (let i = 0; i < 6; i++) out.push(eq.rect(x - 6.5, 1 + i * 4.2 + (i === 5 ? lift : 0), 13, 3.6));
    return out;
  },
};

// ---------- timeline ----------
export type Params = Record<string, number>;
export interface Step {
  pose: Params;
  /** Seconds to hold this pose. */
  hold?: number;
  /** Seconds to move from this pose to the next one (wraps to the first). */
  move: number;
  /** Caption label for the move phase, e.g. "Down". */
  label?: string;
  ease?: 'inOut' | 'linear' | 'out';
}
export interface MoveDef {
  id: string;
  name: string;
  view: 'side' | 'front';
  /** What the animation shows, for screen readers. */
  alt: string;
  steps: Step[];
  rig: (p: Params) => Frame;
  /** Caption override; otherwise built from labelled steps. */
  tempo?: string;
  /** Key poses for the still (reduced-motion) view: [start, end]. */
  still?: [number, number];
  floor?: boolean;
  /** Added to the first pose when the last step wraps around (moves that travel, like walking lunges). */
  wrap?: Params;
}
export interface PlaylistDef { id: string; name: string; alt: string; playlist: string[]; loops?: number }

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

export const loopLength = (m: MoveDef): number => m.steps.reduce((n, s) => n + (s.hold ?? 0) + s.move, 0);

export function paramsAt(m: MoveDef, time: number): Params {
  const total = loopLength(m);
  let t = ((time % total) + total) % total;
  const n = m.steps.length;
  for (let i = 0; i < n; i++) {
    const s = m.steps[i];
    const h = s.hold ?? 0;
    if (t < h) return { ...s.pose };
    t -= h;
    if (t < s.move || i === n - 1) {
      const u = clamp(t / s.move, 0, 1);
      const e = s.ease === 'linear' ? u : s.ease === 'out' ? easeOut(u) : s.ease === 'inOut' ? easeInOut(u) : easeSine(u);
      const a = s.pose;
      let b = m.steps[(i + 1) % n].pose;
      if (i === n - 1 && m.wrap) {
        const w = m.wrap;
        b = Object.fromEntries(Object.entries(b).map(([k, x]) => [k, x + (w[k] ?? 0)]));
      }
      const out: Params = {};
      for (const k of Object.keys(a)) out[k] = lerp(a[k], b[k] ?? a[k], e);
      return out;
    }
    t -= s.move;
  }
  return { ...m.steps[0].pose };
}

export const frameAt = (m: MoveDef, time: number): Frame => m.rig(paramsAt(m, time));

export function tempoText(m: MoveDef): string {
  if (m.tempo) return m.tempo;
  const fmt = (s: number) => `${Math.round(s * 10) / 10} s`;
  return m.steps.filter((s) => s.label).map((s) => `${s.label} ${fmt(s.move)}`).join(' · ');
}

// ---------- framing ----------
export interface Box { x: number; y: number; w: number; h: number }
function shapePts(s: Shape): { p: Vec; r: number }[] {
  switch (s.t) {
    case 'line': return [{ p: s.a, r: s.w / 2 }, { p: s.b, r: s.w / 2 }];
    case 'path': return s.pts.map((p) => ({ p, r: s.w / 2 }));
    case 'circle': return [{ p: s.c, r: s.r + (s.w ?? 0) / 2 }];
    case 'ellipse': return [{ p: s.c, r: Math.max(s.rx, s.ry) }];
  }
}
export const frameShapes = (f: Frame): Shape[] => [...f.back, ...f.far, ...f.mid, ...f.near, ...f.front];

/** World box (y up) that holds every frame of the loop, padded, at 4:3. */
export function fitBox(m: MoveDef, samples = 48): Box {
  let x0 = Infinity, x1 = -Infinity, y0 = m.floor === false ? Infinity : -2, y1 = -Infinity;
  const total = loopLength(m);
  for (let i = 0; i < samples; i++) {
    for (const s of frameShapes(frameAt(m, (i / samples) * total))) {
      for (const { p, r } of shapePts(s)) {
        x0 = Math.min(x0, p.x - r); x1 = Math.max(x1, p.x + r);
        y0 = Math.min(y0, p.y - r); y1 = Math.max(y1, p.y + r);
      }
    }
  }
  const pad = 7;
  x0 -= pad; x1 += pad; y0 -= pad * 0.6; y1 += pad;
  let w = x1 - x0, h = y1 - y0;
  if (w / h > 4 / 3) {
    const nh = (w * 3) / 4;
    y1 += (nh - h) * 0.65; y0 -= (nh - h) * 0.35; h = nh;
  } else {
    const nw = (h * 4) / 3;
    x0 -= (nw - w) / 2; w = nw;
  }
  return { x: x0, y: y0, w, h };
}
