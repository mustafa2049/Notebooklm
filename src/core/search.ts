import { trLower } from './turkish';

/**
 * Metinde arama — saf, testli.
 *
 * Kurallar:
 * - Büyük/küçük harf Türkçe kurallarıyla: "İSTANBUL" ↔ "istanbul", "IŞIK" ↔ "ışık".
 * - Boşluk farkı yok: satır sonu, çift boşluk, sekme hep tek boşluk sayılır.
 * - Aranan sözde Türkçe harf yoksa şapkasız/noktasız yazım da bulunur:
 *   "ogretmen" → "öğretmen" (telefonda Türkçe klavye olmadan yazılınca).
 *   Sözde Türkçe harf varsa yazıldığı gibi aranır: "ılık" "ilik"i bulmaz.
 *
 * Sonuçlar **özgün** metindeki konumlarla döner; okuyucu oraya atlayabilsin.
 */

export interface Normalized {
  text: string;
  /** Normalleştirilmiş metnin her karakterinin özgün metindeki konumu */
  offsets: number[];
}

/**
 * Metni aramaya uygun hâle getirir: boşluk dizileri tek boşluğa iner, harfler
 * Türkçe kurallarına göre küçültülür. Konum eşlemesi tutulur ki bulunan yerin
 * özgün metindeki karakter indeksi döndürülebilsin.
 */
export function normalizeForSearch(source: string): Normalized {
  let text = '';
  const offsets: number[] = [];
  let inSpace = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      if (!inSpace && text) {
        text += ' ';
        offsets.push(i);
        inSpace = true;
      }
      continue;
    }
    inSpace = false;
    const lowered = trLower(ch);
    // Bazı karakterler küçültüldüğünde uzunluk değiştirebilir; eşlemeyi
    // bozmamak için tek karaktere indiriyoruz.
    text += lowered.length === 1 ? lowered : lowered[0];
    offsets.push(i);
  }

  return { text, offsets };
}

/** Şapkasız/noktasız karşılıklar; her harf tek harfe gider (konumlar bozulmaz) */
const FOLD: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};
const TURKISH_LETTERS = /[çğıöşüâîûÇĞİÖŞÜÂÎÛ]/;

function fold(text: string): string {
  let out = '';
  for (const ch of text) out += FOLD[ch] ?? ch;
  return out;
}

export interface SearchHit {
  /** Eşleşmenin özgün metindeki başlangıcı */
  start: number;
  /** Özgün metindeki bitişi (hariç) */
  end: number;
  /** Eşleşmeden önceki ve sonraki birkaç kelime (boşluklar sadeleşmiş) */
  before: string;
  match: string;
  after: string;
}

export interface SearchResult {
  hits: SearchHit[];
  /** Bütün eşleşmelerin sayısı (gösterilenlerden fazla olabilir) */
  total: number;
}

/** Bundan fazla sonuç listelenmez (sayısı yine söylenir) */
export const MAX_HITS = 200;
/** Aranan söz bundan kısaysa arama yapılmaz: tek harf her yerde geçer */
export const MIN_QUERY = 2;
/** Eşleşmenin iki yanında gösterilen en çok karakter */
const CONTEXT = 48;

/**
 * Bir kez hazırlanıp her aramada yeniden kullanılır (uzun kitapta her tuşta
 * metni baştan işlememek için).
 */
export interface SearchIndex {
  source: string;
  normalized: Normalized;
  /** Şapkasız biçim; ilk gerektiğinde üretilir */
  folded?: string;
}

export function createSearchIndex(source: string): SearchIndex {
  return { source, normalized: normalizeForSearch(source) };
}

export function searchText(
  index: SearchIndex,
  query: string,
  max: number = MAX_HITS
): SearchResult {
  const needleRaw = normalizeForSearch(query).text.trim();
  if (needleRaw.length < MIN_QUERY) return { hits: [], total: 0 };

  const loose = !TURKISH_LETTERS.test(query);
  const needle = loose ? fold(needleRaw) : needleRaw;
  let haystack = index.normalized.text;
  if (loose) {
    index.folded ??= fold(haystack);
    haystack = index.folded;
  }

  const { offsets } = index.normalized;
  const hits: SearchHit[] = [];
  let total = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    total += 1;
    if (hits.length < max) {
      const start = offsets[at];
      const end = offsets[at + needle.length - 1] + 1;
      hits.push({
        start,
        end,
        before: contextBefore(index.source, start),
        match: squash(index.source.slice(start, end)),
        after: contextAfter(index.source, end),
      });
    }
    from = at + needle.length;
  }
  return { hits, total };
}

function squash(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/** Eşleşmeden önceki kısım; kelime ortasından başlamaz, kesildiyse "…" ile */
function contextBefore(source: string, start: number): string {
  const from = Math.max(0, start - CONTEXT);
  let piece = source.slice(from, start);
  if (from > 0) {
    const space = piece.search(/\s/);
    piece = space === -1 ? '' : piece.slice(space + 1);
  }
  piece = squash(piece).trimStart();
  return from > 0 ? `…${piece}` : piece;
}

/** Eşleşmeden sonraki kısım; kelime ortasında bitmez, kesildiyse "…" ile */
function contextAfter(source: string, end: number): string {
  const to = Math.min(source.length, end + CONTEXT);
  let piece = source.slice(end, to);
  if (to < source.length) {
    const tail = /\s\S*$/.exec(piece);
    piece = tail ? piece.slice(0, tail.index) : '';
  }
  piece = squash(piece).trimEnd();
  return to < source.length ? `${piece}…` : piece;
}

/** Yer imi listesi için: konumdaki ilk kelimeler (kelime ortasında kesilmez) */
export function excerptAt(source: string, offset: number, maxChars = 64): string {
  // Kelimenin ortasına düşen konum kelimenin başına çekilir
  let start = Math.max(0, Math.min(offset, source.length));
  while (start > 0 && !/\s/.test(source[start - 1])) start -= 1;
  const piece = squash(source.slice(start, start + maxChars * 2)).trim();
  if (piece.length <= maxChars) return piece;
  const cut = piece.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, maxChars)).trimEnd()}…`;
}
