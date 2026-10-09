import type { Chunk } from './types';

/**
 * Otomatik kaydırma modu — saf, testli.
 *
 * Metin paragraflar hâlinde alttan yukarı kayar; hız, ekrandaki paragrafların
 * ölçülen yüksekliğinden ve hedef kelime/dakikadan bulunur: yoğun (küçük
 * yazılı) metin yavaş, seyrek metin hızlı kayar ama dakikada okunan kelime
 * aynı kalır. Okuma çizgisinin altına gelen yer "okunan yer" sayılır.
 */

export interface ScrollParagraph {
  /** Paragrafın sırası */
  index: number;
  startChunk: number;
  /** Hariç */
  endChunk: number;
  words: number;
  text: string;
}

/** Chunk'lardan paragraflar (bölünmüş uzun kelime bir kez ve bütün yazılır) */
export function scrollParagraphs(chunks: Chunk[]): ScrollParagraph[] {
  const paragraphs: ScrollParagraph[] = [];
  let current: ScrollParagraph | null = null;
  const pieces: string[] = [];
  const close = () => {
    if (!current) return;
    current.text = pieces.join(' ');
    paragraphs.push(current);
    pieces.length = 0;
  };
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.partOf && chunk.partOf.index > 0) {
      if (current) current.endChunk = i + 1;
      continue;
    }
    // Paragraf sınırı chunk'ın ortasına düşebilir (chunk paragraflar arası
    // geçebiliyor): sınır token düzeyinde, chunk iki paragrafa da dahil
    for (const token of chunk.tokens) {
      if (!current || token.paragraphIndex !== current.index) {
        close();
        current = { index: token.paragraphIndex, startChunk: i, endChunk: i + 1, words: 0, text: '' };
      }
      current.endChunk = i + 1;
      pieces.push(token.text);
      if (token.core) current.words += 1;
    }
  }
  close();
  return paragraphs;
}

/** Chunk'ın bulunduğu paragrafın sırası (`paragraphs` içinde) */
export function paragraphOfChunk(paragraphs: ScrollParagraph[], chunkIndex: number): number {
  let low = 0;
  let high = paragraphs.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (paragraphs[mid].startChunk <= chunkIndex) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

/**
 * Okuma çizgisinin denk geldiği yer: pencerenin ilk paragrafından başlayıp
 * yükseklikleri toplayarak. Ölçülmemiş paragrafa gelinirse `null`.
 */
export function locateLine(
  heights: (number | undefined)[],
  gap: number,
  y: number
): { offset: number; fraction: number } | null {
  let top = 0;
  for (let i = 0; i < heights.length; i++) {
    const height = heights[i];
    if (height === undefined) return null;
    if (y < top + height + (i < heights.length - 1 ? gap : 0)) {
      return { offset: i, fraction: Math.max(0, Math.min(1, (y - top) / Math.max(1, height))) };
    }
    top += height + gap;
  }
  return heights.length ? { offset: heights.length - 1, fraction: 1 } : null;
}

/** Piksel/ms: dakikadaki kelimeyi, ölçülen paragrafların kelime başına yüksekliğiyle çevirir */
export function scrollSpeed(wpm: number, measured: { height: number; words: number }[], gap: number): number {
  let height = 0;
  let words = 0;
  for (const paragraph of measured) {
    height += paragraph.height + gap;
    words += paragraph.words;
  }
  if (words <= 0 || height <= 0) return 0;
  return (wpm / 60_000) * (height / words);
}

/** Paragraf içindeki oranı chunk'a çevirir */
export function chunkAt(paragraph: ScrollParagraph, fraction: number): number {
  const span = paragraph.endChunk - paragraph.startChunk;
  return Math.min(paragraph.endChunk - 1, paragraph.startChunk + Math.floor(fraction * span));
}
