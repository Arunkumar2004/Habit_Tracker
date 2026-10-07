// Workouts: pick a gym session, rename it, and edit its exercise list.
import { useMemo, useState } from 'react';
import type { SessionKey } from '../../../data/plan';
import { EXERCISES, isGymSession, setsLabel, type Exercise, type ExUnit, type GymSession } from '../../../data/sessions';
import { usePlan, type ResolvedPlan } from '../../../plan/resolve';
import { useStore } from '../../../store/store';
import { Icon } from '../../../ui/Icon';
import { Empty, Field } from '../../../ui/kit';
import { CommitInput, EditRow, MoveButtons, RemoveButton, SheetActions, editPlan } from './common';
import { UNITS, cleanPrescription, customExercise, moveItem, removeAt, restLabel, type Prescription } from './helpers';

let lastSession: SessionKey | null = null;

/** Gym sessions in week order first, then any gym session the week does not use. */
export function gymSessionsOf(plan: ResolvedPlan): GymSession[] {
  const out: GymSession[] = [];
  for (const k of plan.gymOrder) {
    const s = plan.sessions[k];
    if (isGymSession(s)) out.push(s);
  }
  for (const s of Object.values(plan.sessions)) if (isGymSession(s) && !out.includes(s)) out.push(s);
  return out;
}

function gymOf(next: { sessions: Record<SessionKey, unknown> }, key: SessionKey): GymSession | null {
  const s = next.sessions[key] as GymSession | undefined;
  return isGymSession(s) ? s : null;
}

export function WorkoutsEditor() {
  const plan = usePlan();
  const gyms = useMemo(() => gymSessionsOf(plan), [plan]);
  const [picked, setPicked] = useState<SessionKey | null>(lastSession);
  const session = gyms.find((g) => g.key === picked) ?? gyms[0];

  if (!session) {
    return (
      <Empty icon="dumbbell" title="No gym workouts in this plan">
        Choose a template with gym days from the plan card above, then edit its exercises here.
      </Empty>
    );
  }
  const key = session.key;
  const pick = (k: SessionKey) => {
    lastSession = k;
    setPicked(k);
  };
  const editSession = (fn: (s: GymSession) => void, toast?: string) =>
    editPlan((next) => {
      const s = gymOf(next, key);
      if (!s) return false;
      fn(s);
    }, toast);

  const openEdit = (ex: Exercise, index: number) =>
    useStore.getState().openSheet(ex.name, () => <ExerciseForm ex={ex} index={index} sessionKey={key} />);
  const openAdd = () =>
    useStore.getState().openSheet(`Add to ${session.label}`, () => <AddExercise sessionKey={key} plan={plan} />);

  return (
    <div className="stack">
      <div className="chips pe-chips" role="group" aria-label="Workout">
        {gyms.map((g) => (
          <button key={g.key} type="button" className="chip" aria-pressed={g.key === key} onClick={() => pick(g.key)}>
            {g.short || g.label}
          </button>
        ))}
      </div>

      <div className="card stack pe-card">
        <Field label="Name">
          <CommitInput id={`pe-session-label-${key}`} label="Workout name" value={session.label} required
            onCommit={(v) => editSession((s) => { s.label = v; })} />
        </Field>
        <Field label="Focus">
          <CommitInput id={`pe-session-focus-${key}`} label="Workout focus" value={session.focus} maxLength={120}
            placeholder="For example: shoulders and back"
            onCommit={(v) => editSession((s) => { s.focus = v; })} />
        </Field>
      </div>

      <div className="section-head pe-list-head">
        <span className="label">Exercises</span>
        <span className="small muted num">{session.exercises.length} · ~{session.minutes} min</span>
      </div>
      {session.exercises.length === 0 ? (
        <div className="card">
          <Empty icon="dumbbell" title="No exercises yet">Tap Add exercise to pick one from the library or type your own.</Empty>
        </div>
      ) : (
        <ol className="list pe-list">
          {session.exercises.map((ex, i) => (
            <EditRow
              key={`${ex.id}-${i}`} title={ex.name} editLabel={`Edit ${ex.name}`} onEdit={() => openEdit(ex, i)}
              lead={<span className="pe-n num" aria-hidden="true">{i + 1}</span>}
              meta={<span className="num">{setsLabel(ex)} · {restLabel(ex.restSec)}</span>}
            >
              <MoveButtons index={i} count={session.exercises.length} what={ex.name}
                onMove={(d) => editSession((s) => { s.exercises = moveItem(s.exercises, i, d); })} />
              <RemoveButton what={ex.name}
                onConfirm={() => editSession((s) => { s.exercises = removeAt(s.exercises, i); }, 'Exercise removed')} />
            </EditRow>
          ))}
        </ol>
      )}
      <button type="button" className="btn btn-block pe-add" onClick={openAdd}>
        <Icon name="plus" /> Add exercise
      </button>
    </div>
  );
}

// ---------- Edit one exercise ----------

