import { describe, expect, it } from 'vitest';
import { candidateSentences, corpusLine, coverageUnits, selectCorpus, type Candidate } from './corpus';

describe('candidateSentences', () => {
  it('uygun uzunlukta, yalnız Türkçe harfli cümleler; sayılar kelimeyle', () => {
    const text =
      'Ali eve geldi. Kısa. 1923 yılında yeni bir devlet kuruldu ve herkes sevindi! ' +
      'TDK sözlüğünde bu kelime yok gibi görünüyor. Bu cümlede www adresi var ama okunmaz.\nNeden bu kadar geç kaldın bugün?';
    const result = candidateSentences(text, 'deneme').map((c) => c.text);
    expect(result).toEqual([
      'bin dokuz yüz yirmi üç yılında yeni bir devlet kuruldu ve herkes sevindi!',
      // Kısaltma harf harf okunur ("te de ka"); www (yabancı harf) elenir
      'te de ka sözlüğünde bu kelime yok gibi görünüyor.',
      'Neden bu kadar geç kaldın bugün?',
    ]);
  });

  it('fonemler çözümleyiciden', () => {
    const [candidate] = candidateSentences('Saf gümüş kolay paslanmaz.', 'deneme');
    expect(candidate.phonemes.join('')).toBe('sˈaf ɟymˈøʃ koɫˈaj pasɫanmˈaz.');
  });
});

describe('coverageUnits / selectCorpus', () => {
  it('vurgusuz fonem ikilileri', () => {
    expect([...coverageUnits(['a', 'ˈ', 'b', ' ', 'c'])]).toEqual(['ab', 'b ', ' c']);
  });

  const make = (text: string, phonemes: string): Candidate => ({ text, phonemes: [...phonemes], source: 't' });

  it('önce en çok yeni ikili getiren; aynı metin bir kez; sayıyla sınırlı', () => {
    const pool = [
      make('bir iki üç dört.', 'abab'),
      make('Bir iki üç dört.', 'abab'),
      make('beş altı yedi sekiz.', 'abcdef'),
      make('dokuz on on bir on iki.', 'efgh'),
    ];
    const chosen = selectCorpus(pool, 3).map((c) => c.text);
    expect(chosen[0]).toBe('beş altı yedi sekiz.');
    expect(chosen).toHaveLength(3);
    expect(new Set(chosen.map((t) => t.toLowerCase())).size).toBe(3);
    expect(selectCorpus(pool, 10)).toHaveLength(3);
  });

  it('satır biçimi', () => {
    expect(corpusLine(0, make('Saf.', 'saf.'))).toBe('c0001\tSaf.\tsaf.');
  });
});
