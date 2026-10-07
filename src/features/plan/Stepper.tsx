// Step-by-step timer used by guided routines, the warm-up and the core circuit.
// Each step counts down; at zero the phone buzzes and the next step starts on its own.
import { useEffect, useRef, useState } from 'react';
import type { RoutineStep } from '../../data/sessions';
import { Icon } from '../../ui/Icon';
import { Ring, haptic, useLatest } from '../../ui/kit';

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

/** 75 → "1:15"; 3725 → "1:02:05". */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "10 min", "1 min 30 s". */
export function minutesLabel(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (!m) return `${s} s`;
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function Stepper({ steps, onFinish, startLabel = 'Start', autoStart = false, compact = false }: {
  steps: RoutineStep[];
  onFinish: () => void;
  startLabel?: string;
  autoStart?: boolean;
  compact?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [leftMs, setLeftMs] = useState(steps[0]?.sec * 1000 || 0);
  const [running, setRunning] = useState(autoStart);
  const [started, setStarted] = useState(autoStart);
  const [finished, setFinished] = useState(false);
  const endAt = useRef(0);
  const finishRef = useLatest(onFinish);

  const advance = () => {
    if (idx + 1 < steps.length) {
      setIdx(idx + 1);
      setLeftMs(steps[idx + 1].sec * 1000);
      vibrate(40);
    } else {
      setRunning(false);
      setLeftMs(0);
      setFinished(true);
      vibrate([200, 100, 200]);
      finishRef.current();
    }
  };
  const advanceRef = useLatest(advance);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + leftMs;
    const t = window.setInterval(() => {
      const l = endAt.current - Date.now();
      if (l <= 0) advanceRef.current();
      else setLeftMs(l);
    }, 200);
    return () => window.clearInterval(t);
    // leftMs is read once when the step (re)starts; ticks update it from endAt.
  }, [running, idx]);

  if (!steps.length) return null;
  const step = steps[idx];
  const next = steps[idx + 1];
  const leftSec = Math.ceil(leftMs / 1000);
  const totalLeft = leftSec + steps.slice(idx + 1).reduce((n, s) => n + s.sec, 0);
  const total = steps.reduce((n, s) => n + s.sec, 0);

  const start = () => {
    setStarted(true);
    setRunning(true);
    haptic();
  };
  const toggle = () => {
    setRunning((r) => !r);
    haptic();
  };
  const prev = () => {
    if (idx === 0) {
      setLeftMs(steps[0].sec * 1000);
      endAt.current = Date.now() + steps[0].sec * 1000;
      return;
    }
    setIdx(idx - 1);
    setLeftMs(steps[idx - 1].sec * 1000);
  };
  const restart = () => {
    setIdx(0);
    setLeftMs(steps[0].sec * 1000);
    setFinished(false);
    setRunning(true);
  };

  if (finished) {
    return (
      <div className={`pl-stepper card ${compact ? 'pl-stepper-compact' : ''}`}>
        <div className="pl-stepper-done">
          <span className="pl-done-badge" aria-hidden="true"><Icon name="check" /></span>
          <strong>All {steps.length} steps done</strong>
          <span className="muted small">{minutesLabel(total)}</span>
          <button type="button" className="btn btn-ghost" onClick={restart}>
            <Icon name="repeat" /> Go again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`pl-stepper card ${compact ? 'pl-stepper-compact' : ''}`}>
      <div className="pl-stepper-top">
        <span className="label">Step {idx + 1} of {steps.length}</span>
        <span className="label num">{clock(totalLeft)} left</span>
      </div>
      <div className="pl-stepper-progress" aria-hidden="true">
        {steps.map((s, i) => (
          <i key={i} className={i < idx ? 'done' : i === idx ? 'now' : ''} style={{ flexGrow: s.sec }} />
        ))}
      </div>
      <div className="pl-stepper-body">
        <Ring value={step.sec ? leftMs / (step.sec * 1000) : 0} size={compact ? 112 : 168} stroke={compact ? 8 : 11}>
          <div className="pl-stepper-time">
            <span className="num">{clock(leftSec)}</span>
            {!running && started && <small>Paused</small>}
          </div>
        </Ring>
        <div className="pl-stepper-text" aria-live="polite">
          <h2>{step.name}</h2>
          <p>{step.cue}</p>
          {next && <span className="muted small">Next: {next.name}</span>}
        </div>
      </div>
      {!started ? (
        <button type="button" className="btn btn-primary btn-block pl-big-btn" onClick={start}>
          <Icon name="play" /> {startLabel} · {minutesLabel(total)}
        </button>
      ) : (
        <div className="pl-stepper-controls">
          <button type="button" className="btn" onClick={prev} aria-label="Previous step">
            <Icon name="back" />
          </button>
          <button type="button" className="btn btn-primary pl-play" onClick={toggle} aria-label={running ? 'Pause' : 'Resume'}>
            <Icon name={running ? 'pause' : 'play'} /> {running ? 'Pause' : 'Resume'}
          </button>
          <button type="button" className="btn" onClick={() => advance()} aria-label="Skip step">
            <Icon name="chevron" />
          </button>
        </div>
      )}
    </div>
  );
}
