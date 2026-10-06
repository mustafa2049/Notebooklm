import { defaultAnaglyph, emptyData, type AppData, type Profile } from '../model/types';
import { dayKey, minutesByDay } from '../model/time';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const profileDefaults = (): Omit<Profile, 'id' | 'name' | 'anaglyph'> => ({
  mode: 'adult',
  amblyopicEye: 'left',
  dailyGoalMin: 120,
  reminderTimes: [],
  dichopticContrast: 0.2,
  createdAt: Date.now(),
});

/** Kayıtlı ya da içe aktarılan veriyi doğrular ve eksik alanları varsayılanlarla doldurur. */
export function normalizeData(raw: unknown): AppData {
  if (!isObj(raw)) throw new Error('Geçersiz veri');
  const base = emptyData();
  const profiles = arr<Profile>(raw.profiles)
    .filter((p) => isObj(p) && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => ({
      ...profileDefaults(),
      ...p,
      anaglyph: { ...defaultAnaglyph(), ...(isObj(p.anaglyph) ? p.anaglyph : {}) },
    }));
  const ids = new Set(profiles.map((p) => p.id));
  const activeProfileId =
    typeof raw.activeProfileId === 'string' && ids.has(raw.activeProfileId)
      ? raw.activeProfileId
      : (profiles[0]?.id ?? null);
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  return {
    ...base,
    profiles,
    activeProfileId,
    sessions: arr<AppData['sessions'][number]>(raw.sessions).filter(
      (s) => isObj(s) && num(s.start) && num(s.end) && s.end >= s.start,
    ),
    results: arr<AppData['results'][number]>(raw.results).filter((r) => isObj(r) && typeof r.kind === 'string'),
    gabor: arr<AppData['gabor'][number]>(raw.gabor).filter((g) => isObj(g) && num(g.threshold)),
    timers: isObj(raw.timers) ? (raw.timers as AppData['timers']) : {},
  };
}

export function exportJson(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJson(text: string): AppData {
  return normalizeData(JSON.parse(text));
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Doktora gösterilecek CSV: günlük kapama dakikası ve aktiviteler.
 * Türkçe Excel'in açabilmesi için ayraç olarak ';' kullanılır.
 */
export function exportCsv(data: AppData, profileId: string, now = Date.now()): string {
  const profile = data.profiles.find((p) => p.id === profileId);
  const lines: string[] = [];
  const row = (...cells: (string | number)[]) => lines.push(cells.map(csvCell).join(';'));

  row('Profil', profile?.name ?? '');
  row('Tembel göz', profile?.amblyopicEye === 'right' ? 'Sağ' : 'Sol');
  row('Günlük hedef (dk)', profile?.dailyGoalMin ?? '');
  row('');
  row('Tarih', 'Kapama (dk)');
  const byDay = minutesByDay(
    data.sessions.filter((s) => s.profileId === profileId),
    now,
  );
  [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([d, m]) => row(d, Math.round(m)));
  row('');
  row('Tarih', 'Aktivite', 'Süre (sn)', 'Skor', 'Seviye', 'Başarı (%)', 'Sağlam göz kontrastı (%)');
  data.results
    .filter((r) => r.profileId === profileId)
    .sort((a, b) => a.at - b.at)
    .forEach((r) =>
      row(
        dayKey(r.at),
        r.kind,
        Math.round(r.durationSec),
        r.score,
        r.level,
        Math.round(r.performance * 100),
        r.contrast != null ? Math.round(r.contrast * 100) : '',
      ),
    );
  row('');
  row('Tarih', 'Gabor eşiği (%)', 'Döngü', 'Deneme', 'Görüntüleme');
  data.gabor
    .filter((g) => g.profileId === profileId)
    .sort((a, b) => a.at - b.at)
    .forEach((g) => row(dayKey(g.at), (g.threshold * 100).toFixed(2), g.cycles, g.trials, g.viewing));
  return '﻿' + lines.join('\n');
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
