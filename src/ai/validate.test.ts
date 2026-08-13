import { describe, expect, it } from 'vitest';
import { AiError } from './types';
import { parseQuestions, parseSections } from './validate';

const validQuestion = {
  question: 'Yazar hızlı okumanın en büyük engeli olarak neyi gösteriyor?',
  options: ['İç sesi', 'Işığı', 'Kelime sayısını', 'Yazı tipini'],
  answerIndex: 0,
  evidence: 'En büyük engel, okurken kelimeleri içinden seslendirmektir.',
};

describe('parseQuestions', () => {
  it('geçerli soruyu olduğu gibi geçirir', () => {
    const questions = parseQuestions({ questions: [validQuestion] });
    expect(questions).toHaveLength(1);
    expect(questions[0].answerIndex).toBe(0);
  });

  it('questions alanı yoksa hata verir', () => {
    expect(() => parseQuestions({ sorular: [] })).toThrow(AiError);
  });

  it('sınır dışı answerIndex olan soruyu atar', () => {
    // Bazı modeller indeksi 1'den başlatıyor — düzeltmek yerine atıyoruz
    expect(() =>
      parseQuestions({ questions: [{ ...validQuestion, answerIndex: 4 }] })
    ).toThrow(AiError);
  });

  it('bozuk soruyu atıp sağlam olanı tutar', () => {
    const questions = parseQuestions({
      questions: [{ ...validQuestion, options: ['tek şık'] }, validQuestion],
    });
    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe(validQuestion.question);
  });

  it('boş şık içeren soruyu atar', () => {
    expect(() =>
      parseQuestions({ questions: [{ ...validQuestion, options: ['a', '', 'c', 'd'] }] })
    ).toThrow(AiError);
  });

  it('kanıt cümlesi yoksa soruyu yine kabul eder ama alanı boşaltır', () => {
    const questions = parseQuestions({ questions: [{ ...validQuestion, evidence: '' }] });
    expect(questions[0].evidence).toBe('');
  });

  it('hiç geçerli soru kalmazsa yeniden denenebilir hata verir', () => {
    try {
      parseQuestions({ questions: [{ question: 'yalnız soru' }] });
      throw new Error('hata beklendi');
    } catch (caught) {
      expect(caught).toBeInstanceOf(AiError);
      expect((caught as AiError).retryable).toBe(true);
    }
  });
});

describe('parseSections', () => {
  it('başlık ve alıntıyı kırpar', () => {
    const sections = parseSections({
      sections: [{ title: '  Giriş  ', firstWords: ' Okuma hızı üzerine ' }],
    });
    expect(sections).toEqual([{ title: 'Giriş', firstWords: 'Okuma hızı üzerine' }]);
  });

  it('eksik alanlı bölümü atar', () => {
    const sections = parseSections({
      sections: [{ title: 'Başlıksız' }, { title: 'Tam', firstWords: 'ilk kelimeler burada' }],
    });
    expect(sections).toHaveLength(1);
  });

  it('dizi değilse hata verir', () => {
    expect(() => parseSections({ sections: 'metin' })).toThrow(AiError);
  });
});
