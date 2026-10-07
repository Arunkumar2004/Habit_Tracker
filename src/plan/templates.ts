// Plan templates a person can start from. Each builds a complete PlanDoc (minus updatedAt), which is then
// saved to their account and edited freely. OWNER of fitness/fatloss content: templates agent.
import type { PlanDoc, PlanTemplateId } from '../types';
import { PLAN_RULE, ROADMAP, WEEK_SPLIT } from '../data/plan';
import { SESSIONS } from '../data/sessions';
import { DAY_MENUS } from '../data/food';
import { CHECKLISTS } from '../data/checklists';
import { fitnessPlan } from './templates-fitness';
import { fatLossPlan } from './templates-fatloss';

export type PlanBody = Omit<PlanDoc, 'updatedAt' | 'deleted'>;

export interface PlanTemplate {
  id: PlanTemplateId;
  name: string;
  /** One line for the goal picker. */
  tagline: string;
  build: () => PlanBody;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function runwayPlan(): PlanBody {
  return clone({
    id: 'me' as const,
    template: 'runway' as const,
    name: 'Runway model',
    roadmap: ROADMAP,
    week: WEEK_SPLIT.map((w) => w.session),
    sessions: SESSIONS,
    menus: DAY_MENUS,
    checklists: CHECKLISTS,
    rule: PLAN_RULE,
  });
}

export const TEMPLATES: Record<PlanTemplateId, PlanTemplate> = {
  runway: {
    id: 'runway', name: 'Runway model',
    tagline: 'Physique, grooming, walk and posing, ready for agencies in 12 months.',
    build: runwayPlan,
  },
  fitness: {
    id: 'fitness', name: 'General fitness',
    tagline: 'Get stronger and fitter with three full-body workouts a week.',
    build: () => clone(fitnessPlan()),
  },
  fatloss: {
    id: 'fatloss', name: 'Fat loss',
    tagline: 'Lose fat steadily and keep your muscle: strength, cardio and daily steps.',
    build: () => clone(fatLossPlan()),
  },
};

export const TEMPLATE_ORDER: PlanTemplateId[] = ['runway', 'fitness', 'fatloss'];

/** The plan used when a person has no saved plan yet (everyone who set up before plans were editable). */
export const DEFAULT_TEMPLATE: PlanTemplateId = 'runway';
