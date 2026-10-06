/** Stereo (derinlik) görme: rastgele nokta stereogramı ve eşik ölçümü. */

const ARCSEC = Math.PI / (180 * 3600);

/** Verilen açısal disparite için cihaz pikseli cinsinden kayma. */
export function disparityPx(arcsec: number, distanceMm: number, pxPerMm: number, dpr: number): number {
  return distanceMm * Math.tan(arcsec * ARCSEC) * pxPerMm * dpr;
}

/** Cihaz pikseli cinsinden kaymanın açısal karşılığı (arcsaniye). */
export function arcsecForPx(px: number, distanceMm: number, pxPerMm: number, dpr: number): number {
  return Math.atan(px / (pxPerMm * dpr) / distanceMm) / ARCSEC;
}

/** Testte kullanılan disparite düzeyleri (arcsaniye, büyükten küçüğe). */
export const STEREO_LEVELS = [800, 600, 400, 300, 200, 140, 100, 70, 50, 40, 30, 20];

/** Bu ekran ve mesafede gösterilebilen düzeyler (en az 1 cihaz pikseli kayma). */
export function availableLevels(distanceMm: number, pxPerMm: number, dpr: number): { arcsec: number; px: number }[] {
  const seen = new Set<number>();
  const out: { arcsec: number; px: number }[] = [];
  for (const a of STEREO_LEVELS) {
    const px = Math.round(disparityPx(a, distanceMm, pxPerMm, dpr));
    if (px < 1 || seen.has(px)) continue; // aynı piksele yuvarlanan düzeyleri atla
    seen.add(px);
    out.push({ arcsec: a, px });
  }
  return out;
}

export type ShapeMask = (x: number, y: number) => boolean;

/**
 * İki göz için ikili nokta deseni üretir. Sağ göz deseni her yerde `bgShift` kadar, şekil (mask)
 * bölgesinde ise `bgShift + shift` kadar kaydırılır; şekil zemine göre `shift` kadar öne çıkar.
 *
 * Zemin de kaydırıldığı için (bgShift ≥ nokta boyu) iki gözün noktaları her yerde bağımsızdır:
 * gözlüksüz bakınca ya da tek gözle şeklin içi ve dışı aynı renk dağılımında görünür.
 * Böylece kare yalnızca gerçek derinlik (stereo) görmeyle fark edilir.
 */
export function rdsEyes(
  w: number,
  h: number,
  dot: number,
  mask: ShapeMask,
  shift: number,
  rnd: () => number = Math.random,
  bgShift = 2 * dot,
): { left: Uint8Array; right: Uint8Array } {
  const cw = Math.ceil((w + bgShift + shift) / dot) + 1;
  const ch = Math.ceil(h / dot) + 1;
  const cells = new Uint8Array(cw * ch);
  for (let i = 0; i < cells.length; i++) cells[i] = rnd() < 0.5 ? 1 : 0;
  const base = (x: number, y: number) => cells[Math.floor(y / dot) * cw + Math.floor(x / dot)];
  const left = new Uint8Array(w * h);
  const right = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = base(x, y);
      left[i] = v;
      right[i] = base(x + bgShift + (mask(x, y) ? shift : 0), y);
    }
  }
  return { left, right };
}

type RGB = readonly [number, number, number];

/** İki gözün desenini anaglif renkleriyle toplayarak RGBA piksel verisi üretir (siyah zemin). */
export function rdsPixels(
  eyes: { left: Uint8Array; right: Uint8Array },
  leftColor: RGB,
  rightColor: RGB,
): Uint8ClampedArray<ArrayBuffer> {
  const n = eyes.left.length;
  const out = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const l = eyes.left[i];
    const r = eyes.right[i];
    out[i * 4] = l * leftColor[0] + r * rightColor[0];
    out[i * 4 + 1] = l * leftColor[1] + r * rightColor[1];
    out[i * 4 + 2] = l * leftColor[2] + r * rightColor[2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

/**
 * Düzey düzey ilerleyen test: bir düzeyde 2 yanlıştan önce 2 doğru → sonraki düzey;
 * 2 yanlış → test biter. Sonuç, geçilen en küçük disparite (hiçbiri geçilmediyse null).
 */
export class StereoTestRun {
  index = 0;
  private correct = 0;
  private wrong = 0;
  passed: number | null = null;
  done = false;
  reachedBest = false;
  trials = 0;

  constructor(readonly levels: { arcsec: number; px: number }[]) {
    if (!levels.length) this.done = true;
  }

  get current() {
    return this.levels[this.index];
  }

  answer(ok: boolean): void {
    if (this.done) return;
    this.trials++;
    if (ok) this.correct++;
    else this.wrong++;
    if (this.wrong >= 2) {
      this.done = true;
      return;
    }
    if (this.correct >= 2) {
      this.passed = this.current.arcsec;
      this.correct = this.wrong = 0;
      if (this.index === this.levels.length - 1) {
        this.done = true;
        this.reachedBest = true;
      } else this.index++;
    }
  }
}

export function stereoCategory(arcsec: number | null): { label: string; tone: 'good' | 'mid' | 'low' } {
  if (arcsec === null) return { label: 'Derinlik algılanamadı', tone: 'low' };
  if (arcsec <= 60) return { label: 'Normal stereo görme', tone: 'good' };
  if (arcsec <= 200) return { label: 'Azalmış stereo görme', tone: 'mid' };
  return { label: 'Zayıf stereo görme', tone: 'low' };
}
