import { useState } from 'react';

const W = 640;
const H = 200;
const PAD = { l: 40, r: 12, t: 12, b: 28 };

interface BarDatum {
  label: string;
  value: number;
  tip: string;
}

/** Tek seri çubuk grafik; isteğe bağlı hedef çizgisi. */
export function BarChart({ data, goal, ariaLabel }: { data: BarDatum[]; goal?: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 1) * 1.1;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const slot = iw / data.length;
  const bw = Math.max(2, slot - 2);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, max / 2, max].map((t) => Math.round(t));
  const every = Math.ceil(data.length / 8);

  return (
    <div style={{ position: 'relative' }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.l + i * slot + 1;
          const h = Math.max(0, PAD.t + ih - y(d.value));
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              {/* Geniş tıklama alanı */}
              <rect x={x - 1} y={PAD.t} width={slot} height={ih} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${PAD.t + ih} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                  fill="var(--primary)"
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
              {i % every === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        {goal != null && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(goal)} y2={y(goal)} stroke="var(--text)" strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={W - PAD.r} y={y(goal) - 5} textAnchor="end">
              hedef
            </text>
          </g>
        )}
      </svg>
      {hover !== null && <Tip text={data[hover].tip} />}
    </div>
  );
}

interface Point {
  label: string;
  value: number;
  tip: string;
}

/** Tek seri çizgi grafik; `log` ile logaritmik eksen. */
export function LineChart({
  points,
  log,
  format,
  ariaLabel,
  min: minProp,
  max: maxProp,
}: {
  points: Point[];
  log?: boolean;
  format(v: number): string;
  ariaLabel: string;
  min?: number;
  max?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const f = (v: number) => (log ? Math.log10(v) : v);
  const vals = points.map((p) => f(p.value));
  let lo = minProp != null ? f(minProp) : Math.min(...vals);
  let hi = maxProp != null ? f(maxProp) : Math.max(...vals);
  if (hi - lo < 1e-6) {
    lo -= log ? 0.2 : 0.1;
    hi += log ? 0.2 : 0.1;
  }
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - ((f(v) - lo) / (hi - lo)) * ih;
  const inv = (t: number) => (log ? Math.pow(10, t) : t);
  const ticks = [lo, (lo + hi) / 2, hi].map(inv);
  const every = Math.ceil(points.length / 6);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          points.forEach((_, i) => {
            if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
          });
          setHover(best);
        }}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />
            {i % every === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle">
                {p.label}
              </text>
            )}
          </g>
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>
      {hover !== null && <Tip text={points[hover].tip} />}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div
      className="small"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '4px 8px',
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  );
}
