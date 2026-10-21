#!/usr/bin/env node
/**
 * Klasiklerin metinlerini uygulamaya gömmek için Vikikaynak'tan indirir.
 *
 *   node scripts/fetch-classics.mjs [--force]
 *
 * Liste `src/content/classics.ts`'ten okunur. Her eserin işlenmiş HTML'i
 * (`action=render`: yalnızca içerik, site çerçevesi yok) `assets/classics/`
 * altına `.txt` uzantısıyla yazılır (Metro `.txt`'yi varlık olarak paketliyor)
 * ve `src/content/classicAssets.ts` haritası üretilir. Uygulama içe aktarırken
 * bu HTML'i çevrimiçi yoldaki `htmlToText`'ten geçirir: sonuç aynı.
 *
 * Vikikaynak'ın hız sınırına takılmamak için istekler arası 20 sn; inmiş
 * dosyalar yeniden indirilmez (`--force` hariç).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(root, 'assets', 'classics');
const MAP = path.join(root, 'src', 'content', 'classicAssets.ts');
const DELAY_MS = 20_000;
const USER_AGENT = 'HizliOkuma/1.3 (Turkce hizli okuma uygulamasi; klasikleri cihaza gomme)';

/** classics.ts'teki bağlantılar: `url: \`${BASE}Sayfa_Adı\`` */
export function classicPages(source) {
  return [...source.matchAll(/url: `\$\{BASE\}([^`]+)`/g)].map((match) => match[1]);
}

/** Dosya adı: Türkçe harfler sadeleşir ("Pembe_İncili_Kaftan" → "pembe-incili-kaftan") */
export function slugOf(page) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return page
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (ch) => map[ch])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Açılış etiketi `test`e uyan öğeleri içerikleriyle birlikte siler (iç içe
 * aynı etiketler sayılarak kapanışı bulunur).
 */
export function removeElements(html, test) {
  let out = '';
  let cursor = 0;
  const open = /<([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g;
  for (let match = open.exec(html); match; match = open.exec(html)) {
    const [whole, tag, attrs, selfClosing] = match;
    if (match.index < cursor || !test(tag.toLowerCase(), attrs)) continue;
    out += html.slice(cursor, match.index);
    let end = match.index + whole.length;
    if (!selfClosing) {
      const pattern = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi');
      pattern.lastIndex = end;
      let depth = 1;
      for (let next = pattern.exec(html); next; next = pattern.exec(html)) {
        if (next[1]) depth--;
        else if (!next[2]) depth++;
        if (depth === 0) {
          end = next.index + next[0].length;
          break;
        }
      }
      if (depth !== 0) end = html.length;
    }
    cursor = end;
    open.lastIndex = end;
  }
  return out + html.slice(cursor);
}

/** Vikikaynak çerçevesi: başlık kutusu, gizli künye, dipnot işaretleri ve listesi, telif kutusu */
const CHROME = [
  // ws-noexport: Vikikaynak'ın kendi "dışa aktarılmaz" işareti (başlık kutusu, künye)
  /class="[^"]*\b(ws-noexport|headerContainer|ws-data|licenseContainer|licensetpl|reflist|mw-references)\b/,
  /class="[^"]*\bmw-ref\b/,
  /\bid="(headerContainer|ws-data)"/,
  /display:\s*none/,
  // Kalıplar: başlık ve son kutusu, "sayfa başı" bağlantısı, Osmanlıca sürüm notu
  /Şablon:(Eser_son|Eser_başlığı|Sayfa_başı|Osmanlıca)"/,
];

/** Dipnot başlıkları ("Kaynakça") listeleri silinince başlıksız kalmasın */
const NOTE_HEADINGS = /<div class="mw-heading[^"]*"><h\d[^>]*>\s*(Kaynakça|Kaynaklar|Notlar|Dipnotlar)\s*<\/h\d><\/div>/g;

/** Gereksiz kısımlar: Vikikaynak çerçevesi, ayrıştırıcı raporu yorumları, yedek kimlikler */
export function slimHtml(html) {
  const withoutChrome = removeElements(html.replace(/<!--[\s\S]*?-->/g, ''), (_tag, attrs) =>
    CHROME.some((pattern) => pattern.test(attrs))
  );
  return withoutChrome
    .replace(NOTE_HEADINGS, '')
    .replace(/<span[^>]*typeof="mw:FallbackId"[^>]*><\/span>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderMap(entries) {
  const lines = entries.map(
    ({ page, file }) => `  [\`\${BASE}${page}\`]: require('../../assets/classics/${file}'),`
  );
  return `// Üretildi: scripts/fetch-classics.mjs — elle düzenleme.
/* eslint-disable @typescript-eslint/no-require-imports */

const BASE = 'https://tr.wikisource.org/wiki/';

/**
 * Klasiklerin cihazdaki kopyaları: Vikikaynak bağlantısı → varlık (işlenmiş
 * HTML, \`.txt\` uzantılı). İçe aktarma internetsiz çalışsın diye.
 */
export const CLASSIC_ASSETS: Record<string, number> = {
${lines.join('\n')}
};
`;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function download(page) {
  const url = `https://tr.wikisource.org/w/index.php?title=${encodeURIComponent(page)}&action=render`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (response.ok) return await response.text();
      console.warn(`  HTTP ${response.status}, yeniden denenecek`);
    } catch (error) {
      console.warn(`  ağ hatası (${error.message}), yeniden denenecek`);
    }
    await wait(DELAY_MS * (attempt + 1));
  }
  throw new Error(`${page} indirilemedi`);
}

async function main() {
  const force = process.argv.includes('--force');
  const pages = classicPages(fs.readFileSync(path.join(root, 'src', 'content', 'classics.ts'), 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  const entries = [];
  let fetched = 0;
  for (const page of pages) {
    const file = `${slugOf(page)}.txt`;
    const target = path.join(OUT, file);
    if (force || !fs.existsSync(target) || fs.statSync(target).size === 0) {
      if (fetched > 0) await wait(DELAY_MS);
      console.log(`İndiriliyor: ${page}`);
      const html = slimHtml(await download(page));
      if (html.length < 500) throw new Error(`${page}: içerik çok kısa (${html.length} karakter)`);
      fs.writeFileSync(target, `${html}\n`);
      fetched += 1;
    } else {
      // İnmiş dosya yeniden indirilmez; temizlik kuralları değiştiyse yeniden uygulanır
      fs.writeFileSync(target, `${slimHtml(fs.readFileSync(target, 'utf8'))}\n`);
    }
    entries.push({ page, file });
  }
  fs.writeFileSync(MAP, renderMap(entries));
  const bytes = entries.reduce((sum, { file }) => sum + fs.statSync(path.join(OUT, file)).size, 0);
  console.log(`${entries.length} eser (${fetched} yeni indirildi), toplam ${(bytes / 1024).toFixed(0)} KB.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
