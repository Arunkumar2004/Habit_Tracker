// Plan content: gym sessions, non-gym days, the 10-minute warm-up and the core circuit (blueprint 2.2 b and c).
// Read-only. The workout logger, week view and progression engine read from here.
import type { SessionKey } from './plan';

export type ExUnit = 'reps' | 'sec' | 'per leg' | 'min';
export type ExKind = 'compound' | 'isolation' | 'core';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repLow: number;
  repHigh: number;
  unit: ExUnit;
  restSec: number;
  /** Priority (★): shoulders and back, the parts that change how you look on the runway. */
  priority: boolean;
  how: [string, string, string];
  avoid: string[];
  kind: ExKind;
  /** No load needed (kg column means added weight). */
  bodyweight?: boolean;
  /** Run as a timed circuit instead of logging sets (Lower B core circuit). */
  circuit?: RoutineKey;
}

/** Keys of the guided routines (data/routines.ts). Declared here so sessions and routines share one name list. */
export type RoutineKey =
  | 'posture' | 'walk' | 'posing' | 'skinAM' | 'skinPM' | 'mobility' | 'coreCircuit' | 'warmup'
  | 'easyWalk' | 'cardio' | 'groomingCheck';

export interface RoutineStep {
  name: string;
  /** Countdown for this step, in seconds. */
  sec: number;
  cue: string;
}

