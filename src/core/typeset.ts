import { syllabify } from './syllable';
import { LETTER_CLASS } from './turkish';

/**
 * Dizgi dönüşümleri: satır sonunda heceleme ve geniş kelime aralığı — saf, testli.
 *
 * İkisi de metne görünmez işaretler ekleyerek yapılıyor, çünkü React Native'de
 * ne `hyphens` ne de `wordSpacing` stili var:
 * - **Heceleme**: uzun kelimelere hece sınırlarında yumuşak tire (U+00AD).
 *   Satır orada kırılırsa tire görünür, kırılmazsa hiçbir şey görünmez.
 *   Türkçe hece yapısı düzenli olduğu için sözlüğe gerek yok (bkz. `syllabify`).
 * - **Kelime aralığı**: her boşluktan önce ince boşluk (U+2009). Önce konuyor ki
 *   satır ince boşlukla başlamasın (satır, normal boşluktan sonra kırılır).
 *
 * Sayfalama aynı dönüşümü ölçüm paragrafına da uyguluyor; böylece satır başına
 * karakter hesabı (özgün metnin karakterleriyle) doğru kalıyor.
 */

export const SOFT_HYPHEN = '­';
export const THIN_SPACE = ' ';

export interface TypesetOptions {
  hyphenate: boolean;
  /** Her boşluğa eklenecek ince boşluk sayısı (0 = normal aralık) */
  extraWordSpace: number;
}

/** Bundan kısa kelimeler bölünmez */
const MIN_WORD = 5;
/** Satır sonunda kalan ve alt satıra geçen parçanın en az harfi */
const MIN_PART = 2;

const WORD = new RegExp(`[${LETTER_CLASS}]+`, 'g');

/** Kelimeyi hece sınırlarından bölünebilir yapar: "kitaplık" → "ki­tap­lık" */
export function hyphenateWord(word: string): string {
  if (word.length < MIN_WORD) return word;
  // Büyük harfli kısaltma ve başlıklar bölünmez ("UNESCO", "ARILARIN DANSI")
  if (word === word.toLocaleUpperCase('tr')) return word;
  const syllables = syllabify(word);
  if (syllables.length < 2) return word;

  let out = '';
  let consumed = 0;
  for (let i = 0; i < syllables.length; i++) {
    out += syllables[i];
    consumed += syllables[i].length;
    if (i < syllables.length - 1 && consumed >= MIN_PART && word.length - consumed >= MIN_PART) {
      out += SOFT_HYPHEN;
    }
  }
  return out;
}

export function typeset(text: string, options: TypesetOptions): string {
  let out = text;
  if (options.hyphenate) out = out.replace(WORD, hyphenateWord);
  if (options.extraWordSpace > 0) out = out.replace(/ /g, `${THIN_SPACE.repeat(options.extraWordSpace)} `);
  return out;
}

/** Dönüşümü geri alır (testler ve kopyalama için) */
export function untypeset(text: string): string {
  return text.replace(/[­ ]/g, '');
}
