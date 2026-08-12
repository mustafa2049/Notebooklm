/**
 * Hız antrenmanı egzersizleri.
 *
 * Her egzersiz, zaman çizgisi üzerinde evrelerden oluşur; evre okuma hızını
 * (kullanıcının hedef hızına göre çarpan olarak) ve kelime grubu boyutunu
 * belirler. Saf veri olarak tutuluyor: hem test edilebiliyor hem de arayüz
 * yalnızca "şu an hangi evredeyim" sorusunu soruyor.
 */

export type ExerciseId = 'warmup' | 'ramp' | 'expand' | 'noRegression';

export interface ExercisePhase {
  /** Evrenin başladığı an (ms) */
  atMs: number;
  /** Hedef hızın kaç katı */
  wpmFactor: number;
  /** Bu evrede kullanılacak kelime grubu (verilmezse kullanıcı ayarı) */
  chunkSize?: number;
  label: string;
}

export interface Exercise {
  id: ExerciseId;
  title: string;
  purpose: string;
  durationMs: number;
  phases: ExercisePhase[];
  /** Egzersiz sırasında geri gitme kapalı mı */
  lockNavigation: boolean;
}

const SECOND = 1000;

export const EXERCISES: Exercise[] = [
  {
    id: 'warmup',
    title: 'Isınma',
    purpose:
      'Rahat hızının biraz altında başlayıp hedefe çıkar. Gözü ve dikkati tempoya alıştırır.',
    durationMs: 60 * SECOND,
    lockNavigation: false,
    phases: [
      { atMs: 0, wpmFactor: 0.8, label: 'Rahat tempo' },
      { atMs: 25 * SECOND, wpmFactor: 0.9, label: 'Hafif hızlanma' },
      { atMs: 45 * SECOND, wpmFactor: 1, label: 'Hedef hız' },
    ],
  },
  {
    id: 'ramp',
    title: 'Hız rampası',
    purpose:
      'Hedefin belirgin üstüne çıkıp geri döner. Yüksek tempodan sonra normal hız yavaş gelir; algı sınırı bu şekilde genişler.',
    durationMs: 90 * SECOND,
    lockNavigation: true,
    phases: [
      { atMs: 0, wpmFactor: 1, label: 'Hedef hız' },
      { atMs: 20 * SECOND, wpmFactor: 1.25, label: '%25 üstü' },
      { atMs: 40 * SECOND, wpmFactor: 1.5, label: '%50 üstü — anlamaya çalışma, sadece takip et' },
      { atMs: 60 * SECOND, wpmFactor: 1.25, label: 'Geri iniş' },
      { atMs: 75 * SECOND, wpmFactor: 1, label: 'Hedef hız — şimdi yavaş geliyor' },
    ],
  },
  {
    id: 'expand',
    title: 'Göz genişletme',
    purpose:
      'Kelime sayısını kademeli arttırır. Çevresel görüşü kullanmayı öğretir; en büyük hız kazancı buradan gelir.',
    durationMs: 90 * SECOND,
    lockNavigation: false,
    phases: [
      { atMs: 0, wpmFactor: 0.9, chunkSize: 1, label: 'Tek kelime' },
      { atMs: 30 * SECOND, wpmFactor: 1, chunkSize: 2, label: 'İkili gruplar' },
      { atMs: 60 * SECOND, wpmFactor: 1.1, chunkSize: 3, label: 'Üçlü gruplar' },
    ],
  },
  {
    id: 'noRegression',
    title: 'Regresyon kırma',
    purpose:
      'Geri gitme kapalı. Gözün istemsizce geri sıçraması okuma süresinin üçte birini yiyor; bu egzersiz o alışkanlığı kırar.',
    durationMs: 120 * SECOND,
    lockNavigation: true,
    phases: [{ atMs: 0, wpmFactor: 1, label: 'Sabit tempo — geri dönüş yok' }],
  },
];

export function exerciseById(id: string | undefined): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

/** Verilen ana denk gelen evre. */
export function phaseAt(exercise: Exercise, elapsedMs: number): ExercisePhase {
  let current = exercise.phases[0];
  for (const phase of exercise.phases) {
    if (elapsedMs >= phase.atMs) current = phase;
    else break;
  }
  return current;
}

/** Evre değişimine kalan süre (arayüzde geri sayım için). */
export function nextPhaseInMs(exercise: Exercise, elapsedMs: number): number | null {
  const upcoming = exercise.phases.find((phase) => phase.atMs > elapsedMs);
  return upcoming ? upcoming.atMs - elapsedMs : null;
}
