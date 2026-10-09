import { describe, expect, it } from 'vitest';
import { escapeXml, wrapLines } from './svgText';

describe('svgText', () => {
  it('satırlara bölüyor, sığmazsa "…"', () => {
    expect(wrapLines('bir iki üç dört beş', 9, 5)).toEqual(['bir iki', 'üç dört', 'beş']);
    const cut = wrapLines('bir iki üç dört beş altı yedi', 9, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1].endsWith('…')).toBe(true);
    for (const line of wrapLines('a '.repeat(100), 10, 3)) expect(line.length).toBeLessThanOrEqual(10);
  });

  it('XML özel karakterlerini kaçırıyor', () => {
    expect(escapeXml(`Tom & "Jerry" <1> 'x'`)).toBe('Tom &amp; &quot;Jerry&quot; &lt;1&gt; &apos;x&apos;');
  });
});
