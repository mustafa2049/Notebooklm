import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { quoteLayout, quoteSvg, quoteText } from './quoteCard';

const palette = { bg: '#F4ECD8', text: '#3B2F22', dim: '#6B5B45', accent: '#C05621' };

describe('alıntı kartı', () => {
  it('kısa alıntıya büyük, uzun alıntıya küçük yazı', () => {
    expect(quoteLayout(40).fontSize).toBeGreaterThan(quoteLayout(400).fontSize);
    expect(quoteLayout(400).maxLines).toBeGreaterThan(quoteLayout(40).maxLines);
  });

  it('cümleyi satırlara bölüp kitap adını yazıyor, özel karakterleri kaçırıyor', () => {
    const svg = quoteSvg({ sentence: 'Ama arıların konuşacak sesleri yoktur; bunun yerine dans ederler.', title: 'Arılar & Biz' }, palette);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('— Arılar &amp; Biz');
    expect(svg).toContain('Ama arıların');
    expect(() => new Script(`(${JSON.stringify(svg)})`)).not.toThrow();
  });

  it('çok uzun alıntı kartın dışına taşmıyor: satır sayısı sınırlı, son satır "…"', () => {
    const svg = quoteSvg({ sentence: 'kelime '.repeat(200), title: 'T' }, palette);
    const lines = svg.match(/font-size="20" fill="#3B2F22"/g) ?? [];
    expect(lines.length).toBeLessThanOrEqual(quoteLayout(1400).maxLines);
    expect(svg).toContain('…');
    const ys = [...svg.matchAll(/<text x="56" y="(\d+)"/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeLessThan(600);
  });

  it('metin özeti: tırnak, kitap ve not', () => {
    expect(quoteText({ sentence: ' Cümle. ', title: 'Kitap', note: 'güzel' })).toBe('“Cümle.”\n— Kitap\n\nNotum: güzel');
  });
});
