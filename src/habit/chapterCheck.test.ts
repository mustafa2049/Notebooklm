import { describe, expect, it } from 'vitest';
import { chapterIndexAt, chapterText, finishedChapter, MAX_CHAPTER_TEXT } from './chapterCheck';

const chapters = [
  { title: 'Kapak', charOffset: 0 },
  { title: 'Birinci', charOffset: 200 },
  { title: 'İkinci', charOffset: 5000 },
  { title: 'Üçüncü', charOffset: 12000 },
];
const LENGTH = 20000;

describe('chapterIndexAt', () => {
  it('konumdan küçük son bölüm', () => {
    expect(chapterIndexAt(chapters, 0)).toBe(0);
    expect(chapterIndexAt(chapters, 4999)).toBe(1);
    expect(chapterIndexAt(chapters, 5000)).toBe(2);
    expect(chapterIndexAt([{ title: 'x', charOffset: 100 }], 50)).toBe(-1);
  });
});

describe('finishedChapter', () => {
  it('okuyarak sonraki bölüme geçince biten bölüm', () => {
    expect(finishedChapter(chapters, 4900, 5030, LENGTH, [])).toBe(1);
    expect(finishedChapter(chapters, 11000, 12100, LENGTH, [])).toBe(2);
  });

  it('bölüm içinde ilerlemek ya da geri gitmek değil', () => {
    expect(finishedChapter(chapters, 300, 800, LENGTH, [])).toBeNull();
    expect(finishedChapter(chapters, 5030, 4900, LENGTH, [])).toBeNull();
  });

  it('atlama (büyük sıçrama ya da bölüm üstünden geçme) sayılmaz', () => {
    expect(finishedChapter(chapters, 300, 5030, LENGTH, [])).toBeNull();
    expect(finishedChapter(chapters, 4900, 12100, LENGTH, [])).toBeNull();
  });

  it('kısa bölüm ve daha önce önerilen bölüm sorulmaz', () => {
    expect(finishedChapter(chapters, 150, 250, LENGTH, [])).toBeNull();
    expect(finishedChapter(chapters, 4900, 5030, LENGTH, [1])).toBeNull();
  });

  it('tek bölümlü metinde hiç', () => {
    expect(finishedChapter([chapters[0]], 100, 200, LENGTH, [])).toBeNull();
  });
});

describe('chapterText', () => {
  it('bölümün aralığı', () => {
    const text = 'a'.repeat(200) + 'Birinci bölüm metni.' + 'b'.repeat(10);
    const short = [{ title: 'K', charOffset: 0 }, { title: 'B', charOffset: 200 }, { title: 'C', charOffset: 220 }];
    expect(chapterText(text, short, 1)).toBe('Birinci bölüm metni.');
  });

  it('uzun bölümde sondan, kelime sınırından', () => {
    const body = Array.from({ length: 4000 }, (_, i) => `kelime${i}`).join(' ');
    const result = chapterText(body, [{ title: 'T', charOffset: 0 }], 0);
    expect(result.length).toBeLessThanOrEqual(MAX_CHAPTER_TEXT);
    expect(result.startsWith('kelime')).toBe(true);
    expect(result.endsWith('kelime3999')).toBe(true);
  });
});