type Lib = Omit<Exercise, 'sets' | 'repLow' | 'repHigh' | 'unit'>;
const LIB: Record<string, Lib> = {
  bench_press: {
    id: 'bench_press', name: 'Bench press', restSec: 150, priority: false, kind: 'compound',
    how: ['Lie flat, feet down, shoulder blades pulled back and down.', 'Lower the bar to mid-chest with elbows at about 45°.', 'Press up and slightly back until your arms are straight.'],
    avoid: ['Bouncing the bar off your chest.', 'Lifting your hips off the bench.'],
  },
  lat_pulldown: {
    id: 'lat_pulldown', name: 'Lat pulldown', restSec: 90, priority: true, kind: 'compound',
    how: ['Grip a little wider than your shoulders, thighs locked under the pad.', 'Pull the bar to your upper chest, elbows down and back.', 'Let it rise slowly until your arms are straight.'],
    avoid: ['Leaning far back and swinging.', 'Pulling the bar behind your neck.'],
  },
  shoulder_press: {
    id: 'shoulder_press', name: 'Shoulder press', restSec: 90, priority: true, kind: 'compound',
    how: ['Sit tall, dumbbells at shoulder height, palms forward.', 'Press up until your arms are almost straight.', 'Lower slowly back to shoulder height.'],
    avoid: ['Arching your lower back.', 'Clanking the weights together at the top.'],
  },
  seated_cable_row: {
    id: 'seated_cable_row', name: 'Seated cable row', restSec: 90, priority: true, kind: 'compound',
    how: ['Sit tall, knees soft, chest up.', 'Pull the handle to your lower ribs and squeeze your shoulder blades.', 'Let your arms go long slowly, without rounding.'],
    avoid: ['Rocking your body to move the weight.', 'Shrugging your shoulders up.'],
  },
  lateral_raise: {
    id: 'lateral_raise', name: 'Lateral raise', restSec: 60, priority: true, kind: 'isolation',
    how: ['Stand tall, light dumbbells at your sides, elbows soft.', 'Raise your arms out to shoulder height, leading with the elbows.', 'Lower slowly over two to three seconds.'],
    avoid: ['Going heavy and swinging.', 'Shrugging your shoulders up to your ears.'],
  },
  biceps_curl: {
    id: 'biceps_curl', name: 'Biceps curl', restSec: 60, priority: false, kind: 'isolation',
    how: ['Stand tall, elbows pinned to your sides.', 'Curl the weight up without moving your elbows.', 'Lower all the way down slowly.'],
    avoid: ['Swinging your back to lift the weight.'],
  },
  triceps_pushdown: {
    id: 'triceps_pushdown', name: 'Triceps rope pushdown', restSec: 60, priority: false, kind: 'isolation',
    how: ['Stand close to the cable, elbows tucked at your sides.', 'Push the rope down and spread the ends at the bottom.', 'Let it come back up to chest height with control.'],
    avoid: ['Letting your elbows drift forward.', 'Leaning over the rope.'],
  },
  squat: {
    id: 'squat', name: 'Squat', restSec: 150, priority: false, kind: 'compound',
    how: ['Bar on your upper back, feet shoulder-width, brace your stomach.', 'Sit down and back until your thighs are at least parallel.', 'Drive up through your whole foot, chest up.'],
    avoid: ['Knees caving in.', 'Rounding your lower back at the bottom.'],
  },
  squat_or_leg_press: {
    id: 'squat_or_leg_press', name: 'Squat or leg press', restSec: 120, priority: false, kind: 'compound',
    how: ['Pick one and stick with it for the month so the numbers compare.', 'Go down until your thighs are at least parallel, knees over toes.', 'Push up through your whole foot without locking your knees hard.'],
    avoid: ['Knees caving in.', 'Lower back lifting off the leg-press pad.'],
  },
  romanian_deadlift: {
    id: 'romanian_deadlift', name: 'Romanian deadlift', restSec: 120, priority: false, kind: 'compound',
    how: ['Stand tall holding the bar, knees slightly bent.', 'Push your hips back and slide the bar down your legs to mid-shin.', 'Squeeze your glutes to stand back up.'],
    avoid: ['Rounding your back.', 'Turning it into a squat by bending the knees a lot.'],
  },
  walking_lunge: {
    id: 'walking_lunge', name: 'Walking lunge', restSec: 90, priority: false, kind: 'compound',
    how: ['Hold dumbbells at your sides, stand tall.', 'Step forward and lower until your back knee nearly touches the floor.', 'Push through the front heel and step into the next lunge.'],
    avoid: ['Front knee falling inwards.', 'Leaning your chest far forward.'],
  },
  bulgarian_split_squat: {
    id: 'bulgarian_split_squat', name: 'Bulgarian split squat', restSec: 90, priority: false, kind: 'compound',
    how: ['Back foot on a bench, front foot a big step ahead.', 'Lower straight down until your front thigh is parallel.', 'Push up through the front heel.'],
    avoid: ['Front heel lifting off the floor.', 'Rushing the reps.'],
  },
  leg_curl: {
    id: 'leg_curl', name: 'Leg curl', restSec: 60, priority: false, kind: 'isolation',
    how: ['Set the pad just above your heels.', 'Curl your heels towards your glutes.', 'Lower slowly, stopping short of the stack touching.'],
    avoid: ['Lifting your hips to cheat the weight up.'],
  },
  calf_raise: {
    id: 'calf_raise', name: 'Calf raise', restSec: 60, priority: false, kind: 'isolation',
    how: ['Balls of your feet on a step, heels hanging off.', 'Rise as high as you can and hold for one second.', 'Lower until you feel a stretch in your calves.'],
    avoid: ['Bouncing fast at the bottom.'],
  },
  plank: {
    id: 'plank', name: 'Plank', restSec: 45, priority: false, kind: 'core', bodyweight: true,
    how: ['Forearms under your shoulders, body in one straight line.', 'Squeeze your glutes and pull your belly button in.', 'Breathe slowly and hold.'],
    avoid: ['Hips sagging or piking up.', 'Holding your breath.'],
  },
  hanging_knee_raise: {
    id: 'hanging_knee_raise', name: 'Hanging knee raise', restSec: 60, priority: false, kind: 'core', bodyweight: true,
    how: ['Hang from a bar with straight arms, shoulders active.', 'Bring your knees up towards your chest and curl your hips.', 'Lower slowly without swinging.'],
    avoid: ['Swinging to get the knees up.'],
  },
  incline_db_press: {
    id: 'incline_db_press', name: 'Incline DB press', restSec: 90, priority: false, kind: 'compound',
    how: ['Bench at about 30°, dumbbells above your upper chest.', 'Lower to the sides of your chest, elbows at about 45°.', 'Press up and slightly together.'],
    avoid: ['Setting the bench too steep (it turns into a shoulder press).'],
  },
  pull_up: {
    id: 'pull_up', name: 'Pull-up', restSec: 120, priority: true, kind: 'compound', bodyweight: true,
    how: ['Grip just wider than your shoulders, hang with straight arms.', 'Pull your chest towards the bar, elbows down to your ribs.', 'Lower all the way down with control. Use the assisted machine or a band if needed.'],
    avoid: ['Kicking or swinging.', 'Half reps that stop short at the bottom.'],
  },
  rear_delt_fly: {
    id: 'rear_delt_fly', name: 'Rear-delt fly', restSec: 60, priority: true, kind: 'isolation',
    how: ['Hinge forward with a flat back, or use the reverse pec-deck.', 'Open your arms out wide, thumbs slightly down.', 'Squeeze the back of your shoulders, then lower slowly.'],
    avoid: ['Using momentum.', 'Squeezing your shoulder blades so much that your traps take over.'],
  },
  core_circuit: {
    id: 'core_circuit', name: 'Core circuit', restSec: 0, priority: false, kind: 'core', bodyweight: true, circuit: 'coreCircuit',
    how: ['Plank 40 s, side plank 30 s each side.', 'Dead bug 10, cable crunch 12, then rest 30 s.', 'Repeat for about 10 minutes (3 rounds).'],
    avoid: ['Rushing: slow and controlled beats fast.', 'Letting your lower back arch on the dead bug.'],
  },
};

