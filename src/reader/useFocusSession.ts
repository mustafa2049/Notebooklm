import { useEffect, useRef, useState } from 'react';
/**
 * Okuma saati: tempolu modlarda motorun oynatma süresi, Sayfa modunda sayfa
 * saati. Odak seansı ve göz molası yalnızca bunu görür, hangi modda
 * okunduğunu bilmez. `ReaderEngine` bu arayüzü zaten sağlıyor.
 */
export interface ReadingClock {
  /** Toplam okuma süresi (ms) */
  activeMs: () => number;
  /** Okumayı durdurur */
  pause: () => void;
  /** Şu ana kadar okunan kelime */
  wordsRead: number;
}

/**
 * Odak seansı: belirli bir süre okuyup durmak.
 *
 * Yalnızca **okuma süresi** sayılır (oynatma açıkken geçen süre); telefona
 * bakmak için duraklatılan zaman seansı bitirmez. Süre dolunca okuma durur ve
 * özet gösterilir — "biraz daha" demek kullanıcının kararı, uygulamanın değil.
 */
export interface FocusSession {
  /** Seans sürüyor mu (süre verildi ve kapatılmadı) */
  active: boolean;
  remainingMs: number;
  done: boolean;
  /** Seans boyunca okunan kelime */
  words: number;
  /** Seansı kapatıp serbest okumaya devam */
  dismiss: () => void;
}

export function useFocusSession(engine: ReadingClock, seconds: number): FocusSession {
  const targetMs = Math.max(0, seconds) * 1000;
  const start = useRef<{ ms: number; words: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (start.current === null) start.current = { ms: engine.activeMs(), words: engine.wordsRead };

  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    if (targetMs <= 0 || done || dismissed) return;
    const timer = setInterval(() => {
      const current = engineRef.current.activeMs() - (start.current?.ms ?? 0);
      setElapsed(current);
      if (current >= targetMs) {
        engineRef.current.pause();
        setDone(true);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [targetMs, done, dismissed]);

  return {
    active: targetMs > 0 && !dismissed,
    remainingMs: Math.max(0, targetMs - elapsed),
    done,
    words: Math.max(0, engine.wordsRead - (start.current?.words ?? 0)),
    dismiss: () => setDismissed(true),
  };
}
