// Every exercise demo: keyframes (with real tempo) and a rig that turns the parameters into a pose plus equipment.
// Side views face right. Numbers are world units (about 1.3 cm each), y up, floor at 0.
import {
  BODY, FOOT, add, ankleFrom, at, dir, dist, eq, frontBody, mul, rot, sideBody, sub, v,
  type Contact, type Frame, type FrontOut, type Leg, type MoveDef, type PlaylistDef, type Shape, type SideOut, type Vec,
} from './engine';

const KNEE: Vec = v(1, 0.05);
const ARM_LEN = BODY.upper + BODY.fore;

function sideFrame(S: SideOut, e: { back?: Shape[]; mid?: Shape[]; front?: Shape[] }, contacts: Contact[] = []): Frame {
  return { back: e.back ?? [], far: S.far, mid: e.mid ?? [], near: S.near, front: e.front ?? [], contacts, joints: { ...S.j } };
}
function frontFrame(F: FrontOut, e: { back?: Shape[]; front?: Shape[] }, contacts: Contact[] = []): Frame {
  return { back: e.back ?? [], far: [], mid: [], near: F.shapes, front: e.front ?? [], contacts, joints: { ...F.j } };
}
const touch = (label: string, p: Vec, q: Vec, tol?: number): Contact => ({ label, p, q, tol });
const onFloor = (label: string, p: Vec, y = 0): Contact => ({ label, p, q: v(p.x, y) });
const flatFeet = (S: SideOut, y = 0): Contact[] => [
  onFloor('near heel', S.j.heel, y), onFloor('near ball', S.j.ball, y), onFloor('far heel', S.j.heel2, y), onFloor('far ball', S.j.ball2, y),
];
const standLegs = (ax: number, ax2 = ax - 2.5, y = 5): [Leg, Leg] => [
  { to: v(ax, y), hint: KNEE, foot: 0 }, { to: v(ax2, y), hint: KNEE, foot: 0 },
];
const legsTo = (a: Vec, a2: Vec, hint: Vec, foot = 0): [Leg, Leg] => [{ to: a, hint, foot }, { to: a2, hint, foot }];
const floorBase = (x0: number, x1: number): Shape => eq.post(v(x0, 1), v(x1, 1), 2);
const handleShape = (c: Vec, toward: Vec): Shape[] => [
  { t: 'line', a: c, b: at(c, toward, 6), w: 3, tone: 'muted' },
  { t: 'circle', c, r: 2.6, tone: 'muted', fill: 'line', w: 1.4 },
];
/** Cable from a handle up to a pulley and over to the weight stack, which rises as the cable is pulled. */
function cableRig(hand: Vec, rest: Vec, pulley: Vec, stackX: number, top: number): Shape[] {
  const lift = Math.max(0, dist(pulley, rest) - dist(pulley, hand)) * 0.5;
  const stackTop = v(stackX, 1 + 5 * 4.2 + 3.6 + lift);
  return [
    ...eq.stack(stackX, top, lift),
    eq.cable(hand, pulley), eq.cable(pulley, v(stackX, top - 4)), eq.cable(v(stackX, top - 4), stackTop),
    ...eq.pulley(pulley), ...eq.pulley(v(stackX, top - 4)),
  ];
}

// ---------------- upper body ----------------

const bench_press: MoveDef = {
  id: 'bench_press', name: 'Bench press', view: 'side',
  alt: 'Lying on a flat bench, feet on the floor: the bar lowers to mid-chest with elbows tucked, pauses, then presses up over the shoulders.',
  steps: [
    { pose: { bx: 63.5, by: 85.5 }, hold: 0.4, move: 1.8, label: 'Down' },
    { pose: { bx: 72, by: 52 }, hold: 0.3, move: 1.1, label: 'Up' },
  ],
  rig: (p) => {
    const bar = v(p.bx, p.by);
    const S = sideBody({
      hip: v(98, 40), torso: 180, nod: -4, hl: ['chest', 'upperArm'],
      arms: [{ to: bar, hint: v(0.35, -1) }, { to: add(bar, v(-0.5, 0)), hint: v(0.35, -1) }],
      legs: legsTo(v(130, 5), v(126, 5), v(0.3, 1)),
    });
    return sideFrame(S, {
      back: [
        eq.post(v(42, 0), v(42, 27)), eq.post(v(104, 0), v(104, 27)), floorBase(34, 112),
        eq.rect(28, 27, 86, 5.5), ...eq.plate(bar),
      ],
    }, [touch('near hand on bar', S.j.hand, bar), touch('far hand on bar', S.j.hand2, add(bar, v(-0.5, 0))), ...flatFeet(S)]);
  },
};

const incline_db_press: MoveDef = {
  id: 'incline_db_press', name: 'Incline DB press', view: 'side',
  alt: 'On a bench set to about 30 degrees, dumbbells lower to the sides of the upper chest, then press up over the shoulders.',
  steps: [
    { pose: { hx: 60, hy: 107.5 }, hold: 0.4, move: 1.8, label: 'Down' },
    { pose: { hx: 67, hy: 69.5 }, hold: 0.3, move: 1.1, label: 'Up' },
  ],
  rig: (p) => {
    const db = v(p.hx, p.hy);
    const S = sideBody({
      hip: v(90, 43), torso: 150, nod: 6, hl: ['chest'],
      arms: [{ to: db, hint: v(-0.35, -1) }, { to: db, hint: v(-0.35, -1) }],
      legs: legsTo(v(128, 5), v(124, 5), v(0.4, 1)),
    });
    const a = S.onTorso(1.45, -6.6), b = S.onTorso(-0.06, -6.6);
    return sideFrame(S, {
      back: [
        eq.post(v(96, 0), v(96, 33)), eq.post(S.onTorso(0.7, -12), v(70, 0)), floorBase(60, 112),
        eq.pad(a, b, 5), eq.pad(v(79, 36.6), v(108, 36.6), 5),
      ],
      mid: eq.dumbbell(db),
    }, [touch('near hand on dumbbell', S.j.hand, db), touch('far hand on dumbbell', S.j.hand2, db), ...flatFeet(S)]);
  },
};

