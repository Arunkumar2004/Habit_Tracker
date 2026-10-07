// Money keypad: big ₹ display with Indian grouping and a 3 × 4 digit pad (digits, 00, backspace).
import { Icon } from '../../ui/Icon';
import { haptic } from '../../ui/kit';

const MAX_DIGITS = 9; // up to ₹99,99,99,999
const grouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Keypad value is a string of digits; this turns it into whole rupees. */
export function keypadValue(digits: string): number {
  return Number(digits || '0');
}

export function AmountDisplay({ digits, tone = 'ink', label }: { digits: string; tone?: 'ink' | 'income' | 'expense'; label?: string }) {
  const n = keypadValue(digits);
  return (
    <div className={`mn-amount mn-amount-${tone}`} aria-live="polite" aria-label={label ? `${label}: ₹${n}` : `₹${n}`}>
      <span className="mn-amount-cur">₹</span>
      <span className={`num mn-amount-val${n === 0 ? ' mn-amount-zero' : ''}`}>{grouping.format(n)}</span>
    </div>
  );
}

export function Keypad({ digits, onChange }: { digits: string; onChange: (d: string) => void }) {
  function press(k: string) {
    haptic(6);
    if (k === 'back') return onChange(digits.slice(0, -1));
    const next = (digits === '0' ? '' : digits) + k;
    const clean = next.replace(/^0+/, '');
    if (clean.length > MAX_DIGITS) return;
    onChange(clean);
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];
  return (
    <div className="mn-keypad" role="group" aria-label="Amount keypad">
      {keys.map((k) => (
        <button
          key={k} type="button" className="mn-key num" onClick={() => press(k)}
          aria-label={k === 'back' ? 'Delete last digit' : k}
          onContextMenu={k === 'back' ? (e) => { e.preventDefault(); onChange(''); } : undefined}
        >
          {k === 'back' ? <Icon name="back" size={22} /> : k}
        </button>
      ))}
    </div>
  );
}
