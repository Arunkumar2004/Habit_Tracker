// Lists: casting-ready, shoot-day, wardrobe, digitals, and the "Is this agency real?" check.
import { useState, type ReactNode } from 'react';
import { AGENCY_CHECK, AGENCY_CHECK_ID, CHECKLISTS, agencyVerdict, type ChecklistDef } from '../../data/checklists';
import { dayInfo } from '../../engines/schedule';
import { todayISO } from '../../lib/date';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Bar, haptic } from '../../ui/kit';

/** One tickable row (whole row is the tap target). */
export function CheckRow({ checked, onToggle, label, children }: { checked: boolean; onToggle: () => void; label: string; children: ReactNode }) {
  return (
    <li>
      <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`pl-check ${checked ? 'on' : ''}`} onClick={onToggle}>
        <span className="pl-box" aria-hidden="true"><Icon name="check" size={16} /></span>
        <span className="pl-check-body">{children}</span>
      </button>
    </li>
  );
}

let openList: string | null = null;

export function ListsView() {
  const [open, setOpen] = useState<string | null>(openList);
  const month = dayInfo(useStore((s) => s.data.profile.me), todayISO()).month;
  const toggleOpen = (id: string) => {
    const next = open === id ? null : id;
    openList = next;
    setOpen(next);
  };
  return (
    <div className="stack" style={{ marginTop: 16 }}>
      {CHECKLISTS.map((def) => (
        <ChecklistCard key={def.id} def={def} month={month} open={open === def.id} onOpen={() => toggleOpen(def.id)} />
      ))}
      <AgencyCheck />
    </div>
  );
}

function ChecklistCard({ def, month, open, onOpen }: { def: ChecklistDef; month: number; open: boolean; onOpen: () => void }) {
  const items = useStore((s) => s.data.checklists[def.id]?.items);
  const all = def.groups.flatMap((g) => g.items);
  const done = all.filter((i) => items?.[i.key]).length;
  const toggle = (key: string) => {
    useStore.getState().put('checklists', { id: def.id, items: { ...(items ?? {}), [key]: !items?.[key] } });
    haptic();
  };
  const early = def.month !== undefined && month < def.month;
  return (
    <section className={`card pl-list-card ${open ? 'open' : ''}`}>
      <button type="button" className="pl-list-head" onClick={onOpen} aria-expanded={open}>
        <span className="pl-icon-tile sm" aria-hidden="true"><Icon name={def.icon} /></span>
        <span className="grow">
          <strong>{def.title}</strong>
          <span className="small muted num" style={{ display: 'block' }}>
            {done} / {all.length} done{def.month ? ` · Month ${def.month}` : ''}
          </span>
        </span>
        {done === all.length ? <span className="pill pill-ok">Ready</span> : early ? <span className="pill pill-mute">Later</span> : null}
        <span className="pl-chev" aria-hidden="true"><Icon name="chevron" /></span>
      </button>
      <Bar value={done / all.length} ok={done === all.length} />
      {open && (
        <div className="pl-list-body">
          <p className="small muted">{def.intro}</p>
          {def.groups.map((g) => (
            <div key={g.title} className="pl-shop-group">
              {def.groups.length > 1 && <span className="label">{g.title}</span>}
              <ul className="pl-check-list">
                {g.items.map((i) => (
                  <CheckRow key={i.key} checked={!!items?.[i.key]} onToggle={() => toggle(i.key)} label={i.text}>
                    <span>{i.text}</span>
                  </CheckRow>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AgencyCheck() {
  const answers = useStore((s) => s.data.checklists[AGENCY_CHECK_ID]?.items) ?? {};
  const verdict = agencyVerdict(answers);
  const answer = (key: string, v: boolean) => {
    useStore.getState().put('checklists', { id: AGENCY_CHECK_ID, items: { ...answers, [key]: v } });
    haptic();
  };
  const reset = () => useStore.getState().put('checklists', { id: AGENCY_CHECK_ID, items: {} });
  return (
    <section className="card pl-agency">
      <div className="row">
        <span className="pl-icon-tile sm" aria-hidden="true"><Icon name="search" /></span>
        <div className="grow">
          <strong>Is this agency real?</strong>
          <div className="small muted">Answer 3 questions before you sign or pay anything.</div>
        </div>
      </div>
      <ol className="pl-q-list">
        {AGENCY_CHECK.map((q) => {
          const a = answers[q.key];
          const bad = a !== undefined && a !== q.safe;
          return (
            <li key={q.key} className={bad ? 'bad' : a !== undefined ? 'ok' : ''}>
              <p className="small">{q.q}</p>
              <div className="pl-yn" role="group" aria-label={q.q}>
                <button type="button" aria-pressed={a === true} onClick={() => answer(q.key, true)}>Yes</button>
                <button type="button" aria-pressed={a === false} onClick={() => answer(q.key, false)}>No</button>
              </div>
              {a !== undefined && <p className="small muted pl-why">{q.why}</p>}
            </li>
          );
        })}
      </ol>
      {verdict === 'walk_away' && (
        <div className="pl-banner bad" role="status"><Icon name="close" /><span><strong>Walk away.</strong> At least one answer is a warning sign. Do not pay, do not sign.</span></div>
      )}
      {verdict === 'real' && (
        <div className="pl-banner ok" role="status"><Icon name="check" /><span><strong>Looks real.</strong> Still read the contract with someone you trust.</span></div>
      )}
      {Object.keys(answers).length > 0 && (
        <button type="button" className="btn btn-ghost btn-block" onClick={reset}>Check another agency</button>
      )}
    </section>
  );
}