const lat_pulldown: MoveDef = {
  id: 'lat_pulldown', name: 'Lat pulldown', view: 'side',
  alt: 'Seated with thighs under the pad: the bar pulls down to the upper chest with elbows driving down and back, then rises slowly until the arms are straight.',
  steps: [
    { pose: { bx: 78, by: 119, ta: 95, s1: 0.95, s2: 0.95 }, hold: 0.3, move: 1.1, label: 'Pull' },
    { pose: { bx: 83, by: 77, ta: 103, s1: 0.72, s2: 0.82 }, hold: 0.4, move: 2, label: 'Up' },
  ],
  rig: (p) => {
    const bar = v(p.bx, p.by);
    const hip = v(80, 38);
    const arm = { to: bar, hint: v(-0.55, -1), s1: p.s1, s2: p.s2 };
    const S = sideBody({ hip, torso: p.ta, nod: -8, hl: ['back'], arms: [arm, arm], legs: legsTo(v(112, 5), v(109, 5), v(0.3, 1)) });
    const roller = at(hip, S.j.knee, 27, 10.2);
    const pulley = v(80, 152);
    return sideFrame(S, {
      back: [
        eq.post(v(78, 0), v(78, 26)), floorBase(62, 98), eq.rect(60, 26, 38, 5),
        eq.post(roller, v(roller.x + 14, roller.y - 10)), eq.post(v(roller.x + 14, roller.y - 10), v(roller.x + 14, 0)),
        ...cableRig(bar, v(78, 119), pulley, 140, 156), eq.post(v(80, 156), v(149, 156)),
      ],
      mid: [{ t: 'line', a: add(bar, v(-5, 1.5)), b: add(bar, v(5, 1.5)), w: 3, tone: 'muted' }, { t: 'circle', c: bar, r: 2.4, tone: 'none', fill: 'muted' }],
      front: [{ t: 'circle', c: roller, r: 5, tone: 'muted', fill: 'line', w: 1.6 }],
    }, [touch('near hand on bar', S.j.hand, bar), touch('far hand on bar', S.j.hand2, bar), ...flatFeet(S)]);
  },
};

const PULL_BAR = v(100, 170);
const hangLegs = (thigh: number, shin: number, foot: number): [Leg, Leg] => [
  { a: thigh, b: shin, foot }, { a: thigh - 3, b: shin - 2, foot },
];
const barFrame = (): Shape[] => [eq.post(PULL_BAR, v(124, PULL_BAR.y)), eq.post(v(124, PULL_BAR.y - 2), v(124, PULL_BAR.y + 14))];

const pull_up: MoveDef = {
  id: 'pull_up', name: 'Pull-up', view: 'side', floor: false,
  alt: 'Hanging from a bar with straight arms: the chest pulls up towards the bar with elbows driving down to the ribs until the chin clears the bar, then lowers all the way.',
  steps: [
    { pose: { sx: 98.5, sy: 126, ta: 93, s1: 0.95, s2: 0.95 }, hold: 0.4, move: 1.2, label: 'Up' },
    { pose: { sx: 88.5, sy: 166.5, ta: 103, s1: 0.82, s2: 0.86 }, hold: 0.3, move: 2, label: 'Down' },
  ],
  rig: (p) => {
    const sh = v(p.sx, p.sy);
    const hip = sub(sh, mul(dir(p.ta), BODY.torso));
    const arm = { to: PULL_BAR, hint: v(0.3, -1), s1: p.s1, s2: p.s2 };
    const S = sideBody({ hip, torso: p.ta, nod: -6, hl: ['back', 'upperArm'], arms: [arm, arm], legs: hangLegs(-84, -99, -62) });
    return sideFrame(S, {
      back: barFrame(),
      mid: [{ t: 'circle', c: PULL_BAR, r: 2.6, tone: 'none', fill: 'muted' }],
    }, [touch('near hand on bar', S.j.hand, PULL_BAR), touch('far hand on bar', S.j.hand2, PULL_BAR)]);
  },
};

const hanging_knee_raise: MoveDef = {
  id: 'hanging_knee_raise', name: 'Hanging knee raise', view: 'side', floor: false,
  alt: 'Hanging from a bar with straight arms: the knees lift towards the chest as the hips curl up, then lower slowly without swinging.',
  steps: [
    { pose: { sx: 98.5, sy: 126, ta: 92, th: -88, sn: -93, ft: -62 }, hold: 0.4, move: 1.2, label: 'Up' },
    { pose: { sx: 94, sy: 127, ta: 106, th: 24, sn: -72, ft: -20 }, hold: 0.4, move: 2, label: 'Down' },
  ],
  rig: (p) => {
    const sh = v(p.sx, p.sy);
    const hip = sub(sh, mul(dir(p.ta), BODY.torso));
    const arm = { to: PULL_BAR, hint: v(0.3, -1), s1: 0.95, s2: 0.95 };
    const S = sideBody({ hip, torso: p.ta, curl: (p.ta - 92) * 0.6, nod: -4, hl: ['core'], arms: [arm, arm], legs: hangLegs(p.th, p.sn, p.ft) });
    return sideFrame(S, {
      back: barFrame(),
      mid: [{ t: 'circle', c: PULL_BAR, r: 2.6, tone: 'none', fill: 'muted' }],
    }, [touch('near hand on bar', S.j.hand, PULL_BAR), touch('far hand on bar', S.j.hand2, PULL_BAR)]);
  },
};

