import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecallFeedback } from '@/ai/validate';
import { KEYS } from './keys';

/**
 * Okuduktan sonra kendi cümleleriyle yazılan özetler. AI açıksa geri bildirimi
 * de saklanır; değilse özet tek başına alıntı defterinde durur.
 */

export interface Recall {
  id: string;
  docId: string;
  docTitle: string;
  at: number;
  /** Bu özetin kapsadığı okunan aralık */
  fromChar: number;
  toChar: number;
  text: string;
  feedback?: RecallFeedback;
}

const MAX_RECALLS = 2000;

export async function listRecalls(): Promise<Recall[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.recalls);
    return raw ? (JSON.parse(raw) as Recall[]) : [];
  } catch {
    return [];
  }
}

async function write(items: Recall[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.recalls, JSON.stringify(items.slice(0, MAX_RECALLS)));
}

export async function addRecall(input: Omit<Recall, 'id' | 'at'>): Promise<Recall> {
  const recall: Recall = {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
  };
  await write([recall, ...(await listRecalls())]);
  return recall;
}

export async function setRecallFeedback(id: string, feedback: RecallFeedback): Promise<void> {
  const items = await listRecalls();
  await write(items.map((item) => (item.id === id ? { ...item, feedback } : item)));
}

export async function deleteRecall(id: string): Promise<void> {
  await write((await listRecalls()).filter((item) => item.id !== id));
}
