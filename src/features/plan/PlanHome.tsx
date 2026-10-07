// Plan tab home: Roadmap / Week / Food / Lists.
import { useMemo, useState } from 'react';
import type { Data, Milestone, PlanDoc, Profile } from '../../types';
import type { RoadmapStep, SessionKey } from '../../data/plan';
import { isGymSession, type Block } from '../../data/sessions';
import { usePlan } from '../../plan/resolve';
import { DAILY_ROUTINES, ROUTINES, type RoutineKey } from '../../data/routines';
import { dayInfo, sessionFor } from '../../engines/schedule';
import { addDays, fmtLong, parseISO, todayISO, weekStart } from '../../lib/date';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Bar, Empty, Segmented, ScreenHeader } from '../../ui/kit';
import { FoodView } from './PlanFood';
import { ListsView } from './PlanLists';

type Seg = 'roadmap' | 'week' | 'food' | 'lists';
let lastSeg: Seg = 'week';

export function PlanHome() {
  const [seg, setSeg] = useState<Seg>(lastSeg);
  const plan = usePlan();
  const navigate = useStore((s) => s.navigate);
  const pick = (v: Seg) => {
    lastSeg = v;
    setSeg(v);
  };
  return (
    <div className="pl-screen">
      <ScreenHeader
        title="Plan"
        right={
          <button className="icon-btn" type="button" aria-label="Edit plan" onClick={() => navigate('plan', 'edit')}>
            <Icon name="edit" />
          </button>
        }
      />
      {plan.name && (
        <p className="small muted" style={{ margin: 'calc(-1 * var(--s3)) 0 var(--s3)' }}>{plan.name}</p>
      )}
      <Segmented
        label="Plan section" value={seg} onChange={pick}
        options={[
          { value: 'roadmap', label: 'Roadmap' },
          { value: 'week', label: 'Week' },
          { value: 'food', label: 'Food' },
          { value: 'lists', label: 'Lists' },
        ]}
      />
      <div className="pl-seg-body" key={seg}>
        {seg === 'roadmap' && <RoadmapView />}
        {seg === 'week' && <WeekView />}
        {seg === 'food' && <FoodView />}
        {seg === 'lists' && <ListsView />}
      </div>
    </div>
  );
}

// ---------------- Roadmap ----------------

export type StepStatus = 'locked' | 'active' | 'done';
export function stepStatus(step: RoadmapStep, month: number, m: Milestone | undefined): StepStatus {
  if (m?.status === 'done') return 'done';
  return month >= step.unlockMonth ? 'active' : 'locked';
}

