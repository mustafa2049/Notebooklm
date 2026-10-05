import { describe, expect, it } from 'vitest';
import { computeBadges, newBadges, type BadgeInput } from './badges';

const empty: BadgeInput = {
  sessions: 0,
  totalWords: 0,
  longestStreak: 0,
  finishedDocs: 0,
  finishedBooks: 0,
  tests: 0,
  improvement: null,
  recentComprehension: [],
  knownWords: 0,
  schulte5BestMs: null,
};

const earned = (input: BadgeInput) => computeBadges(input).filter((b) => b.earned).map((b) => b.id);

describe('computeBadges', () => {
  it('yeni kullanıcıda hiç rozet yok', () => {
    expect(earned(empty)).toEqual([]);
  });

  it('seri rozetleri en uzun seriden verilir', () => {
    expect(earned({ ...empty, sessions: 9, longestStreak: 8 })).toEqual(['first', 'streak3', 'streak7']);
  });

  it('gelişim rozeti yalnızca efektif hız artışıyla', () => {
    expect(earned({ ...empty, tests: 3, improvement: 0.12 })).toContain('gain10');
    expect(earned({ ...empty, tests: 3, improvement: 0.12 })).not.toContain('gain25');
  });

  it('anlama rozeti son üç ölçümün hepsinde %80 ister', () => {
    expect(earned({ ...empty, recentComprehension: [0.8, 1, 0.8] })).toContain('comprehension');
    expect(earned({ ...empty, recentComprehension: [0.8, 0.6, 1] })).not.toContain('comprehension');
    expect(earned({ ...empty, recentComprehension: [1, 1] })).not.toContain('comprehension');
  });

  it('kimlikler benzersiz', () => {
    const ids = computeBadges(empty).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('newBadges', () => {
  it('yalnızca görülmemiş kazanılmış rozetleri verir', () => {
    const badges = computeBadges({ ...empty, sessions: 1, tests: 1 });
    expect(newBadges(badges, new Set(['first'])).map((b) => b.id)).toEqual(['test1']);
  });
});
