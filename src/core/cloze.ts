import type { Token } from './types';
import { trLower } from './turkish';

/**
 * Okunan bölümden otomatik boşluk doldurma (cloze) sorusu üretimi.
 *
 * Yapay zekâ olmadan "anlama" ölçmenin dürüst yolu bu: metnin kendi
 * kelimelerinden boşluk açılır, çeldiriciler de aynı metnin kelime havuzundan
 * seçilir. Gerçek anlama testinin yerini tutmaz ama hatırlamayı ölçer ve
 * kullanıcıya "ne kadar hızda okuyup ne kadar tuttum" karşılaştırması verir.
 */

/** Anlam taşımayan kelimeler — cloze boşluğu açılmaz, arama skorunda sayılmaz. */
export const STOPWORDS = new Set(
  [
    've', 'ile', 'ama', 'fakat', 'ancak', 'çünkü', 'gibi', 'için', 'kadar', 'daha',
    'çok', 'az', 'bir', 'bu', 'şu', 'o', 'ben', 'sen', 'biz', 'siz', 'onlar',
    'bunu', 'şunu', 'onu', 'ki', 'de', 'da', 'mi', 'mı', 'mu', 'mü', 'ise',
    'her', 'hiç', 'bazı', 'tüm', 'bütün', 'sonra', 'önce', 'şimdi', 'artık',
    'yine', 'hep', 'hemen', 'belki', 'değil', 'olarak', 'olan', 'oldu', 'olur',
    'var', 'yok', 'ne', 'nasıl', 'neden', 'kim', 'hangi', 'kendi', 'aynı',
    'diğer', 'böyle', 'şöyle', 'öyle', 'göre', 'doğru', 'karşı', 'üzere',
  ].map(trLower)
);

export interface ClozeQuestion {
  /** Boşluk `____` ile gösterilmiş cümle */
  prompt: string;
  answer: string;
  /** Doğru cevap dahil karıştırılmış seçenekler */
  options: string[];
}

function isContentWord(core: string): boolean {
  if (core.length < 5) return false;
  const lowered = trLower(core);
  if (STOPWORDS.has(lowered)) return false;
  for (const ch of core) {
    if (ch >= '0' && ch <= '9') return false;
  }
  return true;
}

/** Deterministik test için dışarıdan verilebilen rastgelelik kaynağı. */
export type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface ClozeOptions {
  /** Kaç soru üretilecek */
  count?: number;
  /** Token aralığı (okunan bölüm) */
  from?: number;
  to?: number;
  rng?: Rng;
}

export function buildCloze(tokens: Token[], options: ClozeOptions = {}): ClozeQuestion[] {
  const { count = 5, from = 0, to = tokens.length, rng = Math.random } = options;
  const range = tokens.slice(Math.max(0, from), Math.min(tokens.length, to));
  if (range.length === 0) return [];

  // Cümlelere göre grupla
  const sentences = new Map<number, Token[]>();
  for (const token of range) {
    const list = sentences.get(token.sentenceIndex);
    if (list) list.push(token);
    else sentences.set(token.sentenceIndex, [token]);
  }

  // Çeldirici havuzu: metnin tamamındaki içerik kelimeleri
  const pool = new Map<string, string>();
  for (const token of tokens) {
    if (isContentWord(token.core)) pool.set(trLower(token.core), token.core);
  }

  const usable = [...sentences.values()].filter(
    (list) => list.length >= 5 && list.some((t) => isContentWord(t.core))
  );
  if (usable.length === 0) return [];

  const questions: ClozeQuestion[] = [];
  const usedAnswers = new Set<string>();

  for (const sentence of shuffle(usable, rng)) {
    if (questions.length >= count) break;

    const candidates = sentence.filter(
      (t) => isContentWord(t.core) && !usedAnswers.has(trLower(t.core))
    );
    if (candidates.length === 0) continue;

    const target = candidates[Math.floor(rng() * candidates.length)];
    const answer = target.core;
    const answerKey = trLower(answer);
    usedAnswers.add(answerKey);

    const prompt = sentence
      .map((t) => (t === target ? t.text.replace(answer, '____') : t.text))
      .join(' ');

    // Benzer uzunlukta çeldiriciler daha zorlu bir test yapar
    const distractors = shuffle(
      [...pool.entries()]
        .filter(([key, word]) => key !== answerKey && Math.abs(word.length - answer.length) <= 3)
        .map(([, word]) => word),
      rng
    ).slice(0, 3);

    if (distractors.length < 3) continue;

    questions.push({
      prompt,
      answer,
      options: shuffle([answer, ...distractors], rng),
    });
  }

  return questions;
}
