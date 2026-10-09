import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './keys';

/**
 * Bölüm sonu soruları için kitap başına önerilmiş bölümler: aynı bölüm iki
 * kez sorulmasın (kabul edilse de geçilse de).
 */

type Checks = Record<string, number[]>;

async function read(): Promise<Checks> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.chapterChecks);
    return raw ? (JSON.parse(raw) as Checks) : {};
  } catch {
    return {};
  }
}

export async function askedChapters(docId: string): Promise<number[]> {
  return (await read())[docId] ?? [];
}

export async function markChapterAsked(docId: string, chapter: number): Promise<void> {
  const checks = await read();
  const list = checks[docId] ?? [];
  if (list.includes(chapter)) return;
  checks[docId] = [...list, chapter];
  await AsyncStorage.setItem(KEYS.chapterChecks, JSON.stringify(checks));
}
