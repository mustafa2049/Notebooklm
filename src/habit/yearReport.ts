import { BOOK_MIN_WORDS } from './books';
import { dayKey, longestFlexibleStreak, type SessionLike } from './summary';

/**
 * Okuduğum kitaplar ve "Okuma yılım" kartı — saf, testli.
 *
 * Bitirilen kitaplar iki kaynaktan gelir: okuma günlüğü (puan/not verilmiş,
 * kitap silinmiş olsa da) ve kütüphanede bitmiş görünen kitaplar. Kısa
 * metinler (yapıştırılan makaleler) günlüğe yazılmadıkça kitap sayılmaz.
 */

export interface FinishedBook {
  docId: string;
  title: string;
  wordCount: number;
  finishedAt: number;
  /** 1–5; 0 = puan yok */
  rating: number;
  note: string;
}

interface JournalLike {
  docId: string;
  title: string;
  wordCount: number;
  finishedAt: number;
  rating: number;
  note: string;
}

interface LibraryItem {
  meta: { id: string; title: string; wordCount: number };
  progress: { finished: boolean; finishedAt?: number } | null;
}

/** Günlük + kütüphane, kitap başına bir kayıt, en yeni önce */
export function finishedBooks(journal: JournalLike[], library: LibraryItem[]): FinishedBook[] {
  const books = new Map<string, FinishedBook>();
  for (const entry of journal) {
    books.set(entry.docId, { ...entry });
  }
  for (const item of library) {
    if (books.has(item.meta.id)) continue;
    const finishedAt = item.progress?.finishedAt;
    if (!item.progress?.finished || finishedAt === undefined) continue;
    if (item.meta.wordCount < BOOK_MIN_WORDS) continue;
    books.set(item.meta.id, {
      docId: item.meta.id,
      title: item.meta.title,
      wordCount: item.meta.wordCount,
      finishedAt,
      rating: 0,
      note: '',
    });
  }
  return [...books.values()].sort((a, b) => b.finishedAt - a.finishedAt);
}

/** Yıllara göre, en yeni yıl önce */
export function booksByYear(books: FinishedBook[]): { year: number; books: FinishedBook[] }[] {
  const byYear = new Map<number, FinishedBook[]>();
  for (const book of books) {
    const year = new Date(book.finishedAt).getFullYear();
    byYear.set(year, [...(byYear.get(year) ?? []), book]);
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, list]) => ({ year, books: list }));
}

export interface YearReport {
  year: number;
  books: number;
  minutes: number;
  words: number;
  /** Okunan gün sayısı */
  days: number;
  /** Yıl içindeki en uzun esnek seri */
  longestStreak: number;
  /** En yüksek puanlı kitap (eşitlikte en son biten) */
  topBook: { title: string; rating: number } | null;
  /** Yılın alıntısı: notlu olan öncelikli, sonra en yenisi */
  quote: { sentence: string; title: string } | null;
}

export function buildYearReport(input: {
  year: number;
  sessions: SessionLike[];
  books: FinishedBook[];
  highlights: { sentence: string; docTitle: string; note?: string; createdAt: number }[];
}): YearReport {
  const inYear = (at: number) => new Date(at).getFullYear() === input.year;
  const sessions = input.sessions.filter((session) => inYear(session.at));
  const days = new Set(sessions.filter((s) => s.ms > 0).map((session) => dayKey(session.at)));
  const books = input.books.filter((book) => inYear(book.finishedAt));

  const rated = books.filter((book) => book.rating > 0).sort((a, b) => b.rating - a.rating || b.finishedAt - a.finishedAt);
  // Kartta okunabilsin diye çok uzun alıntılar seçilmez
  const quotes = input.highlights
    .filter((item) => inYear(item.createdAt) && item.sentence.length <= 220)
    .sort((a, b) => Number(Boolean(b.note)) - Number(Boolean(a.note)) || b.createdAt - a.createdAt);

  return {
    year: input.year,
    books: books.length,
    minutes: Math.round(sessions.reduce((sum, session) => sum + session.ms, 0) / 60000),
    words: sessions.reduce((sum, session) => sum + session.words, 0),
    days: days.size,
    longestStreak: longestFlexibleStreak(days),
    topBook: rated[0] ? { title: rated[0].title, rating: rated[0].rating } : null,
    quote: quotes[0] ? { sentence: quotes[0].sentence, title: quotes[0].docTitle } : null,
  };
}

function thousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 125 dk → "2 sa 5 dk"; bir saatten azsa "45 dk" */
export function hoursLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} dk`;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

export function yearText(report: YearReport): string {
  const lines = [
    `Okuma yılım · ${report.year}`,
    `${report.books} kitap bitirdim`,
    `${hoursLabel(report.minutes)} okudum, ${thousands(report.words)} kelime`,
    `${report.days} gün okudum · en uzun seri ${report.longestStreak} gün`,
  ];
  if (report.topBook) lines.push(`Yılın kitabı: ${report.topBook.title} (${'★'.repeat(report.topBook.rating)})`);
  if (report.quote) lines.push('', `“${report.quote.sentence}”`, `— ${report.quote.title}`);
  return lines.join('\n');
}

/**
 * Metni satırlara böler (SVG'de kendiliğinden satır kaydırma yok). En çok
 * `maxLines` satır; sığmazsa son satır "…" ile biter. Kelime ortasından
 * bölmez (tek kelime satırdan uzunsa kesilir).
 */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i].length > maxChars ? `${words[i].slice(0, maxChars - 1)}…` : words[i];
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) {
      current = '';
      // Sığmayan kısım kaldı: son satırı "…" ile kapat
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.length + 1 <= maxChars ? `${last}…` : `${last.slice(0, maxChars - 1)}…`;
      return lines;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (ch) =>
    ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === "'" ? '&apos;' : '&quot;'
  );
}

export interface YearPalette {
  bg: string;
  surface: string;
  text: string;
  dim: string;
  accent: string;
}

export const YEAR_CARD_SIZE = { width: 600, height: 800 };

/** "Okuma yılım" kartı (600×800 SVG); haftalık kartla aynı dil */
export function yearSvg(report: YearReport, palette: YearPalette): string {
  const font = "font-family=\"system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif\"";
  const cell = (x: number, y: number, value: string, label: string) => `
    <rect x="${x}" y="${y}" width="250" height="130" rx="20" fill="${palette.surface}"/>
    <text x="${x + 24}" y="${y + 70}" ${font} font-size="${value.length > 7 ? 38 : 48}" font-weight="700" fill="${palette.text}">${escapeXml(value)}</text>
    <text x="${x + 24}" y="${y + 105}" ${font} font-size="20" fill="${palette.dim}">${escapeXml(label)}</text>`;

  const parts: string[] = [];
  let y = 520;
  if (report.topBook) {
    parts.push(
      `<text x="40" y="${y}" ${font} font-size="20" fill="${palette.dim}">Yılın kitabı</text>`,
      `<text x="40" y="${y + 34}" ${font} font-size="26" font-weight="700" fill="${palette.text}">${escapeXml(
        wrapLines(report.topBook.title, 34, 1)[0] ?? ''
      )} <tspan fill="${palette.accent}">${'★'.repeat(report.topBook.rating)}</tspan></text>`
    );
    y += 80;
  }
  if (report.quote) {
    const lines = wrapLines(`“${report.quote.sentence}”`, 44, report.topBook ? 3 : 5);
    lines.forEach((line, index) => {
      parts.push(
        `<text x="40" y="${y + index * 32}" ${font} font-size="22" font-style="italic" fill="${palette.text}">${escapeXml(line)}</text>`
      );
    });
    parts.push(
      `<text x="40" y="${y + lines.length * 32 + 8}" ${font} font-size="18" fill="${palette.dim}">— ${escapeXml(
        wrapLines(report.quote.title, 46, 1)[0] ?? ''
      )}</text>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="${palette.bg}"/>
  <text x="40" y="70" ${font} font-size="22" fill="${palette.accent}" font-weight="700">HIZLI OKUMA</text>
  <text x="40" y="118" ${font} font-size="40" font-weight="700" fill="${palette.text}">Okuma yılım · ${report.year}</text>
  ${cell(40, 160, `${report.books}`, report.books === 1 ? 'kitap' : 'kitap bitirdim')}
  ${cell(310, 160, hoursLabel(report.minutes), 'okuma süresi')}
  ${cell(40, 310, thousands(report.words), 'kelime')}
  ${cell(310, 310, `${report.longestStreak}`, 'gün en uzun seri')}
  <text x="40" y="478" ${font} font-size="20" fill="${palette.dim}">${report.days} gün okudum</text>
  ${parts.join('\n  ')}
</svg>`;
}
