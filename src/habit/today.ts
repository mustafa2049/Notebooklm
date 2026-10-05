/**
 * "Bugün için" önerileri — saf fonksiyon, testli.
 *
 * Bir program değil, yön: uygulama açıldığında ne yapacağını düşünmek
 * zorunda kalmamak için en fazla üç kısa öneri. Sıra önem sırası.
 */

export interface Suggestion {
  id: string;
  title: string;
  detail: string;
  /** Dokununca gidilecek ekran */
  href: string;
}

export interface TodayState {
  /** Hiç seviye testi yapılmadı */
  noTestYet: boolean;
  /** Son ölçümden bir hafta geçti */
  testDue: boolean;
  /** Tekrar zamanı gelmiş kelime sayısı */
  dueWords: number;
  /** Bugün bir ısınma egzersizi yapıldı mı */
  warmupDoneToday: boolean;
}

/** Günün ısınma egzersizi her gün sırayla değişir: tekdüzelik bırakma nedeni. */
export const WARMUPS: Suggestion[] = [
  {
    id: 'schulte',
    title: 'Schulte tablosu',
    detail: 'Bir dakikalık dikkat ve çevresel görüş ısınması',
    href: '/drills/schulte',
  },
  {
    id: 'flash',
    title: 'Flaş kelime',
    detail: 'Bir bakışta kaç kelime görebiliyorsun?',
    href: '/drills/flash',
  },
  {
    id: 'scan',
    title: 'Tarama',
    detail: 'Metinde aranan bilgiyi hızla bul',
    href: '/drills/scan',
  },
  {
    id: 'skim',
    title: 'Göz gezdirme',
    detail: 'Yalnızca ilk cümlelerden ana fikri yakala',
    href: '/drills/skim',
  },
];

/** Yılın kaçıncı günü (yerel saat). */
export function dayOfYear(now: number): number {
  const date = new Date(now);
  const start = new Date(date.getFullYear(), 0, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today.getTime() - start.getTime()) / 86400000);
}

export function warmupOfDay(now: number): Suggestion {
  return WARMUPS[dayOfYear(now) % WARMUPS.length];
}

export function dailySuggestions(state: TodayState, now: number): Suggestion[] {
  const items: Suggestion[] = [];

  if (state.noTestYet) {
    items.push({
      id: 'test',
      title: 'Seviye testi',
      detail: 'Üç dakikada doğal hızını ve anlamanı ölç — gelişim buna göre izlenecek',
      href: '/assess',
    });
  } else if (state.testDue) {
    items.push({
      id: 'test',
      title: 'Haftalık ölçüm',
      detail: 'Bir hafta oldu: yeni bir metinle gerçekten hızlanıp hızlanmadığını gör',
      href: '/assess',
    });
  }

  if (!state.warmupDoneToday) items.push(warmupOfDay(now));

  if (state.dueWords > 0) {
    items.push({
      id: 'vocab',
      title: 'Kelime tekrarı',
      detail: `${state.dueWords} kelime tekrar bekliyor`,
      href: '/vocab',
    });
  }

  return items.slice(0, 3);
}
