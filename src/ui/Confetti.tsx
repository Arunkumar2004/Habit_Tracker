// Short confetti burst for a 100% day. OWNER: charts agent (area E).
// Canvas overlay, pointer-events none, ~1.2 s, colours read from CSS variables, off under reduced motion.
import { useEffect, useRef, useState } from 'react';
import './charts/charts.css';

const DURATION = 1200;
const COUNT = 90;

interface Bit { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; color: string }

function reducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function palette(): string[] {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const accent = read('--accent', '#E8650A');
  // accent twice so it dominates; surface-2 is peach/cream, ink is near-black (light) or cream (dark).
  return [accent, accent, read('--surface-2', '#FDE9DA'), read('--ink', '#18181B'), read('--accent-soft', '#FCE3D0')];
}

/** Fires once each time `fire` turns true. */
export function Confetti({ fire }: { fire: boolean }) {
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prev = useRef(false);

  useEffect(() => {
    if (fire && !prev.current && !reducedMotion()) setActive(true);
    prev.current = fire;
  }, [fire]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) { setActive(false); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);

    const colors = palette();
    const ox = W / 2;
    const oy = Math.min(H * 0.35, 260);
    const bits: Bit[] = Array.from({ length: COUNT }, (_, i) => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 6 + Math.random() * 8;
      return {
        x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        w: 5 + Math.random() * 5, h: 7 + Math.random() * 7, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        color: colors[i % colors.length],
      };
    });

    let raf = 0;
    const t0 = performance.now();
    let last = t0;
    const frame = (now: number) => {
      const t = now - t0;
      const k = Math.min(3, (now - last) / 16.67); // frame-rate independent steps
      last = now;
      ctx.clearRect(0, 0, W, H);
      const fade = t > DURATION * 0.65 ? Math.max(0, 1 - (t - DURATION * 0.65) / (DURATION * 0.35)) : 1;
      ctx.globalAlpha = fade;
      for (const b of bits) {
        b.vy += 0.32 * k;
        b.vx *= 0.985 ** k;
        b.x += b.vx * k;
        b.y += b.vy * k;
        b.rot += b.vr * k;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.rot * 2)) + 1);
        ctx.restore();
      }
      if (t < DURATION) raf = requestAnimationFrame(frame);
      else setActive(false);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="ch-confetti" aria-hidden="true" />;
}
