import { describe, expect, it } from 'vitest';
import { answerWord, buildRound, clozeOf, meaningOf, seededRandom, type GameEntry } from './vocabGame';

const base = { known: false, reviews: 0, createdAt: 0 };
const ENTRIES: GameEntry[] = [
  {
    ...base,
    id: 'a',
    word: 'kitapları',
    lemma: 'kitap',
    sentence: 'Raftaki kitapları tek tek okudu.',
    note: 'TDK — kitap\n1. (isim) Ciltli, basılı yaprakların bütünü\n2. (isim) Kutsal kitap',
  },
  {
    ...base,
    id: 'b',
    word: 'kovan',
    sentence: 'Arılar kovana döndü.',
    note: 'Vikisözlük — kovan\n1. (isim, arıcılık) Arıların barınağı',
  },
  { ...base, id: 'c', word: 'tahayyül', sentence: 'Bunu tahayyül bile edemezdi.', note: 'Hayalde canlandırma. Kurgu demektir.' },
  { ...base, id: 'd', word: 'müstesna', sentence: '"Müstesna bir gün," dedi.', note: 'Ayrık, benzerlerinden ayrı tutulan' },
  { ...base, id: 'e', word: 'dans', sentence: 'Sallanma dansı adı verilir.' },
];

describe('meaningOf', () => {
  it('sözlük notunda ilk anlam, etiketsiz; serbest notta ilk cümle', () => {
    expect(meaningOf(ENTRIES[0])).toBe('Ciltli, basılı yaprakların bütünü');
    expect(meaningOf(ENTRIES[1])).toBe('Arıların barınağı');
    expect(meaningOf(ENTRIES[2])).toBe('Hayalde canlandırma.');
    expect(meaningOf(ENTRIES[4])).toBeNull();
  });

  it('kelime anlamın içinde geçiyorsa gizlenir', () => {
    expect(meaningOf({ word: 'kitap', note: 'TDK — kitap\n1. (din) Kutsal kitap' })).toBe('Kutsal …');
  });
});

describe('clozeOf', () => {
  it('çekimli hâli de boşluğa çevrilir, noktalama kalır', () => {
    expect(clozeOf(ENTRIES[0])).toBe('Raftaki _____ tek tek okudu.');
    expect(clozeOf(ENTRIES[1])).toBe('Arılar _____ döndü.');
    expect(clozeOf(ENTRIES[3])).toBe('"_____ bir gün," dedi.');
    expect(clozeOf(ENTRIES[4])).toBe('Sallanma _____ adı verilir.');
  });

  it('cümlede yoksa null', () => {
    expect(clozeOf({ word: 'kalem', sentence: 'Hiç ilgisi yok.' })).toBeNull();
  });

  it('şıkta madde başı (küçük harf)', () => {
    expect(answerWord(ENTRIES[0])).toBe('kitap');
    expect(answerWord({ word: 'Müstesna' })).toBe('müstesna');
  });
});

describe('buildRound', () => {
  it('her soruda 4 farklı şık, doğru cevap yerinde; türler karışık', () => {
    const round = buildRound(ENTRIES, { now: 1, random: seededRandom(7) });
    expect(round.length).toBe(5);
    for (const question of round) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      const entry = ENTRIES.find((item) => item.id === question.entryId)!;
      const correct = question.kind === 'meaning' ? meaningOf(entry) : answerWord(entry);
      expect(question.options[question.answer]).toBe(correct);
      if (question.kind === 'cloze') expect(question.prompt).toContain('_____');
      else expect(question.prompt).toBe(entry.word);
    }
    expect(new Set(round.map((question) => question.kind)).size).toBe(2);
  });

  it('aynı tohumla aynı tur; 4 kelimeden azsa tur yok', () => {
    const a = buildRound(ENTRIES, { now: 1, random: seededRandom(3) });
    const b = buildRound(ENTRIES, { now: 1, random: seededRandom(3) });
    expect(a).toEqual(b);
    expect(buildRound(ENTRIES.slice(0, 3))).toEqual([]);
  });

  it('tekrar zamanı gelmiş ve bilinmeyen önce sorulur', () => {
    const day = 24 * 60 * 60 * 1000;
    const entries = ENTRIES.map((entry) =>
      entry.id === 'd' ? entry : { ...entry, known: true, reviews: 3, lastReviewAt: 10 * day }
    );
    const round = buildRound(entries, { now: 10 * day + 1, random: seededRandom(1) });
    expect(round[0].entryId).toBe('d');
  });
});
