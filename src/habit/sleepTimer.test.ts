import { describe, expect, it } from 'vitest';
import {
  chapterEndAfter,
  choiceOf,
  nextChoice,
  onResume,
  shouldStopBefore,
  sleepChoices,
  sleepLabel,
  SLEEP_OFF,
  startTimer,
} from './sleepTimer';

const chapters = [{ charOffset: 0 }, { charOffset: 1000 }, { charOffset: 5000 }];
const context = { now: 1_000_000, offset: 1200, chapters, textLength: 9000 };

describe('seçenekler', () => {
  it('bölüm yoksa "bölüm sonu" sunulmuyor', () => {
    expect(sleepChoices(false)).toEqual(['off', 10, 20, 30]);
    expect(sleepChoices(true)).toContain('chapter');
  });

  it('dokundukça sırayla dönüyor', () => {
    expect(nextChoice('off', true)).toBe(10);
    expect(nextChoice(30, true)).toBe('chapter');
    expect(nextChoice('chapter', true)).toBe('off');
    expect(nextChoice(30, false)).toBe('off');
  });
});

describe('chapterEndAfter', () => {
  it('bulunulan yerden sonra başlayan ilk bölümün başını veriyor', () => {
    expect(chapterEndAfter(chapters, 1200, 9000)).toBe(5000);
    expect(chapterEndAfter(chapters, 0, 9000)).toBe(1000);
    // Bölüm başındaysa o bölümün sonu (sıradaki bölüm)
    expect(chapterEndAfter(chapters, 1000, 9000)).toBe(5000);
  });

  it('son bölümde ya da bölüm yoksa metnin sonu', () => {
    expect(chapterEndAfter(chapters, 6000, 9000)).toBe(9000);
    expect(chapterEndAfter([], 10, 9000)).toBe(9000);
  });
});

describe('zamanlayıcı', () => {
  it('süre dolunca sıradaki cümleden önce duruyor', () => {
    const timer = startTimer(20, context);
    expect(choiceOf(timer)).toBe(20);
    expect(shouldStopBefore(timer, { now: context.now + 19 * 60_000, charStart: 2000 })).toBe(false);
    expect(shouldStopBefore(timer, { now: context.now + 20 * 60_000, charStart: 2000 })).toBe(true);
  });

  it('bölüm sonunda, sıradaki bölümün ilk cümlesinden önce duruyor', () => {
    const timer = startTimer('chapter', context);
    expect(timer).toEqual({ kind: 'chapter', endOffset: 5000 });
    expect(shouldStopBefore(timer, { now: 0, charStart: 4990 })).toBe(false);
    expect(shouldStopBefore(timer, { now: 0, charStart: 5000 })).toBe(true);
  });

  it('kapalıyken hiç durdurmuyor', () => {
    expect(shouldStopBefore(SLEEP_OFF, { now: Number.MAX_SAFE_INTEGER, charStart: 1e9 })).toBe(false);
    expect(startTimer('off', context)).toEqual(SLEEP_OFF);
  });

  it('süresi dolmuş zamanlayıcı yeniden başlatınca kapanıyor', () => {
    const timer = startTimer(10, context);
    expect(onResume(timer, { now: context.now + 5 * 60_000, offset: 0 })).toBe(timer);
    expect(onResume(timer, { now: context.now + 11 * 60_000, offset: 0 })).toEqual(SLEEP_OFF);
    const chapter = startTimer('chapter', context);
    expect(onResume(chapter, { now: 0, offset: 5200 })).toEqual(SLEEP_OFF);
    expect(onResume(chapter, { now: 0, offset: 3000 })).toBe(chapter);
  });

  it('kalan süreyi dakika:saniye yazıyor', () => {
    const timer = startTimer(10, context);
    expect(sleepLabel(timer, context.now)).toBe('10:00');
    expect(sleepLabel(timer, context.now + 61_500)).toBe('8:59');
    expect(sleepLabel(timer, context.now + 11 * 60_000)).toBe('0:00');
    expect(sleepLabel(SLEEP_OFF, 0)).toBe('kapalı');
    expect(sleepLabel(startTimer('chapter', context), 0)).toBe('bölüm sonu');
  });
});