function ExerciseForm({ ex, index, sessionKey }: { ex: Exercise; index: number; sessionKey: SessionKey }) {
  const close = useStore((s) => s.closeSheet);
  const [v, setV] = useState({
    sets: String(ex.sets), repLow: String(ex.repLow), repHigh: String(ex.repHigh), unit: ex.unit, restSec: String(ex.restSec),
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const fallback: Prescription = { sets: ex.sets, repLow: ex.repLow, repHigh: ex.repHigh, unit: ex.unit, restSec: ex.restSec };
  const preview = cleanPrescription(v, fallback);
  const isMin = v.unit === 'min';

  const save = () => {
    editPlan((next) => {
      const s = gymOf(next, sessionKey);
      if (!s) return false;
      const i = s.exercises[index]?.id === ex.id ? index : s.exercises.findIndex((e) => e.id === ex.id);
      if (i < 0) return false;
      s.exercises[i] = { ...s.exercises[i], ...preview };
    });
    close();
  };

  return (
    <div className="stack pe-form">
      <div className="grid-2">
        <Field label="Sets">
          <input id="pe-ex-sets" className="input num" type="number" inputMode="numeric" min={1} max={20} value={v.sets} onChange={set('sets')} />
        </Field>
        <Field label="Unit">
          <select id="pe-ex-unit" className="input" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value as ExUnit })}>
            {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Field>
        {!isMin && (
          <Field label="Low">
            <input id="pe-ex-replow" className="input num" type="number" inputMode="numeric" min={1} value={v.repLow} onChange={set('repLow')} />
          </Field>
        )}
        <Field label={isMin ? 'Minutes' : 'High'}>
          <input id="pe-ex-rephigh" className="input num" type="number" inputMode="numeric" min={1} value={v.repHigh} onChange={set('repHigh')} />
        </Field>
        <Field label="Rest (seconds)">
          <input id="pe-ex-rest" className="input num" type="number" inputMode="numeric" min={0} max={900} step={15} value={v.restSec} onChange={set('restSec')} />
        </Field>
      </div>
      <p className="pe-preview small muted num" aria-live="polite">
        {setsLabel(preview)} · {restLabel(preview.restSec)} rest
      </p>
      <SheetActions onSave={save} onCancel={close} />
    </div>
  );
}

// ---------- Add an exercise ----------

/** Sets and reps for a library exercise: copied from wherever the plan already uses it, else 3×8–12. */
function prescriptionFor(id: string, plan: ResolvedPlan): Pick<Exercise, 'sets' | 'repLow' | 'repHigh' | 'unit'> {
  for (const s of Object.values(plan.sessions)) {
    if (!isGymSession(s)) continue;
    const hit = s.exercises.find((e) => e.id === id);
    if (hit) return { sets: hit.sets, repLow: hit.repLow, repHigh: hit.repHigh, unit: hit.unit };
  }
  return { sets: 3, repLow: 8, repHigh: 12, unit: 'reps' };
}

function AddExercise({ sessionKey, plan }: { sessionKey: SessionKey; plan: ResolvedPlan }) {
  const close = useStore((s) => s.closeSheet);
  const [q, setQ] = useState('');
  const session = plan.sessions[sessionKey];
  const inSession = new Set(isGymSession(session) ? session.exercises.map((e) => e.id) : []);
  // Library plus custom exercises already used elsewhere in this plan.
  const pool = useMemo(() => {
    const map = new Map<string, Omit<Exercise, 'sets' | 'repLow' | 'repHigh' | 'unit'>>();
    for (const e of Object.values(EXERCISES)) map.set(e.id, e);
    for (const s of Object.values(plan.sessions)) if (isGymSession(s)) for (const e of s.exercises) if (!map.has(e.id)) map.set(e.id, e);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [plan]);
  const query = q.trim().toLowerCase();
  const hits = query ? pool.filter((e) => e.name.toLowerCase().includes(query)) : pool;
  const exact = pool.some((e) => e.name.toLowerCase() === query);
  const typed = q.trim().replace(/\s+/g, ' ');

  const add = (ex: Exercise) => {
    editPlan((next) => {
      const s = gymOf(next, sessionKey);
      if (!s) return false;
      s.exercises = [...s.exercises, ex];
    }, `${ex.name} added`);
    close();
  };
  const addFromPool = (e: (typeof pool)[number]) => add({ ...JSON.parse(JSON.stringify(e)), ...prescriptionFor(e.id, plan) } as Exercise);

  return (
    <div className="stack pe-form">
      <div className="pe-search">
        <Icon name="search" size={18} />
        <input
          id="pe-ex-search" className="input" type="search" placeholder="Search exercises" aria-label="Search exercises"
          value={q} onChange={(e) => setQ(e.target.value)} autoFocus maxLength={60}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (hits.length === 1 && !inSession.has(hits[0].id)) addFromPool(hits[0]);
            else if (typed && !exact && hits.length === 0) add(customExercise(typed));
          }}
        />
      </div>
      {typed && !exact && (
        <button type="button" className="btn btn-block pe-add-custom" onClick={() => add(customExercise(typed))}>
          <Icon name="plus" /> <span className="pe-ellipsis">Add &lsquo;{typed}&rsquo; as a new exercise</span>
        </button>
      )}
      {hits.length === 0 ? (
        <p className="small muted pe-hint">No match in the library. Add it as a new exercise above.</p>
      ) : (
        <ul className="list pe-pick-list">
          {hits.map((e) => {
            const added = inSession.has(e.id);
            return (
              <li key={e.id}>
                <button type="button" className="list-item pe-pick" disabled={added} onClick={() => addFromPool(e)}
                  aria-label={added ? `${e.name}, already in this workout` : `Add ${e.name}`}>
                  <span className="grow">
                    <strong className="pe-row-title">{e.name}</strong>
                    <span className="small muted pe-kind">{e.kind}{e.priority ? ' · priority' : ''}</span>
                  </span>
                  {added ? <span className="pill pill-mute">Added</span> : <Icon name="plus" size={18} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
