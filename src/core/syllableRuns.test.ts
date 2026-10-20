import { describe, expect, it } from 'vitest';
import { syllableRuns } from './syllableRuns';
import { SOFT_HYPHEN, THIN_SPACE, typeset } from './typeset';

const join = (text: string) =>
  syllableRuns(text)
    .map((run) => (run.alt ? `[${run.text}]` : run.text))
    .join('');

describe('syllableRuns', () => {
  it('her kelimenin 2., 4. hecesi ikinci renk', () => {
    expect(syllableRuns('Arıların dansı')).toEqual([
      { text: 'A', alt: false },
      { text: 'rı', alt: true },
      { text: 'la', alt: false },
      { text: 'rın', alt: true },
      { text: ' dan', alt: false },
      { text: 'sı', alt: true },
    ]);
  });

  it('her kelime ilk renkle başlar', () => {
    expect(join('kitap okuyan çocuk')).toBe('ki[tap] o[ku]yan ço[cuk]');
  });

  it('yumuşak tireler önceki hecede kalır', () => {
    const text = typeset('kitaplık', { hyphenate: true, extraWordSpace: 0 });
    expect(text).toBe(`ki${SOFT_HYPHEN}tap${SOFT_HYPHEN}lık`);
    expect(syllableRuns(text)).toEqual([
      { text: `ki${SOFT_HYPHEN}`, alt: false },
      { text: `tap${SOFT_HYPHEN}`, alt: true },
      { text: 'lık', alt: false },
    ]);
  });

  it('kısaltmalar, tek heceliler ve noktalama boyanmaz', () => {
    expect(syllableRuns('UNESCO ve NATO, bu da.')).toEqual([{ text: 'UNESCO ve NATO, bu da.', alt: false }]);
    expect(join("İstanbul'da 1923")).toBe("İs[tan]bul'da 1923");
  });

  it('parçalar birleşince metnin aynısı (ince boşluk, heceleme dahil)', () => {
    const source =
      'Bir bal arısı zengin bir çiçek tarlası bulduğunda kovana döner ve bu haberi arkadaşlarına iletir. Ama arıların konuşacak sesleri yoktur; bunun yerine dans ederler.';
    for (const options of [
      { hyphenate: false, extraWordSpace: 0 },
      { hyphenate: true, extraWordSpace: 1 },
      { hyphenate: true, extraWordSpace: 2 },
    ]) {
      const text = typeset(source, options);
      expect(syllableRuns(text).map((run) => run.text).join('')).toBe(text);
    }
    expect(typeset('a b', { hyphenate: false, extraWordSpace: 1 })).toContain(THIN_SPACE);
  });

  it('boş metin', () => {
    expect(syllableRuns('')).toEqual([]);
  });
});
