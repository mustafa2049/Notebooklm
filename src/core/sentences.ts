import type { Chunk } from './types';

/**
 * Sesli okuma için cümle aralıkları — saf, testli.
 *
 * Seslendirme cümle cümle yapılıyor: kelime sınırı olayı (`onBoundary`) her
 * platformda ve her seste gelmiyor, cümle ise her yerde güvenilir bir birim.
 */

export interface SentenceSpan {
  sentenceIndex: number;
  /** Cümlenin ilk chunk'ı (okuyucu konumu için) */
  startChunk: number;
  charStart: number;
  charEnd: number;
  words: number;
}

export function sentenceSpans(chunks: Chunk[]): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const last = spans[spans.length - 1];
    // Bölünmüş uzun kelimenin parçaları tek kelime sayılır
    const words = chunk.partOf && chunk.partOf.index > 0 ? 0 : chunk.tokens.length;
    if (last && last.sentenceIndex === chunk.sentenceIndex) {
      last.charEnd = chunk.charEnd;
      last.words += words;
    } else {
      spans.push({
        sentenceIndex: chunk.sentenceIndex,
        startChunk: i,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        words,
      });
    }
  }
  return spans;
}

/** Verilen chunk'ı içeren cümlenin sırası (spans içinde). */
export function spanIndexForChunk(spans: SentenceSpan[], chunkIndex: number): number {
  let low = 0;
  let high = spans.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (spans[mid].startChunk <= chunkIndex) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

/**
 * Okuma hızını konuşma hızına çevirir. Sentezleyicilerin 1,0 hızı aşağı yukarı
 * dakikada 180 kelimeye denk; sesin anlaşılır kaldığı aralıkla sınırlanır.
 */
export const TTS_BASE_WPM = 180;

export function ttsRate(wpm: number): number {
  const rate = wpm / TTS_BASE_WPM;
  return Math.round(Math.max(0.5, Math.min(2, rate)) * 100) / 100;
}
