import { describe, expect, it } from 'vitest';
import { bestMatch, infinitive, lookupForm, MAX_CANDIDATES, stemCandidates } from './stem';

describe('lookupForm', () => {
  it('küçük harf, noktalama ve kesme sonrası atılır', () => {
    expect(lookupForm('İstanbul’da,')).toBe('istanbul');
    expect(lookupForm('“Işık”')).toBe('ışık');
  });
});

describe('infinitive', () => {
  it('ünlü uyumuna göre -mak/-mek', () => {
    expect(infinitive('gel')).toBe('gelmek');
    expect(infinitive('oku')).toBe('okumak');
    expect(infinitive('düşün')).toBe('düşünmek');
  });
});

describe('stemCandidates', () => {
  const cases: [string, string][] = [
    ['kitaplarımızdan', 'kitap'],
    ['kitabı', 'kitap'],
    ['evlerde', 'ev'],
    ['kalemler', 'kalem'],
    ['geliyorum', 'gelmek'],
    ['okuyordum', 'okumak'],
    ['yazdı', 'yazmak'],
    ['gidecek', 'gitmek'],
    ['çocukların', 'çocuk'],
    ['ağacın', 'ağaç'],
    ['düşündüğü', 'düşünmek'],
    ['öğretmenler', 'öğretmen'],
    ['sokağa', 'sokak'],
    ['koşarak', 'koşmak'],
    ['bilgisi', 'bilgi'],
    ['anlattı', 'anlatmak'],
  ];
  it.each(cases)('%s → %s aday', (word, root) => {
    const candidates = stemCandidates(word);
    expect(candidates[0]).toBe(word);
    expect(candidates).toContain(root);
    expect(candidates.length).toBeLessThanOrEqual(MAX_CANDIDATES + 1);
  });

  it('çekimsiz kelime yalnızca kendisi ya da az aday', () => {
    expect(stemCandidates('İstanbul’da')).toEqual(['istanbul']);
    expect(stemCandidates('a')).toEqual(['a']);
    expect(stemCandidates('')).toEqual([]);
  });

  it('fiil eki yoksa mastar üretilmez', () => {
    expect(stemCandidates('kalemler')).not.toContain('kalmak');
    expect(stemCandidates('kitaplarımızdan').some((c) => c === 'kitapmak')).toBe(false);
  });

  it('kelime sonunda olamayacak ünsüz çiftleri elenir', () => {
    expect(stemCandidates('anlattı')).not.toContain('anlatt');
    expect(stemCandidates('yazdı')).not.toContain('yazd');
  });
});

describe('bestMatch', () => {
  it('bulunanların en az soyulmuşu', () => {
    expect(bestMatch([{ word: 'kale' }, { word: 'kalem' }])?.word).toBe('kalem');
    expect(bestMatch([{ word: 'yaz' }, { word: 'yazmak' }])?.word).toBe('yazmak');
    expect(bestMatch([{ word: 'ok' }, { word: 'okumak' }])?.word).toBe('okumak');
    expect(bestMatch([])).toBeUndefined();
  });
});
