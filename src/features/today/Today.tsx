// Today (blueprint 2.1): header, score ring, session card, habit tiles, counters, sleep, money strip, smart cards.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Data, Habit, Review } from '../../types';
import { useStore, useToday } from '../../store/store';
import { Bar, Ring } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { Confetti } from '../../ui/Confetti';
import { addDays, diffDays, fmtShort, weekStart, weekday } from '../../lib/date';
import { rupees } from '../../lib/format';
import type { SessionKey } from '../../data/plan';
import { isGymSession } from '../../data/sessions';
import { usePlan, type ResolvedPlan } from '../../plan/resolve';
import {
  activeHabits, dayInfo, gymDoneThisWeek, habitProgress, habitTarget, isScheduled, monthStartDate, sessionFor,
} from '../../engines/schedule';
import { dayScore, dayStreak } from '../../engines/score';
import { habitStreak } from '../../engines/streak';
import { todaySummary } from '../../engines/budget';
import { AREA_LABEL, bump, fmtPair, fmtValue, openValueSheet, stepOf, toggleCheck, valueOf } from './shared';
import { openNoteSheet } from './quick';
import { QuickAddButton } from '../../ui/QuickAdd';

const SESSION_META: Partial<Record<SessionKey, string>> = {
  upper_a: '7 exercises · 70 min',
  lower_a: '7 exercises · 70 min',
  upper_b: '7 exercises · 70 min',
  lower_b: '6 exercises · 70 min',
  recovery: 'Walk 30–40 min + mobility 15 min',
  cardio_skills: 'Cardio 30–45 min · posing 15 · grooming check · walk 20',
  rest: 'Rest. Sunday check: 15 min',
};

/** One quiet line under the session name. The default plan keeps its hand-written lines; an edited plan describes itself. */
function sessionMeta(plan: ResolvedPlan, key: SessionKey): string | undefined {
  if (plan.isDefault && SESSION_META[key]) return SESSION_META[key];
  const def = plan.sessions[key];
  if (!def) return SESSION_META[key];
  if (isGymSession(def)) return `${def.exercises.length} ${def.exercises.length === 1 ? 'exercise' : 'exercises'} · ${def.minutes} min`;
  return def.blocks.length ? def.blocks.map((b) => `${b.label} ${b.minutes}`).join(' · ') : def.focus;
}
const labelIn = (plan: ResolvedPlan, key: SessionKey) => plan.week.find((w) => w.session === key)?.label ?? plan.sessions[key]?.label ?? key;

function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function latestReview(data: Data): Review | undefined {
  return Object.values(data.reviews).sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))[0];
}

