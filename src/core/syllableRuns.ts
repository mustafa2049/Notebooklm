import { syllabify } from './syllable';
import { LETTER_CLASS } from './turkish';
import { SOFT_HYPHEN } from './typeset';

/**
 * Hece renklendirme — saf, testli.
 *
 * Kelimeler hecelerine göre iki renkle yazılır: her kelimenin 1., 3., 5.
 * hecesi yazı renginde, 2., 4. hecesi ikinci renkte ("ar·ka·daş"). Okumayı
 * yeni öğrenenler, çocuklar ve disleksi için Türkçede yaygın bir destek.
 *
 * Girdi `typeset` edilmiş metin olabilir: yumuşak tireler (hece sınırında)
 * olduğu gibi korunur, önceki hecenin sonunda kalır; ince boşluklar ve
 * noktalama renksiz parçaya gider. Parçaların birleşimi her zaman girdinin
 * aynısıdır — yalnızca renk değişir, satır kırılımı değişmez.
 */

export interface SyllableRun {
  text: string;
  /** İkinci renkle yazılacak hece */
  alt: boolean;
}

const WORD = new RegExp(`[${LETTER_CLASS}${SOFT_HYPHEN}]+`, 'g');

/** Büyük harfli kısaltma ve başlıklar ("UNESCO") boyanmaz, tek heceliler zaten tek renk */
function colorable(word: string): boolean {
  return word.length >= 2 && word !== word.toLocaleUpperCase('tr');
}

export function syllableRuns(text: string): SyllableRun[] {
  const runs: SyllableRun[] = [];
  const push = (piece: string, alt: boolean) => {
    if (!piece) return;
    const last = runs[runs.length - 1];
    if (last && last.alt === alt) last.text += piece;
    else runs.push({ text: piece, alt });
  };

  let cursor = 0;
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    const word = match[0];
    push(text.slice(cursor, start), false);
    cursor = start + word.length;

    const plain = word.split(SOFT_HYPHEN).join('');
    const syllables = colorable(plain) ? syllabify(plain) : [plain];
    if (syllables.length < 2) {
      push(word, false);
      continue;
    }

    // Hece sonlarının düz metindeki konumları
    const ends: number[] = [];
    let total = 0;
    for (const syllable of syllables) {
      total += syllable.length;
      ends.push(total);
    }

    let syllable = 0;
    let letters = 0;
    let piece = '';
    for (const ch of word) {
      if (ch !== SOFT_HYPHEN && letters === ends[syllable]) {
        push(piece, syllable % 2 === 1);
        piece = '';
        syllable += 1;
      }
      piece += ch;
      if (ch !== SOFT_HYPHEN) letters += 1;
    }
    push(piece, syllable % 2 === 1);
  }
  push(text.slice(cursor), false);
  return runs;
}
