// First open: 4 quick steps (blueprint 2.6). Saves profile 'me' with onboarded: true.
import { useState } from 'react';
import { useStore } from '../../store/store';
import { Field, haptic } from '../../ui/kit';
import { todayISO } from '../../lib/date';
import { num, rupees } from '../../lib/format';
import { targets } from '../../engines/nutrition';
import type { BodyType, Diet } from '../../types';
import { DEFAULT_HABITS } from '../../data/plan';
import { runSeeders } from '../../store/registry';
import { cloudConfigured } from '../../store/cloud';
import { SignInForm } from './Account';

const STEPS = ['You', 'Body', 'Food', 'Money'];

export function Choice({ on, title, sub, onClick }: { on: boolean; title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" className="pg-choice" aria-pressed={on} onClick={() => { haptic(); onClick(); }}>
      <span className="pg-radio" aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </span>
    </button>
  );
}

const toNum = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** New phone: sign in and the account's data replaces onboarding (the shell switches once the profile arrives). */
function RestoreAccount() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card stack" style={{ marginTop: 'var(--s4)' }}>
      {!open ? (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setOpen(true)}>
          Already using Runway OS? Sign in to restore your data
        </button>
      ) : (
        <>
          <strong>Sign in to restore</strong>
          <SignInForm compact />
        </>
      )}
    </div>
  );
}

export function Onboarding() {
  const put = useStore((s) => s.put);
  const patchDay = useStore((s) => s.patchDay);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [height, setHeight] = useState('185');
  const [weight, setWeight] = useState('');
  const [bodyType, setBodyType] = useState<BodyType>('average');
  const [diet, setDiet] = useState<Diet>('non_veg');
  const [budget, setBudget] = useState('20000');

  const w = toNum(weight);
  const t = targets({ weightKg: w || 70, bodyType });
  const valid = [name.trim().length > 0 && !!startDate, toNum(height) >= 120 && w >= 30 && w <= 250, true, toNum(budget) >= 0][step];

  function finish() {
    const today = todayISO();
    put('profile', {
      id: 'me', name: name.trim(), startDate, heightCm: Math.round(toNum(height)), weightKg: w, bodyType, diet,
      currency: 'INR', theme: 'auto', monthlyBudget: Math.round(toNum(budget)), onboarded: true,
    });
    if (startDate <= today) patchDay(today, { weightKg: w });
    // After a reset the boot seeders have not run again: restore built-in habits and area defaults.
    const st = useStore.getState();
    for (const h of DEFAULT_HABITS) if (!st.data.habits[h.id]) st.put('habits', h, { silent: true });
    runSeeders(useStore.getState());
    haptic(20);
  }
  const next = () => (step < 3 ? setStep(step + 1) : finish());

  return (
    <div className="pg-onb">
      <div className="pg-brand">
        <div className="pg-mark" aria-hidden="true">R</div>
        <h1>Runway <span>OS</span></h1>
        <p>Your 12-month runway plan, one day at a time.</p>
      </div>

      <div>
        <div className="pg-dots" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of 4`}>
          {STEPS.map((s, i) => <i key={s} data-on={i <= step} />)}
        </div>
        <p className="label" style={{ margin: '8px 0 0' }}>Step {step + 1} of 4 · {STEPS[step]}</p>
      </div>

      <form
        className="pg-step" key={step}
        onSubmit={(e) => { e.preventDefault(); if (valid) next(); }}
      >
        {step === 0 && (
          <>
            <h2>What should we call you?</h2>
            <Field label="Name">
              <input className="input pg-big" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Your first name" autoFocus />
            </Field>
            <Field label="Start date (Day 1 of your plan)">
              <input className="input pg-big" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Your body today</h2>
            <div className="grid-2">
              <Field label="Height">
                <div className="pg-unit">
                  <input className="input pg-big num" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
                  <span>cm</span>
                </div>
              </Field>
              <Field label="Weight">
                <div className="pg-unit">
                  <input className="input pg-big num" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="72" autoFocus />
                  <span>kg</span>
                </div>
              </Field>
            </div>
            <div className="field">
              <span>Body type</span>
              <div className="pg-choices">
                <Choice on={bodyType === 'skinny'} title="Skinny" sub="Hard to gain weight: eat a little more" onClick={() => setBodyType('skinny')} />
                <Choice on={bodyType === 'average'} title="Average" sub="Eat at maintenance, build muscle" onClick={() => setBodyType('average')} />
                <Choice on={bodyType === 'more_fat'} title="More fat" sub="Lose fat slowly, keep muscle" onClick={() => setBodyType('more_fat')} />
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>How do you eat?</h2>
            <div className="pg-choices">
              <Choice on={diet === 'veg'} title="Vegetarian" sub="Paneer, dal, curd, soya, whey" onClick={() => setDiet('veg')} />
              <Choice on={diet === 'non_veg'} title="Non-vegetarian" sub="Eggs, chicken, fish plus veg foods" onClick={() => setDiet('non_veg')} />
            </div>
            <p className="muted small" style={{ margin: 0 }}>This picks your day meal plan. You can change it later in Settings.</p>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Monthly budget</h2>
            <Field label="What you can spend each month (₹)">
              <div className="pg-unit">
                <input className="input pg-big num" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))} />
                <span>{rupees(toNum(budget))}</span>
              </div>
            </Field>
            <div className="stack">
              <span className="label">Your daily targets</span>
              <div className="pg-targets">
                <div className="pg-target">
                  <span className="small muted">Calories</span>
                  <b className="num">{num(t.kcal)}<small>kcal</small></b>
                </div>
                <div className="pg-target">
                  <span className="small muted">Protein</span>
                  <b className="num">{t.proteinTarget}<small>g</small></b>
                  <span className="small muted num">{t.proteinMin}–{t.proteinMax} g range</span>
                </div>
              </div>
              <p className="muted small" style={{ margin: 0 }}>Worked out from {num(w || 70, 1)} kg and your body type.</p>
            </div>
          </>
        )}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>

      <div className="pg-onb-foot" style={step === 0 ? { gridTemplateColumns: '1fr' } : undefined}>
        {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        <button type="button" className="btn btn-primary" disabled={!valid} onClick={next}>
          {step < 3 ? 'Continue' : 'Start my plan'}
        </button>
      </div>

      {step === 0 && cloudConfigured && <RestoreAccount />}
    </div>
  );
}
