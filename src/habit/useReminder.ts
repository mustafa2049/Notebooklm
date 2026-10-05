import { useEffect } from 'react';
import { useSettings } from '@/store/SettingsContext';
import { cancelReminder, REMINDER_SUPPORTED, scheduleReminder } from './reminder';
import { reminderBody } from './cue';
import { formatClock } from './goal';

/**
 * Hatırlatıcıyı ayarlarla eşitler.
 *
 * Uygulama her açıldığında yeniden planlanıyor: bildirim metni günlük hedefi
 * içerdiği için hedef değişince metnin de değişmesi gerekiyor ve planlanmış
 * bildirimin gövdesi sonradan güncellenemiyor.
 */
export function useReminder(): void {
  const { settings, ready } = useSettings();
  const {
    reminderEnabled,
    reminderHour,
    reminderMinute,
    dailyGoalWords,
    dailyGoalMinutes,
    goalUnit,
    readingCue,
  } = settings;

  useEffect(() => {
    if (!ready || !REMINDER_SUPPORTED) return;

    if (!reminderEnabled) {
      void cancelReminder();
      return;
    }

    const body = reminderBody({
      cue: readingCue,
      goalUnit,
      goalMinutes: dailyGoalMinutes,
      goalWords: dailyGoalWords,
    });
    void scheduleReminder({ hour: reminderHour, minute: reminderMinute }, body);
  }, [
    ready,
    reminderEnabled,
    reminderHour,
    reminderMinute,
    dailyGoalWords,
    dailyGoalMinutes,
    goalUnit,
    readingCue,
  ]);
}

/** Ayarlar ekranında "her gün 20:00" yazmak için. */
export function reminderLabel(hour: number, minute: number): string {
  return `her gün ${formatClock(hour, minute)}`;
}
