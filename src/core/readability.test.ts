import { describe, expect, it } from 'vitest';
import { readability, readabilityBand, syllableCount } from './readability';

describe('syllableCount', () => {
  it('Türkçe kelimenin hece sayısını verir', () => {
    expect(syllableCount('kitaplarımızdan')).toBe(6);
    expect(syllableCount('okul')).toBe(2);
    expect(syllableCount('İstanbul')).toBe(3);
  });

  it('sesli harfsiz kelimeyi bir hece sayar', () => {
    expect(syllableCount('TBMM')).toBe(1);
    expect(syllableCount('2024')).toBe(1);
  });
});

describe('readability (Ateşman)', () => {
  it('formülü elle hesaplanan değerle aynı uygular', () => {
    // 2 cümle, 6 kelime, 12 hece → 198,825 − 40,175×2 − 2,61×3
    const result = readability('Ali okula gitti. Ayşe ev aldı.');
    expect(result.words).toBe(6);
    expect(result.sentences).toBe(2);
    expect(result.syllablesPerWord).toBeCloseTo(12 / 6, 6);
    expect(result.score).toBeCloseTo(198.825 - 40.175 * 2 - 2.61 * 3, 6);
  });

  it('uzun cümleler ve uzun kelimeler puanı düşürür', () => {
    const short = readability('Kedi uyudu. Köpek koştu. Kuş uçtu.');
    const long = readability(
      'Uluslararası değerlendirmelerin sonuçlarını karşılaştırmalı biçimde inceleyen araştırmacılar, öğrencilerin okuduğunu anlama becerilerindeki farklılıkları sosyoekonomik değişkenlerle ilişkilendirmeye çalışmaktadırlar.'
    );
    expect(short.score).toBeGreaterThan(long.score);
  });

  it('boş metinde sıfır döner', () => {
    expect(readability('   ').score).toBe(0);
  });
});

describe('readabilityBand', () => {
  it('Ateşman bantlarını uygular', () => {
    expect(readabilityBand(95)).toBe('çok kolay');
    expect(readabilityBand(75)).toBe('kolay');
    expect(readabilityBand(60)).toBe('orta');
    expect(readabilityBand(40)).toBe('zor');
    expect(readabilityBand(10)).toBe('çok zor');
  });
});
