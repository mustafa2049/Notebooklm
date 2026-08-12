import type { Chunk } from './types';

/**
 * İlerleme yardımcıları.
 *
 * Kaldığın yerden devam etme **karakter offseti** üzerinden saklanır, chunk
 * indeksi üzerinden değil: kullanıcı chunk boyutunu ya da modu değiştirdiğinde
 * chunk listesi baştan kurulur ve indeksler kayar, karakter offseti ise sabittir.
 */

export function progressRatio(chunks: Chunk[], index: number): number {
  if (chunks.length === 0) return 0;
  const clamped = Math.max(0, Math.min(index, chunks.length - 1));
  const total = chunks[chunks.length - 1].charEnd;
  if (total <= 0) return 0;
  return Math.min(1, chunks[clamped].charEnd / total);
}

/** Verilen karakter offsetini içeren (veya ondan sonraki ilk) chunk. */
export function indexFromCharOffset(chunks: Chunk[], offset: number): number {
  if (chunks.length === 0) return 0;
  let low = 0;
  let high = chunks.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (chunks[mid].charEnd <= offset) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Oran (0–1) üzerinden chunk indeksi — ilerleme çubuğundan atlamak için. */
export function indexFromRatio(chunks: Chunk[], ratio: number): number {
  if (chunks.length === 0) return 0;
  const total = chunks[chunks.length - 1].charEnd;
  return indexFromCharOffset(chunks, Math.max(0, Math.min(1, ratio)) * total);
}

/** `index`'e kadar okunan kelime sayısı (istatistikler için). */
export function wordsUpTo(chunks: Chunk[], index: number): number {
  let total = 0;
  const limit = Math.min(index, chunks.length);
  for (let i = 0; i < limit; i++) {
    const chunk = chunks[i];
    if (chunk.partOf && chunk.partOf.index > 0) continue;
    total += chunk.tokens.length;
  }
  return total;
}

/** Bir sonraki cümlenin ilk chunk'ı (yoksa son chunk). */
export function nextSentenceIndex(chunks: Chunk[], index: number): number {
  const current = chunks[index]?.sentenceIndex ?? 0;
  for (let i = index + 1; i < chunks.length; i++) {
    if (chunks[i].sentenceIndex > current) return i;
  }
  return Math.max(0, chunks.length - 1);
}

/**
 * Geçerli cümlenin başı; zaten başındaysak önceki cümlenin başı.
 * "Anlamadım, cümleyi tekrar et" hareketinin beklenen davranışı bu.
 */
export function previousSentenceIndex(chunks: Chunk[], index: number): number {
  if (chunks.length === 0) return 0;
  const clamped = Math.max(0, Math.min(index, chunks.length - 1));
  const current = chunks[clamped].sentenceIndex;
  const startOfCurrent = sentenceStart(chunks, clamped);
  if (startOfCurrent < clamped) return startOfCurrent;
  if (current === 0) return 0;
  return sentenceStart(chunks, startOfCurrent - 1);
}

function sentenceStart(chunks: Chunk[], index: number): number {
  const target = chunks[index].sentenceIndex;
  let i = index;
  while (i > 0 && chunks[i - 1].sentenceIndex === target) i--;
  return i;
}

/** Bir sonraki paragrafın ilk chunk'ı. */
export function nextParagraphIndex(chunks: Chunk[], index: number): number {
  const current = chunks[index]?.paragraphIndex ?? 0;
  for (let i = index + 1; i < chunks.length; i++) {
    if (chunks[i].paragraphIndex > current) return i;
  }
  return Math.max(0, chunks.length - 1);
}

/** Geçerli paragrafın başı; zaten başındaysak önceki paragrafın başı. */
export function previousParagraphIndex(chunks: Chunk[], index: number): number {
  if (chunks.length === 0) return 0;
  const clamped = Math.max(0, Math.min(index, chunks.length - 1));
  const target = chunks[clamped].paragraphIndex;
  let start = clamped;
  while (start > 0 && chunks[start - 1].paragraphIndex === target) start--;
  if (start < clamped) return start;
  if (start === 0) return 0;
  const previous = chunks[start - 1].paragraphIndex;
  let i = start - 1;
  while (i > 0 && chunks[i - 1].paragraphIndex === previous) i--;
  return i;
}
