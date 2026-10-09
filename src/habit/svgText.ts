/**
 * Paylaşım kartları (haftalık, yıllık, alıntı) için SVG metin yardımcıları —
 * saf, testli. SVG'de kendiliğinden satır kaydırma olmadığı için metin burada
 * satırlara bölünüyor.
 */

export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (ch) =>
    ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === "'" ? '&apos;' : '&quot;'
  );
}

/**
 * Metni satırlara böler. En çok `maxLines` satır; sığmazsa son satır "…" ile
 * biter. Kelime ortasından bölmez (tek kelime satırdan uzunsa kesilir).
 */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i].length > maxChars ? `${words[i].slice(0, maxChars - 1)}…` : words[i];
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) {
      // Sığmayan kısım kaldı: son satırı "…" ile kapat
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.length + 1 <= maxChars ? `${last}…` : `${last.slice(0, maxChars - 1)}…`;
      return lines;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Kartlarda kullanılan yazı tipi: sistem yazı tipi, dışarıdan dosya gerekmesin */
export const CARD_FONT = "font-family=\"system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif\"";
