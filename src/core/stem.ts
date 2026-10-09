import { isVowel, stripPunctuation, trLower } from './turkish';

/**
 * Çekimli bir kelimeden sözlükte aranacak aday kökler — saf, testli.
 *
 * Türkçe sondan eklemeli: "kitaplarımızdan" sözlükte yok, "kitap" var.
 * Gerçek bir biçimbirim çözümleyicisi yerine yaygın ekleri sondan soyarak
 * aday kökler üretiyoruz; hangisinin gerçekten kelime olduğuna sözlük karar
 * veriyor (bulunanların en uzunu seçilir: "kalemler" → "kalem", "kale" değil).
 * Fiil eki soyulduysa mastar da aday olur ("geliyorum" → "gelmek").
 */

/** Ad ekleri (çokluk, iyelik, hâl, yapım) */
const NOUN_SUFFIXES = [
  'lar', 'ler',
  'ımız', 'imiz', 'umuz', 'ümüz', 'mız', 'miz', 'muz', 'müz',
  'ınız', 'iniz', 'unuz', 'ünüz', 'nız', 'niz', 'nuz', 'nüz',
  'ları', 'leri',
  'nın', 'nin', 'nun', 'nün', 'ın', 'in', 'un', 'ün',
  'dan', 'den', 'tan', 'ten', 'ndan', 'nden',
  'da', 'de', 'ta', 'te', 'nda', 'nde',
  'ya', 'ye', 'na', 'ne', 'a', 'e',
  'yı', 'yi', 'yu', 'yü', 'nı', 'ni', 'nu', 'nü',
  'sı', 'si', 'su', 'sü', 'ı', 'i', 'u', 'ü',
  'ım', 'im', 'um', 'üm', 'm',
  'ın', 'n',
  'yla', 'yle', 'la', 'le',
  'ca', 'ce', 'ça', 'çe',
  'ki',
  'lık', 'lik', 'luk', 'lük',
  'sız', 'siz', 'suz', 'süz',
  'lı', 'li', 'lu', 'lü',
  'dır', 'dir', 'dur', 'dür', 'tır', 'tir', 'tur', 'tür',
];

/** Fiil ekleri (zaman, kip, ortaç, ulaç, kişi) */
const VERB_SUFFIXES = [
  'mak', 'mek', 'ma', 'me', 'ması', 'mesi',
  'dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü',
  'dım', 'dim', 'dum', 'düm', 'tım', 'tim', 'tum', 'tüm',
  'dık', 'dik', 'duk', 'dük', 'tık', 'tik', 'tuk', 'tük',
  'dın', 'din', 'dun', 'dün', 'tın', 'tin', 'tun', 'tün',
  'mış', 'miş', 'muş', 'müş',
  'ıyor', 'iyor', 'uyor', 'üyor', 'yor',
  'acak', 'ecek', 'yacak', 'yecek', 'acağ', 'eceğ', 'yacağ', 'yeceğ',
  'ar', 'er', 'ır', 'ir', 'ur', 'ür',
  'maz', 'mez',
  'malı', 'meli',
  'sa', 'se',
  'arak', 'erek', 'yarak', 'yerek',
  'ıp', 'ip', 'up', 'üp', 'yıp', 'yip', 'yup', 'yüp',
  'ken', 'yken',
  'an', 'en', 'yan', 'yen',
  'dığ', 'diğ', 'duğ', 'düğ', 'tığ', 'tiğ', 'tuğ', 'tüğ',
  'um', 'üm', 'ım', 'im', 'sun', 'sün', 'sın', 'sin', 'uz', 'üz', 'ız', 'iz',
  'sınız', 'siniz', 'sunuz', 'sünüz', 'lar', 'ler',
  'ma', 'me', 'mı', 'mi', 'mu', 'mü',
];

// Hem ad hem fiil eki olabilenler ("-ler", "-im") ad sayılır: fiil olduğunu
// yalnızca fiile özgü bir ek gösterir
const SUFFIXES: { text: string; verb: boolean }[] = [
  ...[...new Set(NOUN_SUFFIXES)].map((text) => ({ text, verb: false })),
  ...[...new Set(VERB_SUFFIXES)]
    .filter((text) => !NOUN_SUFFIXES.includes(text))
    .map((text) => ({ text, verb: true })),
];

/** Kelime sonunda görülebilen ünsüz çiftleri ("kurt", "üst", "renk"); gerisi kök olamaz */
const FINAL_CLUSTERS = new Set([
  'rk', 'rt', 'st', 'nt', 'lt', 'nk', 'şt', 'ks', 'rp', 'lk', 'rç', 'ft', 'lç', 'nç', 'rs', 'ns', 'rz', 'rf', 'rn', 'lm', 'rm', 'rd', 'nd', 'ng', 'ğr', 'ğl', 'ht', 'hr', 'hl', 'kl', 'pt', 'ps', 'lp', 'yk', 'yn', 'yl', 'yt', 'yz', 'yr', 'ym', 'lf', 'rl', 'zm', 'sm', 'rb', 'rg', 'rh', 'ss', 'tt', 'll', 'kk', 'mm', 'nn', 'dd', 'bb',
]);

