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

/** Kelime tekrar bildirimlerinin kimlik öneki (günlük hatırlatıcıya dokunulmasın) */
const VOCAB_PREFIX = 'hizliokuma-kelime-';

/**
 * Kelime tekrar bildirimlerini yeniden kurar (bkz. `vocabReminder`): eskiler
 * silinir, plandaki her gün için tek seferlik bildirim. İzin sorulmaz — izin
 * ayar açılırken istenir; verilmediyse hiçbir şey kurulmaz. Bildirime
 * dokununca Kelime defteri açılır (`data.url`).
 */
export async function scheduleVocabReminders(plan: { at: number; body: string }[]): Promise<boolean> {
  if (!REMINDER_SUPPORTED) return false;
  const Notifications = load();
  await cancelVocabReminders();
  if (!(await Notifications.getPermissionsAsync()).granted) return false;
  for (const [index, item] of plan.entries()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${VOCAB_PREFIX}${index}`,
      content: { title: 'Kelime tekrarı', body: item.body, data: { url: '/vocab' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at },
    });
  }
  return true;
}

export async function cancelVocabReminders(): Promise<void> {
  if (!REMINDER_SUPPORTED) return;
  const Notifications = load();
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((request) => request.identifier.startsWith(VOCAB_PREFIX))
        .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
    );
  } catch {
    // Planlanmış bildirim okunamazsa yenileri yine kurulur
  }
}

/** Bildirime dokunulunca uygulama içi adrese gider (`data.url`); dinlemeyi bırakan işlev döner */
export function listenNotificationTaps(open: (url: string) => void): () => void {
  if (!REMINDER_SUPPORTED) return () => undefined;
  const Notifications = load();
  const handle = (url: unknown) => {
    if (typeof url === 'string' && url.startsWith('/')) open(url);
  };
  // Uygulama kapalıyken dokunulduysa açılış yanıtı
  void Notifications.getLastNotificationResponseAsync()
    .then((response) => handle(response?.notification.request.content.data?.url))
    .catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
    handle(response.notification.request.content.data?.url)
  );
  return () => subscription.remove();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
