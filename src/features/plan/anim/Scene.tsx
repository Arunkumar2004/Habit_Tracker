// Draws one frame of a move as SVG. World y points up, so every y is flipped here.
import type { Box, Frame, Shape, Tone, Vec } from './engine';

const COL: Record<Tone, string> = {
  ink: 'var(--ink)', muted: 'var(--muted)', line: 'var(--line)', accent: 'var(--accent)', bg: 'var(--bg)', none: 'none',
};
const f1 = (n: number) => Math.round(n * 10) / 10;
const X = (p: Vec) => f1(p.x);
const Y = (p: Vec) => f1(-p.y);

function Sh({ s }: { s: Shape }) {
  switch (s.t) {
    case 'line':
      return (
        <line
          x1={X(s.a)} y1={Y(s.a)} x2={X(s.b)} y2={Y(s.b)} stroke={COL[s.tone]} strokeWidth={s.w}
          strokeLinecap={s.butt ? 'butt' : 'round'} opacity={s.op}
        />
      );
    case 'path': {
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p)} ${Y(p)}`).join('') + (s.closed ? 'Z' : '');
      return (
        <path
          d={d} stroke={COL[s.tone]} strokeWidth={s.w} fill={s.fill ? COL[s.fill] : 'none'}
          strokeLinecap="round" strokeLinejoin="round" opacity={s.op}
        />
      );
    }
    case 'circle':
      return <circle cx={X(s.c)} cy={Y(s.c)} r={s.r} stroke={COL[s.tone]} strokeWidth={s.w ?? 0} fill={s.fill ? COL[s.fill] : 'none'} opacity={s.op} />;
    case 'ellipse':
      return (
        <ellipse
          cx={X(s.c)} cy={Y(s.c)} rx={s.rx} ry={s.ry} fill={COL[s.fill]} opacity={s.op}
          transform={`rotate(${f1(-s.angle)} ${X(s.c)} ${Y(s.c)})`}
        />
      );
  }
}

const list = (arr: Shape[]) => arr.map((s, i) => <Sh key={i} s={s} />);

/** One frame. `floor` draws the floor line; a frame with `floorShift` also gets scrolling floor marks. */
export function Scene({ frame, box, floor = true, className }: { frame: Frame; box: Box; floor?: boolean; className?: string }) {
  const vb = `${f1(box.x)} ${f1(-(box.y + box.h))} ${f1(box.w)} ${f1(box.h)}`;
  const marks: number[] = [];
  if (floor && frame.floorShift !== undefined) {
    const gap = 19.05;
    // Marks sit at fixed floor positions; the scene is drawn shifted by (100 - floorShift).
    const base = 100 - frame.floorShift;
    for (let x = base + gap * Math.floor((box.x - base) / gap); x < box.x + box.w + 5; x += gap) marks.push(x);
  }
  return (
    <svg className={className} viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      {floor && <line x1={f1(box.x)} x2={f1(box.x + box.w)} y1={0} y2={0} stroke="var(--muted)" strokeWidth={1.2} opacity={0.55} />}
      {marks.map((x, i) => (
        <line key={i} x1={f1(x)} x2={f1(x - 4)} y1={1.2} y2={4.5} stroke="var(--muted)" strokeWidth={1} opacity={0.4} />
      ))}
      <g>{list(frame.back)}</g>
      <g opacity={0.38}>{list(frame.far)}</g>
      <g>{list(frame.mid)}</g>
      <g>{list(frame.near)}</g>
      <g>{list(frame.front)}</g>
    </svg>
  );
}
