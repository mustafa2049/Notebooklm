import type { EyeRx, Prescription } from '../../model/types';

/** "+2,50", "-1.75", "2", "−1" gibi diyoptri yazımını sayıya çevirir (0,25 adıma yuvarlar). Boşsa 0, geçersizse null. */
export function parseDiopter(text: string): number | null {
  const s = text.trim().replace(/\s+/g, '').replace(',', '.').replace(/[−–]/g, '-');
  if (s === '' || s === '+' || s === '-') return 0;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const v = Math.round(Number(s) * 4) / 4;
  return Object.is(v, -0) ? 0 : v;
}

/** Eksen derecesi (0–180) ya da boşsa 0; geçersizse null. */
export function parseAxis(text: string): number | null {
  const s = text.trim().replace(/°$/, '');
  if (s === '') return 0;
  if (!/^\d{1,3}$/.test(s)) return null;
  return Number(s);
}

/** Bir gözün değerleri için hata iletisi (sorun yoksa null). */
export function validateEyeRx(rx: EyeRx): string | null {
  if (!Number.isFinite(rx.sph) || Math.abs(rx.sph) > 20) return 'Küre (SPH) −20 ile +20 arasında olmalı';
  if (!Number.isFinite(rx.cyl) || Math.abs(rx.cyl) > 8) return 'Silindir (CYL) −8 ile +8 arasında olmalı';
  if (!Number.isFinite(rx.axis) || rx.axis < 0 || rx.axis > 180) return 'Eksen (AKS) 0 ile 180 arasında olmalı';
  if (rx.cyl !== 0 && rx.axis === 0) return 'Silindir varken eksen (AKS) yazılmalı';
  return null;
}

/** Sferik eşdeğer: küre + silindirin yarısı. */
export const sphericalEquivalent = (rx: EyeRx): number => rx.sph + rx.cyl / 2;

/** İki göz arasındaki sferik eşdeğer farkı (diyoptri). */
export const anisometropia = (p: Prescription): number =>
  Math.abs(sphericalEquivalent(p.right) - sphericalEquivalent(p.left));

/** 1 D ve üzeri fark ambliyopi açısından önemlidir. */
export const ANISO_LIMIT = 1;

/** "+2,50" biçiminde diyoptri. */
export function formatDiopter(v: number, digits = 2): string {
  if (v === 0) return '0,00';
  const s = Math.abs(v).toFixed(digits).replace('.', ',');
  return `${v > 0 ? '+' : '−'}${s}`;
}

/** "+2,50 / −1,75 × 5°" biçiminde bir göz. */
export function formatRx(rx: EyeRx): string {
  const sph = formatDiopter(rx.sph);
  return rx.cyl === 0 ? `${sph} (silindir yok)` : `${sph} / ${formatDiopter(rx.cyl)} × ${rx.axis}°`;
}

/** Kişinin anlayacağı kısa açıklama. */
export function describeRx(rx: EyeRx): string {
  const parts: string[] = [];
  if (rx.sph > 0) parts.push('hipermetropi');
  else if (rx.sph < 0) parts.push('miyopi');
  if (rx.cyl !== 0) parts.push('astigmat');
  return parts.length ? parts.join(' + ') : 'numara yok';
}
