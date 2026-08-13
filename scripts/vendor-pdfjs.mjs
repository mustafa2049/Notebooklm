#!/usr/bin/env node
/**
 * pdf.js'i WebView köprüsü için varlık olarak kopyalar.
 *
 * Telefon paketinde pdf.js **yok** (Hermes onu derleyemiyor), bu yüzden kod
 * gizli bir WebView'de çalışıyor. WebView'in koda erişebilmesi için dosyaların
 * uygulama varlığı olarak paketlenmesi gerekiyor; Metro `.mjs`'i kaynak dosya
 * saydığı için `.txt` uzantısıyla kopyalanıyorlar (bkz. metro.config.js).
 *
 * Alternatifler ve neden seçilmedi:
 * - CDN'den indirmek: PDF açmak internete ve üçüncü bir tarafa bağlı olurdu.
 * - node_modules'tan çalışma anında okumak: telefonda node_modules yok.
 *
 * Kullanım: npm run vendor:pdfjs
 */
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(root, 'node_modules/pdfjs-dist/legacy/build');
const to = resolve(root, 'assets/pdfjs');

const files = [
  ['pdf.min.mjs', 'pdf.min.txt'],
  ['pdf.worker.min.mjs', 'pdf.worker.min.txt'],
];

mkdirSync(to, { recursive: true });
for (const [source, target] of files) {
  copyFileSync(resolve(from, source), resolve(to, target));
  const size = statSync(resolve(to, target)).size;
  console.log(`${target}: ${(size / 1024).toFixed(0)} KB`);
}
console.log('pdf.js varlıkları güncellendi.');