export function TodayScreen() {
  const data = useStore((s) => s.data);
  const navigate = useStore((s) => s.navigate);
  useMidnightTick();
  const today = useToday();
  const profile = data.profile.me;
  const info = dayInfo(profile, today);
  const score = useMemo(() => dayScore(data, today), [data, today]);
  const streak = useMemo(() => dayStreak(data, today), [data, today]);
  const review = latestReview(data);

  const habits = useMemo(() => activeHabits(data).filter((h) => isScheduled(h, today, data)), [data, today]);
  const checks = habits.filter((h) => h.type === 'check');
  const counters = habits.filter((h) => h.type === 'counter');
  const numbers = habits.filter((h) => h.type === 'number');

  // Confetti only when 100% is reached while the screen is open, not on load.
  const seenBelow = useRef(score.score < 1);
  if (score.score < 1) seenBelow.current = true;
  const fire = score.total > 0 && score.score >= 1 && seenBelow.current;

  const pctText = `${Math.round(score.score * 100)}%`;
  const bandText = score.score >= 0.8 ? 'Great day' : score.score >= 0.5 ? 'OK' : 'Keep going';
  const bandCls = score.score >= 0.8 ? 'pill-ok' : score.score >= 0.5 ? 'pill-warn' : 'pill-mute';

  return (
    <div className="td">
      <Confetti fire={fire} />
      <header className="td-head">
        <div className="grow">
          <div className="td-date">{fmtShort(today).toUpperCase()}</div>
          <div className="td-dayline num">Day {info.dayN} · Week {Math.min(info.week, 52)} of 52 · Month {info.month}</div>
          <h1 className="td-hello">{greeting()}{profile?.name ? `, ${profile.name}` : ''}</h1>
        </div>
        <div className="td-head-actions">
          <QuickAddButton />
          <button className="icon-btn" type="button" aria-label="Settings" onClick={() => navigate('today', 'settings')}>
            <Icon name="settings" />
          </button>
        </div>
      </header>

      <section className="card td-score" aria-label="Today's score">
        <Ring value={score.score} size={112} stroke={11}>
          <div>
            <div className="td-ring-num num">{Math.round(score.score * 100)}</div>
            <div className="td-ring-unit">%</div>
          </div>
        </Ring>
        <dl className="td-stats">
          <div><dt>Today's score</dt><dd className="num">{pctText} <span className={`pill ${bandCls}`}>{bandText}</span></dd></div>
          <div><dt>Streak</dt><dd className="num"><Icon name="flame" size={16} /> {streak} {streak === 1 ? 'day' : 'days'}</dd></div>
          <div><dt>Focus</dt><dd>{review ? AREA_LABEL[review.lowest] : <span className="muted">Set on Sunday</span>}</dd></div>
        </dl>
      </section>

      <SmartCards data={data} today={today} />

      <SessionCard data={data} today={today} />

      <section className="section" aria-label="Habits">
        <div className="section-head">
          <span className="label">Habits</span>
          <span className="small muted num">{score.done} / {score.total}</span>
        </div>
        {checks.length ? (
          <div className="td-tiles">
            {checks.map((h) => <HabitTile key={h.id} habit={h} data={data} today={today} />)}
          </div>
        ) : (
          <p className="muted small">No tick habits due today.</p>
        )}
      </section>

      {(counters.length > 0 || numbers.length > 0) && (
        <section className="card td-counters" aria-label="Counters">
          {counters.map((h) => <CounterRow key={h.id} habit={h} data={data} today={today} />)}
          {numbers.map((h) => <NumberRow key={h.id} habit={h} data={data} today={today} />)}
        </section>
      )}

      <MoneyStrip data={data} today={today} />
      <NoteCard data={data} today={today} />
    </div>
  );
}

// ---------- Session ----------
function SessionCard({ data, today }: { data: Data; today: string }) {
  const navigate = useStore((s) => s.navigate);
  const openSheet = useStore((s) => s.openSheet);
  const closeSheet = useStore((s) => s.closeSheet);
  const plan = usePlan();
  const pick = sessionFor(data, today);
  const todays = Object.values(data.workouts).filter((w) => w.date === today);
  const finished = todays.find((w) => w.finished && (plan.gymOrder as string[]).includes(w.session));
  const inProgress = todays.find((w) => !w.finished && w.session === pick.session);

  if (!pick.gym) {
    return (
      <section className="section" aria-label="Today's session">
        <span className="label">Today's session</span>
        <div className="card-hi td-session td-session-rest">
          <span className="td-session-icon"><Icon name={pick.session === 'rest' ? 'moon' : 'walk'} /></span>
          <div className="grow">
            <strong>{pick.label}</strong>
            <div className="small muted">{sessionMeta(plan, pick.session)}</div>
            {pick.shifted && <span className="pill pill-ok td-chip">All {plan.gymOrder.length} gym sessions done this week</span>}
          </div>
        </div>
      </section>
    );
  }

  function openAnother() {
    const done = gymDoneThisWeek(data, addDays(today, 1));
    const next = plan.gymOrder.find((s) => !done.includes(s)) ?? plan.gymOrder[0] ?? pick.session;
    openSheet('Already trained today', () => (
      <div className="stack">
        <span className="pill pill-warn td-chip"><Icon name="info" size={14} /> Second gym session today</span>
        <p className="small" style={{ margin: 0 }}>
          You finished {pick.label} today. The plan says one gym session a day: missed one? Do the next session
          tomorrow.
        </p>
        <button className="btn btn-block" type="button" onClick={() => { closeSheet(); navigate('plan', 'workout', { session: pick.session }); }}>
          Open {pick.label}
        </button>
        <button className="btn btn-ghost btn-block" type="button" onClick={() => { closeSheet(); navigate('plan', 'workout', { session: next }); }}>
          Start {labelIn(plan, next)} anyway
        </button>
      </div>
    ));
  }

  const status = finished ? `Done · ${finished.minutes} min` : inProgress ? 'In progress' : sessionMeta(plan, pick.session);
  return (
    <section className="section" aria-label="Today's session">
      <span className="label">Today's session</span>
      <button
        type="button" className={`card td-session${finished ? ' td-session-done' : ''}`}
        onClick={() => (finished ? openAnother() : navigate('plan', 'workout', { session: pick.session }))}
      >
        <span className="td-session-icon"><Icon name={finished ? 'check' : 'dumbbell'} /></span>
        <div className="grow">
          <strong>{pick.label}</strong>
          <div className="small muted num">{status}</div>
          {pick.shifted && !finished && <span className="pill pill-warn td-chip">Next in order: you missed a session</span>}
          {finished && <span className="pill pill-warn td-chip">Trained today: one session a day</span>}
        </div>
        <span className="td-session-go" aria-hidden="true"><Icon name={finished ? 'chevron' : 'play'} /></span>
      </button>
    </section>
  );
}

