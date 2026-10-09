import { describe, expect, it } from 'vitest';
import {
  askAboutText,
  evaluateRecall,
  generateQuestions,
  generateSections,
  generateSummary,
  locateFirstWords,
  transcribeImage,
} from './tasks';
import { AiError, type AiProvider, type AiRequest } from './types';

/** Sağlayıcı taklidi: ağ yok, sabit yanıt döndürür ve isteği kaydeder. */
function fakeProvider(reply: { text: string; json?: unknown }): AiProvider & { seen: AiRequest[] } {
  const seen: AiRequest[] = [];
  return {
    kind: 'anthropic',
    model: 'test-model',
    seen,
    async complete(request) {
      seen.push(request);
      return {
        text: reply.text,
        json: reply.json,
        usage: { inputTokens: 100, outputTokens: 20 },
        model: 'test-model',
      };
    },
  };
}

describe('generateSummary', () => {
  it('metni ve kullanımı geri verir', async () => {
    const provider = fakeProvider({ text: 'Kısa özet.' });
    const result = await generateSummary(provider, 'Uzun metin.');
    expect(result.value).toBe('Kısa özet.');
    expect(result.usage.inputTokens).toBe(100);
    expect(result.model).toBe('test-model');
  });
});

describe('transcribeImage', () => {
  const image = { mediaType: 'image/jpeg', base64: 'QUJD' };

  it('görseli istekle gönderip metni döndürüyor; kod bloğu kalıntısını temizliyor', async () => {
    const provider = fakeProvider({ text: '```\nBirinci paragraf.\n\nİkinci paragraf.\n```' });
    const result = await transcribeImage(provider, image);
    expect(result.value).toBe('Birinci paragraf.\n\nİkinci paragraf.');
    expect(provider.seen[0].images).toEqual([image]);
  });

  it('metin yoksa anlaşılır hata veriyor', async () => {
    await expect(transcribeImage(fakeProvider({ text: 'METİN YOK' }), image)).rejects.toThrow(AiError);
    await expect(transcribeImage(fakeProvider({ text: '"Metin yok."' }), image)).rejects.toThrow(/okunabilir metin/);
  });

  it('"Metin yok" diye başlayan gerçek bir sayfayı reddetmiyor', async () => {
    const result = await transcribeImage(fakeProvider({ text: 'Metin yoktu ama söz vardı.' }), image);
    expect(result.value).toBe('Metin yoktu ama söz vardı.');
  });
});

describe('generateQuestions', () => {
  const question = {
    question: 'Soru?',
    options: ['a', 'b', 'c', 'd'],
    answerIndex: 1,
    evidence: 'kanıt',
  };

  it('doğrulanmış soruları döndürür', async () => {
    const provider = fakeProvider({ text: '', json: { questions: [question, question] } });
    const result = await generateQuestions(provider, 'metin', 2);
    expect(result.value).toHaveLength(2);
  });

  it('istenenden fazla soru gelirse fazlasını kırpar', async () => {
    const provider = fakeProvider({
      text: '',
      json: { questions: [question, question, question, question] },
    });
    const result = await generateQuestions(provider, 'metin', 2);
    expect(result.value).toHaveLength(2);
  });

  it('biçim bozuksa hata yükseltir', async () => {
    const provider = fakeProvider({ text: '', json: { questions: [{ question: 'yalnız' }] } });
    await expect(generateQuestions(provider, 'metin', 2)).rejects.toThrow(AiError);
  });
});

describe('locateFirstWords', () => {
  const text = 'Birinci paragraf burada.\n\nİkinci  bölüm  bu\nsatırda başlıyor. Devamı var.';

  it('alıntının özgün metindeki konumunu bulur', () => {
    const at = locateFirstWords(text, 'İkinci bölüm bu satırda');
    expect(at).toBe(text.indexOf('İkinci'));
  });

  it('boşluk ve satır sonu farklarını yok sayar', () => {
    const at = locateFirstWords(text, 'ikinci   bölüm\n bu');
    expect(at).toBe(text.indexOf('İkinci'));
  });

  it('Türkçe büyük harf İ/I farkına takılmaz', () => {
    expect(locateFirstWords('İSTANBUL büyük şehir.', 'istanbul büyük')).toBe(0);
  });

  it('alıntının sonu uydurulmuşsa kısaltarak yine bulur', () => {
    // Model son kelimeyi değiştirdi; kısaltılmış alıntı hâlâ eşleşiyor
    const at = locateFirstWords(text, 'Birinci paragraf burada yazıyor');
    expect(at).toBe(0);
  });

  it('tek kelimelik alıntıya güvenmez', () => {
    expect(locateFirstWords(text, 'Devamı')).toBeNull();
  });

  it('verilen konumdan önce arama yapmaz', () => {
    const second = text.indexOf('İkinci');
    expect(locateFirstWords(text, 'Birinci paragraf', second)).toBeNull();
  });
});

