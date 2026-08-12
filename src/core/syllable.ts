import { isLetter, isVowel } from './turkish';

/**
 * Türkçe heceleme.
 *
 * Türkçe hece yapısı düzenli olduğu için sözlüğe gerek yok. Kural: her hecede
 * tam olarak bir sesli harf bulunur; iki sesli arasındaki ünsüzler şöyle dağılır:
 *
 * | ünsüz sayısı | dağılım                  | örnek                |
 * |--------------|--------------------------|----------------------|
 * | 0            | ikinci sesliden önce böl | sa-at                |
 * | 1            | ünsüz sonraki heceye     | ki-tap               |
 * | 2            | ilki önceki heceye       | kar-tal              |
 * | 3            | ilk ikisi önceki heceye  | e-lekt-rik           |
 * | n            | son ünsüz sonraki heceye | (nadir)              |
 */
export function syllabify(word: string): string[] {
  if (word.length <= 1) return [word];

  const vowelPositions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (isVowel(word[i])) vowelPositions.push(i);
  }

  // Sesli harf yoksa (kısaltma, sayı, sembol) bölme yapılamaz
  if (vowelPositions.length <= 1) return [word];

  const cuts: number[] = [];
  for (let v = 0; v < vowelPositions.length - 1; v++) {
    const a = vowelPositions[v];
    const b = vowelPositions[v + 1];
    const consonants = b - a - 1;

    // Ünsüz varsa yalnızca son ünsüz sonraki heceye gider (bu tek kural yukarıdaki
    // tablonun tamamını karşılar); hiç ünsüz yoksa sesliden hemen önce bölünür.
    cuts.push(consonants === 0 ? b : b - 1);
  }

  const parts: string[] = [];
  let prev = 0;
  for (const cut of cuts) {
    if (cut > prev) {
      parts.push(word.slice(prev, cut));
      prev = cut;
    }
  }
  parts.push(word.slice(prev));
  return parts.filter((p) => p.length > 0);
}

/**
 * Uzun bir kelimeyi hece sınırlarından, her parçası en fazla `maxChars` olacak
 * şekilde parçalara böler. Heceler asla ortadan kesilmez; tek bir hece
 * `maxChars`'tan uzunsa olduğu gibi bırakılır.
 */
export function splitLongWord(word: string, maxChars: number): string[] {
  if (word.length <= maxChars) return [word];

  // Noktalama ve tireli birleşik kelimeler heceleme için sorun çıkarır:
  // sadece harflerden oluşan gövdeyi hecelemek daha güvenli.
  const syllables = syllabify(word);
  if (syllables.length === 1) return [word];

  const parts: string[] = [];
  let current = '';
  for (const syl of syllables) {
    if (current.length > 0 && current.length + syl.length > maxChars) {
      parts.push(current);
      current = syl;
    } else {
      current += syl;
    }
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

/**
 * Bionic okuma için kalın gösterilecek ön ek uzunluğu.
 * Sesli harf sınırına yuvarlanır: "oku|mak" yerine "oku|mak" gibi doğal
 * bölünme, gözün kelimeyi tanımasını kolaylaştırır.
 */
export function bionicPrefixLength(word: string, ratio: number): number {
  const letters = [...word];
  const len = letters.length;
  if (len === 0) return 0;
  if (len <= 3) return 1;

  let target = Math.max(1, Math.round(len * ratio));
  if (target >= len) target = len - 1;

  // Hedefin hemen çevresinde sesliden sonra bitecek bir sınır ara
  for (const delta of [0, 1, -1]) {
    const idx = target + delta;
    if (idx >= 1 && idx < len && isVowel(letters[idx - 1]) && isLetter(letters[idx])) {
      return idx;
    }
  }
  return target;
}
