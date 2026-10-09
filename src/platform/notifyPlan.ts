import { addDays, dayKey, formatMinutes, minutesByDay, startOfDay } from '../model/time';
import type { AppData, Profile } from '../model/types';

export interface PlannedNotification {
  /** Kalıcı anahtar (aynı hatırlatma her planlamada aynı anahtarı alır). */
  key: string;
  /** Android bildirim kimliği (32 bit pozitif tam sayı). */
  id: number;
  at: number;
  title: string;
  body: string;
  /** Bildirime dokununca açılacak sayfa. */
  route: string;
  profileId: string;
}

/** Bu kadar gün ilerisi planlanır; uygulama her açıldığında ve veri değiştiğinde plan yenilenir. */
export const PLAN_DAYS = 14;
const MIN = 60_000;

/** FNV-1a karması → Android'in kabul ettiği pozitif int32. */
export function notificationId(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 2147483646) + 1;
}

const atTime = (dayStart: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dayStart);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
};

function planForProfile(data: AppData, p: Profile, now: number, multi: boolean): Omit<PlannedNotification, 'id'>[] {
  const out: Omit<PlannedNotification, 'id'>[] = [];
  const kid = p.mode === 'child';
  const who = multi ? `${p.name}: ` : '';
  const today0 = startOfDay(now);
  const todayKey = dayKey(now);
  const runningSince = data.timers[p.id] ?? null;
  const todayMin =
    minutesByDay(
      data.sessions.filter((s) => s.profileId === p.id),
      now,
      runningSince,
    ).get(todayKey) ?? 0;
  const goalMet = todayMin >= p.dailyGoalMin;
  const add = (key: string, at: number, title: string, body: string, route: string) =>
    out.push({ key: `${p.id}|${key}`, at, title: who + title, body, route, profileId: p.id });

  for (let d = 0; d < PLAN_DAYS; d++) {
    const day0 = addDays(today0, d);
    const dk = dayKey(day0);
    // Kapama hatırlatmaları (bugün hedef dolduysa ya da bant zaten takılıysa atlanır)
    for (const t of p.reminderTimes) {
      if (d === 0 && (goalMet || runningSince)) continue;
      const left = d === 0 ? p.dailyGoalMin - todayMin : p.dailyGoalMin;
      add(
        `patch|${dk}|${t}`,
        atTime(day0, t),
        kid ? 'Korsan bandı zamanı! 🏴‍☠️' : 'Kapama zamanı 🏴‍☠️',
        kid
          ? `Bandını tak, ${formatMinutes(left)} görevin var!`
          : `Bugünkü hedefe ${formatMinutes(left)} kaldı. Bandı takıp zamanlayıcıyı başlat.`,
        '/timer',
      );
    }
    // Günlük
    if (p.notifyDiaryTime && !(d === 0 && data.diary.some((e) => e.profileId === p.id && e.day === todayKey))) {
      add(
        `diary|${dk}`,
        atTime(day0, p.notifyDiaryTime),
        kid ? 'Bugün gözlerin nasıldı? 📝' : 'Günlük 📝',
        `Belirtileri, bant uyumunu${p.wearsGlasses ? ' ve gözlüğü' : ''} 10 saniyede kaydet.`,
        '/diary',
      );
    }
  }

  // Zamanlayıcı çalışıyorsa: hedef dolunca ve 1 saat sonra hâlâ çalışıyorsa
  if (runningSince) {
    // `şimdi + kalan`, bant takılı kaldıkça sabittir (her yeniden planlamada aynı zaman çıkar).
    const goalAt = now + (p.dailyGoalMin - todayMin) * MIN;
    if (p.notifyGoal && !goalMet) {
      add(
        `goal|${runningSince}`,
        goalAt,
        kid ? 'Görev tamam! 🎉' : 'Hedefe ulaştın! 🎉',
        `Bugün ${formatMinutes(p.dailyGoalMin)} kapama tamamlandı. Bandı çıkarabilirsin.`,
        '/timer',
      );
    }
    if (p.notifyForgot) {
      add(
        `forgot|${runningSince}`,
        Math.max(goalAt, runningSince) + 60 * MIN,
        'Bant hâlâ takılı mı? ⏱',
        'Zamanlayıcı çalışıyor. Bandı çıkardıysan zamanlayıcıyı durdurmayı unutma.',
        '/timer',
      );
    }
  }

  // Görme testi günü
  if (p.notifyVision && p.visionTestEveryDays > 0) {
    const last = data.visionTests.filter((t) => t.profileId === p.id).reduce((m, t) => Math.max(m, t.at), 0);
    const due = last ? atTime(addDays(startOfDay(last), p.visionTestEveryDays), '10:00') : now;
    let at = due;
    if (due <= now) {
      // Gecikmiş: bugün akşam ya da yarın sabah bir kez hatırlat.
      const evening = atTime(today0, '18:00');
      at = evening > now ? evening : atTime(addDays(today0, 1), '10:00');
    }
    add(
      `vision|${dayKey(at)}`,
      at,
      kid ? 'Göz testi günü! 👁️' : 'Görme testi zamanı 👁️',
      `Her ${p.visionTestEveryDays} günde bir yapılan ev testini yap; 3 dakika sürer.`,
      '/vision',
    );
  }

  // Kontrol randevusu
  if (p.notifyVisit && p.nextVisit) {
    const visit0 = startOfDay(new Date(`${p.nextVisit}T12:00:00`).getTime());
    if (Number.isFinite(visit0)) {
      add(
        `visit-1|${p.nextVisit}`,
        atTime(addDays(visit0, -1), '19:00'),
        'Yarın göz kontrolün var 🩺',
        'Doktor raporunu hazırla: Rapor sayfasından yazdırabilir ya da bağlantıyla paylaşabilirsin.',
        '/report',
      );
      add(`visit|${p.nextVisit}`, atTime(visit0, '08:30'), 'Bugün göz kontrolün var 🩺', 'Gözlüğünü ve raporunu yanına almayı unutma.', '/report');
    }
  }
  return out;
}

/** Tüm profiller için önümüzdeki günlerin bildirim planı (yalnızca gelecekteki zamanlar). */
export function planNotifications(data: AppData, now: number): PlannedNotification[] {
  const multi = data.profiles.length > 1;
  const until = now + PLAN_DAYS * 24 * 60 * MIN;
  return data.profiles
    .flatMap((p) => planForProfile(data, p, now, multi))
    .filter((n) => n.at > now && n.at <= until)
    .map((n) => ({ ...n, id: notificationId(n.key) }))
    .sort((a, b) => a.at - b.at);
}
