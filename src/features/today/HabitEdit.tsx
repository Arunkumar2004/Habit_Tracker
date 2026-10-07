// Add / edit a habit. Built-in habits: target, step and schedule only; they can be archived, never deleted.
import { useState } from 'react';
import type { ScreenProps } from '../../app/screens';
import type { Habit, HabitGroup, HabitType, Schedule } from '../../types';
import { useStore } from '../../store/store';
import { Field, ScreenHeader, Segmented, haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { uid } from '../../lib/format';
import { habitTarget } from '../../engines/schedule';

const ICONS = ['dumbbell', 'walk', 'sun', 'moon', 'posture', 'protein', 'steps', 'water', 'sleep', 'leaf', 'book', 'heart', 'phone', 'target', 'flame', 'star', 'bulb', 'note', 'timer', 'calendar'];
const UNITS = ['min', 'pages', 'ml', 'g', 'steps', 'h'];
// Monday-first chips; values are JS weekdays (0 = Sunday).
const DAYS = [
  { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];
type Kind = Schedule['kind'];

export function HabitEditScreen({ params }: ScreenProps) {
  const data = useStore((s) => s.data);
  const existing = params.id ? data.habits[params.id] : undefined;
  // Key on the id so the form resets when a different habit is opened.
  return <HabitForm key={existing?.id ?? 'new'} existing={existing} defaultGroup={params.group === 'model' ? 'model' : 'personal'} />;
}

function HabitForm({ existing, defaultGroup }: { existing?: Habit; defaultGroup: HabitGroup }) {
  const data = useStore((s) => s.data);
  const back = useStore((s) => s.back);
  const navigate = useStore((s) => s.navigate);
  const builtin = !!existing?.builtin;
  const proteinAuto = existing?.id === 'protein';

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? 'target');
  const [group, setGroup] = useState<HabitGroup>(existing?.group ?? defaultGroup);
  const [type, setType] = useState<HabitType>(existing?.type ?? 'check');
  const [target, setTarget] = useState(String(existing && existing.type !== 'check' ? existing.target : ''));
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [step, setStep] = useState(existing?.step ? String(existing.step) : '');
  const s0 = existing?.schedule ?? { kind: 'daily' as const };
  const [kind, setKind] = useState<Kind>(s0.kind);
  const [days, setDays] = useState<number[]>(s0.kind === 'weekdays' ? s0.days : [1, 2, 3, 4, 5]);
  const [times, setTimes] = useState(s0.kind === 'times_per_week' ? s0.times : 3);
  const [tried, setTried] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const nTarget = Number(target.replace(',', '.'));
  const nStep = Number(step.replace(',', '.'));
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Give the habit a name.';
  if (type !== 'check' && !proteinAuto && !(nTarget > 0)) errors.target = 'Set a target above 0.';
  if (type === 'counter' && step.trim() && !(nStep > 0)) errors.step = 'The + step must be above 0.';
  if (kind === 'weekdays' && days.length === 0) errors.days = 'Pick at least one day.';
  const valid = Object.keys(errors).length === 0;

  function schedule(): Schedule {
    if (kind === 'weekdays') return { kind, days: [...days].sort() };
    if (kind === 'times_per_week') return { kind, times };
    return { kind: 'daily' };
  }

  function save() {
    setTried(true);
    if (!valid) return;
    const s = useStore.getState();
    const fields = {
      schedule: schedule(),
      target: type === 'check' ? 1 : proteinAuto ? existing!.target : nTarget,
      step: type === 'counter' && nStep > 0 ? nStep : undefined,
    };
    if (existing) {
      const rec: Habit = builtin
        ? { ...existing, ...fields, step: type === 'counter' ? fields.step ?? existing.step : existing.step }
        : { ...existing, ...fields, name: name.trim(), icon, group, type, unit: type === 'check' ? undefined : unit.trim() || undefined };
      s.put('habits', rec);
      s.showToast(`${rec.name} saved`, { undo: true });
    } else {
      const order = Math.max(0, ...Object.values(data.habits).map((h) => h.order)) + 1;
      s.put('habits', {
        id: uid('hb'), name: name.trim(), icon, group, type, archived: false, order,
        unit: type === 'check' ? undefined : unit.trim() || undefined, ...fields,
      });
      s.showToast(`${name.trim()} added`, { undo: true });
    }
    haptic(12);
    back();
  }

  function toggleArchive() {
    if (!existing) return;
    const s = useStore.getState();
    s.patch('habits', existing.id, { archived: !existing.archived });
    s.showToast(existing.archived ? `${existing.name} restored` : `${existing.name} archived`, { undo: true });
    back();
  }

  function del() {
    if (!existing || builtin) return;
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    const s = useStore.getState();
    s.remove('habits', existing.id);
    s.showToast(`${existing.name} deleted`, { undo: true });
    navigate('habits');
  }

  const err = (k: string) => (tried && errors[k] ? <span className="td-err" role="alert">{errors[k]}</span> : null);

  return (
    <div className="td">
      <ScreenHeader title={existing ? `Edit ${existing.name}` : 'New habit'} back />
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        {builtin && <p className="small muted td-sheet-note">Built-in habit: you can change its target and schedule, or archive it.</p>}

        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={builtin} maxLength={40} placeholder="Read 10 pages" />
        </Field>
        {err('name')}

        {!builtin && (
          <>
            <div className="field">
              <span>Icon</span>
              <div className="td-icons" role="group" aria-label="Icon">
                {ICONS.map((n) => (
                  <button key={n} type="button" className="td-icon-pick" aria-pressed={icon === n} aria-label={n} onClick={() => setIcon(n)}>
                    <Icon name={n} />
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Group</span>
              <Segmented<HabitGroup> label="Group" value={group} onChange={setGroup} options={[{ value: 'model', label: 'Model' }, { value: 'personal', label: 'Personal' }]} />
            </div>
            <div className="field">
              <span>Type</span>
              <Segmented<HabitType>
                label="Type" value={type} onChange={(t) => { setType(t); if (t !== 'check' && !target) setTarget(t === 'number' ? '8' : '10'); }}
                options={[{ value: 'check', label: 'Tick' }, { value: 'counter', label: 'Counter' }, { value: 'number', label: 'Number' }]}
              />
              <span className="small muted">
                {type === 'check' ? 'Done or not done.' : type === 'counter' ? 'Count up with a + button (glasses, pages).' : 'Type one number a day (hours, minutes).'}
              </span>
            </div>
          </>
        )}

        {type !== 'check' && (
          proteinAuto ? (
            <p className="card-hi small td-sheet-note">
              Target: <strong className="num">{habitTarget(existing!, data)} g</strong>, worked out from your weight (1.6–2.0 g per kg).
              Change your weight or protein target in Settings.
            </p>
          ) : (
            <div className="grid-2">
              <Field label={`Target${unit ? ` (${unit})` : ''}`}>
                <input className="input num" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
              </Field>
              {type === 'counter' ? (
                <Field label="+ button adds">
                  <input className="input num" inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} placeholder={String(Math.max(1, Math.round((nTarget || 10) / 10)))} />
                </Field>
              ) : <span />}
            </div>
          )
        )}
        {err('target')}
        {err('step')}

        {type !== 'check' && !builtin && (
          <div className="field">
            <span>Unit</span>
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={10} placeholder="min" aria-label="Unit" />
            <div className="chips">
              {UNITS.map((u) => (
                <button key={u} type="button" className="chip" aria-pressed={unit === u} onClick={() => setUnit(u)}>{u}</button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <span>Schedule</span>
          <Segmented<Kind>
            label="Schedule" value={kind} onChange={setKind}
            options={[{ value: 'daily', label: 'Daily' }, { value: 'weekdays', label: 'Certain days' }, { value: 'times_per_week', label: 'X per week' }]}
          />
        </div>
        {kind === 'weekdays' && (
          <div className="chips" role="group" aria-label="Days">
            {DAYS.map((d) => (
              <button
                key={d.v} type="button" className="chip td-day-chip" aria-pressed={days.includes(d.v)}
                onClick={() => setDays((cur) => (cur.includes(d.v) ? cur.filter((x) => x !== d.v) : [...cur, d.v]))}
              >
                {d.l}
              </button>
            ))}
          </div>
        )}
        {err('days')}
        {kind === 'times_per_week' && (
          <div className="td-stepper">
            <button type="button" className="td-plus" aria-label="Fewer times" disabled={times <= 1} onClick={() => setTimes((t) => Math.max(1, t - 1))}>
              <Icon name="minus" />
            </button>
            <span className="num td-stepper-val">{times}× per week</span>
            <button type="button" className="td-plus" aria-label="More times" disabled={times >= 7} onClick={() => setTimes((t) => Math.min(7, t + 1))}>
              <Icon name="plus" />
            </button>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block td-save">
          <Icon name="check" /> {existing ? 'Save changes' : 'Add habit'}
        </button>

        {existing && (
          <div className="td-danger-zone">
            <button type="button" className="btn btn-block" onClick={toggleArchive}>
              {existing.archived ? 'Restore habit' : 'Archive habit'}
            </button>
            {!builtin && (
              <button type="button" className="btn btn-danger btn-block" onClick={del} onBlur={() => setConfirmDel(false)}>
                <Icon name="trash" /> {confirmDel ? 'Tap again to delete for good' : 'Delete habit'}
              </button>
            )}
            <p className="small muted">Archive keeps the history and hides the habit. {builtin ? 'Built-in habits cannot be deleted.' : 'Delete removes the habit; its past ticks stay in your days.'}</p>
          </div>
        )}
      </form>
    </div>
  );
}
