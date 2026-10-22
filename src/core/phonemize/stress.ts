/**
 * Türkçe kelime vurgusu — saf, testli.
 *
 * Türkçede vurgu çoğunlukla son hecededir. İstisnalar burada kurala bağlı:
 * - Vurgusuz küçük kelimeler (ve, de, ki, mi, bu…) ve ikincil vurgulu
 *   bağlaçlar (ile, veya, yoksa).
 * - Kendinden önceki heceyi vurgulatan ekler: ek fiil -DIr ("cezaDIR" değil
 *   "ceZAdır"), -ken ("gençken"), araç eki -(y)lA ("adıyla"), şimdiki zaman
 *   -yor ("geLİyor"), olumsuzluk -mA- ("GELmedi").
 * - Zaman ekinden sonra gelen vurgusuz kişi ekleri ("geleCEğim", "gelMİşim").
 * - Sözlükte kendi vurgusu olan sık kelimeler ve kökler (ama, değil,
 *   Türkiye, İstanbul…); kök, çekimli hâlinde de vurgusunu korur.
 *
 * Seçimler espeak-ng'nin Türkçe çıktısıyla (Piper'ın Türkçe seslerini
 * eğittiği sistem) karşılaştırılarak yapıldı; dilbilgisine açıkça aykırı
 * olduğu yerlerde (ör. "almaYA" gibi isim-fiil + hâl eki) dilbilgisi seçildi.
 */

export interface Stress {
  /** Vurgulu hecenin sırası (baştan, 0'dan) */
  syllable: number;
  mark: 'ˈ' | 'ˌ';
}

const UNSTRESSED = new Set(['ben', 'bir', 'biz', 'bu', 'da', 'de', 'ki', 'mi', 'mı', 'mu', 'mü', 'o', 'sen', 'siz', 've', 'şu']);
/** Ayrı yazılan soru eki çekimleri ("mısın", "midir") vurgusuz */
const QUESTION = /^m[ıiuü](?:y[ıiuü]m|s[ıiuü]n|y[ıiuü]z|s[ıiuü]n[ıiuü]z|d[ıiuü]r|yd[ıiuü]|ym[ıiuü]ş)?$/;
const SECONDARY: Record<string, number> = { ile: 0, veya: 1, yoksa: 0 };

/** Kendi vurgusu olan kelimeler (yalnızca bu yazılışla) */
const WORDS: Record<string, number> = {
  ama: 0,
  ise: 0,
  iken: 0,
  önce: 0,
  öyle: 0,
  böyle: 0,
  şöyle: 0,
  asla: 0,
  fazla: 0,
  bence: 0,
  sence: 0,
  bile: 0,
  erken: 0,
  oysa: 0,
  sadece: 1,
  bizim: 0,
  sizin: 0,
  kimse: 0,
  bahçe: 0,
  isim: 0,
  ince: 0,
  ilçe: 0,
  radyo: 0,
  dolayı: 0,
  arada: 0,
  burada: 0,
  orada: 0,
  şurada: 0,
  nerede: 0,
  buraya: 0,
  oraya: 0,
  şuraya: 0,
  nereye: 0,
  buradan: 0,
  oradan: 0,
  nereden: 0,
};

/** Çekimli hâllerinde de vurgusunu koruyan kökler ("Türkiye'de", "değildir") */
const ROOTS: Record<string, number> = {
  değil: 0,
  türkçe: 0,
  türkiye: 0,
  avrupa: 0,
  amerika: 1,
  istanbul: 1,
  izmir: 0,
  ankara: 0,
  almanya: 1,
  lütfen: 0,
  yüksek: 0,
  insan: 0,
  sekiz: 0,
  dokuz: 0,
  seksen: 0,
  doksan: 0,
};

const COPULA = /^[dt][ıiuü]r$/;
/** -DIr ile biten ama ek fiil olmayan kökler */
const COPULA_EXCLUDE = new Set(['kadir', 'nadir', 'bedir', 'hıdır', 'sadır', 'müdür', 'çadır', 'tedbir', 'takdir']);
const VOICELESS = 'çfhkpsşt';
const NEGATIVE_NEXT = /^(?:[dt][ıiuü]|m[ıiuü]ş|y[ae]|s[ae]|l[ıi]|y[ıi]n)/;

/**
 * Son hece ek fiil -DIr olabilir mi: ünsüz benzeşmesine göre ek fiil ötümsüz
 * ünsüzden sonra t, öbür seslerden sonra d ile başlar. "belirtir", "iletir"
 * (fiil + geniş zaman) ve "kültür" bu yüzden ek fiil sayılmaz.
 */
