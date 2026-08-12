import { isLetter, isVowel } from './turkish';

/**
 * ORP — Optimal Recognition Point (en uygun tanıma noktası).
 *
 * Göz bir kelimeyi okurken tam ortasına değil, başa yakın belirli bir harfe
 * sabitlenir. RSVP modunda bu harfi ekranda sabit bir noktada tutmak, gözün
 * kelimeden kelimeye zıplamasını (sakkad) tamamen ortadan kaldırır.
 *
 * Klasik uzunluk tablosu taban alınır, ardından pivot en yakın sesli harfe
 * kaydırılır: Türkçede sesli/ünsüz dizilimi çok düzenli olduğu için sesli harf
 * üzerindeki sabitlenme belirgin biçimde daha rahat okunur.
 */
function baseIndex(length: number): number {
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
}

/** Kelime içindeki pivot harf indeksi. */
export function pivotIndex(word: string): number {
  const letters = [...word];
  const len = letters.length;
  if (len === 0) return 0;

  let idx = Math.min(baseIndex(len), len - 1);
  if (isVowel(letters[idx])) return idx;

  // Sesliye en fazla iki karakter uzaklıkta kaydır
  for (const delta of [1, -1, 2, -2]) {
    const candidate = idx + delta;
    if (candidate >= 0 && candidate < len && isVowel(letters[candidate])) return candidate;
  }
  return idx;
}

/**
 * Ekranda gösterilen chunk metninde pivot karakter indeksi.
 * Çok kelimeli chunk'larda pivot, ortadaki kelimenin pivotudur — böylece
 * göz grubun ortasına sabitlenir ve çevresel görüşle yanları yakalar.
 */
export function chunkPivot(text: string): number {
  const words: { start: number; text: string }[] = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && text[i] === ' ') i++;
    const start = i;
    while (i < text.length && text[i] !== ' ') i++;
    if (i > start) words.push({ start, text: text.slice(start, i) });
  }
  if (words.length === 0) return 0;

  const middle = words[Math.floor((words.length - 1) / 2)];
  // Noktalama pivotu kaydırmasın: baştaki tırnak/parantezi atla
  let offset = 0;
  while (offset < middle.text.length && !isLetter(middle.text[offset])) offset++;
  const core = middle.text.slice(offset);
  return middle.start + offset + pivotIndex(core);
}
