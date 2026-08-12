import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Titreşimli geri bildirim.
 *
 * Web'de sessizce yok sayılır. Okuyucuda **yalnızca kullanıcının başlattığı**
 * eylemlerde tetiklenir — her kelimede titretmek pili tüketir ve okumayı
 * dağıtır.
 */
export const haptics = {
  /** Oynat/duraklat, mod değişimi gibi hafif dokunuşlar */
  tap(enabled: boolean) {
    if (!enabled || Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /** Cümle atlama gibi belirgin eylemler */
  step(enabled: boolean) {
    if (!enabled || Platform.OS === 'web') return;
    void Haptics.selectionAsync();
  },

  /** Metin bitti, egzersiz tamamlandı */
  success(enabled: boolean) {
    if (!enabled || Platform.OS === 'web') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};
