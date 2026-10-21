import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { rotatesFreely } from '@/core/spreads';

/**
 * `app.json` uygulamayı dikey kilitliyor (telefon için tasarlandı). Tablette
 * (bkz. `rotatesFreely`) kilit açılır: yatay tutulunca okuyucu çift sayfa
 * gösterebilir. Katlanabilir telefon açılıp kapanınca yeniden karar verilir.
 * Web'de tarayıcı ve PWA bildirimi (`public/manifest.json`) belirler.
 */
export function useTabletRotation(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Başta bildirimdeki dikey kilit geçerli; telefonda hiç çağrı yapılmaz
    let free = false;
    const apply = () => {
      const next = rotatesFreely(Dimensions.get('screen'));
      if (next === free) return;
      free = next;
      const done = next
        ? ScreenOrientation.unlockAsync()
        : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      done.catch(() => {});
    };
    apply();
    const subscription = Dimensions.addEventListener('change', apply);
    return () => subscription.remove();
  }, []);
}