const shoulder_press: MoveDef = {
  id: 'shoulder_press', name: 'Shoulder press', view: 'side',
  alt: 'Seated tall against the back pad: dumbbells press up from shoulder height until the arms are almost straight, then lower slowly. The lower back stays on the pad.',
  steps: [
    { pose: { gx: 98, gy: 96.5, s1: 0.5 }, hold: 0.3, move: 1.1, label: 'Up' },
    { pose: { gx: 89, gy: 122.5, s1: 0.98 }, hold: 0.3, move: 2, label: 'Down' },
  ],
  rig: (p) => {
    const db = v(p.gx, p.gy);
    const arm = { to: db, hint: v(1, -0.5), s1: p.s1 };
    const S = sideBody({ hip: v(90, 40), torso: 95, hl: ['shoulder'], arms: [arm, arm], legs: legsTo(v(122, 5), v(118, 5), v(0.3, 1)) });
    return sideFrame(S, {
      back: [
        eq.pad(S.onTorso(1.25, -6.6), S.onTorso(-0.05, -6.6), 5), eq.pad(v(76, 33.5), v(106, 33.5), 5),
        eq.post(v(88, 0), v(88, 28)), floorBase(72, 104),
      ],
      mid: eq.dumbbell(add(db, v(-1.5, 0))),
      front: eq.dumbbell(db),
    }, [touch('near hand on dumbbell', S.j.hand, db), touch('far hand on dumbbell', S.j.hand2, db), ...flatFeet(S)]);
  },
};

const ROW_PULLEY = v(148, 27);
const ROW_START = v(121, 62);
const seated_cable_row: MoveDef = {
  id: 'seated_cable_row', name: 'Seated cable row', view: 'side',
  alt: 'Seated tall with soft knees and feet on the plate: the handle pulls to the lower ribs as the shoulder blades squeeze, then the arms go long again without rounding the back.',
  steps: [
    { pose: { hx: ROW_START.x, hy: ROW_START.y, ta: 82 }, hold: 0.3, move: 1.1, label: 'Pull' },
    { pose: { hx: 82, hy: 54, ta: 92 }, hold: 0.5, move: 2, label: 'Return' },
  ],
  rig: (p) => {
    const h = v(p.hx, p.hy);
    const ankle = v(130, 22);
    const arm = { to: h, hint: v(-1, -0.3) };
    const S = sideBody({
      hip: v(70, 30), torso: p.ta, hl: ['back'], arms: [arm, arm],
      legs: [{ to: ankle, hint: v(0.2, 1), foot: 70 }, { to: add(ankle, v(-1.5, -0.5)), hint: v(0.2, 1), foot: 70 }],
    });
    const heel = add(ankle, rot(FOOT.heel, 70)), toe = add(ankle, rot(FOOT.toe, 70));
    return sideFrame(S, {
      back: [
        eq.rect(50, 18, 36, 5), eq.post(v(68, 0), v(68, 18)), eq.post(v(50, 1), v(186, 1), 2),
        eq.post(at(toe, heel, 6, -3), v(145, 1)),
        ...cableRig(h, ROW_START, ROW_PULLEY, 178, 96), eq.cable(ROW_PULLEY, v(178, 92)),
      ],
      mid: [eq.pad(at(heel, toe, -4), at(heel, toe, 23), 3.5), ...handleShape(h, ROW_PULLEY)],
    }, [touch('near hand on handle', S.j.hand, h), touch('far hand on handle', S.j.hand2, h), touch('foot on plate', S.j.ankle, ankle)]);
  },
};

// Front views: arms in the frontal plane.
const frontLegs = (y = 5.6, s = 1): [Leg, Leg] => [
  { to: v(90.5, y), hint: v(-1, 0), foot: 0, s1: s, s2: s }, { to: v(109.5, y), hint: v(1, 0), foot: 0, s1: s, s2: s },
];
const frontFeet = (F: FrontOut): Contact[] => [onFloor('left foot', F.footBottom[0]), onFloor('right foot', F.footBottom[1])];

const lateral_raise: MoveDef = {
  id: 'lateral_raise', name: 'Lateral raise', view: 'front',
  alt: 'Front view, standing tall: light dumbbells rise out to the sides to shoulder height with soft elbows leading, then lower slowly. Shoulders stay down.',
  steps: [
    { pose: { ua: -84, fa: -87 }, hold: 0.3, move: 1.1, label: 'Up' },
    { pose: { ua: -3, fa: -11 }, hold: 0.4, move: 2.5, label: 'Down' },
  ],
  rig: (p) => {
    const F = frontBody({
      pelvis: v(100, 72.6), hl: ['shoulder'],
      arms: [{ a: 180 - p.ua, b: 180 - p.fa, s2: 0.95 }, { a: p.ua, b: p.fa, s2: 0.95 }],
      legs: frontLegs(),
    });
    return frontFrame(F, { front: [...eq.dumbbell(F.j.hL, 4.6), ...eq.dumbbell(F.j.hR, 4.6)] }, frontFeet(F));
  },
};

