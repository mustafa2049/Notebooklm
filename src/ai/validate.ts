import { AiError } from './types';

/**
 * Modelin döndürdüğü JSON'un çalışma anında doğrulanması.
 *
 * Şema göndermek yeterli değil: yapılandırılmış çıktıyı desteklemeyen bir
 * sağlayıcı (özellikle yerel modeller) şemayı yok sayıp serbest JSON
 * döndürebilir. Arayüz `questions[0].options[2]` gibi alanlara dokunmadan önce
 * biçimin gerçekten beklediğimiz gibi olduğunu burada garanti ediyoruz.
 *
 * Yaklaşım: bozuk öğeleri **at**, sağlamları tut. Model beş sorudan birini
 * hatalı üretirse kullanıcı dört soruyu görsün; hiçbiri sağlam değilse hata ver.
 */

export interface AiQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  /** Cevabı destekleyen, metinden birebir alınmış cümle */
  evidence: string;
}

export interface AiSectionMark {
  title: string;
  /** Bölümün başladığı cümlenin ilk kelimeleri (metinde aranır) */
  firstWords: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function arrayField(json: unknown, field: string): unknown[] {
  if (!isRecord(json) || !Array.isArray(json[field])) {
    throw new AiError('Model beklenen biçimde yanıt vermedi.', { retryable: true });
  }
  return json[field] as unknown[];
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function parseQuestions(json: unknown): AiQuestion[] {
  const items = arrayField(json, 'questions');
  const questions: AiQuestion[] = [];

  for (const item of items) {
    if (!isRecord(item)) continue;
    const question = nonEmptyString(item.question);
    const evidence = nonEmptyString(item.evidence);
    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions.map(nonEmptyString).filter((o): o is string => o !== null);
    const answerIndex = item.answerIndex;

    if (!question || options.length < 2 || options.length !== rawOptions.length) continue;
    // Bazı modeller indeksi 1'den başlatıyor ya da metin olarak döndürüyor;
    // düzeltmeye çalışmak yerine güvenilmez soruyu atıyoruz.
    if (typeof answerIndex !== 'number' || !Number.isInteger(answerIndex)) continue;
    if (answerIndex < 0 || answerIndex >= options.length) continue;

    questions.push({ question, options, answerIndex, evidence: evidence ?? '' });
  }

  if (!questions.length) {
    throw new AiError('Model geçerli soru üretemedi. Yeniden deneyebilirsin.', { retryable: true });
  }
  return questions;
}

export function parseSections(json: unknown): AiSectionMark[] {
  const items = arrayField(json, 'sections');
  const sections: AiSectionMark[] = [];

  for (const item of items) {
    if (!isRecord(item)) continue;
    const title = nonEmptyString(item.title);
    const firstWords = nonEmptyString(item.firstWords);
    if (!title || !firstWords) continue;
    sections.push({ title, firstWords });
  }

  if (!sections.length) {
    throw new AiError('Model bölüm çıkaramadı. Yeniden deneyebilirsin.', { retryable: true });
  }
  return sections;
}

export interface RecallFeedback {
  caught: string[];
  missed: string[];
  feedback: string;
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(nonEmptyString).filter((item): item is string => item !== null).slice(0, max);
}

export function parseRecall(json: unknown): RecallFeedback {
  if (!isRecord(json)) {
    throw new AiError('Model beklenen biçimde yanıt vermedi.', { retryable: true });
  }
  const result: RecallFeedback = {
    caught: stringList(json.caught, 3),
    missed: stringList(json.missed, 3),
    feedback: nonEmptyString(json.feedback) ?? '',
  };
  if (!result.feedback && !result.caught.length && !result.missed.length) {
    throw new AiError('Model geri bildirim üretemedi. Yeniden deneyebilirsin.', { retryable: true });
  }
  return result;
}
