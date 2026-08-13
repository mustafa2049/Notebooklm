import { describe, expect, it } from 'vitest';
import { pagesToDocument, type PdfTextItem } from './pdfText';
import { NoTextLayerError } from './types';

function line(text: string, y: number): PdfTextItem[] {
  return [{ str: text, hasEOL: true, y }];
}

describe('pagesToDocument', () => {
  it('satır sonlarını birleştirip paragrafı korur', () => {
    // 12 birim aralık normal satır, 40 birim aralık paragraf sonu.
    // Örnek gerçekçi tutuluyor: sert sarmalanmış metinde satırların çoğu
    // noktalamasız bitiyor — `normalizeText` bunları buna bakarak birleştiriyor.
    const items: PdfTextItem[] = [
      ...line('Birinci satır burada devam ediyor', 700),
      ...line('ve ikinci satır da bitmiyor, sonra', 688),
      ...line('üçüncü satır geliyor ve arkasından', 676),
      ...line('dördüncü satırda cümle tamamlanıyor.', 664),
      ...line('Yeni paragraf buradan başlıyor ve o da', 624),
      ...line('birkaç satır sürüyor, sonunda bitiyor.', 612),
    ];

    const doc = pagesToDocument({ pages: [items] });

    expect(doc.text).toContain('Birinci satır burada devam ediyor ve ikinci satır da bitmiyor');
    expect(doc.text).toContain('\n\nYeni paragraf buradan başlıyor');
  });

  it('başlığı geçirir', () => {
    const doc = pagesToDocument({
      pages: [line('Yeterince uzun bir metin buraya yazılmıştır ki eşik aşılsın.', 700)],
      title: 'Belge Adı',
    });
    expect(doc.title).toBe('Belge Adı');
  });

  it('metin katmanı yoksa açık hata verir', () => {
    // Taranmış PDF: sayfalar var ama neredeyse hiç karakter yok
    expect(() =>
      pagesToDocument({ pages: [line('a', 700), line('b', 680), line('c', 660)] })
    ).toThrow(NoTextLayerError);
  });

  it('sayfaları paragraf boşluğuyla birleştirir', () => {
    const doc = pagesToDocument({
      pages: [
        line('Birinci sayfanın yeterince uzun tek cümlesi burada.', 700),
        line('İkinci sayfanın yeterince uzun tek cümlesi burada.', 700),
      ],
    });
    expect(doc.text.split('\n\n')).toHaveLength(2);
  });

  it('dikey konum bilgisi olmayan öğelerde çökmez', () => {
    const doc = pagesToDocument({
      pages: [
        [
          { str: 'Konumsuz ama yeterince uzun bir satır', hasEOL: true, y: null },
          { str: 'ikinci satır da konumsuz geldi.', hasEOL: true, y: null },
        ],
      ],
    });
    expect(doc.text).toContain('Konumsuz ama yeterince uzun bir satır');
  });
});
