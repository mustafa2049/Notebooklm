import type { Token } from './types';
import { isDigit, isLowerLetter, isUpperLetter, stripPunctuation, trLower } from './turkish';

/**
 * Türkçede nokta her zaman cümle sonu değildir. Bu sözlük "Dr. Ahmet" gibi
 * ifadelerde yanlış cümle bölmeyi engeller. Anahtarlar noktasız ve `trLower` ile
 * küçültülmüş hâlde tutulur.
 */
const ABBREVIATIONS = new Set(
  [
    // genel
    'vb', 'vs', 'örn', 'bkz', 'yy', 'age', 'agy', 'bkz', 'çev', 'ed', 'haz',
    'krş', 'ör', 'yak', 'yy', 'ss', 's', 'c', 'nr', 'no', 'tel', 'fax',
    // unvanlar
    'dr', 'doç', 'prof', 'op', 'av', 'sn', 'müh', 'yrd', 'öğr', 'gör', 'uzm',
    'bnb', 'alb', 'gen', 'yzb', 'ütğm', 'tğm', 'ast', 'hz', 'st',
    // adres
    'mah', 'cad', 'sok', 'apt', 'blok', 'kat', 'da', 'sk',
    // kurum / ölçü / para
    'a.ş', 'ltd', 'şti', 'tic', 'san', 'ünv', 'üni', 'tl', 'kr', 'usd', 'eur',
    'kg', 'gr', 'mg', 'km', 'cm', 'mm', 'lt', 'ml', 'm²', 'adet',
    // tarih / dönem
    'm.ö', 'm.s', 'ms', 'mö', 'ocak', 'şb', 'sa', 'öö', 'ös',
  ].map(trLower)
);

/** Cümleyi bitirebilen işaretler. */
const SENTENCE_ENDERS = new Set(['.', '!', '?', '…']);
/** Kısa duraklama yaptıran işaretler. */
const MINOR_PAUSES = new Set([',', ';', ':', '–', '—']);
/** Cümle sonu işaretinden sonra gelebilen kapatma karakterleri. */
const CLOSERS = new Set(['"', "'", ')', ']', '}', '»', '”', '’', '`', '´']);

/** Kelimenin sonundaki kapatma karakterlerini atlayıp son "anlamlı" işareti verir. */
function trailingMark(text: string): string {
  let i = text.length - 1;
  while (i >= 0 && CLOSERS.has(text[i])) i--;
  return i >= 0 ? text[i] : '';
}

/** "3.14", "12.08.2026", "1." gibi sayısal ifadeler cümle bitirmez. */
function isNumericToken(core: string): boolean {
  if (!core) return false;
  let sawDigit = false;
  for (const ch of core) {
    if (isDigit(ch)) sawDigit = true;
    else if (ch !== '.' && ch !== ',' && ch !== ':' && ch !== '/' && ch !== '-') return false;
  }
  return sawDigit;
}

/** "M. Kemal" gibi tek harflik baş harfler cümle bitirmez. */
function isInitial(text: string): boolean {
  return text.length === 2 && isUpperLetter(text[0]) && text[1] === '.';
}

/** Sonraki kelime küçük harfle başlıyorsa önceki nokta büyük olasılıkla kısaltmadır. */
function startsLowercase(text: string | undefined): boolean {
  if (!text) return false;
  for (const ch of text) {
    if (isLowerLetter(ch)) return true;
    if (isUpperLetter(ch) || isDigit(ch)) return false;
    // açılış tırnağı / parantez → bakmaya devam et
  }
  return false;
}

interface RawWord {
  text: string;
  start: number;
  end: number;
  /** Bu kelimeden sonraki boşlukta kaç satır sonu var */
  newlinesAfter: number;
}

/** Metni boşluklara göre böler, karakter offsetlerini ve satır sonlarını korur. */
function splitWords(text: string): RawWord[] {
  const words: RawWord[] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;
    const start = i;
    while (i < n && !/\s/.test(text[i])) i++;
    const end = i;

    let newlines = 0;
    let j = i;
    while (j < n && /\s/.test(text[j])) {
      if (text[j] === '\n') newlines++;
      j++;
    }
    words.push({ text: text.slice(start, end), start, end, newlinesAfter: newlines });
  }
  return words;
}

/**
 * Metni token'lara böler ve her token için cümle/paragraf sınırlarını işaretler.
 *
 * Türkçeye özel davranışlar:
 * - Kısaltma sözlüğü ("Dr.", "vb.", "M.Ö.") cümleyi bitirmez
 * - Ondalık sayı, tarih, sıra sayısı ("3.14", "12.08.2026", "1.") bitirmez
 * - Tek harflik baş harf ("M.") bitirmez
 * - Sonraki kelime küçük harfle başlıyorsa nokta cümle sonu sayılmaz
 * - Büyük/küçük harf karşılaştırmaları Türkçe İ/ı kuralına göre yapılır
 */
export function tokenize(source: string): Token[] {
  const words = splitWords(source);
  const tokens: Token[] = [];
  let sentenceIndex = 0;
  let paragraphIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = words[i + 1];
    const core = stripPunctuation(w.text);
    const mark = trailingMark(w.text);
    const isLast = i === words.length - 1;

    let sentenceEnd = false;
    if (SENTENCE_ENDERS.has(mark)) {
      if (mark !== '.') {
        // "!" ve "?" kısaltma olmaz
        sentenceEnd = true;
      } else {
        const lowered = trLower(core);
        const abbrev = ABBREVIATIONS.has(lowered) || ABBREVIATIONS.has(lowered.replace(/\.$/, ''));
        sentenceEnd = !abbrev && !isNumericToken(core) && !isInitial(w.text) && !startsLowercase(next?.text);
      }
    }
    // Paragraf sonu, noktalama olmasa bile cümleyi bitirir (başlıklar, şiir, liste).
    // Tek satır sonu bilinçli olarak yok sayılır: sert satır kaydırmalı metinlerde
    // (TXT dosyaları) her satır sonu cümle sanılırsa tempo bozulur. Satır kaydırma
    // temizliği `ingest/normalizeText` katmanının işi.
    const paragraphEnd = isLast || w.newlinesAfter >= 2;
    if (paragraphEnd) sentenceEnd = true;

    let hasDigit = false;
    for (const ch of core) {
      if (isDigit(ch)) {
        hasDigit = true;
        break;
      }
    }

    tokens.push({
      text: w.text,
      core,
      start: w.start,
      end: w.end,
      hasDigit,
      minorPause: MINOR_PAUSES.has(mark),
      sentenceEnd,
      paragraphEnd,
      sentenceIndex,
      paragraphIndex,
    });

    if (sentenceEnd) sentenceIndex++;
    if (paragraphEnd) paragraphIndex++;
  }

  return tokens;
}

/** Cümle sayısı (ilerleme göstergeleri ve cloze için). */
export function countSentences(tokens: Token[]): number {
  return tokens.length === 0 ? 0 : tokens[tokens.length - 1].sentenceIndex + 1;
}

/** Verilen token aralığının kaynak metindeki düz hâli. */
export function tokensToText(tokens: Token[]): string {
  return tokens.map((t) => t.text).join(' ');
}
