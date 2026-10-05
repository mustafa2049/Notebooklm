import { describe, expect, it } from 'vitest';
import {
  dayKeyBefore,
  flexibleStreak,
  heatmapDays,
  longestFlexibleStreak,
  summarize,
  weeklyComparison,
  type SessionLike,
} from './summary';

// Sabit bir "şimdi": 15 Ekim 2025 Çarşamba 12:00 (yerel saat)
const NOW = new Date(2025, 9, 15, 12, 0, 0).getTime();

function daysAgo(offset: number, hour = 10): number {
  const date = new Date(NOW);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset, hour).getTime();
}

function session(offset: number, words = 300, ms = 60000, mode = 'rsvp'): SessionLike {
  return { at: daysAgo(offset), words, ms, mode };
}

function readOn(...offsets: number[]): Set<string> {
  return new Set(offsets.map((offset) => dayKeyBefore(NOW, offset)));
}

describe('flexibleStreak', () => {
  it('kesintisiz okunan günleri sayar', () => {
    expect(flexibleStreak(readOn(0, 1, 2), NOW)).toEqual({ streak: 3, atRisk: false });
  });

  it('bugün henüz okunmadıysa seriyi bozmaz', () => {
    expect(flexibleStreak(readOn(1, 2, 3), NOW)).toEqual({ streak: 3, atRisk: false });
  });

  it('tek bir kaçırılan gün seriyi bozmaz', () => {
    // bugün, (dün yok), 2 ve 3 gün önce
    expect(flexibleStreak(readOn(0, 2, 3), NOW).streak).toBe(3);
  });

  it('iki gün üst üste kaçırmak seriyi bozar', () => {
    // bugün, (dün ve önceki gün yok), 3 gün önce
    expect(flexibleStreak(readOn(0, 3, 4), NOW).streak).toBe(1);
  });

  it('dün okunmadı, bugün de henüz okunmadıysa tehlikede sayılır', () => {
    expect(flexibleStreak(readOn(2, 3), NOW)).toEqual({ streak: 2, atRisk: true });
  });

  it('dün ve önceki gün okunmadıysa seri bitmiştir', () => {
    expect(flexibleStreak(readOn(3, 4), NOW)).toEqual({ streak: 0, atRisk: false });
  });

  it('hiç okuma yoksa sıfırdır ve tehlike yoktur', () => {
    expect(flexibleStreak(new Set(), NOW)).toEqual({ streak: 0, atRisk: false });
  });

  it('birden çok tekil boşluğu tolere eder', () => {
    expect(flexibleStreak(readOn(0, 2, 4, 6), NOW).streak).toBe(4);
  });
});

describe('summarize', () => {
  it('test okumalarını tempo ortalamasına katmaz ama günlük toplama katar', () => {
    const summary = summarize(
      [session(0, 600, 60000, 'rsvp'), session(0, 200, 60000, 'test')],
      NOW
    );
    expect(summary.averageWpm).toBe(600);
    expect(summary.todayWords).toBe(800);
    expect(summary.todayMs).toBe(120000);
  });

  it('son 14 günü eskiden yeniye verir', () => {
    const summary = summarize([session(0), session(13)], NOW);
    expect(summary.daily).toHaveLength(14);
    expect(summary.daily[0].words).toBe(300);
    expect(summary.daily[13].words).toBe(300);
  });

  it('seri ve tehlike durumunu taşır', () => {
    const summary = summarize([session(2), session(3)], NOW);
    expect(summary.streak).toBe(2);
    expect(summary.streakAtRisk).toBe(true);
    expect(summary.readToday).toBe(false);
  });
});

describe('heatmapDays', () => {
  it('pazartesiden başlayan tam haftalar verir ve geleceği işaretler', () => {
    const days = heatmapDays([session(0, 300, 90000)], NOW, 2);
    expect(days).toHaveLength(14);
    // 15 Ekim 2025 çarşamba → iki hafta önceki pazartesi 6 Ekim
    expect(days[0].day).toBe('2025-10-06');
    const todayIndex = days.findIndex((entry) => entry.day === '2025-10-15');
    expect(days[todayIndex].ms).toBe(90000);
    expect(days[todayIndex].future).toBe(false);
    expect(days[todayIndex + 1].future).toBe(true);
  });
});

describe('weeklyComparison', () => {
  it('bu haftayı pazartesiden, geçen haftayı tam hafta olarak sayar', () => {
    // bugün çarşamba: 0,1,2 gün önce bu hafta; 3..9 gün önce geçen hafta
    const result = weeklyComparison(
      [session(0), session(2), session(3), session(9), session(10)],
      NOW
    );
    expect(result.thisWeek.days).toBe(2);
    expect(result.lastWeek.days).toBe(2);
    expect(result.thisWeek.words).toBe(600);
  });
});

describe('longestFlexibleStreak', () => {
  it('tek günlük boşlukları tolere ederek en uzun zinciri bulur', () => {
    const days = new Set(['2025-01-01', '2025-01-02', '2025-01-04', '2025-01-08', '2025-01-09']);
    expect(longestFlexibleStreak(days)).toBe(3);
  });

  it('boş kümede sıfır', () => {
    expect(longestFlexibleStreak(new Set())).toBe(0);
  });
});
