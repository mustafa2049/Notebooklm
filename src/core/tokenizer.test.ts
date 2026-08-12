import { describe, expect, it } from 'vitest';
import { countSentences, tokenize } from './tokenizer';

describe('tokenize — Türkçe cümle bölme', () => {
  it('kısaltmalardan sonra cümleyi bölmez', () => {
    const tokens = tokenize('Dr. Ahmet vb. şeyler aldı. Sonra gitti.');
    expect(countSentences(tokens)).toBe(2);

    const first = tokens.filter((t) => t.sentenceIndex === 0).map((t) => t.text);
    expect(first).toEqual(['Dr.', 'Ahmet', 'vb.', 'şeyler', 'aldı.']);
  });

  it('ondalık sayı, tarih ve sıra sayısında bölmez', () => {
    const tokens = tokenize('Pi sayısı 3.14 olarak alınır ve 12.08.2026 tarihinde ölçüldü. Bitti.');
    expect(countSentences(tokens)).toBe(2);
  });

  it('tek harflik baş harfte bölmez', () => {
    const tokens = tokenize('M. Kemal geldi. Sonra oturdu.');
    expect(countSentences(tokens)).toBe(2);
  });

  it('sonraki kelime küçük harfle başlıyorsa bölmez (sözlükte olmayan kısaltma)', () => {
    const tokens = tokenize('Zzz. bilinmeyen bir kısaltmadır. Doğru bölündü.');
    expect(countSentences(tokens)).toBe(2);
  });

  it('soru ve ünlem işareti her zaman cümleyi bitirir', () => {
    const tokens = tokenize('Geldi mi? Evet! Tamam.');
    expect(countSentences(tokens)).toBe(3);
  });

  it('kapatma tırnağından sonraki noktayı görür', () => {
    const tokens = tokenize('Adam "merhaba" dedi. Sonra sustu.');
    expect(countSentences(tokens)).toBe(2);
  });

  it('sert satır kaydırmayı cümle sonu sanmaz', () => {
    const wrapped = 'Bu cümle iki satıra\nbölünmüş hâlde yazıldı ve devam ediyor.';
    expect(countSentences(tokenize(wrapped))).toBe(1);
  });

  it('boş satırı paragraf sonu olarak işaretler', () => {
    const tokens = tokenize('Birinci paragraf burada\n\nİkinci paragraf burada');
    const paragraphs = tokens[tokens.length - 1].paragraphIndex + 1;
    expect(paragraphs).toBe(2);
    expect(tokens.find((t) => t.text === 'burada')?.paragraphEnd).toBe(true);
  });

  it('karakter offsetleri kaynak metinle bire bir eşleşir', () => {
    const source = 'Hızlı okuma çalışması.';
    for (const token of tokenize(source)) {
      expect(source.slice(token.start, token.end)).toBe(token.text);
    }
  });

  it('virgül ve rakamları işaretler', () => {
    const tokens = tokenize('Sabah 7 kalktı, sonra koştu.');
    expect(tokens.find((t) => t.text === '7')?.hasDigit).toBe(true);
    expect(tokens.find((t) => t.text === 'kalktı,')?.minorPause).toBe(true);
  });

  it('Türkçe büyük I harfini doğru küçültüp kısaltmayı tanır', () => {
    // "VB." büyük harfle yazıldığında da kısaltma sayılmalı
    const tokens = tokenize('Elma armut VB. şeyler aldı. Bitti.');
    expect(countSentences(tokens)).toBe(2);
  });
});
