// Settings (blueprint 2.6, 10): profile, targets, model card, theme, backup export / import, reset, sync status.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useStore } from '../../store/store';
import { onlineStatus, subscribeStatus, emptyData } from '../../store/storage';
import { Field, ScreenHeader, Segmented, haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { targets } from '../../engines/nutrition';
import { backupDueDays, backupFilename, parseBackup, serialiseBackup, type ParseResult } from '../../lib/backup';
import { fmtLong, toISO } from '../../lib/date';
import { cloudConfigured } from '../../store/cloud';
import { AccountSection } from './Account';
import { COLLECTIONS, type BodyType, type CollectionName, type Diet, type Profile, type ThemePref } from '../../types';

interface DownloadsApi { save(req: { filename: string; data: string | Blob }): Promise<{ status: string }> }

/** A plain browser download, for the self-hosted app (outside claude.ai, where links can save files). */
const browserDownloads: DownloadsApi = {
  async save({ filename, data }) {
    const blob = typeof data === 'string' ? new Blob([data], { type: 'application/json' }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { status: 'saved' };
  },
};

/** The downloads capability, or null when this view cannot save files. */
export async function getDownloads(): Promise<DownloadsApi | null> {
  if (!window.claude) return browserDownloads;
  try {
    return ((await window.claude?.use('downloads')) as DownloadsApi | null | undefined) ?? null;
  } catch {
    return null;
  }
}
export function useDownloads(): DownloadsApi | null | undefined {
  const [dl, setDl] = useState<DownloadsApi | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void getDownloads().then((d) => live && setDl(d));
    return () => {
      live = false;
    };
  }, []);
  return dl;
}
export function saveErrorText(e: unknown): string | null {
  const code = (e as { code?: string })?.code;
  if (code === 'declined') return null;
  if (code === 'rate_limited') return 'A save is already open. Try again in a moment.';
  return 'Saving is not available here.';
}

function useSyncStatus() {
  const [s, setS] = useState(onlineStatus());
  useEffect(() => {
    const off = subscribeStatus(setS);
    return () => {
      off();
    };
  }, []);
  return s;
}

/** Text or number field that saves on blur / Enter. */
function ProfileInput({ label, value, onSave, type = 'text', unit, placeholder }: {
  label: string; value: string; onSave: (v: string) => void; type?: 'text' | 'number' | 'date'; unit?: string; placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    if (v !== value) onSave(v);
  };
  return (
    <Field label={label}>
      <div className="pg-unit">
        <input
          className={type === 'number' ? 'input num' : 'input'} type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : undefined} value={v} placeholder={placeholder}
          onChange={(e) => setV(e.target.value)} onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {unit && <span>{unit}</span>}
      </div>
    </Field>
  );
}

const optNum = (s: string): number | undefined => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

