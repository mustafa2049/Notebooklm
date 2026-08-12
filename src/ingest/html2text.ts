/**
 * HTML → düz metin. Hem bağlantıdan makale çekmede hem EPUB bölümlerinde
 * kullanılır.
 *
 * DOMParser kullanmıyoruz: telefonda (React Native) DOM yok. Saf metin işleme
 * her iki platformda aynı sonucu verdiği için ayrı kod yolu gerekmiyor.
 */

const BLOCK_TAGS = 'p|div|section|article|h1|h2|h3|h4|h5|h6|li|tr|blockquote|pre|figcaption';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  uuml: 'ü',
  Uuml: 'Ü',
  ouml: 'ö',
  Ouml: 'Ö',
  ccedil: 'ç',
  Ccedil: 'Ç',
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => ENTITIES[name] ?? match);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** İçerik taşımayan bölümleri tamamen atar. */
function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|form|button|select)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, '');
}

/**
 * Dipnot ve düzenleme işaretlerini atar.
 *
 * Wikipedia benzeri kaynaklarda metnin içine "[4]" gibi kaynak numaraları ve
 * "[değiştir]" bağlantıları gömülü geliyor. Bunlar okuma akışında kelime gibi
 * gösterilip tempoyu bozuyor. Yalnızca en fazla üç haneli sayılar ve bilinen
 * düzenleme etiketleri siliniyor; sıradan köşeli parantez kullanımı korunuyor.
 */
function stripReferenceMarkers(text: string): string {
  return text
    .replace(/\[\d{1,3}\]/g, '')
    .replace(/\[(değiştir|düzenle|kaynak belirtilmeli|kaynak gerekli|edit)[^\]]*\]/gi, '');
}

function tagsToText(html: string): string {
  return stripReferenceMarkers(
    decodeEntities(
      html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(new RegExp(`</(${BLOCK_TAGS})>`, 'gi'), '\n\n')
        .replace(/<[^>]+>/g, '')
    )
  )
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Sayfadaki gerçek makale metnini seçer.
 *
 * Sezgi: bir haber/blog sayfasında `<p>` etiketlerinin toplamı asıl içeriktir;
 * menü ve kenar çubukları `<p>` kullanmaz. Yeterli `<p>` metni yoksa gövdenin
 * tamamına düşüyoruz.
 */
export function htmlToText(html: string): string {
  const cleaned = stripNoise(html);

  const scopeMatch =
    cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
    cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const scope = scopeMatch ? scopeMatch[1] : cleaned;

  const paragraphs = [...scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => tagsToText(match[1]))
    .filter((text) => text.length > 0);

  const joined = paragraphs.join('\n\n');
  if (joined.length >= 400) return joined;

  return tagsToText(scope);
}

/** <title> veya ilk <h1> başlığı. */
export function htmlTitle(html: string): string | undefined {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const text = tagsToText(h1[1]);
    if (text) return text;
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    const text = decodeEntities(title[1].replace(/<[^>]+>/g, '')).trim();
    if (text) return text;
  }
  return undefined;
}
