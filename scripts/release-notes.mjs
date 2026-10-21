#!/usr/bin/env node
/**
 * CHANGELOG.md'den bir sürümün notlarını çıkarır (GitHub Release metni).
 *
 *   node scripts/release-notes.mjs 1.3.0 > notes.md
 *
 * Bölüm `## <sürüm>` başlığıyla başlar (yanında tarih olabilir), bir sonraki
 * `## ` başlığına kadar sürer. Bulunamazsa hata verir: notsuz sürüm
 * yayınlanmasın.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function releaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = lines.findIndex((line) => new RegExp(`^## ${escaped}(\\s|$)`).test(line));
  if (start < 0) return null;
  let end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  if (!version) {
    console.error('Kullanım: node scripts/release-notes.mjs <sürüm>');
    process.exit(2);
  }
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const notes = releaseNotes(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), version);
  if (!notes) {
    console.error(`CHANGELOG.md içinde "## ${version}" bölümü yok.`);
    process.exit(1);
  }
  process.stdout.write(`${notes}\n`);
}
