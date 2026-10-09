import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  challengeProgress,
  type ChallengeEntry,
  type ChallengeId,
  type ChallengeProgress,
} from '@/habit/challenges';
import { finishedBooks } from '@/habit/yearReport';
import { listDocumentsWithProgress } from './documents';
import { listJournal } from './journal';
import { KEYS } from './keys';
import { listSessions } from './stats';

/** Meydan okumalar: başlatılanlar ve geçmiş (bkz. `habit/challenges`). */

export interface StoredChallenge extends ChallengeEntry {
  /** Tamamlanınca Bugün ekranında bir kez kutlandı */
  celebrated?: boolean;
}

export async function listChallenges(): Promise<StoredChallenge[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.challenges);
    return raw ? (JSON.parse(raw) as StoredChallenge[]) : [];
  } catch {
    return [];
  }
}

async function write(entries: StoredChallenge[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.challenges, JSON.stringify(entries.slice(0, 300)));
}

export async function startChallenge(id: ChallengeId): Promise<void> {
  await write([{ id, startedAt: Date.now() }, ...(await listChallenges())]);
}

export async function abandonChallenge(entry: ChallengeEntry): Promise<void> {
  await write(
    (await listChallenges()).map((item) =>
      item.id === entry.id && item.startedAt === entry.startedAt ? { ...item, abandonedAt: Date.now() } : item
    )
  );
}

export async function markCelebrated(entry: ChallengeEntry): Promise<void> {
  await write(
    (await listChallenges()).map((item) =>
      item.id === entry.id && item.startedAt === entry.startedAt ? { ...item, celebrated: true } : item
    )
  );
}

/**
 * Bütün meydan okumaların güncel durumu. Hedefe ulaşanların tamamlanma anı
 * burada bir kez yazılır: sonradan veri değişse (kitap silinse) de tamam kalır.
 */
export async function loadChallenges(now = Date.now()): Promise<(ChallengeProgress & { entry: StoredChallenge })[]> {
  const [entries, sessions, library, journal] = await Promise.all([
    listChallenges(),
    listSessions(),
    listDocumentsWithProgress(),
    listJournal(),
  ]);
  const data = { sessions, books: finishedBooks(journal, library) };
  let changed = false;
  const updated = entries.map((entry) => {
    const progress = challengeProgress(entry, data, now);
    if (progress?.status === 'done' && entry.completedAt === undefined) {
      changed = true;
      return { ...entry, completedAt: now };
    }
    return entry;
  });
  if (changed) await write(updated);
  return updated.flatMap((entry) => {
    const progress = challengeProgress(entry, data, now);
    return progress ? [{ ...progress, entry }] : [];
  });
}
