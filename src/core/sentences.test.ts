import { describe, expect, it } from 'vitest';
import { buildChunks } from './chunker';
import { tokenize } from './tokenizer';
import { DEFAULT_CHUNK_OPTIONS } from './types';
import { sentenceSpans, spanIndexForChunk, ttsRate } from './sentences';

const text = 'Birinci cümle kısa. İkinci cümle biraz daha uzun olsun. Üçüncü!';

describe('sentenceSpans', () => {
  const chunks = buildChunks(tokenize(text), { ...DEFAULT_CHUNK_OPTIONS, chunkSize: 1 });
  const spans = sentenceSpans(chunks);

  it('her cümle için bir aralık verir', () => {
    expect(spans).toHaveLength(3);
    expect(text.slice(spans[0].charStart, spans[0].charEnd)).toBe('Birinci cümle kısa.');
    expect(text.slice(spans[2].charStart, spans[2].charEnd)).toBe('Üçüncü!');
  });

  it('kelimeleri sayar', () => {
    expect(spans.map((span) => span.words)).toEqual([3, 6, 1]);
  });

  it('chunk’ın cümlesini bulur', () => {
    expect(spanIndexForChunk(spans, 0)).toBe(0);
    expect(spanIndexForChunk(spans, spans[1].startChunk + 2)).toBe(1);
    expect(spanIndexForChunk(spans, chunks.length - 1)).toBe(2);
  });
});

describe('ttsRate', () => {
  it('okuma hızını konuşma hızına çevirir ve sınırlar', () => {
    expect(ttsRate(180)).toBe(1);
    expect(ttsRate(360)).toBe(2);
    expect(ttsRate(1000)).toBe(2);
    expect(ttsRate(50)).toBe(0.5);
  });
});
