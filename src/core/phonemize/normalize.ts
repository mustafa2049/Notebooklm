import {
  cardinalWords,
  decimalWords,
  digitWords,
  ordinalOf,
  romanValue,
  withSuffix,
} from './numbers';

/**
 * Seslendirme için metni "söylendiği gibi" yazar — saf, testli.
 *
 * Ses modeli yalnızca harfleri okuyabilir: sayılar, kısaltmalar, simgeler ve
 * büyük harfli kısaltmalar önce kelimeye çevrilir ("Dr. Ali 3. kata çıktı" →
 * "doktor Ali üçüncü kata çıktı"). Noktalama (duraklama) korunur; tırnaklar
 * atılır, parantez ve tireler virgüle (kısa duraklamaya) döner.
 */

const L = 'A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû';
const UPPER = 'A-ZÇĞİÖŞÜÂÎÛ';
const LOWER_START = new RegExp(`^\\s+[a-zçğıöşüâîû]`);

const MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

/** Noktalı kısaltmaların okunuşu (anahtar küçük harf, noktasız) */
const ABBREVIATIONS: Record<string, string> = {
  dr: 'doktor',
  prof: 'profesör',
  doç: 'doçent',
  yrd: 'yardımcı',
  op: 'operatör',
  av: 'avukat',
  müh: 'mühendis',
  sn: 'sayın',
  hz: 'hazreti',
  vb: 've benzeri',
  vs: 'vesaire',
  örn: 'örneğin',
  ör: 'örneğin',
  bkz: 'bakınız',
  yy: 'yüzyıl',
  mah: 'mahallesi',
  cad: 'caddesi',
  sok: 'sokağı',
  apt: 'apartmanı',
  çev: 'çeviren',
  haz: 'hazırlayan',
  krş: 'karşılaştırınız',
  bnb: 'binbaşı',
  alb: 'albay',
  yzb: 'yüzbaşı',
  tğm: 'teğmen',
  ütğm: 'üsteğmen',
  ltd: 'limitet',
  şti: 'şirketi',
};

/** Unvanlar: ardından ad gelir, cümle bitirmez ("Dr. Ali") */
const TITLES = new Set(['dr', 'prof', 'doç', 'yrd', 'op', 'av', 'müh', 'sn', 'hz', 'bnb', 'alb', 'yzb', 'tğm', 'ütğm']);

/** Yalnızca ardından sayı gelince açılanlar ("s. 45" → "sayfa kırk beş") */
const BEFORE_NUMBER: Record<string, string> = { s: 'sayfa', no: 'numara', nr: 'numara', tel: 'telefon' };

/** Sayıdan sonra gelen birimler */
const UNITS: Record<string, string> = {
  km: 'kilometre',
  kg: 'kilogram',
  cm: 'santimetre',
  mm: 'milimetre',
  gr: 'gram',
  g: 'gram',
  lt: 'litre',
  ml: 'mililitre',
  m: 'metre',
  sn: 'saniye',
  dk: 'dakika',
  tl: 'lira',
  '°c': 'derece',
  '°': 'derece',
};

const CURRENCY: Record<string, string> = { $: 'dolar', '€': 'avro', '₺': 'lira', '£': 'sterlin' };

/** Harf harf okunan kısaltmalar için harf adları ("TDK" → "te de ka") */
const LETTER_NAMES: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', ç: 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', ğ: 'yumuşak ge', h: 'he',
  ı: 'ı', i: 'i', j: 'je', k: 'ka', l: 'le', m: 'me', n: 'ne', o: 'o', ö: 'ö', p: 'pe', q: 'kü',
  r: 're', s: 'se', ş: 'şe', t: 'te', u: 'u', ü: 'ü', v: 've', w: 'dabılyu', x: 'iks', y: 'ye', z: 'ze',
};

