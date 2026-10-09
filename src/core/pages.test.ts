import { describe, expect, it } from 'vitest';
import { buildChunks } from './chunker';
import {
  buildFlowPages,
  buildPages,
  charsPerLineFromSample,
  SAMPLE_PARAGRAPH,
  pageIndexFor,
  pageParagraphs,
  pageWordCount,
} from './pages';
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

describe('buildFlowPages', () => {
  const phone = { width: 312, height: 600, fontSize: 19, lineHeight: 19 * 1.7, charEm: 0.5, paragraphGap: 14 };
  const long = Array.from({ length: 40 }, (_u, i) => `${sentences(3, 9)} Son${i}.`).join('\n\n');
  const chunks = buildChunks(tokenize(long), DEFAULT_CHUNK_OPTIONS);

  it('metnin tamamını boşluksuz ve sırayla kapsar', () => {
    const pages = buildFlowPages(chunks, phone);
    expect(pages[0].start).toBe(0);
    expect(pages[pages.length - 1].end).toBe(chunks.length);
    for (let i = 1; i < pages.length; i++) expect(pages[i].start).toBe(pages[i - 1].end);
  });

  it('büyük yazı, geniş satır aralığı ve küçük pay daha çok sayfa demek', () => {
    const base = buildFlowPages(chunks, phone).length;
    expect(buildFlowPages(chunks, { ...phone, fontSize: 38, lineHeight: 38 * 1.7 }).length).toBeGreaterThan(base);
    expect(buildFlowPages(chunks, { ...phone, lineHeight: 19 * 2.2 }).length).toBeGreaterThan(base);
    expect(buildFlowPages(chunks, phone, 0.8).length).toBeGreaterThan(base);
  });

  it('kısa paragraflar (başlıklar) sayfada yer kaplar', () => {
    const words = 'kelime '.repeat(30).trim();
    const dense = buildChunks(tokenize(`${words}.`), DEFAULT_CHUNK_OPTIONS);
    const titled = buildChunks(
      tokenize(Array.from({ length: 6 }, () => `Başlık.\n\n${'kelime '.repeat(5).trim()}.`).join('\n\n')),
      DEFAULT_CHUNK_OPTIONS
    );
    const small = { ...phone, height: 300 };
    expect(buildFlowPages(titled, small).length).toBeGreaterThan(buildFlowPages(dense, small).length);
  });

  it('ölçülmüş satır kapasitesi tahminin yerine geçer', () => {
    const measuredWide = buildFlowPages(chunks, { ...phone, charsPerLine: 60 }).length;
    const measuredNarrow = buildFlowPages(chunks, { ...phone, charsPerLine: 20 }).length;
    expect(measuredNarrow).toBeGreaterThan(measuredWide);
  });

  it('örnek paragrafın yüksekliğinden satır kapasitesi', () => {
    expect(charsPerLineFromSample(0, 30)).toBeUndefined();
    // 10 satır tuttuysa satır başına karakter = uzunluk / 10
    expect(charsPerLineFromSample(300, 30)).toBeCloseTo(SAMPLE_PARAGRAPH.length / 10);
    // Yuvarlama: ölçüm küsuratı satır sayısını bozmaz
    expect(charsPerLineFromSample(301.4, 30)).toBeCloseTo(SAMPLE_PARAGRAPH.length / 10);
  });

  it('ölçü yokken tek sayfa', () => {
    expect(buildFlowPages(chunks, { ...phone, width: 0 })).toEqual([{ start: 0, end: chunks.length }]);
  });
});

describe('pageParagraphs', () => {
  const text = 'Birinci cümle burada. İkinci cümle de var.\n\nYeni paragraf başlıyor. Muvaffakiyetsizleştiricileştiriveremeyebileceklerimizdenmişsinizcesine bitti.';

  it('paragrafları ve cümleleri ayırır', () => {
    const chunks = buildChunks(tokenize(text), { ...DEFAULT_CHUNK_OPTIONS, chunkSize: 1 });
    const paragraphs = pageParagraphs(chunks, { start: 0, end: chunks.length });
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].sentences.map((s) => s.text)).toEqual(['Birinci cümle burada.', 'İkinci cümle de var.']);
    expect(text.slice(paragraphs[0].sentences[1].charStart).startsWith('İkinci')).toBe(true);
    expect(paragraphs[1].sentences[0].words).toEqual(['Yeni', 'paragraf', 'başlıyor']);
  });

  it('cümleyi chunk parçalarına ayırır; parçalar birleşince metin', () => {
    const chunks = buildChunks(tokenize(text), { ...DEFAULT_CHUNK_OPTIONS, chunkSize: 2 });
    const sentence = pageParagraphs(chunks, { start: 0, end: chunks.length })[0].sentences[1];
    expect(sentence.parts.map((part) => part.text).join(' ')).toBe(sentence.text);
    for (const part of sentence.parts) {
      expect(chunks[part.chunkIndex].text).toBe(part.text);
    }
  });

  it('bölünmüş uzun kelimeyi bir kez ve bütün olarak yazar', () => {
    const chunks = buildChunks(tokenize(text), { ...DEFAULT_CHUNK_OPTIONS, chunkSize: 1, splitLongWords: 14 });
    expect(chunks.some((chunk) => chunk.partOf)).toBe(true);
    const last = pageParagraphs(chunks, { start: 0, end: chunks.length })[1].sentences[1];
    expect(last.text).toBe('Muvaffakiyetsizleştiricileştiriveremeyebileceklerimizdenmişsinizcesine bitti.');
  });
});
