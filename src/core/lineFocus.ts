/**
 * Satır odağı (okuma cetveli) — saf, testli.
 *
 * Sayfa modunda okunan 1–3 satırın dışı karartılır; dokunuşla bant bir satır
 * iner ya da çıkar, sayfanın sonunda sayfa döner. Satırların yeri ölçülerek
 * bulunur: her paragrafın yüksekliği satır yüksekliğinin tam katıdır
 * (satır aralığı açıkça verildiği için), dolayısıyla paragraf `n` satırdır ve
 * k. satırın üstü `paragrafın üstü + k × satır yüksekliği`.
 */

export interface ParagraphBox {
  /** İçerik alanındaki üst kenar */
  y: number;
  height: number;
}

/** Bandın sayfadaki ilk satırı; `LAST` = sayfanın son satırları */
export const LAST = -1;

/** Sayfadaki bütün satırların üst kenarları, yukarıdan aşağı */
export function lineTops(paragraphs: ParagraphBox[], lineHeight: number): number[] {
  if (lineHeight <= 0) return [];
  const tops: number[] = [];
  for (const box of [...paragraphs].sort((a, b) => a.y - b.y)) {
    const lines = Math.max(1, Math.round(box.height / lineHeight));
    for (let k = 0; k < lines; k++) tops.push(box.y + k * lineHeight);
  }
  return tops;
}

/** Bandın geçerli ilk satırı (`LAST` ve taşan değerler sınırlara çekilir) */
export function bandStart(start: number, total: number, size: number): number {
  const last = Math.max(0, total - size);
  return start < 0 ? last : Math.min(start, last);
}

/** Bant bir satır ilerler/geriler; sayfanın dışına çıkıyorsa sayfa çevrilir */
export function stepFocus(
  start: number,
  total: number,
  size: number,
  delta: 1 | -1
): { start: number } | { turn: 1 | -1 } {
  if (total <= 0) return { turn: delta };
  const next = bandStart(start, total, size) + delta;
  if (next < 0) return { turn: -1 };
  if (next > Math.max(0, total - size)) return { turn: 1 };
  return { start: next };
}

/** Bandın içerikteki dikey aralığı; satır yoksa `null` */
export function focusBand(
  tops: number[],
  start: number,
  size: number,
  lineHeight: number
): { top: number; bottom: number } | null {
  if (!tops.length || size <= 0) return null;
  const first = bandStart(start, tops.length, size);
  const last = Math.min(tops.length - 1, first + size - 1);
  return { top: tops[first], bottom: tops[last] + lineHeight };
}

/** Ayar değerleri: kapalı, 1 satır, 3 satır */
export const LINE_FOCUS_OPTIONS = [0, 1, 3] as const;

/** Klavyede L: kapalı → 1 → 3 → kapalı */
export function nextLineFocus(current: number): number {
  const index = LINE_FOCUS_OPTIONS.indexOf(current as (typeof LINE_FOCUS_OPTIONS)[number]);
  return LINE_FOCUS_OPTIONS[(index + 1) % LINE_FOCUS_OPTIONS.length];
}
