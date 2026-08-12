import { describe, expect, it } from 'vitest';
import { buildChunks } from './chunker';
import { chunkDuration, effectiveWpm, estimateRemainingMs, MIN_FRAME_MS } from './pacing';
import { createPlayback, play, tick } from './scheduler';
import { tokenize } from './tokenizer';
import { DEFAULT_CHUNK_OPTIONS, type PacingOptions } from './types';

const plainPacing: PacingOptions = { wpm: 500, useMultipliers: false, rampUp: false };

function plainText(words: number, word = 'test'): string {
  return Array.from({ length: words }, () => word).join(' ');
}

describe('chunkDuration', () => {
  it('çarpansız temel süre 60000/wpm', () => {
    const chunks = buildChunks(tokenize('test test'), DEFAULT_CHUNK_OPTIONS);
    expect(chunkDuration(chunks[0], plainPacing)).toBeCloseTo(120, 5);
  });

  it('cümle ve paragraf sonunda duraklar', () => {
    const chunks = buildChunks(tokenize('kelime kelime. Kelime kelime'), DEFAULT_CHUNK_OPTIONS);
    const withMultipliers: PacingOptions = { wpm: 500, useMultipliers: true, rampUp: false };
    const sentenceEndChunk = chunks.find((c) => c.sentenceEnd && !c.paragraphEnd)!;
    const plainChunk = chunks.find((c) => !c.sentenceEnd)!;
    expect(chunkDuration(sentenceEndChunk, withMultipliers)).toBeGreaterThan(
      chunkDuration(plainChunk, withMultipliers)
    );
  });

  it('paragraf sonu cezası cümle sonu cezasıyla çarpılmaz (en büyüğü alınır)', () => {
    const chunks = buildChunks(tokenize('kelime.'), DEFAULT_CHUNK_OPTIONS);
    const opts: PacingOptions = { wpm: 300, useMultipliers: true, rampUp: false };
    const base = (60000 / 300) * 1.9; // sadece paragraf çarpanı + uzunluk cezası
    expect(chunkDuration(chunks[0], opts)).toBeLessThan(base * 1.5);
  });

  it('çok yüksek hızda okunamaz kısalığa inmez', () => {
    const chunks = buildChunks(tokenize('test'), DEFAULT_CHUNK_OPTIONS);
    const duration = chunkDuration(chunks[0], { wpm: 5000, useMultipliers: false, rampUp: false });
    expect(duration).toBe(MIN_FRAME_MS);
  });

  it('rakam içeren kelimeye daha çok süre verir', () => {
    const opts: PacingOptions = { wpm: 400, useMultipliers: true, rampUp: false };
    const [numeric] = buildChunks(tokenize('2026 yılında'), DEFAULT_CHUNK_OPTIONS);
    const [plain] = buildChunks(tokenize('yılın yılında'), DEFAULT_CHUNK_OPTIONS);
    expect(chunkDuration(numeric, opts)).toBeGreaterThan(chunkDuration(plain, opts));
  });
});

describe('tempo doğruluğu', () => {
  it('500 WPM ile 1000 kelime yaklaşık 120 saniye sürer', () => {
    const chunks = buildChunks(tokenize(plainText(1000)), DEFAULT_CHUNK_OPTIONS);
    expect(chunks).toHaveLength(1000);
    const total = estimateRemainingMs(chunks, plainPacing);
    expect(total).toBeGreaterThan(120_000 * 0.98);
    expect(total).toBeLessThan(120_000 * 1.02);
  });

  it('gerçek oynatmada kayma birikmez (16 ms kare aralığı, %2 tolerans)', () => {
    const chunks = buildChunks(tokenize(plainText(1000)), DEFAULT_CHUNK_OPTIONS);
    const durationOf = (index: number) => chunkDuration(chunks[index], plainPacing);

    let now = 0;
    let state = play(createPlayback(0), now, durationOf);
    // Gerçek bir rAF döngüsünü taklit et: her 16.7 ms'de bir tick
    while (!state.finished && now < 200_000) {
      now += 16.7;
      state = tick(state, now, chunks.length, durationOf);
    }

    expect(state.finished).toBe(true);
    expect(now).toBeGreaterThan(120_000 * 0.98);
    expect(now).toBeLessThan(120_000 * 1.02);
  });

  it('düzensiz kare aralıklarında da toplam süreyi korur', () => {
    const chunks = buildChunks(tokenize(plainText(300)), DEFAULT_CHUNK_OPTIONS);
    const durationOf = (index: number) => chunkDuration(chunks[index], plainPacing);
    const expected = 300 * 120;

    let now = 0;
    let state = play(createPlayback(0), now, durationOf);
    let seed = 1;
    while (!state.finished && now < 120_000) {
      // 8–40 ms arası değişken kare süresi (takılan cihaz)
      seed = (seed * 1103515245 + 12345) % 2147483648;
      now += 8 + (seed % 32);
      state = tick(state, now, chunks.length, durationOf);
    }

    expect(state.finished).toBe(true);
    expect(Math.abs(now - expected) / expected).toBeLessThan
      (0.02);
  });
});

describe('effectiveWpm', () => {
  it('okunan kelime ve süreden hızı hesaplar', () => {
    expect(effectiveWpm(500, 60_000)).toBe(500);
    expect(effectiveWpm(0, 0)).toBe(0);
  });
});
