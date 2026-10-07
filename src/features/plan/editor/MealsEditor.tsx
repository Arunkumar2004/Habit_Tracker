// Meals: a veg and a non-veg day. Menu totals always equal the sum of its meals.
import { useState } from 'react';
import type { Diet } from '../../../types';
import type { Meal } from '../../../data/food';
import { usePlan } from '../../../plan/resolve';
import { useStore } from '../../../store/store';
import { Icon } from '../../../ui/Icon';
import { Empty, Field, Segmented } from '../../../ui/kit';
import { EditRow, RemoveButton, SheetActions, editPlan } from './common';
import { linesOf, mealTotals, newMealId, nonNegInt, withMenuTotals } from './helpers';

let lastDiet: Diet | null = null;

const DIETS: { value: Diet; label: string }[] = [
  { value: 'veg', label: 'Veg' },
  { value: 'non_veg', label: 'Non-veg' },
];

export function MealsEditor() {
  const plan = usePlan();
  const profileDiet = useStore((s) => s.data.profile.me?.diet);
  const [diet, setDiet] = useState<Diet>(lastDiet ?? profileDiet ?? 'veg');
  const pick = (d: Diet) => {
    lastDiet = d;
    setDiet(d);
  };
  const menu = plan.menus[diet];
  const meals = menu?.meals ?? [];
  const totals = mealTotals(meals);

  const open = (meal: Meal | null) =>
    useStore.getState().openSheet(meal ? meal.name : 'New meal', () => <MealForm diet={diet} meal={meal} />);
  const remove = (id: string) =>
    editPlan((next) => {
      const m = next.menus[diet];
      if (!m) return false;
      next.menus[diet] = withMenuTotals(m, m.meals.filter((x) => x.id !== id));
    }, 'Meal removed');

  return (
    <div className="stack">
      <Segmented label="Menu" value={diet} options={DIETS} onChange={pick} />
      <div className="pe-totals card">
        <div>
          <span className="label">Day total</span>
          <strong className="num">{totals.kcal.toLocaleString('en-IN')} kcal</strong>
        </div>
        <div>
          <span className="label">Protein</span>
          <strong className="num">{totals.protein} g</strong>
        </div>
      </div>
      {meals.length === 0 ? (
        <div className="card">
          <Empty icon="food" title="No meals yet">Tap Add meal to plan your first meal of the day.</Empty>
        </div>
      ) : (
        <ul className="list pe-list">
          {meals.map((m) => (
            <EditRow
              key={m.id} title={m.name} editLabel={`Edit ${m.name}`} onEdit={() => open(m)}
              lead={<span className="pe-time num">{m.time || '–'}</span>}
              meta={<span className="num">{m.kcal} kcal · {m.protein} g protein</span>}
            >
              <RemoveButton what={m.name} onConfirm={() => remove(m.id)} />
            </EditRow>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-block pe-add" onClick={() => open(null)}>
        <Icon name="plus" /> Add meal
      </button>
    </div>
  );
}

function MealForm({ diet, meal }: { diet: Diet; meal: Meal | null }) {
  const close = useStore((s) => s.closeSheet);
  const [v, setV] = useState({
    time: meal?.time ?? '', name: meal?.name ?? '', items: (meal?.items ?? []).join('\n'),
    kcal: meal ? String(meal.kcal) : '', protein: meal ? String(meal.protein) : '',
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const name = v.name.trim();

  const save = () => {
    if (!name) return;
    const clean = { time: v.time.trim(), name, items: linesOf(v.items), kcal: nonNegInt(v.kcal), protein: nonNegInt(v.protein) };
    editPlan((next) => {
      const m = next.menus[diet];
      if (!m) return false;
      const list = meal
        ? m.meals.map((x) => (x.id === meal.id ? { ...x, ...clean } : x))
        : [...m.meals, { id: newMealId(), ...clean }];
      next.menus[diet] = withMenuTotals(m, list);
    }, meal ? undefined : 'Meal added');
    close();
  };

  return (
    <div className="stack pe-form">
      <div className="grid-2">
        <Field label="Time">
          <input id="pe-meal-time" className="input num" value={v.time} onChange={set('time')} maxLength={10} placeholder="7:30" />
        </Field>
        <Field label="Name">
          <input id="pe-meal-name" className="input" value={v.name} onChange={set('name')} maxLength={40} placeholder="Breakfast" autoFocus={!meal} />
        </Field>
      </div>
      <Field label="What to eat (one per line)">
        <textarea id="pe-meal-items" className="input pe-textarea" rows={4} value={v.items} onChange={set('items')} placeholder={'Oats (60 g)\n1 banana'} />
      </Field>
      <div className="grid-2">
        <Field label="Calories (kcal)">
          <input id="pe-meal-kcal" className="input num" type="number" inputMode="numeric" min={0} value={v.kcal} onChange={set('kcal')} />
        </Field>
        <Field label="Protein (g)">
          <input id="pe-meal-protein" className="input num" type="number" inputMode="numeric" min={0} value={v.protein} onChange={set('protein')} />
        </Field>
      </div>
      <SheetActions onSave={save} onCancel={close} saveLabel={meal ? 'Save' : 'Add meal'} disabled={!name} />
    </div>
  );
}
