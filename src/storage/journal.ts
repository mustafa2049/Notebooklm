import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './keys';

/**
 * Okuma günlüğü: bitirilen kitaplar, puan ve kısa not.
 *
 * Kitap kütüphaneden silinse de günlükte kalır (başlık ve kelime sayısı burada
 * da tutuluyor) — "bu yıl ne okudum" sorusunun cevabı kaybolmasın.
 */

export interface JournalEntry {
  docId: string;
  title: string;
  wordCount: number;
  finishedAt: number;
  /** 1–5; 0 = puan verilmedi */
  rating: number;
  note: string;
  updatedAt: number;
}

export async function listJournal(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.journal);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

export async function journalFor(docId: string): Promise<JournalEntry | null> {
  return (await listJournal()).find((entry) => entry.docId === docId) ?? null;
}

/** Kitap başına tek kayıt: varsa yerine yazılır */
export async function saveJournal(entry: JournalEntry): Promise<void> {
  const others = (await listJournal()).filter((item) => item.docId !== entry.docId);
  await AsyncStorage.setItem(KEYS.journal, JSON.stringify([entry, ...others]));
}

export async function removeJournal(docId: string): Promise<void> {
  const entries = await listJournal();
  const kept = entries.filter((item) => item.docId !== docId);
  if (kept.length !== entries.length) await AsyncStorage.setItem(KEYS.journal, JSON.stringify(kept));
}
