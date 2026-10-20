import { describe, expect, it } from 'vitest';
import {
  disableEasyReading,
  EASY_FONT_SCALE,
  easyReadingSummary,
  easyTheme,
  enableEasyReading,
  type EasyFields,
} from './easyReading';

const current: EasyFields = {
  fontScale: 1,
  lineSpacing: 1.7,
  readingFont: 'serif',
  justify: true,
  hyphenate: true,
  letterSpacing: 0,
  wordSpacing: 0,
  readingTheme: 'white',
  textColor: 'graphite',
};

describe('enableEasyReading', () => {
  it('okunaklılık önayarını yazar', () => {
    const { patch } = enableEasyReading(current, true);
    expect(patch).toEqual({
      fontScale: EASY_FONT_SCALE,
      lineSpacing: 2,
      readingFont: 'hyperlegible',
      justify: false,
      hyphenate: false,
      letterSpacing: 1,
      wordSpacing: 1,
      readingTheme: 'sepia',
      // Zemin değişti: seçili yazı rengi yerine temanın rengi
      textColor: 'auto',
    });
  });

  it('zaten daha büyük/geniş olanı küçültmez', () => {
    const { patch } = enableEasyReading({ ...current, fontScale: 1.6, letterSpacing: 2, wordSpacing: 2 }, true);
    expect(patch.fontScale).toBe(1.6);
    expect(patch.letterSpacing).toBe(2);
    expect(patch.wordSpacing).toBe(2);
  });

  it('zemin değişmediyse yazı rengi korunur', () => {
    const { patch } = enableEasyReading({ ...current, readingTheme: 'night', textColor: 'amber' }, true);
    expect(patch.readingTheme).toBe('night');
    expect(patch.textColor).toBe('amber');
  });

  it('kapatınca açmadan önceki değerler geri gelir', () => {
    const { patch, backup } = enableEasyReading(current, false);
    const restored = { ...current, ...patch, ...disableEasyReading(backup) };
    expect(restored).toEqual(current);
    expect(disableEasyReading(null)).toEqual({});
  });
});

describe('easyTheme', () => {
  it('parlak zemin sepya, tam siyah koyu gri olur; yumuşaklar kalır', () => {
    expect(easyTheme('white', true)).toBe('sepia');
    expect(easyTheme('light', true)).toBe('sepia');
    expect(easyTheme('auto', false)).toBe('sepia');
    expect(easyTheme('auto', true)).toBe('auto');
    expect(easyTheme('black', true)).toBe('dark');
    for (const theme of ['dark', 'night', 'sepia', 'green', 'custom'] as const) {
      expect(easyTheme(theme, true)).toBe(theme);
    }
  });
});

describe('easyReadingSummary', () => {
  it('neyin değiştiğini söyler', () => {
    const { patch } = enableEasyReading(current, true);
    expect(easyReadingSummary(patch)).toBe(
      'yazı %120 · geniş satır, harf ve kelime aralığı · disleksi dostu yazı tipi · sola yaslı, kelimeler bölünmüyor · sepya zemin'
    );
  });
});
