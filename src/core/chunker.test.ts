import { describe, expect, it } from 'vitest';
import { buildChunks, countWords } from './chunker';
import { chunkPivot, pivotIndex } from './orp';
import {
  indexFromCharOffset,
  nextSentenceIndex,
  previousSentenceIndex,
  progressRatio,
  wordsUpTo,
} from './progress';
import { tokenize } from './tokenizer';
import { DEFAULT_CHUNK_OPTIONS, type ChunkOptions } from './types';

const opts = (overrides: Partial<ChunkOptions> = {}): ChunkOptions => ({
  ...DEFAULT_CHUNK_OPTIONS,
  ...overrides,
});

describe('buildChunks', () => {
  it('chunkSize 1 ile her kelime bir kare olur', () => {
    const chunks = buildChunks(tokenize('bir iki üç dört'), opts());
    expect(chunks.map((c) => c.text)).toEqual(['bir', 'iki', 'üç', 'dört']);
  });

  it('chunkSize 3 ile kelimeleri gruplar', () => {
    const chunks = buildChunks(tokenize('bir iki üç dört beş altı'), opts({ chunkSize: 3 }));
    expect(chunks.map((c) => c.text)).toEqual(['bir iki üç', 'dört beş altı']);
  });

  it('cümle sınırını bir chunk içinde bırakmaz', () => {
    const chunks = buildChunks(tokenize('bir iki. Üç dört beş'), opts({ chunkSize: 3 }));
    expect(chunks.map((c) => c.text)).toEqual(['bir iki.', 'Üç dört beş']);
  });

  it('nokta sonrası küçük harf geliyorsa cümle bitmemiş sayılır (chunk bölünmez)', () => {
    // "vb." benzeri bilinmeyen kısaltmalarda gruplama bozulmamalı
    const chunks = buildChunks(tokenize('bir iki. üç dört beş altı'), opts({ chunkSize: 3 }));
    expect(chunks.map((c) => c.text)).toEqual(['bir iki. üç', 'dört beş altı']);
  });

  it('karakter sınırını aşmaz', () => {
    const chunks = buildChunks(
      tokenize('kelimeler oldukça uzunlaşabilir bazen çok'),
      opts({ chunkSize: 4, maxChars: 20 })
    );
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(20);
  });

  it('uzun kelimeyi hece sınırından birden çok kareye böler', () => {
    const chunks = buildChunks(tokenize('gözlemleyebileceğimizi'), opts({ splitLongWords: 14 }));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.text).join('')).toBe('gözlemleyebileceğimizi');
    expect(chunks[0].partOf).toEqual({ index: 0, total: chunks.length });
    // Cümle sonu yalnızca son parçada işaretlenir
    expect(chunks[0].sentenceEnd).toBe(false);
    expect(chunks[chunks.length - 1].sentenceEnd).toBe(true);
  });

  it('bölünmüş kelimeyi kelime sayımında bir kez sayar', () => {
    const chunks = buildChunks(tokenize('gözlemleyebileceğimizi kitap'), opts());
    expect(countWords(chunks)).toBe(2);
  });

  it('bölme kapalıyken uzun kelimeyi bölmez', () => {
    const chunks = buildChunks(tokenize('gözlemleyebileceğimizi'), opts({ splitLongWords: 0 }));
    expect(chunks).toHaveLength(1);
  });

  it('chunk offsetleri kaynak metne denk gelir', () => {
    const source = 'Hızlı okuma alışkanlık ister.';
    const chunks = buildChunks(tokenize(source), opts({ chunkSize: 2 }));
    for (const chunk of chunks) {
      expect(source.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });
});

describe('ORP pivot', () => {
  it('kelime uzunluğuna göre başa yakın bir harf seçer', () => {
    expect(pivotIndex('a')).toBe(0);
    expect(pivotIndex('okumak')).toBeLessThanOrEqual(2);
    expect(pivotIndex('kitaplarımızdan')).toBeLessThanOrEqual(4);
  });

  it('pivot her zaman kelimenin içinde kalır', () => {
    for (const word of ['a', 've', 'test', 'bilgisayarlaşma', 'ıı']) {
      const idx = pivotIndex(word);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(word.length);
    }
  });

  it('mümkün olduğunda sesli harfe oturur', () => {
    expect('aeıioöuü').toContain('okumak'[pivotIndex('okumak')]);
    expect('aeıioöuü').toContain('kitap'[pivotIndex('kitap')]);
  });

  it('çok kelimeli chunk\'ta ortadaki kelimeyi hedefler', () => {
    const text = 'bir iki üç';
    const pivot = chunkPivot(text);
    expect(pivot).toBeGreaterThanOrEqual(4);
    expect(pivot).toBeLessThan(7);
  });

  it('baştaki tırnak pivotu kaydırmaz', () => {
    expect(chunkPivot('"okumak')).toBe(1 + pivotIndex('okumak'));
  });
});

describe('progress', () => {
  const source = 'Bir iki üç. Dört beş altı. Yedi sekiz dokuz.';
  const chunks = buildChunks(tokenize(source), opts());

  it('ilerleme oranı sonda 1 olur', () => {
    expect(progressRatio(chunks, 0)).toBeGreaterThan(0);
    expect(progressRatio(chunks, chunks.length - 1)).toBe(1);
  });

  it('karakter offsetinden chunk bulur (mod değişince devam edebilmek için)', () => {
    const target = chunks[4];
    expect(indexFromCharOffset(chunks, target.charStart)).toBe(4);
  });

  it('sonraki cümleye atlar', () => {
    expect(chunks[nextSentenceIndex(chunks, 0)].text).toBe('Dört');
  });

  it('önceki cümle: cümlenin ortasındayken başa döner', () => {
    const middleOfSecond = 4; // "beş"
    expect(chunks[previousSentenceIndex(chunks, middleOfSecond)].text).toBe('Dört');
  });

  it('önceki cümle: cümlenin başındayken bir önceki cümleye gider', () => {
    const startOfSecond = 3; // "Dört"
    expect(chunks[previousSentenceIndex(chunks, startOfSecond)].text).toBe('Bir');
  });

  it('okunan kelime sayısını sayar', () => {
    expect(wordsUpTo(chunks, 0)).toBe(0);
    expect(wordsUpTo(chunks, 3)).toBe(3);
    expect(wordsUpTo(chunks, chunks.length)).toBe(9);
  });
});
