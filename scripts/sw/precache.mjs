/**
 * Service worker önbellek listesi: derleme çıktısındaki dosyalardan hangisi,
 * hangi adresle saklanacak ve sürüm kimliği. Saf fonksiyonlar (testli);
 * dosya sistemine yalnızca `listFiles` dokunur.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Önbelleğe alınmayanlar: service worker'ın kendisi, sunucu ayarları, derleme bilgisi */
export const SKIP = new Set(['sw.js', 'metadata.json', '_redirects', '_headers']);

/**
 * Adında içerik özeti olan dosya: içeriği değişirse adı da değişir.
 * "entry-0123…cdef.js", "font.0123…cdef.ttf", "icon.0123…cdef@2x.png"
 */
export const HASHED = /[.-][0-9a-f]{20,}(@\dx)?\.\w+$/;

/** Uygulama kabuğu her adreste açılan sayfa; "/" adresiyle saklanır */
const SHELL_FILE = 'index.html';

/** @returns {{ path: string, content: Buffer }[]} `dir` altındaki bütün dosyalar, "/" ayraçlı */
export function listFiles(dir) {
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        files.push({ path: relative(dir, full).split(sep).join('/'), content: readFileSync(full) });
      }
    }
  };
  walk(dir);
  return files;
}

/**
 * @param {{ path: string, content: Buffer | string }[]} files
 * @returns {{ url: string, hashed: boolean, digest: string, bytes: number }[]} adrese göre sıralı
 */
export function precacheEntries(files) {
  return files
    .filter((file) => !SKIP.has(file.path) && !file.path.endsWith('.map'))
    .map((file) => ({
      url: file.path === SHELL_FILE ? '/' : encodeURI(`/${file.path}`),
      hashed: HASHED.test(file.path),
      digest: createHash('sha256').update(file.content).digest('hex'),
      bytes: Buffer.byteLength(file.content),
    }))
    .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
}

/** Bütün dosyaların içeriğinden türeyen kısa kimlik: aynı derleme → aynı sürüm */
export function buildVersion(entries) {
  const hash = createHash('sha256');
  for (const entry of entries) hash.update(`${entry.url} ${entry.digest}\n`);
  return hash.digest('hex').slice(0, 16);
}

const TOKENS = ["'__VERSION__'", '__PRECACHE__', '__HASHED__'];

/** Şablondaki yer tutucuları doldurur; şablon bozuksa (eksik/çift yer tutucu) hata verir */
export function renderServiceWorker(template, entries) {
  for (const token of TOKENS) {
    const count = template.split(token).length - 1;
    if (count !== 1) throw new Error(`Şablonda ${token} bir kez geçmeli (${count} kez geçiyor)`);
  }
  const version = buildVersion(entries);
  const precache = JSON.stringify(entries.map((entry) => [entry.url, entry.hashed ? 1 : 0]));
  const code = template
    .replace("'__VERSION__'", JSON.stringify(version))
    .replace('__PRECACHE__', precache)
    .replace('__HASHED__', HASHED.toString());
  return { code, version };
}
