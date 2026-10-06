import { dayKey, minutesByDay, streak } from '../../model/time';
import { BINOCULAR_KINDS, type ActivityResult, type GaborResult, type PatchSession } from '../../model/types';

export function starsFor(performance: number, durationSec: number): number {
  if (durationSec < 30) return 0;
  if (performance >= 0.8) return 3;
  if (performance >= 0.55) return 2;
  return 1;
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
}

export function computeBadges(
  sessions: PatchSession[],
  results: ActivityResult[],
  gabor: GaborResult[],
  goalMin: number,
  now = Date.now(),
): Badge[] {
  const byDay = minutesByDay(sessions, now);
  const goalDays = [...byDay.values()].filter((m) => m >= goalMin).length;
  const totalMin = [...byDay.values()].reduce((a, b) => a + b, 0);
  // En uzun seri: tüm günleri tarayarak
  let bestStreak = 0;
  for (const key of byDay.keys()) {
    const s = streak(byDay, goalMin, new Date(`${key}T23:59:00`).getTime());
    bestStreak = Math.max(bestStreak, s);
  }
  const stars = results.reduce((a, r) => a + starsFor(r.performance, r.durationSec), 0);
  const dich = results.filter((r) => BINOCULAR_KINDS.has(r.kind));
  const days = new Set(results.map((r) => dayKey(r.at)));

  const b = (id: string, icon: string, name: string, desc: string, earned: boolean): Badge => ({ id, icon, name, desc, earned });
  return [
    b('first-patch', '🏴‍☠️', 'İlk Bant', 'İlk kapama oturumunu tamamla', sessions.length > 0),
    b('goal-1', '🎯', 'Hedef Tamam', 'Bir gün hedefe ulaş', goalDays >= 1),
    b('streak-3', '🔥', '3 Gün Seri', '3 gün üst üste hedefe ulaş', bestStreak >= 3),
    b('streak-7', '🏆', '1 Hafta Seri', '7 gün üst üste hedefe ulaş', bestStreak >= 7),
    b('streak-30', '👑', 'Göz Kahramanı', '30 gün üst üste hedefe ulaş', bestStreak >= 30),
    b('hours-50', '⏳', '50 Saat', 'Toplam 50 saat kapama yap', totalMin >= 50 * 60),
    b('games-10', '🎮', 'Oyuncu', '10 egzersiz oyunu bitir', results.length >= 10),
    b('stars-50', '⭐', 'Yıldız Avcısı', '50 yıldız topla', stars >= 50),
    b('dichoptic-1', '🥽', 'Gözlüklü Kaşif', 'İlk dikoptik oyununu oyna', dich.length >= 1),
    b('dichoptic-full', '🌈', 'Tam Denge', 'Dikoptik oyunlarda sağlam göz kontrastını %100’e çıkar', dich.some((r) => (r.contrast ?? 0) >= 1)),
    b('maze-5', '🧭', 'Labirent Ustası', 'Labirent oyununda 5. seviyeye ulaş', results.some((r) => r.kind === 'maze' && r.level >= 5)),
    b('video-1', '🎬', 'Sinema Keyfi', 'İlk dikoptik filmini izle (en az 10 dakika)', results.some((r) => r.kind === 'video' && r.durationSec >= 600)),
    b('gabor-1', '🌀', 'Desen Dedektifi', 'İlk Gabor seansını tamamla', gabor.length >= 1),
    b('days-14', '📅', 'Düzenli', '14 farklı günde egzersiz yap', days.size >= 14),
  ];
}