function ex(id: string, sets: number, repLow: number, repHigh: number, unit: ExUnit = 'reps'): Exercise {
  const base = LIB[id];
  if (!base) throw new Error(`Unknown exercise ${id}`);
  return { ...base, sets, repLow, repHigh, unit };
}

/** Every exercise in the plan, by id (first definition wins). */
export const EXERCISES: Record<string, Lib> = LIB;

export interface Block {
  label: string;
  minutes: string;
  routine?: RoutineKey;
  /** In-app link instead of a routine (Sunday check lives in Progress). */
  action?: 'sunday';
}

export interface GymSession {
  key: SessionKey;
  kind: 'gym';
  label: string;
  short: string;
  minutes: number;
  focus: string;
  exercises: Exercise[];
}
export interface DayPlan {
  key: SessionKey;
  kind: 'recovery' | 'cardio_skills' | 'rest';
  label: string;
  short: string;
  minutes: number;
  focus: string;
  blocks: Block[];
}
export type SessionDef = GymSession | DayPlan;

export const SESSIONS: Record<SessionKey, SessionDef> = {
  upper_a: {
    key: 'upper_a', kind: 'gym', label: 'Upper A', short: 'Upper A', minutes: 65, focus: 'Chest, back, shoulders, arms',
    exercises: [
      ex('bench_press', 3, 6, 10),
      ex('lat_pulldown', 3, 8, 12),
      ex('shoulder_press', 3, 8, 10),
      ex('seated_cable_row', 3, 8, 12),
      ex('lateral_raise', 3, 12, 15),
      ex('biceps_curl', 2, 10, 12),
      ex('triceps_pushdown', 2, 10, 12),
    ],
  },
  lower_a: {
    key: 'lower_a', kind: 'gym', label: 'Lower A + Core', short: 'Lower A', minutes: 70, focus: 'Legs, glutes, core',
    exercises: [
      ex('squat', 3, 6, 10),
      ex('romanian_deadlift', 3, 8, 10),
      ex('walking_lunge', 3, 8, 12, 'per leg'),
      ex('leg_curl', 3, 10, 15),
      ex('calf_raise', 3, 12, 15),
      ex('plank', 3, 30, 60, 'sec'),
      ex('hanging_knee_raise', 3, 8, 15),
    ],
  },
  upper_b: {
    key: 'upper_b', kind: 'gym', label: 'Upper B', short: 'Upper B', minutes: 70, focus: 'Shoulders and back first',
    exercises: [
      ex('incline_db_press', 3, 8, 12),
      ex('pull_up', 3, 8, 12),
      ex('seated_cable_row', 3, 8, 12),
      ex('lateral_raise', 4, 12, 15),
      ex('rear_delt_fly', 3, 12, 15),
      ex('biceps_curl', 2, 10, 12),
      ex('triceps_pushdown', 2, 10, 12),
    ],
  },
  lower_b: {
    key: 'lower_b', kind: 'gym', label: 'Lower B + Core', short: 'Lower B', minutes: 70, focus: 'Legs, glutes, core circuit',
    exercises: [
      ex('squat_or_leg_press', 3, 8, 12),
      ex('romanian_deadlift', 3, 8, 12),
      ex('bulgarian_split_squat', 3, 8, 12, 'per leg'),
      ex('leg_curl', 3, 10, 15),
      ex('calf_raise', 3, 12, 15),
      ex('core_circuit', 1, 10, 10, 'min'),
    ],
  },
  recovery: {
    key: 'recovery', kind: 'recovery', label: 'Recovery', short: 'Recovery', minutes: 55, focus: 'Easy walk and mobility',
    blocks: [
      { label: 'Easy walk', minutes: '30–40 min', routine: 'easyWalk' },
      { label: 'Mobility', minutes: '15 min', routine: 'mobility' },
    ],
  },
  cardio_skills: {
    key: 'cardio_skills', kind: 'cardio_skills', label: 'Cardio + Skills', short: 'Cardio + Skills', minutes: 100, focus: 'Cardio, posing, grooming, walk',
    blocks: [
      { label: 'Cardio', minutes: '30–45 min', routine: 'cardio' },
      { label: 'Posing', minutes: '15 min', routine: 'posing' },
      { label: 'Grooming check', minutes: '5 min', routine: 'groomingCheck' },
      { label: 'Runway walk', minutes: '20 min', routine: 'walk' },
    ],
  },
  rest: {
    key: 'rest', kind: 'rest', label: 'Rest + Sunday check', short: 'Rest', minutes: 15, focus: 'Rest, then score your week',
    blocks: [{ label: 'Sunday check', minutes: '15 min', action: 'sunday' }],
  },
};

