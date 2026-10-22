import { describe, expect, it } from 'vitest';
import { normalizeForSpeech as n } from './normalize';

describe('normalizeForSpeech', () => {
  it('sayılar, sıra sayıları ve ek almış sayılar', () => {
    expect(n('1923 yılında')).toBe('bin dokuz yüz yirmi üç yılında');
    expect(n('Ali 3. kata çıktı.')).toBe('Ali üçüncü kata çıktı.');
    expect(n("1923'te kuruldu.")).toBe('bin dokuz yüz yirmi üçte kuruldu.');
    expect(n("4'ü 5'e böldü, 2'nci oldu")).toBe('dördü beşe böldü, ikinci oldu');
    expect(n('1.250.000 kişi')).toBe('bir milyon iki yüz elli bin kişi');
    expect(n('3,5 kg un')).toBe('üç virgül beş kilogram un');
    expect(n('-5 derece')).toBe('eksi beş derece');
  });

  it('yıl sonunda nokta cümleyi bitirir, sıra sayısı sanılmaz', () => {
    expect(n('Savaş 1918. Sonra barış geldi.')).toBe('Savaş bin dokuz yüz on sekiz. Sonra barış geldi.');
  });

  it('tarih, saat, yüzde, para, birim', () => {
    expect(n('29.10.1923')).toBe('yirmi dokuz ekim bin dokuz yüz yirmi üç');
    expect(n('Saat 14:30')).toBe('Saat on dört otuz');
    expect(n('09:05')).toBe('dokuz sıfır beş');
    expect(n('%20 indirim')).toBe('yüzde yirmi indirim');
    expect(n('$5 ve 10 TL')).toBe('beş dolar ve on lira');
    expect(n('5 km yürüdü')).toBe('beş kilometre yürüdü');
    expect(n('s. 45')).toBe('sayfa kırk beş');
  });

  it('kısaltmalar: unvan ad öncesinde, sondaki kısaltma cümleyi bitirir', () => {
    expect(n('Dr. Ali geldi')).toBe('doktor Ali geldi');
    expect(n('elma, armut vb. meyveler')).toBe('elma, armut ve benzeri meyveler');
    expect(n('Kalem, defter vb. Sonra')).toBe('Kalem, defter ve benzeri. Sonra');
    expect(n('M.Ö. 300')).toBe('milattan önce üç yüz');
  });

  it('Romen rakamı ve büyük harfli kısaltmalar', () => {
    expect(n('XX. yüzyıl')).toBe('yirminci yüzyıl');
    expect(n('II. Mahmut')).toBe('ikinci Mahmut');
    expect(n('TDK sözlüğü')).toBe('te de ka sözlüğü');
    expect(n("TDK'nın sitesi")).toBe('te de kanın sitesi');
    expect(n('NATO üyesi')).toBe('nato üyesi');
    // Büyük harfli başlıklar kelime olarak kalır
    expect(n('BİRİNCİ BÖLÜM')).toBe('BİRİNCİ BÖLÜM');
  });

  it('noktalama: tırnak atılır, parantez ve tire duraklama olur', () => {
    expect(n("Ankara'da")).toBe('Ankarada');
    expect(n('"Merhaba" dedi, “nasılsın?”')).toBe('Merhaba dedi, nasılsın?');
    expect(n('Savaş (1914-1918) bitti...')).toBe('Savaş, bin dokuz yüz on dört, bin dokuz yüz on sekiz, bitti.');
    expect(n('Kızıl-ötesi — görünmez')).toBe('Kızıl ötesi, görünmez');
    expect(n('a & b')).toBe('a ve b');
  });
});
