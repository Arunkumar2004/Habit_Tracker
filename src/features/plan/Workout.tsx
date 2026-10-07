// Workout logger (blueprint 2.2 c and 3). Warm-up first, then exercise by exercise.
// Sets save as you go (an unfinished workouts record for today), so closing the app loses nothing.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenProps } from '../../app/screens';
import type { Data, Workout, WorkoutExercise, WorkoutSet } from '../../types';
import { GYM_ORDER, type SessionKey } from '../../data/plan';
import { CORE_CIRCUIT, SESSIONS, WARMUP, isGymSession, setsLabel, type Exercise, type GymSession } from '../../data/sessions';
import {
  PLATEAU_TEXT, easySets, easyWeekStatus, isPlateau, lastLine, lastPerformance, pbsBeaten, suggestNext, workingKg,
  type LastPerformance, type PbBeaten, type Suggestion,
} from '../../engines/progression';
import { dayInfo, sessionFor } from '../../engines/schedule';
import { fmtShort, todayISO } from '../../lib/date';
import { uid } from '../../lib/format';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Empty, ScreenHeader, haptic } from '../../ui/kit';
import { HowTo, RestBar, SetTable } from './SetTable';
import { Stepper, clock, vibrate } from './Stepper';
import { WorkoutDone } from './WorkoutDone';

/** Checklist record that remembers which plan weeks were easy weeks (items: { w9: true }). */
export const EASY_LIST_ID = 'pl-easy-weeks';

export function WorkoutScreen({ params }: ScreenProps) {
  const def = SESSIONS[params.session as SessionKey];
  const navigate = useStore((s) => s.navigate);
  if (!isGymSession(def)) {
    const goToday = () => {
      const pick = sessionFor(useStore.getState().data, todayISO());
      navigate('plan', pick.gym ? 'workout' : undefined, pick.gym ? { session: pick.session } : undefined);
    };
    return (
      <>
        <ScreenHeader title="Workout" back />
        <Empty icon="dumbbell" title="No gym session picked">
          Open a gym day from the Week view, or start today's session.
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={goToday}>Today's session</button>
          </div>
        </Empty>
      </>
    );
  }
  return <Logger key={def.key} session={def} />;
}

interface Meta { last: LastPerformance | null; sug: Suggestion; plateau: boolean; target: number[] }

function easyWeeksOf(data: Data): number[] {
  const items = data.checklists[EASY_LIST_ID]?.items ?? {};
  return Object.keys(items).filter((k) => items[k]).map((k) => Number(k.slice(1))).filter(Number.isFinite);
}

function targetReps(ex: Exercise, last: LastPerformance | null, sug: Suggestion, count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    if (ex.unit === 'min') return ex.repHigh;
    if (!last || sug.action !== 'same') return ex.repLow;
    const prev = (last.sets[i] ?? last.sets[last.sets.length - 1]).reps;
    return Math.min(ex.repHigh, i === 0 && prev < ex.repHigh ? prev + 1 : prev);
  });
}

function buildSets(ex: Exercise, meta: Meta, easy: boolean): WorkoutSet[] {
  if (ex.circuit) return [{ kg: 0, reps: 0, done: false }];
  const count = easy ? easySets(ex.sets) : ex.sets;
  const kg = meta.sug.kg ?? (meta.last ? workingKg(meta.last.sets) : 0);
  return Array.from({ length: count }, () => ({ kg, reps: 0, done: false }));
}

