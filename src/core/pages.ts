import type { Chunk } from './types';

/**
 * Akış hâlindeki modlar (Bionic, Yürüyen Vurgu) metni **sayfalara** bölerek
 * gösterir.
 *
 * Alternatif, uzun metni tek blokta çizip kaydırmayı vurguyla senkronize
 * etmekti; ancak React Native'de satır içi (`<Text>` içindeki `<Text>`)
 * öğelerin konumu güvenilir biçimde ölçülemiyor, dolayısıyla kaydırma
 * kaçınılmaz olarak zıplıyor. Sayfa yaklaşımı ölçüm gerektirmiyor, iki
 * platformda birebir aynı davranıyor ve okuma sırasında beklenmedik kaydırma
 * hareketi olmuyor: vurgu sayfanın sonuna varınca sayfa değişiyor.
 *
 * `maxWords` **sert** bir sınırdır: ekrana kaç kelime sığdığı ölçülüp
 * veriliyor, sayfa bu sayıyı asla aşmamalı — aştığında metin kapsayıcıdan
 * taşıp arayüzün üstüne biniyor.
 */
export interface Page {
  /** Chunk aralığı: [start, end) */
  start: number;
  end: number;
}

export function buildPages(chunks: Chunk[], maxWords: number): Page[] {
  if (chunks.length === 0) return [];
  const capacity = Math.max(4, Math.floor(maxWords));
  /** Sayfayı erken kapatmaya değecek en küçük doluluk */
  const minFill = Math.floor(capacity * 0.5);

  const pages: Page[] = [];
  let start = 0;
  let words = 0;
  /** Görülen son cümle/paragraf sonu (sayfayı burada kapatmak tercih edilir) */
  let lastBreak = -1;

  for (let i = 0; i < chunks.length; i++) {
    const weight = chunks[i].tokens.length;

    // Bu chunk sığmıyor: sayfayı kapat ve i'yi yeni sayfada yeniden değerlendir
    if (words + weight > capacity && i > start) {
      const preferSentence = lastBreak >= start && lastBreak + 1 - start >= minFill;
      const cut = preferSentence ? lastBreak + 1 : i;
      pages.push({ start, end: cut });
      start = cut;
      words = 0;
      lastBreak = -1;
      i = cut - 1;
      continue;
    }

    words += weight;

    if (chunks[i].sentenceEnd || chunks[i].paragraphEnd) lastBreak = i;

    // Paragraf sonu, sayfa yeterince dolduysa doğal bir kesim noktası
    if (chunks[i].paragraphEnd && words >= minFill) {
      pages.push({ start, end: i + 1 });
      start = i + 1;
      words = 0;
      lastBreak = -1;
    }
  }

  if (start < chunks.length) pages.push({ start, end: chunks.length });
  return pages;
}

/** Verilen chunk'ın hangi sayfada olduğunu bulur. */
export function pageIndexFor(pages: Page[], chunkIndex: number): number {
  if (pages.length === 0) return 0;
  let low = 0;
  let high = pages.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (pages[mid].end <= chunkIndex) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Bir sayfadaki kelime sayısı (kapasite testleri ve göstergeler için). */
export function pageWordCount(chunks: Chunk[], page: Page): number {
  let total = 0;
  for (let i = page.start; i < page.end; i++) total += chunks[i].tokens.length;
  return total;
}
