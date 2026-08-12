import type { Chunk, PacingOptions } from './types';

/** Bir karenin altına inemeyeceği süre (çok yüksek WPM'de okunamaz hâle gelmemesi için). */
export const MIN_FRAME_MS = 45;
/** Bir karenin üstüne çıkamayacağı süre (tek kelimede sıkışıp kalmayı önler). */
export const MAX_FRAME_MS = 3000;

/** Uzun kelime cezasının başladığı karakter sayısı. */
const LONG_WORD_THRESHOLD = 8;

/**
 * Bir karenin ekranda kalma süresi (ms).
 *
 * Taban süre `60000 / wpm × kelime ağırlığı`. Üstüne gözün gerçekte yavaşladığı
 * yerler için çarpanlar bindirilir. Duraklama çarpanları çarpılarak değil
 * en büyüğü alınarak uygulanır: paragraf sonu hem cümle sonu hem paragraf sonu
 * sayılıp iki kez cezalanmamalı.
 */
export function chunkDuration(chunk: Chunk, options: PacingOptions): number {
  const wpm = Math.max(50, options.wpm);
  let ms = (60000 / wpm) * Math.max(chunk.weight, 0.35);

  if (options.useMultipliers) {
    const extra = chunk.text.length - LONG_WORD_THRESHOLD;
    if (extra > 0) ms *= Math.min(1 + extra * 0.05, 1.7);
    if (chunk.hasDigit) ms *= 1.3;

    let pause = 1;
    if (chunk.minorPause) pause = 1.15;
    if (chunk.sentenceEnd) pause = 1.5;
    if (chunk.paragraphEnd) pause = 1.9;
    ms *= pause;
  }

  return Math.min(Math.max(ms, MIN_FRAME_MS), MAX_FRAME_MS);
}

/**
 * Duraklamadan sonraki ilk karelerde yumuşak başlangıç çarpanı.
 * Oynat'a basıldığı anda tam hızda başlamak, gözün ilk iki kelimeyi
 * kaçırmasına yol açıyor.
 */
export function rampMultiplier(framesSinceResume: number, enabled: boolean): number {
  if (!enabled) return 1;
  if (framesSinceResume === 0) return 1.6;
  if (framesSinceResume === 1) return 1.3;
  if (framesSinceResume === 2) return 1.12;
  return 1;
}

/** `fromIndex`'ten sona kadar tahmini okuma süresi (ms) — "kalan süre" göstergesi. */
export function estimateRemainingMs(
  chunks: Chunk[],
  options: PacingOptions,
  fromIndex = 0
): number {
  let total = 0;
  for (let i = Math.max(0, fromIndex); i < chunks.length; i++) {
    total += chunkDuration(chunks[i], options);
  }
  return total;
}

/** Gerçekleşen efektif hız: okunan kelime / geçen süre. */
export function effectiveWpm(words: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.round((words / elapsedMs) * 60000);
}
