import { describe, expect, it } from 'vitest';
import { defaultAnaglyph, profileDefaults, type ActivityResult, type Profile } from '../../model/types';
import { activityMinutes, challengeDone, completedChallenges, dailyChallenge, daysUntil, visionTestDue } from './plan';

const profile: Profile = { ...profileDefaults(), id: 'p', name: 'Test', anaglyph: defaultAnaglyph() };
const at = (d: string, h = 12) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();
const res = (kind: ActivityResult['kind'], day: string, sec = 300, performance = 0.9): ActivityResult => ({
  id: Math.random().toString(),
  profileId: 'p',
  kind,
  at: at(day),
  durationSec: sec,
  score: 0,
  level: 1,
  performance,
});

describe('dailyChallenge', () => {
  it('is stable for the same day and profile', () => {
    expect(dailyChallenge('2026-05-01', 'p', true)).toEqual(dailyChallenge('2026-05-01', 'p', true));
  });
  it('varies across days', () => {
    const kinds = new Set(Array.from({ length: 20 }, (_, i) => dailyChallenge(`2026-05-${String(i + 1).padStart(2, '0')}`, 'p', true).kind));
    expect(kinds.size).toBeGreaterThan(3);
  });
  it('only picks patch exercises when glasses are not calibrated', () => {
    for (let i = 1; i <= 28; i++) {
      const k = dailyChallenge(`2026-02-${String(i).padStart(2, '0')}`, 'p', false).kind;
      expect(['odd-one-out', 'balloons', 'catch', 'maze', 'dots', 'tumbling-e']).toContain(k);
    }
  });
  it('is completed by a 2-star result of that kind on that day', () => {
    const day = '2026-05-01';
    const c = dailyChallenge(day, 'p', true);
    expect(challengeDone(c, [res(c.kind, day, 300, 0.3)], day)).toBe(false);
    expect(challengeDone(c, [res(c.kind, day, 300, 0.6)], day)).toBe(true);
    expect(completedChallenges(profile, [res(c.kind, day, 300, 0.9)])).toBe(1);
  });
});

describe('plan helpers', () => {
  it('splits today minutes into near and binocular', () => {
    const m = activityMinutes([res('maze', '2026-05-01', 600), res('blocks', '2026-05-01', 300), res('maze', '2026-04-30', 600)], '2026-05-01');
    expect(m).toEqual({ near: 10, binocular: 5 });
  });
  it('detects when a vision test is due', () => {
    const now = at('2026-05-10');
    expect(visionTestDue(profile, [], now)).toBe(true);
    const t = (d: string) => ({ id: 'v', profileId: 'p', at: at(d), eye: 'left' as const, logMAR: 0.3, distanceCm: 40 });
    expect(visionTestDue(profile, [t('2026-05-05')], now)).toBe(false);
    expect(visionTestDue(profile, [t('2026-05-03')], now)).toBe(true);
    expect(visionTestDue({ ...profile, visionTestEveryDays: 0 }, [], now)).toBe(false);
  });
  it('counts days until the next visit', () => {
    expect(daysUntil('2026-05-15', at('2026-05-10', 18))).toBe(5);
    expect(daysUntil(undefined, 0)).toBeNull();
  });
});
