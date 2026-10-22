import { normalizeForSpeech } from '../../src/core/phonemize/normalize';
import { phonemize } from '../../src/core/phonemize/g2p';

/**
 * Kendi sesin eğitim derlemi — saf, testli.
 *
 * Eğitim verisi, sesinle okunan (Chatterbox'ın senin sesinle ürettiği ya da
 * senin kaydettiğin) cümleler. İyi bir ses için cümleler Türkçenin ses
 * ikililerini (fonem çiftleri) olabildiğince kapsamalı: aday cümleler
 * içinden her adımda en çok yeni ikili getiren seçilir (açgözlü kapsama),
 * kısa cümleler biraz öne alınır. Liste bu sırayla yazıldığı için baştan
 * alınan her alt küme de iyi kapsar (not defterinde cümle sayısı
 * azaltılabilir).
 *
 * Cümlenin metni "söylendiği gibi" yazılır (sayılar kelimeyle): okuyan ses
 * de, fonemler de aynı metinden çıkar.
 */

export interface Candidate {
  text: string;
  phonemes: string[];
  source: string;
}

const MIN_WORDS = 4;
const MAX_WORDS = 20;
const MAX_CHARS = 180;
/** Yalnızca Türkçe harfler, boşluk ve okunan noktalama */
const ALLOWED = /^[A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû ,;:.!?]+$/;
const WORD_COUNT = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Metni cümlelere böler ve eğitime uygun olanları döndürür */
export function candidateSentences(text: string, source: string): Candidate[] {
  const out: Candidate[] = [];
  for (const paragraph of text.split(/\n+/)) {
    // Önce bölünür, sonra okunuşa çevrilir: "1923 yılında" küçük harfle başlamasın
    for (const sentence of paragraph.split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜÂ0-9"“'(])/)) {
      const trimmed = normalizeForSpeech(sentence).trim();
      const words = WORD_COUNT(trimmed);
      if (words < MIN_WORDS || words > MAX_WORDS || trimmed.length > MAX_CHARS) continue;
      if (!ALLOWED.test(trimmed) || !/[.!?]$/.test(trimmed)) continue;
      // Harf harf okunan kısaltma ya da başlık gibi büyük harfli kelime yok
      if (/\b[A-ZÇĞİÖŞÜ]{2,}\b/.test(trimmed)) continue;
      // Yabancı harfler (q, w, x) Türkçe okunuşu belirsizleştirir
      if (/[qwx]/i.test(trimmed)) continue;
      out.push({ text: trimmed, phonemes: phonemize(trimmed, { normalized: true }), source });
    }
  }
  return out;
}

/** Kapsama birimleri: vurgu işareti atılmış fonem ikilileri (kelime sınırı dahil) */
export function coverageUnits(phonemes: string[]): Set<string> {
  const plain = phonemes.filter((p) => p !== 'ˈ' && p !== 'ˌ');
  const units = new Set<string>();
  for (let i = 1; i < plain.length; i++) units.add(plain[i - 1] + plain[i]);
  return units;
}

/**
 * Açgözlü kapsama: her adımda (yeni ikili sayısı / √kelime) en yüksek cümle;
 * yeni ikili kalmayınca kalanlar dengeli uzunlukta eklenir. Soru ve ünlem
 * cümleleri tonlama için biraz öne alınır. Aynı metin bir kez.
 */
export function selectCorpus(candidates: Candidate[], count: number): Candidate[] {
  const seen = new Set<string>();
  const pool = candidates.filter((candidate) => {
    const key = candidate.text.toLocaleLowerCase('tr');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const units = pool.map((candidate) => coverageUnits(candidate.phonemes));
  const covered = new Set<string>();
  const chosen: number[] = [];
  const used = new Set<number>();
  while (chosen.length < Math.min(count, pool.length)) {
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < pool.length; i++) {
      if (used.has(i)) continue;
      let fresh = 0;
      for (const unit of units[i]) if (!covered.has(unit)) fresh++;
      if (fresh === 0) continue;
      const bonus = /[?!]$/.test(pool[i].text) ? 1.3 : 1;
      const score = (fresh / Math.sqrt(WORD_COUNT(pool[i].text))) * bonus;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    used.add(best);
    chosen.push(best);
    units[best].forEach((unit) => covered.add(unit));
  }
  // Kapsama doldu: kalanlar, 8–14 kelimelik (en doğal uzunluk) cümleler önce
  const rest = pool
    .map((candidate, i) => ({ i, distance: Math.abs(WORD_COUNT(candidate.text) - 11) }))
    .filter(({ i }) => !used.has(i))
    .sort((a, b) => a.distance - b.distance || a.i - b.i);
  for (const { i } of rest) {
    if (chosen.length >= count) break;
    chosen.push(i);
  }
  return chosen.map((i) => pool[i]);
}

/** TSV satırı: kimlik, metin, fonemler (sekme ve satır sonu içermez) */
export function corpusLine(index: number, candidate: Candidate): string {
  return [`c${String(index + 1).padStart(4, '0')}`, candidate.text, candidate.phonemes.join('')].join('\t');
}
