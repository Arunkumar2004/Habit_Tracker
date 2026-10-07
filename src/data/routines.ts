// Guided routines with a timer (blueprint 2.2 d). Finishing a routine ticks its habit for the day.
import { CORE_CIRCUIT, WARMUP, type RoutineKey, type RoutineStep } from './sessions';

export type { RoutineKey, RoutineStep } from './sessions';

export interface Routine {
  key: RoutineKey;
  name: string;
  icon: string;
  /** Shown on cards, e.g. "10 min". */
  time: string;
  intro: string;
  /** Built-in habit id ticked when the routine is finished. */
  habit?: string;
  /** Plan month the routine unlocks (Posing: Month 4). */
  unlockMonth?: number;
  steps: RoutineStep[];
}

const twice = (name: string, sec: number, cue: string): RoutineStep[] => [
  { name: `${name} · 1/2`, sec, cue },
  { name: `${name} · 2/2`, sec, cue },
];

export const ROUTINES: Record<RoutineKey, Routine> = {
  posture: {
    key: 'posture', name: 'Posture drills', icon: 'posture', time: '10 min', habit: 'posture',
    intro: 'Six drills that pull your shoulders back and stack your head over your body.',
    steps: [
      ...twice('Wall hold', 60, 'Heels, glutes, upper back and head on the wall. Chin level. Breathe.'),
      { name: 'Chin tuck · 2×10', sec: 60, cue: 'Slide your chin straight back to make a double chin, hold 2 s, release.' },
      { name: 'Wall angel · 2×10', sec: 90, cue: 'Back on the wall, arms in a W, slide up to a Y and back down slowly.' },
      { name: 'Upper back roll · 2×10', sec: 90, cue: 'Foam roller under your upper back, hands behind your head, roll slowly.' },
      { name: 'Hip-front stretch (left)', sec: 30, cue: 'Kneel on the left knee, squeeze the left glute, shift forward gently.' },
      { name: 'Hip-front stretch (right)', sec: 30, cue: 'Kneel on the right knee, squeeze the right glute, shift forward gently.' },
      ...twice('Plank', 45, 'Straight line from head to heels. Hold 30–60 s.'),
    ],
  },
  walk: {
    key: 'walk', name: 'Runway walk', icon: 'walk', time: '20 min', habit: 'walk',
    intro: 'Tape a straight line on the floor and keep your phone ready to film.',
    steps: [
      { name: 'Posture set-up', sec: 180, cue: 'Tall spine, shoulders down and back, chin level, eyes forward.' },
      { name: 'Walk the tape line', sec: 300, cue: 'One foot in front of the other on the line. Arms relaxed, small swing.' },
      { name: 'Stop · hold 2 s · turn', sec: 300, cue: 'Walk to the end, stop, hold for two seconds, turn cleanly, walk back.' },
      { name: 'Film yourself', sec: 240, cue: 'Phone at hip height. Film three full walks: front, side, turn.' },
      { name: 'Watch the video', sec: 180, cue: 'Check head, shoulders and feet. Pick one thing to fix next time.' },
    ],
  },
  posing: {
    key: 'posing', name: 'Posing', icon: 'camera', time: '15 min', unlockMonth: 4,
    intro: 'Phone on a timer or a friend taking photos. Natural light from a window is best.',
    steps: [
      { name: 'Face warm-up', sec: 120, cue: 'Big smile, relax. Raise brows, relax. Roll your jaw. Shake out your shoulders.' },
      { name: '8 poses × 2 photos', sec: 300, cue: 'Front, three-quarter, side, back, hands in pockets, lean, sit, walk-in. Two photos each.' },
      { name: '5 faces', sec: 180, cue: 'Neutral, soft smile, big smile, intense, looking away. Eyes alive in each.' },
      { name: 'Free posing', sec: 180, cue: 'Move slowly between poses. Change one thing at a time: hands, chin, weight.' },
      { name: 'Pick your best 3', sec: 120, cue: 'Choose three photos and note what made them work.' },
    ],
  },
  skinAM: {
    key: 'skinAM', name: 'Skincare AM', icon: 'sun', time: '3 min', habit: 'skin_am',
    intro: 'Three steps every morning. Same products for at least 4 weeks before judging them.',
    steps: [
      { name: 'Face wash', sec: 60, cue: 'Gentle cleanser, lukewarm water, 30 seconds of massage, pat dry.' },
      { name: 'Moisturiser', sec: 60, cue: 'A pea-sized amount over the face and neck.' },
      { name: 'SPF 30–50', sec: 60, cue: 'Two finger-lengths for face and neck, even on cloudy days.' },
    ],
  },
  skinPM: {
    key: 'skinPM', name: 'Skincare PM', icon: 'moon', time: '3 min', habit: 'skin_pm',
    intro: 'Clean skin before bed. Treatment only if you need it.',
    steps: [
      { name: 'Face wash', sec: 60, cue: 'Wash off sunscreen, sweat and dust. Pat dry.' },
      { name: 'Treatment (only if needed)', sec: 60, cue: 'Spot treatment on breakouts only. Skip this step if your skin is clear.' },
      { name: 'Moisturiser', sec: 60, cue: 'A pea-sized amount. Let it sink in before your pillow.' },
    ],
  },
  mobility: {
    key: 'mobility', name: 'Mobility', icon: 'heart', time: '12 min',
    intro: 'Slow and easy. Stretch to mild tension, never pain.',
    steps: [
      { name: 'Knee-to-wall', sec: 120, cue: 'Foot a hand away from the wall, drive the knee to the wall, heel down. Switch at half time.' },
      { name: '90/90 hip switch', sec: 120, cue: 'Sit with both knees bent at 90°. Rotate the knees side to side slowly.' },
      { name: 'Kneeling hip stretch', sec: 120, cue: 'Half-kneel, squeeze the back glute, shift forward. Switch at half time.' },
      { name: 'Towel leg raise', sec: 120, cue: 'Lie down, towel around one foot, raise the straight leg. Switch at half time.' },
      { name: 'Open book', sec: 120, cue: 'Lie on your side, knees bent, open the top arm across to the floor behind you.' },
      { name: 'Doorway stretch', sec: 120, cue: 'Forearms on the door frame, step through gently to open the chest.' },
    ],
  },
  coreCircuit: {
    key: 'coreCircuit', name: 'Core circuit', icon: 'target', time: '10 min',
    intro: 'Plank, side plank, dead bug, cable crunch, rest. Three rounds.',
    steps: CORE_CIRCUIT,
  },
  warmup: {
    key: 'warmup', name: 'Warm-up', icon: 'flame', time: '10 min',
    intro: 'Warm muscles lift more and get hurt less. Do this before every gym session.',
    steps: WARMUP,
  },
  easyWalk: {
    key: 'easyWalk', name: 'Recovery walk', icon: 'steps', time: '35 min', habit: 'gym',
    intro: 'An easy outdoor walk. It helps your legs recover and adds to your steps.',
    steps: [
      { name: 'Easy pace', sec: 300, cue: 'Start slow. Shoulders relaxed, tall posture.' },
      { name: 'Brisk pace', sec: 1500, cue: 'Walk with purpose. You can still talk in full sentences.' },
      { name: 'Cool down', sec: 300, cue: 'Slow down for the last few minutes. Drink some water.' },
    ],
  },
  cardio: {
    key: 'cardio', name: 'Cardio', icon: 'flame', time: '40 min', habit: 'gym',
    intro: 'Bike, cross-trainer, incline walk, swim or a run. Steady pace.',
    steps: [
      { name: 'Easy start', sec: 300, cue: 'Build up the pace slowly.' },
      { name: 'Steady pace', sec: 1800, cue: 'Breathing harder, but you could still say a short sentence.' },
      { name: 'Cool down', sec: 300, cue: 'Slow right down and let your heart rate settle.' },
    ],
  },
  groomingCheck: {
    key: 'groomingCheck', name: 'Grooming check', icon: 'grooming', time: '5 min',
    intro: 'A quick weekly check in good light, so nothing gets missed before a casting.',
    steps: [
      { name: 'Hair', sec: 60, cue: 'Length and shape still right? Book a trim if it is 3–4 weeks since the last one.' },
      { name: 'Beard and neckline', sec: 60, cue: 'Clean neckline and cheek line. Trim stray hairs.' },
      { name: 'Brows, nose and ears', sec: 60, cue: 'Tidy only stray hairs. Keep brows natural.' },
      { name: 'Nails and hands', sec: 60, cue: 'Short and clean. Moisturise dry hands.' },
      { name: 'Skin and lips', sec: 60, cue: 'Any breakouts or dry patches? Lip balm if lips are dry.' },
    ],
  },
};

/** Routines that are part of every day (shown on the week view). */
export const DAILY_ROUTINES: RoutineKey[] = ['skinAM', 'posture', 'skinPM'];

export function routineSeconds(r: Routine): number {
  return r.steps.reduce((n, s) => n + s.sec, 0);
}
