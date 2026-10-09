import { describe, expect, it } from 'vitest';
import {
  createPlan,
  dayKeyAfter,
  daysBetween,
  planDays,
  planStatus,
  wordsReadToday,
} from './bookPlan';

/** Yerel saatle öğlen: gün sınırlarından uzak */
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime();
const WPM = 250;

describe('gün aritmetiği', () => {
  it('gün farkını takvim günüyle sayıyor (yaz saati geçişinde de)', () => {
    expect(daysBetween('2026-10-09', '2026-10-16')).toBe(7);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(dayKeyAfter(at(2026, 10, 25), 1)).toBe('2026-10-26');
    expect(dayKeyAfter(at(2026, 12, 31), 1)).toBe('2027-01-01');
  });

  it('"7 günde bitir": bugün ilk gün, son gün 6 gün sonra', () => {
    const plan = createPlan({ docId: 'k', days: 7, readWords: 1200, now: at(2026, 10, 9) });
    expect(plan).toMatchObject({ startDay: '2026-10-09', targetDay: '2026-10-15', startWords: 1200 });
    expect(planDays(plan)).toBe(7);
  });
});

describe('planStatus', () => {
  // 7000 kelimelik kitap, 7 gün: günde 1000
  const plan = createPlan({ docId: 'k', days: 7, readWords: 0, now: at(2026, 10, 9) });
  const book = (readWords: number, todayRead = 0, finished = false) => ({
    wordCount: 7000,
    readWords,
    finished,
    todayRead,
  });

  it('ilk gün: pay kalan ÷ gün, dakika doğal hızla', () => {
    const status = planStatus(plan, book(0), at(2026, 10, 9), WPM);
    expect(status).toMatchObject({ state: 'onTrack', daysLeft: 7, todayTarget: 1000, todayLeft: 1000 });
    expect(status.todayMinutes).toBe(4);
  });

  it('bugün okundukça kalan pay azalıyor, pay bitince 0', () => {
    expect(planStatus(plan, book(600, 600), at(2026, 10, 9), WPM).todayLeft).toBe(400);
    const done = planStatus(plan, book(1000, 1000), at(2026, 10, 9), WPM);
    expect(done.todayLeft).toBe(0);
    expect(done.todayMinutes).toBe(0);
  });

  it('geride kalınca kalan, kalan günlere yeniden dağıtılıyor', () => {
    // 3. gün, hiç okunmamış: 7000 / 5 gün
    const status = planStatus(plan, book(0), at(2026, 10, 11), WPM);
    expect(status.state).toBe('behind');
    expect(status.daysLeft).toBe(5);
    expect(status.todayTarget).toBe(1400);
  });

  it('bugün okuyarak yetişen yolunda sayılıyor', () => {
    // 3. gün: dünkü beklenti 2000; sabah 800'deydi, bugün 1200 okudu
    expect(planStatus(plan, book(800), at(2026, 10, 11), WPM).state).toBe('behind');
    expect(planStatus(plan, book(2000, 1200), at(2026, 10, 11), WPM).state).toBe('onTrack');
  });

  it('önde gidene "öndesin" diyor ve payı küçültüyor', () => {
    // 2. gün sabahı 2600 okunmuş (beklenen 1000)
    const status = planStatus(plan, book(2600), at(2026, 10, 10), WPM);
    expect(status.state).toBe('ahead');
    expect(status.todayTarget).toBe(Math.ceil(4400 / 6));
  });

  it('süre dolunca "süre doldu", kalanın tamamı bugünün işi', () => {
    const status = planStatus(plan, book(5000), at(2026, 10, 16), WPM);
    expect(status).toMatchObject({ state: 'overdue', daysLeft: 0, todayLeft: 2000 });
  });

  it('kitap bitince "bitti"', () => {
    expect(planStatus(plan, book(7000, 0, true), at(2026, 10, 12), WPM).state).toBe('done');
    expect(planStatus(plan, book(7000), at(2026, 10, 20), WPM).state).toBe('done');
  });

  it('son gün: kalanın tamamı', () => {
    const status = planStatus(plan, book(6500), at(2026, 10, 15), WPM);
    expect(status.daysLeft).toBe(1);
    expect(status.todayTarget).toBe(500);
  });
});

describe('wordsReadToday', () => {
  it('yalnızca bu kitabın bugünkü oturumları', () => {
    const now = at(2026, 10, 9, 20);
    const sessions = [
      { docId: 'k', at: at(2026, 10, 9, 8), words: 300 },
      { docId: 'k', at: at(2026, 10, 9, 19), words: 200 },
      { docId: 'k', at: at(2026, 10, 8, 23), words: 999 },
      { docId: 'baska', at: at(2026, 10, 9, 10), words: 999 },
    ];
    expect(wordsReadToday(sessions, 'k', now)).toBe(500);
  });
});
