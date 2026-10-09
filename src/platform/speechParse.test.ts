import { describe, expect, it } from 'vitest';
import { normalizeTr, parseCommands, parseDirection } from './speechParse';

describe('parseDirection', () => {
  it('understands Turkish direction words and variants', () => {
    expect(parseDirection('Sağ')).toBe('ArrowRight');
    expect(parseDirection('sağa')).toBe('ArrowRight');
    expect(parseDirection('SOL')).toBe('ArrowLeft');
    expect(parseDirection('solda')).toBe('ArrowLeft');
    expect(parseDirection('yukarı')).toBe('ArrowUp');
    expect(parseDirection('üst')).toBe('ArrowUp');
    expect(parseDirection('aşağı')).toBe('ArrowDown');
    expect(parseDirection('aşağıya bakıyor')).toBe('ArrowDown');
    expect(parseDirection('alt')).toBe('ArrowDown');
    expect(parseDirection('göremiyorum')).toBe('skip');
    expect(parseDirection('bilmiyorum')).toBe('skip');
  });

  it('takes the last direction in a phrase and ignores other words', () => {
    expect(parseDirection('sol değil sağ')).toBe('ArrowRight');
    expect(parseDirection('sanırım yukarı.')).toBe('ArrowUp');
    expect(parseDirection('merhaba')).toBeNull();
    expect(parseDirection('')).toBeNull();
    expect(parseDirection('saat')).toBeNull();
  });

  it('lists every command in order', () => {
    expect(parseCommands('sağ sonra sol ve yukarı')).toEqual(['ArrowRight', 'ArrowLeft', 'ArrowUp']);
    expect(parseCommands('hmm')).toEqual([]);
  });

  it('normalizes Turkish characters', () => {
    expect(normalizeTr('Aşağı Üst Göz İçin')).toBe('asagi ust goz icin');
  });
});