const rear_delt_fly: MoveDef = {
  id: 'rear_delt_fly', name: 'Rear-delt fly', view: 'front',
  tempo: 'Bent forward, seen from the front · Open 1.1 s · Lower 2 s',
  alt: 'Front view of a forward hinge with a flat back and soft knees: the arms open out wide to shoulder level, thumbs slightly down, then lower slowly.',
  steps: [
    { pose: { ua: -88, fa: -91 }, hold: 0.3, move: 1.1, label: 'Open' },
    { pose: { ua: 0, fa: -6 }, hold: 0.5, move: 2, label: 'Lower' },
  ],
  rig: (p) => {
    const F = frontBody({
      pelvis: v(100, 64), tLen: 0.5, headDrop: 1, hl: ['shoulder'],
      arms: [{ a: 180 - p.ua, b: 180 - p.fa, s2: 0.95 }, { a: p.ua, b: p.fa, s2: 0.95 }],
      legs: frontLegs(5.6, 0.875),
    });
    return frontFrame(F, { front: [...eq.dumbbell(F.j.hL, 4.6), ...eq.dumbbell(F.j.hR, 4.6)] }, frontFeet(F));
  },
};

const biceps_curl: MoveDef = {
  id: 'biceps_curl', name: 'Biceps curl', view: 'side',
  alt: 'Standing tall with elbows pinned at the sides: the dumbbells curl up without the elbows moving, then lower all the way down slowly.',
  steps: [
    { pose: { fb: -84 }, hold: 0.3, move: 1.1, label: 'Up' },
    { pose: { fb: 66 }, hold: 0.4, move: 2.1, label: 'Down' },
  ],
  rig: (p) => {
    const arm = { a: -93, b: p.fb };
    const S = sideBody({ hip: v(99, 70.6), torso: 90, hl: ['upperArm'], arms: [arm, { a: -93, b: p.fb }], legs: standLegs(101) });
    return sideFrame(S, { mid: [...eq.dumbbell(add(S.j.hand2, v(-1.5, 0))), ...eq.dumbbell(S.j.hand)] }, flatFeet(S));
  },
};

const PD_PULLEY = v(124, 148);
const triceps_pushdown: MoveDef = {
  id: 'triceps_pushdown', name: 'Triceps rope pushdown', view: 'side',
  alt: 'Standing close to a high cable with elbows tucked at the sides: the rope pushes down until the arms are straight, then comes back up to chest height with control.',
  steps: [
    { pose: { fb: 22 }, hold: 0.3, move: 1.1, label: 'Down' },
    { pose: { fb: -84 }, hold: 0.4, move: 2, label: 'Up' },
  ],
  rig: (p) => {
    const arm = { a: -86, b: p.fb };
    const S = sideBody({ hip: v(80, 70.6), torso: 86, hl: ['upperArm'], arms: [arm, arm], legs: standLegs(81.5) });
    const top = add(add(S.j.shoulder, mul(dir(-86), BODY.upper)), mul(dir(22), BODY.fore));
    return sideFrame(S, {
      back: [...cableRig(S.j.hand, top, PD_PULLEY, 150, 160), eq.post(v(124, 160), v(150, 160)), eq.post(v(124, 160), PD_PULLEY, 2)],
      mid: [{ t: 'line', a: S.j.hand, b: at(S.j.hand, PD_PULLEY, 9), w: 3.4, tone: 'muted' }],
    }, flatFeet(S));
  },
};

// ---------------- lower body ----------------

const SQ_ANKLE = 100;
/** Bar on the upper back, just behind and above the shoulder joint. */
const backBar = (S: SideOut) => S.onTorso(0.97, -7);

function squatRig(p: Record<string, number>): Frame {
  const hip = v(p.hx, p.hy);
  const tmp = sideBody({ hip, torso: p.ta, arms: [{ a: -90, b: -90 }, { a: -90, b: -90 }], legs: standLegs(SQ_ANKLE) });
  const bar = backBar(tmp);
  const arm = { to: bar, hint: v(-0.6, -1), s1: 0.82, s2: 0.88 };
  const S = sideBody({ hip, torso: p.ta, nod: 8 - (90 - p.ta) * 0.3, hl: ['thigh', 'glutes'], arms: [arm, arm], legs: standLegs(SQ_ANKLE) });
  return sideFrame(S, { back: eq.plate(bar) }, [touch('near hand on bar', S.j.hand, bar), touch('far hand on bar', S.j.hand2, bar), ...flatFeet(S)]);
}
const squat: MoveDef = {
  id: 'squat', name: 'Squat', view: 'side',
  alt: 'Bar on the upper back: the hips sit back and down while the knees travel forward over the toes, to thighs about parallel, feet flat. Then drive up with the chest up.',
  steps: [
    { pose: { hx: 102, hy: 70.3, ta: 81 }, hold: 0.4, move: 2, label: 'Down' },
    { pose: { hx: 85, hy: 31.5, ta: 53 }, hold: 0.2, move: 1.1, label: 'Up' },
  ],
  rig: squatRig,
};

