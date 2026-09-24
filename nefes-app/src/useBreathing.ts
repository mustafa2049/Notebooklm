import { useCallback, useEffect, useRef, useState } from 'react';

import { getBreathState } from './breathing';

export type BreathingStatus = 'idle' | 'running' | 'paused';

const TICK_MS = 100;

export function useBreathing() {
  const [status, setStatus] = useState<BreathingStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  // Date.now() at which the current run's elapsed time was 0.
  const originRef = useRef(0);

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => setElapsedMs(Date.now() - originRef.current), TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  const start = useCallback(() => {
    originRef.current = Date.now() - elapsedMs;
    setStatus('running');
  }, [elapsedMs]);

  const pause = useCallback(() => {
    setElapsedMs(Date.now() - originRef.current);
    setStatus('paused');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setElapsedMs(0);
  }, []);

  return { status, ...getBreathState(elapsedMs), start, pause, reset };
}
