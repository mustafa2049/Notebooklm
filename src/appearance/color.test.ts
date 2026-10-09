import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  isDarkColor,
  mix,
  normalizeHex,
  parseHex,
  readability,
  relativeLuminance,
} from './color';

describe('parseHex / normalizeHex', () => {
  it('kısa ve uzun biçimi, # olmadan ve büyük/küçük harfle okur', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('1A2b3C')).toEqual({ r: 26, g: 43, b: 60 });
    expect(normalizeHex(' #abc ')).toBe('#AABBCC');
  });

  it('geçersizi reddeder', () => {
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('kırmızı')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('kontrast', () => {
  it('siyah–beyaz 21:1, aynı renk 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('sıra fark etmez', () => {
    expect(contrastRatio('#F4ECD8', '#3B2F22')).toBeCloseTo(contrastRatio('#3B2F22', '#F4ECD8'), 10);
  });

  it('parlaklık uçları', () => {
    expect(relativeLuminance('#000')).toBe(0);
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5);
  });

  it('okunabilirlik sınıfları', () => {
    expect(readability(7)).toBe('rahat');
    expect(readability(3.5)).toBe('zor');
    expect(readability(2)).toBe('okunmaz');
  });
});

describe('mix / isDarkColor', () => {
  it('uçlarda kaynak renkleri, ortada karışımı verir', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('koyu ve açık zeminleri ayırır', () => {
    expect(isDarkColor('#0B0D10')).toBe(true);
    expect(isDarkColor('#F4ECD8')).toBe(false);
  });
});
