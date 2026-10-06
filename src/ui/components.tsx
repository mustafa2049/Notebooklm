import type { ReactNode } from 'react';
import { tr } from '../i18n/tr';

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: NoInfer<T>; label: string }[];
  onChange(v: NoInfer<T>): void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?(): void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DisclaimerText() {
  return (
    <div className="stack">
      {tr.disclaimer.body.map((p) => (
        <p key={p} style={{ margin: 0 }}>
          {p}
        </p>
      ))}
    </div>
  );
}

/** Dairesel ilerleme halkası. */
export function ProgressRing({
  value,
  size = 220,
  stroke = 16,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring-wrap" style={{ width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`%${Math.round(v * 100)}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={v >= 1 ? 'var(--success)' : 'var(--primary)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

export function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div className="stars-row" aria-label={`${count} yıldız`}>
      {Array.from({ length: max }, (_, i) => (i < count ? '⭐' : '☆')).join('')}
    </div>
  );
}
