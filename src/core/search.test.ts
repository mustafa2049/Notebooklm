import { describe, expect, it } from 'vitest';
import { createSearchIndex, excerptAt, MAX_HITS, normalizeForSearch, searchText } from './search';

const find = (text: string, query: string, max?: number) =>
  searchText(createSearchIndex(text), query, max);

describe('normalizeForSearch', () => {
  it('boşlukları tek boşluğa indirip özgün konumları tutuyor', () => {
    const { text, offsets } = normalizeForSearch('  Bir\n\n  İki');
    expect(text).toBe('bir iki');
    expect(offsets[0]).toBe(2);
    expect(offsets[4]).toBe(9); // "İ"
  });

  it('Türkçe küçültme: I → ı, İ → i', () => {
    expect(normalizeForSearch('IŞIK İNCE').text).toBe('ışık ince');
  });
});

describe('searchText', () => {
  it('büyük/küçük harfe duyarsız, konumlar özgün metinde', () => {
    const text = 'Öğretmen geldi. Sonra ÖĞRETMEN gitti.';
    const result = find(text, 'öğretmen');
    expect(result.total).toBe(2);
    expect(result.hits.map((hit) => text.slice(hit.start, hit.end))).toEqual(['Öğretmen', 'ÖĞRETMEN']);
  });

  it('Türkçe harfsiz yazım şapkalı/noktalı harfleri de buluyor', () => {
    const text = 'Öğretmenler gün boyu çalıştı; kâğıt bitti.';
    expect(find(text, 'ogretmen').total).toBe(1);
    expect(find(text, 'calisti').total).toBe(1);
    expect(find(text, 'kagit').total).toBe(1);
    // Büyük harfle, noktasız I ile yazılmış arama da
    expect(find('Kitap okudum.', 'KITAP').total).toBe(1);
  });

  it('Türkçe harf varsa yazıldığı gibi arıyor', () => {
    expect(find('ilik bir su', 'ılık').total).toBe(0);
    expect(find('ılık bir su', 'ılık').total).toBe(1);
    expect(find('İstanbul ve istanbul', 'İSTANBUL').total).toBe(2);
  });

  it('satır sonu ve çift boşluk farkını yok sayıyor', () => {
    const text = 'Çok güzel\n  bir gün.';
    const [hit] = find(text, 'güzel bir').hits;
    expect(text.slice(hit.start, hit.end)).toBe('güzel\n  bir');
    expect(hit.match).toBe('güzel bir');
  });

  it('çok kısa aramayı yapmıyor', () => {
    expect(find('a b c', 'a')).toEqual({ hits: [], total: 0 });
    expect(find('a b c', '   ')).toEqual({ hits: [], total: 0 });
  });

  it('en çok MAX_HITS sonuç listeliyor ama hepsini sayıyor', () => {
    const text = 'kedi '.repeat(MAX_HITS + 50);
    const result = find(text, 'kedi');
    expect(result.total).toBe(MAX_HITS + 50);
    expect(result.hits).toHaveLength(MAX_HITS);
    expect(find(text, 'kedi', 5).hits).toHaveLength(5);
  });

  it('eşleşmeler örtüşmüyor', () => {
    expect(find('aaaa', 'aa').total).toBe(2);
  });

  it('bağlamı kelime sınırında kesip "…" ekliyor', () => {
    const text =
      'Birinci cümle burada uzayıp gidiyor ve bitmek bilmiyor. Aradığımız söz tam burada geçiyor, ardından yine uzun bir kuyruk geliyor.';
    const [hit] = find(text, 'söz').hits;
    expect(hit.match).toBe('söz');
    expect(hit.before.startsWith('…')).toBe(true);
    expect(hit.before.endsWith('Aradığımız ')).toBe(true);
    expect(hit.after.startsWith(' tam burada')).toBe(true);
    expect(hit.after.endsWith('…')).toBe(true);
    // Kelime ortasından başlamıyor/bitmiyor
    const firstWord = hit.before.slice(1).split(' ')[0];
    expect(text).toContain(` ${firstWord} `);
  });

  it('metnin başında ve sonunda "…" yok', () => {
    const [hit] = find('Kısa metin.', 'metin').hits;
    expect(hit.before).toBe('Kısa ');
    expect(hit.after).toBe('.');
  });

  it('aynı dizinle tekrar tekrar aranabiliyor', () => {
    const index = createSearchIndex('Ağaç, ağaç ve agac.');
    expect(searchText(index, 'ağaç').total).toBe(2);
    expect(searchText(index, 'agac').total).toBe(3);
    expect(searchText(index, 'ağaç').total).toBe(2);
  });
});

describe('excerptAt', () => {
  const text = 'Birinci paragraf.\n\nİkinci paragraf uzun bir cümleyle başlıyor ve sürüp gidiyor da gidiyor.';

  it('konumdaki ilk kelimeleri boşlukları sadeleştirip veriyor', () => {
    expect(excerptAt(text, 0, 200)).toBe(
      'Birinci paragraf. İkinci paragraf uzun bir cümleyle başlıyor ve sürüp gidiyor da gidiyor.'
    );
  });

  it('kelime ortasındaki konumu kelimenin başına çekiyor', () => {
    expect(excerptAt(text, text.indexOf('kinci'), 200).startsWith('İkinci')).toBe(true);
  });

  it('uzunsa kelime sınırında kesip "…" ekliyor', () => {
    const excerpt = excerptAt(text, text.indexOf('İkinci'), 30);
    expect(excerpt).toBe('İkinci paragraf uzun bir…');
    expect(excerpt.length).toBeLessThanOrEqual(31);
  });

  it('metnin sonunda boş ya da kısa dönüyor', () => {
    expect(excerptAt(text, text.length)).toBe('gidiyor.');
    expect(excerptAt('', 0)).toBe('');
  });
});
