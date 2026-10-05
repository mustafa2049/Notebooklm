import { describe, expect, it } from 'vitest';
import { PASSAGES } from '@/content/passages';
import { tokenize } from '@/core/tokenizer';
import { seededRng } from '../shuffle';
import {
  FLASH_START,
  makeFlashTrial,
  MAX_SPAN,
  MIN_DURATION_MS,
  nextFlashLevel,
  phrasePool,
  type FlashLevel,
} from './flash';
import { answerTokenRanges, isScanHit, previewOfText } from './reading';
import { createSchulte, tapSchulte } from './schulte';

describe('Schulte', () => {
  it('1…n² sayılarını bir kez içerir', () => {
    const state = createSchulte(5, seededRng(1));
    expect([...state.cells].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it('sırayla dokununca biter, yanlış dokunuş hata sayar', () => {
    let state = createSchulte(3, seededRng(2));
    state = tapSchulte(state, 2);
    expect(state.errors).toBe(1);
    for (let n = 1; n <= 9; n++) state = tapSchulte(state, n);
    expect(state.done).toBe(true);
    expect(state.errors).toBe(1);
  });
});

describe('flaş merdiveni', () => {
  it('iki doğruda zorlaşır (süre kısalır)', () => {
    let level = FLASH_START;
    level = nextFlashLevel(level, true);
    expect(level.durationMs).toBe(300);
    level = nextFlashLevel(level, true);
    expect(level.durationMs).toBeLessThan(300);
  });

  it('yanlışta kolaylaşır ve sayacı sıfırlar', () => {
    const level = nextFlashLevel({ span: 2, durationMs: 200, streak: 1 }, false);
    expect(level.durationMs).toBeGreaterThan(200);
    expect(level.streak).toBe(0);
  });

  it('süre alt sınıra gelince grup genişler', () => {
    const level = nextFlashLevel({ span: 1, durationMs: MIN_DURATION_MS + 10, streak: 1 }, true);
    expect(level.span).toBe(2);
  });

  it('hep doğru cevapta en geniş gruba ulaşır ve sınırı aşmaz', () => {
    let level: FlashLevel = FLASH_START;
    for (let i = 0; i < 200; i++) level = nextFlashLevel(level, true);
    expect(level.span).toBe(MAX_SPAN);
    expect(level.durationMs).toBeGreaterThanOrEqual(MIN_DURATION_MS);
  });
});

describe('flaş grupları', () => {
  const texts = PASSAGES.map((passage) => passage.text);

  it('her genişlikte yeterli grup var', () => {
    for (let span = 1; span <= 4; span++) expect(phrasePool(texts, span).length).toBeGreaterThan(100);
  });

  it('yalnızca egzersiz metinleriyle de yeterli grup var', () => {
    const drillTexts = PASSAGES.filter((p) => p.use === 'drill').map((p) => p.text);
    for (let span = 1; span <= 4; span++) expect(phrasePool(drillTexts, span).length).toBeGreaterThan(40);
  });

  it('gruplar istenen kelime sayısında ve noktalamasız', () => {
    for (const phrase of phrasePool(texts, 3).slice(0, 200)) {
      expect(phrase.split(' ')).toHaveLength(3);
      expect(phrase).not.toMatch(/[.,;:!?]/);
    }
  });

  it('deneme hedefi içerir ve dört farklı seçenek verir', () => {
    const trial = makeFlashTrial(phrasePool(texts, 2), seededRng(7));
    expect(trial?.options).toHaveLength(4);
    expect(new Set(trial?.options).size).toBe(4);
    expect(trial?.options).toContain(trial?.target);
  });
});

describe('göz gezdirme', () => {
  it('her paragrafın ilk cümlesini verir', () => {
    const outline = previewOfText('Birinci cümle. İkinci cümle.\n\nÜçüncü paragraf başı. Devamı.');
    expect(outline).toEqual(['Birinci cümle.', 'Üçüncü paragraf başı.']);
  });

  it('gömülü metinlerde paragraf sayısı kadar cümle çıkarır', () => {
    for (const passage of PASSAGES) {
      const paragraphs = passage.text.split(/\n\s*\n/).length;
      expect(previewOfText(passage.text)).toHaveLength(paragraphs);
    }
  });
});

describe('tarama', () => {
  it('çok kelimeli cevabın her kelimesi isabet sayılır', () => {
    const text = 'Bilim insanı Karl von Frisch arıları inceledi.';
    const tokens = tokenize(text);
    const ranges = answerTokenRanges(text, tokens, 'Karl von Frisch');
    expect(ranges).toEqual([{ from: 2, to: 4 }]);
    expect(isScanHit(3, ranges)).toBe(true);
    expect(isScanHit(5, ranges)).toBe(false);
  });

  it('cevap birden çok kez geçiyorsa hepsi isabettir', () => {
    const text = 'Hasan geldi. Selma, Hasan ile konuştu.';
    const ranges = answerTokenRanges(text, tokenize(text), 'Hasan');
    expect(ranges).toHaveLength(2);
    expect(isScanHit(3, ranges)).toBe(true);
  });

  it('gömülü bütün tarama cevapları token’lara eşlenir', () => {
    for (const passage of PASSAGES) {
      const tokens = tokenize(passage.text);
      for (const task of passage.scan) {
        expect(answerTokenRanges(passage.text, tokens, task.answer).length, task.prompt).toBeGreaterThan(0);
      }
    }
  });
});
