// Account and cloud sync (Supabase): sign in with an emailed 6-digit code, see sync status, sign out.
import { useEffect, useState, type FormEvent } from 'react';
import { cloudState, sendCode, signOut, subscribeCloud, syncNow, verifyCode, type CloudState } from '../../store/cloud';
import { useStore } from '../../store/store';
import { Field } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

export function useCloud(): CloudState {
  const [s, setS] = useState(cloudState);
  useEffect(() => subscribeCloud(setS), []);
  return s;
}

function ago(ms: number | null): string {
  if (!ms) return '';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

const STATUS: Record<CloudState['status'], string> = {
  off: 'Saved on this phone only',
  signed_out: 'Saved on this phone only',
  syncing: 'Syncing…',
  synced: 'Synced to your account',
  offline: 'Offline: changes will sync when you are back online',
  error: 'Sync failed',
};

/** Email → code → signed in. `compact` is the onboarding version ("Already using Runway OS?"). */
export function SignInForm({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const showToast = useStore((s) => s.showToast);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!emailOk || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await sendCode(email);
      setStep('code');
    } catch (x) {
      setErr(message(x));
    } finally {
      setBusy(false);
    }
  }
  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (code.trim().length < 6 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await verifyCode(email, code);
      showToast('Signed in. Syncing your data…');
    } catch (x) {
      setErr(message(x));
    } finally {
      setBusy(false);
    }
  }

  if (step === 'code') {
    return (
      <form className="stack" onSubmit={onVerify}>
        <p className="small" style={{ margin: 0 }}>
          We sent a code to <b>{email.trim()}</b>. Enter it below, or tap the link in the email on this phone.
        </p>
        <Field label="6-digit code">
          <input
            id="acct-code" className="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus
          />
        </Field>
        {err && <p className="small" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{err}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || code.trim().length < 6}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => { setStep('email'); setCode(''); setErr(null); }}>
          Use a different email
        </button>
      </form>
    );
  }
  return (
    <form className="stack" onSubmit={onSend}>
      {!compact && (
        <p className="small muted" style={{ margin: 0 }}>
          Sign in to keep your data safe online and use it on any phone. Each account sees only its own data.
        </p>
      )}
      <Field label="Email">
        <input
          id="acct-email" className="input" type="email" inputMode="email" autoComplete="email"
          placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {err && <p className="small" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{err}</p>}
      <button type="submit" className={`btn btn-block ${compact ? '' : 'btn-primary'}`} disabled={busy || !emailOk}>
        {busy ? 'Sending…' : 'Email me a sign-in code'}
      </button>
    </form>
  );
}

function message(x: unknown): string {
  const m = x && typeof x === 'object' && 'message' in x ? String((x as { message: unknown }).message) : String(x);
  if (/rate limit|too many/i.test(m)) return 'Too many emails were sent. Wait a few minutes and try again.';
  if (/expired|invalid/i.test(m)) return 'That code is wrong or has expired. Check the newest email, or send a new code.';
  if (/fetch|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
}

/** The Account section in Settings. Renders nothing when cloud sync is not set up in this build. */
export function AccountSection() {
  const c = useCloud();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!c.configured) return null;
  const signedIn = c.status !== 'signed_out' && c.status !== 'off';

  return (
    <section className="section">
      <h2 className="label">Account</h2>
      <div className="card stack">
        {!signedIn ? (
          <SignInForm />
        ) : (
          <>
            <div className="row">
              <span style={{ color: 'var(--accent)' }}><Icon name="lock" /></span>
              <div className="grow">
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{c.email}</div>
                <div className="small muted" role="status">
                  {STATUS[c.status]}{c.status === 'synced' && c.lastSyncAt ? ` · ${ago(c.lastSyncAt)}` : ''}
                </div>
              </div>
            </div>
            {c.status === 'error' && c.error && (
              <p className="small" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{c.error}</p>
            )}
            <div className="grid-2">
              <button type="button" className="btn" disabled={c.status === 'syncing'} onClick={() => void syncNow()}>
                <Icon name="repeat" /> Sync now
              </button>
              <button
                type="button" className={`btn ${confirm ? 'btn-danger' : ''}`} disabled={busy}
                onClick={async () => {
                  if (!confirm) return setConfirm(true);
                  setBusy(true);
                  await signOut();
                  setBusy(false);
                  setConfirm(false);
                }}
              >
                {busy ? 'Signing out…' : confirm ? 'Tap again to sign out' : 'Sign out'}
              </button>
            </div>
            {confirm && (
              <p className="small muted" style={{ margin: 0 }}>
                Signing out removes your data from this phone. It stays safe in your account; sign in again to get it back.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
