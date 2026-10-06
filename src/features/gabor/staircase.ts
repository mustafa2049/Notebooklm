export interface StaircaseOptions {
  /** Başlangıç kontrastı (0–1). */
  start?: number;
  minContrast?: number;
  maxContrast?: number;
  /** İlk iki dönüşe kadar kullanılan büyük adım (log10 birimi). */
  bigStep?: number;
  /** Sonraki adım (log10 birimi). */
  step?: number;
  maxReversals?: number;
  maxTrials?: number;
  /** Eşik hesabında kullanılan son dönüş sayısı. */
  useLast?: number;
}

/**
 * 3-aşağı 1-yukarı merdiven: art arda 3 doğruda kontrast azalır, her yanlışta artar.
 * Yaklaşık %79,4 doğruluk noktasına yakınsar (Levitt, 1971).
 */
export class Staircase {
  private logC: number;
  private run = 0;
  private lastDir = 0;
  readonly reversals: number[] = [];
  trials = 0;
  correct = 0;
  private o: Required<StaircaseOptions>;

  constructor(opts: StaircaseOptions = {}) {
    this.o = {
      start: 0.3,
      minContrast: 0.002,
      maxContrast: 1,
      bigStep: 0.2,
      step: 0.1,
      maxReversals: 10,
      maxTrials: 80,
      useLast: 6,
      ...opts,
    };
    this.logC = Math.log10(this.o.start);
  }

  get contrast(): number {
    return Math.pow(10, this.logC);
  }

  get done(): boolean {
    return this.reversals.length >= this.o.maxReversals || this.trials >= this.o.maxTrials;
  }

  respond(isCorrect: boolean): void {
    this.trials++;
    if (isCorrect) {
      this.correct++;
      if (++this.run >= 3) {
        this.run = 0;
        this.move(-1);
      }
    } else {
      this.run = 0;
      this.move(1);
    }
  }

  private move(dir: number) {
    if (this.lastDir !== 0 && dir !== this.lastDir) this.reversals.push(this.logC);
    this.lastDir = dir;
    const step = this.reversals.length < 2 ? this.o.bigStep : this.o.step;
    const min = Math.log10(this.o.minContrast);
    const max = Math.log10(this.o.maxContrast);
    this.logC = Math.max(min, Math.min(max, this.logC + dir * step));
  }

  /** Son dönüşlerin geometrik ortalaması olarak kontrast eşiği. */
  threshold(): number {
    const r = this.reversals.slice(-this.o.useLast);
    if (r.length === 0) return this.contrast;
    return Math.pow(10, r.reduce((a, b) => a + b, 0) / r.length);
  }
}

/** Kontrast duyarlılığı (1/eşik) — büyük değer daha iyi görme demektir. */
export const sensitivity = (threshold: number) => 1 / threshold;
