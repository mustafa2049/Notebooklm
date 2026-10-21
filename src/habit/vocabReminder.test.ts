import { describe, expect, it } from 'vitest';
import { planVocabReminders, vocabReminderBody } from './vocabReminder';

/** Yerel saatle tarih (testler saat diliminden bağımsız) */
const local = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();

describe('planVocabReminders', () => {
  it('bilinmeyen kelime her gün; saati geçmişse yarından başlar', () => {
    const entries = [{ known: false, reviews: 0, createdAt: local(20, 9) }];
    const plan = planVocabReminders(entries, local(21, 20, 30), 19, 3);
    expect(plan.map((item) => new Date(item.at).getDate())).toEqual([22, 23, 24]);
    expect(plan.every((item) => new Date(item.at).getHours() === 19 && item.count === 1)).toBe(true);
  });

  it('saat henüz gelmediyse bugün de var', () => {
    const entries = [{ known: false, reviews: 0, createdAt: local(20, 9) }];
    expect(new Date(planVocabReminders(entries, local(21, 8), 19, 2)[0].at).getDate()).toBe(21);
  });

  it('bilinen kelime aralığı dolunca sayılır; sayısı 0 olan gün atlanır', () => {
    // 2 doğru tekrar: 2 gün sonra zamanı gelir
    const known = { known: true, reviews: 2, createdAt: local(1, 9), lastReviewAt: local(21, 10) };
    const fresh = { known: false, reviews: 0, createdAt: local(21, 10) };
    const plan = planVocabReminders([known, fresh], local(21, 12), 19, 4);
    expect(plan.map((item) => [new Date(item.at).getDate(), item.count])).toEqual([
      [21, 1],
      [22, 1],
      [23, 2],
      [24, 2],
    ]);
  });

  it('defter boşsa ya da her şey uzak tarihliyse plan yok; en çok `days` gün', () => {
    expect(planVocabReminders([], local(21, 12), 19)).toEqual([]);
    // 6 doğru tekrar: 30 gün sonra
    const far = { known: true, reviews: 6, createdAt: 0, lastReviewAt: local(21, 10) };
    expect(planVocabReminders([far], local(21, 12), 19, 7)).toEqual([]);
    const fresh = { known: false, reviews: 0, createdAt: local(21, 10) };
    expect(planVocabReminders([fresh], local(21, 20), 19, 7)).toHaveLength(7);
  });
});

describe('vocabReminderBody', () => {
  it('tekil ve çoğul', () => {
    expect(vocabReminderBody(1)).toMatch(/^Bir kelimenin/);
    expect(vocabReminderBody(6)).toMatch(/^6 kelimenin tekrar zamanı geldi/);
  });
});
