/**
 * Yazı boyutu ve satır aralığı seçenekleri — saf, testli.
 */

export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 2;
const FONT_SCALE_STEP = 0.1;

export const LINE_SPACINGS = [
  { label: 'Sıkı', value: 1.45 },
  { label: 'Normal', value: 1.7 },
  { label: 'Geniş', value: 2 },
];

/** Bir adım büyüt/küçült; kayan nokta birikmesin diye 0,1'e yuvarlanır. */
export function stepFontScale(current: number, direction: 1 | -1): number {
  const next = Math.round((current + direction * FONT_SCALE_STEP) * 10) / 10;
  return Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, next));
}