const LP_HIP = v(60, 30);
const LP_RAIL = 45;
const leg_press: MoveDef = {
  id: 'leg_press', name: 'Leg press', view: 'side',
  alt: 'Lower back flat on the pad: the sled lowers until the knees are bent to about a right angle, then the legs press it back up without locking the knees.',
  steps: [
    { pose: { d: 64.5 }, hold: 0.3, move: 2, label: 'Down' },
    { pose: { d: 43 }, hold: 0.2, move: 1.1, label: 'Up' },
  ],
  rig: (p) => {
    const u = dir(LP_RAIL);
    const ankle = add(LP_HIP, mul(u, p.d));
    const leg: Leg = { to: ankle, hint: v(-0.7, 0.7), foot: LP_RAIL + 90 };
    const S = sideBody({
      hip: LP_HIP, torso: 148, nod: 12, hl: ['thigh', 'glutes'],
      arms: [{ a: -88, b: -20 }, { a: -88, b: -20 }], legs: [leg, { ...leg, to: add(ankle, v(-1, 1)) }],
    });
    const plateA = add(ankle, rot(v(-9, -5), LP_RAIL + 90)), plateB = add(ankle, rot(v(22, -5), LP_RAIL + 90));
    const sledC = add(at(plateA, plateB, 15), mul(u, 9));
    const n = dir(LP_RAIL - 90);
    const rail = (t: number) => add(add(LP_HIP, mul(u, t)), mul(n, 17));
    return sideFrame(S, {
      back: [
        eq.post(rail(20), rail(118), 3), eq.post(rail(30), v(rail(30).x, 0)), eq.post(rail(112), v(rail(112).x, 0)),
        floorBase(30, rail(112).x + 8),
        eq.pad(S.onTorso(1.5, -6.6), S.onTorso(-0.1, -6.6), 5),
        eq.pad(S.onTorso(-0.1, -6.6), add(S.onTorso(-0.1, -6.6), mul(dir(20), 22)), 5),
        eq.post(v(48, 0), S.onTorso(0.5, -12)),
        ...eq.plate(add(sledC, mul(u, 6)), 10),
      ],
      mid: [eq.pad(plateA, plateB, 4), eq.post(add(sledC, mul(u, -4)), add(add(sledC, mul(u, -4)), mul(n, 9)), 3)],
    }, [touch('near foot on sled', S.j.ankle, ankle), touch('far foot on sled', S.j.ankle2, add(ankle, v(-1, 1)))]);
  },
};

/** Romanian deadlift: the bar hangs from straight arms and slides down a vertical line close to the legs. */
const rdl: MoveDef = {
  id: 'romanian_deadlift', name: 'Romanian deadlift', view: 'side',
  alt: 'Standing with soft knees: the hips push back and the flat back hinges forward while the bar slides down the legs to below the knees, then the glutes squeeze to stand up.',
  steps: [
    { pose: { hx: 99, hy: 70.3, ta: 88, bx: 106 }, hold: 0.3, move: 2, label: 'Down' },
    { pose: { hx: 86, hy: 67, ta: 5, bx: 107.5 }, hold: 0.3, move: 1.2, label: 'Up' },
  ],
  rig: (p) => {
    const hip = v(p.hx, p.hy);
    const sh = add(hip, mul(dir(p.ta), BODY.torso));
    const reach = ARM_LEN - 1.2;
    const dx = Math.min(Math.abs(sh.x - p.bx), reach - 0.01);
    const bar = v(p.bx, sh.y - Math.sqrt(reach * reach - dx * dx));
    const arm = { to: bar, hint: v(-1, 0) };
    const S = sideBody({ hip, torso: p.ta, nod: Math.max(0, (60 - p.ta) * 0.35), hl: ['thigh', 'glutes'], arms: [arm, arm], legs: standLegs(SQ_ANKLE) });
    return sideFrame(S, { back: eq.plate(bar) }, [touch('near hand on bar', S.j.hand, bar), touch('far hand on bar', S.j.hand2, bar), ...flatFeet(S)]);
  },
};

// Walking lunge: poses alternate legs; the scene follows the hips and the floor marks scroll.
const STRIDE = 76.2;
const lungeLeg = (bx: number, fa: number, lift: number): Leg => ({
  to: ankleFrom(v(bx, lift), fa), hint: KNEE, foot: fa, toe: lift > 0.01 ? fa : Math.max(0, fa),
});
const walking_lunge: MoveDef = {
  id: 'walking_lunge', name: 'Walking lunge', view: 'side',
  alt: 'Holding dumbbells at the sides: step forward and lower until the back knee nearly touches the floor, front shin upright, chest tall. Push through the front heel and step into the next lunge.',
  tempo: 'Step and lower 1.3 s · Push up 0.9 s',
  wrap: { hx: 2 * STRIDE, nb: 2 * STRIDE, fb: 2 * STRIDE },
  steps: [
    { pose: { hx: -30, hy: 39.5, ta: 86, nb: 11, nf: 0, nl: 0, fb: 11 - STRIDE, ff: -50, fl: 0 }, hold: 0.25, move: 0.9 },
    { pose: { hx: 3, hy: 69.5, ta: 89, nb: 11, nf: 0, nl: 0, fb: 6, ff: -12, fl: 13 }, move: 1.3 },
    { pose: { hx: STRIDE - 30, hy: 39.5, ta: 86, nb: 11, nf: -50, nl: 0, fb: 11 + STRIDE, ff: 0, fl: 0 }, hold: 0.25, move: 0.9 },
    { pose: { hx: STRIDE + 3, hy: 69.5, ta: 89, nb: 6 + STRIDE, nf: -12, nl: 13, fb: 11 + STRIDE, ff: 0, fl: 0 }, move: 1.3 },
  ],
  still: [1, 0],
  rig: (p) => {
    const legs: [Leg, Leg] = [lungeLeg(p.nb, p.nf, p.nl), lungeLeg(p.fb, p.ff, p.fl)];
    const arm = { a: -91, b: -90 };
    const S = sideBody({ hip: v(p.hx, p.hy), torso: p.ta, hl: ['thigh', 'glutes'], arms: [arm, arm], legs });
    const contacts: Contact[] = [];
    if (p.nl < 0.01) contacts.push(onFloor('near ball', S.j.ball));
    if (p.fl < 0.01) contacts.push(onFloor('far ball', S.j.ball2));
    if (p.nl < 0.01 && Math.abs(p.nf) < 0.01) contacts.push(onFloor('near heel', S.j.heel));
    if (p.fl < 0.01 && Math.abs(p.ff) < 0.01) contacts.push(onFloor('far heel', S.j.heel2));
    const f = sideFrame(S, { mid: [...eq.dumbbell(add(S.j.hand2, v(-1.5, 0))), ...eq.dumbbell(S.j.hand)] }, contacts);
    return shiftFrame(f, 100 - p.hx, p.hx);
  },
};

