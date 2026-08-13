import { trLower } from '@/core/turkish';
import {
  chatRequest,
  questionsRequest,
  sectionsRequest,
  summaryRequest,
  wordRequest,
} from './prompts';
import { pickPassages, splitPassages } from './retrieve';
import { AiError, type AiProvider, type TokenUsage } from './types';
import { parseQuestions, parseSections, type AiQuestion } from './validate';

/**
 * Uygulama seviyesindeki AI işleri.
 *
 * Her fonksiyon bir `AiProvider` alıyor — hangi sağlayıcı olduğunu bilmiyor.
 * Şema gerektiren işlerde yanıt `validate.ts` ile çalışma anında doğrulanıyor;
 * arayüz asla doğrulanmamış JSON'a dokunmuyor.
 */

export interface AiResult<T> {
  value: T;
  usage: TokenUsage;
  /** Yanıtı gerçekte üreten model — maliyet kaydında görünür */
  model: string;
}

export async function generateSummary(
  provider: AiProvider,
  text: string,
  signal?: AbortSignal
): Promise<AiResult<string>> {
  const response = await provider.complete(summaryRequest(text), signal);
  return { value: response.text, usage: response.usage, model: response.model };
}

export async function generateQuestions(
  provider: AiProvider,
  text: string,
  count: number,
  signal?: AbortSignal
): Promise<AiResult<AiQuestion[]>> {
  const response = await provider.complete(questionsRequest(text, count), signal);
  return {
    value: parseQuestions(response.json).slice(0, count),
    usage: response.usage,
    model: response.model,
  };
}

export async function explainWord(
  provider: AiProvider,
  word: string,
  sentence: string,
  signal?: AbortSignal
): Promise<AiResult<string>> {
  const response = await provider.complete(wordRequest(word, sentence), signal);
  return { value: response.text, usage: response.usage, model: response.model };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatAnswer {
  text: string;
  /** Modele gönderilen bölüm sayısı — arayüzde gösterilir, maliyet şeffaf olsun */
  passagesSent: number;
}

export async function askAboutText(
  provider: AiProvider,
  input: {
    text: string;
    question: string;
    history: ChatTurn[];
    /** Kullanıcının okuduğu yer; o bölüm mutlaka gönderilir */
    charOffset?: number;
    passageCount?: number;
  },
  signal?: AbortSignal
): Promise<AiResult<ChatAnswer>> {
  const passages = splitPassages(input.text);
  const picked = pickPassages(passages, input.question, {
    count: input.passageCount ?? 3,
    charOffset: input.charOffset,
  });

  const response = await provider.complete(
    chatRequest(
      input.question,
      picked.map((p) => p.text),
      input.history
    ),
    signal
  );

  return {
    value: { text: response.text, passagesSent: picked.length },
    usage: response.usage,
    model: response.model,
  };
}

export interface Section {
  title: string;
  /** Bölümün metindeki başlangıç karakter konumu */
  charOffset: number;
}

export async function generateSections(
  provider: AiProvider,
  text: string,
  signal?: AbortSignal
): Promise<AiResult<Section[]>> {
  const response = await provider.complete(sectionsRequest(text), signal);
  const marks = parseSections(response.json);

  // Modelin alıntıladığı ilk kelimeleri metinde arayıp konumu kendimiz buluyoruz
  const sections: Section[] = [];
  let cursor = 0;
  for (const mark of marks) {
    const found = locateFirstWords(text, mark.firstWords, cursor);
    if (found === null) continue;
    sections.push({ title: mark.title, charOffset: found });
    cursor = found + 1;
  }

  if (!sections.length) {
    throw new AiError(
      'Bölüm başlangıçları metinde bulunamadı. Yeniden deneyebilirsin.',
      { retryable: true }
    );
  }

  // İlk bölüm metnin başından başlasın: kullanıcı baştaki kısmı kaybetmesin
  if (sections[0].charOffset > 0) sections[0] = { ...sections[0], charOffset: 0 };
  return { value: sections, usage: response.usage, model: response.model };
}

interface Normalized {
  text: string;
  /** Normalleştirilmiş metnin her karakterinin özgün metindeki konumu */
  offsets: number[];
}

/**
 * Metni aramaya uygun hâle getirir: boşluk dizileri tek boşluğa iner, harfler
 * Türkçe kurallarına göre küçültülür. Konum eşlemesi tutulur ki bulunan yerin
 * **özgün** metindeki karakter indeksini döndürebilelim.
 */
function normalizeForSearch(source: string): Normalized {
  let text = '';
  const offsets: number[] = [];
  let inSpace = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      if (!inSpace && text) {
        text += ' ';
        offsets.push(i);
        inSpace = true;
      }
      continue;
    }
    inSpace = false;
    const lowered = trLower(ch);
    // Bazı karakterler küçültüldüğünde uzunluk değiştirebilir; eşlemeyi
    // bozmamak için tek karaktere indiriyoruz.
    text += lowered.length === 1 ? lowered : lowered[0];
    offsets.push(i);
  }

  return { text, offsets };
}

/**
 * Modelin verdiği ilk kelimeleri metinde arar ve karakter konumunu döndürür.
 *
 * Modeller alıntıyı birebir kopyalamayabiliyor (noktalama değişir, son kelime
 * eksilir). Bu yüzden tam alıntıdan başlayıp kelime kelime kısaltarak arıyoruz;
 * en az iki kelime kalınca vazgeçiyoruz — tek kelime metinde her yerde geçebilir
 * ve yanlış konum vermek, bölümü hiç göstermemekten kötü.
 */
export function locateFirstWords(text: string, firstWords: string, from = 0): number | null {
  const haystack = normalizeForSearch(text);
  const words = normalizeForSearch(firstWords).text.split(' ').filter(Boolean);
  if (words.length < 2) return null;

  // `from` özgün metinde; normalleştirilmiş metindeki karşılığını bul
  let searchStart = 0;
  while (searchStart < haystack.offsets.length && haystack.offsets[searchStart] < from) {
    searchStart += 1;
  }

  for (let length = words.length; length >= 2; length--) {
    const needle = words.slice(0, length).join(' ');
    const at = haystack.text.indexOf(needle, searchStart);
    if (at !== -1) return haystack.offsets[at];
  }
  return null;
}
