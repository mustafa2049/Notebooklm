/**
 * Okuma ölçümü — saf fonksiyonlar, testli.
 *
 * Ölçtüğümüz şey ham hız değil **efektif hız**: kendi hızında okunan metnin
 * dakikadaki kelimesi × anlama oranı. Hız ile anlama arasında takas olduğu
 * için (Rayner ve ark., 2016) yalnızca hızı izlemek, anlamadan "hızlandığını"
 * sanmaya götürür.
 */

import type { PassageLevel } from '@/content/passages';

export type AssessmentKind = 'test' | 'quiz';

export interface AssessmentRecord {
  id: string;
  kind: AssessmentKind;
  /** Ölçüm bittiği an */
  at: number;
  /** Test metni (`kind: 'test'`) ya da quiz'in yapıldığı doküman */
  passageId?: string;
  /** Test metninin seviyesi. Seviyeler eklenmeden önceki kayıtlar orta seviyedir. */
  level?: PassageLevel;
  docId?: string;
  /** Okuma süresi (yalnızca test; quiz'de uygulamanın temposu belirli) */
  ms: number;
  words: number;
  /** Test: ölçülen doğal hız; quiz: okunduğu andaki antrenman temposu */
  wpm: number;
  correct: number;
  total: number;
  /** Quiz kaynağı: boşluk doldurma ya da AI soruları */
  source?: 'cloze' | 'ai' | 'gömülü';
  reliable: boolean;
  /** Güvenilir değilse kısa gerekçe (arayüzde gösterilir) */
  note?: string;
}

export interface Score {
  wpm: number;
  comprehension: number;
  effectiveWpm: number;
}

/** Bu aralığın dışındaki doğal hızlar ölçüm hatasıdır (yanlışlıkla "bitirdim"e basmak vb.). */
export const MIN_PLAUSIBLE_WPM = 60;
export const MAX_PLAUSIBLE_WPM = 1500;
/** Bunun altında anlama, metnin okunmadan geçildiğini düşündürür. */
export const MIN_RELIABLE_COMPREHENSION = 0.4;
/** Haftalık ölçüm aralığı */
export const TEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function scoreAssessment(ms: number, words: number, correct: number, total: number): Score {
  const minutes = Math.max(ms, 1) / 60000;
  const wpm = words / minutes;
  const comprehension = total > 0 ? Math.max(0, Math.min(1, correct / total)) : 0;
  return { wpm, comprehension, effectiveWpm: wpm * comprehension };
}

/** Ölçümün trende katılıp katılmayacağı ve katılmıyorsa nedeni. */
export function reliability(score: Score): { reliable: boolean; note?: string } {
  if (score.wpm < MIN_PLAUSIBLE_WPM) {
    return { reliable: false, note: 'Okuma çok uzun sürdü; ara verilmiş olabilir.' };
  }
  if (score.wpm > MAX_PLAUSIBLE_WPM) {
    return { reliable: false, note: 'Bu hız gerçekçi değil; metin okunmadan geçilmiş olabilir.' };
  }
  if (score.comprehension < MIN_RELIABLE_COMPREHENSION) {
    return {
      reliable: false,
      note: 'Anlama çok düşük; bu hızda metin gerçekten okunmamış olabilir.',
    };
  }
  return { reliable: true };
}

/** Yalnızca güvenilir testler, eskiden yeniye. */
export function reliableTests(history: AssessmentRecord[]): AssessmentRecord[] {
  return history
    .filter((record) => record.kind === 'test' && record.reliable)
    .sort((a, b) => a.at - b.at);
}

export function effectiveOf(record: AssessmentRecord): number {
  return record.total > 0 ? record.wpm * (record.correct / record.total) : 0;
}

/**
 * Sıradaki test metni: hiç kullanılmamış olanlardan ilki; hepsi kullanıldıysa
 * en uzun zamandır okunmamış olanı. Aynı metni tekrar okumak "hatırlama"
 * etkisiyle hızı şişirir, bu yüzden tekrar en geç noktaya itilir.
 */
export function nextTestPassageId(testIds: string[], history: AssessmentRecord[]): string {
  const lastUsed = new Map<string, number>();
  for (const record of history) {
    if (record.kind !== 'test' || !record.passageId) continue;
    lastUsed.set(record.passageId, Math.max(lastUsed.get(record.passageId) ?? 0, record.at));
  }
  const unused = testIds.find((id) => !lastUsed.has(id));
  if (unused) return unused;
  return [...testIds].sort((a, b) => (lastUsed.get(a) ?? 0) - (lastUsed.get(b) ?? 0))[0];
}

/** Hiç test yoksa ya da son testten bir hafta geçtiyse yeni ölçüm zamanı gelmiştir. */
export function testDue(history: AssessmentRecord[], now: number): boolean {
  const tests = history.filter((record) => record.kind === 'test');
  if (tests.length === 0) return true;
  const last = Math.max(...tests.map((record) => record.at));
  return now - last >= TEST_INTERVAL_MS;
}

