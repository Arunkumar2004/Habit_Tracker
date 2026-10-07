// Account and cloud sync (Supabase): email + password sign-in, sync status, sign out, password reset.
import { useEffect, useState, type FormEvent } from 'react';
import {
  cloudState, resetPassword, signIn, signOut, signUp, subscribeCloud, syncNow, updatePassword, type CloudState,
} from '../../store/cloud';
import { useStore } from '../../store/store';
import { Field, Segmented } from '../../ui/kit';
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

function message(x: unknown): string {
  const m = x && typeof x === 'object' && 'message' in x ? String((x as { message: unknown }).message) : String(x);
  if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(m)) return 'Confirm your email first: tap the link we sent you, then sign in here.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a few minutes and try again.';
  if (/password should be|at least/i.test(m)) return 'Use a password of at least 8 characters.';
  if (/fetch|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
}

type Mode = 'signin' | 'signup' | 'forgot';

/** Sign in / create account / forgot password. `compact` is the onboarding version. */
export function SignInForm({ compact }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const showToast = useStore((s) => s.showToast);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const pwOk = password.length >= 8;
  const canSubmit = emailOk && (mode === 'forgot' || pwOk) && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        showToast('Signed in. Syncing your data…');
      } else if (mode === 'signup') {
        const r = await signUp(email, password);
        if (r === 'signed_in') showToast('Account created. Syncing your data…');
        else {
          setNote(`We sent a confirmation link to ${email.trim()}. Tap it (any browser is fine), then come back and sign in.`);
          setMode('signin');
        }
      } else {
        await resetPassword(email);
        setNote(`If ${email.trim()} has an account, a reset link is on its way. Open it on this phone.`);
        setMode('signin');
      }
    } catch (x) {
      setErr(message(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {!compact && (
        <p className="small muted" style={{ margin: 0 }}>
          Sign in to keep your data safe online and use it on any phone. Each account sees only its own data.
        </p>
      )}
      {mode !== 'forgot' && (
        <Segmented
          label="Account" value={mode}
          options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]}
          onChange={(m) => { setMode(m); setErr(null); }}
        />
      )}
      <Field label="Email">
        <input
          id="acct-email" className="input" type="email" inputMode="email" autoComplete="email"
          placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {mode !== 'forgot' && (
        <Field label={mode === 'signup' ? 'Password (at least 8 characters)' : 'Password'}>
          <input
            id="acct-password" className="input" type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      )}
      {err && <p className="small" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{err}</p>}
      {note && <p className="small card-hi" role="status" style={{ margin: 0 }}>{note}</p>}
      <button type="submit" className={`btn btn-block ${compact ? '' : 'btn-primary'}`} disabled={!canSubmit}>
        {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Email me a reset link'}
      </button>
      {mode === 'signin' && (
        <button type="button" className="btn btn-ghost btn-block small" onClick={() => { setMode('forgot'); setErr(null); }}>
          Forgot password?
        </button>
      )}
      {mode === 'forgot' && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => { setMode('signin'); setErr(null); }}>
          Back to sign in
        </button>
      )}
    </form>
  );
}

/** Shown over the app after opening a password-reset link. */
export function PasswordRecovery() {
  const c = useCloud();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const showToast = useStore((s) => s.showToast);
  if (!c.recovery) return null;
  return (
    <>
      <div className="sheet-backdrop" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Set a new password">
        <div className="sheet-grip" />
        <div className="sheet-head"><h2>Set a new password</h2></div>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 8 || busy) return;
            setBusy(true);
            setErr(null);
            try {
              await updatePassword(pw);
              showToast('Password changed');
            } catch (x) {
              setErr(message(x));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="New password (at least 8 characters)">
            <input id="acct-new-password" className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          </Field>
          {err && <p className="small" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{err}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={pw.length < 8 || busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </>
  );
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
