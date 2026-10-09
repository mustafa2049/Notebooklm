import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const TAG = 'hizliokuma-okuyucu';
/** Bu kadar süre hiçbir şey olmazsa ekran yeniden kararabilir */
export const IDLE_RELEASE_MS = 10 * 60 * 1000;

/**
 * Okurken ekran kararmasın (Ayarlar → Ekranı açık tut).
 *
 * Sayfa modunda kullanıcı bir sayfayı bir iki dakika okur ve ekrana hiç
 * dokunmaz; telefonun 30 saniyelik zaman aşımı tam okurken ekranı karartıyordu.
 * Açık unutulan telefon pili bitirmesin diye `activity` 10 dakika değişmezse
 * kilit bırakılır; sayfa çevrilince (ya da RSVP ilerleyince) yeniden alınır.
 *
 * Web'de tarayıcının Wake Lock API'si kullanılıyor (her tarayıcıda yok); sekme
 * arka plana geçince tarayıcı kilidi kendisi bırakıyor, dönünce yeniden alınır.
 */
export function useScreenAwake(enabled: boolean, activity: unknown): void {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setIdle(false);
    const timer = setTimeout(() => setIdle(true), IDLE_RELEASE_MS);
    return () => clearTimeout(timer);
  }, [enabled, activity]);

  const active = enabled && !idle;
  useEffect(() => {
    if (!active) return;
    const acquire = () => {
      activateKeepAwakeAsync(TAG).catch(() => undefined);
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // Eski kilit tarayıcıda hâlâ duruyorsa önce bırakılır (iki kilit birikmesin)
      deactivateKeepAwake(TAG)
        .catch(() => undefined)
        .finally(acquire);
    };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', onVisible);
      // Kilit hiç alınamadıysa (desteklenmeyen tarayıcı) bırakmak hata verir
      deactivateKeepAwake(TAG).catch(() => undefined);
    };
  }, [active]);
}
