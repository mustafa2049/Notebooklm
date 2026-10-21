#!/usr/bin/env node
/**
 * Çevrimdışı sözlüğü Vikisözlük dökümünden üretir.
 *
 *   curl -O https://dumps.wikimedia.org/trwiktionary/latest/trwiktionary-latest-pages-articles.xml.bz2
 *   node scripts/dict/build-dictionary.mjs trwiktionary-latest-pages-articles.xml.bz2 --date 2026-10-01
 *
 * Döküm (~70 MB, açılınca ~1,3 GB) depoya girmez; `bzip2 -dc` ile akış
 * hâlinde okunur. Çıktı: `assets/dict/<harf>.txt` dilimleri (satır başına
 * `kelime\ttür\tanlam␟anlam`), `assets/dict/meta.json` ve dilimlerin statik
 * `require` haritası `src/ingest/dictShards.ts`. Lisans: Vikisözlük metinleri
 * CC BY-SA 4.0 — dilimler de bu lisansla dağıtılır (README).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { acceptTitle, formatEntry, parseSection, shardOf, turkishSection } from './wikitext.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'assets', 'dict');
const MAP = path.join(root, 'src', 'ingest', 'dictShards.ts');

const decodeXml = (text) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

/** Dökümün sayfaları: { title, ns, text } (satır satır, bellek şişmeden) */
async function* pages(dump) {
  const unzip = spawn('bzip2', ['-dc', dump]);
  const lines = readline.createInterface({ input: unzip.stdout, crlfDelay: Infinity });
  let title = '';
  let ns = '';
  let text = null;
  for await (const line of lines) {
    if (text === null) {
      if (line.includes('<title>')) title = decodeXml(line.replace(/.*<title>(.*)<\/title>.*/, '$1'));
      else if (line.includes('<ns>')) ns = line.replace(/.*<ns>(.*)<\/ns>.*/, '$1');
      else if (line.includes('<text')) {
        if (line.includes('/>') && !line.includes('</text>')) continue; // boş metin
        const first = line.replace(/.*<text[^>]*>/, '');
        if (line.includes('</text>')) yield { title, ns, text: decodeXml(first.replace(/<\/text>.*/, '')) };
        else text = [first];
      }
      continue;
    }
    if (line.includes('</text>')) {
      text.push(line.replace(/<\/text>.*/, ''));
      yield { title, ns, text: decodeXml(text.join('\n')) };
      text = null;
    } else {
      text.push(line);
    }
  }
}

export function renderShardMap(shards) {
  const lines = shards.map((id) => `  ${JSON.stringify(id)}: require('../../assets/dict/${id}.txt'),`);
  return `// Üretildi: scripts/dict/build-dictionary.mjs — elle düzenleme.
/* eslint-disable @typescript-eslint/no-require-imports */

/** Çevrimdışı sözlüğün harf dilimleri (bkz. \`offlineDict\`) */
export const DICT_SHARDS: Record<string, number> = {
${lines.join('\n')}
};
`;
}

async function main() {
  const args = process.argv.slice(2);
  const dump = args.find((arg) => !arg.startsWith('--'));
  const dateIndex = args.indexOf('--date');
  const date = dateIndex >= 0 ? args[dateIndex + 1] : new Date().toISOString().slice(0, 10);
  if (!dump || !fs.existsSync(dump)) {
    console.error('Kullanım: node scripts/dict/build-dictionary.mjs <döküm.xml.bz2> [--date YYYY-AA-GG]');
    process.exit(2);
  }

  const shards = new Map();
  let words = 0;
  let entries = 0;
  let meanings = 0;
  for await (const page of pages(dump)) {
    if (page.ns !== '0' || !acceptTitle(page.title)) continue;
    const section = turkishSection(page.text);
    if (!section) continue;
    const parsed = parseSection(section);
    if (!parsed.length) continue;
    words += 1;
    const id = shardOf(page.title);
    const list = shards.get(id) ?? [];
    for (const entry of parsed) {
      list.push(formatEntry(page.title, entry));
      entries += 1;
      meanings += entry.meanings.length;
    }
    shards.set(id, list);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const ids = [...shards.keys()].sort();
  let bytes = 0;
  for (const id of ids) {
    // Kararlı çıktı: aynı dökümden aynı dosyalar (git farkı anlamlı kalsın)
    const lines = shards.get(id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const content = `${lines.join('\n')}\n`;
    fs.writeFileSync(path.join(OUT, `${id}.txt`), content);
    bytes += Buffer.byteLength(content);
  }
  const meta = {
    source: 'Vikisözlük (tr.wiktionary.org)',
    dump: path.basename(dump),
    date,
    license: 'CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/',
    words,
    entries,
    meanings,
  };
  fs.writeFileSync(path.join(OUT, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  fs.writeFileSync(MAP, renderShardMap(ids));
  console.log(`${words} kelime, ${entries} madde, ${meanings} anlam; ${ids.length} dilim, ${(bytes / 1048576).toFixed(1)} MB.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
