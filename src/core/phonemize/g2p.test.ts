import { describe, expect, it } from 'vitest';
import { phonemize, wordPhonemes } from './g2p';

const w = (word: string) => wordPhonemes(word).join('');

describe('wordPhonemes', () => {
  it('ünlüler: açık hecede gergin, kapalı hecede ve sözcük sonunda gevşek', () => {
    expect(w('gümüş')).toBe('ɟymˈøʃ');
    expect(w('biber')).toBe('bibˈɛr');
    expect(w('çocuk')).toBe('tʃodʒˈʊk');
    expect(w('gelen')).toBe('ɟelˈæn'); // e, l/m/n önünde kapalı hecede æ
    expect(w('köprü')).toBe('kœprˈø'); // ünsüzden sonra r (ɾ yalnızca ünlüler arasında)
    expect(w('saat')).toBe('saˈat');
  });

  it('ğ: uzatır, e/i sonrası j, ı sonrası ɯ, aynı ünlüler arasında tek uzun ünlü', () => {
    expect(w('dağ')).toBe('dˈaː');
    expect(w('doğru')).toBe('doːɾˈʊ');
    expect(w('değer')).toBe('dejˈɛr');
    expect(w('çığ')).toBe('tʃˈɯɯ');
    expect(w('olduğu')).toBe('ɔɫdˈʊː');
    expect(w('düğüm')).toBe('dˈøːm');
    expect(w('öğretmen')).toBe('œːɾɛtmˈæn');
  });

  it('ünsüzler: l/ɫ, g/ɟ, r/ɾ, ikiz ünsüzler, şapkalı harfler', () => {
    expect(w('kolay')).toBe('koɫˈaj');
    expect(w('kullanır')).toBe('kʊɫɫanˈɯr');
    expect(w('gitti')).toBe('ɟitːˈɪ');
    expect(w('kâr')).toBe('cˈaːr');
    expect(w('lâzım')).toBe('laːzˈɯm');
    expect(w('bilgisayar')).toBe('bɪlɟisajˈar');
  });

  it('vurgu: son hece; vurgusuz ve ikincil vurgulu kelimeler', () => {
    expect(w('kitaplarımızdan')).toBe('kitapɫaɾɯmɯzdˈan');
    expect(w('ve')).toBe('vɛ');
    expect(w('bu')).toBe('bʊ');
    expect(w('ile')).toBe('ˌilɛ');
    expect(w('veya')).toBe('vejˌa');
  });

  it('vurgu: kendinden önceki heceyi vurgulatan ekler', () => {
    expect(w('cezadır')).toBe('dʒezˈadɯr'); // ek fiil
    expect(w('belirtir')).toBe('belɪrtˈɪr'); // geniş zaman, ek fiil değil
    expect(w('kültür')).toBe('køltˈør');
    expect(w('geliyor')).toBe('ɟelˈijɔr');
    expect(w('gelmiyor')).toBe('ɟˈælmijɔr');
    expect(w('gelmedi')).toBe('ɟˈælmedɪ');
    expect(w('araştırma')).toBe('aɾaʃtɯrmˈa'); // isim-fiil: sonda
    expect(w('gençken')).toBe('ɟˈæntʃcæn');
    expect(w('adıyla')).toBe('adˈɯjɫa');
    expect(w('geleceğim')).toBe('ɟeledʒˈejɪm');
    expect(w('gelmişim')).toBe('ɟælmˈiʃɪm');
  });

  it('vurgu: sözlükteki kelimeler ve kökler', () => {
    expect(w('değildir')).toBe('dˈejɪldɪr');
    expect(w('Ankara')).toBe('ˈankaɾa');
    expect(w('İstanbul')).toBe('ɪstˈanbʊɫ');
    expect(w('ise')).toBe('ˈise');
  });
});

describe('phonemize', () => {
  it('cümle: kelimeler boşlukla, noktalama bitişik', () => {
    expect(phonemize('Saf gümüş kolay paslanmaz.').join('')).toBe('sˈaf ɟymˈøʃ koɫˈaj pasɫanmˈaz.');
    expect(phonemize("Türkiye'de 3. kez!").join('')).toBe('tˈørkijedɛ ytʃøndʒˈø kˈɛz!');
  });

  it('her sembol tek karakter (Piper her karakteri bir fonem sayar)', () => {
    expect(phonemize('Çiçek açtı, değil mi?').every((p) => [...p].length === 1)).toBe(true);
  });
});
