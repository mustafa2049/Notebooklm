#!/usr/bin/env node
/**
 * Web derlemesine service worker ekler: `dist/sw.js`.
 *
 * `expo export -p web` çıktısındaki dosyaları içerik özetleriyle listeler ve
 * `scripts/sw/template.js` şablonuna yazar. Uygulama telefona/tarayıcıya
 * kaydedilir; sonraki açılışlarda internet olmadan da çalışır.
 *
 * Alternatifler ve neden seçilmedi:
 * - Workbox: işi aynı, ama yeni bir bağımlılık ve derleme adımı; bu
 *   uygulamanın ihtiyacı (tek sayfa, karma adlı dosyalar) birkaç düzine satır.
 * - Liste olmadan çalışırken önbelleğe almak: ilk açılıştaki dosyalar service
 *   worker devreye girmeden indiği için ikinci açılışa kadar çevrimdışı
 *   çalışmazdı; PDF okuyucu gibi sonradan yüklenen parçalar hiç gelmeyebilirdi.
 *
 * Kullanım: `npm run build:web` sonunda kendiliğinden çalışır.
 *           Elle: node scripts/generate-sw.mjs [klasör=dist]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles, precacheEntries, renderServiceWorker } from './sw/precache.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.argv[2] ?? 'dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`${dist}/index.html yok: önce "expo export -p web" çalışmalı.`);
  process.exit(1);
}

const entries = precacheEntries(listFiles(dist));
const template = readFileSync(resolve(root, 'scripts/sw/template.js'), 'utf8');
const { code, version } = renderServiceWorker(template, entries);
writeFileSync(join(dist, 'sw.js'), code);

const bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(
  `sw.js yazıldı: sürüm ${version}, ${entries.length} dosya (${(bytes / 1024 / 1024).toFixed(1)} MB) çevrimdışı önbelleğe alınacak.`,
);
