import { describe, expect, it } from 'vitest';
import { buildChunks } from './chunker';
import { buildPages, pageIndexFor, pageWordCount } from './pages';
import { tokenize } from './tokenizer';
import { DEFAULT_CHUNK_OPTIONS } from './types';

/**
 * Test metni gerçek Türkçe gibi büyük harfle başlayan cümlelerden oluşmalı:
 * tokenizer, nokta sonrası küçük harf gördüğünde cümleyi bitmemiş sayıyor.
 */
function sentences(count: number, wordsEach = 8): string {
  return Array.from({ length: count }, (_unused, i) =>
    `Kelime ${Array.from({ length: wordsEach - 1 }, () => 'kelime').join(' ')} nokta${i}.`
  ).join(' ');
}

describe('buildPages', () => {
  it('hiçbir sayfa kapasiteyi aşmaz', () => {
    const chunks = buildChunks(tokenize(sentences(20)), DEFAULT_CHUNK_OPTIONS);
    for (const capacity of [10, 24, 40, 75]) {
      for (const page of buildPages(chunks, capacity)) {
        expect(pageWordCount(chunks, page)).toBeLessThanOrEqual(capacity);
      }
    }
  });

  it('kapasite yeterken sayfayı cümle sınırında kapatır', () => {
    const chunks = buildChunks(tokenize(sentences(10)), DEFAULT_CHUNK_OPTIONS);
    const pages = buildPages(chunks, 20);

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages.slice(0, -1)) {
      expect(chunks[page.end - 1].sentenceEnd).toBe(true);
    }
  });

  it('bütün chunkları tam olarak bir kez kapsar', () => {
    const chunks = buildChunks(tokenize(sentences(12)), DEFAULT_CHUNK_OPTIONS);
    const pages = buildPages(chunks, 25);

    expect(pages[0].start).toBe(0);
    expect(pages[pages.length - 1].end).toBe(chunks.length);
    for (let i = 1; i < pages.length; i++) {
      expect(pages[i].start).toBe(pages[i - 1].end);
    }
  });

  it('cümle sonu hiç yoksa da kapasiteyi aşmaz', () => {
    const chunks = buildChunks(tokenize('kelime '.repeat(300).trim()), DEFAULT_CHUNK_OPTIONS);
    for (const page of buildPages(chunks, 20)) {
      expect(page.end - page.start).toBeLessThanOrEqual(20);
    }
  });

  it('çok kelimeli chunklarda da kapasiteyi aşmaz', () => {
    const chunks = buildChunks(tokenize(sentences(20)), { ...DEFAULT_CHUNK_OPTIONS, chunkSize: 4 });
    for (const page of buildPages(chunks, 18)) {
      expect(pageWordCount(chunks, page)).toBeLessThanOrEqual(18);
    }
  });

  it('paragraf sonunda sayfayı kapatır', () => {
    const text = `${sentences(3)}\n\n${sentences(3)}`;
    const chunks = buildChunks(tokenize(text), DEFAULT_CHUNK_OPTIONS);
    const pages = buildPages(chunks, 40);
    // İlk paragraf 24 kelime: kapasitenin yarısını geçtiği için kendi sayfası olur
    expect(chunks[pages[0].end - 1].paragraphEnd).toBe(true);
  });

  it('boş metinde sayfa üretmez', () => {
    expect(buildPages([], 20)).toEqual([]);
  });

  it('chunk indeksinden sayfayı bulur', () => {
    const chunks = buildChunks(tokenize(sentences(10)), DEFAULT_CHUNK_OPTIONS);
    const pages = buildPages(chunks, 20);

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const { start, end } = pages[pageIndex];
      expect(pageIndexFor(pages, start)).toBe(pageIndex);
      expect(pageIndexFor(pages, end - 1)).toBe(pageIndex);
    }
  });
});
