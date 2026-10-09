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

export interface PageMetrics {
  /** Metin alanının boyutu (px) */
  width: number;
  height: number;
  fontSize: number;
  /** Satır yüksekliği (px) */
  lineHeight: number;
  /** Harflerin ortalama genişliği (em) — yazı tipine göre */
  charEm: number;
  /** Paragraflar arası boşluk (px) */
  paragraphGap: number;
  /**
   * Ölçülmüş satır başına karakter (bkz. `SAMPLE_PARAGRAPH`). Varsa harf
   * genişliği tahmini yerine bu kullanılır; satır sonu boşlukları da içinde.
   */
  charsPerLine?: number;
}

/**
 * Satır başına karakteri ölçmek için gizlice çizilen örnek paragraf: sıradan
 * Türkçe metin, tipik kelime uzunluklarıyla. Sayfa alanının genişliğinde ve
 * okuma yazı tipinde çizilip kaç satır tuttuğu ölçülür; harf genişliği yazı
 * tipine, platforma ve boyuta göre değiştiği için tahminden çok daha isabetli.
 */
export const SAMPLE_PARAGRAPH =
  'Okuma alışkanlığı bir günde kazanılmaz; her gün birkaç sayfa okumak, zamanla insanın düşünme biçimini ' +
  'değiştirir. Kitabı elimize aldığımızda dikkatimiz önce dağılır, sonra cümlelerin akışına kapılırız. ' +
  'Yazarın kurduğu dünya yavaş yavaş belirginleşir ve okuduklarımız kendi deneyimlerimizle birleşir. ' +
  'Bu yüzden önemli olan hızlı bitirmek değil, düzenli ve anlayarak okumaktır.';

/** Örnek paragrafın ölçülen yüksekliğinden satır başına karakter. */
export function charsPerLineFromSample(sampleHeight: number, lineHeight: number): number | undefined {
  if (sampleHeight <= 0 || lineHeight <= 0) return undefined;
  const lines = Math.max(1, Math.round(sampleHeight / lineHeight));
  return SAMPLE_PARAGRAPH.length / lines;
}

/**
 * Satır sonuna sığmayan kelime alt satıra geçer; satırın bir kısmı boş kalır.
 * Satır kapasitesinin bu oranı dolu sayılıyor.
 */
const LINE_FILL = 0.9;

/** Bir chunk'ın metindeki karakter sayısı (bölünmüş kelimenin yalnızca ilk parçası). */
function chunkChars(chunk: Chunk): number {
  if (chunk.partOf && chunk.partOf.index > 0) return 0;
  let total = 0;
  for (const token of chunk.tokens) total += token.text.length + 1;
  return total;
}

/**
 * Sayfa modu için **yüksekliğe göre** sayfalama: her paragrafın kaç satır
 * tutacağı harf sayısından ve satır genişliğinden tahmin edilir, paragraf
 * araları da hesaba katılır. Kelime sayısıyla sayfalamak başlıkları, kısa
 * paragrafları ve uzun kelimeleri görmüyor, sayfalar yarı boş kalıyordu.
 *
 * Kitap gibi doldurur: sayfa paragraf ya da cümle ortasında bitebilir.
 * `fillFactor` tahminin payıdır; sayfa görünümü gerçek yüksekliği ölçüp
 * taşma görürse bu payı küçültür.
 */
export function buildFlowPages(chunks: Chunk[], metrics: PageMetrics, fillFactor = 1): Page[] {
  if (chunks.length === 0) return [];
  const { width, height, fontSize, lineHeight, charEm, paragraphGap } = metrics;
  if (width <= 0 || height <= 0 || fontSize <= 0 || lineHeight <= 0) {
    return [{ start: 0, end: chunks.length }];
  }

  const charsPerLine = Math.max(
    4,
    metrics.charsPerLine ?? Math.floor(width / (fontSize * Math.max(0.3, charEm))) * LINE_FILL
  );
  const limit = height * fillFactor;
  const linesFor = (chars: number) => (chars > 0 ? Math.ceil(chars / charsPerLine) : 0);

  const pages: Page[] = [];
  let start = 0;
  /** Bu sayfada tamamlanmış paragrafların yüksekliği (araları dahil) */
  let doneHeight = 0;
  let paragraphsOnPage = 0;
  /** Sayfadaki son (açık) paragrafın karakterleri */
  let openChars = 0;

  const heightWith = (chars: number) =>
    doneHeight + (paragraphsOnPage > 0 ? paragraphGap : 0) + linesFor(chars) * lineHeight;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chars = chunkChars(chunk);

    if (i > start && heightWith(openChars + chars) > limit) {
      pages.push({ start, end: i });
      start = i;
      doneHeight = 0;
      paragraphsOnPage = 0;
      openChars = 0;
    }

    openChars += chars;

    if (chunk.paragraphEnd) {
      doneHeight = heightWith(openChars);
      paragraphsOnPage += 1;
      openChars = 0;
    }
  }

  if (start < chunks.length) pages.push({ start, end: chunks.length });
  return pages;
}

export interface PageSentence {
  sentenceIndex: number;
  /** Cümlenin bu sayfadaki metni (sayfa cümlenin ortasında başlayabilir) */
  text: string;
  /** Metindeki başlangıç konumu */
  charStart: number;
  words: string[];
}

export interface PageParagraph {
  paragraphIndex: number;
  sentences: PageSentence[];
}

/**
 * Sayfanın paragrafları ve cümleleri — Sayfa modu metni kitap gibi çizer.
 * Bölünmüş uzun kelimenin parçaları tek kelime olarak yazılır (parçalar aynı
 * token'ı taşır; yalnızca ilk parça sayılır).
 */
export function pageParagraphs(chunks: Chunk[], page: Page): PageParagraph[] {
  const paragraphs: PageParagraph[] = [];
  for (let i = page.start; i < Math.min(page.end, chunks.length); i++) {
    const chunk = chunks[i];
    if (chunk.partOf && chunk.partOf.index > 0) continue;
    for (const token of chunk.tokens) {
      let paragraph = paragraphs[paragraphs.length - 1];
      if (!paragraph || paragraph.paragraphIndex !== token.paragraphIndex) {
        paragraph = { paragraphIndex: token.paragraphIndex, sentences: [] };
        paragraphs.push(paragraph);
      }
      let sentence = paragraph.sentences[paragraph.sentences.length - 1];
      if (!sentence || sentence.sentenceIndex !== token.sentenceIndex) {
        sentence = { sentenceIndex: token.sentenceIndex, text: '', charStart: token.start, words: [] };
        paragraph.sentences.push(sentence);
      }
      sentence.text = sentence.text ? `${sentence.text} ${token.text}` : token.text;
      if (token.core) sentence.words.push(token.core);
    }
  }
  return paragraphs;
}
