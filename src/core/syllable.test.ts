import { describe, expect, it } from 'vitest';
import { bionicPrefixLength, splitLongWord, syllabify } from './syllable';

describe('syllabify — Türkçe heceleme', () => {
  it.each([
    ['kitaplarımızdan', ['ki', 'tap', 'la', 'rı', 'mız', 'dan']],
    ['elektrik', ['e', 'lekt', 'rik']],
    ['kartal', ['kar', 'tal']],
    ['saat', ['sa', 'at']],
    ['Türkçe', ['Türk', 'çe']],
    ['korkmak', ['kork', 'mak']],
    ['okul', ['o', 'kul']],
    ['ağaç', ['a', 'ğaç']],
    ['sırtlan', ['sırt', 'lan']],
    ['bilgisayarlaşma', ['bil', 'gi', 'sa', 'yar', 'laş', 'ma']],
  ])('%s → %s', (word, expected) => {
    expect(syllabify(word)).toEqual(expected);
  });

  it('tek heceli ve seslisiz kelimeleri bölmez', () => {
    expect(syllabify('at')).toEqual(['at']);
    expect(syllabify('TRT')).toEqual(['TRT']);
    expect(syllabify('')).toEqual(['']);
  });

  it('heceleri birleştirerek kelimeyi kayıpsız geri verir', () => {
    for (const word of ['kitaplarımızdan', 'elektrikliğinden', 'gözlemleyebileceğimizi']) {
      expect(syllabify(word).join('')).toBe(word);
    }
  });
});

describe('splitLongWord', () => {
  it('kısa kelimeyi bölmez', () => {
    expect(splitLongWord('kitap', 14)).toEqual(['kitap']);
  });

  it('uzun kelimeyi hece sınırından, sınırı aşmayacak parçalara böler', () => {
    const parts = splitLongWord('gözlemleyebileceğimizi', 14);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join('')).toBe('gözlemleyebileceğimizi');
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(14);
  });

  it('sesli harf içermeyen uzun diziyi olduğu gibi bırakır', () => {
    // Heceleme sesli harfe dayanır; sesli yoksa bölmek anlamsız olur
    expect(splitLongWord('BCDFGHJKLMNPRSTVYZ', 14)).toEqual(['BCDFGHJKLMNPRSTVYZ']);
  });
});

describe('bionicPrefixLength', () => {
  it('kısa kelimelerde tek harf kalınlaştırır', () => {
    expect(bionicPrefixLength('ve', 0.4)).toBe(1);
    expect(bionicPrefixLength('bir', 0.4)).toBe(1);
  });

  it('kelimenin tamamını kalınlaştırmaz', () => {
    for (const word of ['okumak', 'hızlı', 'anlama', 'kitaplarımızdan']) {
      const n = bionicPrefixLength(word, 0.4);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThan(word.length);
    }
  });

  it('oran arttıkça kalın bölüm uzar', () => {
    expect(bionicPrefixLength('bilgisayar', 0.6)).toBeGreaterThan(
      bionicPrefixLength('bilgisayar', 0.3)
    );
  });
});
