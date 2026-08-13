/**
 * Ham metni okuma motoruna vermeye hazır hâle getirir.
 *
 * En önemli işi **sert satır kaydırmayı geri almak**. TXT dosyaları ve PDF
 * çıktıları satırları 70–80 karakterde elle kırar; bu hâlde her satır sonu
 * paragraf sanılır, tempo bozulur ve vurgu modunda metin paramparça görünür.
 *
 * Ayrım şu sezgiye dayanıyor: sert kaydırılmış metinde satırlar birbirine yakın
 * uzunlukta ve çoğu noktalama olmadan bitiyor. Zaten paragraf hâlinde gelen
 * metinlerde ise satırlar çok daha uzun ve noktayla bitiyor.
 */

const SENTENCE_END = /[.!?…:;»”"')\]]$/;

/** Görünmez ve sorunlu karakterleri temizler. */
function stripInvisible(text: string): string {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/­/g, '') // yumuşak tire
    .replace(/[​-‍⁠]/g, '') // sıfır genişlikli karakterler
    .replace(/ /g, ' ') // kırılmaz boşluk
    .replace(/[ \t]+/g, ' ');
}

/** "kelime-\nnin" → "kelimenin" (PDF'lerde satır sonu hecelemesi) */
function joinHyphenated(text: string): string {
  return text.replace(/(\p{Ll})-\n(\p{Ll})/gu, '$1$2');
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Metin sert satır kaydırılmış mı? Satırların çoğu noktalamasız bitiyor ve
 * uzunlukları birbirine yakınsa öyle kabul ediyoruz.
 */
function looksHardWrapped(lines: string[]): boolean {
  const content = lines.filter((line) => line.trim().length > 0);
  if (content.length < 3) return false;

  const lengths = content.map((line) => line.trim().length);
  const mid = median(lengths);
  if (mid < 25 || mid > 110) return false;

  // Sert kaydırılmış düzyazıda bir cümle ortalama 1,5 satır sürer; yani
  // satırların yarısından fazlası noktalamasız biter. Yukarıdaki uzunluk
  // aralığı, "her paragraf tek satır" biçimindeki metinleri zaten dışladığı
  // için bu eşikte cömert olabiliyoruz.
  const unterminated = content.filter((line) => !SENTENCE_END.test(line.trim())).length;
  return unterminated / content.length >= 0.45;
}

export function normalizeText(raw: string): string {
  const cleaned = joinHyphenated(stripInvisible(raw));
  const lines = cleaned.split('\n');

  if (!looksHardWrapped(lines)) {
    return cleaned
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const contentLengths = lines.filter((l) => l.trim().length > 0).map((l) => l.trim().length);
  const mid = median(contentLengths);
  // Ortalamanın belirgin altında kalan satırlar başlık, liste ya da şiir
  // dizesidir; onları birleştirmek yerine kendi paragrafı yapıyoruz
  const standaloneLimit = mid * 0.6;

  const paragraphs: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) {
      paragraphs.push(current.join(' '));
      current = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flush();
      continue;
    }
    if (line.length < standaloneLimit) {
      // Kısa satır: içeriği kapatır ve tek başına paragraf olur
      current.push(line);
      flush();
      continue;
    }
    current.push(line);
  }
  flush();

  return paragraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Kelime sayısı — kütüphane künyesi ve istatistikler için. */
export function countWordsInText(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export interface JoinedChapter {
  title: string;
  /** Birleştirilmiş metindeki başlangıç karakter konumu */
  charOffset: number;
}

/**
 * Bölümleri tek metne birleştirir ve her bölümün karakter konumunu döndürür.
 *
 * Neden burada: her bölüm **ayrı ayrı** normalleştirilip sonra birleştiriliyor.
 * Önce birleştirip sonra normalleştirmek konumları kaydırırdı (sarmalanmış
 * satırlar açılırken metin kısalıyor), bölüm listesi de yanlış yere atlardı.
 */
export function joinChapters(
  chapters: { title: string; text: string }[]
): { text: string; chapters: JoinedChapter[] } {
  const separator = '\n\n';
  const pieces: string[] = [];
  const marks: JoinedChapter[] = [];
  let offset = 0;

  for (const chapter of chapters) {
    const text = normalizeText(chapter.text);
    if (!text.trim()) continue;
    marks.push({ title: chapter.title, charOffset: offset });
    pieces.push(text);
    offset += text.length + separator.length;
  }

  return { text: pieces.join(separator), chapters: marks };
}
