import { wrapLines } from './svgText';

/**
 * Kitap kapakları — saf, testli.
 *
 * Kapağı olmayan kitaba başlıktan bir kapak üretilir: renk başlıktan türetilir
 * (aynı kitap her yerde aynı renkte görünsün), başlık satırlara bölünür.
 * EPUB içindeki kapak ve Open Library araması ayrıca (bkz. `storage/covers`).
 */

export interface CoverPalette {
  bg: string;
  fg: string;
  accent: string;
}

/** Koyu ve açık temada da okunur, birbirinden ayırt edilir renkler */
export const COVER_PALETTES: CoverPalette[] = [
  { bg: '#2F4858', fg: '#F6F1E7', accent: '#F2A65A' },
  { bg: '#7A2E2E', fg: '#FBEFE3', accent: '#E9C46A' },
  { bg: '#264D3B', fg: '#EEF5EC', accent: '#C9E4A6' },
  { bg: '#3D348B', fg: '#F1EEFF', accent: '#F7B801' },
  { bg: '#E9DCC4', fg: '#3B2F22', accent: '#A0522D' },
  { bg: '#1D3557', fg: '#F1FAEE', accent: '#E63946' },
  { bg: '#5C4033', fg: '#F7EBDD', accent: '#D4A373' },
  { bg: '#D8E2DC', fg: '#2B3A42', accent: '#6D597A' },
];

/** Basit, kararlı dize özeti (FNV-1a) */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface GeneratedCover {
  palette: CoverPalette;
  /** Başlık satırları (en çok 4) */
  lines: string[];
  /** Başlık uzunluğuna göre yazı boyutu çarpanı (1 = normal) */
  scale: number;
}

/** Başlıktan kapak: renk ve satırlar */
export function generatedCover(title: string): GeneratedCover {
  const clean = title.replace(/\s+/g, ' ').trim() || 'Adsız';
  const palette = COVER_PALETTES[hashString(clean.toLocaleLowerCase('tr')) % COVER_PALETTES.length];
  const long = clean.length > 40;
  const lines = wrapLines(clean, long ? 14 : 11, 4);
  return { palette, lines, scale: long ? 0.8 : clean.length > 20 ? 0.9 : 1 };
}

/** Open Library arama yanıtından kapak adresleri (en çok `limit`) */
export function openLibraryCovers(body: unknown, limit = 6): string[] {
  const docs = (body as { docs?: unknown })?.docs;
  if (!Array.isArray(docs)) return [];
  const ids: number[] = [];
  for (const doc of docs) {
    const id = (doc as { cover_i?: unknown })?.cover_i;
    if (typeof id === 'number' && Number.isInteger(id) && id > 0 && !ids.includes(id)) ids.push(id);
    if (ids.length >= limit) break;
  }
  return ids.map((id) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`);
}

/** Open Library arama adresi: başlıktaki dosya uzantısı ve parantezler atılır */
export function openLibrarySearchUrl(title: string): string {
  const clean = title
    .replace(/\.(epub|pdf|docx|txt)$/i, '')
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `https://openlibrary.org/search.json?title=${encodeURIComponent(clean)}&fields=cover_i,title&limit=10`;
}

/**
 * OPF'den kapak görselinin manifest yolu: EPUB 3 `properties="cover-image"`,
 * EPUB 2 `<meta name="cover" content="id">`. Bulunamazsa `null`.
 */
export function epubCoverHref(opf: string): string | null {
  const items = [...opf.matchAll(/<item\b[^>]*>/gi)].map((match) => match[0]);
  const attr = (tag: string, name: string) =>
    tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];

  const byProperty = items.find((tag) => /\bcover-image\b/i.test(attr(tag, 'properties') ?? ''));
  if (byProperty) return attr(byProperty, 'href') ?? null;

  const meta = opf.match(/<meta\b[^>]*\bname\s*=\s*["']cover["'][^>]*>/i)?.[0];
  const id = meta ? attr(meta, 'content') : undefined;
  if (id) {
    const item = items.find((tag) => attr(tag, 'id') === id);
    const href = item ? attr(item, 'href') : undefined;
    if (href && /\.(jpe?g|png|gif|webp)$/i.test(href)) return href;
  }
  // Son çare: adı "cover" olan görsel
  const named = items.find(
    (tag) => /^image\//i.test(attr(tag, 'media-type') ?? '') && /cover/i.test(attr(tag, 'href') ?? '')
  );
  return named ? (attr(named, 'href') ?? null) : null;
}

/** Görsel türü uzantıdan */
export function imageMediaType(href: string): string {
  const ext = href.toLowerCase().split('.').pop();
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}
