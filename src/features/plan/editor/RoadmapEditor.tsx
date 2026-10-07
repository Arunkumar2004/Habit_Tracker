// Roadmap: ordered steps (when + title). Edit in a sheet; add, remove, move. Numbers follow the order.
import { useState } from 'react';
import type { RoadmapStep } from '../../../data/plan';
import { usePlan } from '../../../plan/resolve';
import { useStore } from '../../../store/store';
import { Icon } from '../../../ui/Icon';
import { Empty, Field } from '../../../ui/kit';
import { EditRow, MoveButtons, RemoveButton, SheetActions, editPlan } from './common';
import { moveItem, newStepId, removeAt, renumberRoadmap } from './helpers';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function RoadmapEditor() {
  const plan = usePlan();
  const steps = plan.roadmap;
  const change = (fn: (s: RoadmapStep[]) => RoadmapStep[], toast?: string) =>
    editPlan((next) => {
      next.roadmap = renumberRoadmap(fn(next.roadmap));
    }, toast);

  const open = (step: RoadmapStep | null) =>
    useStore.getState().openSheet(step ? `Step ${step.n}` : 'New step', () => <StepForm step={step} />);

  return (
    <div className="stack">
      {steps.length === 0 ? (
        <div className="card">
          <Empty icon="target" title="No steps yet">Tap Add step to set your first goal and when it starts.</Empty>
        </div>
      ) : (
        <ol className="list pe-list">
          {steps.map((s, i) => (
            <EditRow
              key={s.id} title={s.title || 'Untitled step'} editLabel={`Edit step ${s.n}, ${s.title}`} onEdit={() => open(s)}
              lead={<span className="pe-n num" aria-hidden="true">{s.n}</span>}
              meta={<>{s.when || `Month ${s.unlockMonth}`}</>}
            >
              <MoveButtons index={i} count={steps.length} what={`step ${s.n}`} onMove={(d) => change((list) => moveItem(list, i, d))} />
              <RemoveButton what={`step ${s.n}`} onConfirm={() => change((list) => removeAt(list, i), 'Step removed')} />
            </EditRow>
          ))}
        </ol>
      )}
      <button type="button" className="btn btn-block pe-add" onClick={() => open(null)}>
        <Icon name="plus" /> Add step
      </button>
    </div>
  );
}

function StepForm({ step }: { step: RoadmapStep | null }) {
  const close = useStore((s) => s.closeSheet);
  const [v, setV] = useState({
    when: step?.when ?? '', title: step?.title ?? '', detail: step?.detail ?? '', doneWhen: step?.doneWhen ?? '',
    unlockMonth: step?.unlockMonth ?? 1,
  });
  const set = (k: 'when' | 'title' | 'detail' | 'doneWhen') => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const title = v.title.trim();

  const save = () => {
    if (!title) return;
    const clean = {
      when: v.when.trim() || `Month ${v.unlockMonth}`, title, detail: v.detail.trim(), doneWhen: v.doneWhen.trim(),
      unlockMonth: v.unlockMonth,
    };
    editPlan((next) => {
      if (step) {
        const i = next.roadmap.findIndex((s) => s.id === step.id);
        if (i < 0) return false;
        next.roadmap[i] = { ...next.roadmap[i], ...clean };
      } else {
        next.roadmap = [...next.roadmap, { id: newStepId(), n: 0, ...clean }];
      }
      next.roadmap = renumberRoadmap(next.roadmap);
    }, step ? undefined : 'Step added');
    close();
  };

  return (
    <div className="stack pe-form">
      <Field label="Title">
        <input id="pe-step-title" className="input" value={v.title} onChange={set('title')} maxLength={60} placeholder="For example: First check" autoFocus={!step} />
      </Field>
      <div className="grid-2">
        <Field label="When">
          <input id="pe-step-when" className="input" value={v.when} onChange={set('when')} maxLength={30} placeholder="Month 3" />
        </Field>
        <Field label="Opens in">
          <select id="pe-step-month" className="input" value={v.unlockMonth} onChange={(e) => setV({ ...v, unlockMonth: Number(e.target.value) })}>
            {MONTHS.map((m) => <option key={m} value={m}>Month {m}</option>)}
          </select>
        </Field>
      </div>
      <Field label="What to do">
        <textarea id="pe-step-detail" className="input pe-textarea" rows={3} value={v.detail} onChange={set('detail')} maxLength={240} />
      </Field>
      <Field label="Done when">
        <input id="pe-step-done" className="input" value={v.doneWhen} onChange={set('doneWhen')} maxLength={120} placeholder="How you know it is finished" />
      </Field>
      <SheetActions onSave={save} onCancel={close} saveLabel={step ? 'Save' : 'Add step'} disabled={!title} />
    </div>
  );
}
