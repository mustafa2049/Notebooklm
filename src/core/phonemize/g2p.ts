import { syllabify } from '../syllable';
import { isLetter, isVowel, trLower } from '../turkish';
import { normalizeForSpeech } from './normalize';
import { isKenSuffix, stressOf } from './stress';

/**
 * Türkçe harf → ses (fonem) çevirisi — saf, testli.
 *
 * Çıktı Piper ses modellerinin anladığı IPA sembolleri, her biri tek
 * karakter ("tʃ" iki sembol). Türkçe yazım sese çok yakın; asıl iş
 * bağlamdaki küçük farklar — espeak-ng'nin Türkçe çıktısındaki gibi:
 * - Kapalı hecede ünlüler gevşer: i→ɪ, u→ʊ, ü→ø, o→ɔ, e→ɛ (l, m, n önünde
 *   æ); sözcük sonundaki açık hecede de (i, u, ü, o, e). ö hep œ, ı hep ɯ.
 * - ğ: e/i'den sonra j ("değer" → dejɛr), ı'dan sonra ɯ, öbür ünlüleri uzatır
 *   ("dağ" → daː, "doğru" → doːɾʊ).
 * - l: ünlüden önce o ünlüye, hece sonunda önceki ünlüye göre ince (l) ya da
 *   kalın (ɫ); g de öyle (ɟ / ɡ). r iki ünlü arasında ɾ. â, î, û uzun; k/g/l'yi
 *   inceltir ("kâr" → caːr).
 * - Çift patlamalı ünsüz uzar ("gitti" → ɟitːɪ), öbürleri iki kez okunur.
 * - Vurgu işareti `ˈ` vurgulu ünlünün hemen önünde (bkz. `stress.ts`).
 *
 * espeak-ng'yi taklit etmenin nedeni: hazır Türkçe Piper sesleri onun
 * çıktısıyla eğitildi. Kendi eğittiğin ses de bu çözümleyicinin çıktısıyla
 * eğitildiği için ikisi de aynı kodla okunur.
 */

/** Çözümleyici değişirse artar; eğitilen sesin yapılandırmasına yazılır */
export const PHONEMIZER_VERSION = 1;

const FRONT = new Set(['e', 'i', 'ö', 'ü', 'î']);
const LENGTHENED_BY_G: Record<string, string> = { a: 'a', â: 'a', o: 'o', ö: 'œ', u: 'u', û: 'u', ü: 'y' };
const LAX_LONG: Record<string, string> = { o: 'ɔ', u: 'ʊ', ü: 'ø' };
const SIMPLE: Record<string, string[]> = {
  b: ['b'], c: ['d', 'ʒ'], ç: ['t', 'ʃ'], d: ['d'], f: ['f'], h: ['h'], j: ['ʒ'], m: ['m'], n: ['n'],
  p: ['p'], s: ['s'], ş: ['ʃ'], t: ['t'], v: ['v'], y: ['j'], z: ['z'], w: ['v'], q: ['k'], x: ['k', 's'],
};
/** İkizken uzayan ünsüzler (gitti → tː); öbürleri iki kez okunur (kullan → ɫɫ) */
const LONG_WHEN_DOUBLE = new Set(['b', 'c', 'ç', 'd', 'g', 'k', 'p', 't']);
const FOREIGN: Record<string, string> = { à: 'a', á: 'a', é: 'e', è: 'e', í: 'i' };
/** Kuraldan sapan sık kelimelerin okunuşu (espeak-ng'nin sözlüğündeki gibi) */
const OVERRIDES: Record<string, string> = { ise: 'ˈise', öyle: 'ˈœjle', üye: 'yjˈe', iyi: 'ijˈi', idi: 'idˈi' };

function nearestVowel(word: string, from: number, step: 1 | -1): string | undefined {
  for (let i = from; i >= 0 && i < word.length; i += step) if (isVowel(word[i])) return word[i];
  return undefined;
}