function RoadmapView() {
  const today = todayISO();
  const profile = useStore((s) => s.data.profile.me);
  const milestones = useStore((s) => s.data.milestones);
  const plan = usePlan();
  const roadmap = plan.roadmap;
  const total = roadmap.length;
  const info = dayInfo(profile, today);
  const statuses = roadmap.map((r) => stepStatus(r, info.month, milestones[r.id]));
  const doneCount = statuses.filter((s) => s === 'done').length;
  const currentIdx = statuses.findIndex((s) => s === 'active');

  const markDone = (r: RoadmapStep) => {
    useStore.getState().put('milestones', { id: r.id, status: 'done', doneAt: today, note: milestones[r.id]?.note });
    useStore.getState().showToast(`Step ${r.n} done: ${r.title}`, { undo: true });
  };
  const reopen = (r: RoadmapStep) => {
    useStore.getState().put('milestones', { id: r.id, status: 'active', note: milestones[r.id]?.note });
    useStore.getState().showToast(`Step ${r.n} reopened`, { undo: true });
  };

  if (!total) {
    return (
      <Empty icon="target" title="No roadmap in this plan">
        Add steps in Edit plan. Each step unlocks in a month you choose.
      </Empty>
    );
  }

  return (
    <>
      <div className="pl-hero">
        <div className="row">
          <div className="grow">
            <span className="label">Your 12-month {plan.template === 'runway' ? 'runway' : 'plan'}</span>
            <h2 className="pl-hero-title num">Month {Math.min(info.month, 12)} <small>of 12</small></h2>
            <span className="small muted num">Week {Math.min(info.week, 52)} of 52 · Day {info.dayN}</span>
          </div>
          <div className="pl-hero-count num"><strong>{doneCount}</strong><small>/ {total} {total === 1 ? 'step' : 'steps'}</small></div>
        </div>
        <Bar value={doneCount / total} ok={doneCount === total} />
      </div>
      {plan.rule && (
        <div className="pl-rule">
          <Icon name="bulb" />
          <span>{plan.rule}</span>
        </div>
      )}
      <ol className="pl-timeline">
        {roadmap.map((r, i) => {
          const st = statuses[i];
          const m = milestones[r.id];
          return (
            <li key={r.id} className={`pl-tl-item is-${st} ${i === currentIdx ? 'is-current' : ''}`}>
              <span className="pl-tl-dot num" aria-hidden="true">
                {st === 'done' ? <Icon name="check" size={16} /> : st === 'locked' ? <Icon name="lock" size={14} /> : r.n}
              </span>
              <div className="pl-tl-card card">
                <div className="pl-tl-head">
                  <span className="label">{r.when}</span>
                  {st === 'done' && <span className="pill pill-ok">Done</span>}
                  {st === 'active' && <span className="pill pill-warn">{i === currentIdx ? 'Now' : 'Open'}</span>}
                  {st === 'locked' && <span className="pill pill-mute">Month {r.unlockMonth}</span>}
                </div>
                <h3>{r.n}. {r.title}</h3>
                <p className="small">{r.detail}</p>
                <div className="pl-donewhen small"><Icon name="target" size={14} /> <span><strong>Done when:</strong> {r.doneWhen}</span></div>
                {st === 'active' && (
                  <button type="button" className="btn btn-block" onClick={() => markDone(r)}>
                    <Icon name="check" /> Mark done
                  </button>
                )}
                {st === 'done' && (
                  <div className="row small muted">
                    <span className="grow">Done {m?.doneAt ? fmtLong(m.doneAt) : ''}</span>
                    <button type="button" className="btn btn-ghost" onClick={() => reopen(r)}>Reopen</button>
                  </div>
                )}
                {st === 'locked' && <div className="small muted">Unlocks in Month {r.unlockMonth}. Finish what you started first.</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ---------------- Week ----------------

function gymDoneOn(data: Data, date: string, sessions: PlanDoc['sessions']): string | null {
  const w = Object.values(data.workouts).find((x) => x.date === date && x.finished && isGymSession(sessions[x.session as SessionKey]));
  if (w) return sessions[w.session as SessionKey]?.short ?? 'Gym';
  return data.days[date]?.habits.gym === true ? 'Done' : null;
}

function WeekView() {
  const today = todayISO();
  const data = useStore((s) => s.data);
  const plan = usePlan();
  const profile = data.profile.me as Profile | undefined;
  const month = dayInfo(profile, today).month;
  const ws = weekStart(today);
  const pick = useMemo(() => sessionFor(data, today), [data, today]);
  const navigate = useStore((s) => s.navigate);
  const habitsToday = data.days[today]?.habits ?? {};

  return (
    <>
      <div className="pl-daily card">
        <div className="section-head"><span className="label">Every day</span><span className="small muted">Stack, never drop</span></div>
        <div className="pl-daily-row">
          {DAILY_ROUTINES.map((k) => {
            const r = ROUTINES[k];
            const done = r.habit ? habitsToday[r.habit] === true : false;
            return (
              <button key={k} type="button" className={`pl-daily-btn ${done ? 'done' : ''}`} onClick={() => navigate('plan', 'routine', { routine: k })}>
                <span className="pl-daily-ico" aria-hidden="true"><Icon name={done ? 'check' : r.icon} /></span>
                <span className="small"><strong>{r.name}</strong><br /><span className="muted">{done ? 'Done' : r.time}</span></span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {plan.week.map((d, i) => {
          const date = addDays(ws, i);
          const isToday = date === today;
          const past = date < today;
          const key: SessionKey = isToday && pick.gym ? pick.session : d.session;
          const def = plan.sessions[key];
          if (!def) {
            return (
              <article key={d.day} className={`pl-day card ${isToday ? 'is-today' : ''} ${past ? 'is-past' : ''}`} aria-current={isToday ? 'date' : undefined}>
                <div className="pl-day-head">
                  <div className="pl-day-date">
                    <span className="label">{d.day}</span>
                    <span className="num">{parseISO(date).getDate()}</span>
                  </div>
                  <div className="grow"><h3>{d.label}</h3></div>
                  {isToday && <span className="pill pill-warn">Today</span>}
                </div>
              </article>
            );
          }
          const doneLabel = def.kind === 'gym' ? gymDoneOn(data, date, plan.sessions) : null;
          return (
            <article key={d.day} className={`pl-day card ${isToday ? 'is-today' : ''} ${past ? 'is-past' : ''}`} aria-current={isToday ? 'date' : undefined}>
              <div className="pl-day-head">
                <div className="pl-day-date">
                  <span className="label">{d.day}</span>
                  <span className="num">{parseISO(date).getDate()}</span>
                </div>
                <div className="grow">
                  <h3>{def.label}</h3>
                  <span className="small muted">{def.focus}</span>
                  {isToday && pick.shifted && pick.gym && (
                    <div className="small pl-shift"><Icon name="repeat" size={14} /> Moved up: you missed a session earlier this week.</div>
                  )}
                </div>
                {isToday && <span className="pill pill-warn">Today</span>}
                {!isToday && doneLabel && <span className="pill pill-ok">Done</span>}
                {!isToday && past && date >= (data.profile.me?.startDate ?? '') && def.kind === 'gym' && !doneLabel && <span className="pill pill-mute">Missed</span>}
              </div>
              {isGymSession(def) ? (
                <div className="pl-day-gym">
                  <span className="small muted num">{def.exercises.length} exercises · ~{def.minutes} min · warm-up first</span>
                  {isToday && doneLabel ? (
                    <span className="pill pill-ok"><Icon name="check" size={14} /> {doneLabel}</span>
                  ) : (
                    <button
                      type="button" className={`btn ${isToday ? 'btn-primary' : ''}`}
                      onClick={() => navigate('plan', 'workout', { session: key })}
                      aria-label={`${isToday ? 'Start' : 'Open'} ${def.label}`}
                    >
                      <Icon name={isToday ? 'play' : 'chevron'} /> {isToday ? 'Start' : 'Open'}
                    </button>
                  )}
                </div>
              ) : (
                <ul className="pl-blocks">
                  {def.blocks.map((b) => <BlockRow key={b.label} block={b} month={month} isToday={isToday} date={date} />)}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function BlockRow({ block, month, isToday, date }: { block: Block; month: number; isToday: boolean; date: string }) {
  const navigate = useStore((s) => s.navigate);
  const r = block.routine ? ROUTINES[block.routine as RoutineKey] : undefined;
  const done = useStore((s) => (r?.habit && r.habit !== 'gym' ? s.data.days[date]?.habits[r.habit] === true : false));
  const locked = r?.unlockMonth !== undefined && month < r.unlockMonth;
  const open = () => {
    if (block.action === 'sunday') navigate('progress', 'sunday');
    else if (block.routine) navigate('plan', 'routine', { routine: block.routine });
  };
  return (
    <li className="pl-block">
      <span className="pl-block-ico" aria-hidden="true"><Icon name={block.action === 'sunday' ? 'calendar' : r?.icon ?? 'dot'} /></span>
      <div className="grow">
        <strong className="small">{block.label}</strong>
        <div className="small muted num">
          {block.minutes}
          {locked && ` · from Month ${r?.unlockMonth}`}
          {done && ' · done'}
        </div>
      </div>
      <button type="button" className={`btn ${isToday && !locked ? 'btn-primary' : ''} pl-block-btn`} onClick={open} aria-label={`Start ${block.label}`}>
        {locked ? <Icon name="lock" /> : <Icon name="play" />} Start
      </button>
    </li>
  );
}
