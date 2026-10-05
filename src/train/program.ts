import type { ExerciseId } from './exercises';

/**
 * Dört haftalık okuma programı — saf veri ve mantık, testli.
 *
 * Program bir alıştırma düzeni: her hafta beş ders, her ders ~10 dakika.
 * Haftanın son dersi ölçüm; sonuç oradan görülür, vaat edilmez. Kaçırılan gün
 * programı sıfırlamaz — kaldığın dersten devam edersin (takvim değil sıra).
 *
 * Program kendi temposunu tutar ve anlama sonucuna göre ayarlar
 * (`adaptWpm`); normal okuma ayarına dokunmaz.
 */

export type WarmupDrill = 'schulte' | 'flash';

export type Practice =
  /** Hız egzersizi (`training/run`), ardından anlama kontrolü */
  | { type: 'exercise'; exercise: ExerciseId }
  /** Okuma becerisi egzersizi (`drills/scan`, `drills/skim`) */
  | { type: 'skill'; drill: 'scan' | 'skim' }
  /** Kendi metninde odak seansı: öğrendiğini doğal okumaya aktarma */
  | { type: 'focus'; minutes: number }
  /** Haftalık ölçüm (`assess`) */
  | { type: 'assess' };

export interface Lesson {
  id: string;
  week: number;
  day: number;
  title: string;
  /** Dersin başında gösterilen kısa ipucu */
  tip: string;
  warmup: WarmupDrill | null;
  practice: Practice;
}

export const WEEK_THEMES = [
  'Temel ve geri dönüşler',
  'Kelime grupları',
  'Tempo ve tarama',
  'Pekiştirme ve aktarım',
];

const lesson = (
  week: number,
  day: number,
  title: string,
  tip: string,
  warmup: WarmupDrill | null,
  practice: Practice
): Lesson => ({ id: `h${week}d${day}`, week, day, title, tip, warmup, practice });

const ASSESS_TIP =
  'Haftanın ölçümü. Hızlanmaya çalışma; kitap okur gibi oku. Gelişim yalnızca bu ölçümlerde görünür.';