/** Tek kelimenin fonemleri (noktalama ve boşluk yok) */
export function wordPhonemes(raw: string): string[] {
  const word = [...trLower(raw)]
    .map((ch) => FOREIGN[ch] ?? ch)
    .filter(isLetter)
    .join('');
  if (!word) return [];
  if (word in OVERRIDES) return [...OVERRIDES[word]];
  const syllables = syllabify(word);
  const stress = stressOf(word, syllables);

  // Her harfin hecesi; hece kapalı mı (ünsüzle bitiyor). İkiz patlamalı ünsüzün
  // ilk yarısı heceyi kapatmaz: "etti" → etːɪ (ɛ değil), "gitti" → ɟitːɪ
  const syllableOf: number[] = [];
  syllables.forEach((syl, s) => [...syl].forEach(() => syllableOf.push(s)));
  const closed = syllables.map((syl, s) => {
    const last = syl[syl.length - 1];
    if (isVowel(last)) return false;
    const geminate = syllables[s + 1]?.[0] === last && LONG_WHEN_DOUBLE.has(last) && isVowel(syl[syl.length - 2] ?? '');
    return !geminate;
  });

  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const prev = word[i - 1];
    const next = word[i + 1];
    if (isVowel(ch)) {
      const s = syllableOf[i];
      if (stress && stress.syllable === s) out.push(stress.mark);
      const final = i === word.length - 1;
      const lax = closed[s] || final;
      if (next === 'ğ' && ch in LENGTHENED_BY_G) {
        // Aynı ünlüler arasındaki ğ tek uzun ünlü olur ("olduğu" → ɔɫdʊː);
        // niteliği ikinci ünlünün hecesine göre
        if (word[i + 2] === ch) {
          const second = syllableOf[i + 2];
          if (stress && stress.syllable === second && stress.syllable !== s) out.push(stress.mark);
          const laxSecond = closed[second] || i + 2 === word.length - 1;
          out.push(laxSecond ? (LAX_LONG[ch] ?? LENGTHENED_BY_G[ch]) : LENGTHENED_BY_G[ch], 'ː');
          i += 2;
          continue;
        }
        out.push(LENGTHENED_BY_G[ch], 'ː');
        continue;
      }
      switch (ch) {
        case 'a':
          out.push('a');
          break;
        case 'â':
          out.push('a', 'ː');
          break;
        case 'î':
          out.push('i', 'ː');
          break;
        case 'û':
          out.push('u', 'ː');
          break;
        case 'ı':
          out.push('ɯ');
          break;
        case 'ö':
          out.push('œ');
          break;
        case 'e':
          out.push(!lax ? 'e' : closed[s] && 'lmn'.includes(next ?? '') ? 'æ' : 'ɛ');
          break;
        case 'i':
          out.push(lax ? 'ɪ' : 'i');
          break;
        case 'o':
          out.push(lax ? 'ɔ' : 'o');
          break;
        case 'u':
          out.push(lax ? 'ʊ' : 'u');
          break;
        case 'ü':
          out.push(lax ? 'ø' : 'y');
          break;
      }
      continue;
    }
    if (prev === ch && LONG_WHEN_DOUBLE.has(ch)) {
      out.push('ː');
      continue;
    }
    switch (ch) {
      case 'ğ':
        if (prev === 'e' || prev === 'i' || prev === 'î') out.push('j');
        else if (prev === 'ı') out.push('ɯ');
        break;
      case 'g': {
        const vowel = nearestVowel(word, i + 1, 1);
        const front = vowel ? FRONT.has(vowel) || vowel === 'â' : FRONT.has(nearestVowel(word, i - 1, -1) ?? '');
        out.push(front ? 'ɟ' : 'ɡ');
        break;
      }
      case 'k':
        out.push(next === 'â' || isKenSuffix(syllables, syllableOf[i]) ? 'c' : 'k');
        break;
      case 'l': {
        // Ünlüden önce o ünlüye, hece sonunda önceki ünlüye bakılır
        const after = next && isVowel(next) ? next : undefined;
        const vowel = after ?? nearestVowel(word, i - 1, -1);
        out.push(vowel === undefined || FRONT.has(vowel) || after === 'â' ? 'l' : 'ɫ');
        break;
      }
      case 'r':
        // İki ünlü arasında (ğ'den sonra da: "doğru" → doːɾʊ) dil bir kez dokunur
        out.push(prev && next && (isVowel(prev) || prev === 'ğ') && isVowel(next) ? 'ɾ' : 'r');
        break;
      default:
        out.push(...(SIMPLE[ch] ?? []));
    }
  }
  return out;
}

const TOKEN = /[A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîûàáéèí]+|[.,;:!?]/g;

/**
 * Metnin fonemleri: önce söylendiği gibi yazılır (`normalizeForSpeech`),
 * kelimeler arasında boşluk sembolü, noktalama kelimeye bitişik.
 */
export function phonemize(text: string, { normalized = false } = {}): string[] {
  const spoken = normalized ? text : normalizeForSpeech(text);
  const out: string[] = [];
  for (const token of spoken.match(TOKEN) ?? []) {
    if (/^[.,;:!?]$/.test(token)) {
      if (out.length) out.push(token);
      continue;
    }
    const phonemes = wordPhonemes(token);
    if (!phonemes.length) continue;
    if (out.length) out.push(' ');
    out.push(...phonemes);
  }
  return out;
}
