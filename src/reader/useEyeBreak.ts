import { useCallback, useEffect, useRef, useState } from 'react';
import { eyeBreakDue, eyeBreakRemaining } from '@/habit/eyeBreak';
import type { ReadingClock } from './useFocusSession';

export interface EyeBreak {
  /** Mola ekranı açık mı */
  active: boolean;
  /** Kalan saniye (0 olunca "devam et") */
  remaining: number;
  /** Molayı bitir ya da atla; sayaç baştan başlar */
  finish: () => void;
}

/** Okuma süresi eşiği geçince okumayı durdurup göz molası sayacı açar. */
export function useEyeBreak(engine: ReadingClock, minutes: number): EyeBreak {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lastBreak = useRef(engine.activeMs());
  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    if (minutes <= 0) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (startedAt !== null) return;
      if (eyeBreakDue(engineRef.current.activeMs(), lastBreak.current, minutes)) {
        engineRef.current.pause();
        setStartedAt(current);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [minutes, startedAt]);

  const finish = useCallback(() => {
    lastBreak.current = engineRef.current.activeMs();
    setStartedAt(null);
  }, []);

  return {
    active: startedAt !== null,
    remaining: startedAt === null ? 0 : eyeBreakRemaining(startedAt, now),
    finish,
  };
}
