import type { Token } from './types';

/**
 * Sadeleştirilecek parça — saf, testli.
 *
 * Sayfa modunda sayfanın kendisi; diğer modlarda okunan paragraf. Paragraf
 * çok uzunsa (maliyet ve okunabilir yanıt için) okunan cümle ve çevresindeki
 * cümleler, önce ileriye (okur ileri gidiyor) sonra geriye doğru, yaklaşık
 * `maxWords` kelimeye kadar alınır. Cümle ortasından kesilmez.
 */
export function passageAround(
  tokens: Token[],
  tokenIndex: number,
  maxWords = 220
): { start: number; end: number } | null {
  const pivot = tokens[tokenIndex];
  if (!pivot) return null;

  // Paragrafın token aralığı
  let first = tokenIndex;
  while (first > 0 && tokens[first - 1].paragraphIndex === pivot.paragraphIndex) first--;
  let last = tokenIndex;
  while (last < tokens.length - 1 && tokens[last + 1].paragraphIndex === pivot.paragraphIndex) last++;
  if (last - first + 1 <= maxWords) return { start: tokens[first].start, end: tokens[last].end };

  // Uzun paragraf: cümle cümle genişlet
  const sentenceStart = (index: number) => {
    let i = index;
    while (i > first && tokens[i - 1].sentenceIndex === tokens[index].sentenceIndex) i--;
    return i;
  };
  const sentenceEnd = (index: number) => {
    let i = index;
    while (i < last && tokens[i + 1].sentenceIndex === tokens[index].sentenceIndex) i++;
    return i;
  };
  let a = sentenceStart(tokenIndex);
  let b = sentenceEnd(tokenIndex);
  for (;;) {
    const nextEnd = b < last ? sentenceEnd(b + 1) : -1;
    if (nextEnd >= 0 && nextEnd - a + 1 <= maxWords) {
      b = nextEnd;
      continue;
    }
    const previousStart = a > first ? sentenceStart(a - 1) : -1;
    if (previousStart >= 0 && b - previousStart + 1 <= maxWords) {
      a = previousStart;
      continue;
    }
    break;
  }
  return { start: tokens[a].start, end: tokens[b].end };
}
