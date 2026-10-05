/**
 * Tohumlu karıştırma: aynı tohum her zaman aynı sırayı verir.
 *
 * Şıklar ekranda karıştırılıyor ki doğru cevap hep aynı yerde olmasın; ama
 * ekran yeniden çizildiğinde sıra değişirse kullanıcı seçtiği şıkkı kaybeder.
 * Tohum olarak soru metni kullanılıyor — kararlı ve testte öngörülebilir.
 */

export type Rng = () => number;

/** Dizgeden 32 bitlik tohum (FNV-1a). */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Küçük ve yeterince iyi bir sözde rastgele üreteç (mulberry32). */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Doğru şık ve çeldiricileri, soruya bağlı sabit bir sırayla karıştırır. */
export function arrangeOptions(prompt: string, correct: string, wrong: readonly string[]): string[] {
  return shuffle([correct, ...wrong], seededRng(seedFrom(prompt)));
}
