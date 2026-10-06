import { describe, expect, it } from 'vitest';
import { defaultAnaglyph } from '../../model/types';
import { adaptContrast, makePalette } from './anaglyph';

describe('adaptContrast', () => {
  it('raises fellow-eye contrast after a good session', () => {
    expect(adaptContrast(0.2, 0.8, 300)).toBe(0.25);
  });
  it('lowers it after a poor session but not below 10%', () => {
    expect(adaptContrast(0.3, 0.2, 300)).toBe(0.25);
    expect(adaptContrast(0.1, 0.1, 300)).toBe(0.1);
  });
  it('keeps it unchanged in the middle band', () => {
    expect(adaptContrast(0.4, 0.5, 300)).toBe(0.4);
  });
  it('caps at 100%', () => {
    expect(adaptContrast(0.98, 0.9, 300)).toBe(1);
  });
  it('ignores very short sessions', () => {
    expect(adaptContrast(0.2, 1, 20)).toBe(0.2);
  });
});

describe('makePalette', () => {
  it('gives the amblyopic eye the colour of its own filter', () => {
    const a = { ...defaultAnaglyph(), redEye: 'left' as const };
    // Tembel göz sol, sol gözde kırmızı filtre var → tembel göz kırmızıyı görür.
    expect(makePalette(a, 'left', 0.5).amb).toBe('rgb(255,0,0)');
    expect(makePalette(a, 'left', 0.5).fel).toBe('rgb(0,128,128)');
    // Tembel göz sağ → camgöbeği tam, kırmızı azaltılmış.
    expect(makePalette(a, 'right', 0.2).amb).toBe('rgb(0,255,255)');
    expect(makePalette(a, 'right', 0.2).fel).toBe('rgb(51,0,0)');
  });
  it('supports red-blue glasses', () => {
    const a = { ...defaultAnaglyph(), glasses: 'red-blue' as const, cyanLevel: 200 };
    expect(makePalette(a, 'right', 1).amb).toBe('rgb(0,0,200)');
  });
});
