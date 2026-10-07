// General fitness template: three full-body gym days, one cardio day, walks and mobility. Beginner-safe.
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
      id: 'fit_1', n: 1, when: 'Day 1–3', title: 'Baseline',
      detail: 'Weigh in, measure your waist and take front, side and back photos. Time a brisk 2 km walk or jog. If you have a health condition, check with a doctor first.',
      doneWhen: 'You have start numbers, photos and a 2 km time', unlockMonth: 1,
    },
    {
      id: 'fit_2', n: 2, when: 'Month 1', title: 'Learn the lifts',
      detail: 'Light weights, clean form. Stop every set with 2–3 reps left in the tank. Film one set of squat and Romanian deadlift and compare with the cues.',
      doneWhen: 'Every lift feels smooth and controlled', unlockMonth: 1,
    },
    {
      id: 'fit_3', n: 3, when: 'Month 2', title: 'Four weeks in a row',
      detail: 'Three full-body sessions and one cardio day every week. Missed a day? Do the next session in order. Add a rep or a little weight when you can.',
      doneWhen: '12 gym sessions done in 4 weeks', unlockMonth: 2,
    },
    {
      id: 'fit_4', n: 4, when: 'Week 8', title: 'First strength check',
      detail: 'Write down your best set for squat, bench press and lat pulldown in Progress. Compare with Week 1.',
      doneWhen: 'Main lifts heavier than Week 1, form still clean', unlockMonth: 2,
    },
    {
      id: 'fit_5', n: 5, when: 'Month 3', title: 'Add cardio volume',
      detail: 'Saturday cardio up to 45 minutes. Walk 8,000 steps a day. Breathe hard but stay able to talk.',
      doneWhen: '45 minutes of cardio feels easy, 8,000 steps most days', unlockMonth: 3,
    },
    {
      id: 'fit_6', n: 6, when: 'Month 4', title: '3-month check',
      detail: 'Compare Month 0 vs Month 3: photos, waist, lifts and your 2 km time. Pick the one weakest area to push next.',
      doneWhen: 'Stronger on every main lift and faster on the 2 km', unlockMonth: 4,
    },
    {
      id: 'fit_7', n: 7, when: 'Month 5–11', title: 'Keep progressing',
      detail: 'Same three sessions. When you hit the top of the rep range on every set, add 2.5 kg. Every 8–10 weeks take one lighter week (half the sets).',
      doneWhen: 'You train 3× a week without thinking about it', unlockMonth: 5,
    },
    {
      id: 'fit_8', n: 8, when: 'Month 12', title: '12-month review',
      detail: 'Retest everything from Day 1. Set your next goal: a strength number, a 5 km run or a new sport.',
      doneWhen: 'A full year of training and a new goal written down', unlockMonth: 12,
    },
  ];
}

function sessions(): Record<SessionKey, SessionDef> {
  return {
    upper_a: {
      key: 'upper_a', kind: 'gym', label: 'Full body A', short: 'Full A', minutes: 60, focus: 'Squat, bench, row, core',
      exercises: [
        ex('squat', 3, 6, 10),
        ex('bench_press', 3, 6, 10),
        ex('seated_cable_row', 3, 8, 12),
        ex('leg_curl', 2, 10, 15),
        ex('lateral_raise', 2, 12, 15),
        ex('plank', 3, 30, 45, 'sec'),
      ],
    },
    recovery: {
      key: 'recovery', kind: 'recovery', label: 'Walk + mobility', short: 'Walk', minutes: 50, focus: 'Easy walk and stretching',
      blocks: [
        { label: 'Easy walk', minutes: '30–35 min', routine: 'easyWalk' },
        { label: 'Mobility', minutes: '12 min', routine: 'mobility' },
      ],
    },
    upper_b: {
      key: 'upper_b', kind: 'gym', label: 'Full body B', short: 'Full B', minutes: 60, focus: 'Hinge, incline press, pulldown, core',
      exercises: [
        ex('romanian_deadlift', 3, 8, 10),
        ex('incline_db_press', 3, 8, 12),
        ex('lat_pulldown', 3, 8, 12),
        ex('walking_lunge', 2, 8, 10, 'per leg'),
        ex('biceps_curl', 2, 10, 12),
        ex('hanging_knee_raise', 3, 8, 12),
      ],
    },
    lower_b: {
      key: 'lower_b', kind: 'recovery', label: 'Rest or mobility', short: 'Mobility', minutes: 20, focus: 'Rest, or a short stretch',
      blocks: [
        { label: 'Mobility', minutes: '12 min', routine: 'mobility' },
        { label: 'Posture drills (optional)', minutes: '10 min', routine: 'posture' },
      ],
    },
    lower_a: {
      key: 'lower_a', kind: 'gym', label: 'Full body C', short: 'Full C', minutes: 65, focus: 'Leg press, overhead press, pull-up, core',
      exercises: [
        ex('squat_or_leg_press', 3, 8, 12),
        ex('shoulder_press', 3, 8, 10),
        ex('pull_up', 3, 5, 8),
        ex('romanian_deadlift', 2, 10, 12),
        ex('triceps_pushdown', 2, 10, 12),
        ex('core_circuit', 1, 10, 10, 'min'),
      ],
    },
    cardio_skills: {
      key: 'cardio_skills', kind: 'cardio_skills', label: 'Cardio', short: 'Cardio', minutes: 55, focus: 'Steady cardio, then stretch',
      blocks: [
        { label: 'Cardio', minutes: '30–45 min', routine: 'cardio' },
        { label: 'Mobility', minutes: '12 min', routine: 'mobility' },
      ],
    },
    rest: {
      key: 'rest', kind: 'rest', label: 'Rest + Sunday check', short: 'Rest', minutes: 15, focus: 'Rest, then score your week',
      blocks: [{ label: 'Sunday check', minutes: '15 min', action: 'sunday' }],
    },
  };
}

