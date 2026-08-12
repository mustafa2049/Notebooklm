/**
 * pdf.js worker modülünün tip bildirimi.
 *
 * Bu modülü yalnızca `globalThis.pdfjsWorker` üzerine koymak için statik olarak
 * import ediyoruz (bkz. `src/ingest/fromPdf.ts`); içindeki API'yi doğrudan
 * çağırmadığımız için gövdesiz bildirim yeterli.
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';