function lower(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

/** Ayraçlı sayı ("1.250.000", "3,5") → okunuş */
function numberWords(raw: string): string {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) raw = raw.replace(/\./g, '');
  const decimal = raw.match(/^(\d+),(\d+)$/);
  if (decimal) return decimalWords(decimal[1], decimal[2]);
  const dotted = raw.match(/^(\d+)\.(\d{1,2})$/);
  if (dotted) return decimalWords(dotted[1], dotted[2], 'nokta');
  if (/^\d+$/.test(raw)) return raw.length > 1 && raw.startsWith('0') ? digitWords(raw) : cardinalWords(raw);
  // "1,2,3" gibi diziler: her parça ayrı, aralarında kısa duraklama
  return raw
    .split(/[.,]+/)
    .filter(Boolean)
    .map((part) => numberWords(part))
    .join(', ');
}

const ORDINAL_SUFFIX = /^(?:[ıiuü]?nc[ıiuü])$/;

/** Büyük harfli kısaltma harf harf mi okunur? (NATO, UNESCO kelime gibi) */
function spelled(token: string): boolean {
  const word = lower(token);
  if (word.length <= 3) return true;
  if (!/[aeıioöuü]/.test(word)) return true;
  if (/[^aeıioöuü]{3}/.test(word)) return true;
  return /^[^aeıioöuü]{2}/.test(word);
}

function spell(token: string): string {
  return [...lower(token)].map((ch) => LETTER_NAMES[ch] ?? ch).join(' ');
}

/** Büyük harfli kısaltmaları açar; tamamı büyük harfli başlıklara dokunmaz */
function expandAcronyms(text: string): string {
  const parts = text.split(/(\s+)/);
  const isCaps = (part: string | undefined) =>
    !!part && new RegExp(`^[${UPPER}]{2,}(['’][${L}]+)?[.,;:!?]*$`).test(part);
  return parts
    .map((part, i) => {
      const match = part.match(new RegExp(`^([${UPPER}]{2,6})(?:['’]([${L}]+))?([.,;:!?]*)$`));
      if (!match) return part;
      // Başlık gibi büyük harfli dizide (yan yana büyük harfli kelimeler) dokunma
      if (isCaps(parts[i - 2]) || isCaps(parts[i + 2])) return part;
      const [, acronym, suffix = '', tail] = match;
      if (!spelled(acronym)) return lower(acronym) + lower(suffix) + tail;
      const name = spell(acronym);
      return (suffix ? withSuffix(name, lower(suffix)) : name) + tail;
    })
    .join('');
}