// ---------- Habit tile ----------
function HabitTile({ habit, data, today }: { habit: Habit; data: Data; today: string }) {
  const done = habitProgress(habit, today, data) >= 1;
  const [pop, setPop] = useState(false);
  const streak = useMemo(() => habitStreak(habit, data, today).current, [habit, data, today]);
  return (
    <button
      type="button" className={`td-tile${done ? ' on' : ''}${pop ? ' td-pop' : ''}`} aria-pressed={done}
      onClick={() => { toggleCheck(habit, today); setPop(true); }}
      onAnimationEnd={() => setPop(false)}
    >
      <span className="td-tile-icon"><Icon name={done ? 'check' : habit.icon} /></span>
      <span className="td-tile-name">{habit.name}</span>
      {streak > 0 && <span className="td-tile-streak num"><Icon name="flame" size={12} />{streak}</span>}
    </button>
  );
}

// ---------- Counters ----------
function CounterRow({ habit, data, today }: { habit: Habit; data: Data; today: string }) {
  const v = valueOf(data, habit, today);
  const target = habitTarget(habit, data);
  const step = stepOf(habit, target);
  return (
    <div className="td-counter">
      <span className="td-counter-icon" aria-hidden="true"><Icon name={habit.icon} /></span>
      <button type="button" className="td-counter-main" onClick={() => openValueSheet(habit, today)} aria-label={`${habit.name}: ${fmtPair(habit, v, target)}. Tap to type a value`}>
        <span className="td-counter-top">
          <span className="td-counter-name">{habit.name}</span>
          <span className={`num td-counter-val${v >= target ? ' ok' : ''}`}>{fmtPair(habit, v, target)}</span>
        </span>
        <Bar value={v / target} />
      </button>
      <button type="button" className="td-plus" aria-label={`Add ${fmtValue(habit, step)} ${habit.name.toLowerCase()}`} onClick={() => bump(habit, today, step)}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

function NumberRow({ habit, data, today }: { habit: Habit; data: Data; today: string }) {
  const v = valueOf(data, habit, today);
  const target = habitTarget(habit, data);
  return (
    <div className="td-counter">
      <span className="td-counter-icon" aria-hidden="true"><Icon name={habit.icon} /></span>
      <button type="button" className="td-counter-main" onClick={() => openValueSheet(habit, today)} aria-label={`${habit.name}: ${v ? fmtValue(habit, v) : 'not logged'}. Tap to enter`}>
        <span className="td-counter-top">
          <span className="td-counter-name">{habit.name}</span>
          <span className={`num td-counter-val${v >= target ? ' ok' : ''}`}>
            {v ? fmtPair(habit, v, target) : <span className="td-enter">Enter</span>}
          </span>
        </span>
        <Bar value={v / target} />
      </button>
      <button type="button" className="td-plus" aria-label={`Enter ${habit.name.toLowerCase()}`} onClick={() => openValueSheet(habit, today)}>
        <Icon name="edit" />
      </button>
    </div>
  );
}

// ---------- Money ----------
function MoneyStrip({ data, today }: { data: Data; today: string }) {
  const navigate = useStore((s) => s.navigate);
  const m = todaySummary(data, today);
  return (
    <button type="button" className="td-money" onClick={() => navigate('money')} aria-label="Money: open the money tab">
      <span className="label">Money</span>
      <span className="grow num td-money-text">
        <strong>{rupees(m.spentToday)}</strong> today · <strong>{rupees(m.safePerDay)}</strong>/day safe
      </span>
      {m.overBudget ? <span className="pill pill-bad">Over</span> : <Icon name="chevron" />}
    </button>
  );
}

// ---------- Note ----------
function NoteCard({ data, today }: { data: Data; today: string }) {
  const note = data.days[today]?.note;
  if (!note) return null;
  return (
    <button type="button" className="card td-note" onClick={() => openNoteSheet()}>
      <span className="label">Note</span>
      <span className="td-note-text">{note}</span>
    </button>
  );
}

// ---------- Smart cards ----------
interface Smart { id: string; icon: string; title: string; detail: string; go: () => void }

function SmartCards({ data, today }: { data: Data; today: string }) {
  const navigate = useStore((s) => s.navigate);
  const plan = usePlan();
  const profile = data.profile.me;
  const cards: Smart[] = [];
  const info = dayInfo(profile, today);

  if (profile && today >= profile.startDate && (info.dayN - 1) % 28 === 0) {
    const measured = Object.values(data.measurements).some((m) => m.date === today);
    if (!measured)
      cards.push({
        id: 'measure', icon: 'ruler', title: info.dayN === 1 ? 'Baseline day: 7 photos + tape' : 'Re-measure day: 7 photos + tape',
        detail: 'Same light, same spot. Weight, waist, chest, shoulders, arm, thigh.', go: () => navigate('progress'),
      });
  }
  const ws = weekStart(today);
  if (weekday(today) === 0 && !data.reviews[ws] && !Object.values(data.reviews).some((r) => r.weekStart === ws)) {
    cards.push({
      id: 'sunday', icon: 'calendar', title: 'Sunday check: 15 min',
      detail: 'Rate 10 areas. The lowest becomes next week\'s focus.', go: () => navigate('progress', 'sunday'),
    });
  }
  if (profile && info.month >= 2 && diffDays(monthStartDate(profile.startDate, info.month), today) <= 2) {
    const step = [...plan.roadmap].reverse().find((r) => r.unlockMonth <= info.month);
    if (step) {
      const fresh = step.unlockMonth === info.month;
      cards.push({
        id: 'month', icon: fresh ? 'star' : 'flame',
        title: fresh ? `Month ${info.month} unlocked: ${step.title}` : `Month ${info.month}: keep going with ${step.title}`,
        detail: fresh ? (plan.rule ? `${step.detail} ${plan.rule}` : step.detail) : step.detail, go: () => navigate('plan'),
      });
    }
  }
  if (!cards.length) return null;
  return (
    <div className="td-smart" aria-label="For today">
      {cards.map((c) => (
        <button key={c.id} type="button" className="td-smart-card" onClick={c.go}>
          <span className="td-smart-icon"><Icon name={c.icon} /></span>
          <span className="grow">
            <strong>{c.title}</strong>
            <span className="small td-smart-detail">{c.detail}</span>
          </span>
          <Icon name="chevron" />
        </button>
      ))}
    </div>
  );
}

/** Re-render at midnight so "today" rolls over while the app stays open. */
export function useMidnightTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const t = setTimeout(() => set((n) => n + 1), next.getTime() - now.getTime());
    return () => clearTimeout(t);
  });
}
