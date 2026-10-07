// Fat loss template: three full-body strength days to keep muscle, two cardio days, daily steps and a
// high-protein, high-volume Indian menu. Steady loss (about 0.5 kg a week), beginner-safe.
// OWNER: templates agent. Gym exercises come from the shared EXERCISES library (data/sessions.ts).
import type { PlanBody } from './templates';
import type { RoadmapStep, SessionKey } from '../data/plan';
import { EXERCISES, type Exercise, type ExUnit, type SessionDef } from '../data/sessions';
import type { DayMenu, Meal } from '../data/food';
import type { ChecklistDef } from '../data/checklists';

function ex(id: string, sets: number, repLow: number, repHigh: number, unit: ExUnit = 'reps'): Exercise {
  const base = EXERCISES[id];
  if (!base) throw new Error(`Unknown exercise ${id}`);
  return { ...base, how: [...base.how] as Exercise['how'], avoid: [...base.avoid], sets, repLow, repHigh, unit };
}

const sum = (m: Meal[], k: 'kcal' | 'protein') => m.reduce((n, x) => n + x[k], 0);
const menu = (diet: DayMenu['diet'], label: string, meals: Meal[]): DayMenu => ({
  diet, label, kcal: sum(meals, 'kcal'), protein: sum(meals, 'protein'), meals,
});

function roadmap(): RoadmapStep[] {
  return [
    {
      id: 'fl_1', n: 1, when: 'Day 1–3', title: 'Baseline',
      detail: 'Weigh in on 3 mornings (after the toilet, before food) and use the average. Measure your waist at the belly button and take front, side and back photos. If you have a health condition, check with a doctor first.',
      doneWhen: 'You have start weight, waist and photos', unlockMonth: 1,
    },
    {
      id: 'fl_2', n: 2, when: 'Weeks 1–2', title: '8,000 steps a day',
      detail: 'Walk 10 minutes after lunch and dinner. Build up from your current steps by about 1,000 a week until you reach 8,000.',
      doneWhen: '8,000+ steps on 5 of 7 days, two weeks in a row', unlockMonth: 1,
    },
    {
      id: 'fl_3', n: 3, when: 'Weeks 3–4', title: 'Protein habit',
      detail: 'Protein at every meal: curd, dal, paneer, eggs, chicken or fish. Aim for 120 g a day. Follow the day menu, fill half the plate with veg.',
      doneWhen: 'Protein target hit 5 days a week', unlockMonth: 1,
    },
    {
      id: 'fl_4', n: 4, when: 'Month 2', title: 'First 4-week check',
      detail: 'Compare your weekly average weight, not single days. Down 1 to 2 kg is fine. Waist down 1–3 cm. Lifts the same or heavier.',
      doneWhen: 'Weight and waist trending down, strength holding', unlockMonth: 2,
    },
    {
      id: 'fl_5', n: 5, when: 'Month 2–3', title: 'Steady loss',
      detail: 'Lose about 0.5 kg a week. Stuck for 3 weeks? Add 2,000 steps or cut 150 kcal (one roti less). Losing over 1 kg a week? Eat a little more.',
      doneWhen: 'Weight down 3–4 kg from the start', unlockMonth: 2,
    },
    {
      id: 'fl_6', n: 6, when: 'Month 3', title: 'Maintenance week',
      detail: 'One week eating about 300 kcal more (extra roti or rice). Keep lifting and walking. The scale may go up 0.5–1 kg of water; it drops again.',
      doneWhen: 'One week at maintenance, then back to the plan', unlockMonth: 3,
    },
    {
      id: 'fl_7', n: 7, when: 'Month 4', title: '3-month check',
      detail: 'Compare Month 0 vs Month 3 photos, waist and lifts. Note what worked and the one habit that slipped most.',
      doneWhen: 'Waist smaller, lifts the same or heavier', unlockMonth: 4,
    },
    {
      id: 'fl_8', n: 8, when: 'Month 5–12', title: 'Keep it off',
      detail: 'Repeat 8–10 weeks of the plan, then 1 maintenance week, until you reach your goal. Then eat at maintenance and keep lifting, steps and protein.',
      doneWhen: 'Within 1–2 kg of your goal for 8 weeks', unlockMonth: 5,
    },
  ];
}

