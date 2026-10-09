import { describe, expect, it } from 'vitest';
import { contrastRatio } from './color';
import {
  APP_DARK,
  APP_LIGHT,
  READING_THEMES,
  readingColors,
  TEXT_COLORS,
  textColorChoices,
  type ReadingInput,
} from './palettes';

const base: ReadingInput = {
  readingTheme: 'auto',
  textColor: 'auto',
  customBg: '#1C1F25',
  customText: '#EFE3C8',
  appDark: true,
  focusMode: false,
};

describe('hazır okuma temaları', () => {
  for (const { id, label } of READING_THEMES) {
    if (id === 'custom') continue;
    for (const appDark of [true, false]) {
      it(`${label} (${appDark ? 'koyu' : 'açık'} uygulama): yazı ≥ 7:1, soluk yazı ≥ 3:1`, () => {
        const { colors } = readingColors({ ...base, readingTheme: id, appDark });
        expect(contrastRatio(colors.text, colors.bg)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(colors.textDim, colors.bg)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(colors.accent, colors.bg)).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('Uygulama teması uygulamanın renklerini izler', () => {
    expect(readingColors({ ...base, appDark: true }).colors).toEqual(APP_DARK);
    expect(readingColors({ ...base, appDark: false }).colors).toEqual(APP_LIGHT);
  });

  it('odak modu koyu zemini tam siyah yapar', () => {
    expect(readingColors({ ...base, focusMode: true }).colors.bg).toBe('#000000');
    expect(readingColors({ ...base, appDark: false, focusMode: true }).colors.bg).toBe(APP_LIGHT.bg);
  });
});

describe('yazı rengi', () => {
  it('okunmayacak hazır renkler listede yok', () => {
    const onDark = textColorChoices(APP_DARK.bg).map((color) => color.id);
    expect(onDark).toContain('cream');
    expect(onDark).not.toContain('black');
    const onSepia = textColorChoices('#F4ECD8').map((color) => color.id);
    expect(onSepia).toContain('brown');
    expect(onSepia).not.toContain('white');
    for (const color of textColorChoices('#F4ECD8')) {
      expect(contrastRatio(color.hex, '#F4ECD8')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('seçilen renk uygulanır, soluk tonlar ondan türetilir', () => {
    const { colors, textFallback } = readingColors({ ...base, textColor: 'amber' });
    expect(colors.text).toBe(TEXT_COLORS.find((color) => color.id === 'amber')!.hex);
    expect(colors.textDim).not.toBe(APP_DARK.textDim);
    expect(textFallback).toBe(false);
  });

  it('tema değişince okunmaz kalan renk temanın rengine düşer ve bildirilir', () => {
    const result = readingColors({ ...base, readingTheme: 'white', textColor: 'cream' });
    expect(result.textFallback).toBe(true);
    expect(contrastRatio(result.colors.text, result.colors.bg)).toBeGreaterThanOrEqual(7);
  });
});

describe('özel renkler', () => {
  it('özel zemin ve yazı uygulanır, kartlar ve kenarlar türetilir', () => {
    const { colors, dark } = readingColors({
      ...base,
      readingTheme: 'custom',
      textColor: 'custom',
      customBg: '#0F1A2E',
      customText: '#E3ECF5',
    });
    expect(colors.bg).toBe('#0F1A2E');
    expect(colors.text).toBe('#E3ECF5');
    expect(dark).toBe(true);
    expect(colors.surface).not.toBe(colors.bg);
    expect(contrastRatio(colors.accent, colors.bg)).toBeGreaterThanOrEqual(3);
  });

  it('kontrastı 3:1 altındaki özel yazı uygulanmaz', () => {
    const result = readingColors({
      ...base,
      readingTheme: 'custom',
      textColor: 'custom',
      customBg: '#777777',
      customText: '#888888',
    });
    expect(result.textFallback).toBe(true);
    expect(contrastRatio(result.colors.text, result.colors.bg)).toBeGreaterThanOrEqual(3);
  });

  it('geçersiz özel zemin varsayılana döner', () => {
    expect(readingColors({ ...base, readingTheme: 'custom', customBg: 'xyz' }).colors.bg).toBe('#1C1F25');
  });
});