export const PROGRAM_LESSONS: Lesson[] = [
  lesson(1, 1, 'Tempoya alışma', 'Gözün metni bir tempoyla takip etmesi, kendi kendine sürüklenmesinden daha düzenli okumayı sağlar. Bugün yalnızca alış.', 'schulte', { type: 'exercise', exercise: 'warmup' }),
  lesson(1, 2, 'Geri dönmeden okumak', 'Okurken gözün istemsizce geri sıçraması süreyi uzatır ama anlamaya çoğu zaman katkı vermez. Bugün geri gitme kapalı: kaçırdığın kelimeyi bağlam tamamlar.', 'flash', { type: 'exercise', exercise: 'noRegression' }),
  lesson(1, 3, 'Sabit tempo', 'Takıldığın yerde durmak yerine akışı sürdür. Anlam çoğu zaman cümlenin sonunda kendiliğinden yerine oturur.', 'schulte', { type: 'exercise', exercise: 'noRegression' }),
  lesson(1, 4, 'Biraz yukarı', 'Rahat bölgenin hemen dışında çalışmak gelişimin yeri. Kısa bir süre hızlı tempoyu dene, sonra normale dön.', 'flash', { type: 'exercise', exercise: 'ramp' }),
  lesson(1, 5, '1. hafta ölçümü', ASSESS_TIP, null, { type: 'assess' }),

  lesson(2, 1, 'İkili gruplar', 'Göz kelimeleri tek tek değil, küçük gruplar hâlinde alabilir. Bugün grup büyüklüğü kademeli artıyor.', 'flash', { type: 'exercise', exercise: 'expand' }),
  lesson(2, 2, 'Anlam birimleri', 'Gruplar rastgele değil: "uzun bir yolculuktan sonra" tek bir anlam birimi. Grubu bir bakışta bir resim gibi gör.', 'schulte', { type: 'exercise', exercise: 'expand' }),
  lesson(2, 3, 'Önce iskelet', 'Okumadan önce metne göz gezdirmek nereye gittiğini bilerek okumayı sağlar. Bugün yalnızca ilk cümlelerden ana fikri yakala.', 'flash', { type: 'skill', drill: 'skim' }),
  lesson(2, 4, 'Gruplarla akış', 'Gruplar ve sabit tempo birlikte: geri dönmeden, gruplar hâlinde.', 'schulte', { type: 'exercise', exercise: 'expand' }),
  lesson(2, 5, '2. hafta ölçümü', ASSESS_TIP, null, { type: 'assess' }),

  lesson(3, 1, 'Hız rampası', 'Hızlı tempodan sonra normal hız yavaş gelir. Bu "yavaş gelme" hissi, algının genişlediğinin işareti.', 'flash', { type: 'exercise', exercise: 'ramp' }),
  lesson(3, 2, 'Aradığını bulmak', 'Her metin baştan sona okunmaz. Bir bilgi aranıyorsa göz okumadan tarar; bu da ayrı bir beceri.', 'schulte', { type: 'skill', drill: 'scan' }),
  lesson(3, 3, 'Tempoyu tutmak', 'Rampadan sonra hedef tempoda kal. Anlama düşerse program temposu kendiliğinden geri çekilir.', 'flash', { type: 'exercise', exercise: 'ramp' }),
  lesson(3, 4, 'Geri dönüşsüz tempo', 'Bu hafta yükselen tempoda geri dönmeden okumayı pekiştir.', 'schulte', { type: 'exercise', exercise: 'noRegression' }),
  lesson(3, 5, '3. hafta ölçümü', ASSESS_TIP, null, { type: 'assess' }),

  lesson(4, 1, 'Hepsi bir arada', 'Gruplar, sabit tempo, geri dönmeden: üç haftanın becerileri tek egzersizde.', 'flash', { type: 'exercise', exercise: 'expand' }),
  lesson(4, 2, 'Kendi kitabında', 'Asıl hedef uygulamada değil, kendi kitabında daha akıcı okumak. Bugün kendi metninde 10 dakikalık odak seansı.', 'schulte', { type: 'focus', minutes: 10 }),
  lesson(4, 3, 'Göz gezdir, sonra oku', 'Yeni bir metne başlamadan önce iskeletine bak; sonra okurken nerede olduğunu bilirsin.', 'flash', { type: 'skill', drill: 'skim' }),
  lesson(4, 4, 'Son rampa', 'Programın son hız egzersizi. Bundan sonra alışkanlık devralıyor: her gün biraz okumak.', 'schulte', { type: 'exercise', exercise: 'ramp' }),
  lesson(4, 5, 'Final ölçümü', 'Programın son ölçümü. İlk haftanın ölçümüyle karşılaştıracağız — aynı seviyedeysen fark doğrudan görülür.', null, { type: 'assess' }),
];

export function lessonById(id: string | undefined): Lesson | undefined {
  return PROGRAM_LESSONS.find((item) => item.id === id);
}

/** Bir dersin tamamlanma kaydı */
export interface LessonResult {
  id: string;
  at: number;
  /** Anlama kontrolü yapıldıysa oran (0–1) */
  comprehension?: number;
  /** Ders sırasındaki program temposu */
  wpm: number;
}

export interface ProgramState {
  startedAt: number;
  /** Program temposu (kelime/dk) — anlama sonucuna göre ayarlanır */
  wpm: number;
  completed: LessonResult[];
  /** Başlatılmış ama bitirilmemiş ders: adımlar bu andan sonraki kayıtlarla işaretlenir */
  active?: { id: string; startedAt: number; docId?: string };
}

export const MIN_PROGRAM_WPM = 100;
export const MAX_PROGRAM_WPM = 1200;
const STEP = 25;

export function startProgram(wpm: number, now: number): ProgramState {
  return { startedAt: now, wpm: clampWpm(Math.round(wpm / STEP) * STEP), completed: [] };
}

function clampWpm(value: number): number {
  return Math.max(MIN_PROGRAM_WPM, Math.min(MAX_PROGRAM_WPM, value));
}

/**
 * Uyarlanır tempo: anlama %80 ve üstündeyse %5 artış, %60–80 aynı, %60'ın
 * altıysa %10 düşüş. 25'in katına yuvarlanır; yuvarlama değişimi yutmasın diye
 * artış ve düşüş en az bir adım (25) olur.
 */
export function adaptWpm(current: number, comprehension: number): number {
  if (comprehension >= 0.8) {
    return clampWpm(Math.max(current + STEP, Math.round((current * 1.05) / STEP) * STEP));
  }
  if (comprehension < 0.6) {
    return clampWpm(Math.min(current - STEP, Math.round((current * 0.9) / STEP) * STEP));
  }
  return current;
}