function isCopula(word: string, syllables: string[], index: number): boolean {
  if (!COPULA.test(syllables[index]) || COPULA_EXCLUDE.has(word)) return false;
  const before = syllables[index - 1];
  const last = before[before.length - 1];
  return syllables[index][0] === 't' ? VOICELESS.includes(last) : !VOICELESS.includes(last);
}
/** Zaman eki + vurgusuz kişi eki; sayı, vurgulanan ünlünün ek içindeki yeri */
const TENSE_PERSON: [RegExp, number][] = [
  [/(?:acağ|eceğ)(?:ım|im)$/, 2],
  [/(?:acak|ecek)(?:sın|sin|ız|iz|sınız|siniz)$/, 2],
  [/(?:mış|miş|muş|müş)(?:ım|im|um|üm|sın|sin|sun|sün|ız|iz|uz|üz|sınız|siniz|sunuz|sünüz)$/, 1],
];

/** Harf sırasının bulunduğu hece */
function syllableAt(syllables: string[], charIndex: number): number {
  let end = 0;
  for (let s = 0; s < syllables.length; s++) {
    end += syllables[s].length;
    if (charIndex < end) return s;
  }
  return syllables.length - 1;
}

/** Son hecesi zaman bildiren -ken mi ("gençken", "gelirken"; "çeken" sıfat-fiili değil) */
export function isKenSuffix(syllables: string[], index: number): boolean {
  if (index < 1 || syllables[index] !== 'ken') return false;
  const after = syllables.slice(index + 1);
  if (after.length > 1 || (after.length === 1 && !COPULA.test(after[0]))) return false;
  return !/[aeıioöuüâîû]$/.test(syllables[index - 1]);
}

export function stressOf(word: string, syllables: string[]): Stress | null {
  const count = syllables.length;
  if (!/[aeıioöuüâîû]/.test(word)) return null;
  if (UNSTRESSED.has(word) || QUESTION.test(word)) return null;
  if (word in SECONDARY) return { syllable: SECONDARY[word], mark: 'ˌ' };
  if (word in WORDS) return { syllable: Math.min(WORDS[word], count - 1), mark: 'ˈ' };

  const candidates: number[] = [];
  for (const root in ROOTS) {
    if (word.startsWith(root)) candidates.push(ROOTS[root]);
  }

  if (count >= 2) {
    const last = syllables[count - 1];
    // Ek fiil -DIr (ve -DIrlAr)
    if (isCopula(word, syllables, count - 1)) candidates.push(count - 2);
    if (count >= 3 && /^l[ae]r$/.test(last) && isCopula(word, syllables, count - 2)) candidates.push(count - 3);
    // -ken
    for (let s = 1; s < count; s++) if (isKenSuffix(syllables, s)) candidates.push(s - 1);
    // Araç eki: adıyla, benimle, bununla, özellikle
    if (
      /^l[ae]$/.test(last) &&
      (/[ym]$/.test(syllables[count - 2]) || /(?:n[ıiuü]nl[ae]|l[ıiuü]kl[ae])$/.test(word))
    ) {
      candidates.push(count - 2);
    }
    // Şimdiki zaman: geliyor, gelmiyor (olumsuzda -mI- öncesi)
    const yor = syllables.findIndex((syl, s) => s >= 1 && syl.startsWith('yor'));
    if (yor >= 1) candidates.push(/^m[ıiuü]$/.test(syllables[yor - 1]) && yor >= 2 ? yor - 2 : yor - 1);
    // Olumsuzluk: gelmedi, almamış, gelmeyecek, yazmalı. Sondaki -mA çoğunlukla
    // isim-fiil ("araştırma"), onun vurgusu sondadır.
    for (let s = 1; s < count - 1; s++) {
      if (/^m[ae]$/.test(syllables[s]) && NEGATIVE_NEXT.test(syllables[s + 1])) {
        candidates.push(s - 1);
        break;
      }
    }
    // Zaman eki + vurgusuz kişi eki: geleceğim, gelmişsin
    for (const [pattern, vowel] of TENSE_PERSON) {
      const match = word.match(pattern);
      if (match?.index !== undefined) candidates.push(syllableAt(syllables, match.index + vowel));
    }
  }

  const syllable = candidates.length ? Math.max(0, Math.min(...candidates)) : count - 1;
  return { syllable: Math.min(syllable, count - 1), mark: 'ˈ' };
}
