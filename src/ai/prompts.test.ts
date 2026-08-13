import { describe, expect, it } from 'vitest';
import {
  chatRequest,
  MAX_INPUT_WORDS,
  questionsRequest,
  QUESTION_SCHEMA,
  sectionsRequest,
  summaryRequest,
  takeWords,
  wordRequest,
} from './prompts';

describe('takeWords', () => {
  it('kısa metni olduğu gibi bırakır', () => {
    const result = takeWords('İki kelime', 100);
    expect(result).toEqual({ text: 'İki kelime', truncated: false });
  });

  it('sınırı aşan metni keser ve bunu bildirir', () => {
    const result = takeWords('bir iki üç dört beş', 3);
    expect(result.text).toBe('bir iki üç');
    expect(result.truncated).toBe(true);
  });

  it('varsayılan sınır makul bir üst değerde', () => {
    expect(MAX_INPUT_WORDS).toBeGreaterThan(1000);
  });
});

describe('summaryRequest', () => {
  it('metni istemin içine koyar ve sınır belirtir', () => {
    const request = summaryRequest('Okuma hızı üzerine bir deneme.');
    expect(request.prompt).toContain('Okuma hızı üzerine bir deneme.');
    expect(request.prompt).toContain('150 kelime');
    expect(request.schema).toBeUndefined();
    expect(request.maxTokens).toBeGreaterThan(0);
  });

  it('metin kesildiyse modeli uyarır', () => {
    const long = Array.from({ length: MAX_INPUT_WORDS + 50 }, () => 'kelime').join(' ');
    expect(summaryRequest(long).prompt).toContain('yalnızca başı verildi');
  });

  it('yanıtın metnin dilinde olmasını ister', () => {
    expect(summaryRequest('metin').system).toContain('metnin yazıldığı dilde');
  });
});

describe('questionsRequest', () => {
  it('istenen soru sayısını istemde geçirir', () => {
    expect(questionsRequest('metin', 5).prompt).toContain('5 adet');
  });

  it('şema soru biçimini zorunlu alanlarla tanımlar', () => {
    const request = questionsRequest('metin', 3);
    expect(request.schema?.name).toBe(QUESTION_SCHEMA.name);
    const questions = (request.schema?.schema as any).properties.questions;
    expect(questions.items.required).toEqual(['question', 'options', 'answerIndex', 'evidence']);
  });

  it('şema düşse de model biçimi bilsin diye JSON iskeletini istemde tarif eder', () => {
    // Şemayı yok sayan sağlayıcılarda tek güvence bu satır
    expect(questionsRequest('metin', 3).prompt).toContain('"questions"');
  });

  it('kanıt cümlesinin metinden birebir kopyalanmasını ister', () => {
    expect(questionsRequest('metin', 3).system).toContain('birebir kopyala');
  });
});

describe('wordRequest', () => {
  it('kelimeyi ve cümlesini birlikte gönderir', () => {
    const request = wordRequest('müteşebbis', 'Genç bir müteşebbis olarak işe başladı.');
    expect(request.prompt).toContain('müteşebbis');
    expect(request.prompt).toContain('Genç bir müteşebbis olarak işe başladı.');
  });
});

describe('chatRequest', () => {
  it('bölümleri numaralayarak verir ve atıf ister', () => {
    const request = chatRequest('Yazar ne diyor?', ['Birinci bölüm.', 'İkinci bölüm.'], []);
    expect(request.prompt).toContain('[1]');
    expect(request.prompt).toContain('[2]');
    expect(request.system).toContain('[1]');
  });

  it('geçmişi en son turlarla sınırlar', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: 'user' as const,
      text: `soru ${i}`,
    }));
    const prompt = chatRequest('yeni soru', ['bölüm'], history).prompt;
    expect(prompt).not.toContain('soru 0');
    expect(prompt).toContain('soru 19');
  });

  it('geçmiş yoksa boş bir başlık eklemez', () => {
    expect(chatRequest('soru', ['bölüm'], []).prompt).not.toContain('Önceki konuşma');
  });
});

describe('sectionsRequest', () => {
  it('karakter indeksi değil kelime alıntısı ister', () => {
    const request = sectionsRequest('uzun metin');
    expect(request.system).toContain('firstWords');
    expect(JSON.stringify(request.schema)).not.toContain('charOffset');
  });
});
