import { CARD_FONT, escapeXml, wrapLines } from './svgText';

/**
 * Alıntı kartı — saf, testli. Altı çizilen cümle, kitabın adıyla kare bir
 * görsel kart olur (haftalık kartla aynı yöntem: web'de PNG, telefonda metin).
 */

export interface QuoteInput {
  sentence: string;
  title: string;
  note?: string;
}

export interface QuotePalette {
  bg: string;
  text: string;
  dim: string;
  accent: string;
}

export const QUOTE_CARD_SIZE = { width: 600, height: 600 };

/** Uzun alıntı küçük yazıyla, kısa alıntı büyük yazıyla: kart hep dolu görünsün */
export function quoteLayout(length: number): { fontSize: number; maxChars: number; maxLines: number } {
  if (length <= 90) return { fontSize: 34, maxChars: 26, maxLines: 5 };
  if (length <= 170) return { fontSize: 28, maxChars: 32, maxLines: 7 };
  if (length <= 280) return { fontSize: 24, maxChars: 38, maxLines: 9 };
  return { fontSize: 20, maxChars: 46, maxLines: 11 };
}

export function quoteText(input: QuoteInput): string {
  return `“${input.sentence.trim()}”\n— ${input.title}${input.note ? `\n\nNotum: ${input.note}` : ''}`;
}

export function quoteSvg(input: QuoteInput, palette: QuotePalette): string {
  const sentence = input.sentence.replace(/\s+/g, ' ').trim();
  const { fontSize, maxChars, maxLines } = quoteLayout(sentence.length);
  const lines = wrapLines(sentence, maxChars, maxLines);
  const lineHeight = Math.round(fontSize * 1.4);
  const blockHeight = lines.length * lineHeight;
  // Metin bloğu dikeyde ortada (üstte marka, altta kitap adı için pay)
  const top = Math.max(150, Math.round((600 - blockHeight) / 2) + 10);
  const text = lines
    .map(
      (line, index) =>
        `<text x="56" y="${top + index * lineHeight}" ${CARD_FONT} font-size="${fontSize}" fill="${palette.text}">${escapeXml(line)}</text>`
    )
    .join('\n  ');
  const title = wrapLines(input.title, 40, 1)[0] ?? '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${palette.bg}"/>
  <rect x="32" y="32" width="6" height="536" rx="3" fill="${palette.accent}"/>
  <text x="56" y="76" ${CARD_FONT} font-size="20" font-weight="700" fill="${palette.accent}">HIZLI OKUMA</text>
  <text x="50" y="${top - lineHeight * 0.6}" ${CARD_FONT} font-size="${fontSize * 2.4}" font-weight="700" fill="${palette.accent}" opacity="0.35">“</text>
  ${text}
  <text x="56" y="548" ${CARD_FONT} font-size="20" fill="${palette.dim}">— ${escapeXml(title)}</text>
</svg>`;
}
