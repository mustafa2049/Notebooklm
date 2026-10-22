import { describe, expect, it } from 'vitest';
import { cardinalWords, decimalWords, digitWords, ordinalOf, romanValue, withSuffix } from './numbers';

describe('cardinalWords', () => {
  it('Türkçe okunuş: yüz ve bin tek başına', () => {
    expect(cardinalWords('0')).toBe('sıfır');
    expect(cardinalWords('7')).toBe('yedi');
    expect(cardinalWords('100')).toBe('yüz');
    expect(cardinalWords('101')).toBe('yüz bir');
    expect(cardinalWords('1000')).toBe('bin');
    expect(cardinalWords('1001')).toBe('bin bir');
    expect(cardinalWords('1923')).toBe('bin dokuz yüz yirmi üç');
    expect(cardinalWords('2026')).toBe('iki bin yirmi altı');
    expect(cardinalWords('200000')).toBe('iki yüz bin');
  });

  it('milyon ve üstünde "bir" söylenir', () => {
    expect(cardinalWords('1000000')).toBe('bir milyon');
    expect(cardinalWords('1250000')).toBe('bir milyon iki yüz elli bin');
    expect(cardinalWords('3000000000')).toBe('üç milyar');
  });

  it('baştaki sıfırlar atılır; çok uzun sayılar rakam rakam', () => {
    expect(cardinalWords('007')).toBe('yedi');
    expect(digitWords('0532')).toBe('sıfır beş üç iki');
    expect(cardinalWords('1234567890123456789')).toBe(digitWords('1234567890123456789'));
  });
});

describe('ordinalOf / withSuffix', () => {
  it('sıra eki ünlü uyumuyla', () => {
    expect(ordinalOf('bir')).toBe('birinci');
    expect(ordinalOf('iki')).toBe('ikinci');
    expect(ordinalOf('üç')).toBe('üçüncü');
    expect(ordinalOf('dört')).toBe('dördüncü');
    expect(ordinalOf('altı')).toBe('altıncı');
    expect(ordinalOf('dokuz')).toBe('dokuzuncu');
    expect(ordinalOf('kırk')).toBe('kırkıncı');
    expect(ordinalOf('yüz')).toBe('yüzüncü');
    expect(ordinalOf('bin dokuz yüz yirmi üç')).toBe('bin dokuz yüz yirmi üçüncü');
  });

  it('ek son kelimeye; dört ünlüyle yumuşar', () => {
    expect(withSuffix('yirmi dört', 'e')).toBe('yirmi dörde');
    expect(withSuffix('üç', 'te')).toBe('üçte');
    expect(withSuffix('iki', 'si')).toBe('ikisi');
    expect(withSuffix('beş', '')).toBe('beş');
  });
});

describe('decimalWords / romanValue', () => {
  it('ondalık, kesirdeki baş sıfırlar tek tek', () => {
    expect(decimalWords('3', '14')).toBe('üç virgül on dört');
    expect(decimalWords('0', '05')).toBe('sıfır virgül sıfır beş');
    expect(decimalWords('2', '5', 'nokta')).toBe('iki nokta beş');
  });

  it('Romen rakamları', () => {
    expect(romanValue('XIV')).toBe(14);
    expect(romanValue('XX')).toBe(20);
    expect(romanValue('MCMXXIII')).toBe(1923);
    expect(romanValue('IIII')).toBeNull();
    expect(romanValue('ABC')).toBeNull();
    expect(romanValue('')).toBeNull();
  });
});
