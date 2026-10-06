import { useMemo } from 'react';
import { dayKey, minutesByDay, streak } from '../model/time';
import { useNow, useStore } from './store';

/** Aktif profilin kapama istatistikleri; zamanlayıcı çalışıyorsa her saniye güncellenir. */
export function usePatchStats() {
  const { data, profile, runningSince } = useStore();
  const now = useNow(runningSince ? 1000 : 30_000);
  const sessions = useMemo(
    () => data.sessions.filter((s) => s.profileId === profile?.id),
    [data.sessions, profile?.id],
  );
  const byDay = useMemo(() => minutesByDay(sessions, now, runningSince), [sessions, now, runningSince]);
  const goal = profile?.dailyGoalMin ?? 120;
  const today = byDay.get(dayKey(now)) ?? 0;
  return {
    now,
    sessions,
    byDay,
    goal,
    today,
    progress: today / goal,
    streak: streak(byDay, goal, now),
    runningSince,
  };
}

export function useProfileResults() {
  const { data, profile } = useStore();
  return useMemo(
    () => ({
      results: data.results.filter((r) => r.profileId === profile?.id),
      gabor: data.gabor.filter((g) => g.profileId === profile?.id),
      visionTests: data.visionTests.filter((v) => v.profileId === profile?.id),
      stereoTests: data.stereoTests.filter((v) => v.profileId === profile?.id),
      diary: data.diary.filter((e) => e.profileId === profile?.id),
    }),
    [data.results, data.gabor, data.visionTests, data.stereoTests, data.diary, profile?.id],
  );
}
