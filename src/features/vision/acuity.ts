/** 1 açı dakikası (radyan). logMAR 0 harfi 5 açı dakikası yüksekliğindedir. */
const ARCMIN = Math.PI / (180 * 60);

/** Kredi kartı genişliği (ISO/IEC 7810 ID-1), mm. */
export const CARD_WIDTH_MM = 85.6;

/** Harf ile kalabalıklaştırma çubukları arasındaki boşluk ve çubuk kalınlığı (harf yüksekliği oranı). */
export const CROWD_GAP = 0.5;
export const CROWD_BAR = 0.2;
/** Çubuklarla birlikte toplam genişliğin harf yüksekliğine oranı. */
export const CROWD_EXTENT = 1 + 2 * (CROWD_GAP + CROWD_BAR);

/** Belirtilen logMAR ve mesafe için harf yüksekliği (mm). */
export function letterHeightMm(logMAR: number, distanceMm: number): number {
  return distanceMm * Math.tan(5 * ARCMIN * Math.pow(10, logMAR));
}

/** Harf yüksekliğinden (mm) logMAR. */
export function logMARForHeight(heightMm: number, distanceMm: number): number {
  return Math.log10(Math.atan(heightMm / distanceMm) / (5 * ARCMIN));
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Ekranda gösterilebilecek satır aralığı (0.1 adımlı).
 * En küçük satırda harf en az 5 cihaz pikseli olmalı (E'nin her çizgisi en az 1 piksel);
 * en büyük satır çubuklarıyla birlikte ekrana sığmalı.
 */
export function measurableRange(
  distanceMm: number,
  pxPerMm: number,
  dpr: number,
  screenMinCssPx: number,
): { best: number; worst: number } {
  const minMm = 5 / (pxPerMm * dpr);
  const best = Math.max(-0.3, Math.ceil(round2(logMARForHeight(minMm, distanceMm)) * 10 - 1e-6) / 10);
  const maxMm = (screenMinCssPx * 0.9) / CROWD_EXTENT / pxPerMm;
  const worst = Math.min(1.0, Math.floor(round2(logMARForHeight(maxMm, distanceMm)) * 10 + 1e-6) / 10);
  return { best: round1(best), worst: round1(worst) };
}

/** Ondalık görme keskinliği (ör. logMAR 0.3 → 0.5). */
export const toDecimal = (logMAR: number) => round2(Math.pow(10, -logMAR));

/** Türkiye'de yaygın "x/10" gösterimi (ör. 0.5 → "5/10"). */
export function toTenths(logMAR: number): string {
  const v = Math.round(toDecimal(logMAR) * 100) / 10;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}/10`;
}

/** Snellen 6 metre gösterimi (ör. logMAR 0.3 → "6/12"). */
export const toSnellen6 = (logMAR: number) => `6/${Math.round(6 * Math.pow(10, logMAR))}`;

export const LETTERS_PER_LINE = 5;

/**
 * Satır satır ilerleyen test. Her satırda 5 harf; en az 3 doğru satırı geçirir.
 * Puan harf harf: logMAR = (başlangıç + 0.1) − 0.02 × toplam doğru.
 */
export class AcuityTest {
  line: number;
  private inLine = 0;
  private lineCorrect = 0;
  private lineWrong = 0;
  totalCorrect = 0;
  done = false;
  /** Gösterilebilen en küçük satır da geçildiyse true (gerçek değer daha iyi olabilir). */
  reachedBest = false;

  constructor(
    readonly start: number,
    readonly best: number,
  ) {
    this.line = start;
  }

  get letterInLine(): number {
    return this.inLine;
  }

  answer(correct: boolean): void {
    if (this.done) return;
    this.inLine++;
    if (correct) {
      this.lineCorrect++;
      this.totalCorrect++;
    } else this.lineWrong++;

    const failed = this.lineWrong > LETTERS_PER_LINE - 3;
    if (failed) {
      this.done = true;
      return;
    }
    if (this.inLine < LETTERS_PER_LINE) return;
    // Satır geçildi
    if (this.line - 0.1 < this.best - 1e-9) {
      this.done = true;
      this.reachedBest = true;
      return;
    }
    this.line = round1(this.line - 0.1);
    this.inLine = this.lineCorrect = this.lineWrong = 0;
  }

  /** Harf harf puanlanmış logMAR. */
  result(): number {
    return round2(this.start + 0.1 - 0.02 * this.totalCorrect);
  }
}
