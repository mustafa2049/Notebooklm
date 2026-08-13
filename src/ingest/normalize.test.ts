import { describe, expect, it } from 'vitest';
import { countWordsInText, joinChapters, normalizeText } from './normalize';
import { countSentences, tokenize } from '@/core/tokenizer';

describe('normalizeText', () => {
  it('sert satır kaydırmayı geri alır', () => {
    const wrapped = [
      'Hızlı okuma, göz hareketlerini azaltarak okuma hızını yükselten bir',
      'yöntemler kümesidir. Okuyucuların çoğu kelimeleri içlerinden',
      'seslendirdiği için gereksiz yavaşlar ve bu alışkanlık kırılabilir.',
    ].join('\n');

    const result = normalizeText(wrapped);
    expect(result).not.toContain('\n');
    expect(result).toContain('bir yöntemler');
  });

  it('boş satırla ayrılmış paragrafları korur', () => {
    const text = [
      'Birinci paragrafın ilk satırı burada yazıyor ve biraz uzun sürüyor',
      'çünkü sert satır kaydırma kullanılmış durumda görünüyor bu metinde.',
      '',
      'İkinci paragraf ise buradan başlıyor ve kendi başına duruyor bak',
      'işte böyle devam ediyor ikinci paragrafın gövdesi de uzun uzun.',
    ].join('\n');

    const result = normalizeText(text);
    expect(result.split('\n\n')).toHaveLength(2);
  });

  it('kısa satırı (başlık) kendi paragrafı yapar', () => {
    const text = [
      'Birinci Bölüm',
      'Bu bölümün gövdesi sert satır kaydırma ile yazılmış durumda olduğu',
      'için satırlar yaklaşık aynı uzunlukta ve noktalamasız bitiyor ki',
      'üçüncü satır da benzer şekilde devam ediyor ve böylece sürüyor.',
    ].join('\n');

    const result = normalizeText(text);
    const paragraphs = result.split('\n\n');
    expect(paragraphs[0]).toBe('Birinci Bölüm');
    expect(paragraphs).toHaveLength(2);
  });

  it('satır sonu hecelemesini birleştirir (PDF çıktısı)', () => {
    expect(normalizeText('okuma alış-\nkanlığı önemli')).toContain('alışkanlığı');
  });

  it('görünmez karakterleri ve fazla boşlukları temizler', () => {
    const messy = '﻿başta   çok boşluk​ var\r\n\r\n\r\n\r\nsonra';
    const result = normalizeText(messy);
    expect(result).not.toContain('﻿');
    expect(result).not.toContain('​');
    expect(result).not.toMatch(/ {2}/);
    expect(result).not.toMatch(/\n{3}/);
  });

  it('normalleştirilmiş metinde cümle sayısı doğru çıkar', () => {
    // Normalleştirme olmadan her satır sonu paragraf sanılırdı
    const wrapped = [
      'Bu uzun bir cümledir ve satır ortasında kırılmış hâlde duruyor ama',
      'aslında tek bir cümle olarak devam ediyor ve burada bitiyor.',
      'İkinci cümle de benzer şekilde iki satıra bölünmüş hâlde yazılmış',
      'durumda ve okunduğunda tek cümle olarak algılanması gerekiyor.',
    ].join('\n');

    expect(countSentences(tokenize(normalizeText(wrapped)))).toBe(2);
  });

  it('zaten paragraf hâlindeki metni bozmaz', () => {
    const text =
      'Bu tek bir uzun paragraf. İçinde birkaç cümle var ve satır kaydırma yok.\n\nİkinci paragraf.';
    expect(normalizeText(text)).toBe(text);
  });
});

describe('countWordsInText', () => {
  it('kelime sayar', () => {
    expect(countWordsInText('  bir   iki üç  ')).toBe(3);
    expect(countWordsInText('')).toBe(0);
  });
});

describe('joinChapters', () => {
  it('bölüm konumlarını birleştirilmiş metne göre verir', () => {
    const joined = joinChapters([
      { title: 'Giriş', text: 'Birinci bölüm metni.' },
      { title: 'Gelişme', text: 'İkinci bölüm metni.' },
    ]);

    expect(joined.chapters[0].charOffset).toBe(0);
    expect(joined.text.slice(joined.chapters[1].charOffset)).toBe('İkinci bölüm metni.');
  });

  it('boş bölümleri atar ve konumları kaydırmaz', () => {
    const joined = joinChapters([
      { title: 'Boş', text: '   ' },
      { title: 'Dolu', text: 'Metin burada.' },
    ]);

    expect(joined.chapters).toHaveLength(1);
    expect(joined.chapters[0]).toEqual({ title: 'Dolu', charOffset: 0 });
    expect(joined.text).toBe('Metin burada.');
  });

  it('sert sarmalanmış bölümde de konum doğru kalır', () => {
    // Normalleştirme satırları birleştirip metni kısaltıyor; konum bundan sonra
    // hesaplandığı için ikinci bölüm hâlâ tam yerinden başlıyor
    const wrapped = 'Bu satır burada\nkırılmış ve devam ediyor\nüçüncü satırla.';
    const joined = joinChapters([
      { title: 'Bir', text: wrapped },
      { title: 'İki', text: 'İkinci bölümün ilk cümlesi.' },
    ]);

    expect(joined.text.slice(joined.chapters[1].charOffset)).toBe('İkinci bölümün ilk cümlesi.');
  });
});
