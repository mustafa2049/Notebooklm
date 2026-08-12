import { chunkPivot } from './orp';
import { splitLongWord } from './syllable';
import type { Chunk, ChunkOptions, Token } from './types';

/**
 * Token'ları ekranda gösterilecek karelere (chunk) böler.
 *
 * Dört okuma modu da bu aynı listeyi kullanır; modlar arasındaki fark sadece
 * çizim katmanındadır. Cümle ve paragraf sınırları asla bir chunk'ın içinde
 * kalmaz, böylece "cümleye atla" kontrolleri ve tempo çarpanları tutarlı olur.
 */
export function buildChunks(tokens: Token[], options: ChunkOptions): Chunk[] {
  const chunks: Chunk[] = [];
  const size = Math.max(1, Math.min(4, Math.round(options.chunkSize)));

  let group: Token[] = [];

  const flush = () => {
    if (group.length === 0) return;
    const last = group[group.length - 1];
    const first = group[0];
    const text = group.map((t) => t.text).join(' ');

    // Tek başına çok uzun kelime: hece sınırından bölüp birden çok kare yap
    if (
      group.length === 1 &&
      options.splitLongWords > 0 &&
      first.core.length > options.splitLongWords
    ) {
      const parts = splitLongWord(first.text, options.splitLongWords);
      if (parts.length > 1) {
        parts.forEach((part, index) => {
          const isLastPart = index === parts.length - 1;
          chunks.push({
            text: part,
            tokens: [first],
            // Bölünmüş kelimenin parçaları tam kelime sayılmaz, yoksa uzun
            // kelimeler hem burada hem tempo çarpanında çifte cezalanır
            weight: 1 / parts.length + 0.15,
            pivot: chunkPivot(part),
            charStart: first.start,
            charEnd: first.end,
            minorPause: isLastPart && first.minorPause,
            sentenceEnd: isLastPart && first.sentenceEnd,
            paragraphEnd: isLastPart && first.paragraphEnd,
            hasDigit: first.hasDigit,
            sentenceIndex: first.sentenceIndex,
            paragraphIndex: first.paragraphIndex,
            partOf: { index, total: parts.length },
          });
        });
        group = [];
        return;
      }
    }

    chunks.push({
      text,
      tokens: group,
      weight: group.length,
      pivot: chunkPivot(text),
      charStart: first.start,
      charEnd: last.end,
      minorPause: last.minorPause,
      sentenceEnd: last.sentenceEnd,
      paragraphEnd: last.paragraphEnd,
      hasDigit: group.some((t) => t.hasDigit),
      sentenceIndex: first.sentenceIndex,
      paragraphIndex: first.paragraphIndex,
    });
    group = [];
  };

  for (const token of tokens) {
    const projected = group.length === 0
      ? token.text.length
      : group.reduce((n, t) => n + t.text.length + 1, 0) + token.text.length;

    // Karakter sınırını aşacaksa önce mevcut grubu kapat
    if (group.length > 0 && projected > options.maxChars) flush();

    group.push(token);

    const full = group.length >= size;
    const boundary =
      (options.breakOnSentence && (token.sentenceEnd || token.paragraphEnd)) ||
      (options.breakOnPunctuation && token.minorPause);

    if (full || boundary) flush();
  }
  flush();

  return chunks;
}

/** Chunk listesindeki toplam kelime sayısı (istatistikler için). */
export function countWords(chunks: Chunk[]): number {
  let total = 0;
  for (const chunk of chunks) {
    // Bölünmüş kelimenin sadece ilk parçası sayılır
    if (chunk.partOf && chunk.partOf.index > 0) continue;
    total += chunk.tokens.length;
  }
  return total;
}
