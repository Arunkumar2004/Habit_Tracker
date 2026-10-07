// Building blocks for the entry flow (welcome, account, setup, plan reveal).
import type { ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import { haptic } from '../../ui/kit';

/** The app mark: an "R" with a runway line under it (same as the home-screen icon). */
export function Mark({ size = 56 }: { size?: number }) {
  return (
    <div className="en-mark" style={{ width: size, height: size, borderRadius: size * 0.26 }} aria-hidden="true">
      <span style={{ fontSize: size * 0.56 }}>R</span>
      <i style={{ width: size * 0.42 }} />
    </div>
  );
}

/** A catwalk in perspective: two edges meeting at the horizon, a centre line that moves toward you. */
export function Runway() {
  return (
    <svg className="en-runway" viewBox="0 0 320 220" role="img" aria-label="A runway stretching to the horizon">
      <defs>
        <linearGradient id="en-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="en-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path d="M150 18 L170 18 L300 220 L20 220 Z" fill="url(#en-glow)" />
      <path d="M150 18 L20 220" stroke="url(#en-fade)" strokeWidth="1.5" fill="none" />
      <path d="M170 18 L300 220" stroke="url(#en-fade)" strokeWidth="1.5" fill="none" />
      <line className="en-runway-centre" x1="160" y1="18" x2="160" y2="220" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      {[0.18, 0.36, 0.56, 0.78].map((t, i) => {
        const y = 18 + t * 202;
        const half = 10 + t * 130;
        return (
          <g key={i} fill="var(--accent)">
            <circle cx={160 - half} cy={y} r={1.2 + t * 2} opacity={0.35 + t * 0.5} />
            <circle cx={160 + half} cy={y} r={1.2 + t * 2} opacity={0.35 + t * 0.5} />
          </g>
        );
      })}
      <circle cx="160" cy="18" r="3" fill="var(--accent)" />
    </svg>
  );
}

/** Frame for one setup / account screen: back + progress on top, content, one primary action pinned at the bottom. */
export function StepFrame({ onBack, progress, children, action }: {
  onBack?: () => void;
  progress?: { at: number; of: number };
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="en-frame">
      <header className="en-top">
        {onBack ? (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        ) : <span className="en-top-gap" />}
        {progress && (
          <>
            <div className="en-progress" role="progressbar" aria-valuemin={1} aria-valuemax={progress.of} aria-valuenow={progress.at} aria-label={`Step ${progress.at} of ${progress.of}`}>
              <i style={{ width: `${(progress.at / progress.of) * 100}%` }} />
            </div>
            <span className="en-count num">{progress.at}/{progress.of}</span>
          </>
        )}
      </header>
      <div className="en-body">{children}</div>
      <div className="en-action">{action}</div>
    </div>
  );
}

export function Title({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="en-title">
      {eyebrow && <p className="en-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {sub && <p className="en-sub">{sub}</p>}
    </div>
  );
}

/** A selectable row: title, optional detail, a check on the right. */
export function Option({ on, title, sub, right, onClick }: {
  on: boolean; title: string; sub?: string; right?: string; onClick: () => void;
}) {
  return (
    <button type="button" className="en-option" aria-pressed={on} onClick={() => { haptic(8); onClick(); }}>
      <span className="en-option-text">
        <strong>{title}</strong>
        {sub && <span>{sub}</span>}
      </span>
      {right && <span className="en-option-right num">{right}</span>}
      <span className="en-check" aria-hidden="true">{on && <Icon name="check" size={16} />}</span>
    </button>
  );
}

/** A large number with a slider and − / + buttons (height, weight). */
export function Dial({ label, value, min, max, step, unit, hint, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; hint?: string;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  const pct = ((value - min) / (max - min)) * 100;
  const shown = step < 1 ? value.toFixed(1) : String(value);
  return (
    <div className="en-dial">
      <div className="en-dial-head">
        <span className="en-dial-label">{label}</span>
        {hint && <span className="en-dial-hint num">{hint}</span>}
      </div>
      <div className="en-dial-value num" aria-live="polite">{shown}<small>{unit}</small></div>
      <div className="en-dial-row">
        <button type="button" className="en-round" aria-label={`${label}: less`} onClick={() => { haptic(6); set(value - step); }}>
          <Icon name="minus" size={18} />
        </button>
        <input
          type="range" className="en-range" min={min} max={max} step={step} value={value} aria-label={label}
          style={{ ['--p' as string]: `${pct}%` }} onChange={(e) => set(Number(e.target.value))}
        />
        <button type="button" className="en-round" aria-label={`${label}: more`} onClick={() => { haptic(6); set(value + step); }}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}
