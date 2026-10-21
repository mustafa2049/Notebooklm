import { allStems, lookupForm } from './stem';
import { SOFT_HYPHEN, THIN_SPACE } from './typeset';

/**
 * Defterdeki kelimeleri metinde bulmak — saf, testli.
 *
 * Kaydedilen kelime metinde başka bir çekimle geçebilir: "kitabı" kaydedildi,
 * metinde "kitaplarımızda" var. Kaydederken sözlüğün madde başı (`lemma`) da
 * saklanıyor; metindeki kelime ya kayıtlı biçimlerden biridir ya da aday
 * köklerinden (`allStems`) biri defterdeki bir köktür.
 *
 * Kısa köklerde yanlış eşleşme çok: ekler sondan soyulurken "yöntemdir" de
 * "yön"e iner, "alma" da "almak"a. Bu yüzden kökten eşleştirme en az dört
 * harflik adlarla ve kökü en az üç harflik mastarlarla yapılır; daha kısalar
 * yalnızca aynen geçtiğinde işaretlenir. Şapkalı harfler düz sayılır
 * ("kâğıt" = "kağıt").
 */

/** Kökten eşleştirmede adın en az uzunluğu */
const MIN_ROOT = 4;
/** Mastarda ("gelmek") ekin dışında kalan kökün en az uzunluğu */
const MIN_VERB_STEM = 3;

/** Kökten eşleştirmeye yeter mi (yetmezse yalnızca aynen geçtiğinde) */
function rootable(form: string): boolean {
  if (/m[ae]k$/.test(form)) return form.length - 3 >= MIN_VERB_STEM;
  return form.length >= MIN_ROOT;
}

export interface VocabIndex {
  /** Aynen eşleşen biçimler: kayıtlı kelimeler ve madde başları */
  forms: Set<string>;
  /** Kökten eşleşenler */
  roots: Set<string>;
  /**
   * Köklerin başları: kelime bunlardan biriyle başlamıyorsa kök aranmaz.
   * Kök çözümlemesi pahalı; sayfadaki kelimelerin çoğu burada elenir.
   */
  heads: Set<string>;
  /** Biçim → defterde mi (aynı kelime yeniden çözümlenmesin) */
  cache: Map<string, boolean>;
}

/** Karşılaştırma biçimi: küçük harf, noktalamasız, şapkasız */
export function vocabForm(word: string): string {
  return lookupForm(word).replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
}

/**
 * Kökün başı: metindeki biçim bununla başlar. Son harf yumuşayabildiği için
 * ("kitap" → "kitabı") düşülür, mastar eki de ("gelmek" → "geldi").
 */
function headOf(root: string): string {
  const base = /m[ae]k$/.test(root) && root.length > 4 ? root.slice(0, -3) : root;
  return base.slice(0, -1);
}

export function vocabIndex(entries: { word: string; lemma?: string }[]): VocabIndex {
  const index: VocabIndex = { forms: new Set(), roots: new Set(), heads: new Set(), cache: new Map() };
  for (const entry of entries) {
    for (const value of [entry.word, entry.lemma]) {
      const form = value ? vocabForm(value) : '';
      // Birden çok kelimelik madde başları ("göz atmak") tek kelimeyle eşleşmez
      if (!form || /\s/.test(form)) continue;
      index.forms.add(form);
      if (rootable(form)) {
        index.roots.add(form);
        index.heads.add(headOf(form));
      }
    }
  }
  return index;
}

function mayHaveRoot(heads: Set<string>, form: string): boolean {
  for (let length = 1; length <= form.length; length++) {
    if (heads.has(form.slice(0, length))) return true;
  }
  return false;
}

/** Kelime (çekirdeği) defterde mi: aynı biçim ya da kökü defterde */
export function isVocabWord(index: VocabIndex, word: string): boolean {
  const form = vocabForm(word);
  if (!form) return false;
  const cached = index.cache.get(form);
  if (cached !== undefined) return cached;
  let found = index.forms.has(form);
  if (!found && mayHaveRoot(index.heads, form)) found = allStems(form).some((stem) => index.roots.has(stem));
  index.cache.set(form, found);
  return found;
}

/** Kelimenin defterdeki kaydı (`isVocabWord` ile aynı kurallar): önce aynı biçim, sonra kökten */
export function findVocabEntry<T extends { word: string; lemma?: string }>(entries: T[], word: string): T | undefined {
  const form = vocabForm(word);
  if (!form) return undefined;
  const values = (entry: T) => [entry.word, entry.lemma].map((value) => (value ? vocabForm(value) : ''));
  const same = entries.find((entry) => values(entry).includes(form));
  if (same) return same;
  const stems = new Set(allStems(form));
  return entries.find((entry) => values(entry).some((root) => rootable(root) && stems.has(root)));
}

/**
 * Çizilen metinde seçilen kelimelerin çekirdek aralıkları, `[başlangıç, bitiş)`.
 *
 * `display`, token metinlerinin tek boşlukla birleşiminin `typeset` edilmiş
 * hâli (başında bir boşluk olabilir): eklenmiş yumuşak tireler ve ince
 * boşluklar atlanarak eşlenir. Metin beklenen biçimde değilse işaret yok.
 */
export function coreRanges(
  display: string,
  tokens: { text: string; core: string }[],
  pick: (core: string) => boolean
): [number, number][] {
  const plain = tokens.map((token) => token.text).join(' ');
  const expected = new RegExp(`^${THIN_SPACE}* `).test(display) && !plain.startsWith(' ') ? ` ${plain}` : plain;
  // Düz metnin her karakterinin çizilen metindeki yeri
  const at: number[] = [];
  let i = 0;
  for (let j = 0; j < expected.length; j++) {
    while (i < display.length && display[i] !== expected[j] && (display[i] === SOFT_HYPHEN || display[i] === THIN_SPACE)) i++;
    if (display[i] !== expected[j]) return [];
    at.push(i++);
  }

  const ranges: [number, number][] = [];
  let cursor = expected.length - plain.length;
  for (const token of tokens) {
    const start = token.core ? token.text.indexOf(token.core) : -1;
    if (start >= 0 && pick(token.core)) {
      ranges.push([at[cursor + start], at[cursor + start + token.core.length - 1] + 1]);
    }
    cursor += token.text.length + 1;
  }
  return ranges;
}
