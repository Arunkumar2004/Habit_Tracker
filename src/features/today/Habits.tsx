// Habits (blueprint 2.3): This week tick sheet, Heatmap and Streaks, grouped Model and Personal.
import { useMemo, useState, type CSSProperties } from 'react';
import type { Data, Habit, HabitGroup } from '../../types';
import { useStore, useToday } from '../../store/store';
import { Empty, Segmented, ScreenHeader } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { Heatmap } from '../../ui/charts';
import { addDays, parseISO, weekStart } from '../../lib/date';
import { activeHabits, habitProgress, isScheduled, scheduleText } from '../../engines/schedule';
import { dayStreak } from '../../engines/score';
import { habitHeatmap, habitStreak, scoreHeatmap } from '../../engines/streak';
import { openValueSheet, toggleCheck } from './shared';

type Seg = 'week' | 'heatmap' | 'streaks';
let lastSeg: Seg = 'week'; // remembered while the app is open (coming back from a habit keeps the tab)

const GROUPS: { id: HabitGroup; label: string }[] = [
  { id: 'model', label: 'Model' },
  { id: 'personal', label: 'Personal' },
];
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function HabitsScreen() {
  const data = useStore((s) => s.data);
  const navigate = useStore((s) => s.navigate);
  const today = useToday();
  const [seg, setSeg] = useState<Seg>(lastSeg);
  const habits = useMemo(() => activeHabits(data), [data]);
  const archived = useMemo(() => Object.values(data.habits).filter((h) => h.archived).sort((a, b) => a.order - b.order), [data]);

  const choose = (v: Seg) => {
    lastSeg = v;
    setSeg(v);
  };

  return (
    <div className="td">
      <ScreenHeader
        title="Habits"
        quickAdd={false}
        right={
          <button className="icon-btn" type="button" aria-label="Add habit" onClick={() => navigate('habits', 'edit')}>
            <Icon name="plus" />
          </button>
        }
      />
      <Segmented<Seg>
        label="Habits view" value={seg} onChange={choose}
        options={[{ value: 'week', label: 'Today' }, { value: 'heatmap', label: 'Heatmap' }, { value: 'streaks', label: 'Streaks' }]}
      />
      {seg === 'week' && <WeekView data={data} habits={habits} today={today} />}
      {seg === 'heatmap' && <HeatmapView data={data} habits={habits} today={today} />}
      {seg === 'streaks' && <StreaksView data={data} habits={habits} today={today} />}

      {seg === 'week' && archived.length > 0 && (
        <section className="section" aria-label="Archived habits">
          <span className="label">Archived</span>
          <div className="list">
            {archived.map((h) => (
              <div key={h.id} className="list-item">
                <span className="td-list-icon muted"><Icon name={h.icon} /></span>
                <span className="grow muted">{h.name}</span>
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => {
                    const s = useStore.getState();
                    s.patch('habits', h.id, { archived: false });
                    s.showToast(`${h.name} restored`, { undo: true });
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function grouped(habits: Habit[]) {
  return GROUPS.map((g) => ({ ...g, habits: habits.filter((h) => h.group === g.id) }));
}

// ---------- This week: printed tick sheet ----------
function WeekView({ data, habits, today }: { data: Data; habits: Habit[]; today: string }) {
  const navigate = useStore((s) => s.navigate);
  const ws = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  let done = 0;
  let due = 0;
  for (const h of habits)
    for (const d of days) {
      if (d > today || !isScheduled(h, d, data)) continue;
      due++;
      if (habitProgress(h, d, data) >= 1) done++;
    }

  return (
    <>
      <div className="card-hi td-week-sum">
        <div>
          <span className="label">This week so far</span>
          <div className="td-week-num num">{done} <span className="muted">/ {due}</span></div>
        </div>
        <div className="td-week-pct num">{due ? Math.round((done / due) * 100) : 0}%</div>
      </div>
      {grouped(habits).map((g) => (
        <section key={g.id} className="section" aria-label={`${g.label} habits`}>
          <div className="section-head">
            <span className="label">{g.label}</span>
            <span className="small muted">{g.habits.length} {g.habits.length === 1 ? 'habit' : 'habits'}</span>
          </div>
          {g.habits.length === 0 ? (
            <div className="card">
              <Empty icon="habits" title={g.id === 'personal' ? 'No personal habits yet' : 'No model habits'}>
                Add reading, meditation or no phone after 11 pm. Each habit gets a streak and a heatmap.
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-primary" onClick={() => navigate('habits', 'edit', { group: g.id })}>
                    <Icon name="plus" /> Add habit
                  </button>
                </div>
              </Empty>
            </div>
          ) : (
            <div className="card td-grid" role="table" aria-label={`${g.label} habits this week`}>
              <div className="td-grid-row td-grid-headrow" role="row">
                <span role="columnheader" className="td-grid-name label">Habit</span>
                {days.map((d, i) => (
                  <span key={d} role="columnheader" className={`td-grid-day${d === today ? ' now' : ''}`} aria-label={WD_LONG[i]}>
                    <span>{WD[i]}</span>
                    <span className="num">{parseISO(d).getDate()}</span>
                  </span>
                ))}
              </div>
              {g.habits.map((h) => (
                <div key={h.id} className="td-grid-row" role="row">
                  <button type="button" role="rowheader" className="td-grid-name" onClick={() => navigate('habits', 'habit', { id: h.id })}>
                    <span className="td-grid-icon"><Icon name={h.icon} /></span>
                    <span className="td-grid-label">
                      <span className="td-grid-title">{h.name}</span>
                      <span className="td-grid-sched">{scheduleText(h.schedule)}</span>
                    </span>
                  </button>
                  {days.map((d, i) => <Cell key={d} habit={h} date={d} today={today} data={data} dayName={WD_LONG[i]} />)}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
      <p className="small muted td-foot">Tap a box to tick it. Past days of this week can be changed; tap a name for streaks and the heatmap.</p>
    </>
  );
}

function Cell({ habit, date, today, data, dayName }: { habit: Habit; date: string; today: string; data: Data; dayName: string }) {
  const future = date > today;
  const p = future ? 0 : habitProgress(habit, date, data);
  const due = isScheduled(habit, date, data);
  const state = future ? 'future' : p >= 1 ? 'done' : p > 0 ? 'part' : due ? 'due' : 'off';
  const label = `${habit.name}, ${dayName}: ${future ? 'ahead' : p >= 1 ? 'done' : p > 0 ? `${Math.round(p * 100)}%` : due ? 'not done' : 'not due'}`;
  return (
    <span role="cell" className="td-grid-cellwrap">
      <button
        type="button" className={`td-cell ${state}${date === today ? ' now' : ''}`} disabled={future} aria-label={label}
        aria-pressed={habit.type === 'check' ? p >= 1 : undefined}
        onClick={() => (habit.type === 'check' ? toggleCheck(habit, date) : openValueSheet(habit, date))}
        style={state === 'part' ? ({ '--p': p } as CSSProperties) : undefined}
      >
        {state === 'done' ? <Icon name="check" /> : state === 'off' ? <span className="td-dash" /> : null}
      </button>
    </span>
  );
}

// ---------- Heatmap ----------
function HeatmapView({ data, habits, today }: { data: Data; habits: Habit[]; today: string }) {
  const navigate = useStore((s) => s.navigate);
  const all = useMemo(() => scoreHeatmap(data, today, 12), [data, today]);
  return (
    <>
      <section className="section" aria-label="All habits heatmap">
        <div className="card stack">
          <div className="section-head">
            <strong>Every day</strong>
            <span className="small muted">Daily score, 12 weeks</span>
          </div>
          <Heatmap values={all} end={today} weeks={12} />
        </div>
      </section>
      {grouped(habits).map((g) =>
        g.habits.length ? (
          <section key={g.id} className="section" aria-label={`${g.label} heatmaps`}>
            <span className="label">{g.label}</span>
            {g.habits.map((h) => (
              <button key={h.id} type="button" className="card td-heat-card" onClick={() => navigate('habits', 'habit', { id: h.id })}>
                <span className="td-heat-head">
                  <span className="td-list-icon"><Icon name={h.icon} /></span>
                  <strong className="grow">{h.name}</strong>
                  <Icon name="chevron" />
                </span>
                <Heatmap values={habitHeatmap(h, data, today, 12)} end={today} weeks={12} />
              </button>
            ))}
          </section>
        ) : null,
      )}
    </>
  );
}

// ---------- Streaks ----------
function StreaksView({ data, habits, today }: { data: Data; habits: Habit[]; today: string }) {
  const navigate = useStore((s) => s.navigate);
  const rows = useMemo(
    () => habits.map((h) => ({ h, s: habitStreak(h, data, today) })).sort((a, b) => b.s.current - a.s.current || b.s.best - a.s.best),
    [habits, data, today],
  );
  const days = useMemo(() => dayStreak(data, today), [data, today]);
  const top = rows.reduce<(typeof rows)[number] | undefined>((m, r) => (!m || r.s.best > m.s.best ? r : m), undefined);
  return (
    <>
      <div className="grid-2 td-streak-top">
        <div className="card">
          <span className="label">Day streak</span>
          <div className="td-big num"><Icon name="flame" size={22} /> {days}</div>
          <div className="small muted">Days in a row at 80%+</div>
        </div>
        <div className="card">
          <span className="label">Best ever</span>
          <div className="td-big num">{top?.s.best ?? 0}</div>
          <div className="small muted td-ellipsis">{top && top.s.best > 0 ? top.h.name : 'Tick a habit to start'}</div>
        </div>
      </div>
      <section className="section" aria-label="Habit streaks">
        <div className="list">
          {rows.map(({ h, s }) => (
            <button key={h.id} type="button" className="list-item" onClick={() => navigate('habits', 'habit', { id: h.id })}>
              <span className="td-list-icon"><Icon name={h.icon} /></span>
              <span className="grow">
                <span className="td-streak-name">{h.name}</span>
                <span className="small muted">{scheduleText(h.schedule)} · best {s.best}</span>
              </span>
              <span className={`td-streak-cur num${s.current > 0 ? ' on' : ''}`}>
                <Icon name="flame" size={16} /> {s.current}
              </span>
            </button>
          ))}
        </div>
        <p className="small muted td-foot">A streak counts due days in a row that are done. Days off (like Sunday for gym) don't break it.</p>
      </section>
    </>
  );
}
