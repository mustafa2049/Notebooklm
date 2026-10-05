import type { Token } from '@/core/types';
import { tokenize } from '@/core/tokenizer';

/**
 * Tarama ve göz gezdirme egzersizlerinin metin işlemleri.
 */

/**
 * Göz gezdirme (ön okuma): her paragrafın yalnızca ilk cümlesi. Bilgi
 * metinlerinde paragrafın ana fikri çoğunlukla ilk cümlededir; okumadan önce
 * bunlara bakmak metnin haritasını çıkarır ve anlamayı kolaylaştırır.
 */
export function previewOutline(tokens: Token[]): string[] {
  const outline: string[] = [];
  let currentParagraph = -1;
  let sentence: string[] = [];
  let collecting = false;

  for (const token of tokens) {
    if (token.paragraphIndex !== currentParagraph) {
      currentParagraph = token.paragraphIndex;
      collecting = true;
      sentence = [];
    }
    if (!collecting) continue;
    sentence.push(token.text);
    if (token.sentenceEnd || token.paragraphEnd) {
      outline.push(sentence.join(' '));
      collecting = false;
    }
  }
  if (collecting && sentence.length) outline.push(sentence.join(' '));
  return outline;
}

export function previewOfText(text: string): string[] {
  return previewOutline(tokenize(text));
}

export interface TokenRange {
  from: number;
  to: number;
}

/**
 * Tarama cevabının metinde geçtiği **bütün** yerler (token aralıkları). Cevap
 * birden çok kelime olabilir ("Karl von Frisch"); bu kelimelerden herhangi
 * birine dokunmak isabettir. Cevap birden çok kez geçiyorsa hepsi geçerli:
 * kullanıcı hangisini önce gördüyse o.
 */
export function answerTokenRanges(text: string, tokens: Token[], answer: string): TokenRange[] {
  const ranges: TokenRange[] = [];
  if (!answer) return ranges;
  let start = text.indexOf(answer);
  while (start >= 0) {
    const end = start + answer.length;
    let from = -1;
    let to = -1;
    tokens.forEach((token, index) => {
      if (token.end > start && token.start < end) {
        if (from < 0) from = index;
        to = index;
      }
    });
    if (from >= 0) ranges.push({ from, to });
    start = text.indexOf(answer, end);
  }
  return ranges;
}

export function isScanHit(index: number, ranges: TokenRange[]): boolean {
  return ranges.some((range) => index >= range.from && index <= range.to);
}
