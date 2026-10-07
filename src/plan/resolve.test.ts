import { describe, expect, it } from 'vitest';
import { planOf } from './resolve';
import { TEMPLATES } from './templates';
import { sessionFor } from '../engines/schedule';
import { addWorkout, makeData } from '../features/today/testdata';
import type { PlanDoc } from '../types';

// Week used below: Mon 5 Oct 2026 … Sun 11 Oct 2026.
describe('planOf', () => {
  it('uses the runway template when no plan is saved', () => {
    const plan = planOf(makeData());
    expect(plan.isDefault).toBe(true);
    expect(plan.gymOrder).toEqual(['upper_a', 'lower_a', 'upper_b', 'lower_b']);
    expect(plan.week[0]).toMatchObject({ day: 'Mon', session: 'upper_a', label: 'Upper A', gym: true });
  });

  it('a saved plan with Monday as rest changes the session and the gym order', () => {
    const d = makeData();
    const body = TEMPLATES.runway.build();
    body.week = ['rest', 'lower_a', 'recovery', 'upper_b', 'lower_b', 'upper_a', 'rest'];
    d.plans.me = { ...body, updatedAt: 1 } as PlanDoc;

    const plan = planOf(d);
    expect(plan.isDefault).toBe(false);
    expect(plan.gymOrder).toEqual(['lower_a', 'upper_b', 'lower_b', 'upper_a']);

    expect(sessionFor(d, '2026-10-05')).toMatchObject({ session: 'rest', gym: false, shifted: false });
    expect(sessionFor(d, '2026-10-06')).toMatchObject({ session: 'lower_a', gym: true, shifted: false });
    addWorkout(d, '2026-10-06', 'lower_a');
    addWorkout(d, '2026-10-08', 'upper_b');
    addWorkout(d, '2026-10-09', 'lower_b');
    expect(sessionFor(d, '2026-10-10')).toMatchObject({ session: 'upper_a', label: 'Upper A', gym: true, shifted: false });
    // Without the saved plan, the same Monday is Upper A.
    expect(sessionFor(makeData(), '2026-10-05')).toMatchObject({ session: 'upper_a', gym: true });
  });
});