/** Sıradaki ders: tamamlanmamış ilk ders (takvim değil sıra — kaçırılan gün sıfırlamaz). */
export function nextLesson(state: ProgramState): Lesson | null {
  const done = new Set(state.completed.map((result) => result.id));
  return PROGRAM_LESSONS.find((item) => !done.has(item.id)) ?? null;
}

export function beginLesson(state: ProgramState, lessonId: string, now: number, docId?: string): ProgramState {
  if (state.active?.id === lessonId) return docId ? { ...state, active: { ...state.active, docId } } : state;
  return { ...state, active: { id: lessonId, startedAt: now, docId } };
}

export function completeLesson(
  state: ProgramState,
  lessonId: string,
  comprehension: number | null,
  now: number
): ProgramState {
  if (state.completed.some((result) => result.id === lessonId)) return { ...state, active: undefined };
  const result: LessonResult = { id: lessonId, at: now, wpm: state.wpm };
  if (comprehension !== null) result.comprehension = comprehension;
  return {
    ...state,
    wpm: comprehension === null ? state.wpm : adaptWpm(state.wpm, comprehension),
    completed: [...state.completed, result],
    active: undefined,
  };
}

export interface ProgramProgress {
  done: number;
  total: number;
  finished: boolean;
  /** Sıradaki dersin haftası ve günü (bittiyse son ders) */
  week: number;
  day: number;
}

export function programProgress(state: ProgramState): ProgramProgress {
  const next = nextLesson(state);
  const last = PROGRAM_LESSONS[PROGRAM_LESSONS.length - 1];
  return {
    done: state.completed.length,
    total: PROGRAM_LESSONS.length,
    finished: next === null,
    week: (next ?? last).week,
    day: (next ?? last).day,
  };
}

// ------------------------------------------------- adımların durumu

/** Ders başladıktan sonra kaydedilenler; adımlar bunlardan işaretlenir. */
export interface LessonEvidence {
  drills: { drill: string; at: number }[];
  sessions: { docId: string; at: number; ms: number; mode: string }[];
  assessments: { kind: 'test' | 'quiz'; at: number; docId?: string; correct: number; total: number }[];
}

export interface LessonStatus {
  warmupDone: boolean;
  practiceDone: boolean;
  /** Anlama kontrolü gerekiyorsa yapıldı mı */
  checkNeeded: boolean;
  checkDone: boolean;
  comprehension: number | null;
  canComplete: boolean;
}

/** Odak seansında sürenin bu kadarı okunmuşsa adım tamam sayılır */
const FOCUS_SHARE = 0.8;

export function lessonStatus(
  item: Lesson,
  startedAt: number,
  docId: string | undefined,
  evidence: LessonEvidence
): LessonStatus {
  const since = <T extends { at: number }>(list: T[]) => list.filter((entry) => entry.at >= startedAt);
  const drills = since(evidence.drills);
  const sessions = since(evidence.sessions);
  const assessments = since(evidence.assessments);

  const warmupDone = item.warmup === null || drills.some((entry) => entry.drill === item.warmup);

  let practiceDone = false;
  let checkNeeded = false;
  let comprehension: number | null = null;
  const practice = item.practice;

  if (practice.type === 'exercise') {
    checkNeeded = true;
    practiceDone = sessions.some((entry) => entry.docId === docId && entry.mode !== 'listen');
    const quiz = assessments.filter((entry) => entry.kind === 'quiz' && entry.docId === docId).pop();
    if (quiz && quiz.total > 0) comprehension = quiz.correct / quiz.total;
  } else if (practice.type === 'skill') {
    practiceDone = drills.some((entry) => entry.drill === practice.drill);
  } else if (practice.type === 'focus') {
    const readMs = sessions
      .filter((entry) => entry.mode !== 'test' && entry.mode !== 'listen' && !entry.docId.startsWith('pratik:'))
      .reduce((sum, entry) => sum + entry.ms, 0);
    practiceDone = readMs >= practice.minutes * 60_000 * FOCUS_SHARE;
  } else {
    const test = assessments.filter((entry) => entry.kind === 'test').pop();
    practiceDone = Boolean(test);
    if (test && test.total > 0) comprehension = test.correct / test.total;
  }

  const checkDone = !checkNeeded || comprehension !== null;
  return {
    warmupDone,
    practiceDone,
    checkNeeded,
    checkDone,
    comprehension,
    // Isınma önerilir ama zorunlu değil; asıl iş uygulama ve kontrol
    canComplete: practiceDone && checkDone,
  };
}