function sessions(): Record<SessionKey, SessionDef> {
  return {
    upper_a: {
      key: 'upper_a', kind: 'gym', label: 'Full body A', short: 'Full A', minutes: 55, focus: 'Squat, bench, row, core',
      exercises: [
        ex('squat', 3, 8, 10),
        ex('bench_press', 3, 8, 10),
        ex('seated_cable_row', 3, 10, 12),
        ex('leg_curl', 2, 12, 15),
        ex('plank', 3, 30, 45, 'sec'),
      ],
    },
    cardio_skills: {
      key: 'cardio_skills', kind: 'cardio_skills', label: 'Cardio + core', short: 'Cardio', minutes: 50, focus: 'Steady cardio and a core circuit',
      blocks: [
        { label: 'Cardio', minutes: '30–40 min', routine: 'cardio' },
        { label: 'Core circuit', minutes: '10 min', routine: 'coreCircuit' },
      ],
    },
    upper_b: {
      key: 'upper_b', kind: 'gym', label: 'Full body B', short: 'Full B', minutes: 60, focus: 'Hinge, incline press, pulldown, core',
      exercises: [
        ex('romanian_deadlift', 3, 8, 10),
        ex('incline_db_press', 3, 8, 12),
        ex('lat_pulldown', 3, 10, 12),
        ex('walking_lunge', 2, 10, 12, 'per leg'),
        ex('lateral_raise', 2, 12, 15),
        ex('hanging_knee_raise', 3, 8, 12),
      ],
    },
    recovery: {
      key: 'recovery', kind: 'recovery', label: 'Mobility + easy walk', short: 'Mobility', minutes: 45, focus: 'Active rest: stretch and walk',
      blocks: [
        { label: 'Mobility', minutes: '12 min', routine: 'mobility' },
        { label: 'Easy walk', minutes: '35 min', routine: 'easyWalk' },
      ],
    },
    lower_a: {
      key: 'lower_a', kind: 'gym', label: 'Full body C', short: 'Full C', minutes: 60, focus: 'Leg press, overhead press, pull-up, core',
      exercises: [
        ex('squat_or_leg_press', 3, 10, 12),
        ex('shoulder_press', 3, 8, 12),
        ex('pull_up', 3, 5, 8),
        ex('bulgarian_split_squat', 2, 8, 10, 'per leg'),
        ex('rear_delt_fly', 2, 12, 15),
        ex('core_circuit', 1, 10, 10, 'min'),
      ],
    },
    lower_b: {
      key: 'lower_b', kind: 'cardio_skills', label: 'Long walk', short: 'Long walk', minutes: 60, focus: 'A long easy walk outdoors',
      blocks: [
        { label: 'Long walk (keep going after the timer)', minutes: '45–60 min', routine: 'easyWalk' },
        { label: 'Mobility', minutes: '12 min', routine: 'mobility' },
      ],
    },
    rest: {
      key: 'rest', kind: 'rest', label: 'Rest + Sunday check', short: 'Rest', minutes: 15, focus: 'Rest, weigh in, score your week',
      blocks: [{ label: 'Sunday check', minutes: '15 min', action: 'sunday' }],
    },
  };
}

