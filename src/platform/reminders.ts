import { useEffect, useRef } from 'react';
import { formatMinutes } from '../model/time';
import type { Profile } from '../model/types';
import { useStore } from '../storage/store';
import { isCapacitor } from './native';
import { notify } from './notifications';
import { planNotifications } from './notifyPlan';

const FIRED_KEY = 'goz-egzersiz:fired-v2';
const DAY = 24 * 3600_000;

function loadFired(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}') as Record<string, number>;
    return typeof raw === 'object' && raw ? raw : {};
  } catch {
    return {};
  }
}

function markFired(key: string, now: number) {
  const all = loadFired();
  all[key] = now;
  // İki günden eski kayıtlar silinir.
  for (const k of Object.keys(all)) if (now - all[k] > 2 * DAY) delete all[k];
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(all));
  } catch {
    // depolama yok
  }
}

/**
 * Tarayıcı ve masaüstü sürümünde, uygulama açıkken (ya da arka plan sekmesindeyken) bildirim planındaki
 * zamanı gelen hatırlatmaları gösterir. Android uygulamasında bildirimleri sistem kurar
 * (`useNotificationSync`); uygulama kapalıyken web'de güvenilir hatırlatma için takvim dosyası (.ics) kullanılır.
 */
export function useReminders(): void {
  const { data, loaded } = useStore();
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!loaded || isCapacitor()) return;
    // Önceki kontrolde gelecekte olan, şimdi zamanı gelmiş öğeler gösterilir.
    let pending = planNotifications(dataRef.current, Date.now());
    const check = () => {
      const now = Date.now();
      const fired = loadFired();
      for (const n of pending) {
        if (n.at <= now && now - n.at < 3600_000 && !fired[n.key]) {
          markFired(n.key, now);
          notify(n.title, n.body, n.key);
        }
      }
      pending = planNotifications(dataRef.current, now);
    };
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [loaded]);
}

/** Telefon takvimine eklenebilen, her gün tekrar eden hatırlatma dosyası. */
export function buildIcs(profile: Profile, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = profile.reminderTimes.map((t, i) => {
    const [h, m] = t.split(':');
    return [
      'BEGIN:VEVENT',
      `UID:goz-egzersiz-${profile.id}-${i}@goz-egzersiz`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${date}T${h}${m}00`,
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:Göz kapama zamanı (${profile.name})`,
      `DESCRIPTION:Bandı takın ve Göz Egzersiz uygulamasında zamanlayıcıyı başlatın. Günlük hedef: ${formatMinutes(profile.dailyGoalMin)}.`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Göz kapama zamanı',
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Goz Egzersiz//TR', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join(
    '\r\n',
  );
}