/** Moves every point by dx (the camera follows the person); the floor marks scroll by `floor`. */
function shiftFrame(f: Frame, dx: number, floor: number): Frame {
  const m = (p: Vec) => v(p.x + dx, p.y);
  const s = (sh: Shape): Shape => {
    switch (sh.t) {
      case 'line': return { ...sh, a: m(sh.a), b: m(sh.b) };
      case 'path': return { ...sh, pts: sh.pts.map(m) };
      case 'circle': case 'ellipse': return { ...sh, c: m(sh.c) };
    }
  };
  const joints: Record<string, Vec> = {};
  for (const [k, p] of Object.entries(f.joints)) joints[k] = m(p);
  return {
    back: f.back.map(s), far: f.far.map(s), mid: f.mid.map(s), near: f.near.map(s), front: f.front.map(s),
    contacts: f.contacts.map((c) => ({ ...c, p: m(c.p), q: m(c.q) })), joints, floorShift: floor,
  };
}

const BSS_BACK = v(62, 37);
const bulgarian_split_squat: MoveDef = {
  id: 'bulgarian_split_squat', name: 'Bulgarian split squat', view: 'side',
  alt: 'Back foot laces-down on a bench, front foot a big step ahead: the body lowers straight down until the front thigh is parallel, front heel down, then pushes up through the front heel.',
  steps: [
    { pose: { hx: 97, hy: 66, ta: 84 }, hold: 0.3, move: 2, label: 'Down' },
    { pose: { hx: 92, hy: 37.5, ta: 77 }, hold: 0.2, move: 1.1, label: 'Up' },
  ],
  rig: (p) => {
    const arm = { a: -90, b: -90 };
    const S = sideBody({
      hip: v(p.hx, p.hy), torso: p.ta, hl: ['thigh', 'glutes'], arms: [arm, arm],
      legs: [{ to: v(120, 5), hint: KNEE, foot: 0 }, { to: BSS_BACK, hint: v(0.2, -1), foot: 196 }],
    });
    return sideFrame(S, {
      back: [eq.rect(28, BSS_BACK.y - 10.2, 40, 5.2), eq.post(v(34, 0), v(34, 22)), eq.post(v(62, 0), v(62, 22)), floorBase(28, 68)],
      mid: [...eq.dumbbell(add(S.j.hand2, v(-1.5, 0))), ...eq.dumbbell(S.j.hand)],
    }, [onFloor('front heel', S.j.heel), onFloor('front ball', S.j.ball), touch('back foot on bench', S.j.ankle2, BSS_BACK)]);
  },
};

const LC_HIP = v(90, 47.5);
const leg_curl: MoveDef = {
  id: 'leg_curl', name: 'Leg curl', view: 'side',
  alt: 'Lying face down with the pad just above the heels: the heels curl towards the glutes while the hips stay down, then lower slowly.',
  steps: [
    { pose: { sh: 4 }, hold: 0.3, move: 1.1, label: 'Curl' },
    { pose: { sh: 112 }, hold: 0.4, move: 2, label: 'Lower' },
  ],
  rig: (p) => {
    const knee = add(LC_HIP, v(BODY.thigh, 0));
    const leg: Leg = { a: 0, b: p.sh, foot: p.sh - 80 };
    const S = sideBody({
      hip: LC_HIP, torso: 180, facing: -1, nod: 14, hl: ['thigh'],
      arms: [{ a: -112, b: -62 }, { a: -112, b: -62 }], legs: [leg, { ...leg, b: p.sh - 1.5 }],
    });
    const pad = add(add(knee, mul(dir(p.sh), 27)), mul(dir(p.sh + 90), 8.6));
    return sideFrame(S, {
      back: [
        eq.rect(28, 35, 92, 5.4), eq.post(v(40, 0), v(40, 35)), eq.post(v(112, 0), v(112, 35)), floorBase(32, 132),
        eq.post(v(knee.x, 35), v(knee.x + 6, 0)), { t: 'circle', c: knee, r: 4.5, tone: 'muted', fill: 'line', w: 1.4 },
      ],
      front: [eq.post(knee, pad, 2.6), { t: 'circle', c: pad, r: 5, tone: 'muted', fill: 'line', w: 1.6 }],
    }, [touch('pad on lower leg', pad, add(add(S.j.knee, mul(dir(p.sh), 27)), mul(dir(p.sh + 90), 8.6)))]);
  },
};

