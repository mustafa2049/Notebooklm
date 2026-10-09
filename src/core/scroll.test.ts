import { describe, expect, it } from 'vitest';
import { buildChunks } from './chunker';
import { DEFAULT_CHUNK_OPTIONS } from './types';
import { chunkAt, locateLine, paragraphOfChunk, scrollParagraphs, scrollSpeed } from './scroll';
import { tokenize } from './tokenizer';

const text = 'Bir iki üç dört.\n\nBeş altı yedi.\n\nSekiz dokuz on on bir on iki.';
const chunks = buildChunks(tokenize(text), { ...DEFAULT_CHUNK_OPTIONS, chunkSize: 2 });

describe('scrollParagraphs', () => {
  it('paragrafları chunk aralıkları ve kelime sayılarıyla veriyor', () => {
    const paragraphs = scrollParagraphs(chunks);
    expect(paragraphs.map((p) => p.text)).toEqual(['Bir iki üç dört.', 'Beş altı yedi.', 'Sekiz dokuz on on bir on iki.']);
    expect(paragraphs.map((p) => p.words)).toEqual([4, 3, 7]);
    expect(paragraphs[0].startChunk).toBe(0);
    expect(paragraphs[2].endChunk).toBe(chunks.length);
    // Paragraf sınırını aşan chunk iki paragrafa da dahil: aralıklar boşluksuz
    for (let i = 1; i < paragraphs.length; i++) {
      expect(paragraphs[i].startChunk).toBeLessThanOrEqual(paragraphs[i - 1].endChunk);
      expect(paragraphs[i].startChunk).toBeGreaterThanOrEqual(paragraphs[i - 1].endChunk - 1);
    }
  });

  it('bölünmüş uzun kelimeyi bir kez yazıyor', () => {
    const long = buildChunks(tokenize('Muvaffakiyetsizleştiricileştiriveremeyebileceklerimizden bitti.'), {
      ...DEFAULT_CHUNK_OPTIONS,
      chunkSize: 1,
      splitLongWords: 12,
    });
    const [paragraph] = scrollParagraphs(long);
    expect(paragraph.text).toBe('Muvaffakiyetsizleştiricileştiriveremeyebileceklerimizden bitti.');
    expect(paragraph.words).toBe(2);
  });

  it('chunk → paragraf', () => {
    const paragraphs = scrollParagraphs(chunks);
    expect(paragraphOfChunk(paragraphs, 0)).toBe(0);
    expect(paragraphOfChunk(paragraphs, paragraphs[1].startChunk)).toBe(1);
    expect(paragraphOfChunk(paragraphs, chunks.length - 1)).toBe(2);
  });
});

describe('locateLine', () => {
  it('çizginin hangi paragrafta, ne kadar içeride olduğunu buluyor', () => {
    expect(locateLine([100, 50], 10, 50)).toEqual({ offset: 0, fraction: 0.5 });
    expect(locateLine([100, 50], 10, 135)).toEqual({ offset: 1, fraction: 0.5 });
    expect(locateLine([100, 50], 10, 500)).toEqual({ offset: 1, fraction: 1 });
    expect(locateLine([100, undefined], 10, 120)).toBeNull();
  });
});

describe('scrollSpeed', () => {
  it('aynı kelime/dk için yoğun metin daha yavaş kayıyor', () => {
    const sparse = scrollSpeed(300, [{ height: 300, words: 30 }], 0);
    const dense = scrollSpeed(300, [{ height: 300, words: 60 }], 0);
    expect(sparse).toBeCloseTo((300 / 60000) * 10);
    expect(dense).toBeCloseTo(sparse / 2);
    expect(scrollSpeed(300, [], 0)).toBe(0);
  });

  it('paragraf içindeki oran chunk\'a', () => {
    const [paragraph] = scrollParagraphs(chunks);
    expect(chunkAt(paragraph, 0)).toBe(paragraph.startChunk);
    expect(chunkAt(paragraph, 1)).toBe(paragraph.endChunk - 1);
  });
});
