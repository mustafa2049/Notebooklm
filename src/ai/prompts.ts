import type { AiRequest } from './types';

/**
 * İstem şablonları — saf fonksiyonlar, ağ yok, testli.
 *
 * Ortak kurallar:
 * - Yanıt dili **metnin dili** (Türkçe metin → Türkçe yanıt).
 * - Model metinde olmayan bilgi eklemeyecek; bilmiyorsa bilmediğini söyleyecek.
 * - Şema gerektiren işlerde JSON dışında hiçbir şey yazılmayacak.
 */

const COMMON_RULES = `Kurallar:
- Yalnızca verilen metne dayan. Metinde olmayan bilgi ekleme, tahmin yürütme.
- Yanıtı metnin yazıldığı dilde ver (metin Türkçeyse Türkçe).
- Metin bir şeyi söylemiyorsa "metinde belirtilmemiş" de.`;

/** Modelin okuyabileceği en uzun parça — sağlayıcı sınırına ve maliyete karşı. */
export const MAX_INPUT_WORDS = 6000;

/** Metni kelime sınırına indirir; kesildiyse bunu bildirir. */
export function takeWords(text: string, maxWords = MAX_INPUT_WORDS): { text: string; truncated: boolean } {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return { text: text.trim(), truncated: false };
  return { text: words.slice(0, maxWords).join(' '), truncated: true };
}

// ---------------------------------------------------------------- özet

export function summaryRequest(text: string): AiRequest {
  const { text: body, truncated } = takeWords(text);
  return {
    system: `Sen bir okuma asistanısın. Uzun metinleri, okuyucunun okumaya başlamadan önce ne
bekleyeceğini bilmesi için özetliyorsun.

${COMMON_RULES}`,
    prompt: `Aşağıdaki metni özetle.

Biçim:
- İlk satır: metnin ne hakkında olduğunu söyleyen tek cümle.
- Sonra en fazla 5 madde: metnin ana savları ya da bölümleri.
- Toplam 150 kelimeyi geçme. Başlık, giriş cümlesi ya da "İşte özet" gibi kalıplar kullanma.
${truncated ? '\nNot: Metnin yalnızca başı verildi; özetin bu bölümü kapsadığını unutma.' : ''}

Metin:
"""
${body}
"""`,
    maxTokens: 2000,
  };
}

// ------------------------------------------------- anlama soruları

export const QUESTION_SCHEMA = {
  name: 'anlama_sorulari',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'answerIndex', 'evidence'],
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            /** `options` içindeki doğru cevabın sırası (0'dan başlar) */
            answerIndex: { type: 'integer' },
            /** Cevabı destekleyen, metinden birebir alınmış cümle */
            evidence: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export function questionsRequest(text: string, count: number): AiRequest {
  const { text: body, truncated } = takeWords(text);
  return {
    system: `Sen okuma-anlama sorusu hazırlayan bir öğretmensin. Sorular kelime hatırlamayı
değil **anlamayı** ölçer: çıkarım, ana fikir, neden-sonuç, karşılaştırma.

${COMMON_RULES}
- Her sorunun cevabı metinden çıkarılabilir olmalı.
- "evidence" alanına cevabı destekleyen cümleyi metinden **birebir kopyala**.
- Şıklardan yalnızca biri doğru olsun; çeldiriciler makul ama metne aykırı olsun.
- Cevabı doğrudan ele veren ifadeler kullanma.`,
    prompt: `Aşağıdaki metinden ${count} adet çoktan seçmeli anlama sorusu hazırla.
Her soruda 4 şık olsun.

Yalnızca şu biçimde JSON döndür, başka hiçbir şey yazma:
{"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"evidence":"..."}]}
${truncated ? '\nNot: Metnin yalnızca başı verildi; soruları bu bölümden çıkar.' : ''}

Metin:
"""
${body}
"""`,
    schema: QUESTION_SCHEMA as unknown as AiRequest['schema'],
    maxTokens: 4000,
  };
}

// ------------------------------------------------ zor kelime açıklaması

export function wordRequest(word: string, sentence: string): AiRequest {
  return {
    system: `Sen bir sözlük asistanısın. Okuyucu okurken takıldığı kelimeyi soruyor;
kısa ve bağlama uygun açıklıyorsun.

${COMMON_RULES}`,
    prompt: `"${word}" kelimesini aşağıdaki cümledeki kullanımına göre açıkla.

Biçim:
- İlk satır: en fazla 15 kelimeyle anlamı.
- İkinci satır: bu cümledeki işlevi ya da yakın anlamlısı.
Başka bir şey yazma.

Cümle: "${sentence}"`,
    maxTokens: 300,
  };
}

// ------------------------------------------------------------ sohbet

export function chatRequest(
  question: string,
  passages: string[],
  history: { role: 'user' | 'assistant'; text: string }[]
): AiRequest {
  const numbered = passages.map((passage, i) => `[${i + 1}]\n${passage}`).join('\n\n');
  const past = history
    .slice(-6)
    .map((turn) => `${turn.role === 'user' ? 'Soru' : 'Yanıt'}: ${turn.text}`)
    .join('\n');

  return {
    system: `Sen bir metin üzerinde soru yanıtlayan okuma asistanısın. Yalnızca sana verilen
bölümlere dayanarak yanıt veriyorsun.

${COMMON_RULES}
- Yanıtını hangi bölüme dayandırdığını [1] gibi numarayla belirt.
- Verilen bölümler soruyu yanıtlamaya yetmiyorsa bunu açıkça söyle; uydurma.
- Kısa yanıtla: en fazla 120 kelime.`,
    prompt: `${past ? `Önceki konuşma:\n${past}\n\n` : ''}Metnin ilgili bölümleri:

${numbered}

Soru: ${question}`,
    maxTokens: 1500,
  };
}

// -------------------------------------------------------- bölümleme

export const SECTIONS_SCHEMA = {
  name: 'bolumler',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['sections'],
    properties: {
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'firstWords'],
          properties: {
            title: { type: 'string' },
            /**
             * Bölümün başladığı yerin ilk 4-6 kelimesi — metinde arayıp
             * karakter konumunu kendimiz buluyoruz. Modelden karakter indeksi
             * istemek güvenilmez; kelime alıntısı aranabilir.
             */
            firstWords: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export function sectionsRequest(text: string): AiRequest {
  const { text: body, truncated } = takeWords(text);
  return {
    system: `Uzun metinleri okurken gezinmeyi kolaylaştırmak için anlamlı bölümlere ayırıyorsun.

${COMMON_RULES}
- Bölüm sayısını metnin uzunluğuna göre seç: yaklaşık her 400-600 kelimede bir bölüm.
- Başlıklar kısa olsun (en fazla 6 kelime) ve o bölümün içeriğini söylesin.
- "firstWords" alanına bölümün başladığı cümlenin ilk 4-6 kelimesini metinden birebir kopyala.`,
    prompt: `Aşağıdaki metni bölümlere ayır ve her bölüme başlık ver.

Yalnızca şu biçimde JSON döndür, başka hiçbir şey yazma:
{"sections":[{"title":"...","firstWords":"..."}]}
${truncated ? '\nNot: Metnin yalnızca başı verildi.' : ''}

Metin:
"""
${body}
"""`,
    schema: SECTIONS_SCHEMA as unknown as AiRequest['schema'],
    maxTokens: 3000,
  };
}
