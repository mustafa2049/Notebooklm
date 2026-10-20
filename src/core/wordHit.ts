import { SOFT_HYPHEN, THIN_SPACE } from './typeset';
import type { Token } from './types';

/**
 * Uzun basılan kelimeyi bulmak — saf, testli.
 *
 * Okuyucunun paragrafları token'ların tek boşlukla birleşimidir; çizilen metne
 * ayrıca görünmez işaretler (yumuşak tire, ince boşluk) eklenir. Dokunulan
 * noktadan çizilen metindeki karakter dizini bulunur (web'de tarayıcıdan
 * kesin; telefonda satır ölçüsünden tahmin), sonra dizinden token'a gidilir.
 */

/** Çizilen metindeki dizinin, görünmez işaretler atılmış düz metindeki karşılığı */
export function plainIndex(display: string, index: number): number {
  let plain = 0;
  const end = Math.min(Math.max(0, index), display.length);
  for (let i = 0; i < end; i++) {
    const ch = display[i];
    if (ch !== SOFT_HYPHEN && ch !== THIN_SPACE) plain += 1;
  }
  return plain;
}

/**
 * Düz metindeki dizinin düştüğü token'ın sırası. Metin = token'lar tek
 * boşlukla birleşik; boşluğa denk gelirse soldaki token. Token yoksa -1.
 */
export function tokenAtPlainIndex(tokenTexts: string[], index: number): number {
  if (!tokenTexts.length) return -1;
  let start = 0;
  for (let i = 0; i < tokenTexts.length; i++) {
    const end = start + tokenTexts[i].length;
    if (index <= end) return i;
    start = end + 1;
  }
  return tokenTexts.length - 1;
}

// ------------------------------------------------- satır içi konum tahmini

/** Karakterin yaklaşık genişliği (yazı boyutunun katı) */
export function charWeight(ch: string): number {
  if (ch === SOFT_HYPHEN) return 0;
  if (ch === THIN_SPACE) return 0.2;
  if (ch === ' ') return 0.28;
  if ("iılIj.,;:!|'’`".includes(ch)) return 0.27;
  if ('ftr()[]{}-"“”«»'.includes(ch)) return 0.38;
  if ('mwMW'.includes(ch)) return 0.85;
  if ('ABCÇDEFGĞHİJKLNOÖPQRSŞTUÜVXYZ'.includes(ch)) return 0.66;
  return 0.54;
}

/**
 * Satır metninde `x` konumundaki karakterin dizini (telefonda: ölçülen satır
 * genişliğine harf ağırlıklarıyla oranlanır). İki yana yaslı satırda doğal
 * genişliği aşan pay boşluklara dağılır — tarayıcı ve Android da öyle yapar.
 */
export function charIndexAtX(
  line: string,
  x: number,
  width: number,
  options: { fontSize: number; letterSpacing: number; justified: boolean }
): number {
  const chars = [...line];
  if (!chars.length) return 0;
  const widths = chars.map((ch) =>
    ch === SOFT_HYPHEN ? 0 : charWeight(ch) * options.fontSize + options.letterSpacing
  );
  const natural = widths.reduce((sum, value) => sum + value, 0);
  const spaces = chars.filter((ch) => ch === ' ').length;
  if (options.justified && spaces > 0 && width > natural) {
    const extra = (width - natural) / spaces;
    chars.forEach((ch, i) => {
      if (ch === ' ') widths[i] += extra;
    });
  } else if (natural > 0) {
    const scale = width / natural;
    for (let i = 0; i < widths.length; i++) widths[i] *= scale;
  }
  let left = 0;
  for (let i = 0; i < widths.length; i++) {
    if (x < left + widths[i]) return i;
    left += widths[i];
  }
  return chars.length - 1;
}

export interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParagraphGeometry {
  /** Paragrafın içerik alanındaki yeri */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Telefonda `onTextLayout` satırları (paragrafın içine göre) */
  lines?: TextLine[];
}

/**
 * Telefonda: içerik alanındaki (x, y) noktasının paragrafı ve paragraftaki
 * çizilen metin dizini. Satırlar `onTextLayout`'tan; satır içi konum tahmin.
 */
export function hitFromGeometry(
  paragraphs: Map<string, ParagraphGeometry>,
  x: number,
  y: number,
  options: { fontSize: number; letterSpacing: number; justify: boolean }
): { key: string; index: number } | null {
  for (const [key, box] of paragraphs) {
    if (y < box.y || y >= box.y + box.height || !box.lines?.length) continue;
    const localY = y - box.y;
    const lines = box.lines;
    let lineIndex = lines.findIndex((line) => localY >= line.y && localY < line.y + line.height);
    if (lineIndex < 0) lineIndex = localY < lines[0].y ? 0 : lines.length - 1;
    const line = lines[lineIndex];
    // Paragrafın son satırı iki yana yaslanmaz
    const justified = options.justify && lineIndex < lines.length - 1;
    const width = justified ? box.width : line.width;
    const index = charIndexAtX(line.text, x - box.x - line.x, width, {
      fontSize: options.fontSize,
      letterSpacing: options.letterSpacing,
      justified,
    });
    const before = lines.slice(0, lineIndex).reduce((sum, previous) => sum + previous.text.length, 0);
    return { key, index: before + index };
  }
  return null;
}

// ----------------------------------------------------------- cümle bilgisi

export interface SentenceInfo {
  text: string;
  /** Metindeki başlangıç (alıntı ve atlama için) */
  offset: number;
  /** Noktalamasız kelimeler, sırasıyla, tekrarsız */
  words: string[];
}

/** Cümlenin metni, başlangıcı ve kelimeleri (token'lar cümle sırasıyla dizili) */
export function sentenceOf(tokens: Token[], sentenceIndex: number): SentenceInfo | null {
  // İkili arama: cümlenin ilk token'ı
  let low = 0;
  let high = tokens.length - 1;
  let first = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (tokens[mid].sentenceIndex < sentenceIndex) low = mid + 1;
    else {
      if (tokens[mid].sentenceIndex === sentenceIndex) first = mid;
      high = mid - 1;
    }
  }
  if (first < 0) return null;
  const parts: Token[] = [];
  for (let i = first; i < tokens.length && tokens[i].sentenceIndex === sentenceIndex; i++) parts.push(tokens[i]);
  const words: string[] = [];
  for (const token of parts) {
    if (token.core && !words.includes(token.core)) words.push(token.core);
  }
  return { text: parts.map((token) => token.text).join(' '), offset: parts[0].start, words };
}