function ProfileSection({ p }: { p: Profile }) {
  const patch = useStore((s) => s.patch);
  const showToast = useStore((s) => s.showToast);
  const set = (part: Partial<Profile>, msg = 'Saved') => {
    patch('profile', 'me', part);
    showToast(msg, { undo: true });
  };
  const t = targets(p);
  return (
    <>
      <section className="section">
        <h2 className="label">Profile</h2>
        <div className="card stack">
          <ProfileInput label="Name" value={p.name} onSave={(v) => v.trim() && set({ name: v.trim() })} />
          <ProfileInput label="Start date" type="date" value={p.startDate} onSave={(v) => v && set({ startDate: v })} />
          <div className="grid-2">
            <ProfileInput label="Height" type="number" unit="cm" value={String(p.heightCm)} onSave={(v) => optNum(v) && set({ heightCm: Math.round(optNum(v)!) })} />
            <ProfileInput label="Weight" type="number" unit="kg" value={String(p.weightKg)} onSave={(v) => optNum(v) && set({ weightKg: optNum(v)! })} />
          </div>
          <div className="field">
            <span>Body type</span>
            <Segmented<BodyType>
              label="Body type" value={p.bodyType} onChange={(v) => set({ bodyType: v })}
              options={[{ value: 'skinny', label: 'Skinny' }, { value: 'average', label: 'Average' }, { value: 'more_fat', label: 'More fat' }]}
            />
          </div>
          <div className="field">
            <span>Food</span>
            <Segmented<Diet>
              label="Food" value={p.diet} onChange={(v) => set({ diet: v })}
              options={[{ value: 'veg', label: 'Veg' }, { value: 'non_veg', label: 'Non-veg' }]}
            />
          </div>
          <ProfileInput label="Monthly budget" type="number" unit="₹" value={String(p.monthlyBudget)} onSave={(v) => set({ monthlyBudget: Math.round(optNum(v) ?? 0) })} />
          <p className="muted small" style={{ margin: 0 }}>Units: kg and cm · Currency: ₹ INR</p>
        </div>
      </section>

      <section className="section">
        <h2 className="label">Targets</h2>
        <div className="card stack">
          <div className="pg-kv"><span>Calories</span><b className="num">{t.kcal.toLocaleString('en-IN')} kcal</b></div>
          <div className="pg-kv"><span>Protein range</span><b className="num">{t.proteinMin}–{t.proteinMax} g</b></div>
          <ProfileInput
            label="Protein target (leave empty to use the range)" type="number" unit="g" placeholder={String(targets({ ...p, proteinTargetG: undefined }).proteinTarget)}
            value={p.proteinTargetG ? String(p.proteinTargetG) : ''} onSave={(v) => set({ proteinTargetG: optNum(v) ? Math.round(optNum(v)!) : undefined })}
          />
        </div>
      </section>

      <section className="section">
        <h2 className="label">Model card</h2>
        <div className="card stack">
          <div className="grid-2">
            <ProfileInput label="Chest" type="number" unit="cm" value={p.chestCm ? String(p.chestCm) : ''} onSave={(v) => set({ chestCm: optNum(v) })} />
            <ProfileInput label="Waist" type="number" unit="cm" value={p.waistCm ? String(p.waistCm) : ''} onSave={(v) => set({ waistCm: optNum(v) })} />
          </div>
          <div className="grid-3" style={{ gap: 'var(--s3)' }}>
            <ProfileInput label="Shoe" value={p.shoeSize ?? ''} placeholder="10 UK" onSave={(v) => set({ shoeSize: v.trim() || undefined })} />
            <ProfileInput label="Hair" value={p.hair ?? ''} placeholder="Black" onSave={(v) => set({ hair: v.trim() || undefined })} />
            <ProfileInput label="Eyes" value={p.eyes ?? ''} placeholder="Brown" onSave={(v) => set({ eyes: v.trim() || undefined })} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="label">Theme</h2>
        <Segmented<ThemePref>
          label="Theme" value={p.theme} onChange={(v) => patch('profile', 'me', { theme: v })}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Auto' }]}
        />
      </section>
    </>
  );
}