const CR_BALL = v(106, 14);
const CR_RAIL = v(134, 101);
const calf_raise: MoveDef = {
  id: 'calf_raise', name: 'Calf raise', view: 'side',
  alt: 'Balls of the feet on a step with the heels hanging off: rise as high as possible, hold for a second, then lower until the calves stretch.',
  steps: [
    { pose: { fa: 22 }, hold: 0.5, move: 1, label: 'Up' },
    { pose: { fa: -28 }, hold: 1, move: 2, label: 'Down' },
  ],
  rig: (p) => {
    const ankle = ankleFrom(CR_BALL, p.fa);
    const hip = add(ankle, v(-1, 65.6));
    const leg: Leg = { to: ankle, hint: KNEE, foot: p.fa, toe: Math.max(0, p.fa) };
    const S = sideBody({
      hip, torso: 90, hl: ['shin'],
      arms: [{ to: CR_RAIL, hint: v(0, -1) }, { a: -92, b: -88 }], legs: [leg, { ...leg, to: add(ankle, v(-2, 0)) }],
    });
    return sideFrame(S, {
      back: [eq.rect(CR_BALL.x - 2, 0, 50, CR_BALL.y), eq.post(v(CR_RAIL.x + 2, CR_BALL.y), v(CR_RAIL.x + 2, CR_RAIL.y + 2), 3.2)],
    }, [touch('near ball on step', S.j.ball, CR_BALL), touch('hand on rail', S.j.hand, CR_RAIL)]);
  },
};

// ---------------- core ----------------

const PLANK_SH = v(140, 28.6);
const plank: MoveDef = {
  id: 'plank', name: 'Plank', view: 'side',
  alt: 'Forearms on the floor with elbows under the shoulders and the body in one straight line from head to heels, held while breathing slowly.',
  tempo: 'Hold · breathe in 2 s, out 2 s',
  still: [0, 0],
  steps: [
    { pose: { br: 0 }, hold: 0.3, move: 2 },
    { pose: { br: 1 }, hold: 0.3, move: 2 },
  ],
  rig: (p) => {
    const fa = -70;
    const ankleUp = -rot(FOOT.ball, fa).y; // ankle height above the floor with the ball down
    const L = BODY.torso + 65.6;
    const th = (Math.asin((PLANK_SH.y - ankleUp) / L) * 180) / Math.PI;
    const hip = sub(PLANK_SH, mul(dir(th), BODY.torso));
    const ankle = sub(hip, mul(dir(th), 65.6));
    const leg: Leg = { to: ankle, hint: v(0, -1), foot: fa, toe: 0 };
    const arm = { a: -90, b: 0 };
    const S = sideBody({ hip, torso: th, breath: p.br, nod: 10, hl: ['core'], arms: [arm, { a: -90, b: -1 }], legs: [leg, leg] });
    return sideFrame(S, {}, [onFloor('elbow', add(S.j.elbow, v(0, -3.6))), onFloor('fist', add(S.j.hand, v(0, -3.2))), onFloor('toes', S.j.ball)]);
  },
};

const SP_ELBOW = v(150, 3.6);
const side_plank: MoveDef = {
  id: 'side_plank', name: 'Side plank', view: 'front',
  alt: 'Lying on one side, propped on the forearm with the elbow under the shoulder: hips lift high so the body is one straight line, top arm reaching up, held while breathing.',
  tempo: 'Hold · breathe in 2 s, out 2 s',
  still: [0, 0],
  steps: [
    { pose: { br: 0 }, hold: 0.3, move: 2 },
    { pose: { br: 1 }, hold: 0.3, move: 2 },
  ],
  rig: (p) => {
    // Solve the body angle so the lower foot rests on the floor with the lower shoulder over the elbow.
    const sR = add(SP_ELBOW, v(0, BODY.upper));
    let th = 15;
    for (let i = 0; i < 30; i++) {
      const u = dir(th), r = dir(th - 90);
      const y = sR.y - (36.1 + 1.5 + 66) * u.y + (16 - 8.5) * -r.y;
      th += (y - 5.4) * 0.4;
    }
    const u = dir(th), r = dir(th - 90);
    const pelvis = sub(sub(sR, mul(u, 0.95 * BODY.torso)), mul(r, 16));
    const hipR = add(add(pelvis, mul(u, -0.04 * BODY.torso)), mul(r, 8.5));
    const aR = sub(hipR, mul(u, 66));
    const F = frontBody({
      pelvis, torso: th, breath: p.br, hl: ['core'], feet: 'side',
      arms: [{ a: 90, b: 90 }, { a: -90, b: -12, s2: 0.6 }],
      legs: [{ to: add(aR, mul(r, -7.5)), hint: u, foot: th + 180 + 90 }, { to: aR, hint: u, foot: th + 180 + 90 }],
    });
    return frontFrame(F, {}, [onFloor('elbow', add(F.j.eR, v(0, -3.6))), onFloor('lower foot', add(F.j.aR, v(0, -5.2)), 0)]);
  },
};