function menus(): Record<DayMenu['diet'], DayMenu> {
  const veg: Meal[] = [
    { id: 'breakfast', time: '7:30', name: 'Breakfast', items: ['2 moong dal chillas (60 g dal)', 'Paneer or tofu filling (50 g)', 'Mint chutney', 'Cucumber slices'], kcal: 380, protein: 24 },
    { id: 'mid', time: '11:00', name: 'Mid-morning', items: ['Hung curd from toned milk (200 g)', '1 bowl papaya'], kcal: 200, protein: 18 },
    { id: 'lunch', time: '13:30', name: 'Lunch', items: ['2 rotis', '1 bowl dal', '1 big bowl sabzi (palak, lauki or beans)', 'Big salad', '1 glass buttermilk'], kcal: 520, protein: 24 },
    { id: 'pre', time: '17:00', name: 'Before the gym', items: ['1 scoop whey in water', '1 apple'], kcal: 210, protein: 25 },
    { id: 'dinner', time: '20:00', name: 'Dinner', items: ['Soya chunk curry (40 g dry)', '1 roti', '1 big bowl mixed veg or clear veg soup', 'Salad'], kcal: 430, protein: 29 },
    { id: 'bed', time: '22:00', name: 'Before bed', items: ['200 ml toned milk'], kcal: 100, protein: 7 },
  ];
  const nonVeg: Meal[] = [
    { id: 'breakfast', time: '7:30', name: 'Breakfast', items: ['Omelette: 2 whole eggs + 3 whites, onion, tomato, spinach', '2 slices brown bread'], kcal: 360, protein: 29 },
    { id: 'mid', time: '11:00', name: 'Mid-morning', items: ['Hung curd from toned milk (200 g)', '1 bowl papaya'], kcal: 200, protein: 18 },
    { id: 'lunch', time: '13:30', name: 'Lunch', items: ['Chicken curry, light on oil (150 g raw weight)', '1 roti', '½ cup rice', 'Big salad', '1 glass buttermilk'], kcal: 530, protein: 42 },
    { id: 'pre', time: '17:00', name: 'Before the gym', items: ['Roasted chana (30 g)', '1 apple or orange'], kcal: 200, protein: 7 },
    { id: 'dinner', time: '20:00', name: 'Dinner', items: ['Fish curry (120 g) or egg curry (2 eggs)', '1 roti', '1 big bowl mixed veg or clear veg soup', 'Salad'], kcal: 440, protein: 32 },
    { id: 'bed', time: '22:00', name: 'Before bed', items: ['200 ml toned milk'], kcal: 100, protein: 7 },
  ];
  return {
    veg: menu('veg', 'Veg day', veg),
    non_veg: menu('non_veg', 'Non-veg day', nonVeg),
  };
}

function checklists(): ChecklistDef[] {
  return [
    {
      id: 'kitchen_reset', title: 'Kitchen reset', icon: 'food',
      intro: 'Make the easy choice the good one. Do this once, then top up each week.',
      groups: [
        {
          title: 'Move out of sight',
          items: [
            { key: 'k_sweets', text: 'Sweets, biscuits and namkeen out of the house (or in a closed box, top shelf)' },
            { key: 'k_drinks', text: 'No sugary drinks or packaged juice in the fridge' },
            { key: 'k_oil', text: 'Oil in a measuring spoon jar, not poured from the bottle' },
          ],
        },
        {
          title: 'Keep ready',
          items: [
            { key: 'k_curd', text: 'Curd or hung curd in the fridge' },
            { key: 'k_protein', text: 'Eggs, paneer, tofu or soya chunks stocked' },
            { key: 'k_veg', text: 'Cut salad veg in a box at eye level' },
            { key: 'k_fruit', text: 'Fruit on the counter' },
            { key: 'k_snacks', text: 'Roasted chana or makhana for snack time' },
            { key: 'k_water', text: 'A filled water bottle where you work' },
          ],
        },
      ],
    },
    {
      id: 'eating_out', title: 'Eating out', icon: 'shopping',
      intro: 'One meal out does not undo a week. These keep it on track.',
      groups: [
        {
          title: 'Order',
          items: [
            { key: 'e_protein', text: 'Pick a protein first: tandoori chicken, fish tikka, paneer tikka, dal' },
            { key: 'e_dry', text: 'Tandoori or dry dishes over cream or butter gravies' },
            { key: 'e_roti', text: 'Plain roti or phulka over naan, paratha or biryani' },
            { key: 'e_salad', text: 'Salad or raita on the side' },
            { key: 'e_drinks', text: 'Water, buttermilk or lime soda without sugar' },
          ],
        },
        {
          title: 'While you eat',
          items: [
            { key: 'e_slow', text: 'Eat slowly; stop when you are about 80% full' },
            { key: 'e_share', text: 'Share dessert or skip it' },
            { key: 'e_next', text: 'Next meal back on the plan, no skipping meals to "make up"' },
          ],
        },
      ],
    },
  ];
}

export function fatLossPlan(): PlanBody {
  return {
    id: 'me', template: 'fatloss', name: 'Fat loss',
    roadmap: roadmap(),
    // Mon Full A, Tue cardio, Wed Full B, Thu mobility + walk, Fri Full C, Sat long walk, Sun rest + check.
    week: ['upper_a', 'cardio_skills', 'upper_b', 'recovery', 'lower_a', 'lower_b', 'rest'],
    sessions: sessions(),
    menus: menus(),
    checklists: checklists(),
    rule: 'Small daily wins: steps, protein, sleep. The scale follows.',
  };
}
