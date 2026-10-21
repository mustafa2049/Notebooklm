import { stripPunctuation, trLower } from '@/core/turkish';
import { isVocabWord, vocabForm, vocabIndex } from '@/core/vocabMarks';
import { sortForReview, type ReviewItem } from './review';

/**
 * Kelime oyunu — saf, testli (rastgelelik dışarıdan: testlerde tohumlu).
 *
 * Defterdeki kelimelerle kısa tur: "Anlamı hangisi?" (kelime verilir, 4
 * anlamdan biri seçilir) ve "Boşluğa hangisi gelir?" (kelimenin kaydedildiği
 * cümlede kelime boşluğa çevrilir, 4 kelimeden biri seçilir). Çeldiriciler
 * defterin öbür kelimelerinden. Tekrar sırası önce gelen kelimeler (zamanı
 * gelmiş, bilinmeyen) önce sorulur; cevaplar tekrar sırasını günceller.
 */

export interface GameEntry extends ReviewItem {
  id: string;
  word: string;
  lemma?: string;
  note?: string;
  sentence: string;
}

export interface Question {
  kind: 'meaning' | 'cloze';
  entryId: string;
  /** Anlam sorusunda kelime, boşluk sorusunda boşluklu cümle */
  prompt: string;
  options: string[];
  /** Doğru şıkkın sırası */
  answer: number;
}

/** Bir turda en çok soru */
export const ROUND_SIZE = 10;
/** Oyun için defterde gereken en az kelime (1 doğru + 3 çeldirici) */
export const MIN_WORDS = 4;
const BLANK = '_____';
const MAX_MEANING = 140;

/**
 * Notun ilk anlamı. Sözlük notu ("TDK — kalem\n1. (isim) Yazı aracı …") ise
 * ilk numaralı satır (etiketsiz); serbest not ya da açıklama ise ilk cümle.
 * Kelimenin kendisi anlamın içinde geçiyorsa "…" olur (cevabı ele vermesin).
 */
export function meaningOf(entry: Pick<GameEntry, 'word' | 'lemma' | 'note'>): string | null {
  const note = entry.note?.trim();
  if (!note) return null;
  let meaning: string;
  const numbered = /^\s*1\.\s*(?:\([^)]*\)\s*)?(.+)$/m.exec(note);
  if (/^(TDK|Vikisözlük) — /.test(note) && numbered) meaning = numbered[1];
  else meaning = note.split(/\n|(?<=[.!?])\s/)[0];
  meaning = meaning.trim();
  for (const form of new Set([entry.word, entry.lemma].filter(Boolean).map((value) => vocabForm(value!)))) {
    if (form.length < 3) continue;
    meaning = meaning.replace(new RegExp(form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'), '…');
  }
  if (meaning.length > MAX_MEANING) meaning = `${meaning.slice(0, MAX_MEANING - 1).trimEnd()}…`;
  return meaning.length >= 3 ? meaning : null;
}

/** Cümlede kelimenin (ya da çekimli hâlinin) yeri boşluğa çevrilir; bulunamazsa null */
export function clozeOf(entry: Pick<GameEntry, 'word' | 'lemma' | 'sentence'>): string | null {
  const index = vocabIndex([entry]);
  const parts = entry.sentence.split(/(\s+)/);
  for (let i = 0; i < parts.length; i++) {
    const core = stripPunctuation(parts[i]);
    if (!core || !isVocabWord(index, core)) continue;
    const at = parts[i].indexOf(core);
    parts[i] = parts[i].slice(0, at) + BLANK + parts[i].slice(at + core.length);
    return parts.join('');
  }
  return null;
}

/** Şıklarda kelime: madde başı varsa o (boşluk çekimli olsa da kök sorulur) */
export function answerWord(entry: Pick<GameEntry, 'word' | 'lemma'>): string {
  return trLower(entry.lemma?.trim() || entry.word.trim());
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Doğru cevap + farklı çeldiricilerden 3'ü, karışık */
function options(correct: string, pool: string[], random: () => number): { options: string[]; answer: number } | null {
  const distractors = shuffle(
    [...new Set(pool.filter((value) => trLower(value) !== trLower(correct)))],
    random
  ).slice(0, 3);
  if (distractors.length < 3) return null;
  const list = shuffle([correct, ...distractors], random);
  return { options: list, answer: list.indexOf(correct) };
}

export function buildRound(
  entries: GameEntry[],
  { now = Date.now(), random = Math.random, size = ROUND_SIZE }: { now?: number; random?: () => number; size?: number } = {}
): Question[] {
  if (entries.length < MIN_WORDS) return [];
  const meanings = new Map(entries.map((entry) => [entry.id, meaningOf(entry)]));
  const words = new Map(entries.map((entry) => [entry.id, answerWord(entry)]));
  const questions: Question[] = [];
  for (const entry of sortForReview(entries, now)) {
    if (questions.length >= size) break;
    const others = entries.filter((other) => other.id !== entry.id);
    const meaning = meanings.get(entry.id);
    const cloze = clozeOf(entry);
    // Türler sırayla; biri olmuyorsa öbürü
    const kinds: Question['kind'][] = questions.length % 2 === 0 ? ['meaning', 'cloze'] : ['cloze', 'meaning'];
    for (const kind of kinds) {
      if (kind === 'meaning' && meaning) {
        const pool = others.map((other) => meanings.get(other.id)).filter((value): value is string => Boolean(value));
        const choice = options(meaning, pool, random);
        if (choice) {
          questions.push({ kind, entryId: entry.id, prompt: entry.word, ...choice });
          break;
        }
      }
      if (kind === 'cloze' && cloze) {
        const choice = options(words.get(entry.id)!, others.map((other) => words.get(other.id)!), random);
        if (choice) {
          questions.push({ kind, entryId: entry.id, prompt: cloze, ...choice });
          break;
        }
      }
    }
  }
  return questions;
}

/** Testler için tohumlu rastgele (mulberry32) */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
