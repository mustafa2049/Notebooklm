import { normalizeText } from './normalize';
import { NoTextLayerError, type ExtractedDocument } from './types';

/**
 * PDF metin öğelerinden okunabilir metin üretimi — saf, testli, pdf.js'ten
 * bağımsız.
 *
 * Neden ayrı dosya: aynı algoritma iki yerden besleniyor. Web'de pdf.js
 * doğrudan bu uygulamada çalışıyor, telefonda ise gizli bir WebView'de çalışıp
 * öğeleri JSON olarak geri gönderiyor. Algoritma tek yerde durunca iki yol
 * arasında davranış farkı olmuyor ve test edilebiliyor.
 */

export interface PdfTextItem {
  str: string;
  /** pdf.js bu öğeden sonra satır bittiğini söylüyor mu */
  hasEOL: boolean;
  /** Öğenin dikey konumu (transform[5]); yoksa null */
  y: number | null;
}

export interface PdfPages {
  pages: PdfTextItem[][];
  title?: string;
}

/**
 * Satır sonlarını pdf.js'in `hasEOL` bilgisinden, paragraf sonlarını ise dikey
 * boşluk sıçramasından çıkarıyoruz: iki satır arası, o sayfadaki tipik satır
 * yüksekliğinin belirgin üstündeyse yeni paragraf sayılır.
 */
export function pagesToDocument(input: PdfPages): ExtractedDocument {
  const pages: string[] = [];

  for (const items of input.pages) {
    let out = '';
    let previousY: number | null = null;
    let atLineStart = true;
    const gaps: number[] = [];

    for (const item of items) {
      const y = item.y;
      const gap = previousY !== null && y !== null ? previousY - y : 0;
      if (gap > 0) gaps.push(gap);

      /*
       * Büyük dikey boşluk, **bu satırdan önce** paragraf değiştiğini söylüyor;
       * boşluğu satırın sonuna eklemek paragraf sınırını bir satır kaydırırdı.
       * Bu yüzden ayırıcı, yeni satırın başında ekleniyor.
       */
      if (atLineStart && out) {
        const typical = median(gaps);
        if (typical > 0 && gap > typical * 1.6) out += '\n';
      }

      out += item.str;
      if (item.hasEOL) {
        out += '\n';
        atLineStart = true;
      } else {
        atLineStart = false;
      }
      if (y !== null) previousY = y;
    }

    pages.push(out);
  }

  const raw = pages.join('\n\n');

  // Sayfa başına ortalama 20 karakterden az metin = metin katmanı yok
  if (raw.replace(/\s/g, '').length < input.pages.length * 20) throw new NoTextLayerError();

  return { title: input.title, text: normalizeText(raw) };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
