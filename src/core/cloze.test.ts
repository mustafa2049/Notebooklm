import { describe, expect, it } from 'vitest';
import { buildCloze } from './cloze';
import { tokenize } from './tokenizer';

const SAMPLE = [
  'Hızlı okuma göz hareketlerini azaltarak kavrama hızını yükseltir.',
  'Okuyucular genellikle kelimeleri içlerinden seslendirdikleri için yavaşlarlar.',
  'Düzenli çalışma alışkanlık kazandırır ve anlama oranını korur.',
  'Bilgisayar destekli egzersizler dikkat süresini belirgin biçimde artırır.',
].join(' ');

/** Deterministik test için sabit üreteç. */
function seededRng(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

describe('buildCloze', () => {
  it('boşluk doldurma soruları üretir', () => {
    const questions = buildCloze(tokenize(SAMPLE), { count: 3, rng: seededRng(7) });
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);

    for (const q of questions) {
      expect(q.prompt).toContain('____');
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(4);
      // Cevap sorunun içinde görünmemeli
      expect(q.prompt).not.toContain(q.answer);
    }
  });

  it('aynı kelimeyi iki kez sormaz', () => {
    const questions = buildCloze(tokenize(SAMPLE), { count: 4, rng: seededRng(3) });
    const answers = questions.map((q) => q.answer.toLowerCase());
    expect(new Set(answers).size).toBe(answers.length);
  });

  it('çok kısa metinde soru üretmeye zorlamaz', () => {
    expect(buildCloze(tokenize('Kısa metin.'), { rng: seededRng(1) })).toEqual([]);
    expect(buildCloze([], { rng: seededRng(1) })).toEqual([]);
  });

  it('yalnızca okunan aralıktan soru üretir', () => {
    const tokens = tokenize(SAMPLE);
    const firstSentenceLength = tokens.filter((t) => t.sentenceIndex === 0).length;
    const questions = buildCloze(tokens, {
      count: 5,
      from: 0,
      to: firstSentenceLength,
      rng: seededRng(11),
    });
    for (const q of questions) {
      expect(SAMPLE.slice(0, 70)).toContain(q.answer);
    }
  });
});
