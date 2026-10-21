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

// ------------------------------------------------- rehberle birlikte
//
// Tempo rehberi oynarken bant, vurgulanan parçanın satırını izler: parçanın
// ilk harfinin paragraftaki yeri bulunur, oradan satırı (telefonda
// `onTextLayout` satırlarıyla, web'de karakter kutusuyla).

/** Rehberin parçasının yeri: paragraf sırası ve çizilen metindeki ilk harfinin dizini */
export function chunkPosition(
  paragraphs: { sentences: { parts: { chunkIndex: number; display: string }[] }[] }[],
  chunkIndex: number
): { paragraph: number; offset: number } | null {
  for (let paragraph = 0; paragraph < paragraphs.length; paragraph++) {
    let offset = 0;
    for (const sentence of paragraphs[paragraph].sentences) {
      for (const part of sentence.parts) {
        if (part.chunkIndex === chunkIndex) {
          return { paragraph, offset: offset + (/^\s*/.exec(part.display)?.[0].length ?? 0) };
        }
        offset += part.display.length;
      }
    }
  }
  return null;
}

/** Telefonda: satır metinlerinin uzunluklarından paragraf içi dizinin satırı */
export function lineOfIndex(lineLengths: number[], index: number): number {
  let end = 0;
  for (let i = 0; i < lineLengths.length; i++) {
    end += lineLengths[i];
    if (index < end) return i;
  }
  return Math.max(0, lineLengths.length - 1);
}

/** Web'de: karakter kutusunun üstünden (içerikteki y) satırı; dışarıdaysa en yakını */
export function lineAtY(tops: number[], y: number, lineHeight: number): number {
  if (!tops.length) return 0;
  const inside = tops.findIndex((top) => y >= top && y < top + lineHeight);
  if (inside >= 0) return inside;
  let best = 0;
  for (let i = 1; i < tops.length; i++) {
    if (Math.abs(tops[i] + lineHeight / 2 - y) < Math.abs(tops[best] + lineHeight / 2 - y)) best = i;
  }
  return best;
}

/** Rehberi izleyen bandın ilk satırı: 1 satırlık bantta etkin satır, 3 satırlıkta ortada */
export function followStart(activeLine: number, size: number, total: number): number {
  const start = activeLine - Math.floor((Math.max(1, size) - 1) / 2);
  return Math.max(0, Math.min(start, Math.max(0, total - size)));
}

/** Ayar değerleri: kapalı, 1 satır, 3 satır */
export const LINE_FOCUS_OPTIONS = [0, 1, 3] as const;

/** Klavyede L: kapalı → 1 → 3 → kapalı */
export function nextLineFocus(current: number): number {
  const index = LINE_FOCUS_OPTIONS.indexOf(current as (typeof LINE_FOCUS_OPTIONS)[number]);
  return LINE_FOCUS_OPTIONS[(index + 1) % LINE_FOCUS_OPTIONS.length];
}
