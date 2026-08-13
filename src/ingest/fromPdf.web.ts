import type * as Pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { normalizeText } from './normalize';
import { NoTextLayerError, type ExtractedDocument } from './types';

/**
 * pdf.js **kullanıldığında** yükleniyor.
 *
 * Paketin sıkıştırılmamış boyutu tek başına birkaç megabayt; uygulamayı açan
 * herkese ödetmek yerine yalnızca PDF içe aktaran kullanıcı bekliyor. İlk
 * çağrıda yüklenip saklanıyor, sonraki çağrılar anında dönüyor.
 */
let loading: Promise<typeof Pdfjs> | null = null;

function loadPdfjs(): Promise<typeof Pdfjs> {
  loading ??= (async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Worker modülünü alıp global'e koyuyoruz. Sebep: pdf.js normalde worker
    // dosyasını `import(workerSrc)` ile dinamik yükler; Metro çalışma anında
    // üretilen bu yolu çözemediği için başarısız olur. pdf.js
    // `globalThis.pdfjsWorker` varsa doğrudan onu kullanıyor — böylece
    // paketleyiciye worker URL'i tanıtmak gerekmiyor. Karşılığında ayrıştırma
    // ana iş parçacığında çalışır; çok büyük PDF'lerde arayüz kısa süre takılır.
    const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    (globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = pdfjsWorker;
    // pdf.js bu alan boşsa hata atıyor; gerçek worker kullanılmadığı için değeri önemsiz
    pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.mjs';
    return pdfjs as unknown as typeof Pdfjs;
  })();
  return loading;
}

/**
 * PDF'den metin çıkarır (yalnızca web).
 *
 * Satır sonlarını pdf.js'in `hasEOL` bilgisinden, paragraf sonlarını ise dikey
 * boşluk sıçramasından tespit ediyoruz: iki satır arası, o sayfadaki tipik
 * satır yüksekliğinin belirgin üstündeyse yeni paragraf sayılır.
 */
export async function extractPdf(data: Uint8Array): Promise<ExtractedDocument> {
  const pdfjs = await loadPdfjs();
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

async function safeMetadata(doc: Pdfjs.PDFDocumentProxy): Promise<string | undefined> {
  try {
    const info = await doc.getMetadata();
    const title = (info.info as { Title?: string } | undefined)?.Title?.trim();
    return title && title.length > 0 ? title : undefined;
  } catch {
    return undefined;
  }
}

export { NoTextLayerError, PdfNotSupportedError, type ExtractedDocument } from './types';
