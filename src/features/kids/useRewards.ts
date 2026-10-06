import { useMemo } from 'react';
import { usePatchStats, useProfileResults } from '../../storage/selectors';
import { useProfile } from '../../storage/store';
import { CHALLENGE_BONUS, completedChallenges } from '../plan/plan';
import { computeBadges, starsFor } from './rewards';

/** Aktif profilin yıldızları (sürpriz görev bonusu dahil) ve rozetleri. */
export function useRewards() {
  const profile = useProfile();
  const { sessions, goal, now } = usePatchStats();
  const { results, gabor } = useProfileResults();
  const challenges = useMemo(() => completedChallenges(profile, results), [profile, results]);
  const stars = useMemo(
    () => results.reduce((a, r) => a + starsFor(r.performance, r.durationSec), 0) + challenges * CHALLENGE_BONUS,
    [results, challenges],
  );
  // Rozetler dakikada bir yeniden hesaplanır (usePatchStats zamanlayıcı çalışırken her saniye günceller).
  const minute = Math.floor(now / 60_000);
  const badges = useMemo(
    () => computeBadges(sessions, results, gabor, goal, minute * 60_000, challenges),
    [sessions, results, gabor, goal, minute, challenges],
  );
  return { stars, badges, challenges };
}
