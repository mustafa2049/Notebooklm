import { Platform } from 'react-native';

/**
 * Günlük okuma hatırlatıcısı.
 *
 * Yalnızca telefonda çalışıyor: tarayıcıda zamanlanmış bildirim için servis
 * çalışanı ve Push API gerekiyor, bu da uygulamanın sürekli açık olmasına ya da
 * bir sunucuya bağlı olmasına dayanır — "her şey cihazda" kuralını bozar. Web'de
 * arayüz bunu açıkça söylüyor ve hatırlatıcı kapalı kalıyor.
 *
 * `expo-notifications` bilerek tembel yükleniyor (`require`): web paketine
 * girmesin ve uygulama açılışını yavaşlatmasın.
 */

export const REMINDER_SUPPORTED = Platform.OS !== 'web';

/** Uygulamanın planladığı hatırlatıcıyı tanımak için (başka bildirimleri silmeyelim). */
const IDENTIFIER = 'hizliokuma-gunluk-hatirlatici';

type NotificationsModule = typeof import('expo-notifications');

function load(): NotificationsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
}

/** İzin ister; kullanıcı reddederse `false` döner (sessizce yutmuyoruz). */
export async function requestReminderPermission(): Promise<boolean> {
  if (!REMINDER_SUPPORTED) return false;
  const Notifications = load();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

/**
 * Günlük hatırlatıcıyı kurar. Önce eskisini iptal ediyor: saat değiştiğinde
 * iki bildirim birikmesin.
 */
export async function scheduleReminder(
  time: ReminderTime,
  body: string
): Promise<boolean> {
  if (!REMINDER_SUPPORTED) return false;
  if (!(await requestReminderPermission())) return false;

  const Notifications = load();
  await cancelReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: IDENTIFIER,
    content: { title: 'Hızlı Okuma', body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: clamp(time.hour, 0, 23),
      minute: clamp(time.minute, 0, 59),
    },
  });
  return true;
}

export async function cancelReminder(): Promise<void> {
  if (!REMINDER_SUPPORTED) return;
  const Notifications = load();
  try {
    await Notifications.cancelScheduledNotificationAsync(IDENTIFIER);
  } catch {
    // Planlanmış bildirim yoksa hata veriyor; sorun değil
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
