/**
 * Sayıların Türkçe okunuşu — saf, testli.
 *
 * "1923" → "bin dokuz yüz yirmi üç", "3." → "üçüncü", "3,14" → "üç virgül on
 * dört". Türkçede 100 "yüz", 1000 "bin" okunur ("bir yüz", "bir bin" değil);
 * milyon ve üstünde "bir" söylenir ("bir milyon").
 */

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const SCALES = ['', 'bin', 'milyon', 'milyar', 'trilyon', 'katrilyon'];

/** Bu kadar haneden uzun sayılar (telefon, kimlik no) rakam rakam okunur */
const MAX_DIGITS = 18;

function underThousand(n: number): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  if (hundreds) {
    if (hundreds > 1) words.push(ONES[hundreds]);
    words.push('yüz');
  }
  if (tens) words.push(TENS[tens]);
  if (ones) words.push(ONES[ones]);
  return words;
}

/** Rakam dizisini (ayraçsız) okur: "1923" → "bin dokuz yüz yirmi üç" */
export function cardinalWords(digits: string): string {
  const clean = digits.replace(/^0+(?=\d)/, '');
  if (!/^\d+$/.test(clean)) return digits;
  if (clean.length > MAX_DIGITS) return digitWords(clean);
  if (/^0+$/.test(clean)) return 'sıfır';
  const words: string[] = [];
  const groups: number[] = [];
  for (let end = clean.length; end > 0; end -= 3) {
    groups.unshift(Number(clean.slice(Math.max(0, end - 3), end)));
  }
  groups.forEach((value, i) => {
    if (!value) return;
    const scale = groups.length - 1 - i;
    // "bin" tek başına: 1000 → "bin", 1500 → "bin beş yüz"
    if (!(scale === 1 && value === 1)) words.push(...underThousand(value));
    if (scale) words.push(SCALES[scale]);
  });
  return words.join(' ');
}

/** Rakam rakam: "0532" → "sıfır beş üç iki" */
export function digitWords(digits: string): string {
  return [...digits].map((d) => (d === '0' ? 'sıfır' : ONES[Number(d)])).join(' ');
}

/** Dört biçimli ünlü uyumu: son ünlüye göre ı/i/u/ü */
function harmony4(word: string): string {
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i];
    if ('aı'.includes(ch)) return 'ı';
    if ('ei'.includes(ch)) return 'i';
    if ('ou'.includes(ch)) return 'u';
    if ('öü'.includes(ch)) return 'ü';
  }
  return 'i';
}

/** Okunuşun son kelimesine sıra eki: "yirmi üç" → "yirmi üçüncü" */
export function ordinalOf(words: string): string {
  const parts = words.split(' ');
  const last = parts.pop() ?? '';
  let ordinal: string;
  if (last === 'dört') ordinal = 'dördüncü';
  else {
    const v = harmony4(last);
    ordinal = 'aeıioöuü'.includes(last[last.length - 1]) ? `${last}nc${v}` : `${last}${v}nc${v}`;
  }
  return [...parts, ordinal].join(' ');
}

/** Okunuşa ek getirir: "yirmi dört" + "e" → "yirmi dörde" (dört ünlüyle yumuşar) */
export function withSuffix(words: string, suffix: string): string {
  if (!suffix) return words;
  const parts = words.split(' ');
  let last = parts.pop() ?? '';
  if (last === 'dört' && 'aeıioöuü'.includes(suffix[0])) last = 'dörd';
  return [...parts, last + suffix].join(' ');
}

/** Ondalık: "3", "14" → "üç virgül on dört"; baştaki sıfırlar tek tek okunur */
export function decimalWords(whole: string, fraction: string, separator = 'virgül'): string {
  const zeros = fraction.match(/^0*/)?.[0].length ?? 0;
  const rest = fraction.slice(zeros);
  const tail = [...Array(zeros).fill('sıfır'), ...(rest ? [cardinalWords(rest)] : [])];
  return [cardinalWords(whole), separator, ...tail].join(' ');
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** Geçerli bir Romen rakamıysa değeri ("XIV" → 14), değilse null */
export function romanValue(token: string): number | null {
  if (!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(token) || !token) return null;
  let total = 0;
  for (let i = 0; i < token.length; i++) {
    const value = ROMAN[token[i]];
    const next = ROMAN[token[i + 1]] ?? 0;
    total += value < next ? -value : value;
  }
  return total || null;
}
