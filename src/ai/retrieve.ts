import { STOPWORDS } from '@/core/cloze';
import { stripPunctuation, trLower } from '@/core/turkish';

/**
 * Sohbet için metnin ilgili bölümlerini seçme.
 *
 * Bir kitabın tamamını her soruda modele göndermek hem pahalı hem de sağlayıcı
 * sınırlarını aşıyor. Bunun yerine metin bölümlere ayrılır ve soruyla kelime
 * örtüşmesi en yüksek olanlar seçilir. Ağ yok, model yok, gömme (embedding) yok
 * — tek bir sayaç: soruda geçen anlamlı kelimelerin bölümde kaç kez geçtiği.
 *
 * Basit ama bu iş için yeterli: kullanıcı metnin kendi kelimeleriyle soru
 * soruyor. Yetmediğinde model "verilen bölümler yanıtlamaya yetmiyor" diyecek
 * (bkz. `prompts.chatRequest`), sessizce uydurmayacak.
 */

/** Bir bölümün hedef uzunluğu — modele giden parça sayısı × bu = toplam maliyet. */
const PASSAGE_WORDS = 220;

export interface Passage {
  text: string;
  /** Bölümün metindeki başlangıç karakter konumu */
  charOffset: number;
}

/** Metni paragraf sınırlarını koruyarak yaklaşık eşit bölümlere ayırır. */
export function splitPassages(text: string, passageWords = PASSAGE_WORDS): Passage[] {
  const passages: Passage[] = [];
  const paragraphs = splitParagraphs(text);

  let buffer = '';
  let bufferStart = 0;
  let words = 0;

  const flush = () => {
    if (buffer.trim()) passages.push({ text: buffer.trim(), charOffset: bufferStart });
    buffer = '';
    words = 0;
  };

  for (const paragraph of paragraphs) {
    if (!buffer) bufferStart = paragraph.charOffset;
    buffer = buffer ? `${buffer}\n\n${paragraph.text}` : paragraph.text;
    words += countWords(paragraph.text);
    if (words >= passageWords) flush();
  }
  flush();

  return passages;
}

interface Paragraph {
  text: string;
  charOffset: number;
}

/**
 * Paragrafa bölme. Tek satır sonu paragraf sayılmaz (sert sarmalanmış metinler
 * `ingest/normalize` tarafından zaten açılıyor); çok uzun paragraflar bölümün
 * hedefini aşmasın diye cümle sınırından ikiye ayrılır.
 */
function splitParagraphs(text: string): Paragraph[] {
  const result: Paragraph[] = [];
  const pattern = /\n\s*\n/g;
  let start = 0;
  let match: RegExpExecArray | null;

  const push = (chunk: string, offset: number) => {
    if (!chunk.trim()) return;
    if (countWords(chunk) <= PASSAGE_WORDS * 1.5) {
      result.push({ text: chunk, charOffset: offset });
      return;
    }
    // Uzun paragrafı cümle sınırlarından PASSAGE_WORDS'e yakın parçalara böl
    let piece = '';
    let pieceStart = offset;
    let cursor = offset;
    for (const sentence of chunk.split(/(?<=[.!?…])\s+/)) {
      if (!piece) pieceStart = cursor;
      piece = piece ? `${piece} ${sentence}` : sentence;
      cursor += sentence.length + 1;
      if (countWords(piece) >= PASSAGE_WORDS) {
        result.push({ text: piece, charOffset: pieceStart });
        piece = '';
      }
    }
    if (piece.trim()) result.push({ text: piece, charOffset: pieceStart });
  };

  while ((match = pattern.exec(text)) !== null) {
    push(text.slice(start, match.index), start);
    start = match.index + match[0].length;
  }
  push(text.slice(start), start);

  return result;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Soruyu anlamlı kelimelere indirir (durak kelimeler ve kısa kelimeler atılır). */
export function keywords(question: string): string[] {
  const seen = new Set<string>();
  for (const raw of question.split(/\s+/)) {
    const core = trLower(stripPunctuation(raw));
    if (core.length < 3 || STOPWORDS.has(core)) continue;
    seen.add(core);
  }
  return [...seen];
}

/**
 * Türkçe ekler kelimenin sonuna geliyor ("okuma" → "okumanın"), bu yüzden
 * tam eşitlik yerine gövde başlangıcı karşılaştırılıyor: en az 4 karakter
 * ortak önek varsa aynı kelime sayılır.
 */
function matches(word: string, key: string): boolean {
  if (word === key) return true;
  const shared = Math.min(word.length, key.length);
  if (shared < 4) return false;
  return word.startsWith(key.slice(0, Math.max(4, Math.floor(key.length * 0.7))));
}

function score(passage: string, keys: string[]): number {
  if (!keys.length) return 0;
  const words = passage.split(/\s+/).map((w) => trLower(stripPunctuation(w)));
  let hits = 0;
  for (const key of keys) {
    if (words.some((word) => matches(word, key))) hits += 1;
  }
  return hits;
}

export interface PickOptions {
  /** Modele gönderilecek en fazla bölüm sayısı */
  count?: number;
  /** Kullanıcının okuduğu yer — o bölüm her zaman gönderilir */
  charOffset?: number;
}

/**
 * Soruya en uygun bölümleri seçer. Okunan bölüm her zaman dahil edilir
 * ("bu ne demek?" gibi bağlama dayalı sorular için), kalan yerler örtüşme
 * skoruna göre dolar. Dönen bölümler metindeki sırasını korur.
 */
export function pickPassages(
  passages: Passage[],
  question: string,
  options: PickOptions = {}
): Passage[] {
  const count = Math.max(1, options.count ?? 3);
  if (passages.length <= count) return passages;

  const keys = keywords(question);
  const chosen = new Set<number>();

  if (options.charOffset !== undefined) {
    let current = 0;
    for (let i = 0; i < passages.length; i++) {
      if (passages[i].charOffset <= options.charOffset) current = i;
      else break;
    }
    chosen.add(current);
  }

  const ranked = passages
    .map((passage, index) => ({ index, value: score(passage.text, keys) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || a.index - b.index);

  for (const entry of ranked) {
    if (chosen.size >= count) break;
    chosen.add(entry.index);
  }

  // Örtüşen bölüm yoksa metnin başından doldur: boş göndermekten iyi
  for (let i = 0; i < passages.length && chosen.size < count; i++) chosen.add(i);

  return [...chosen].sort((a, b) => a - b).map((index) => passages[index]);
}
