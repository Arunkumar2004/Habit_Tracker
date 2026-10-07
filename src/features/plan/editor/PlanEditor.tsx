// Plan → Edit plan. The person's own copy of their plan: name, template, week, workouts, roadmap, meals, lists.
import { useState } from 'react';
import type { PlanTemplateId } from '../../../types';
import type { SessionKey } from '../../../data/plan';
import { isGymSession } from '../../../data/sessions';
import { savePlan, usePlan } from '../../../plan/resolve';
import { TEMPLATES, TEMPLATE_ORDER } from '../../../plan/templates';
import { useStore } from '../../../store/store';
import { Icon } from '../../../ui/Icon';
import { ScreenHeader, Segmented } from '../../../ui/kit';
import { CommitInput, editPlan, useArm } from './common';
import { WorkoutsEditor } from './WorkoutsEditor';
import { RoadmapEditor } from './RoadmapEditor';
import { MealsEditor } from './MealsEditor';
import { ListsEditor } from './ListsEditor';
import './editor.css';

type Section = 'week' | 'workouts' | 'roadmap' | 'meals' | 'lists';
const SECTIONS: { value: Section; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'workouts', label: 'Workouts' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'meals', label: 'Meals' },
  { value: 'lists', label: 'Lists' },
];
let lastSection: Section = 'week';

export function PlanEditor() {
  const [section, setSection] = useState<Section>(lastSection);
  const pick = (v: Section) => {
    lastSection = v;
    setSection(v);
  };
  return (
    <div className="pe-screen">
      <ScreenHeader title="Edit plan" back />
      <PlanCard />
      <div className="pe-seg">
        <Segmented label="Plan part" value={section} options={SECTIONS} onChange={pick} />
      </div>
      <div className="pe-body" key={section}>
        {section === 'week' && <WeekEditor />}
        {section === 'workouts' && <WorkoutsEditor />}
        {section === 'roadmap' && <RoadmapEditor />}
        {section === 'meals' && <MealsEditor />}
        {section === 'lists' && <ListsEditor />}
      </div>
    </div>
  );
}

// ---------- Plan card ----------

function PlanCard() {
  const plan = usePlan();
  const template = TEMPLATES[plan.template] ?? TEMPLATES.runway;
  const reset = useArm(4000);

  const openTemplates = () => useStore.getState().openSheet('Change template', () => <TemplatePicker current={plan.template} />);
  const doReset = () => {
    if (!reset.armed) {
      reset.arm();
      return;
    }
    reset.disarm();
    savePlan(template.build(), 'Plan reset');
  };

  return (
    <section className="card pe-plan" aria-label="Your plan">
      <label className="label" htmlFor="pe-plan-name">Plan name</label>
      <CommitInput id="pe-plan-name" className="input pe-plan-name" label="Plan name" value={plan.name} required maxLength={40}
        onCommit={(v) => editPlan((next) => { next.name = v; })} />
      <p className="small muted pe-plan-from">From the <strong>{template.name}</strong> template</p>
      {reset.armed ? (
        <div className="pe-confirm" role="alert">
          <span className="small">This replaces all your edits with the original <strong>{template.name}</strong> plan.</span>
          <div className="pe-confirm-actions">
            <button type="button" className="btn" onClick={reset.disarm}>Keep</button>
            <button type="button" className="btn btn-danger" onClick={doReset}>Reset plan</button>
          </div>
        </div>
      ) : (
        <div className="pe-plan-actions">
          <button type="button" className="btn btn-ghost" onClick={openTemplates}>Change template</button>
          <button type="button" className="btn btn-ghost" onClick={doReset}>Reset to original</button>
        </div>
      )}
    </section>
  );
}

function TemplatePicker({ current }: { current: PlanTemplateId }) {
  const close = useStore((s) => s.closeSheet);
  const [chosen, setChosen] = useState<PlanTemplateId | null>(null);

  if (chosen) {
    const t = TEMPLATES[chosen];
    return (
      <div className="stack pe-form">
        <div className="pe-confirm" role="alert">
          <strong>This replaces your whole plan</strong>
          <span className="small">Your week, workouts, roadmap, meals and lists switch to <strong>{t.name}</strong>. Your logged workouts and habits stay. You can undo right after.</span>
        </div>
        <div className="pe-sheet-actions">
          <button type="button" className="btn" onClick={() => setChosen(null)}>Back</button>
          <button type="button" className="btn btn-primary" onClick={() => {
            savePlan(t.build(), 'Plan changed');
            close();
          }}>Use {t.name}</button>
        </div>
      </div>
    );
  }

  return (
    <ul className="list pe-templates">
      {TEMPLATE_ORDER.map((id) => {
        const t = TEMPLATES[id];
        const isCurrent = id === current;
        return (
          <li key={id}>
            <button type="button" className="list-item pe-template" onClick={() => setChosen(id)} aria-label={`${t.name}${isCurrent ? ', your current template' : ''}`}>
              <span className="grow">
                <span className="pe-row-title">{t.name}{isCurrent && <span className="pill pill-mute pe-current">Current</span>}</span>
                <span className="small muted pe-tagline">{t.tagline}</span>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Week ----------

function WeekEditor() {
  const plan = usePlan();
  const options = Object.values(plan.sessions).filter(Boolean);
  const setDay = (i: number, session: SessionKey) =>
    editPlan((next) => {
      const week = Array.from({ length: 7 }, (_, j) => next.week[j] ?? 'rest');
      if (week[i] === session) return false;
      week[i] = session;
      next.week = week;
    });
  const gymDays = plan.week.filter((d) => d.gym).length;

  return (
    <div className="stack">
      <ul className="list pe-week">
        {plan.week.map((d, i) => (
          <li key={d.day} className="pe-week-row">
            <label htmlFor={`pe-week-${i}`} className="pe-week-day">{d.day}</label>
            <select id={`pe-week-${i}`} className="input" value={d.session} onChange={(e) => setDay(i, e.target.value as SessionKey)}>
              {options.map((s) => (
                <option key={s.key} value={s.key}>{s.label}{isGymSession(s) ? ' (gym)' : ''}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <p className="small muted pe-hint">
        <span className="num">{gymDays}</span> gym {gymDays === 1 ? 'day' : 'days'} a week. Gym days run in order: if you miss one, it moves up to your next gym day.
      </p>
    </div>
  );
}
