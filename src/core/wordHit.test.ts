import { describe, expect, it } from 'vitest';
import { tokenize } from './tokenizer';
import { SOFT_HYPHEN, THIN_SPACE, typeset } from './typeset';
import {
  charIndexAtX,
  hitFromGeometry,
  plainIndex,
  sentenceOf,
  tokenAtPlainIndex,
  type ParagraphGeometry,
} from './wordHit';

describe('plainIndex', () => {
  it('görünmez işaretler sayılmaz', () => {
    const display = `ki${SOFT_HYPHEN}tap${THIN_SPACE} oku`;
    expect(plainIndex(display, 0)).toBe(0);
    expect(plainIndex(display, 3)).toBe(2); // "t"
    expect(plainIndex(display, display.indexOf('o'))).toBe(6);
    expect(plainIndex(display, 999)).toBe(9);
  });
});

describe('tokenAtPlainIndex', () => {
  const texts = ['Bir', 'bal', 'arısı.'];
  it('dizinin düştüğü token; boşlukta soldaki', () => {
    expect(tokenAtPlainIndex(texts, 0)).toBe(0);
    expect(tokenAtPlainIndex(texts, 3)).toBe(0); // boşluk
    expect(tokenAtPlainIndex(texts, 4)).toBe(1);
    expect(tokenAtPlainIndex(texts, 9)).toBe(2);
    expect(tokenAtPlainIndex(texts, 99)).toBe(2);
    expect(tokenAtPlainIndex([], 0)).toBe(-1);
  });

  it('typeset edilmiş paragrafta uçtan uca', () => {
    const tokens = ['Kovana', 'yakın', 'kaynaklarda', 'dans', 'eder.'];
    const display = typeset(tokens.join(' '), { hyphenate: true, extraWordSpace: 2 });
    const at = (needle: string) => tokens[tokenAtPlainIndex(tokens, plainIndex(display, display.indexOf(needle)))];
    expect(at('ya')).toBe('yakın');
    expect(at('dans')).toBe('dans');
    expect(at('lar')).toBe('kaynaklarda');
    expect(tokens[tokenAtPlainIndex(tokens, plainIndex(display, display.length - 1))]).toBe('eder.');
  });
});

describe('charIndexAtX', () => {
  const options = { fontSize: 20, letterSpacing: 0, justified: false };
  it('satırın başı, ortası, sonu', () => {
    const line = 'bir bal arısı';
    expect(charIndexAtX(line, 0, 120, options)).toBe(0);
    expect(charIndexAtX(line, 119, 120, options)).toBe(line.length - 1);
    expect(line[charIndexAtX(line, 60, 120, options)]).toMatch(/[a-zı ]/);
  });

  it('dar harfler daha az yer kaplar', () => {
    // "iiiiMMMM": ilk yarıdaki x, geniş harflere düşmeden önce dar harfleri geçer
    expect(charIndexAtX('iiiiMMMM', 50, 100, options)).toBeGreaterThanOrEqual(4);
  });

  it('iki yana yaslı satırda fazlalık boşluklara gider', () => {
    const line = 'ab cd';
    // Doğal genişlik ~ 4×10.8 + 5.6 = 48.8; satır 200: boşluk ~156 px
    expect(charIndexAtX(line, 100, 200, { ...options, justified: true })).toBe(2);
    expect(charIndexAtX(line, 190, 200, { ...options, justified: true })).toBe(4);
  });
});

describe('hitFromGeometry', () => {
  const paragraphs = new Map<string, ParagraphGeometry>([
    ['0', { x: 0, y: 0, width: 300, height: 60, lines: [
      { text: 'Bir bal arısı zengin ', x: 0, y: 0, width: 200, height: 30 },
      { text: 'bir tarla bulur.', x: 0, y: 30, width: 150, height: 30 },
    ] }],
    ['1', { x: 0, y: 75, width: 300, height: 30, lines: [{ text: 'Sonra döner.', x: 0, y: 0, width: 110, height: 30 }] }],
  ]);
  const options = { fontSize: 18, letterSpacing: 0, justify: false };

  it('paragraf, satır ve dizin', () => {
    expect(hitFromGeometry(paragraphs, 2, 5, options)).toEqual({ key: '0', index: 0 });
    // İkinci satırın başı: ilk satırın uzunluğu kadar ileride
    expect(hitFromGeometry(paragraphs, 1, 40, options)).toEqual({ key: '0', index: 'Bir bal arısı zengin '.length });
    expect(hitFromGeometry(paragraphs, 1, 80, options)).toEqual({ key: '1', index: 0 });
  });

  it('paragraflar arası boşluk ya da dışarısı: yok', () => {
    expect(hitFromGeometry(paragraphs, 10, 68, options)).toBeNull();
    expect(hitFromGeometry(paragraphs, 10, 500, options)).toBeNull();
  });
});

describe('sentenceOf', () => {
  const tokens = tokenize('Arılar dans eder. Bu dans, yön ve uzaklık bildirir! Son.');
  it('cümlenin metni, başlangıcı ve tekrarsız kelimeleri', () => {
    expect(sentenceOf(tokens, 1)).toEqual({
      text: 'Bu dans, yön ve uzaklık bildirir!',
      offset: 18,
      words: ['Bu', 'dans', 'yön', 've', 'uzaklık', 'bildirir'],
    });
    expect(sentenceOf(tokens, 0)?.words).toEqual(['Arılar', 'dans', 'eder']);
    expect(sentenceOf(tokens, 2)?.text).toBe('Son.');
    expect(sentenceOf(tokens, 9)).toBeNull();
  });
});