/** Kaydın seviyesi; seviyeler gelmeden önceki testlerin hepsi orta seviyedeydi. */
export function levelOf(record: AssessmentRecord): PassageLevel {
  return record.level ?? 'orta';
}

const LEVEL_ORDER: PassageLevel[] = ['kolay', 'orta', 'zor'];

/** Seviye değiştirmek için kaç ardışık ölçüm gerekir (tek ölçüm gürültülü olabilir) */
export const LEVEL_EVIDENCE = 2;
export const LEVEL_UP_COMPREHENSION = 0.8;
export const LEVEL_DOWN_COMPREHENSION = 0.6;

/**
 * Sıradaki ölçümün seviyesi. Aynı seviyedeki son iki güvenilir ölçümde anlama
 * %80 ve üstündeyse bir üst seviye, ikisinde de %60'ın altındaysa bir alt seviye
 * önerilir. Hiç ölçüm yoksa orta seviyeden başlanır.
 */
export function suggestLevel(history: AssessmentRecord[]): PassageLevel {
  const tests = reliableTests(history);
  if (!tests.length) return 'orta';
  const current = levelOf(tests[tests.length - 1]);
  const recent = tests.filter((record) => levelOf(record) === current).slice(-LEVEL_EVIDENCE);
  if (recent.length < LEVEL_EVIDENCE) return current;

  const ratios = recent.map((record) => record.correct / Math.max(1, record.total));
  const index = LEVEL_ORDER.indexOf(current);
  if (ratios.every((ratio) => ratio >= LEVEL_UP_COMPREHENSION)) {
    return LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, index + 1)];
  }
  if (ratios.every((ratio) => ratio < LEVEL_DOWN_COMPREHENSION)) {
    return LEVEL_ORDER[Math.max(0, index - 1)];
  }
  return current;
}

export interface Improvement {
  /** Karşılaştırılan seviye */
  level: PassageLevel;
  /** O seviyedeki ilk güvenilir testin efektif hızı */
  baseline: number;
  /** O seviyedeki son güvenilir testin efektif hızı */
  latest: number;
  /** Oransal değişim (0,18 = %18 artış) */
  change: number;
  tests: number;
}

/**
 * İlk ölçüme göre gelişim — **yalnızca aynı seviyedeki** testler arasında.
 * Kolay bir metindeki hızı zor bir metindekiyle karşılaştırmak, zorluk farkını
 * gelişim (ya da gerileme) diye göstermek olurdu. Son ölçümün seviyesi esas
 * alınır; o seviyede en az iki güvenilir test gerekir.
 */
export function improvement(history: AssessmentRecord[]): Improvement | null {
  const all = reliableTests(history);
  if (!all.length) return null;
  const level = levelOf(all[all.length - 1]);
  const tests = all.filter((record) => levelOf(record) === level);
  if (tests.length < 2) return null;
  const baseline = effectiveOf(tests[0]);
  const latest = effectiveOf(tests[tests.length - 1]);
  if (baseline <= 0) return null;
  return { level, baseline, latest, change: (latest - baseline) / baseline, tests: tests.length };
}

/** 25'in katına yuvarlar (Ayarlar'daki hız kaydırıcısının adımı). */
function roundTo25(value: number): number {
  return Math.round(value / 25) * 25;
}

/**
 * Önerilen antrenman temposu. Anlama iyiyse doğal hızın biraz üstü (rahat
 * bölgenin hemen dışında çalışmak), değilse doğal hız — önce anlamayı
 * sağlamlaştırmak. Kendiliğinden uygulanmaz; kullanıcı onaylar.
 */
export function suggestTargetWpm(score: Score): number {
  const factor = score.comprehension >= 0.7 ? 1.25 : 1;
  return Math.max(100, Math.min(1200, roundTo25(score.wpm * factor)));
}

/**
 * "Kazanılan süre" karşılaştırmasının temel hızı: kullanıcının ilk güvenilir
 * ölçümündeki doğal hızı; ölçüm yoksa ortalama yetişkin hızı.
 */
export const AVERAGE_ADULT_WPM = 230;

/** Doğal okuma hızı: son güvenilir ölçüm; ölçüm yoksa ortalama yetişkin hızı */
export function naturalWpm(history: AssessmentRecord[]): number {
  return reliableTests(history).pop()?.wpm ?? AVERAGE_ADULT_WPM;
}

export function baselineWpm(history: AssessmentRecord[]): { wpm: number; measured: boolean } {
  const first = reliableTests(history)[0];
  return first ? { wpm: first.wpm, measured: true } : { wpm: AVERAGE_ADULT_WPM, measured: false };
}