export function normalizeForSpeech(input: string): string {
  let text = input.normalize('NFC');
  text = text.replace(/­| |​/g, '').replace(/[ \t\r\n]+/g, ' ');
  text = text.replace(/\.{3,}|…/g, '.');
  text = text.replace(/[“”„«»"]/g, ' ');

  // Tarih ve saat
  text = text.replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (whole, d, m, y) => {
    const month = MONTHS[Number(m) - 1];
    return month ? `${cardinalWords(d)} ${month} ${cardinalWords(y)}` : whole;
  });
  text = text.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) =>
    `${cardinalWords(h)} ${m === '00' ? '' : m.startsWith('0') ? digitWords(m) : cardinalWords(m)}`.trim()
  );

  // Yüzde, para, birim
  text = text.replace(/%\s?(\d[\d.,]*\d|\d)/g, (_, n) => `yüzde ${numberWords(n)}`);
  text = text.replace(/(\d[\d.,]*\d|\d)\s?%/g, (_, n) => `yüzde ${numberWords(n)}`);
  text = text.replace(/([$€₺£])\s?(\d[\d.,]*\d|\d)/g, (_, c, n) => `${numberWords(n)} ${CURRENCY[c]}`);
  text = text.replace(/(\d[\d.,]*\d|\d)\s?([$€₺£])/g, (_, n, c) => `${numberWords(n)} ${CURRENCY[c]}`);
  text = text.replace(
    new RegExp(`(\\d)\\s?(km|kg|cm|mm|gr|g|lt|ml|m|sn|dk|TL|tl|°C|°)(?![${L}])`, 'g'),
    (_, d, unit) => `${d} ${UNITS[lower(unit)]}`
  );

  // Ardından sayı gelen kısaltmalar
  text = text.replace(new RegExp(`(^|[^${L}])(s|no|nr|tel)\\.\\s?(?=\\d)`, 'gi'), (_, pre, abbr) => `${pre}${BEFORE_NUMBER[lower(abbr)]} `);

  // Ek almış sayı: 1923'te, 3'üncü, 5'i
  text = text.replace(new RegExp(`(\\d[\\d.,]*\\d|\\d)['’]([${L}]+)`, 'g'), (_, n, suffix) => {
    const s = lower(suffix);
    const words = numberWords(n);
    return ORDINAL_SUFFIX.test(s) ? ordinalOf(words) : withSuffix(words, s);
  });

  // Sıra sayısı: "3. kat", "XX. yüzyıl" (ardından küçük harfle başlayan kelime)
  text = text.replace(/\b(\d+)\.(?=\s+\S)/g, (whole, n, offset: number, all: string) =>
    LOWER_START.test(all.slice(offset + whole.length)) ? ordinalOf(cardinalWords(n)) : whole
  );
  text = text.replace(/\b([IVXLCDM]{1,7})\.(?=\s+\S)/g, (whole, roman: string) => {
    const value = romanValue(roman);
    return value ? ordinalOf(cardinalWords(String(value))) : whole;
  });

  // Eksi, aralık, kalan sayılar
  text = text.replace(/(^|\s)-(\d)/g, '$1eksi $2');
  text = text.replace(/(\d)\s?[-–—]\s?(\d)/g, '$1, $2');
  text = text.replace(/\d[\d.,]*\d|\d/g, (n) => ` ${numberWords(n)} `);

  // Noktalı kısaltmalar (M.Ö., A.Ş., Dr., vb.)
  text = text.replace(/\bM\.\s?Ö\./g, 'milattan önce').replace(/\bM\.\s?S\./g, 'milattan sonra');
  text = text.replace(/\bA\.\s?Ş\./g, 'anonim şirketi');
  text = text.replace(new RegExp(`(^|[^${L}])([${L}]{1,5})\\.`, 'g'), (whole, pre, word, offset: number, all: string) => {
    const key = lower(word);
    const expansion = ABBREVIATIONS[key];
    if (!expansion) return whole;
    // Cümle sonundaki kısaltma (metin bitiyor ya da büyük harf geliyor)
    // cümleyi de bitirir; unvanlardan sonra ad gelir
    const rest = all.slice(offset + whole.length);
    const end = !TITLES.has(key) && (rest.trim() === '' || new RegExp(`^\\s+[${UPPER}]`).test(rest));
    return `${pre}${expansion}${end ? '.' : ''}`;
  });

  // Simgeler
  text = text
    .replace(/&/g, ' ve ')
    .replace(/\+/g, ' artı ')
    .replace(/=/g, ' eşittir ')
    .replace(/@/g, ' et ')
    .replace(/[#*_~^|<>]/g, ' ')
    .replace(new RegExp(`([${L}])/([${L}])`, 'g'), '$1 $2');

  text = expandAcronyms(text);

  // Kesme işareti (Ankara'da → Ankarada), kelime içi tire, tırnaklar
  text = text.replace(new RegExp(`([${L}])['’]([${L}])`, 'g'), '$1$2');
  text = text.replace(new RegExp(`([${L}])-([${L}])`, 'g'), '$1 $2');
  text = text.replace(/['’‘`´]/g, ' ');
  // Parantez ve tireler kısa duraklama
  text = text.replace(/[()[\]{}]|\s[-–—]+\s|[–—]/g, ', ');

  // Boşluk ve noktalama düzeni
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\s+([.,;:!?])/g, '$1');
  text = text.replace(/([,;:])(?:\s*[,;:])+/g, '$1');
  text = text.replace(/([.!?])(?:\s*[,;:])+/g, '$1');
  text = text.replace(/^[\s,;:.]+/, '');
  return text.trim();
}