function ExportBlock() {
  const dl = useDownloads();
  const patch = useStore((s) => s.patch);
  const showToast = useStore((s) => s.showToast);
  const [json, setJson] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  async function exportNow() {
    const text = serialiseBackup(useStore.getState().data);
    if (!dl) {
      setJson(text);
      return;
    }
    setBusy(true);
    try {
      await dl.save({ filename: backupFilename(), data: text });
      patch('profile', 'me', { lastBackupAt: Date.now() }, { silent: true });
      showToast('Backup saved');
    } catch (e) {
      const msg = saveErrorText(e);
      if (msg) {
        showToast(msg);
        setJson(text);
      }
    } finally {
      setBusy(false);
    }
  }
  function copy() {
    if (!json) return;
    const done = () => {
      patch('profile', 'me', { lastBackupAt: Date.now() }, { silent: true });
      showToast('Backup copied. Paste it somewhere safe.');
    };
    const select = () => {
      areaRef.current?.focus();
      areaRef.current?.select();
      showToast('Text selected. Copy it with your keyboard or menu.');
    };
    try {
      const p = navigator.clipboard?.writeText(json);
      if (p) p.then(done, select);
      else select();
    } catch {
      select();
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn-primary btn-block" onClick={exportNow} disabled={busy || dl === undefined}>
        <Icon name="download" /> Export backup
      </button>
      {json && (
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>Saving files is not available here. Copy this text and keep it safe.</p>
          <textarea ref={areaRef} className="input pg-backup-text" readOnly value={json} aria-label="Backup JSON" onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-block" onClick={copy}>Copy backup text</button>
        </div>
      )}
    </div>
  );
}

const COL_LABEL: Partial<Record<CollectionName, string>> = {
  days: 'Days', habits: 'Habits', workouts: 'Workouts', measurements: 'Measurements', photos: 'Photos', reviews: 'Sunday checks',
  transactions: 'Money entries', categories: 'Categories', accounts: 'Accounts', recurring: 'Recurring', goals: 'Goals',
  milestones: 'Roadmap steps', checklists: 'Checklists', profile: 'Profile',
};

/** Tombstone every current record (so the change reaches storage), then load `next`. */
function replaceEverything(next: ReturnType<typeof emptyData>) {
  const st = useStore.getState();
  for (const col of COLLECTIONS) {
    for (const id of Object.keys(st.data[col])) {
      if (!next[col][id]) useStore.getState().remove(col, id);
    }
  }
  useStore.getState().replaceAll(next);
}

function ImportBlock() {
  const showToast = useStore((s) => s.showToast);
  const [res, setRes] = useState<ParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setRes(parseBackup(String(r.result ?? '')));
    r.onerror = () => setRes({ ok: false, error: 'This file could not be read.' });
    r.readAsText(f);
  }
  function confirm() {
    if (!res?.ok) return;
    replaceEverything(res.data);
    setRes(null);
    haptic(20);
    showToast('Backup restored');
  }

  return (
    <div className="stack">
      <input ref={fileRef} className="pg-file" type="file" accept="application/json,.json" onChange={onFile} aria-label="Choose backup file" />
      <button type="button" className="btn btn-block" onClick={() => fileRef.current?.click()}>
        <Icon name="upload" /> Import backup
      </button>
      {res && !res.ok && <p className="small" style={{ margin: 0, color: 'var(--danger)' }} role="alert">{res.error}</p>}
      {res?.ok && (
        <div className="card-hi stack" role="region" aria-label="Backup preview">
          <strong>Replace all data with this backup?</strong>
          <span className="small muted">
            {res.exportedAt ? `Exported ${fmtLong(res.exportedAt.slice(0, 10))}` : 'Export date unknown'} · {res.total} records
          </span>
          <div className="pg-preview num">
            {COLLECTIONS.filter((c) => res.counts[c] > 0).map((c) => (
              <span key={c}>{COL_LABEL[c] ?? c}: <b>{res.counts[c]}</b></span>
            ))}
          </div>
          <span className="small muted">Everything on this phone now will be replaced.</span>
          <div className="grid-2">
            <button type="button" className="btn" onClick={() => setRes(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={confirm}>Replace</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetBlock() {
  const [stage, setStage] = useState(0);
  return (
    <div className="card pg-danger-zone stack">
      <strong>Reset</strong>
      <span className="small muted">Deletes every habit tick, workout, photo, money entry and your profile. Export a backup first.</span>
      {stage === 0 && <button type="button" className="btn btn-danger btn-block" onClick={() => setStage(1)}>Reset all data</button>}
      {stage === 1 && (
        <div className="stack">
          <span className="small" style={{ color: 'var(--danger)', fontWeight: 600 }}>Are you sure? This cannot be undone.</span>
          <div className="grid-2">
            <button type="button" className="btn" onClick={() => setStage(0)}>Keep my data</button>
            <button type="button" className="btn btn-danger" onClick={() => setStage(2)}>Yes, continue</button>
          </div>
        </div>
      )}
      {stage === 2 && (
        <div className="stack">
          <span className="small" style={{ color: 'var(--danger)', fontWeight: 600 }}>Last step. Tap Delete everything to wipe the app.</span>
          <div className="grid-2">
            <button type="button" className="btn" onClick={() => setStage(0)}>Cancel</button>
            <button
              type="button" className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => {
                haptic(30);
                replaceEverything(emptyData());
                useStore.setState({ route: { tab: 'today' }, history: [] });
              }}
            >
              Delete everything
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsScreen() {
  const p = useStore((s) => s.data.profile.me);
  const sync = useSyncStatus();
  if (!p) return <ScreenHeader title="Settings" back />;
  const due = backupDueDays(p.lastBackupAt, p.startDate, Date.now());
  const on = sync === 'on';
  return (
    <div>
      <ScreenHeader title="Settings" back />
      <AccountSection />
      <ProfileSection p={p} />

      <section className="section">
        <h2 className="label">Data</h2>
        <div className="card stack">
          {!cloudConfigured && (
            <div className="pg-status" data-on={on} role="status">
              <i aria-hidden="true" />
              {on ? 'Saved online' : sync === 'connecting' ? 'Connecting…' : 'Saved on this phone only'}
            </div>
          )}
          <span className="small muted">
            {p.lastBackupAt ? `Last backup ${fmtLong(toISO(new Date(p.lastBackupAt)))}` : 'No backup yet'}
          </span>
          {due !== null && (
            <div className="card-hi small" role="note">
              <b>Time for a backup.</b> {p.lastBackupAt ? `It has been ${due} days.` : 'Keep a copy of your data once a month.'}
            </div>
          )}
          <ExportBlock />
          <ImportBlock />
        </div>
      </section>

      <section className="section">
        <ResetBlock />
      </section>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 'var(--s5)' }}>Runway OS · Consistency beats intensity.</p>
    </div>
  );
}

export const settingsScreens = { settings: SettingsScreen };
