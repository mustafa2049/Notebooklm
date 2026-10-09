import { describe, expect, it } from 'vitest';
import { canStart, challengeProgress, progressLabel, type ChallengeEntry } from './challenges';

const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
const MIN = 60_000;
const read = (day: number, minutes: number, words = minutes * 200) => ({ at: at(day), ms: minutes * MIN, words });
const none = { sessions: [], books: [] };

describe('meydan okumalar', () => {
  it('7 gün üst üste: her gün okununca tamam', () => {
    const entry: ChallengeEntry = { id: 'streak7', startedAt: at(1, 9) };
    const sessions = [1, 2, 3, 4, 5, 6, 7].map((day) => read(day, 5));
    const progress = challengeProgress(entry, { sessions, books: [] }, at(7, 20))!;
    expect(progress.status).toBe('done');
    expect(progressLabel(progress)).toBe('7 / 7 gün');
  });

  it('bir gün kaçınca "kaçtı" (artık yetişmez); yetişebiliyorsa sürüyor', () => {
    const entry: ChallengeEntry = { id: 'streak7', startedAt: at(1, 9) };
    // 1 ve 3 okundu, 2 kaçtı → 7'ye ulaşmak imkânsız
    expect(challengeProgress(entry, { sessions: [read(1, 5), read(3, 5)], books: [] }, at(3, 20))!.status).toBe('missed');
    // 1, 2 okundu, bugün (3) henüz okunmadı → hâlâ mümkün
    const progress = challengeProgress(entry, { sessions: [read(1, 5), read(2, 5)], books: [] }, at(3, 8))!;
    expect(progress.status).toBe('active');
    expect(progress.daysLeft).toBe(5);
  });

  it('iki haftada 10 gün: yalnızca 15 dakikalık günler sayılıyor', () => {
    const entry: ChallengeEntry = { id: 'daily15', startedAt: at(1) };
    const sessions = [read(1, 20), read(2, 10), read(2, 6), read(3, 5)];
    const progress = challengeProgress(entry, { sessions, books: [] }, at(3, 20))!;
    expect(progress.value).toBe(2);
    expect(progress.status).toBe('active');
  });

  it('haftada 3 saat: süre penceresi dışındaki okuma sayılmıyor', () => {
    const entry: ChallengeEntry = { id: 'hours3', startedAt: at(1) };
    const sessions = [read(1, 60), read(5, 60), read(7, 59), read(8, 120)];
    const progress = challengeProgress(entry, { sessions, books: [] }, at(8, 12))!;
    expect(progress.value).toBe(179);
    expect(progress.status).toBe('missed');
    expect(progress.daysLeft).toBe(0);
  });

  it('30 günde bir kitap: kısa metin sayılmıyor', () => {
    const entry: ChallengeEntry = { id: 'book30', startedAt: at(1) };
    const short = { books: [{ wordCount: 1000, finishedAt: at(5) }], sessions: [] };
    expect(challengeProgress(entry, short, at(6))!.status).toBe('active');
    const book = { books: [{ wordCount: 60000, finishedAt: at(5) }], sessions: [] };
    expect(challengeProgress(entry, book, at(6))!.status).toBe('done');
  });

  it('tamamlanan sonradan veriler değişse de tamam kalıyor; bırakılan "bırakıldı"', () => {
    expect(challengeProgress({ id: 'words20k', startedAt: at(1), completedAt: at(3) }, none, at(20))!.status).toBe('done');
    expect(challengeProgress({ id: 'words20k', startedAt: at(1), abandonedAt: at(2) }, none, at(3))!.status).toBe('abandoned');
  });

  it('aynı meydan okuma sürerken yeniden başlatılamıyor', () => {
    const entries: ChallengeEntry[] = [{ id: 'words20k', startedAt: at(1) }];
    expect(canStart(entries, 'words20k', none, at(2))).toBe(false);
    expect(canStart(entries, 'hours3', none, at(2))).toBe(true);
    expect(canStart(entries, 'words20k', none, at(20))).toBe(true);
  });

  it('bilinmeyen kayıt yok sayılıyor', () => {
    expect(challengeProgress({ id: 'yok' as never, startedAt: at(1) }, none, at(2))).toBeNull();
  });
});
