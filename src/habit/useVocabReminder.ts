import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { listVocab, onVocabChanged } from '@/storage/vocab';
import { cancelVocabReminders, listenNotificationTaps, REMINDER_SUPPORTED, scheduleVocabReminders } from './reminder';
import { planVocabReminders, vocabReminderBody } from './vocabReminder';

/** Arka arkaya değişiklikler (oyunda her cevap) tek planlamada toplansın */
const REPLAN_DELAY_MS = 1500;

/**
 * Kelime tekrar bildirimlerini güncel tutar (bkz. `vocabReminder`): ayar
 * değişince, defter değişince ve uygulama öne gelince (gün dönmüş olabilir)
 * yeniden planlanır. Bildirime dokununca Kelime defteri açılır.
 */
export function useVocabReminder(): void {
  const { settings, ready } = useSettings();
  const router = useRouter();
  const { vocabReminder, vocabReminderHour } = settings;

  useEffect(() => listenNotificationTaps((url) => router.push(url as Href)), [router]);

  useEffect(() => {
    if (!ready || !REMINDER_SUPPORTED) return;
    if (!vocabReminder) {
      void cancelVocabReminders();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const replan = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void listVocab()
          .then((entries) =>
            scheduleVocabReminders(
              planVocabReminders(entries, Date.now(), vocabReminderHour).map((item) => ({
                at: item.at,
                body: vocabReminderBody(item.count),
              }))
            )
          )
          .catch(() => undefined);
      }, REPLAN_DELAY_MS);
    };
    replan();
    const unsubscribe = onVocabChanged(replan);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') replan();
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, [ready, vocabReminder, vocabReminderHour]);
}
