import { syllabify } from './syllable';
import { countSentences, tokenize } from './tokenizer';
import { trLower } from './turkish';

/**
 * Türkçe okunabilirlik — Ateşman (1997) formülü.
 *
 *   skor = 198,825 − 40,175 × (hece / kelime) − 2,610 × (kelime / cümle)
 *
 * Neden gerekli: seviye testleri her hafta **farklı** bir metinle yapılıyor. İki
 * ölçümün karşılaştırılabilmesi için metinlerin zorluğunun denk olması lazım;
 * aksi hâlde "hızlandım" sanılan şey yalnızca daha kolay bir metin olur. Gömülü
 * test metinlerinin aynı bantta olduğu testlerle garanti ediliyor.
 *
 * Bantlar (Ateşman): 90–100 çok kolay, 70–89 kolay, 50–69 orta güçlükte,
 * 30–49 zor, 1–29 çok zor.
 */

export interface Readability {
  score: number;
  words: number;
  sentences: number;
  syllablesPerWord: number;
  wordsPerSentence: number;
}

export type ReadabilityBand = 'çok kolay' | 'kolay' | 'orta' | 'zor' | 'çok zor';

export function readability(text: string): Readability {
  const tokens = tokenize(text).filter((token) => token.core.length > 0);
  const words = tokens.length;
  const sentences = Math.max(1, countSentences(tokens));
  if (words === 0) {
    return { score: 0, words: 0, sentences: 0, syllablesPerWord: 0, wordsPerSentence: 0 };
  }

  let syllables = 0;
  for (const token of tokens) syllables += syllableCount(token.core);

  const syllablesPerWord = syllables / words;
  const wordsPerSentence = words / sentences;
  const score = 198.825 - 40.175 * syllablesPerWord - 2.61 * wordsPerSentence;

  return { score, words, sentences, syllablesPerWord, wordsPerSentence };
}

/** Bir kelimenin hece sayısı; sesli harfi olmayan (sayı, kısaltma) 1 sayılır. */
export function syllableCount(word: string): number {
  return Math.max(1, syllabify(trLower(word)).length);
}

export function readabilityBand(score: number): ReadabilityBand {
  if (score >= 90) return 'çok kolay';
  if (score >= 70) return 'kolay';
  if (score >= 50) return 'orta';
  if (score >= 30) return 'zor';
  return 'çok zor';
}
