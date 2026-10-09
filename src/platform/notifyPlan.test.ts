import { describe, expect, it } from 'vitest';
import { defaultAnaglyph, emptyData, profileDefaults, type AppData, type Profile } from '../model/types';
import { notificationId, planNotifications } from './notifyPlan';

const at = (d: string, hm = '10:00') => new Date(`${d}T${hm}:00`).getTime();
const profile: Profile = {
  ...profileDefaults(),
  id: 'p',
  name: 'Mustafa',
  anaglyph: defaultAnaglyph(),
  dailyGoalMin: 120,
  reminderTimes: ['09:00', '18:00'],
  createdAt: at('2026-10-01'),
};
const data = (over: Partial<AppData> = {}): AppData => ({ ...emptyData(), profiles: [profile], activeProfileId: 'p', ...over });

describe('notification plan', () => {
  const now = at('2026-10-09', '12:00');

  it('schedules patch and diary reminders for the coming days, only in the future', () => {
    const plan = planNotifications(data(), now);
    const keys = plan.map((n) => n.key);
    expect(keys).not.toContain('p|patch|2026-10-09|09:00'); // geçmiş
    expect(keys).toContain('p|patch|2026-10-09|18:00');
    expect(keys).toContain('p|patch|2026-10-10|09:00');
    expect(keys).toContain('p|diary|2026-10-09');
    expect(plan.every((n) => n.at > now)).toBe(true);
    expect(plan.find((n) => n.key === 'p|patch|2026-10-09|18:00')?.body).toContain('2 sa');
    expect(plan.find((n) => n.key === 'p|diary|2026-10-09')?.route).toBe('/diary');
    // 14 gün × (2 kapama + 1 günlük) − bugünkü geçmiş 09:00
    expect(plan.filter((n) => n.key.includes('|patch|') || n.key.includes('|diary|'))).toHaveLength(14 * 3 - 1);
  });

  it('skips today when the goal is met, the patch is on, or the diary is done', () => {
    const met = planNotifications(
      data({
        sessions: [{ id: 's', profileId: 'p', start: at('2026-10-09', '08:00'), end: at('2026-10-09', '10:00') }],
        diary: [{ id: 'd', profileId: 'p', day: '2026-10-09', symptoms: ['none'], compliance: 'full', note: '' }],
      }),
      now,
    ).map((n) => n.key);
    expect(met).not.toContain('p|patch|2026-10-09|18:00');
    expect(met).not.toContain('p|diary|2026-10-09');
    expect(met).toContain('p|patch|2026-10-10|18:00');
    expect(met).toContain('p|diary|2026-10-10');
  });

  it('plans goal-reached and forgotten-patch alerts while the timer runs', () => {
    const running = at('2026-10-09', '11:30'); // 30 dk geçti, 90 dk kaldı
    const plan = planNotifications(data({ timers: { p: running } }), now);
    const goal = plan.find((n) => n.key === `p|goal|${running}`)!;
    expect(goal.at).toBe(at('2026-10-09', '13:30'));
    expect(plan.find((n) => n.key === `p|forgot|${running}`)?.at).toBe(at('2026-10-09', '14:30'));
    expect(plan.some((n) => n.key === 'p|patch|2026-10-09|18:00')).toBe(false);
    // Yeniden planlama (5 dk sonra) aynı zamanı verir.
    const later = planNotifications(data({ timers: { p: running } }), now + 5 * 60_000);
    expect(later.find((n) => n.key === goal.key)?.at).toBe(goal.at);
  });

  it('reminds about vision tests and doctor visits', () => {
    const plan = planNotifications(
      data({
        profiles: [{ ...profile, nextVisit: '2026-10-15', visionTestEveryDays: 7 }],
        visionTests: [{ id: 'v', profileId: 'p', at: at('2026-10-05'), eye: 'right', logMAR: 0.3, distanceCm: 40 }],
      }),
      now,
    );
    expect(plan.find((n) => n.key.startsWith('p|vision|'))?.at).toBe(at('2026-10-12', '10:00'));
    expect(plan.find((n) => n.key === 'p|visit-1|2026-10-15')?.at).toBe(at('2026-10-14', '19:00'));
    expect(plan.find((n) => n.key === 'p|visit|2026-10-15')?.at).toBe(at('2026-10-15', '08:30'));
    // Gecikmiş test: bugün 18:00
    const overdue = planNotifications(data({ visionTests: [{ id: 'v', profileId: 'p', at: at('2026-09-01'), eye: 'right', logMAR: 0.3, distanceCm: 40 }] }), now);
    expect(overdue.find((n) => n.key.startsWith('p|vision|'))?.at).toBe(at('2026-10-09', '18:00'));
  });

  it('respects switches and names profiles when there are several', () => {
    const off = { ...profile, notifyDiaryTime: null, notifyVision: false, reminderTimes: [] };
    expect(planNotifications(data({ profiles: [off] }), now)).toEqual([]);
    const two = planNotifications(data({ profiles: [profile, { ...profile, id: 'q', name: 'Ali', mode: 'child' }] }), now);
    expect(two.find((n) => n.profileId === 'q')?.title).toMatch(/^Ali: /);
  });

  it('derives stable positive int32 ids', () => {
    expect(notificationId('p|diary|2026-10-09')).toBe(notificationId('p|diary|2026-10-09'));
    expect(notificationId('a')).not.toBe(notificationId('b'));
    for (const k of ['a', 'p|x', 'zzzz']) {
      const id = notificationId(k);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(2147483647);
    }
  });
});
