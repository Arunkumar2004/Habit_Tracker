// The entry experience, shown until the profile is set up:
//   Welcome → Account (create / sign in, optional) → 7 setup questions → "Your plan is ready" → the app.
// A returning user who signs in gets their data restored and goes straight into the app.
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './entry.css';
import { useStore } from '../../store/store';
import { runSeeders } from '../../store/registry';
import { cloudConfigured, cloudState, resetPassword, signIn, signUp, subscribeCloud } from '../../store/cloud';
import { DEFAULT_HABITS } from '../../data/plan';
import { DEFAULT_TEMPLATE, TEMPLATES, TEMPLATE_ORDER } from '../../plan/templates';
import { savePlan } from '../../plan/resolve';
import { targets } from '../../engines/nutrition';
import { addDays, fmtLong, fmtShort, todayISO, weekday } from '../../lib/date';
import { rupees } from '../../lib/format';
import { haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import type { BodyType, Diet, PlanTemplateId } from '../../types';
import { authMessage, useCloud } from '../progress/Account';
import { Dial, Mark, Option, Runway, StepFrame, Title } from './parts';

type Phase =
  | { k: 'welcome' }
  | { k: 'auth'; mode: 'signup' | 'signin' }
  | { k: 'confirm' }
  | { k: 'restoring' }
  | { k: 'setup'; step: number }
  | { k: 'reveal' };

interface Answers {
  name: string; goal: PlanTemplateId; startDate: string; heightCm: number; weightKg: number; bodyType: BodyType; diet: Diet; budget: number;
}

const SETUP_STEPS = 7;
const BUDGETS = [10000, 15000, 20000, 30000];

export function Entry() {
  const cloud = useCloud();
  const signedIn = cloud.configured && cloud.status !== 'signed_out' && cloud.status !== 'off';
  const [phase, setPhase] = useState<Phase>({ k: 'welcome' });
  const [a, setA] = useState<Answers>({
    name: '', goal: DEFAULT_TEMPLATE, startDate: todayISO(), heightCm: 185, weightKg: 72, bodyType: 'average', diet: 'non_veg', budget: 20000,
  });
  const patch = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));
  const go = (p: Phase) => {
    setPhase(p);
    window.scrollTo({ top: 0 });
  };

  // ----- welcome -----
  if (phase.k === 'welcome') {
    return (
      <div className="en en-welcome">
        <div className="en-welcome-top en-in">
          <Mark size={52} />
          <h1 className="en-wordmark">Runway <span>OS</span></h1>
          <p className="en-tagline">Twelve months. One plan.<br />Every day counted.</p>
        </div>
        <div className="en-welcome-art en-in" style={{ animationDelay: '80ms' }}><Runway /></div>
        <p className="en-pillars en-in" style={{ animationDelay: '140ms' }}>Training · Habits · Money · Progress</p>
        <div className="en-welcome-actions en-in" style={{ animationDelay: '200ms' }}>
          <button
            type="button" className="en-cta"
            onClick={() => go(cloudConfigured && !signedIn ? { k: 'auth', mode: 'signup' } : { k: 'setup', step: 0 })}
          >
            Get started
          </button>
          {cloudConfigured && !signedIn && (
            <button type="button" className="en-link" onClick={() => go({ k: 'auth', mode: 'signin' })}>
              I already have an account
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----- account -----
  if (phase.k === 'auth') {
    return (
      <AuthScreen
        mode={phase.mode}
        onMode={(mode) => go({ k: 'auth', mode })}
        onBack={() => go({ k: 'welcome' })}
        onSignedIn={() => go({ k: 'restoring' })}
        onConfirm={(email, password) => { pending.email = email; pending.password = password; go({ k: 'confirm' }); }}
        onSkip={() => go({ k: 'setup', step: 0 })}
      />
    );
  }
  if (phase.k === 'confirm') {
    return <ConfirmScreen onBack={() => go({ k: 'auth', mode: 'signup' })} onSignedIn={() => go({ k: 'restoring' })} />;
  }
  if (phase.k === 'restoring') {
    return <RestoringScreen onEmpty={() => go({ k: 'setup', step: 0 })} />;
  }

  // ----- reveal -----
  if (phase.k === 'reveal') {
    return <RevealScreen a={a} onBack={() => go({ k: 'setup', step: SETUP_STEPS - 1 })} />;
  }

  // ----- setup -----
  const step = phase.step;
  const next = () => {
    haptic(10);
    go(step + 1 < SETUP_STEPS ? { k: 'setup', step: step + 1 } : { k: 'reveal' });
  };
  const back = () => go(step === 0 ? { k: 'welcome' } : { k: 'setup', step: step - 1 });
  const valid = step === 0 ? a.name.trim().length > 0 : step === 6 ? a.budget >= 0 : true;
  const today = todayISO();
  const nextMonday = addDays(today, ((8 - weekday(today)) % 7) || 7);
  const inches = a.heightCm / 2.54;

  return (
    <form className="en" onSubmit={(e) => { e.preventDefault(); if (valid) next(); }}>
      <StepFrame
        onBack={back}
        progress={{ at: step + 1, of: SETUP_STEPS }}
        action={<button type="submit" className="en-cta" disabled={!valid}>Continue</button>}
      >
        <div className="en-in" key={step}>
          {step === 0 && (
            <>
              <Title eyebrow="About you" title="What should we call you?" sub="Runway OS greets you by name each morning." />
              <input
                id="en-name" className="en-input" value={a.name} onChange={(e) => patch({ name: e.target.value })}
                placeholder="Your first name" autoComplete="given-name" autoFocus maxLength={40} aria-label="Your first name"
              />
            </>
          )}
          {step === 1 && (
            <>
              <Title
                eyebrow="Your goal" title="What are you training for?"
                sub="Pick a starting plan. You can change any part of it later in Plan → Edit plan."
              />
              <div className="en-options">
                {TEMPLATE_ORDER.map((id) => (
                  <Option key={id} on={a.goal === id} title={TEMPLATES[id].name} sub={TEMPLATES[id].tagline} onClick={() => patch({ goal: id })} />
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <Title eyebrow="Your plan" title="When does Day 1 begin?" sub="Your twelve months are counted from this date." />
              <div className="en-options">
                <Option on={a.startDate === today} title="Today" right={fmtShort(today)} onClick={() => patch({ startDate: today })} />
                <Option on={a.startDate === addDays(today, 1)} title="Tomorrow" right={fmtShort(addDays(today, 1))} onClick={() => patch({ startDate: addDays(today, 1) })} />
                <Option on={a.startDate === nextMonday} title="Next Monday" sub="Start the week fresh" right={fmtShort(nextMonday)} onClick={() => patch({ startDate: nextMonday })} />
              </div>
              <label className="en-date">
                <span>Or pick a date</span>
                <input id="en-start" type="date" value={a.startDate} onChange={(e) => e.target.value && patch({ startDate: e.target.value })} />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <Title eyebrow="Starting point" title="Your height and weight" sub="Sets your calorie and protein targets. Only you can see this." />
              <div className="en-dials">
                <Dial
                  label="Height" value={a.heightCm} min={150} max={210} step={1} unit="cm"
                  hint={`${Math.floor(inches / 12)}′${Math.round(inches % 12)}″`} onChange={(v) => patch({ heightCm: v })}
                />
                <Dial label="Weight" value={a.weightKg} min={40} max={150} step={0.5} unit="kg" onChange={(v) => patch({ weightKg: v })} />
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <Title eyebrow="Starting point" title="How would you describe your build?" sub="It decides whether you eat a little more, the same, or a little less." />
              <div className="en-options">
                <Option on={a.bodyType === 'skinny'} title="Lean" sub="Hard to gain weight. Eat a little more." onClick={() => patch({ bodyType: 'skinny' })} />
                <Option on={a.bodyType === 'average'} title="Average" sub="Eat at maintenance and build muscle." onClick={() => patch({ bodyType: 'average' })} />
                <Option on={a.bodyType === 'more_fat'} title="Carrying extra fat" sub="Lose fat slowly, keep the muscle." onClick={() => patch({ bodyType: 'more_fat' })} />
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <Title eyebrow="Food" title="How do you eat?" sub="Your daily meal plan is built around this." />
              <div className="en-options">
                <Option on={a.diet === 'veg'} title="Vegetarian" sub="Paneer, dal, curd, soya, milk" onClick={() => patch({ diet: 'veg' })} />
                <Option on={a.diet === 'non_veg'} title="Non-vegetarian" sub="Eggs, chicken and fish, with veg options" onClick={() => patch({ diet: 'non_veg' })} />
              </div>
            </>
          )}
          {step === 6 && (
            <>
              <Title eyebrow="Money" title="Your monthly budget" sub="Runway OS shows what is safe to spend each day." />
              <div className="en-budgets">
                {BUDGETS.map((b) => (
                  <button
                    key={b} type="button" className="en-budget num" aria-pressed={a.budget === b}
                    onClick={() => { haptic(8); patch({ budget: b }); }}
                  >
                    {rupees(b)}
                  </button>
                ))}
              </div>
              <label className="en-date">
                <span>Or enter an amount</span>
                <input
                  id="en-budget" inputMode="numeric" className="num" value={a.budget ? String(a.budget) : ''}
                  onChange={(e) => patch({ budget: Number(e.target.value.replace(/\D/g, '')) || 0 })} placeholder="₹"
                />
              </label>
              <p className="en-note num">About {rupees(a.budget / 30)} a day</p>
            </>
          )}
        </div>
      </StepFrame>
    </form>
  );
}

// Email and password typed on the account screen, reused by the confirm screen's one-tap sign-in.
const pending = { email: '', password: '' };

function AuthScreen({ mode, onMode, onBack, onSignedIn, onConfirm, onSkip }: {
  mode: 'signup' | 'signin';
  onMode: (m: 'signup' | 'signin') => void;
  onBack: () => void;
  onSignedIn: () => void;
  onConfirm: (email: string, password: string) => void;
  onSkip: () => void;
}) {
  const [email, setEmail] = useState(pending.email);
  const [password, setPassword] = useState(pending.password);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const ok = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onSignedIn();
      } else {
        const r = await signUp(email, password);
        if (r === 'signed_in') onSignedIn();
        else onConfirm(email, password);
      }
    } catch (x) {
      setErr(authMessage(x));
    } finally {
      setBusy(false);
    }
  }
  async function forgot() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter your email first, then tap Forgot password.');
    setErr(null);
    try {
      await resetPassword(email);
      setNote(`If ${email.trim()} has an account, a reset link is on its way.`);
    } catch (x) {
      setErr(authMessage(x));
    }
  }

  return (
    <form className="en" onSubmit={submit}>
      <StepFrame
        onBack={onBack}
        action={
          <>
            <button type="submit" className="en-cta" disabled={!ok || busy}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <button type="button" className="en-link" onClick={() => { setErr(null); onMode(mode === 'signup' ? 'signin' : 'signup'); }}>
              {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          </>
        }
      >
        <div className="en-in" key={mode}>
          <Title
            eyebrow="Account"
            title={mode === 'signup' ? 'Create your account' : 'Welcome back'}
            sub={mode === 'signup'
              ? 'Your plan stays safe online and follows you to any phone. Only you can see it.'
              : 'Sign in and your plan, habits and money come back exactly as you left them.'}
          />
          <div className="en-fields">
            <label className="en-field">
              <span>Email</span>
              <input id="en-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label className="en-field">
              <span>{mode === 'signup' ? 'Password · at least 8 characters' : 'Password'}</span>
              <div className="en-pass">
                <input
                  id="en-password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                  <Icon name={show ? 'eye-off' : 'eye'} />
                </button>
              </div>
            </label>
          </div>
          {err && <p className="en-error" role="alert">{err}</p>}
          {note && <p className="en-ok" role="status">{note}</p>}
          {mode === 'signin' ? (
            <button type="button" className="en-link en-link-left" onClick={forgot}>Forgot password?</button>
          ) : (
            <button type="button" className="en-link en-link-left" onClick={onSkip}>
              Continue without an account <span>· data stays on this phone</span>
            </button>
          )}
        </div>
      </StepFrame>
    </form>
  );
}

function ConfirmScreen({ onBack, onSignedIn }: { onBack: () => void; onSignedIn: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="en">
      <StepFrame
        onBack={onBack}
        action={
          <>
            <button
              type="button" className="en-cta" disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  await signIn(pending.email, pending.password);
                  onSignedIn();
                } catch (x) {
                  setErr(authMessage(x));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Checking…' : 'I have confirmed, continue'}
            </button>
            <button type="button" className="en-link" onClick={onBack}>Use a different email</button>
          </>
        }
      >
        <div className="en-in en-centre">
          <div className="en-badge"><Icon name="mail" size={28} /></div>
          <Title title="Confirm your email" sub={`We sent a link to ${pending.email}. Open it once (any browser is fine), then come back here.`} />
          {err && <p className="en-error" role="alert">{err}</p>}
        </div>
      </StepFrame>
    </div>
  );
}

function RestoringScreen({ onEmpty }: { onEmpty: () => void }) {
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    const check = () => {
      const s = cloudState();
      const hasProfile = !!useStore.getState().data.profile.me?.onboarded;
      if (hasProfile) return; // the shell switches to the app on its own
      if (s.status === 'synced') onEmpty();
      if (s.status === 'error') setFailed(s.error ?? 'Sync failed');
    };
    check();
    return subscribeCloud(check);
  }, [onEmpty]);
  return (
    <div className="en en-restoring">
      <Mark size={56} />
      {!failed ? (
        <>
          <p className="en-restoring-text">Getting your plan ready…</p>
          <div className="en-loader" aria-hidden="true"><i /></div>
        </>
      ) : (
        <>
          <p className="en-error" role="alert">{failed}</p>
          <button type="button" className="en-cta" onClick={onEmpty}>Continue setup</button>
        </>
      )}
    </div>
  );
}

function RevealScreen({ a, onBack }: { a: Answers; onBack: () => void }) {
  const put = useStore((s) => s.put);
  const patchDay = useStore((s) => s.patchDay);
  const t = targets({ weightKg: a.weightKg, bodyType: a.bodyType });
  const name = a.name.trim();
  const plan = useMemo(() => TEMPLATES[a.goal].build(), [a.goal]);
  const more = plan.roadmap.length - 3;

  function enter() {
    haptic(20);
    const today = todayISO();
    savePlan(TEMPLATES[a.goal].build());
    for (const h of DEFAULT_HABITS) if (!useStore.getState().data.habits[h.id]) put('habits', h, { silent: true });
    runSeeders(useStore.getState());
    if (a.startDate <= today) patchDay(today, { weightKg: a.weightKg });
    put('profile', {
      id: 'me', name, startDate: a.startDate, heightCm: a.heightCm, weightKg: a.weightKg, bodyType: a.bodyType, diet: a.diet,
      currency: 'INR', theme: 'auto', monthlyBudget: a.budget, onboarded: true,
    });
  }

  return (
    <div className="en">
      <StepFrame onBack={onBack} action={<button type="button" className="en-cta" onClick={enter}>Enter Runway OS</button>}>
        <div className="en-in">
          <Title eyebrow={`Your ${plan.name} plan is ready`} title={`Welcome, ${name}.`} sub={`Day 1 is ${fmtLong(a.startDate)}. Here is where you start.`} />
          <div className="en-stats">
            <div><span>Calories</span><b className="num">{t.kcal.toLocaleString('en-IN')}</b><small>kcal a day</small></div>
            <div><span>Protein</span><b className="num">{t.proteinTarget}</b><small>grams a day</small></div>
            <div><span>Safe to spend</span><b className="num">{rupees(a.budget / 30)}</b><small>a day</small></div>
            <div><span>Your plan</span><b className="num">12</b><small>months · 52 weeks</small></div>
          </div>
          <ol className="en-path">
            {plan.roadmap.slice(0, 3).map((r, i) => (
              <li key={r.id} data-first={i === 0}>
                <span className="en-path-when">{r.when}</span>
                <strong>{r.title}</strong>
                <span className="en-path-detail">{r.detail}</span>
              </li>
            ))}
            {more > 0 && <li className="en-path-more">…and {more} more {more === 1 ? 'step' : 'steps'} in your plan</li>}
          </ol>
        </div>
      </StepFrame>
    </div>
  );
}

/** Shown for a moment while the phone's data loads. */
export function Splash() {
  return (
    <div className="en-splash" aria-busy="true" aria-label="Loading Runway OS">
      <Mark size={64} />
    </div>
  );
}
