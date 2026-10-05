import { stripPunctuation } from '@/core/turkish';
import { tokenize } from '@/core/tokenizer';
import { shuffle, type Rng } from '../shuffle';

/**
 * Flaş kelime (görme açıklığı): bir kelime grubu çok kısa süre gösterilir,
 * ardından dört seçenekten görülen seçilir.
 *
 * Zorluk merdiven yöntemiyle (2 doğru → zorlaş, 1 yanlış → kolaylaş)
 * ayarlanır; bu, kişinin başarı oranını ~%70 civarında tutar — ne sıkıcı
 * kadar kolay ne de bıktıracak kadar zor. Zorlaşmak önce süreyi kısaltır, süre
 * alt sınıra gelince grup genişler.
 */

export interface FlashLevel {
  /** Gruptaki kelime sayısı (1–4) */
  span: number;
  /** Gösterim süresi */
  durationMs: number;
  /** Üst üste doğru sayısı (merdiven sayacı) */
  streak: number;
}

export const FLASH_START: FlashLevel = { span: 1, durationMs: 300, streak: 0 };
export const MIN_DURATION_MS = 80;
export const MAX_DURATION_MS = 600;
export const MAX_SPAN = 4;
const STEP = 0.8;

export function nextFlashLevel(level: FlashLevel, correct: boolean): FlashLevel {
  if (!correct) {
    // Kolaylaş: önce süreyi uzat; zaten uzunsa grubu küçült
    if (level.durationMs < MAX_DURATION_MS) {
      return { ...level, durationMs: Math.min(MAX_DURATION_MS, Math.round(level.durationMs / STEP)), streak: 0 };
    }
    return { span: Math.max(1, level.span - 1), durationMs: 300, streak: 0 };
  }
  if (level.streak + 1 < 2) return { ...level, streak: level.streak + 1 };
  // İki doğru: zorlaş
  const shorter = Math.round(level.durationMs * STEP);
  if (shorter >= MIN_DURATION_MS) return { ...level, durationMs: shorter, streak: 0 };
  if (level.span < MAX_SPAN) return { span: level.span + 1, durationMs: 300, streak: 0 };
  return { ...level, durationMs: MIN_DURATION_MS, streak: 0 };
}

/**
 * Metinlerden `span` kelimelik gruplar: cümle sınırını aşmayan, sayı içermeyen
 * kelime dizileri. Aynı grup birden çok kez yer almaz.
 */
export function phrasePool(texts: string[], span: number): string[] {
  const pool = new Set<string>();
  for (const text of texts) {
    const tokens = tokenize(text);
    for (let i = 0; i + span <= tokens.length; i++) {
      const window = tokens.slice(i, i + span);
      // Grup cümle sonunu ancak son kelimesinde içerebilir
      if (window.slice(0, -1).some((token) => token.sentenceEnd)) continue;
      if (window.some((token) => token.hasDigit)) continue;
      const words = window.map((token) => stripPunctuation(token.text)).filter(Boolean);
      if (words.length !== span) continue;
      pool.add(words.join(' '));
    }
  }
  return [...pool];
}

export interface FlashTrial {
  target: string;
  options: string[];
}

/**
 * Bir deneme: hedef + uzunluğu hedefe en yakın üç çeldirici. Benzer
 * uzunluktaki seçenekler, kısa/uzun farkından tahmin etmeyi engeller.
 */
export function makeFlashTrial(pool: string[], rng: Rng): FlashTrial | null {
  if (pool.length < 4) return null;
  const target = pool[Math.floor(rng() * pool.length)];
  const candidates = shuffle(
    pool.filter((phrase) => phrase !== target),
    rng
  ).sort((a, b) => Math.abs(a.length - target.length) - Math.abs(b.length - target.length));
  const distractors = candidates.slice(0, 3);
  return { target, options: shuffle([target, ...distractors], rng) };
}
