import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReviewItem } from '@/train/review';
import { KEYS } from './keys';

/**
 * Kelime defteri: okurken takılınan kelimeler ve geçtikleri cümle.
 *
 * Cümleyi de saklıyoruz çünkü kelimenin anlamı bağlamla birlikte akılda
 * kalıyor; tek başına bir liste ezber listesi olur. AI açıksa açıklama da
 * kaydedilir, kapalıysa kullanıcı kendi notunu yazabilir.
 */

export interface VocabEntry extends ReviewItem {
  id: string;
  word: string;
  /** Kelimenin geçtiği cümle */
  sentence: string;
  /** AI açıklaması ya da kullanıcının notu */
  note?: string;
  docId?: string;
  docTitle?: string;
}

const MAX_ENTRIES = 2000;

export async function listVocab(): Promise<VocabEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.vocab);
    return raw ? (JSON.parse(raw) as VocabEntry[]) : [];
  } catch {
    return [];
  }
}

async function write(entries: VocabEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.vocab, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export interface NewVocabEntry {
  word: string;
  sentence: string;
  note?: string;
  docId?: string;
  docTitle?: string;
}

/**
 * Kelimeyi ekler. Aynı kelime zaten varsa yeni kayıt açmaz, mevcut kaydı
 * günceller — aynı kelimeye iki kez takılmak yeni bir kelime değil.
 */
export async function addVocab(input: NewVocabEntry): Promise<VocabEntry> {
  const entries = await listVocab();
  const key = input.word.trim().toLocaleLowerCase('tr');
  const existing = entries.find((entry) => entry.word.trim().toLocaleLowerCase('tr') === key);

  if (existing) {
    const updated: VocabEntry = {
      ...existing,
      sentence: input.sentence || existing.sentence,
      note: input.note ?? existing.note,
      docId: input.docId ?? existing.docId,
      docTitle: input.docTitle ?? existing.docTitle,
    };
    await write(entries.map((entry) => (entry.id === existing.id ? updated : entry)));
    return updated;
  }

  const entry: VocabEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    word: input.word.trim(),
    sentence: input.sentence,
    note: input.note,
    docId: input.docId,
    docTitle: input.docTitle,
    known: false,
    reviews: 0,
    createdAt: Date.now(),
  };
  await write([entry, ...entries]);
  return entry;
}

export async function updateVocab(entry: VocabEntry): Promise<void> {
  const entries = await listVocab();
  await write(entries.map((current) => (current.id === entry.id ? entry : current)));
}

export async function removeVocab(id: string): Promise<void> {
  const entries = await listVocab();
  await write(entries.filter((entry) => entry.id !== id));
}

export async function clearVocab(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.vocab);
}
