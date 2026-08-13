import type * as Pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pagesToDocument, type PdfTextItem } from './pdfText';
import type { ExtractedDocument } from './types';

/**
 * PDF'den metin çıkarır (web).
 *
 * Bu dosyanın işi yalnızca pdf.js'i çalıştırıp **metin öğelerini** toplamak;
 * öğelerden okunabilir metin üretmek `pdfText.ts`'nin işi. Aynı algoritma
 * telefonda WebView köprüsünden gelen öğeler için de kullanılıyor.
 */

/**
 * pdf.js **kullanıldığında** yükleniyor.
 *
 * Paketin boyutu tek başına megabaytlarla ölçülüyor; uygulamayı açan herkese
 * ödetmek yerine yalnızca PDF içe aktaran kullanıcı bekliyor. İlk çağrıda
 * yüklenip saklanıyor, sonraki çağrılar anında dönüyor.
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

export async function extractPdf(data: Uint8Array): Promise<ExtractedDocument> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({
    data,
    // Görsel çizim yapmıyoruz; font yüklemeye gerek yok
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;

  const pages: PdfTextItem[][] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    const items: PdfTextItem[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      items.push({ str: item.str, hasEOL: Boolean(item.hasEOL), y: item.transform?.[5] ?? null });
    }

    pages.push(items);
    page.cleanup();
  }

  const title = await safeMetadata(doc);
  await doc.loadingTask.destroy();

  return pagesToDocument({ pages, title });
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
