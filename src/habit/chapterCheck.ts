/**
 * Bölüm sonu anlama soruları — saf, testli.
 *
 * Okur bir bölümü **okuyarak** bitirip sonrakine geçtiğinde (atlayarak değil)
 * o bölümden birkaç soru önerilir. Atlama ayrımı konumun ne kadar ilerlediğine
 * bakarak yapılıyor: normal okumada konum küçük adımlarla (kelime, sayfa,
 * kaydırma bildirimi) ilerler; içindekilerden ya da kaydırıcıyla atlamak
 * büyük bir sıçramadır.
 */

interface Chapter {
  title: string;
  charOffset: number;
}

/** Bu kadar kısa bölüm (kapak, ithaf, içindekiler) için soru sorulmaz */
export const MIN_CHAPTER_CHARS = 1500;
/** Bir adımda bundan fazla ilerlemek okuma değil atlamadır */
export const MAX_READING_STEP = 4000;
/** Sorular için bölümden gönderilen en çok karakter (maliyet sınırı) */
export const MAX_CHAPTER_TEXT = 12000;

/** Konumun içinde olduğu bölümün sırası; ilk bölümden önceyse -1 */
export function chapterIndexAt(chapters: Chapter[], offset: number): number {
  let index = -1;
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].charOffset <= offset) index = i;
    else break;
  }
  return index;
}

/** Bölümün metindeki aralığı [start, end) */
export function chapterRange(chapters: Chapter[], index: number, textLength: number): { start: number; end: number } {
  const start = chapters[index]?.charOffset ?? 0;
  const end = chapters[index + 1]?.charOffset ?? textLength;
  return { start, end: Math.max(start, end) };
}

/**
 * Konum `from`'dan `to`'ya ilerlerken okuyarak bitirilen bölüm (sorulmaya
 * değerse), yoksa `null`. `asked`: bu kitapta daha önce önerilen bölümler.
 */
export function finishedChapter(
  chapters: Chapter[],
  from: number,
  to: number,
  textLength: number,
  asked: number[]
): number | null {
  if (chapters.length < 2 || to <= from || to - from > MAX_READING_STEP) return null;
  const before = chapterIndexAt(chapters, from);
  const after = chapterIndexAt(chapters, to);
  if (before < 0 || after !== before + 1) return null;
  if (asked.includes(before)) return null;
  const { start, end } = chapterRange(chapters, before, textLength);
  if (end - start < MIN_CHAPTER_CHARS) return null;
  return before;
}

/**
 * Sorular için bölüm metni: çok uzunsa sonundan (okurun aklında en taze olan
 * kısım) `MAX_CHAPTER_TEXT` karakter, kelime sınırından başlayarak.
 */
export function chapterText(text: string, chapters: Chapter[], index: number): string {
  const { start, end } = chapterRange(chapters, index, text.length);
  const body = text.slice(start, end).trim();
  if (body.length <= MAX_CHAPTER_TEXT) return body;
  const tail = body.slice(body.length - MAX_CHAPTER_TEXT);
  const space = tail.search(/\s/);
  return (space >= 0 ? tail.slice(space) : tail).trim();
}
