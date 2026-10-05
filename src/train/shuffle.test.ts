import { describe, expect, it } from 'vitest';
import { PASSAGES } from '@/content/passages';
import { arrangeOptions, seededRng, seedFrom, shuffle } from './shuffle';

describe('karıştırma', () => {
  it('aynı tohum aynı sırayı verir', () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(42));
    const b = shuffle([1, 2, 3, 4, 5], seededRng(42));
    expect(a).toEqual(b);
  });

  it('öğe kaybetmez', () => {
    expect(shuffle([1, 2, 3, 4], seededRng(seedFrom('x'))).sort()).toEqual([1, 2, 3, 4]);
  });

  it('gömülü sorularda doğru cevap hep aynı sırada durmuyor', () => {
    // Hep ilk şık doğru olsaydı test, okumadan "ilkini seç" ile geçilirdi
    const positions = new Set<number>();
    for (const passage of PASSAGES) {
      for (const question of passage.questions) {
        const options = arrangeOptions(question.prompt, question.correct, question.wrong);
        positions.add(options.indexOf(question.correct));
      }
    }
    expect(positions.size).toBe(4);
  });
});