function menus(): Record<DayMenu['diet'], DayMenu> {
  const veg: Meal[] = [
    { id: 'breakfast', time: '7:30', name: 'Breakfast', items: ['2 moong dal chillas (80 g dal)', 'Paneer filling (50 g)', 'Green chutney'], kcal: 480, protein: 28 },
    { id: 'mid', time: '11:00', name: 'Mid-morning', items: ['Hung curd or Greek yoghurt (200 g)', '1 banana'], kcal: 260, protein: 18 },
    { id: 'lunch', time: '13:30', name: 'Lunch', items: ['3 rotis', '1 bowl rajma or chole', 'Cucumber raita', 'Salad'], kcal: 620, protein: 24 },
    { id: 'pre', time: '17:00', name: 'Before the gym', items: ['1 scoop whey in water', 'Roasted chana (30 g)'], kcal: 230, protein: 30 },
    { id: 'dinner', time: '20:30', name: 'Dinner', items: ['Paneer or tofu bhurji (100 g)', '2 rotis', '1 bowl mixed veg sabzi'], kcal: 600, protein: 27 },
    { id: 'bed', time: '22:00', name: 'Before bed', items: ['200 ml milk'], kcal: 120, protein: 7 },
  ];
  const nonVeg: Meal[] = [
    { id: 'breakfast', time: '7:30', name: 'Breakfast', items: ['Egg bhurji (2 whole eggs + 2 whites)', '2 slices brown bread', '1 banana'], kcal: 480, protein: 27 },
    { id: 'mid', time: '11:00', name: 'Mid-morning', items: ['Hung curd or Greek yoghurt (200 g)', '1 guava or apple'], kcal: 230, protein: 18 },
    { id: 'lunch', time: '13:30', name: 'Lunch', items: ['Chicken curry (150 g raw weight)', '1 cup rice', '1 roti', 'Salad'], kcal: 650, protein: 42 },
    { id: 'pre', time: '17:00', name: 'Before the gym', items: ['1 scoop whey in water', '1 banana'], kcal: 230, protein: 25 },
    { id: 'dinner', time: '20:30', name: 'Dinner', items: ['2 rotis with 1 tsp ghee', '1 bowl dal', '1 bowl mixed veg', 'Salad'], kcal: 560, protein: 19 },
    { id: 'bed', time: '22:00', name: 'Before bed', items: ['200 ml milk'], kcal: 120, protein: 7 },
  ];
  return {
    veg: menu('veg', 'Veg day', veg),
    non_veg: menu('non_veg', 'Non-veg day', nonVeg),
  };
}

function checklists(): ChecklistDef[] {
  return [
    {
      id: 'gym_bag', title: 'Gym bag', icon: 'dumbbell',
      intro: 'Pack it the night before so there is nothing to stop you going.',
      groups: [
        {
          title: 'In the bag',
          items: [
            { key: 'g_shoes', text: 'Flat, stable shoes for lifting' },
            { key: 'g_clothes', text: 'Clothes you can squat in' },
            { key: 'g_bottle', text: 'Water bottle, filled' },
            { key: 'g_towel', text: 'Small towel' },
            { key: 'g_snack', text: 'Banana or whey for after, if dinner is late' },
            { key: 'g_lock', text: 'Lock and headphones' },
          ],
        },
        {
          title: 'Before you leave',
          items: [
            { key: 'g_session', text: "Open today's session and check last week's weights" },
            { key: 'g_food', text: 'Ate a meal or snack 1–2 hours before' },
          ],
        },
      ],
    },
    {
      id: 'sunday_prep', title: 'Sunday prep', icon: 'calendar',
      intro: 'Twenty minutes on Sunday makes the whole week easier.',
      groups: [
        {
          title: 'Plan',
          items: [
            { key: 's_check', text: 'Sunday check done and one thing to fix picked' },
            { key: 's_times', text: 'Gym times for Mon, Wed and Fri in your calendar' },
            { key: 's_weights', text: 'Lifts to add weight or a rep to this week noted' },
          ],
        },
        {
          title: 'Food',
          items: [
            { key: 's_shop', text: 'Shopping done: curd, eggs or paneer, dal, fruit, veg' },
            { key: 's_cook', text: 'Dal or chicken cooked for two days' },
            { key: 's_chana', text: 'Roasted chana and whey stocked for gym days' },
          ],
        },
        {
          title: 'Recovery',
          items: [
            { key: 's_sleep', text: 'Bedtime set for 7–8 hours of sleep' },
            { key: 's_sore', text: 'Any pain (not soreness) noted, and that lift kept lighter' },
          ],
        },
      ],
    },
  ];
}

export function fitnessPlan(): PlanBody {
  return {
    id: 'me', template: 'fitness', name: 'General fitness',
    roadmap: roadmap(),
    // Mon Full A, Tue walk + mobility, Wed Full B, Thu rest or mobility, Fri Full C, Sat cardio, Sun rest + check.
    week: ['upper_a', 'recovery', 'upper_b', 'lower_b', 'lower_a', 'cardio_skills', 'rest'],
    sessions: sessions(),
    menus: menus(),
    checklists: checklists(),
    rule: 'Show up three times a week. Add a little weight or a rep each time.',
  };
}
