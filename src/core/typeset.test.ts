import { describe, expect, it } from 'vitest';
import { SAMPLE_PARAGRAPH } from './pages';
import { hyphenateWord, SOFT_HYPHEN, THIN_SPACE, typeset, untypeset } from './typeset';

const show = (text: string) => text.replaceAll(SOFT_HYPHEN, '-').replaceAll(THIN_SPACE, '_');

describe('hyphenateWord', () => {
  it('hece sınırlarına yumuşak tire koyuyor', () => {
    expect(show(hyphenateWord('kitaplarımızdan'))).toBe('ki-tap-la-rı-mız-dan');
    // Baştaki tek harflik hece ("e-") ayrılmıyor
    expect(show(hyphenateWord('elektrikçi'))).toBe('elekt-rik-çi');
  });

  it('kelimenin başında ya da sonunda tek harf bırakmıyor', () => {
    expect(show(hyphenateWord('arabalar'))).toBe('ara-ba-lar');
    expect(show(hyphenateWord('okulda'))).toBe('okul-da');
    expect(show(hyphenateWord('okula'))).toBe('oku-la');
  });

  it('kısa kelimeyi ve büyük harfli kısaltmayı bölmüyor', () => {
    expect(hyphenateWord('kitap')).toBe('ki' + SOFT_HYPHEN + 'tap');
    expect(hyphenateWord('saat')).toBe('saat');
    expect(hyphenateWord('ANKARA')).toBe('ANKARA');
    expect(hyphenateWord('Ankara')).toBe('An' + SOFT_HYPHEN + 'ka' + SOFT_HYPHEN + 'ra');
  });
});

describe('typeset', () => {
  const none = { hyphenate: false, extraWordSpace: 0 };

  it('seçenek yoksa metne dokunmuyor', () => {
    expect(typeset(SAMPLE_PARAGRAPH, none)).toBe(SAMPLE_PARAGRAPH);
  });

  it('kesme işareti ve noktalamayla bölünen kelimelerde yalnızca harfleri heceliyor', () => {
    expect(show(typeset("İstanbul'a, 2024'te gittim.", { ...none, hyphenate: true }))).toBe(
      "İs-tan-bul'a, 2024'te git-tim."
    );
  });

  it('kelime aralığını ince boşlukla, boşluktan önce genişletiyor', () => {
    expect(show(typeset('bir iki üç', { ...none, extraWordSpace: 1 }))).toBe('bir_ iki_ üç');
    expect(show(typeset('bir iki', { ...none, extraWordSpace: 2 }))).toBe('bir__ iki');
    // Satır sonu ve paragraf korunuyor
    expect(typeset('bir\niki', { ...none, extraWordSpace: 1 })).toBe('bir\niki');
  });

  it('geri alınınca özgün metin çıkıyor', () => {
    const options = { hyphenate: true, extraWordSpace: 2 };
    expect(untypeset(typeset(SAMPLE_PARAGRAPH, options))).toBe(SAMPLE_PARAGRAPH);
  });
});
