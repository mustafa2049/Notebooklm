/** Okuma motorunun ortak tipleri. Bu dosyada React veya platform bağımlılığı yoktur. */

export type ReaderMode = 'rsvp' | 'chunk' | 'bionic' | 'highlight';

export interface Token {
  /** Kaynak metindeki hâliyle kelime (noktalama dahil: "gitti." ) */
  text: string;
  /** Noktalamasız çekirdek ("gitti") */
  core: string;
  /** Kaynak metindeki karakter aralığı */
  start: number;
  end: number;
  /** Rakam içeriyor mu (tarih, sayı — göz daha yavaş işler) */
  hasDigit: boolean;
  /** Sonrasında virgül / noktalı virgül / iki nokta gibi kısa duraklama var */
  minorPause: boolean;
  /** Cümle bu token'da bitiyor */
  sentenceEnd: boolean;
  /** Paragraf bu token'da bitiyor */
  paragraphEnd: boolean;
  /** Kaçıncı cümle (0'dan başlar) */
  sentenceIndex: number;
  /** Kaçıncı paragraf (0'dan başlar) */
  paragraphIndex: number;
}

export interface Chunk {
  /** Ekranda gösterilecek metin */
  text: string;
  /** Bu chunk'ı oluşturan token'lar */
  tokens: Token[];
  /**
   * Tempo hesabı için kelime ağırlığı. Bölünmüş uzun kelimenin her parçası
   * tam kelime sayılmaz (örn. 0.6), yoksa uzun kelimeler çifte cezalanır.
   */
  weight: number;
  /** `text` içinde ORP (pivot) karakter indeksi */
  pivot: number;
  /** Kaynak metindeki karakter aralığı (ilerleme ve vurgu için) */
  charStart: number;
  charEnd: number;
  minorPause: boolean;
  sentenceEnd: boolean;
  paragraphEnd: boolean;
  hasDigit: boolean;
  sentenceIndex: number;
  paragraphIndex: number;
  /** Uzun kelimenin parçasıysa: kelimenin kaçıncı parçası (0 = ilk) */
  partOf?: { index: number; total: number };
}

export interface ChunkOptions {
  /** Bir karede kaç kelime gösterilecek (1–4) */
  chunkSize: number;
  /** Cümle/paragraf sınırlarında chunk'ı bölme */
  breakOnSentence: boolean;
  /** Virgül gibi kısa duraklamalarda da bölme */
  breakOnPunctuation: boolean;
  /** Bir chunk'ta izin verilen azami karakter (ekrana sığması için) */
  maxChars: number;
  /**
   * Bu uzunluğu geçen kelimeler hece sınırından bölünüp birden çok karede
   * gösterilir. 0 = bölme kapalı.
   */
  splitLongWords: number;
}

export interface PacingOptions {
  /** Hedef hız: dakikadaki kelime */
  wpm: number;
  /** Noktalama/uzunluk çarpanları uygulanacak mı */
  useMultipliers: boolean;
  /** Duraklamadan sonra ilk karelerde yumuşak başlangıç */
  rampUp: boolean;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  chunkSize: 1,
  breakOnSentence: true,
  breakOnPunctuation: false,
  maxChars: 28,
  splitLongWords: 14,
};

export const DEFAULT_PACING_OPTIONS: PacingOptions = {
  wpm: 300,
  useMultipliers: true,
  rampUp: true,
};