function plausibleRoot(stem: string): boolean {
  const a = stem[stem.length - 2];
  const b = stem[stem.length - 1];
  if (isVowel(a) || isVowel(b)) return true;
  return FINAL_CLUSTERS.has(a + b) && !['tt', 'll', 'kk', 'mm', 'nn', 'dd', 'bb', 'ss'].includes(a + b);
}

/** Ünsüz yumuşaması: "kitabı" → "kitab" → "kitap" */
const HARDEN: Record<string, string> = { b: 'p', c: 'ç', d: 't', ğ: 'k', g: 'k' };

const MAX_DEPTH = 4;
/** Sözlüğe en çok bu kadar aday sorulur (kelimenin kendisi hariç) */
export const MAX_CANDIDATES = 8;

function hasVowel(text: string): boolean {
  for (const ch of text) if (isVowel(ch)) return true;
  return false;
}

function lastVowel(text: string): string | undefined {
  for (let i = text.length - 1; i >= 0; i--) if (isVowel(text[i])) return text[i];
  return undefined;
}

/** "gel" → "gelmek", "oku" → "okumak" (büyük ünlü uyumu) */
export function infinitive(stem: string): string {
  const vowel = lastVowel(stem);
  return stem + (vowel && 'eiöü'.includes(vowel) ? 'mek' : 'mak');
}

/** Sözlükte aranacak biçim: küçük harf, noktalama ve kesme işaretinden sonrası yok */
export function lookupForm(word: string): string {
  const clean = trLower(stripPunctuation(word.trim()));
  // "İstanbul'da" → "istanbul"
  return clean.split(/['’]/)[0] ?? '';
}

/**
 * Kelimenin kendisi + aday kökler. İlk eleman her zaman kelimenin kendisi;
 * adaylar kısadan uzuna (uzun zincirlerde kısa kökler daha çok sözlük
 * kelimesi), en çok `MAX_CANDIDATES`.
 */
export function stemCandidates(word: string): string[] {
  const form = lookupForm(word);
  if (form.length < 2) return form ? [form] : [];

  const found = new Map<string, boolean>(); // aday → fiil mi
  let frontier: { stem: string; verb: boolean }[] = [{ stem: form, verb: false }];
  for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth++) {
    const next: { stem: string; verb: boolean }[] = [];
    for (const item of frontier) {
      for (const suffix of SUFFIXES) {
        if (!item.stem.endsWith(suffix.text)) continue;
        // Sondan soyarken önce ad ekleri, sonra fiil ekleri gelir ("düşün-düğ-ü"):
        // fiil eki soyulduktan sonra ad eki soyulmaz
        if (item.verb && !suffix.verb) continue;
        const rest = item.stem.slice(0, -suffix.text.length);
        if (rest.length < 2 || !hasVowel(rest)) continue;
        const verb = item.verb || suffix.verb;
        const variants = [rest];
        const hard = HARDEN[rest[rest.length - 1]];
        if (hard && isVowel(suffix.text[0])) variants.push(rest.slice(0, -1) + hard);
        for (const stem of variants) {
          if (found.has(stem) && (found.get(stem) || !verb)) continue;
          found.set(stem, verb);
          next.push({ stem, verb });
        }
      }
    }
    frontier = next;
  }
  found.delete(form);

  const candidates: string[] = [];
  for (const [stem, verb] of found) {
    if (!plausibleRoot(stem)) continue;
    candidates.push(stem);
    if (verb) candidates.push(infinitive(stem));
  }
  const unique = [...new Set(candidates)].filter((stem) => stem !== form);
  // Mastar biçimleri ve kısa kökler önce: uzun yarı-çekimli biçimler nadiren madde başı
  unique.sort((a, b) => score(a) - score(b) || a.length - b.length || a.localeCompare(b, 'tr'));
  return [form, ...unique.slice(0, MAX_CANDIDATES)];
}

function score(stem: string): number {
  // Mastarı kökün uzunluğuyla say ("gelmek" ≈ "gel")
  if (stem.endsWith('mak') || stem.endsWith('mek')) return stem.length - 3;
  return stem.length;
}

/** Sözlükte bulunan adaylardan en iyisi: en uzun (en az soyulmuş) olan */
export function bestMatch<T extends { word: string }>(found: T[]): T | undefined {
  return [...found].sort((a, b) => score(b.word) - score(a.word) || b.word.length - a.word.length)[0];
}
