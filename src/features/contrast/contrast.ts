/**
 * Pelli-Robson benzeri kontrast duyarlılığı testi (saf fonksiyonlar).
 * Harfler üçlü gruplar hâlinde, her grupta 0,15 log birim daha soluk gösterilir; her doğru harf 0,05 log CS değerindedir.
 */

/** Sloan harfleri (birbirinden ayırt etme zorluğu benzer). */
export const SLOAN = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;
export type Letter = (typeof SLOAN)[number];

export const LOG_STEP = 0.15;
export const LEVEL_COUNT = 16; // 0,00 … 2,25
export const MAX_LOG_CS = LOG_STEP * (LEVEL_COUNT - 1);

/** Düzeyin Weber kontrastı (0–1). */
export const contrastForLevel = (level: number): number => Math.pow(10, -level * LOG_STEP);

/** Harf yüksekliği: Pelli-Robson harfleri 2,8° görüş açısındadır. */
export const letterHeightMm = (distanceMm: number): number => 2 * distanceMm * Math.tan(((2.8 / 2) * Math.PI) / 180);

const srgbToLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const linearToSrgb = (l: number) => {
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return c * 255;
};

/**
 * Zemine göre istenen Weber kontrastını veren harf piksel değeri (ondalıklı; ekranda titreşimle/dithering gösterilir).
 * Ekran parlaklığı sRGB eğrisine göre hesaplanır.
 */
export function letterPixel(background: number, contrast: number): number {
  return linearToSrgb(srgbToLinear(background) * (1 - contrast));
}

/** Ondalıklı piksel değerini rastgele yuvarlar; ortalaması istenen değeri verir. */
export const dither = (v: number, rnd = Math.random): number => Math.max(0, Math.min(255, Math.floor(v + rnd())));

export class PelliRobsonRun {
  level = 0;
  /** Üçlüdeki sıra (0–2). */
  letterInTriplet = 0;
  correct = 0;
  private wrongInTriplet = 0;
  done = false;

  answer(ok: boolean): void {
    if (this.done) return;
    if (ok) this.correct++;
    else this.wrongInTriplet++;
    // Bir üçlüde 2 yanlış: bu düzey görülemiyor, test biter.
    if (this.wrongInTriplet >= 2) {
      this.done = true;
      return;
    }
    if (++this.letterInTriplet === 3) {
      this.letterInTriplet = 0;
      this.wrongInTriplet = 0;
      if (++this.level >= LEVEL_COUNT) {
        this.level = LEVEL_COUNT - 1;
        this.done = true;
      }
    }
  }

  get contrast(): number {
    return contrastForLevel(this.level);
  }

  /** Harf harf puanlama: log CS = 0,05 × doğru harf − 0,15. */
  get logCS(): number {
    return Math.max(0, Math.round((this.correct * 0.05 - 0.15) * 100) / 100);
  }

  /** Bu ekranda gösterilebilen en iyi değere ulaşıldı mı. */
  get reachedMax(): boolean {
    return this.done && this.logCS >= MAX_LOG_CS - 1e-9;
  }
}

/** Üçlü içinde tekrar etmeyen rastgele harf. */
export function nextLetter(previous: Letter[], rnd = Math.random): Letter {
  const pool = SLOAN.filter((l) => !previous.includes(l));
  return pool[Math.floor(rnd() * pool.length)];
}

export type CsCategory = 'normal' | 'borderline' | 'reduced';

/** Kaba sınıflama (yetişkin normları ≈ 1,65–2,0; 1,5'in altı belirgin azalma). */
export function csCategory(logCS: number): CsCategory {
  if (logCS >= 1.65) return 'normal';
  if (logCS >= 1.5) return 'borderline';
  return 'reduced';
}

export const CS_LABEL: Record<CsCategory, string> = {
  normal: 'normal aralıkta',
  borderline: 'sınırda',
  reduced: 'azalmış',
};
