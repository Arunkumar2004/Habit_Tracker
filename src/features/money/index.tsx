// OWNER: Money agent. Exports moneyScreens; registers the money seeder and the Expense / Income quick adds.
import type { Screens } from '../../app/screens';
import { registerQuickAdd } from '../../store/registry';
import './money.css';
import './seed';
import { TxForm } from './TxForm';
import { Overview } from './Overview';
import { Entries } from './Entries';
import { Budgets } from './Budgets';
import { Goals } from './Goals';
import { RecurringScreen } from './Recurring';
import { Accounts } from './Accounts';

registerQuickAdd({
  id: 'expense', label: 'Expense', icon: 'wallet', order: 10,
  render: (close) => <TxForm initialType="expense" onDone={close} />,
});
registerQuickAdd({
  id: 'income', label: 'Income', icon: 'salary', order: 11,
  render: (close) => <TxForm initialType="income" onDone={close} />,
});

export const moneyScreens: Screens = {
  default: Overview,
  entries: Entries,
  budgets: Budgets,
  goals: Goals,
  recurring: RecurringScreen,
  accounts: Accounts,
};
