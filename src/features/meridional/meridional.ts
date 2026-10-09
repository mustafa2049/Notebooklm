import type { EyeRx, OrientationTest } from '../../model/types';
import { Staircase, type StaircaseOptions } from '../gabor/staircase';

/** Dört temel yön (ekranda çizgi açısı, yataydan saat yönünün tersine). */
export const FOUR_DIRECTIONS = [0, 45, 90, 135];

/**
 * Reçete ekseni (TABO) muayene edenin bakışından yazılır; hasta ekrana karşıdan baktığında
 * aynı doğrultu yatayda aynalanmış görünür.
 */
export const axisToScreenDeg = (axis: number): number => (((180 - axis) % 180) + 180) % 180;

/**
 * Astigmatın iki ana meridyeni boyunca uzanan çizgi açıları. Meridyonal ambliyopide bu iki yönden
 * birinde görme belirgin şekilde daha zayıf kalabilir. Silindir yoksa yatay ve dikey kullanılır.
 */
export function principalMeridians(rx?: EyeRx): [number, number] {
  if (!rx || rx.cyl === 0) return [0, 90];
  const a = Math.round(axisToScreenDeg(rx.axis));
  return [a, (a + 90) % 180];
}

/** Ekrandaki çizgi açısı → `renderGabor` yönü (radyan; 0 = dikey çizgiler, pozitif saat yönü). */
export const orientationRad = (deg: number): number => ((90 - deg) * Math.PI) / 180;

export function directionName(deg: number): string {
  const d = ((Math.round(deg) % 180) + 180) % 180;
  if (d <= 10 || d >= 170) return 'yatay';
  if (Math.abs(d - 90) <= 10) return 'dikey';
  return d < 90 ? 'eğik ⟋' : 'eğik ⟍';
}

/** Her yön için ayrı merdiven; denemeler rastgele karıştırılır (öğrenme ve yorgunluk eşit dağılır). */
export class InterleavedStaircases {
  readonly stairs: Map<number, Staircase>;
  constructor(
    readonly directions: number[],
    opts: StaircaseOptions = {},
    private rnd: () => number = Math.random,
  ) {
    const o = { start: 0.3, maxReversals: 8, maxTrials: 50, ...opts };
    this.stairs = new Map(directions.map((d) => [d, new Staircase(o)]));
  }

  get done(): boolean {
    return [...this.stairs.values()].every((s) => s.done);
  }

  get trials(): number {
    return [...this.stairs.values()].reduce((a, s) => a + s.trials, 0);
  }

  /** Sıradaki denemenin yönü ve kontrastı. */
  next(): { deg: number; contrast: number } {
    const open = this.directions.filter((d) => !this.stairs.get(d)!.done);
    const deg = open[Math.floor(this.rnd() * open.length)];
    return { deg, contrast: this.stairs.get(deg)!.contrast };
  }

  respond(deg: number, correct: boolean): void {
    this.stairs.get(deg)?.respond(correct);
  }

  thresholds(): { deg: number; threshold: number }[] {
    return this.directions.map((deg) => ({ deg, threshold: this.stairs.get(deg)!.threshold() }));
  }
}

/** Eşiği en yüksek (görmesi en zor) yön. */
export function weakest(t: OrientationTest['thresholds']): { deg: number; threshold: number } | null {
  return t.length ? t.reduce((a, b) => (b.threshold > a.threshold ? b : a)) : null;
}

/** En zayıf ve en iyi yön eşiklerinin oranı (1 = fark yok). */
export function anisotropy(t: OrientationTest['thresholds']): number {
  if (t.length < 2) return 1;
  const v = t.map((x) => x.threshold);
  return Math.max(...v) / Math.min(...v);
}

/** Bu oranın üstü belirgin yön farkı sayılır. */
export const ANISOTROPY_LIMIT = 1.5;
