import { describe, expect, it } from 'vitest';
import { TEMPLATES, TEMPLATE_ORDER } from './templates';
import type { SessionKey } from '../data/plan';
import { EXERCISES, SESSIONS, isGymSession } from '../data/sessions';
import { ROUTINES } from '../data/routines';

const KEYS: SessionKey[] = ['upper_a', 'lower_a', 'upper_b', 'lower_b', 'recovery', 'cardio_skills', 'rest'];

/** Library ids plus any ids the runway sessions define on their own. */
const KNOWN_EX = new Set<string>([
  ...Object.keys(EXERCISES),
  ...Object.values(SESSIONS).flatMap((s) => (isGymSession(s) ? s.exercises.map((e) => e.id) : [])),
]);

describe.each(TEMPLATE_ORDER)('template %s', (id) => {
  const t = TEMPLATES[id];

  it('builds without throwing, with the right id and template', () => {
    const body = t.build();
    expect(body.id).toBe('me');
    expect(body.template).toBe(id);
    expect(body.name).toBe(t.name);
    expect(body.rule.length).toBeGreaterThan(0);
  });

  it('has a full sessions record whose keys match', () => {
    const { sessions } = t.build();
    expect(Object.keys(sessions).sort()).toEqual([...KEYS].sort());
    for (const k of KEYS) expect(sessions[k].key).toBe(k);
  });

  it('week has 7 valid keys that exist in sessions', () => {
    const { week, sessions } = t.build();
    expect(week).toHaveLength(7);
    for (const k of week) {
      expect(KEYS).toContain(k);
      expect(sessions[k]).toBeDefined();
    }
  });

  it('every gym session has at least 3 exercises from the library', () => {
    const { sessions } = t.build();
    let gym = 0;
    for (const s of Object.values(sessions)) {
      if (!isGymSession(s)) continue;
      gym++;
      expect(s.exercises.length).toBeGreaterThanOrEqual(3);
      for (const e of s.exercises) {
        expect(KNOWN_EX.has(e.id), `${s.key}: ${e.id}`).toBe(true);
        expect(e.sets).toBeGreaterThan(0);
        expect(e.repLow).toBeLessThanOrEqual(e.repHigh);
      }
    }
    expect(gym).toBeGreaterThanOrEqual(3);
  });

  it('every block uses an existing routine or the Sunday action', () => {
    const { sessions } = t.build();
    for (const s of Object.values(sessions)) {
      if (isGymSession(s)) continue;
      expect(s.blocks.length).toBeGreaterThan(0);
      for (const b of s.blocks) {
        if (b.routine) expect(ROUTINES[b.routine], `${s.key}: ${b.routine}`).toBeDefined();
        else expect(b.action).toBe('sunday');
      }
    }
  });

  it('menu meal sums equal the menu totals', () => {
    const { menus } = t.build();
    for (const diet of ['veg', 'non_veg'] as const) {
      const m = menus[diet];
      expect(m.diet).toBe(diet);
      expect(m.meals.length).toBeGreaterThan(0);
      expect(m.meals.reduce((n, x) => n + x.kcal, 0)).toBe(m.kcal);
      expect(m.meals.reduce((n, x) => n + x.protein, 0)).toBe(m.protein);
    }
  });

  it('roadmap ids are unique and n runs 1..N', () => {
    const { roadmap } = t.build();
    expect(roadmap.length).toBeGreaterThan(0);
    expect(new Set(roadmap.map((r) => r.id)).size).toBe(roadmap.length);
    expect(roadmap.map((r) => r.n)).toEqual(roadmap.map((_, i) => i + 1));
  });

  it('checklist ids and item keys are unique', () => {
    const { checklists } = t.build();
    expect(new Set(checklists.map((c) => c.id)).size).toBe(checklists.length);
    for (const c of checklists) {
      const keys = c.groups.flatMap((g) => g.items.map((i) => i.key));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('two builds do not share object references', () => {
    const a = t.build();
    const b = t.build();
    const before = JSON.stringify(b);
    expect(a.sessions).not.toBe(b.sessions);
    expect(a.menus).not.toBe(b.menus);
    expect(a.roadmap).not.toBe(b.roadmap);

    a.week[0] = 'rest';
    a.roadmap[0].title = 'changed';
    a.menus.veg.meals[0].kcal += 999;
    a.checklists.push({ id: 'x', title: 'x', icon: 'list', intro: '', groups: [] });
    for (const s of Object.values(a.sessions)) {
      s.label = 'changed';
      if (isGymSession(s)) {
        s.exercises[0].sets = 99;
        s.exercises[0].how[0] = 'changed';
      } else {
        s.blocks[0].label = 'changed';
      }
    }
    expect(JSON.stringify(b)).toBe(before);
    expect(JSON.stringify(t.build())).toBe(before);
  });
});

describe('fitness and fat loss content', () => {
  it('general fitness: 3 gym days, ~2,300 kcal, 120–140 g protein', () => {
    const p = TEMPLATES.fitness.build();
    expect(p.week.filter((k) => isGymSession(p.sessions[k]))).toHaveLength(3);
    expect(p.week[6]).toBe('rest');
    for (const m of Object.values(p.menus)) {
      expect(m.kcal).toBeGreaterThanOrEqual(2200);
      expect(m.kcal).toBeLessThanOrEqual(2400);
      expect(m.protein).toBeGreaterThanOrEqual(120);
      expect(m.protein).toBeLessThanOrEqual(140);
    }
    expect(p.roadmap.every((r) => r.id.startsWith('fit_'))).toBe(true);
  });

  it('fat loss: 3 gym days, 1,800–1,900 kcal, 120–140 g protein', () => {
    const p = TEMPLATES.fatloss.build();
    expect(p.week.filter((k) => isGymSession(p.sessions[k]))).toHaveLength(3);
    expect(p.week[6]).toBe('rest');
    for (const m of Object.values(p.menus)) {
      expect(m.kcal).toBeGreaterThanOrEqual(1800);
      expect(m.kcal).toBeLessThanOrEqual(1900);
      expect(m.protein).toBeGreaterThanOrEqual(120);
      expect(m.protein).toBeLessThanOrEqual(140);
    }
    expect(p.roadmap.every((r) => r.id.startsWith('fl_'))).toBe(true);
  });

  it('every week day uses each gym session once and covers squat, hinge, push and pull', () => {
    for (const id of ['fitness', 'fatloss'] as const) {
      const p = TEMPLATES[id].build();
      const gymDays = p.week.filter((k) => isGymSession(p.sessions[k]));
      expect(new Set(gymDays).size).toBe(gymDays.length);
      const ids = new Set(gymDays.flatMap((k) => {
        const s = p.sessions[k];
        return isGymSession(s) ? s.exercises.map((e) => e.id) : [];
      }));
      expect(['squat', 'squat_or_leg_press'].some((x) => ids.has(x))).toBe(true);
      expect(ids.has('romanian_deadlift')).toBe(true);
      expect(['bench_press', 'incline_db_press', 'shoulder_press'].some((x) => ids.has(x))).toBe(true);
      expect(['lat_pulldown', 'seated_cable_row', 'pull_up'].some((x) => ids.has(x))).toBe(true);
    }
  });
});
