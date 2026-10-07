// Money seeder: default categories and accounts on first run, and due recurring entries on every boot.
// Fixed ids, so two devices seeding before they sync merge into the same records.
import type { Account, Category } from '../../types';
import { useStore } from '../../store/store';
import { registerSeeder } from '../../store/registry';
import { recurringToCreate } from '../../engines/budget';
import { todayISO } from '../../lib/date';

type NewCat = Omit<Category, 'updatedAt'>;
const c = (id: string, name: string, icon: string, color: string, kind: Category['kind'], order: number, career = false): NewCat =>
  ({ id, name, icon, color, kind, order, career, monthlyBudget: 0 });

export const DEFAULT_CATEGORIES: NewCat[] = [
  c('food', 'Food', 'food', 'var(--c1)', 'expense', 1),
  c('transport', 'Transport', 'transport', 'var(--c3)', 'expense', 2),
  c('bills', 'Bills', 'bills', 'var(--c8)', 'expense', 3),
  c('shopping', 'Shopping', 'shopping', 'var(--c6)', 'expense', 4),
  c('fun', 'Entertainment', 'fun', 'var(--c4)', 'expense', 5),
  c('health', 'Health', 'health', 'var(--c5)', 'expense', 6),
  c('gym', 'Gym & Supplements', 'dumbbell', 'var(--c2)', 'expense', 7, true),
  c('grooming', 'Grooming & Skincare', 'grooming', 'var(--c7)', 'expense', 8, true),
  c('wardrobe', 'Wardrobe', 'wardrobe', 'var(--c4)', 'expense', 9, true),
  c('portfolio', 'Portfolio & Castings', 'portfolio', 'var(--c1)', 'expense', 10, true),
  c('other', 'Other', 'other', 'var(--c8)', 'expense', 11),
  c('salary', 'Salary', 'salary', 'var(--c2)', 'income', 20),
  c('freelance', 'Freelance', 'freelance', 'var(--c3)', 'income', 21),
  c('gigs', 'Modelling gigs', 'gig', 'var(--c1)', 'income', 22, true),
];

export const DEFAULT_ACCOUNTS: Omit<Account, 'updatedAt'>[] = [
  { id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 0 },
  { id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 0 },
  { id: 'upi', name: 'UPI', kind: 'upi', openingBalance: 0 },
  { id: 'card', name: 'Card', kind: 'card', openingBalance: 0 },
];

/** Adds every due recurring entry up to `upTo` and moves each `nextDate` on. Safe to call any time. */
export function processRecurring(upTo = todayISO()): number {
  const st = useStore.getState();
  let created = 0;
  for (const rec of Object.values(st.data.recurring)) {
    if (rec.deleted || !rec.active || rec.nextDate > upTo) continue;
    const { txs, next } = recurringToCreate(rec, upTo, useStore.getState().data.transactions);
    for (const t of txs) {
      st.put('transactions', t, { silent: true });
      created++;
    }
    if (next !== rec.nextDate) st.patch('recurring', rec.id, { nextDate: next }, { silent: true });
  }
  return created;
}

registerSeeder((s) => {
  // `s` is a snapshot; read fresh state after each write.
  if (Object.keys(useStore.getState().data.categories).length === 0) {
    for (const cat of DEFAULT_CATEGORIES) s.put('categories', cat, { silent: true });
  }
  if (Object.keys(useStore.getState().data.accounts).length === 0) {
    for (const a of DEFAULT_ACCOUNTS) s.put('accounts', a, { silent: true });
  }
  processRecurring();
});
