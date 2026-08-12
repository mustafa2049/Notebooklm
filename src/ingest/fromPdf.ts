import { PdfNotSupportedError, type ExtractedDocument } from './types';

/**
 * PDF çıkarımının **native (Android/iOS)** karşılığı.
 *
 * Web sürümü `fromPdf.web.ts` içinde pdf.js ile yazılmıştır; Metro paketi
 * oluştururken platforma göre doğru dosyayı seçer. Burada pdf.js'i import
 * etmiyoruz — etsek Android paketi hiç derlenmiyor (bkz. `PdfNotSupportedError`
 * açıklaması).
 */
export async function extractPdf(_data: Uint8Array): Promise<ExtractedDocument> {
  throw new PdfNotSupportedError();
}

export { NoTextLayerError, PdfNotSupportedError, type ExtractedDocument } from './types';