describe('generateSections', () => {
  const text = 'Giriş cümlesi burada.\n\nİkinci konu başlıyor şimdi.\n\nÜçüncü konu geliyor.';

  it('alıntıları karakter konumuna çevirir ve ilk bölümü başa çeker', async () => {
    const provider = fakeProvider({
      text: '',
      json: {
        sections: [
          { title: 'Giriş', firstWords: 'Giriş cümlesi' },
          { title: 'İkinci', firstWords: 'İkinci konu başlıyor' },
        ],
      },
    });

    const result = await generateSections(provider, text);

    expect(result.value[0]).toEqual({ title: 'Giriş', charOffset: 0 });
    expect(result.value[1].charOffset).toBe(text.indexOf('İkinci'));
  });

  it('metinde bulunmayan bölümü atar', async () => {
    const provider = fakeProvider({
      text: '',
      json: {
        sections: [
          { title: 'Giriş', firstWords: 'Giriş cümlesi' },
          { title: 'Uydurma', firstWords: 'metinde olmayan bir cümle' },
        ],
      },
    });

    const result = await generateSections(provider, text);
    expect(result.value).toHaveLength(1);
  });

  it('bölümler artan sırada kalır', async () => {
    const provider = fakeProvider({
      text: '',
      json: {
        sections: [
          { title: 'Bir', firstWords: 'Giriş cümlesi' },
          { title: 'İki', firstWords: 'İkinci konu' },
          { title: 'Üç', firstWords: 'Üçüncü konu' },
        ],
      },
    });

    const offsets = (await generateSections(provider, text)).value.map((s) => s.charOffset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('hiçbir bölüm bulunamazsa hata verir', async () => {
    const provider = fakeProvider({
      text: '',
      json: { sections: [{ title: 'Yok', firstWords: 'bambaşka bir cümle' }] },
    });
    await expect(generateSections(provider, text)).rejects.toThrow(AiError);
  });
});

describe('askAboutText', () => {
  const long = [
    'Hızlı okumanın temeli göz hareketlerini azaltmaktır. '.repeat(20),
    'Kahve demleme yöntemleri arasında en yaygını filtre kahvedir. '.repeat(20),
    'İç ses okuma hızını düşüren en önemli etkendir. '.repeat(20),
  ].join('\n\n');

  it('yalnızca seçilen bölümleri gönderir ve sayısını bildirir', async () => {
    const provider = fakeProvider({ text: 'Yanıt [1].' });
    const result = await askAboutText(provider, {
      text: long,
      question: 'İç ses neden önemli?',
      history: [],
      passageCount: 1,
    });

    expect(result.value.passagesSent).toBe(1);
    expect(provider.seen[0].prompt).toContain('İç ses');
    expect(provider.seen[0].prompt).not.toContain('Kahve demleme');
  });

  it('okunan bölüm her zaman gönderilir', async () => {
    const provider = fakeProvider({ text: 'Yanıt.' });
    await askAboutText(provider, {
      text: long,
      question: 'Bu ne demek?',
      history: [],
      charOffset: long.indexOf('Kahve demleme'),
      passageCount: 1,
    });

    expect(provider.seen[0].prompt).toContain('Kahve demleme');
  });
});

describe('evaluateRecall', () => {
  const text = 'Giriş cümlesi burada. Arılar dans ederek yön bildirir. Son cümle burada.';

  it('yalnızca okunan aralığı gönderir ve yanıtı doğrular', async () => {
    const provider = fakeProvider({
      text: '',
      json: { caught: ['Arıların dansla iletişimi'], missed: [], feedback: 'Ana fikri yakaladın.' },
    });
    const from = text.indexOf('Arılar');
    const to = text.indexOf('Son');
    const result = await evaluateRecall(provider, { text, fromChar: from, toChar: to, summary: 'Arılar dansla anlaşır.' });
    expect(result.value.caught).toEqual(['Arıların dansla iletişimi']);
    const prompt = provider.seen[0].prompt;
    expect(prompt).toContain('Arılar dans ederek');
    expect(prompt).not.toContain('Giriş cümlesi');
    expect(prompt).not.toContain('Son cümle');
    expect(prompt).toContain('Arılar dansla anlaşır.');
  });

  it('boş özetle modele gitmez', async () => {
    const provider = fakeProvider({ text: '' });
    await expect(
      evaluateRecall(provider, { text, fromChar: 0, toChar: text.length, summary: '  ' })
    ).rejects.toBeInstanceOf(AiError);
    expect(provider.seen).toHaveLength(0);
  });

  it('bozuk yanıtı reddeder', async () => {
    const provider = fakeProvider({ text: '', json: { caught: 'yanlış' } });
    await expect(
      evaluateRecall(provider, { text, fromChar: 0, toChar: text.length, summary: 'özet' })
    ).rejects.toBeInstanceOf(AiError);
  });
});
