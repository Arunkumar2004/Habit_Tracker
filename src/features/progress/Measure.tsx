// Measurements every 4 weeks (blueprint 2.5): form, change vs first, history.
import { useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { Empty, Field, ScreenHeader, haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { nextMeasureDate } from '../../engines/insights';
import { diffDays, fmtLong, fmtShort, todayISO } from '../../lib/date';
import { num, uid } from '../../lib/format';
import type { Measurement } from '../../types';
import { MEASURE_FIELDS, bestLift, firstLast, measurementsSorted, type MeasureKey } from './logic';

type Draft = Record<MeasureKey, string>;

function Delta({ first, last, unit, lowerIsBetter }: { first?: number; last?: number; unit: string; lowerIsBetter?: boolean }) {
  if (first === undefined || last === undefined) return <span className="pg-delta-flat">–</span>;
  const d = Math.round((last - first) * 10) / 10;
  if (d === 0) return <span className="pg-delta-flat num">±0 {unit}</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return <span className={`num ${good ? 'pg-delta-good' : 'pg-delta-bad'}`}>{d > 0 ? '+' : '−'}{num(Math.abs(d), 1)} {unit}</span>;
}

function MeasureForm({ onDone }: { onDone: () => void }) {
  const data = useStore((s) => s.data);
  const put = useStore((s) => s.put);
  const showToast = useStore((s) => s.showToast);
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState<Draft>(() => {
    const d = {} as Draft;
    for (const f of MEASURE_FIELDS) d[f.key] = '';
    const w = data.days[today]?.weightKg ?? data.profile.me?.weightKg;
    if (w) d.weightKg = String(w);
    for (const k of ['bestBench', 'bestSquat', 'bestPulldown'] as const) {
      const v = bestLift(data, k);
      if (v) d[k] = String(v);
    }
    return d;
  });
  const parsed = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const any = MEASURE_FIELDS.some((f) => parsed(draft[f.key]) !== undefined);

  function save() {
    const rec: Omit<Measurement, 'updatedAt'> = { id: uid('ms'), date };
    for (const f of MEASURE_FIELDS) {
      const v = parsed(draft[f.key]);
      if (v !== undefined) rec[f.key] = v;
    }
    put('measurements', rec);
    haptic(20);
    showToast('Measurements saved', { undo: true });
    onDone();
  }

  return (
    <div className="card stack">
      <Field label="Date">
        <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
      </Field>
      <div className="pg-form-grid">
        {MEASURE_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <div className="pg-unit">
              <input
                className="input num" inputMode="decimal" value={draft[f.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
              <span>{f.unit}</span>
            </div>
          </Field>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Tape on bare skin, same time of day. Best lifts come from your workout log; edit if needed.</p>
      <div className="grid-2">
        <button type="button" className="btn" onClick={onDone}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={!any} onClick={save}>Save</button>
      </div>
    </div>
  );
}

export function MeasureScreen() {
  const data = useStore((s) => s.data);
  const remove = useStore((s) => s.remove);
  const showToast = useStore((s) => s.showToast);
  const today = todayISO();
  const ms = useMemo(() => measurementsSorted(data), [data]);
  const [adding, setAdding] = useState(false);
  const next = nextMeasureDate(data, today);
  const inDays = diffDays(today, next);

  return (
    <div className="pg-screen">
      <ScreenHeader title="Measurements" back />
      <p className="pg-sub">
        Every 4 weeks ·{' '}
        {ms.length === 0 ? 'take your start numbers now' : inDays > 0 ? `next on ${fmtShort(next)} (in ${inDays} days)` : inDays === 0 ? 'due today' : `overdue by ${-inDays} days`}
      </p>

      {adding ? (
        <MeasureForm onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => setAdding(true)}>
          <Icon name="plus" /> {ms.length ? 'Add measurements' : 'Add start measurements'}
        </button>
      )}

      {ms.length >= 2 && (
        <section className="card stack" aria-label="Change since first">
          <div className="pg-kv">
            <strong>Change since start</strong>
            <span className="small muted">{fmtShort(ms[0].date)} → {fmtShort(ms[ms.length - 1].date)}</span>
          </div>
          <div className="pg-change">
            {MEASURE_FIELDS.map((f) => {
              const fl = firstLast(ms, f.key);
              return (
                <div key={f.key} className="pg-stat">
                  <span>{f.label}</span>
                  <Delta first={fl.first} last={fl.last} unit={f.unit} lowerIsBetter={f.lowerIsBetter} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="stack" aria-label="History">
        <h2 className="label">History</h2>
        {ms.length === 0 ? (
          <Empty icon="ruler" title="No measurements yet">Measure weight, waist, chest, shoulders, arm and thigh, plus your best lifts.</Empty>
        ) : (
          <div className="list">
            {[...ms].reverse().map((m) => (
              <div key={m.id} className="list-item pg-hist-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto' }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{fmtLong(m.date)}</strong>
                  <div className="pg-hist-vals muted num">
                    {MEASURE_FIELDS.filter((f) => m[f.key] !== undefined).map((f) => (
                      <span key={f.key}>{f.label} <b style={{ color: 'var(--ink)' }}>{num(m[f.key]!, 1)}</b> {f.unit}</span>
                    ))}
                  </div>
                </div>
                <button
                  type="button" className="icon-btn" aria-label={`Delete measurements from ${fmtLong(m.date)}`}
                  onClick={() => {
                    remove('measurements', m.id);
                    showToast('Measurements deleted', { undo: true });
                  }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
