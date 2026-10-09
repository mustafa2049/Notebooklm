/**
 * Rozetler — saf fonksiyon, testli.
 *
 * Hafif oyunlaştırma: puan ya da seviye yok, yalnızca anlamlı kilometre
 * taşları. Rozetler veriden hesaplanıyor (ayrıca saklanmıyor) ve kalıcı:
 * seri rozeti en uzun seriden, gelişim rozeti güvenilir ölçümlerden verilir.
 * Hız rozeti bilerek yok — efektif hız (hız × anlama) rozeti var; yalnızca
 * hızı ödüllendirmek anlamadan hızlanmaya iterdi.
 */

export interface BadgeInput {
  sessions: number;
  totalWords: number;
  longestStreak: number;
  finishedDocs: number;
  finishedBooks: number;
  tests: number;
  /** İlk güvenilir ölçüme göre efektif hız değişimi (yoksa null) */
  improvement: number | null;
  /** Son üç güvenilir testin anlama oranları (yeniden eskiye) */
  recentComprehension: number[];
  knownWords: number;
  /** Schulte 5×5 en iyi süre (ms) */
  schulte5BestMs: number | null;
  /** Tamamlanan meydan okuma sayısı */
  challengesDone: number;
}

export interface Badge {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
}

const RULES: { id: string; title: string; detail: string; test: (input: BadgeInput) => boolean }[] = [
  { id: 'first', title: 'İlk adım', detail: 'İlk okuma oturumunu tamamla', test: (i) => i.sessions > 0 },
  { id: 'streak3', title: 'Üç gün', detail: '3 günlük seri', test: (i) => i.longestStreak >= 3 },
  { id: 'streak7', title: 'Bir hafta', detail: '7 günlük seri', test: (i) => i.longestStreak >= 7 },
  { id: 'streak30', title: 'Alışkanlık', detail: '30 günlük seri', test: (i) => i.longestStreak >= 30 },
  { id: 'finish1', title: 'Son sayfa', detail: 'Bir metni sonuna kadar oku', test: (i) => i.finishedDocs >= 1 },
  { id: 'book1', title: 'İlk kitap', detail: '5.000 kelimeden uzun bir metni bitir', test: (i) => i.finishedBooks >= 1 },
  { id: 'words10k', title: '10 bin kelime', detail: 'Toplam 10.000 kelime oku', test: (i) => i.totalWords >= 10000 },
  { id: 'words100k', title: '100 bin kelime', detail: 'Toplam 100.000 kelime oku', test: (i) => i.totalWords >= 100000 },
  { id: 'test1', title: 'Başlangıç noktası', detail: 'İlk seviye testini yap', test: (i) => i.tests >= 1 },
  {
    id: 'gain10',
    title: '%10 gelişim',
    detail: 'Efektif hızını ilk ölçüme göre %10 artır',
    test: (i) => (i.improvement ?? 0) >= 0.1,
  },
  {
    id: 'gain25',
    title: '%25 gelişim',
    detail: 'Efektif hızını ilk ölçüme göre %25 artır',
    test: (i) => (i.improvement ?? 0) >= 0.25,
  },
  {
    id: 'comprehension',
    title: 'Anlayarak',
    detail: 'Üç ölçümde üst üste en az %80 anlama',
    test: (i) => i.recentComprehension.length >= 3 && i.recentComprehension.slice(0, 3).every((c) => c >= 0.8),
  },
  { id: 'vocab20', title: 'Kelime avcısı', detail: 'Defterdeki 20 kelimeyi öğren', test: (i) => i.knownWords >= 20 },
  {
    id: 'challenge1',
    title: 'Meydan okuyan',
    detail: 'Bir okuma meydan okumasını tamamla',
    test: (i) => i.challengesDone >= 1,
  },
  {
    id: 'schulte',
    title: 'Keskin göz',
    detail: 'Schulte 5×5’i 30 saniyenin altında bitir',
    test: (i) => i.schulte5BestMs !== null && i.schulte5BestMs < 30000,
  },
];

export function computeBadges(input: BadgeInput): Badge[] {
  return RULES.map(({ test, ...badge }) => ({ ...badge, earned: test(input) }));
}

/** Kazanılmış ama henüz duyurulmamış rozetler. */
export function newBadges(badges: Badge[], seen: Set<string>): Badge[] {
  return badges.filter((badge) => badge.earned && !seen.has(badge.id));
}
