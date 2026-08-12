import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { ReaderMode } from '@/core/types';
import { recordSession } from '@/storage/stats';

interface SessionInput {
  docId: string;
  mode: ReaderMode;
  targetWpm: number;
  /** Okuyucunun o anki toplam okunan kelime sayısı */
  words: number;
  /** Yalnızca oynatma sürerken biriken süre */
  activeMs: () => number;
}

/**
 * Okuma oturumunu istatistiklere yazar.
 *
 * Kayıt **periyodik** yapılıyor, yalnızca ekran kapanırken değil: tek noktaya
 * bağlamak sekmeyi kapatan (ya da uygulamayı öldüren) kullanıcının bütün
 * okumasını kaybettiriyordu. Her turda yalnızca son kayıttan bu yana okunan
 * fark yazılır, böylece aynı kelimeler iki kez sayılmaz.
 */
const FLUSH_MS = 60_000;

export function useSessionRecorder(input: SessionInput): void {
  const latest = useRef(input);
  latest.current = input;

  /** Son yazılan nokta: o ana kadarki kelime ve süre */
  const written = useRef({ words: input.words, ms: 0 });

  const flush = useCallback(() => {
    const { docId, mode, targetWpm, words, activeMs } = latest.current;
    const totalMs = activeMs();
    const deltaMs = totalMs - written.current.ms;
    const deltaWords = words - written.current.words;

    // Kısa ve kelimesiz parçalar kaydedilmez (storage/stats bunu da süzüyor)
    if (deltaMs < 3000 || deltaWords <= 0) return;

    written.current = { words, ms: totalMs };
    void recordSession({
      docId,
      mode,
      at: Date.now(),
      ms: deltaMs,
      words: deltaWords,
      targetWpm,
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(flush, FLUSH_MS);
    return () => {
      clearInterval(timer);
      flush();
    };
  }, [flush]);

  // Web'de sekme kapanması/arka plana alınması React'in temizleme adımını
  // çalıştırmıyor; tarayıcı olaylarına da bağlanmak gerekiyor.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);
}
