import { useEffect, useRef } from 'react';
import { dayKey, formatMinutes, minutesByDay } from '../model/time';
import type { Profile } from '../model/types';
import { useStore } from '../storage/store';
import { notify } from './notifications';

const FIRED_KEY = 'goz-egzersiz:fired';

function firedToday(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}') as { day?: string; ids?: string[] };
    return raw.day === dayKey(Date.now()) ? new Set(raw.ids) : new Set();
  } catch {
    return new Set();
  }
}

function markFired(id: string) {
  const s = firedToday();
  s.add(id);
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ day: dayKey(Date.now()), ids: [...s] }));
  } catch {
    // depolama yok
  }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Uygulama açıkken (ya da masaüstünde arka plan sekmesindeyken) hatırlatma saatlerini ve
 * hedefe ulaşılmasını kontrol eder. Uygulama kapalıyken güvenilir hatırlatma için
 * takvim dosyası (.ics) kullanılır.
 */
export function useReminders(): void {
  const { profile, data, runningSince } = useStore();
  const ref = useRef({ profile, data, runningSince });
  ref.current = { profile, data, runningSince };

  useEffect(() => {
    const check = () => {
      const { profile, data, runningSince } = ref.current;
      if (!profile) return;
      const now = Date.now();
      const today = minutesByDay(
        data.sessions.filter((s) => s.profileId === profile.id),
        now,
        runningSince,
      ).get(dayKey(now)) ?? 0;
      const fired = firedToday();
      const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();

      if (today >= profile.dailyGoalMin && !fired.has('goal')) {
        markFired('goal');
        if (runningSince) {
          notify('Hedefe ulaştınız! 🎉', `Bugün ${formatMinutes(today)} kapama yaptınız. Bandı çıkarabilirsiniz.`, 'goal');
        }
        return;
      }
      for (const t of profile.reminderTimes) {
        const id = `rem-${t}`;
        const due = toMinutes(t);
        if (nowMin >= due && nowMin < due + 60 && !fired.has(id)) {
          markFired(id);
          if (!runningSince && today < profile.dailyGoalMin) {
            notify(
              'Kapama zamanı 🏴‍☠️',
              `Bugünkü hedefin ${formatMinutes(profile.dailyGoalMin - today)} kaldı. Bandı takıp zamanlayıcıyı başlat.`,
              id,
            );
          }
        }
      }
    };
    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, []);
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
