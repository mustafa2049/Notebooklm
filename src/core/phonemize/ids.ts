/**
 * Fonemlerden ses modelinin girdisine — saf, testli.
 *
 * Piper modelleri fonemleri sayı olarak alır; eşleme sesin yapılandırmasındaki
 * `phoneme_id_map`'te. Dizilim piper'ınkiyle aynı: başlangıç (^), dolgu (_),
 * her fonemden sonra dolgu, sonda bitiş ($). Haritada olmayan sembol atlanır.
 */

export type PhonemeIdMap = Record<string, number[]>;

const BOS = '^';
const EOS = '$';
const PAD = '_';

export function phonemeIds(phonemes: string[], map: PhonemeIdMap): number[] {
  const pad = map[PAD] ?? [0];
  const ids = [...(map[BOS] ?? [1]), ...pad];
  for (const phoneme of phonemes) {
    const id = map[phoneme];
    if (!id) continue;
    ids.push(...id, ...pad);
  }
  ids.push(...(map[EOS] ?? [2]));
  return ids;
}

/** Haritada karşılığı olmayan semboller (ses paketini doğrularken) */
export function missingPhonemes(phonemes: Iterable<string>, map: PhonemeIdMap): string[] {
  return [...new Set(phonemes)].filter((p) => !map[p]);
}

/**
 * Uzun cümleyi seslendirme parçalarına böler: ilk ses gecikmesin, model
 * aşırı uzun girdiyle uğraşmasın. Önce virgül/noktalı virgülden, parça yine
 * uzunsa kelime sınırından; kısa parçalar birleştirilir.
 */
export function speechChunks(text: string, maxWords = 28): string[] {
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  // Noktalama parçada kalsın: "a, b" → ["a,", "b"]
  const parts = text
    .replace(/([,;:])\s+/g, '$1\u0000')
    .split('\u0000')
    .filter((part) => part.trim());
  const chunks: string[] = [];
  for (const part of parts) {
    const pieces: string[] = [];
    if (words(part) > maxWords) {
      const list = part.split(/\s+/);
      for (let i = 0; i < list.length; i += maxWords) pieces.push(list.slice(i, i + maxWords).join(' '));
    } else pieces.push(part);
    for (const piece of pieces) {
      const last = chunks[chunks.length - 1];
      if (last !== undefined && words(last) + words(piece) <= maxWords) chunks[chunks.length - 1] = `${last} ${piece}`;
      else chunks.push(piece);
    }
  }
  return chunks.length ? chunks : [text];
}