function Logger({ session }: { session: GymSession }) {
  const today = useMemo(todayISO, []);
  const st = useStore.getState;

  // Everything below is worked out once when the logger opens.
  const init = useMemo(() => {
    const data = st().data;
    const draft = Object.values(data.workouts)
      .filter((w) => w.date === today && w.session === session.key && !w.finished)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const meta: Record<string, Meta> = {};
    for (const ex of session.exercises) {
      const last = lastPerformance(data, ex.id, { excludeId: draft?.id });
      const sug = suggestNext(ex, last?.sets ?? null);
      meta[ex.id] = { last, sug, plateau: isPlateau(data, ex.id, today), target: targetReps(ex, last, sug, Math.max(ex.sets, 6)) };
    }
    const week = dayInfo(data.profile.me, today).week;
    const easy = easyWeekStatus(week, easyWeeksOf(data));
    const exs: WorkoutExercise[] = session.exercises.map((ex) => {
      const saved = draft?.exercises.find((e) => e.ex === ex.id);
      return saved ? { ex: ex.id, sets: saved.sets.map((s) => ({ ...s })) } : { ex: ex.id, sets: buildSets(ex, meta[ex.id], easy.inEasy) };
    });
    const firstOpen = exs.findIndex((e) => e.sets.some((s) => !s.done));
    return { draft, meta, week, easy, exs, firstOpen: firstOpen < 0 ? exs.length - 1 : firstOpen };
  }, []); // eslint-disable-line

  const [wid] = useState(() => init.draft?.id ?? uid('wk'));
  const [exs, setExs] = useState<WorkoutExercise[]>(init.exs);
  const [phase, setPhase] = useState<'warmup' | 'log' | 'done'>(init.draft ? 'log' : 'warmup');
  const [idx, setIdx] = useState(init.draft ? init.firstOpen : 0);
  const [easyOn, setEasyOn] = useState(init.easy.inEasy);
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [result, setResult] = useState<{ minutes: number; sets: number; volume: number; beaten: PbBeaten[] } | null>(null);

  // Elapsed clock that survives a backgrounded tab: base seconds + time since the clock last started.
  const base = useRef(init.draft ? Math.round(init.draft.minutes * 60) : 0);
  const runFrom = useRef<number | null>(Date.now());
  const elapsedSec = () => base.current + (runFrom.current ? (Date.now() - runFrom.current) / 1000 : 0);
  const paused = runFrom.current === null;
  const togglePause = () => {
    if (runFrom.current) {
      base.current += (Date.now() - runFrom.current) / 1000;
      runFrom.current = null;
    } else runFrom.current = Date.now();
    haptic();
    setNow(Date.now());
  };

  const otherToday = useStore((s) =>
    Object.values(s.data.workouts).find((w) => w.date === today && w.finished && w.id !== wid && (GYM_ORDER as string[]).includes(w.session)),
  );

  // Ticks the clock and the rest timer.
  useEffect(() => {
    if (phase === 'done') return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (rest && now >= rest.end) {
      vibrate([200, 100, 200]);
      setRest(null);
    }
  }, [now, rest]);

  // Save on the way out so the elapsed time is kept with the draft.
  const latest = useRef({ exs, dirty: !!init.draft, finished: false });
  latest.current.exs = exs;
  const save = (next: WorkoutExercise[]) => {
    latest.current.dirty = true;
    st().put('workouts', {
      id: wid, date: today, session: session.key, minutes: Math.round((elapsedSec() / 60) * 100) / 100, exercises: next, finished: false,
    }, { silent: true });
  };
  useEffect(() => () => {
    const l = latest.current;
    if (l.dirty && !l.finished && useStore.getState().data.workouts[wid]) save(l.exs);
  }, []); // eslint-disable-line

  const update = (i: number, sets: WorkoutSet[]) => {
    const next = exs.map((e, k) => (k === i ? { ...e, sets } : e));
    setExs(next);
    save(next);
  };

  const startEasyWeek = () => {
    const cur = st().data.checklists[EASY_LIST_ID];
    st().put('checklists', { id: EASY_LIST_ID, items: { ...(cur?.items ?? {}), [`w${init.week}`]: true } });
    const next = session.exercises.map((ex) => ({ ex: ex.id, sets: buildSets(ex, init.meta[ex.id], true) }));
    setExs(next);
    setEasyOn(true);
    st().showToast('Easy week on: half the sets this week.');
  };

  const doneSets = exs.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  const finish = () => {
    if (!doneSets && confirm !== 'finish') {
      setConfirm('finish');
      return;
    }
    const minutes = Math.max(1, Math.round(elapsedSec() / 60));
    const w: Workout = { id: wid, updatedAt: Date.now(), date: today, session: session.key, minutes, exercises: exs, finished: true };
    const beaten = pbsBeaten(st().data, w);
    latest.current.finished = true;
    st().put('workouts', w);
    st().setHabit(today, 'gym', true);
    const volume = exs.reduce((n, e) => n + e.sets.filter((s) => s.done).reduce((m, s) => m + s.kg * s.reps, 0), 0);
    setResult({ minutes, sets: doneSets, volume: Math.round(volume), beaten });
    setRest(null);
    setPhase('done');
    vibrate([60, 60, 120]);
    st().showToast(beaten.length ? `Workout saved. ${beaten.length} new PB${beaten.length > 1 ? 's' : ''}.` : 'Workout saved. Gym ticked.');
    window.scrollTo({ top: 0 });
  };

  const discard = () => {
    if (confirm !== 'discard') {
      setConfirm('discard');
      return;
    }
    latest.current.finished = true;
    if (st().data.workouts[wid]) st().remove('workouts', wid);
    st().showToast('Workout discarded.', { undo: true });
    st().back();
  };

  if (phase === 'done' && result) {
    return (
      <div className="pl-screen">
        <ScreenHeader title={session.label} back />
        <WorkoutDone
          label={session.label} {...result}
          onToday={() => st().navigate('today')} onPlan={() => st().navigate('plan')}
        />
      </div>
    );
  }

  const header = (
    <ScreenHeader
      title={session.short} back
      right={
        <div className="pl-clock">
          <span className={`num ${paused ? 'muted' : ''}`}>{clock(elapsedSec())}</span>
          <button type="button" className="icon-btn" onClick={togglePause} aria-label={paused ? 'Resume workout clock' : 'Pause workout clock'}>
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
        </div>
      }
    />
  );

  const banners = (
    <>
      {otherToday && (
        <div className="pl-banner warn" role="note">
          <Icon name="info" />
          <span>You already finished {SESSIONS[otherToday.session as SessionKey]?.label ?? 'a gym session'} today. The plan says one gym session a day; muscles grow while you rest. You can still carry on.</span>
        </div>
      )}
      {init.draft && phase === 'log' && doneSets > 0 && (
        <div className="pl-banner" role="note"><Icon name="repeat" /><span>Picked up where you left off.</span></div>
      )}
      {init.easy.due && !easyOn && doneSets === 0 && (
        <div className="pl-banner accent" role="note">
          <Icon name="leaf" />
          <span className="grow">Week {init.week}: time for an easy week. Same exercises, half the sets.</span>
          <button type="button" className="btn btn-ghost" onClick={startEasyWeek}>Start</button>
        </div>
      )}
    </>
  );

  if (phase === 'warmup') {
    return (
      <div className="pl-screen">
        {header}
        {banners}
        <div className="pl-routine-hero card-hi">
          <span className="pl-icon-tile" aria-hidden="true"><Icon name="flame" /></span>
          <div className="grow">
            <span className="label">First · 10 min</span>
            <h2 className="pl-h2">Warm-up</h2>
            <p className="small" style={{ margin: '4px 0 0' }}>Warm muscles lift more and get hurt less. Then {session.exercises.length} exercises.</p>
          </div>
        </div>
        <div className="section">
          <Stepper steps={WARMUP} startLabel="Start warm-up" onFinish={() => setPhase('log')} />
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setPhase('log')}>
            Skip warm-up <Icon name="chevron" />
          </button>
        </div>
      </div>
    );
  }

  const ex = session.exercises[idx];
  const meta = init.meta[ex.id];
  const cur = exs[idx];
  const plannedSets = easyOn ? easySets(ex.sets) : ex.sets;
  const isLast = idx === session.exercises.length - 1;

  const tick = (j: number) => {
    const s = cur.sets[j];
    const done = !s.done;
    const reps = done && !s.reps ? meta.target[j] ?? ex.repLow : s.reps;
    update(idx, cur.sets.map((x, k) => (k === j ? { ...x, reps, done } : x)));
    haptic(done ? 15 : 5);
    if (done && ex.restSec) setRest({ end: Date.now() + ex.restSec * 1000, total: ex.restSec });
    if (!done) setRest(null);
  };

  return (
    <div className="pl-screen">
      {header}
      {banners}
      <nav className="pl-ex-nav" aria-label="Exercises">
        {session.exercises.map((e, i) => {
          const all = exs[i].sets.length > 0 && exs[i].sets.every((s) => s.done);
          return (
            <button
              key={e.id} type="button" className={`${i === idx ? 'now' : ''} ${all ? 'done' : ''}`}
              aria-current={i === idx ? 'step' : undefined} aria-label={`${i + 1}. ${e.name}${all ? ', done' : ''}`}
              onClick={() => { setIdx(i); setConfirm(null); }}
            >
              {all ? <Icon name="check" size={16} /> : i + 1}
            </button>
          );
        })}
      </nav>

      <section className="card pl-ex" aria-labelledby="pl-ex-name">
        <div className="pl-ex-top">
          <span className="label num">{idx + 1} / {session.exercises.length}</span>
          <span className="pill pill-mute num">{setsLabel({ ...ex, sets: plannedSets })}</span>
        </div>
        <h2 id="pl-ex-name" className="pl-ex-name">
          {ex.name}
          {ex.priority && <span className="pl-star" title="Priority: shoulders and back"><Icon name="star" size={18} label="Priority" /></span>}
        </h2>
        <div className="pl-ex-info">
          <div className="small">
            <span className="muted">Last time: </span>
            {meta.last ? <><strong className="num">{lastLine(meta.last.sets, ex.unit)}</strong> <span className="muted">· {fmtShort(meta.last.date)}</span></> : <span className="muted">no numbers yet</span>}
          </div>
          <div className="pl-next small"><Icon name="target" size={16} /> {meta.sug.text}</div>
          {meta.plateau && <div className="pl-next warn small"><Icon name="bulb" size={16} /> {PLATEAU_TEXT}</div>}
        </div>

        {ex.circuit ? (
          <div className="stack">
            {cur.sets[0]?.done ? (
              <div className="pl-banner ok"><Icon name="check" /><span className="grow">Core circuit done.</span>
                <button type="button" className="btn btn-ghost" onClick={() => update(idx, [{ kg: 0, reps: 0, done: false }])}>Undo</button>
              </div>
            ) : (
              <>
                <Stepper steps={CORE_CIRCUIT} compact startLabel="Start circuit" onFinish={() => update(idx, [{ kg: 0, reps: 10, done: true }])} />
                <button type="button" className="btn btn-ghost btn-block" onClick={() => update(idx, [{ kg: 0, reps: 10, done: true }])}>
                  Mark done without the timer
                </button>
              </>
            )}
          </div>
        ) : (
          <SetTable
            ex={ex} sets={cur.sets} targetReps={meta.target}
            onChange={(j, s) => update(idx, cur.sets.map((x, k) => (k === j ? s : x)))}
            onTick={tick}
            onAdd={() => update(idx, [...cur.sets, { kg: cur.sets[cur.sets.length - 1]?.kg ?? 0, reps: 0, done: false }])}
            onRemove={() => update(idx, cur.sets.slice(0, -1))}
          />
        )}
      </section>

      {rest && (
        <RestBar
          leftSec={Math.max(0, Math.ceil((rest.end - now) / 1000))} totalSec={rest.total}
          onSkip={() => setRest(null)} onAdd={() => setRest({ end: rest.end + 15_000, total: rest.total + 15 })}
        />
      )}

      <div className="section"><HowTo ex={ex} /></div>

      <div className="pl-ex-foot">
        <button type="button" className="btn" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setConfirm(null); window.scrollTo({ top: 0 }); }} aria-label="Previous exercise">
          <Icon name="back" />
        </button>
        {isLast ? (
          <button type="button" className="btn btn-primary grow" onClick={finish}>
            <Icon name="check" /> {confirm === 'finish' ? 'No sets ticked. Tap again to finish' : 'Finish workout'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary grow" onClick={() => { setIdx(idx + 1); setConfirm(null); window.scrollTo({ top: 0 }); }}>
            Next exercise <Icon name="chevron" />
          </button>
        )}
      </div>
      <div className="pl-ex-extra">
        {!isLast && (
          <button type="button" className="btn btn-ghost" onClick={finish}>
            {confirm === 'finish' ? 'No sets ticked. Tap again' : 'Finish early'}
          </button>
        )}
        <button type="button" className="btn btn-ghost pl-danger-text" onClick={discard}>
          {confirm === 'discard' ? 'Tap again to discard' : 'Discard workout'}
        </button>
      </div>
    </div>
  );
}