export function isGymSession(s: SessionDef | undefined): s is GymSession {
  return s?.kind === 'gym';
}

/** "3×8–12", "3×8–12/leg", "3×30–60 s", "10 min". */
export function setsLabel(e: Pick<Exercise, 'sets' | 'repLow' | 'repHigh' | 'unit'>): string {
  if (e.unit === 'min') return `${e.repHigh} min`;
  const range = e.repLow === e.repHigh ? `${e.repLow}` : `${e.repLow}–${e.repHigh}`;
  const suffix = e.unit === 'sec' ? ' s' : e.unit === 'per leg' ? '/leg' : '';
  return `${e.sets}×${range}${suffix}`;
}

/** 10-minute warm-up, first in every gym session. */
export const WARMUP: RoutineStep[] = [
  { name: 'Easy cardio', sec: 300, cue: 'Bike, cross-trainer or incline walk. Breathing a bit faster, still able to talk.' },
  { name: 'Arm circles + band pull-aparts', sec: 60, cue: '10 circles each way, then 15 slow pull-aparts.' },
  { name: 'Leg swings', sec: 60, cue: '10 front-to-back and 10 side-to-side on each leg. Hold something for balance.' },
  { name: 'Bodyweight squats', sec: 60, cue: '10 slow squats, chest up, knees out.' },
  { name: 'Glute bridges', sec: 60, cue: '12 bridges, squeeze at the top for one second.' },
  { name: 'Light set of exercise 1', sec: 60, cue: 'About half your working weight for 10 easy reps.' },
];

/** Lower B core circuit: plank 40 s, side plank 30 s/side, dead bug 10, cable crunch 12, rest 30 s. 3 rounds ≈ 10 min. */
const ROUND: RoutineStep[] = [
  { name: 'Plank', sec: 40, cue: 'Straight line from head to heels. Squeeze your glutes.' },
  { name: 'Side plank (left)', sec: 30, cue: 'Elbow under shoulder, hips high.' },
  { name: 'Side plank (right)', sec: 30, cue: 'Elbow under shoulder, hips high.' },
  { name: 'Dead bug × 10', sec: 45, cue: 'Lower back pressed into the floor. Opposite arm and leg, slowly.' },
  { name: 'Cable crunch × 12', sec: 45, cue: 'Kneel, rope by your head, curl your ribs towards your hips.' },
  { name: 'Rest', sec: 30, cue: 'Breathe. Next round starts soon.' },
];
export const CORE_CIRCUIT: RoutineStep[] = [1, 2, 3].flatMap((r) =>
  ROUND.map((s) => ({ ...s, name: `${s.name} · round ${r}/3` })),
);
