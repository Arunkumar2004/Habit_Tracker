// Looping exercise demos for the workout logger, plus a gallery screen (plan/moves) to review them all.
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { ScreenProps } from '../../../app/screens';
import { SESSIONS, isGymSession } from '../../../data/sessions';
import { Icon } from '../../../ui/Icon';
import { ScreenHeader } from '../../../ui/kit';
import { fitBox, frameAt, loopLength, tempoText, type MoveDef } from './engine';
import { MOVES, moveFor, type AnyMove } from './moves';
import { Scene } from './Scene';
import './anim.css';

function useReducedMotion(): boolean {
  const q = '(prefers-reduced-motion: reduce)';
  const [r, setR] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setR(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return r;
}

/** True while the element is on screen (so off-screen demos in a long list do not animate). */
function useOnScreen(ref: RefObject<Element>): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '40px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

const boxCache = new Map<string, ReturnType<typeof fitBox>>();
const boxFor = (m: MoveDef) => {
  let b = boxCache.get(m.id);
  if (!b) boxCache.set(m.id, (b = fitBox(m)));
  return b;
};

/** Start time of a key pose inside the loop. */
function keyTime(m: MoveDef, k: number): number {
  let t = 0;
  for (let i = 0; i < k; i++) t += (m.steps[i].hold ?? 0) + m.steps[i].move;
  return t;
}

function Stills({ m }: { m: MoveDef }) {
  const [a, b] = m.still ?? [0, 1];
  const box = boxFor(m);
  const one = a === b;
  return (
    <div className={one ? 'an-stills one' : 'an-stills'}>
      <figure className="an-still">
        <Scene className="an-svg" frame={frameAt(m, keyTime(m, a))} box={box} floor={m.floor !== false} />
        {!one && <figcaption>Start</figcaption>}
      </figure>
      {!one && (
        <figure className="an-still">
          <Scene className="an-svg" frame={frameAt(m, keyTime(m, b))} box={box} floor={m.floor !== false} />
          <figcaption>End</figcaption>
        </figure>
      )}
    </div>
  );
}

function AnimCard({ mv, name }: { mv: AnyMove; name: string }) {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(stage);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const [pick, setPick] = useState(0); // playlist entry shown in reduced-motion mode
  const tRef = useRef(0);

  const moves = mv.kind === 'move' ? [mv.def] : mv.moves;
  const loops = mv.kind === 'list' ? mv.def.loops ?? 2 : 1;
  const spans = useMemo(() => moves.map((m) => loopLength(m) * loops), [moves, loops]);
  const total = spans.reduce((n, s) => n + s, 0);

  useEffect(() => {
    if (!playing || !visible || reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      tRef.current = (tRef.current + Math.min(0.1, (now - last) / 1000)) % total;
      last = now;
      setT(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, reduced, total]);

  // Which move of a playlist is on, and the time inside it.
  let idx = 0;
  let local = t % total;
  while (idx < moves.length - 1 && local >= spans[idx]) local -= spans[idx++];
  if (reduced) idx = pick % moves.length;
  const m = moves[idx];
  const sub = moves.length > 1 ? `${m.name}: ` : '';
  const label = `${name}. ${mv.def.alt}`;

  return (
    <div className="an-card">
      <div
        ref={stage} className="an-stage" role="img" aria-label={label}
        onClick={reduced ? undefined : () => setPlaying((p) => !p)}
      >
        {reduced ? <Stills m={m} /> : <Scene className="an-svg" frame={frameAt(m, local)} box={boxFor(m)} floor={m.floor !== false} />}
      </div>
      <div className="an-cap">
        <span className="an-tempo">
          {sub && <strong>{sub}</strong>}
          {tempoText(m)}
        </span>
        {reduced ? (
          moves.length > 1 && (
            <button type="button" className="an-btn" onClick={() => setPick(pick + 1)} aria-label={`Show next move: ${moves[(idx + 1) % moves.length].name}`}>
              <Icon name="chevron" />
            </button>
          )
        ) : (
          <button
            type="button" className="an-btn" onClick={() => setPlaying(!playing)}
            aria-label={playing ? `Pause ${name} demo` : `Play ${name} demo`} aria-pressed={!playing}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Looping demo of an exercise. Renders nothing for exercises without a demo. */
export function ExerciseAnimation({ exerciseId, name }: { exerciseId: string; name: string }) {
  const mv = useMemo(() => moveFor(exerciseId), [exerciseId]);
  if (!mv) return null;
  return <AnimCard key={exerciseId} mv={mv} name={name} />;
}

/** Every exercise in the gym sessions (first appearance order), then the moves inside circuits and options. */
function galleryList(): { id: string; name: string }[] {
  const seen = new Set<string>();
  const out: { id: string; name: string }[] = [];
  for (const key of ['upper_a', 'lower_a', 'upper_b', 'lower_b'] as const) {
    const s = SESSIONS[key];
    if (!isGymSession(s)) continue;
    for (const e of s.exercises) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push({ id: e.id, name: e.name });
    }
  }
  for (const m of Object.values(MOVES)) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      out.push({ id: m.id, name: m.name });
    }
  }
  return out;
}

export function ExerciseGallery(_props: ScreenProps) {
  const list = useMemo(galleryList, []);
  return (
    <div className="an-gallery-screen">
      <ScreenHeader title="Exercise moves" back />
      <p className="small muted an-intro">Tap a demo to pause it. Copy the shape and the speed.</p>
      <ul className="an-gallery">
        {list.map((e) => (
          <li key={e.id} className="card an-item">
            <h2 className="an-name">{e.name}</h2>
            <ExerciseAnimation exerciseId={e.id} name={e.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}
