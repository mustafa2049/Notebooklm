/**
 * Kelime defteri tekrar sırası — saf fonksiyonlar, testli.
 *
 * Tam bir aralıklı tekrar (SRS) algoritması kurmuyoruz: burada ölçülen şey
 * okurken takılınan kelimeler ve liste genelde küçük. Kural basit ve
 * açıklanabilir olsun diye üç şeye bakıyoruz — kelime biliniyor mu, kaç kez
 * tekrar edildi, en son ne zaman görüldü.
 */

export interface ReviewItem {
  /** Kullanıcı "biliyorum" dediyse sıranın sonuna gider */
  known: boolean;
  /** Kaç kez tekrar edildi */
  reviews: number;
  /** Son tekrar zamanı (ms); hiç tekrar edilmediyse tanımsız */
  lastReviewAt?: number;
  createdAt: number;
}

/** Bir kelimenin tekrar edilmesi için beklenmesi gereken süre. */
export function dueDelayMs(item: ReviewItem): number {
  const day = 24 * 60 * 60 * 1000;
  if (!item.known) {
    // Bilinmeyen kelime aynı gün içinde tekrar sorulabilir
    return item.reviews === 0 ? 0 : 4 * 60 * 60 * 1000;
  }
  // Bilinen kelimede aralık her doğru tekrarla iki katına çıkar (1, 2, 4, 8… gün)
  const days = Math.min(30, 2 ** Math.max(0, item.reviews - 1));
  return days * day;
}

export function isDue(item: ReviewItem, now: number): boolean {
  const last = item.lastReviewAt ?? item.createdAt;
  return now - last >= dueDelayMs(item);
}

/**
 * Tekrar sırası: önce zamanı gelmiş ve bilinmeyenler, sonra zamanı gelmiş
 * bilinenler, en sonda zamanı gelmeyenler. Eşitlikte en eski görülen önce.
 */
export function sortForReview<T extends ReviewItem>(items: T[], now: number): T[] {
  const rank = (item: T): number => {
    if (!isDue(item, now)) return 2;
    return item.known ? 1 : 0;
  };
  return [...items].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return (a.lastReviewAt ?? a.createdAt) - (b.lastReviewAt ?? b.createdAt);
  });
}

/** Bugün tekrar edilmesi gereken kelime sayısı (arayüzdeki sayaç). */
export function dueCount(items: ReviewItem[], now: number): number {
  return items.filter((item) => isDue(item, now)).length;
}

/** Tekrar sonucunu uygular: doğru/yanlış cevabın sayacı ve zamanı. */
export function applyReview<T extends ReviewItem>(item: T, knew: boolean, now: number): T {
  return {
    ...item,
    known: knew,
    // Bilmediğini söylediyse sayaç sıfırlanır: aralık yeniden kısalsın
    reviews: knew ? item.reviews + 1 : 0,
    lastReviewAt: now,
  };
}
