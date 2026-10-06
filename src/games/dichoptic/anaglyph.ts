import type { AnaglyphSettings, Eye, GlassesType } from '../../model/types';

/** Dikoptik oyunlara verilen renk paleti. Zemin her zaman siyahtır. */
export interface DichopticPalette {
  /** Yalnızca tembel gözün gördüğü renk (tam kontrast). */
  amb: string;
  /** Yalnızca sağlam gözün gördüğü renk (azaltılmış kontrast). */
  fel: string;
  /** İki gözün de gördüğü (füzyon çerçevesi) renk. */
  both: string;
  bg: string;
}

type RGB = [number, number, number];

const otherChannel = (g: GlassesType, level: number): RGB =>
  g === 'red-blue' ? [0, 0, level] : g === 'red-green' ? [0, level, 0] : [0, level, level];

const rgb = ([r, g, b]: RGB, k = 1) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;

/** Kırmızı ve karşı filtrenin renkleri (tam parlaklık). */
export function filterColors(a: AnaglyphSettings): { red: RGB; other: RGB } {
  return { red: [a.redLevel, 0, 0], other: otherChannel(a.glasses, a.cyanLevel) };
}

/** Belirtilen gözün gördüğü renk (o gözün önündeki filtrenin rengi). */
export function colorForEye(a: AnaglyphSettings, eye: Eye): RGB {
  const { red, other } = filterColors(a);
  return a.redEye === eye ? red : other;
}

export function makePalette(a: AnaglyphSettings, amblyopicEye: Eye, fellowContrast: number): DichopticPalette {
  const fellowEye: Eye = amblyopicEye === 'left' ? 'right' : 'left';
  const amb = colorForEye(a, amblyopicEye);
  const fel = colorForEye(a, fellowEye);
  const both: RGB = [Math.max(amb[0], fel[0]) * 0.45, Math.max(amb[1], fel[1]) * 0.45, Math.max(amb[2], fel[2]) * 0.45];
  return { amb: rgb(amb), fel: rgb(fel, fellowContrast), both: rgb(both), bg: '#000' };
}

export const fellowEyeOf = (e: Eye): Eye => (e === 'left' ? 'right' : 'left');

/**
 * Sağlam göz kontrastını oyun başarısına göre ayarlar (Hess/Li yaklaşımı):
 * iyi performansta kontrast artar, böylece iki göz giderek dengelenir.
 */
export function adaptContrast(current: number, performance: number, playedSec: number): number {
  if (playedSec < 60) return current;
  let next = current;
  if (performance >= 0.7) next = current + 0.05;
  else if (performance < 0.35) next = current - 0.05;
  return Math.round(Math.max(0.1, Math.min(1, next)) * 100) / 100;
}

/** Oyunlarda kullanılan füzyon çerçevesi: iki gözün de gördüğü kenarlık. */
export function drawFusionFrame(ctx: CanvasRenderingContext2D, w: number, h: number, p: DichopticPalette) {
  ctx.strokeStyle = p.both;
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.setLineDash([10, 14]);
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.setLineDash([]);
}
