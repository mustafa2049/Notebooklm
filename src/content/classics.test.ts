import { describe, expect, it } from 'vitest';
import { CLASSICS, classicsByAuthor } from './classics';

describe('klasikler', () => {
  it('bağlantılar Vikikaynak sayfası ve tekil; her eserin tanıtımı var', () => {
    const urls = CLASSICS.map((classic) => classic.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const classic of CLASSICS) {
      expect(classic.url.startsWith('https://tr.wikisource.org/wiki/')).toBe(true);
      expect(classic.url).not.toMatch(/\s/);
      expect(classic.blurb.length).toBeGreaterThan(5);
    }
  });

  it('yazara göre grupluyor, sırayı koruyor', () => {
    const groups = classicsByAuthor([
      { title: 'A', author: 'X', blurb: 'aaaaaa', url: 'u1' },
      { title: 'B', author: 'Y', blurb: 'bbbbbb', url: 'u2' },
      { title: 'C', author: 'X', blurb: 'cccccc', url: 'u3' },
    ]);
    expect(groups.map((group) => [group.author, group.items.map((item) => item.title)])).toEqual([
      ['X', ['A', 'C']],
      ['Y', ['B']],
    ]);
    expect(classicsByAuthor().reduce((sum, group) => sum + group.items.length, 0)).toBe(CLASSICS.length);
  });
});
