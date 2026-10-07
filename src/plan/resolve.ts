// The one way to read the person's plan. Screens and engines call planOf(data) or usePlan() instead of
// importing ROADMAP / WEEK_SPLIT / GYM_ORDER / SESSIONS / DAY_MENUS / CHECKLISTS directly.
import { useMemo } from 'react';
import { useStore } from '../store/store';
import type { Data, PlanDoc } from '../types';
import type { SessionKey } from '../data/plan';
import { isGymSession } from '../data/sessions';
import { DEFAULT_TEMPLATE, TEMPLATES, type PlanBody } from './templates';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface WeekDay { day: string; session: SessionKey; label: string; gym: boolean }

export interface ResolvedPlan extends Omit<PlanBody, 'week'> {
  /** Monday first, 7 days, same shape as the old WEEK_SPLIT. */
  week: WeekDay[];
  /** Gym sessions in the order they first appear in the week (replaces GYM_ORDER). */
  gymOrder: SessionKey[];
  /** True when the person has not saved a plan of their own yet. */
  isDefault: boolean;
}

const defaultBody = TEMPLATES[DEFAULT_TEMPLATE].build();
const cache = new WeakMap<object, ResolvedPlan>();

function resolve(body: PlanBody, isDefault: boolean): ResolvedPlan {
  const hit = cache.get(body);
  if (hit) return hit;
  const week = DAY_NAMES.map((day, i) => {
    const session = body.week[i] ?? 'rest';
    const def = body.sessions[session];
    return { day, session, label: def?.label ?? session, gym: isGymSession(def) };
  });
  const gymOrder: SessionKey[] = [];
  for (const d of week) if (d.gym && !gymOrder.includes(d.session)) gymOrder.push(d.session);
  const out: ResolvedPlan = { ...body, week, gymOrder, isDefault };
  cache.set(body, out);
  return out;
}

/** The person's plan (their saved copy, or the default template). Works with partial test data too. */
export function planOf(data: Partial<Pick<Data, 'plans'>>): ResolvedPlan {
  const doc = data.plans?.me;
  return doc ? resolve(doc, false) : resolve(defaultBody, true);
}

/** React hook: re-renders only when the plan record changes. */
export function usePlan(): ResolvedPlan {
  const doc = useStore((s) => s.data.plans?.me);
  return useMemo(() => (doc ? resolve(doc, false) : resolve(defaultBody, true)), [doc]);
}

/** The editable plan body: the saved one, or a fresh copy of the default template. */
export function currentPlanBody(): PlanBody {
  const doc = useStore.getState().data.plans?.me;
  if (doc) {
    const { updatedAt: _u, deleted: _d, ...body } = doc;
    void _u;
    void _d;
    return JSON.parse(JSON.stringify(body)) as PlanBody;
  }
  return TEMPLATES[DEFAULT_TEMPLATE].build();
}

/** Save the whole plan (every edit writes the full record; it syncs to the account like any other record). */
export function savePlan(body: PlanBody, toast?: string) {
  const { put, showToast } = useStore.getState();
  put('plans', body as Omit<PlanDoc, 'updatedAt'>);
  if (toast) showToast(toast, { undo: true });
}
