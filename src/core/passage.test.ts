import { describe, expect, it } from 'vitest';
import { passageAround } from './passage';
import { tokenize } from './tokenizer';

const text = [
  'Birinci paragraf kısa. İki cümlesi var.',
  'İkinci paragraf uzun. ' + Array.from({ length: 12 }, (_, i) => `Cümle ${i} dört kelime.`).join(' '),
  'Son paragraf.',
].join('\n\n');
const tokens = tokenize(text);
const slice = (range: { start: number; end: number } | null) => (range ? text.slice(range.start, range.end) : null);
const indexOf = (word: string) => tokens.findIndex((token) => token.text.startsWith(word));

describe('passageAround', () => {
  it('kısa paragrafın tamamı', () => {
    expect(slice(passageAround(tokens, indexOf('İki')))).toBe('Birinci paragraf kısa. İki cümlesi var.');
  });

  it('uzun paragrafta okunan cümle ve önce sonrakiler, cümle ortasından kesmeden', () => {
    const at = tokens.findIndex((token) => token.text === '3');
    const result = slice(passageAround(tokens, at, 12));
    expect(result).toBe('Cümle 3 dört kelime. Cümle 4 dört kelime. Cümle 5 dört kelime.');
  });

  it('paragrafın sonunda geriye doğru genişler', () => {
    const at = tokens.findIndex((token) => token.text === '11');
    expect(slice(passageAround(tokens, at, 8))).toBe('Cümle 10 dört kelime. Cümle 11 dört kelime.');
  });

  it('tek cümle sınırı aşsa bile o cümle', () => {
    const at = tokens.findIndex((token) => token.text === '7');
    expect(slice(passageAround(tokens, at, 2))).toBe('Cümle 7 dört kelime.');
    expect(passageAround(tokens, 9999)).toBeNull();
  });
});
