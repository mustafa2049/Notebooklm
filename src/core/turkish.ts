/**
 * Türkçe alfabe yardımcıları.
 *
 * Bilinçli olarak `\p{L}` gibi Unicode property escape'leri kullanmıyoruz:
 * açıkça yazılmış karakter sınıfları hem Hermes/JSC/V8 arasında aynı davranır
 * hem de daha hızlıdır.
 */

/** Türkçe sesli harfler (küçük). Şapkalı harfler de dahil. */
export const VOWELS_LOWER = 'aeıioöuüâîû';
/** Türkçe sesli harfler (büyük). */
export const VOWELS_UPPER = 'AEIİOÖUÜÂÎÛ';

const LETTERS_LOWER = 'abcçdefgğhıijklmnoöprsştuüvyz' + 'qwx' + 'âîûàéèáí';
const LETTERS_UPPER = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ' + 'QWX' + 'ÂÎÛÀÉÈÁÍ';

const VOWEL_SET = new Set([...VOWELS_LOWER, ...VOWELS_UPPER]);
const LETTER_SET = new Set([...LETTERS_LOWER, ...LETTERS_UPPER]);
const DIGIT_SET = new Set([...'0123456789']);

/** Regex içinde kullanılmak üzere harf karakter sınıfı (köşeli parantezsiz). */
export const LETTER_CLASS = LETTERS_LOWER + LETTERS_UPPER;

export function isVowel(ch: string): boolean {
  return VOWEL_SET.has(ch);
}

export function isLetter(ch: string): boolean {
  return LETTER_SET.has(ch);
}

export function isDigit(ch: string): boolean {
  return DIGIT_SET.has(ch);
}

export function isUpperLetter(ch: string): boolean {
  return LETTER_SET.has(ch) && LETTERS_UPPER.includes(ch);
}

export function isLowerLetter(ch: string): boolean {
  return LETTER_SET.has(ch) && LETTERS_LOWER.includes(ch);
}

/**
 * Türkçe kurallarına göre küçük harfe çevirir.
 * `'I'.toLowerCase()` motorlarda 'i' verir; Türkçede 'ı' olmalı.
 */
export function trLower(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

/**
 * Türkçe kurallarına göre büyük harfe çevirir.
 * `'iyi'.toUpperCase()` "IYI" verir; Türkçede "İYİ" olmalı. Arayüzdeki büyük
 * harfli etiketler için CSS `textTransform: uppercase` yerine bu kullanılıyor:
 * o dönüşüm dil bilmiyor ve noktalı İ'yi kaybediyor.
 */
export function trUpper(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/** Kelimenin başındaki ve sonundaki noktalama/tırnak işaretlerini atar. */
const TRIM_CHARS = '.,;:!?…"\'`´()[]{}«»“”‘’–—-*_~/\\|<>+=&%#@¡¿';
const TRIM_SET = new Set([...TRIM_CHARS]);

export function stripPunctuation(word: string): string {
  let start = 0;
  let end = word.length;
  while (start < end && TRIM_SET.has(word[start])) start++;
  while (end > start && TRIM_SET.has(word[end - 1])) end--;
  return word.slice(start, end);
}

export function isPunctuationChar(ch: string): boolean {
  return TRIM_SET.has(ch);
}
