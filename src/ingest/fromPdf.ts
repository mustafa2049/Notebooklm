import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
// Worker modülünü statik olarak alıp global'e koyuyoruz. Sebep: pdf.js normalde
// worker dosyasını `import(workerSrc)` ile dinamik yükler; Metro dinamik yol
// çözemediği için bu başarısız olur. pdf.js `globalThis.pdfjsWorker` varsa
// doğrudan onu kullanıyor — böylece paketleyiciye worker URL'i tanıtmak
// gerekmiyor. Karşılığında ayrıştırma ana iş parçacığında çalışır; büyük
// PDF'lerde arayüz kısa süre takılabilir.
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

import { normalizeText } from './normalize';

(globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = pdfjsWorker;
// pdf.js bu alan boşsa hata atıyor; gerçek worker kullanılmadığı için değeri önemsiz
pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.mjs';

export class NoTextLayerError extends Error {
  constructor() {
    super(
      'Bu PDF’de metin katmanı yok — taranmış (fotoğraf) bir belge olabilir. ' +
        'Metin tanıma (OCR) uygulama içinde yapılmıyor.'
    );
    this.name = 'NoTextLayerError';
  }
}

export interface ExtractedDocument {
  title?: string;
  text: string;
}

/**
 * PDF'den metin çıkarır.
 *
 * Satır sonlarını pdf.js'in `hasEOL` bilgisinden, paragraf sonlarını ise dikey
 * boşluk sıçramasından tespit ediyoruz: iki satır arası, o sayfadaki tipik
 * satır yüksekliğinin belirgin üstündeyse yeni paragraf sayılır.
 */
export async function extractPdf(data: Uint8Array): Promise<ExtractedDocument> {
  const doc = await pdfjs.getDocument({
    data,
    // Görsel çizim yapmıyoruz; font yüklemeye gerek yok
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    let out = '';
    let previousY: number | null = null;
    const gaps: number[] = [];

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform?.[5] ?? null;

      if (previousY !== null && y !== null) {
        const gap = previousY - y;
        if (gap > 0) gaps.push(gap);
      }

      out += item.str;
      if (item.hasEOL) {
        // Tipik satır aralığının 1,6 katından büyük boşluk = paragraf sonu
        const typical = median(gaps);
        const gap = previousY !== null && y !== null ? previousY - y : 0;
        out += typical > 0 && gap > typical * 1.6 ? '\n\n' : '\n';
      }
      if (y !== null) previousY = y;
    }

    pages.push(out);
    page.cleanup();
  }

  const raw = pages.join('\n\n');
  const pageCount = doc.numPages;
  const title = await safeMetadata(doc);
  await doc.loadingTask.destroy();

  // Sayfa başına ortalama 20 karakterden az metin = metin katmanı yok
  if (raw.replace(/\s/g, '').length < pageCount * 20) throw new NoTextLayerError();

  return { title, text: normalizeText(raw) };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function safeMetadata(doc: pdfjs.PDFDocumentProxy): Promise<string | undefined> {
  try {
    const info = await doc.getMetadata();
    const title = (info.info as { Title?: string } | undefined)?.Title?.trim();
    return title && title.length > 0 ? title : undefined;
  } catch {
    return undefined;
  }
}
