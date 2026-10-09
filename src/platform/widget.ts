import { registerPlugin } from '@capacitor/core';
import { useEffect, useRef } from 'react';
import { dayKey, minutesByDay } from '../model/time';
import { useStore } from '../storage/store';
import { isCapacitor } from './native';

interface WidgetAction {
  type: 'start' | 'stop';
  at: number;
}

interface WidgetBridgePlugin {
  update(o: { day: string; todayMin: number; goalMin: number; runningSince: number; name: string }): Promise<void>;
  consumeActions(): Promise<{ actions: WidgetAction[] }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/**
 * Android ana ekran aracını eşitler: uygulamadaki kapama durumunu araca yazar, araçta
 * (uygulama kapalıyken) yapılan "bandı taktım / çıkardım" işlemlerini zamanlarıyla uygular.
 */
export function useWidgetSync(): void {
  const { data, loaded, profile, startTimer, stopTimer } = useStore();
  const consumed = useRef(false);
  const timer = useRef<number>();
  const fns = useRef({ startTimer, stopTimer });
  fns.current = { startTimer, stopTimer };
  const push = useRef(() => {});
  push.current = () => {
    if (!profile || !consumed.current) return;
    const now = Date.now();
    const todayMin =
      minutesByDay(
        data.sessions.filter((s) => s.profileId === profile.id),
        now,
      ).get(dayKey(now)) ?? 0;
    WidgetBridge.update({
      day: dayKey(now),
      todayMin: Math.round(todayMin),
      goalMin: profile.dailyGoalMin,
      runningSince: data.timers[profile.id] ?? 0,
      name: data.profiles.length > 1 ? profile.name : '',
    }).catch(() => undefined);
  };

  // Araç işlemlerini al (açılışta ve uygulamaya her dönüşte)
  useEffect(() => {
    if (!isCapacitor() || !loaded || !profile) return;
    const pid = profile.id;
    const consume = async () => {
      try {
        const { actions } = await WidgetBridge.consumeActions();
        for (const a of actions.sort((x, y) => x.at - y.at)) {
          if (a.type === 'start') fns.current.startTimer(a.at, pid);
          else fns.current.stopTimer(a.at, pid);
        }
      } catch {
        // eski sürüm / eklenti yok
      }
      consumed.current = true;
      // İşlem yoksa veri değişmez; araç yine de güncel duruma getirilir.
      window.setTimeout(() => push.current(), 300);
    };
    consume();
    const onVis = () => document.visibilityState === 'visible' && consume();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loaded, profile?.id]);

  // Uygulamadaki durumu araca yaz
  useEffect(() => {
    if (!isCapacitor() || !loaded || !profile) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => push.current(), 1000);
    return () => window.clearTimeout(timer.current);
  }, [data, loaded, profile]);
}
