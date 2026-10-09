import { weeklyComparison, type SessionLike } from './summary';
import { CARD_FONT, escapeXml } from './svgText';

/**
 * Haftalık rapor kartı — saf, testli.
 *
 * Haftanın özeti tek bakışta: ne kadar okundu, kaç gün, seri, efektif hız.
 * Paylaşılabilir bir kart, alışkanlığı başkalarına da görünür kılıyor; ama
 * kartta yalnızca kullanıcının kendi sayıları var, kıyas ya da sıralama yok.
 */

export interface WeeklyReport {
  /** "6–12 Ekim" */
  rangeLabel: string;
  minutes: number;
  lastWeekMinutes: number;
  days: number;
  words: number;
  streak: number;
  /** Son güvenilir ölçümün efektif hızı */
  effectiveWpm: number | null;
  /** Aynı seviyedeki ilk ölçüme göre değişim (0,12 = %12) */
  change: number | null;
  level: string | null;
  badges: number;
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** Bu haftanın pazartesi–pazar aralığı: "6–12 Ekim", ay değişirse "29 Eylül – 5 Ekim". */
export function weekRangeLabel(now: number): string {
  const date = new Date(now);
  const mondayOffset = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`;
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`;
}

export function buildWeeklyReport(input: {
  sessions: SessionLike[];
  now: number;
  streak: number;
  effectiveWpm: number | null;
  change: number | null;
  level: string | null;
  badges: number;
}): WeeklyReport {
  const { thisWeek, lastWeek } = weeklyComparison(input.sessions, input.now);
  return {
    rangeLabel: weekRangeLabel(input.now),
    minutes: Math.round(thisWeek.ms / 60000),
    lastWeekMinutes: Math.round(lastWeek.ms / 60000),
    days: thisWeek.days,
    words: thisWeek.words,
    streak: input.streak,
    effectiveWpm: input.effectiveWpm === null ? null : Math.round(input.effectiveWpm),
    change: input.change,
    level: input.level,
    badges: input.badges,
  };
}

function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function changeLabel(change: number): string {
  const percent = Math.round(Math.abs(change) * 100);
  if (percent < 3) return 'yaklaşık aynı';
  return change > 0 ? `+%${percent}` : `-%${percent}`;
}

/** Paylaşım için düz metin (telefonda `Share`, web'de yedek). */
export function reportText(report: WeeklyReport): string {
  const lines = [
    `Okuma haftam · ${report.rangeLabel}`,
    `${report.minutes} dakika okudum, ${report.days}/7 gün`,
    `${formatThousands(report.words)} kelime`,
    `Seri: ${report.streak} gün`,
  ];
  if (report.effectiveWpm !== null) {
    const change = report.change === null ? '' : ` (${changeLabel(report.change)})`;
    lines.push(`Efektif okuma hızı: ${report.effectiveWpm} kel/dk${change}`);
  }
  if (report.badges > 0) lines.push(`Rozetler: ${report.badges}`);
  return lines.join('\n');
}

export interface ReportPalette {
  bg: string;
  surface: string;
  text: string;
  dim: string;
  accent: string;
}

/**
 * Kartın SVG hâli (600×600). Web'de PNG'ye çevrilip indiriliyor; yazı tipi
 * olarak sistem yazı tipi kullanılıyor ki dışarıdan dosya yüklemek gerekmesin.
 */
export function reportSvg(report: WeeklyReport, palette: ReportPalette): string {
  const font = CARD_FONT;
  const cell = (x: number, y: number, value: string, label: string) => `
    <rect x="${x}" y="${y}" width="250" height="130" rx="20" fill="${palette.surface}"/>
    <text x="${x + 24}" y="${y + 70}" ${font} font-size="48" font-weight="700" fill="${palette.text}">${escapeXml(value)}</text>
    <text x="${x + 24}" y="${y + 105}" ${font} font-size="20" fill="${palette.dim}">${escapeXml(label)}</text>`;

  const effective =
    report.effectiveWpm === null
      ? 'Henüz ölçüm yok'
      : `${report.effectiveWpm} kel/dk${report.change === null ? '' : ` · ${changeLabel(report.change)}`}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${palette.bg}"/>
  <text x="40" y="70" ${font} font-size="22" fill="${palette.accent}" font-weight="700">HIZLI OKUMA</text>
  <text x="40" y="115" ${font} font-size="36" font-weight="700" fill="${palette.text}">Okuma haftam</text>
  <text x="40" y="150" ${font} font-size="22" fill="${palette.dim}">${escapeXml(report.rangeLabel)}</text>
  ${cell(40, 180, `${report.minutes}`, 'dakika')}
  ${cell(310, 180, `${report.days}/7`, 'okuma günü')}
  ${cell(40, 330, formatThousands(report.words), 'kelime')}
  ${cell(310, 330, `${report.streak}`, 'gün seri')}
  <text x="40" y="520" ${font} font-size="20" fill="${palette.dim}">Efektif okuma hızı${report.level ? ` · ${escapeXml(report.level)}` : ''}</text>
  <text x="40" y="556" ${font} font-size="30" font-weight="700" fill="${palette.accent}">${escapeXml(effective)}</text>
</svg>`;
}
