// Food: targets, the 2-weekly calorie check, plate guide, the day plan as a meal checklist, and the shopping list.
import { useMemo, useState } from 'react';
import type { Diet } from '../../types';
import { DAY_MENUS, FOOD_TWEAKS, PLATE_GUIDE, shoppingFor, type Meal } from '../../data/food';
import { goalFor, kcalAdjustment, targets, weeklyAverages } from '../../engines/nutrition';
import { addDays, todayISO, weekStart } from '../../lib/date';
import { num } from '../../lib/format';
import { useStore } from '../../store/store';
import { usePlan } from '../../plan/resolve';
import { Icon } from '../../ui/Icon';
import { Bar, Ring, Segmented, haptic } from '../../ui/kit';
import { CheckRow } from './PlanLists';

const BODY_LABEL = { skinny: 'Skinny: +275 kcal', average: 'Average: no change', more_fat: 'More fat: −450 kcal' } as const;
const GOAL_LABEL = { gain: 'Goal: gain slowly', hold: 'Goal: hold weight, build muscle', lose: 'Goal: lose fat slowly' } as const;

export function FoodView() {
  const today = todayISO();
  const profile = useStore((s) => s.data.profile.me);
  const days = useStore((s) => s.data.days);
  const measurements = useStore((s) => s.data.measurements);
  const proteinToday = useStore((s) => Number(s.data.days[today]?.habits.protein ?? 0));
  const [diet, setDiet] = useState<Diet>(profile?.diet ?? 'veg');
  const plan = usePlan();

  const t = targets({ weightKg: profile?.weightKg ?? 0, bodyType: profile?.bodyType ?? 'average', proteinTargetG: profile?.proteinTargetG });
  const goal = goalFor(profile?.bodyType ?? 'average');
  const check = useMemo(() => {
    const entries = [
      ...Object.values(days).filter((d) => d.weightKg).map((d) => ({ date: d.date, kg: d.weightKg as number })),
      ...Object.values(measurements).filter((m) => m.weightKg).map((m) => ({ date: m.date, kg: m.weightKg as number })),
    ];
    const ws = weekStart(today);
    return kcalAdjustment(weeklyAverages(entries, [addDays(ws, -14), addDays(ws, -7), ws]), goal);
  }, [days, measurements, today, goal]);

  const menu = plan.menus[diet] ?? DAY_MENUS[diet];
  const kcalGap = t.kcal - menu.kcal;

  return (
    <>
      <div className="pl-hero">
        <div className="row" style={{ alignItems: 'center' }}>
          <Ring value={t.proteinTarget ? proteinToday / t.proteinTarget : 0} size={92} stroke={9} color="var(--success)">
            <div className="pl-ring-txt"><strong className="num">{num(proteinToday)}</strong><small>/ {t.proteinTarget} g</small></div>
          </Ring>
          <div className="grow pl-targets">
            <div><span className="label">Calories</span><strong className="num">{num(t.kcal)} <small>kcal</small></strong></div>
            <div><span className="label">Protein</span><strong className="num">{t.proteinTarget} g <small>({t.proteinMin}–{t.proteinMax})</small></strong></div>
          </div>
        </div>
        <span className="small muted">
          {profile?.weightKg ?? 70} kg × 32 · {BODY_LABEL[profile?.bodyType ?? 'average']} · protein 1.6–2.0 g per kg
        </span>
      </div>

      <div className={`pl-banner ${check.delta ? 'accent' : 'ok'}`} role="note" style={{ marginTop: 12 }}>
        <Icon name="scale" />
        <span><strong>{GOAL_LABEL[goal]}.</strong> {check.text}</span>
      </div>

      <div className="section">
        <div className="section-head"><span className="label">Plate guide</span><span className="small muted">Every main meal</span></div>
        <div className="grid-2">
          {PLATE_GUIDE.map((p) => (
            <div key={p.key} className="card pl-plate">
              <span className="pl-plate-ico" aria-hidden="true"><Icon name={p.icon} /></span>
              <strong>{p.measure}</strong>
              <span className="small">{p.part}</span>
              <span className="small muted">{p.examples}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><span className="label">Today's plan</span></div>
        <Segmented label="Diet" value={diet} onChange={setDiet} options={[{ value: 'veg', label: 'Veg' }, { value: 'non_veg', label: 'Non-veg' }]} />
        <MealChecklist meals={menu.meals} date={today} totalKcal={menu.kcal} totalProtein={menu.protein} />
        {(Math.abs(kcalGap) >= 150 || menu.protein < t.proteinTarget - 5) && (
          <div className="pl-tips small">
            <strong>Fit it to your target</strong>
            {kcalGap >= 150 && <span>You need about {num(kcalGap)} kcal more than this plan. {FOOD_TWEAKS.more}</span>}
            {kcalGap <= -150 && <span>You need about {num(-kcalGap)} kcal less than this plan. {FOOD_TWEAKS.less}</span>}
            {menu.protein < t.proteinTarget - 5 && <span>{FOOD_TWEAKS.protein}</span>}
          </div>
        )}
      </div>

      <ShoppingList diet={diet} />
    </>
  );
}

function MealChecklist({ meals, date, totalKcal, totalProtein }: { meals: Meal[]; date: string; totalKcal: number; totalProtein: number }) {
  const id = `food-${date}`;
  const items = useStore((s) => s.data.checklists[id]?.items);
  const ticked = meals.filter((m) => items?.[m.id]);
  const kcal = ticked.reduce((n, m) => n + m.kcal, 0);
  const protein = ticked.reduce((n, m) => n + m.protein, 0);

  const toggle = (m: Meal) => {
    const st = useStore.getState();
    const on = !items?.[m.id];
    st.put('checklists', { id, items: { ...(items ?? {}), [m.id]: on } });
    st.bumpHabit(date, 'protein', on ? m.protein : -m.protein);
    haptic();
    st.showToast(on ? `${m.name} ticked. +${m.protein} g protein added.` : `${m.name} unticked. −${m.protein} g protein.`);
  };

  return (
    <div className="card pl-meals">
      <div className="pl-meal-sum">
        <div className="grow">
          <span className="small num"><strong>{num(kcal)}</strong> / {num(totalKcal)} kcal</span>
          <Bar value={kcal / totalKcal} />
        </div>
        <div className="grow">
          <span className="small num"><strong>{protein}</strong> / {totalProtein} g protein</span>
          <Bar value={protein / totalProtein} ok={protein >= totalProtein} />
        </div>
      </div>
      <ul className="pl-check-list">
        {meals.map((m) => (
          <CheckRow key={m.id} checked={!!items?.[m.id]} onToggle={() => toggle(m)} label={`${m.name}, ${m.time}`}>
            <div className="pl-meal-line">
              <strong>{m.name}</strong>
              <span className="small muted num">{m.time}</span>
            </div>
            <div className="small muted">{m.items.join(' · ')}</div>
            <div className="small num pl-meal-macros">{m.kcal} kcal · {m.protein} g protein</div>
          </CheckRow>
        ))}
      </ul>
    </div>
  );
}

function ShoppingList({ diet }: { diet: Diet }) {
  const id = `shop-${weekStart(todayISO())}`;
  const items = useStore((s) => s.data.checklists[id]?.items);
  const groups = shoppingFor(diet);
  const all = groups.flatMap((g) => g.items);
  const got = all.filter((i) => items?.[i.key]).length;
  const toggle = (key: string) => useStore.getState().put('checklists', { id, items: { ...(items ?? {}), [key]: !items?.[key] } });
  const clear = () => {
    useStore.getState().put('checklists', { id, items: {} });
    useStore.getState().showToast('Shopping list cleared.', { undo: true });
  };
  return (
    <div className="section">
      <div className="section-head">
        <span className="label">Weekly shopping list</span>
        <span className="small muted num">{got} / {all.length}</span>
      </div>
      <div className="card">
        {groups.map((g) => (
          <div key={g.title} className="pl-shop-group">
            <span className="label">{g.title}</span>
            <ul className="pl-check-list">
              {g.items.map((i) => (
                <CheckRow key={i.key} checked={!!items?.[i.key]} onToggle={() => toggle(i.key)} label={i.name}>
                  <div className="pl-meal-line"><span>{i.name}</span><span className="small muted num">{i.qty}</span></div>
                </CheckRow>
              ))}
            </ul>
          </div>
        ))}
        {got > 0 && <button type="button" className="btn btn-ghost btn-block" onClick={clear}>Clear ticks</button>}
      </div>
    </div>
  );
}