const dead_bug: MoveDef = {
  id: 'dead_bug', name: 'Dead bug', view: 'side',
  alt: 'Lying on the back with arms up and knees over the hips: one arm reaches overhead while the opposite leg straightens towards the floor, lower back pressed down, then switch sides.',
  tempo: 'Reach 1.5 s · Back 1 s, alternate sides',
  steps: [
    { pose: { na: 90, nb: 90, xa: 90, xb: 90, nt: 90, ns: 0, xt: 90, xs: 0 }, hold: 0.3, move: 1.5 },
    { pose: { na: 168, nb: 171, xa: 90, xb: 90, nt: 90, ns: 0, xt: 12, xs: 9 }, hold: 0.4, move: 1 },
    { pose: { na: 90, nb: 90, xa: 90, xb: 90, nt: 90, ns: 0, xt: 90, xs: 0 }, hold: 0.3, move: 1.5 },
    { pose: { na: 90, nb: 90, xa: 168, xb: 171, nt: 12, ns: 9, xt: 90, xs: 0 }, hold: 0.4, move: 1 },
  ],
  still: [0, 1],
  rig: (p) => {
    const S = sideBody({
      hip: v(100, 6.6), torso: 180, nod: 4, hl: ['core'],
      arms: [{ a: p.na, b: p.nb }, { a: p.xa - 2, b: p.xb - 2 }],
      legs: [{ a: p.nt, b: p.ns, foot: p.ns + 92 }, { a: p.xt - 2, b: p.xs, foot: p.xs + 92 }],
    });
    return sideFrame(S, {}, [onFloor('lower back on floor', S.onTorso(0.5, -6.5), 0)]);
  },
};

const CC_KNEE = v(100, 4.4);
const CC_PULLEY = v(126, 150);
const cable_crunch: MoveDef = {
  id: 'cable_crunch', name: 'Cable crunch', view: 'side',
  alt: 'Kneeling under a high cable with the rope held by the head: the ribs curl down towards the hips while the hips stay still, then rise back slowly.',
  steps: [
    { pose: { ta: 72, cu: 4 }, hold: 0.3, move: 1.2, label: 'Curl' },
    { pose: { ta: 38, cu: 50 }, hold: 0.5, move: 2, label: 'Up' },
  ],
  rig: (p) => {
    const tA = -82;
    const hip = sub(CC_KNEE, mul(dir(tA), BODY.thigh));
    const legs: [Leg, Leg] = [{ a: tA, b: 180, foot: 180, toe: 180 }, { a: tA, b: 180, foot: 180, toe: 180 }];
    const base = { hip, torso: p.ta, curl: p.cu, nod: 10 + p.cu * 0.3, hl: ['core'] as ['core'], legs };
    const tmp = sideBody({ ...base, arms: [{ a: -90, b: 0 }, { a: -90, b: 0 }] });
    const hand = add(add(tmp.j.head, mul(tmp.chestN, 6.5)), mul(sub(tmp.j.neck, tmp.j.shoulder), -0.25));
    const arm = { to: hand, hint: add(tmp.chestN, v(0, -0.6)), s1: 0.9 };
    const S = sideBody({ ...base, arms: [arm, arm] });
    const rest = (() => {
      const t0 = sideBody({ ...base, torso: 72, curl: 4, nod: 11, arms: [{ a: -90, b: 0 }, { a: -90, b: 0 }] });
      return add(add(t0.j.head, mul(t0.chestN, 6.5)), mul(sub(t0.j.neck, t0.j.shoulder), -0.25));
    })();
    return sideFrame(S, {
      back: [...cableRig(hand, rest, CC_PULLEY, 150, 160), eq.post(v(126, 160), v(150, 160)), eq.post(v(126, 160), CC_PULLEY, 2), eq.rect(52, 0, 62, 1.5)],
      mid: [{ t: 'line', a: hand, b: at(hand, CC_PULLEY, 9), w: 3.4, tone: 'muted' }],
    }, [touch('near hand on rope', S.j.hand, hand), onFloor('knee on mat', add(S.j.knee, v(0, -4.4)))]);
  },
};

export const MOVES: Record<string, MoveDef> = Object.fromEntries(
  [
    bench_press, incline_db_press, lat_pulldown, pull_up, hanging_knee_raise, shoulder_press, seated_cable_row, lateral_raise,
    rear_delt_fly, biceps_curl, triceps_pushdown, squat, leg_press, rdl, walking_lunge, bulgarian_split_squat, leg_curl,
    calf_raise, plank, side_plank, dead_bug, cable_crunch,
  ].map((m) => [m.id, m]),
);

export const PLAYLISTS: Record<string, PlaylistDef> = {
  squat_or_leg_press: {
    id: 'squat_or_leg_press', name: 'Squat or leg press', playlist: ['squat', 'leg_press'], loops: 2,
    alt: 'Two options shown in turn: a barbell squat to thighs about parallel, then a leg press to knees at about a right angle.',
  },
  core_circuit: {
    id: 'core_circuit', name: 'Core circuit', playlist: ['plank', 'side_plank', 'dead_bug', 'cable_crunch'], loops: 2,
    alt: 'The four circuit moves in turn: plank, side plank, dead bug and cable crunch.',
  },
};

export type AnyMove = { kind: 'move'; def: MoveDef } | { kind: 'list'; def: PlaylistDef; moves: MoveDef[] };

/** Demo for an exercise id, or null when there is none. */
export function moveFor(id: string): AnyMove | null {
  const m = MOVES[id];
  if (m) return { kind: 'move', def: m };
  const l = PLAYLISTS[id];
  if (l) return { kind: 'list', def: l, moves: l.playlist.map((k) => MOVES[k]).filter(Boolean) };
  return null;
}
