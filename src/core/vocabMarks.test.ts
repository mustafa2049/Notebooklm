import { describe, expect, it } from 'vitest';
import { SOFT_HYPHEN, typeset } from './typeset';
import { coreRanges, findVocabEntry, isVocabWord, vocabIndex } from './vocabMarks';

describe('isVocabWord', () => {
  it('kayıtlı biçim ve madde başının çekimleri', () => {
    const index = vocabIndex([{ word: 'kitabı', lemma: 'kitap' }]);
    expect(isVocabWord(index, 'kitabı')).toBe(true);
    expect(isVocabWord(index, 'kitap')).toBe(true);
    expect(isVocabWord(index, 'Kitaplarımızdan')).toBe(true);
    expect(isVocabWord(index, '"kitabını,"')).toBe(true);
    expect(isVocabWord(index, 'kitle')).toBe(false);
    expect(isVocabWord(index, 'kira')).toBe(false);
  });

  it('fiil: mastar madde başı, yalnızca fiil ekiyle', () => {
    const index = vocabIndex([{ word: 'geliyorum', lemma: 'gelmek' }]);
    expect(isVocabWord(index, 'geldi')).toBe(true);
    expect(isVocabWord(index, 'gelecek')).toBe(true);
    expect(isVocabWord(index, 'geliyorum')).toBe(true);
    // "gelin" ad: fiil eki soyulmadan mastar adayı çıkmaz
    expect(isVocabWord(index, 'gelin')).toBe(false);
  });

  it('kısa kökler yalnızca aynen; madde başı yoksa kayıtlı biçim kök sayılır', () => {
    const short = vocabIndex([{ word: 'el', lemma: 'el' }, { word: 'yön' }, { word: 'almak' }]);
    expect(isVocabWord(short, 'el')).toBe(true);
    expect(isVocabWord(short, 'elma')).toBe(false);
    expect(isVocabWord(short, 'eller')).toBe(false);
    expect(isVocabWord(short, 'yön')).toBe(true);
    // "yön-te-m-dir" diye soyulabiliyor: üç harflik ad kökten eşleşmez
    expect(isVocabWord(short, 'yöntemdir')).toBe(false);
    expect(isVocabWord(short, 'almak')).toBe(true);
    expect(isVocabWord(short, 'alma')).toBe(false);

    const noLemma = vocabIndex([{ word: 'Kâğıt' }]);
    expect(isVocabWord(noLemma, 'kağıdı')).toBe(true);
    expect(isVocabWord(noLemma, 'kâğıtlar')).toBe(true);
    expect(isVocabWord(noLemma, 'kağan')).toBe(false);
  });

  it('boş defter, boş kelime, çok kelimelik madde başı', () => {
    expect(isVocabWord(vocabIndex([]), 'kitap')).toBe(false);
    const index = vocabIndex([{ word: 'kovan', lemma: 'arı kovanı' }]);
    expect(isVocabWord(index, '—')).toBe(false);
    expect(isVocabWord(index, 'kovanlar')).toBe(true);
    expect(isVocabWord(index, 'arı')).toBe(false);
  });

  it('sonuç önbellekte', () => {
    const index = vocabIndex([{ word: 'kitap' }]);
    isVocabWord(index, 'Kitaplar');
    expect(index.cache.get('kitaplar')).toBe(true);
  });
});

describe('findVocabEntry', () => {
  const entries = [
    { word: 'kitabı', lemma: 'kitap', note: 'yazılı eser' },
    { word: 'gelmek' },
    { word: 'kitaplık' },
  ];
  it('önce aynı biçim, sonra kökten', () => {
    expect(findVocabEntry(entries, 'kitaplık')).toBe(entries[2]);
    expect(findVocabEntry(entries, 'kitaplar')).toBe(entries[0]);
    expect(findVocabEntry(entries, 'Geldim.')).toBe(entries[1]);
    expect(findVocabEntry(entries, 'masa')).toBeUndefined();
    expect(findVocabEntry(entries, '…')).toBeUndefined();
  });
});

describe('coreRanges', () => {
  const tokens = (text: string) =>
    text.split(' ').map((item) => ({ text: item, core: item.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '') }));

  it('noktalama çizginin dışında', () => {
    const display = 'Bir "kitabı," aldım.';
    const ranges = coreRanges(display, tokens(display), (core) => core === 'kitabı');
    expect(ranges).toEqual([[5, 11]]);
    expect(display.slice(5, 11)).toBe('kitabı');
  });

  it('heceleme ve geniş aralıkla çizilmiş metinde, baştaki boşlukla', () => {
    const text = 'Kitaplarımızdan biri';
    const display = typeset(` ${text}`, { hyphenate: true, extraWordSpace: 1 });
    expect(display).toContain(SOFT_HYPHEN);
    const ranges = coreRanges(display, tokens(text), (core) => core.length > 4);
    expect(ranges).toHaveLength(1);
    const [start, end] = ranges[0];
    expect(display.slice(start, end).split(SOFT_HYPHEN).join('')).toBe('Kitaplarımızdan');
    expect(display[start - 1]).toBe(' ');
  });

  it('birden çok kelime; çekirdeksiz token atlanır; uyuşmayan metinde işaret yok', () => {
    const display = 'Elma — elma';
    expect(coreRanges(display, tokens(display), (core) => core.toLowerCase() === 'elma')).toEqual([
      [0, 4],
      [7, 11],
    ]);
    expect(coreRanges('Başka metin', tokens('Elma armut'), () => true)).toEqual([]);
  });
});
