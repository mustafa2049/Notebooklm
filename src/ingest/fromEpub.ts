import JSZip from 'jszip';
import { decodeEntities, htmlToText } from './html2text';
import { normalizeText } from './normalize';
import type { ExtractedDocument } from './fromPdf';

/**
 * EPUB'dan metin çıkarır.
 *
 * EPUB, içinde XHTML bölümleri olan bir ZIP arşividir. jszip saf JavaScript
 * olduğu için bu kod hem web'de hem telefonda aynı şekilde çalışır — PDF'de
 * olduğu gibi ayrı bir platform yoluna gerek yok.
 *
 * XML'i regex ile okuyoruz: React Native'de DOMParser yok ve OPF dosyaları
 * makine tarafından üretildiği için yapıları öngörülebilir.
 */
export async function extractEpub(data: Uint8Array): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(data);

  const opfPath = await findOpfPath(zip);
  if (!opfPath) throw new Error('EPUB bozuk görünüyor: içerik dosyası (OPF) bulunamadı.');

  const opf = await readFile(zip, opfPath);
  if (!opf) throw new Error('EPUB bozuk görünüyor: içerik dosyası okunamadı.');

  const basePath = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const manifest = parseManifest(opf);
  const spine = parseSpine(opf);

  const chapters: string[] = [];
  for (const id of spine) {
    const href = manifest.get(id);
    if (!href) continue;
    const file = await readFile(zip, resolvePath(basePath, href));
    if (!file) continue;
    const text = htmlToText(file);
    if (text.trim().length > 0) chapters.push(text);
  }

  if (chapters.length === 0) throw new Error('EPUB içinde okunabilir bölüm bulunamadı.');

  return {
    title: parseTitle(opf),
    text: normalizeText(chapters.join('\n\n')),
  };
}

async function readFile(zip: JSZip, path: string): Promise<string | null> {
  const entry = zip.file(path) ?? zip.file(decodeURIComponent(path));
  return entry ? entry.async('string') : null;
}

async function findOpfPath(zip: JSZip): Promise<string | null> {
  const container = await readFile(zip, 'META-INF/container.xml');
  const fromContainer = container?.match(/full-path\s*=\s*["']([^"']+)["']/i)?.[1];
  if (fromContainer) return fromContainer;

  // Bazı üreticiler container.xml'i eksik bırakıyor: arşivde .opf ara
  const candidate = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.opf'));
  return candidate ?? null;
}

/** manifest: id → href (yalnızca metin içeren bölümler) */
function parseManifest(opf: string): Map<string, string> {
  const manifest = new Map<string, string>();
  for (const match of opf.matchAll(/<item\b([^>]*)\/?>/gi)) {
    const attrs = match[1];
    const id = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    const type = attrs.match(/media-type\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
    if (!id || !href) continue;
    if (type.includes('xhtml') || type.includes('html') || /\.x?html?$/i.test(href)) {
      manifest.set(id, href);
    }
  }
  return manifest;
}

/** spine: bölümlerin okunma sırası */
function parseSpine(opf: string): string[] {
  const spineBlock = opf.match(/<spine\b[^>]*>([\s\S]*?)<\/spine>/i)?.[1] ?? opf;
  return [...spineBlock.matchAll(/<itemref\b[^>]*\bidref\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(
    (match) => match[1]
  );
}

function parseTitle(opf: string): string | undefined {
  const raw = opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1];
  if (!raw) return undefined;
  const title = decodeEntities(raw.replace(/<[^>]+>/g, '')).trim();
  return title.length > 0 ? title : undefined;
}

/** "OEBPS/" + "../images/x.html" gibi göreli yolları çözer. */
function resolvePath(base: string, href: string): string {
  const combined = `${base}${href}`.split('/');
  const stack: string[] = [];
  for (const part of combined) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}
