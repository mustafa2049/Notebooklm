import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeBadges, type Badge } from '@/habit/badges';
import { BOOK_MIN_WORDS } from '@/habit/books';
import { longestFlexibleStreak, totalsByDay } from '@/habit/summary';
import { improvement, reliableTests } from '@/train/assessment';
import { listAssessments } from './assessments';
import { listDocumentsWithProgress } from './documents';
import { listDrillResults } from './drills';
import { KEYS } from './keys';
import { listSessions } from './stats';
import { listVocab } from './vocab';

/** Bütün depolardan rozet girdisini toplayıp rozetleri hesaplar. */
export async function loadBadges(): Promise<Badge[]> {
  const [sessions, assessments, documents, drills, vocab] = await Promise.all([
    listSessions(),
    listAssessments(),
    listDocumentsWithProgress(),
    listDrillResults(),
    listVocab(),
  ]);

  const finished = documents.filter((item) => item.progress?.finished);
  const schulte5 = drills.filter((result) => result.drill === 'schulte' && result.size === 5);
  const tests = reliableTests(assessments);

  return computeBadges({
    sessions: sessions.length,
    totalWords: sessions.reduce((sum, session) => sum + session.words, 0),
    longestStreak: longestFlexibleStreak(new Set(totalsByDay(sessions).keys())),
    finishedDocs: finished.length,
    finishedBooks: finished.filter((item) => item.meta.wordCount >= BOOK_MIN_WORDS).length,
    tests: assessments.filter((record) => record.kind === 'test').length,
    improvement: improvement(assessments)?.change ?? null,
    recentComprehension: tests
      .slice(-3)
      .reverse()
      .map((record) => record.correct / Math.max(1, record.total)),
    knownWords: vocab.filter((entry) => entry.known).length,
    schulte5BestMs: schulte5.length ? Math.min(...schulte5.map((result) => result.ms)) : null,
  });
}

export async function loadSeenBadges(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.badgesSeen);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export async function markBadgesSeen(ids: string[]): Promise<void> {
  const seen = await loadSeenBadges();
  for (const id of ids) seen.add(id);
  await AsyncStorage.setItem(KEYS.badgesSeen, JSON.stringify([...seen]));
}
