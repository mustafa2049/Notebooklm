#!/usr/bin/env node
/**
 * onnxruntime-web'i (kendi sesin motoru, yalnızca web) `public/ort/<sürüm>/`'a
 * kopyalar; Expo dışa aktarırken `dist/ort/...` olur, service worker
 * önbelleğe alır (internetsiz çalışsın).
 *
 * Neden paketlenmiyor: onnxruntime WASM'ını ve yükleyicisini çalışma anında
 * kendi adresinden indiriyor; Metro bu dinamik yüklemeyi paketleyemiyor.
 * Neden depoda değil: 14 MB'lık ikili dosya; `npm ci` zaten getiriyor.
 * Dosya adları içerik özeti taşımadığı için sürüm klasörde (uzun önbellek
 * güvenli). Sürüm `src/voice/backend.web.ts`'deki `ORT_VERSION` ile aynı olmalı.
 *
 * Kullanım: npm run vendor:ort (build:web ve web bunu kendisi çağırır)
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'node_modules/onnxruntime-web/package.json'), 'utf8'));
const backend = readFileSync(resolve(root, 'src/voice/backend.web.ts'), 'utf8');
const expected = backend.match(/ORT_VERSION = '([^']+)'/)?.[1];
if (expected !== pkg.version) {
  console.error(`onnxruntime-web ${pkg.version} kurulu, backend.web.ts ${expected} bekliyor.`);
  process.exit(1);
}

const from = resolve(root, 'node_modules/onnxruntime-web/dist');
const base = resolve(root, 'public/ort');
const to = resolve(base, pkg.version);
// Yalnızca WASM motoru (WebGPU/WebGL yok): UMD yükleyici + WASM ve onun yükleyicisi
const files = ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];

mkdirSync(to, { recursive: true });
// Eski sürüm klasörleri silinir
for (const entry of readdirSync(base, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name !== pkg.version) rmSync(resolve(base, entry.name), { recursive: true });
}
for (const file of files) {
  copyFileSync(resolve(from, file), resolve(to, file));
  console.log(`ort/${pkg.version}/${file}: ${(statSync(resolve(to, file)).size / 1024).toFixed(0)} KB`);
}
