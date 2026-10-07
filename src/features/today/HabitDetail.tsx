// One habit: current and best streak, this week, 12-week heatmap, today's control.
import { useMemo } from 'react';
import type { ScreenProps } from '../../app/screens';
import { useStore, useToday } from '../../store/store';
import { Bar, Empty, ScreenHeader } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { Heatmap } from '../../ui/charts';
import { habitProgress, habitTarget, isScheduled, scheduleText } from '../../engines/schedule';
import { habitHeatmap, habitStreak, weekCount } from '../../engines/streak';
import { bump, fmtPair, fmtValue, openValueSheet, stepOf, toggleCheck, valueOf } from './shared';

const TYPE_LABEL = { check: 'Tick', counter: 'Counter', number: 'Number' } as const;

export function HabitDetailScreen({ params }: ScreenProps) {
  const data = useStore((s) => s.data);
  const navigate = useStore((s) => s.navigate);
  const today = useToday();
  const habit = params.id ? data.habits[params.id] : undefined;
  const streak = useMemo(() => (habit ? habitStreak(habit, data, today) : { current: 0, best: 0 }), [habit, data, today]);
  const heat = useMemo(() => (habit ? habitHeatmap(habit, data, today, 12) : {}), [habit, data, today]);

  if (!habit) {
    return (
      <div className="td">
        <ScreenHeader title="Habit" back />
        <Empty title="This habit was deleted">Go back to Habits to see the rest.</Empty>
      </div>
    );
  }
  const wk = weekCount(habit, data, today);
  const target = habitTarget(habit, data);
  const v = valueOf(data, habit, today);
  const done = habitProgress(habit, today, data) >= 1;
  const due = isScheduled(habit, today, data);

  return (
    <div className="td">
      <ScreenHeader
        title={habit.name} back
        right={
          <button className="icon-btn" type="button" aria-label={`Edit ${habit.name}`} onClick={() => navigate('habits', 'edit', { id: habit.id })}>
            <Icon name="edit" />
          </button>
        }
      />
      {habit.archived && <p className="pill pill-mute td-chip">Archived: not counted in your score</p>}

      <div className="grid-3">
        <div className="card td-stat">
          <span className="label">Streak</span>
          <span className="td-big num"><Icon name="flame" size={18} /> {streak.current}</span>
        </div>
        <div className="card td-stat">
          <span className="label">Best</span>
          <span className="td-big num">{streak.best}</span>
        </div>
        <div className="card td-stat">
          <span className="label">This week</span>
          <span className="td-big num">{wk.done}<span className="muted td-of">/{wk.due}</span></span>
        </div>
      </div>

      <section className="section" aria-label="Today">
        <span className="label">Today{due ? '' : ' · not due'}</span>
        {habit.type === 'check' ? (
          <button type="button" className={`td-tile td-tile-wide${done ? ' on' : ''}`} aria-pressed={done} onClick={() => toggleCheck(habit, today)}>
            <span className="td-tile-icon"><Icon name={done ? 'check' : habit.icon} /></span>
            <span className="td-tile-name">{done ? 'Done today' : 'Tap when done'}</span>
          </button>
        ) : (
          <div className="card td-counters">
            <div className="td-counter">
              <span className="td-counter-icon" aria-hidden="true"><Icon name={habit.icon} /></span>
              <button type="button" className="td-counter-main" onClick={() => openValueSheet(habit, today)} aria-label={`${habit.name}: ${fmtPair(habit, v, target)}. Tap to type a value`}>
                <span className="td-counter-top">
                  <span className="td-counter-name">{habit.name}</span>
                  <span className={`num td-counter-val${v >= target ? ' ok' : ''}`}>{fmtPair(habit, v, target)}</span>
                </span>
                <Bar value={v / target} />
              </button>
              {habit.type === 'counter' ? (
                <button type="button" className="td-plus" aria-label={`Add ${fmtValue(habit, stepOf(habit, target))}`} onClick={() => bump(habit, today, stepOf(habit, target))}>
                  <Icon name="plus" />
                </button>
              ) : (
                <button type="button" className="td-plus" aria-label={`Enter ${habit.name.toLowerCase()}`} onClick={() => openValueSheet(habit, today)}>
                  <Icon name="edit" />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="section" aria-label="Last 12 weeks">
        <span className="label">Last 12 weeks</span>
        <div className="card">
          <Heatmap values={heat} end={today} weeks={12} />
        </div>
      </section>

      <section className="section" aria-label="Details">
        <div className="list">
          <div className="list-item"><span className="grow muted">Type</span><span>{TYPE_LABEL[habit.type]}</span></div>
          {habit.type !== 'check' && (
            <div className="list-item">
              <span className="grow muted">Target</span>
              <span className="num">{fmtValue(habit, target)}{habit.id === 'protein' ? ' (from your weight)' : ''}</span>
            </div>
          )}
          <div className="list-item"><span className="grow muted">Schedule</span><span>{scheduleText(habit.schedule)}</span></div>
          <div className="list-item"><span className="grow muted">Group</span><span>{habit.group === 'model' ? 'Model' : 'Personal'}</span></div>
        </div>
      </section>
    </div>
  );
}
