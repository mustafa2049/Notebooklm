import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { htmlToText } from '@/ingest/html2text';
import { normalizeText } from '@/ingest/normalize';
import { CLASSICS } from './classics';

const root = path.resolve(import.meta.dirname, '../..');
const map = fs.readFileSync(path.join(root, 'src/content/classicAssets.ts'), 'utf8');

/** classicAssets.ts'teki eşleme: sayfa adı → dosya (require'ı Node'da çalıştırmadan) */
const files = new Map(
  [...map.matchAll(/\[`\$\{BASE\}([^`]+)`\]: require\('\.\.\/\.\.\/assets\/classics\/([^']+)'\)/g)].map((match) => [
    match[1],
    match[2],
  ])
);

describe('gömülü klasikler', () => {
  it('listedeki her eserin uygulamada kopyası var', () => {
    for (const classic of CLASSICS) {
      const page = classic.url.replace('https://tr.wikisource.org/wiki/', '');
      const file = files.get(page);
      expect(file, classic.title).toBeTruthy();
      expect(fs.statSync(path.join(root, 'assets/classics', file!)).size, classic.title).toBeGreaterThan(1000);
    }
  });

  it('metne çevrilince Vikikaynak çerçevesi kalmıyor, eserin metni var', () => {
    for (const classic of CLASSICS) {
      const page = classic.url.replace('https://tr.wikisource.org/wiki/', '');
      const html = fs.readFileSync(path.join(root, 'assets/classics', files.get(page)!), 'utf8');
      const text = normalizeText(htmlToText(html));
      expect(text.length, classic.title).toBeGreaterThan(1500);
      for (const junk of ['Sayfa başı', 'Vikikaynak', 'Telif durumu', 'Public domain', '↑']) {
        expect(text.includes(junk), `${classic.title}: ${junk}`).toBe(false);
      }
    }
  });

  it('Kaşağı baştan sona', () => {
    const text = normalizeText(htmlToText(fs.readFileSync(path.join(root, 'assets/classics/kasagi.txt'), 'utf8')));
    expect(text).toContain('Ahırın avlusunda oynarken');
    expect(text.trim().endsWith('Babamın dışarıya çıkmasını bekliyorlardı.')).toBe(true);
  });
});
