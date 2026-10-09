import { useEffect, useRef } from 'react';
import { useStore } from '../storage/store';
import { isCapacitor } from './native';
import { planNotifications, type PlannedNotification } from './notifyPlan';

const plugin = () => import('@capacitor/local-notifications').then((m) => m.LocalNotifications);

export type NativePermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function nativePermission(): Promise<NativePermission> {
  if (!isCapacitor()) return 'unsupported';
  const s = await (await plugin()).checkPermissions();
  return s.display === 'granted' ? 'granted' : s.display === 'denied' ? 'denied' : 'prompt';
}

export async function requestNativePermission(): Promise<NativePermission> {
  if (!isCapacitor()) return 'unsupported';
  const s = await (await plugin()).requestPermissions();
  return s.display === 'granted' ? 'granted' : s.display === 'denied' ? 'denied' : 'prompt';
}

/** Android 12+: tam saatli alarm izni (yoksa bildirimler birkaç dakika gecikebilir). */
export async function exactAlarmAllowed(): Promise<boolean> {
  if (!isCapacitor()) return true;
  try {
    return (await (await plugin()).checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return true; // eski Android sürümleri
  }
}

export async function openExactAlarmSetting(): Promise<void> {
  await (await plugin()).changeExactNotificationSetting();
}

/** Bekleyen tüm bildirimleri iptal edip planı yeniden kurar. */
export async function syncNativeNotifications(plan: PlannedNotification[]): Promise<void> {
  const ln = await plugin();
  if ((await ln.checkPermissions()).display !== 'granted') return;
  const pending = await ln.getPending();
  if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  if (!plan.length) return;
  await ln.schedule({
    notifications: plan.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: new Date(n.at), allowWhileIdle: true },
      extra: { route: n.route, profileId: n.profileId },
    })),
  });
}

/**
 * Android uygulamasında bildirim planını verilerle eşitler (uygulama kapalıyken de çalışır)
 * ve bildirime dokununca ilgili sayfayı açar.
 */
export function useNotificationSync(): void {
  const { data, loaded, setActiveProfile } = useStore();
  const timer = useRef<number>();
  const setActive = useRef(setActiveProfile);
  setActive.current = setActiveProfile;

  useEffect(() => {
    if (!isCapacitor() || !loaded) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      syncNativeNotifications(planNotifications(data, Date.now())).catch(() => undefined);
    }, 2000);
    return () => window.clearTimeout(timer.current);
  }, [data, loaded]);

  useEffect(() => {
    if (!isCapacitor()) return;
    let remove: (() => void) | undefined;
    plugin().then(async (ln) => {
      const h = await ln.addListener('localNotificationActionPerformed', (a) => {
        const extra = a.notification.extra as { route?: string; profileId?: string } | undefined;
        if (extra?.profileId) setActive.current(extra.profileId);
        if (extra?.route) location.hash = `#${extra.route}`;
      });
      remove = () => h.remove();
    });
    return () => remove?.();
  }, []);
}
