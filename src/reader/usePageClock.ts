import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { pageCredit, pageDwellCap } from '@/habit/pageReading';

export interface PageClock {
  /** Sayfa modunda sayılan okuma süresi (sürmekte olan sayfa dahil, sınırlı) */
  activeMs: () => number;
  /** Okunmuş sayılan kelimeler (sayfa ileri çevrildiğinde eklenir) */
  words: number;
  /** Sıradaki sayfa değişimi ileriye bir çevirmedir: geçilen sayfa okunmuş sayılabilir */
  markForward: () => void;
  /** Süreyi durdurur; sayfa çevrilince ya da `resume` ile devam eder */
  pause: () => void;
  resume: () => void;
}

interface CurrentPage {
  key: number;
  words: number;
  dwellMs: number;
  runningSince: number | null;
}

/**
 * Sayfa modunun saati: sayfanın ekranda kaldığı süre, ancak sayfa modu açık,
 * uygulama önde ve üstte bir panel yokken işler. Sayfa değişince geçilen
 * sayfanın süresi (ve ileri çevrildiyse kelimeleri) `pageCredit` kurallarıyla
 * yazılır.
 */
export function usePageClock({
  enabled,
  blocked,
  pageKey,
  pageWords,
}: {
  enabled: boolean;
  /** Üstte panel/kart açık: okuma sayılmaz */
  blocked: boolean;
  /** Sayfanın kimliği (ilk chunk'ı) */
  pageKey: number;
  pageWords: number;
}): PageClock {
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  const [paused, setPaused] = useState(false);
  const [words, setWords] = useState(0);
  const creditedMs = useRef(0);
  const forward = useRef(false);
  const current = useRef<CurrentPage>({ key: pageKey, words: pageWords, dwellMs: 0, runningSince: null });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  const running = enabled && !blocked && appActive && !paused;

  const dwellNow = (page: CurrentPage) =>
    page.dwellMs + (page.runningSince !== null ? Date.now() - page.runningSince : 0);

  // Çalışma durumu değişince süre sayacını aç/kapat
  useEffect(() => {
    const page = current.current;
    if (running && page.runningSince === null) page.runningSince = Date.now();
    if (!running && page.runningSince !== null) {
      page.dwellMs += Date.now() - page.runningSince;
      page.runningSince = null;
    }
  }, [running]);

  // Sayfa değişti: öncekini yaz, yenisini başlat
  useEffect(() => {
    const page = current.current;
    if (page.key === pageKey) {
      page.words = pageWords;
      return;
    }
    const credit = pageCredit(dwellNow(page), page.words);
    creditedMs.current += credit.ms;
    if (forward.current && credit.words > 0) setWords((total) => total + credit.words);
    forward.current = false;
    current.current = { key: pageKey, words: pageWords, dwellMs: 0, runningSince: running ? Date.now() : null };
    // Sayfa çevirmek okumaya döndüğünü gösterir
    setPaused(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, pageWords]);

  const activeMs = useCallback(() => {
    const page = current.current;
    return creditedMs.current + Math.min(dwellNow(page), pageDwellCap(page.words));
  }, []);

  const markForward = useCallback(() => {
    forward.current = true;
  }, []);
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return { activeMs, words, markForward, pause, resume };
}
