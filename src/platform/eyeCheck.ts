/**
 * Kamera ile bant kontrolü (saf fonksiyonlar).
 *
 * Fikir: iki göz açıkken, gözlerden biri aynalandığında iki göz bölgesi birbirine çok benzer
 * (yüz simetrisi). Göz bantla ya da elle kapatılınca o bölge göze benzemez ve benzerlik düşer.
 * Bu yüzden kalibrasyon gerekmez; ışık farkları normalize çapraz korelasyonla giderilir.
 */
import type { PatchCheckLevel } from '../model/types';

export interface Pt {
  x: number;
  y: number;
}

/** Görüntüyü gri tonlamaya çevirir (RGBA → 0–255). */
export function toGray(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
  return g;
}

function sample(g: Float32Array, w: number, h: number, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(x)));
  const y0 = Math.max(0, Math.min(h - 2, Math.floor(y)));
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const i = y0 * w + x0;
  return g[i] * (1 - fx) * (1 - fy) + g[i + 1] * fx * (1 - fy) + g[i + w] * (1 - fx) * fy + g[i + w + 1] * fx * fy;
}

/**
 * Göz bölgesini dış köşeden iç köşeye doğru, göz eksenine hizalı olarak örnekler.
 * İki göz de "dış köşe solda" kesildiği için biri diğerinin aynası olur; aşağı yönü her zaman korunur.
 */
export function eyeCrop(g: Float32Array, w: number, h: number, outer: Pt, inner: Pt, outW = 32, outH = 16): Float32Array {
  const ux = inner.x - outer.x;
  const uy = inner.y - outer.y;
  const len = Math.hypot(ux, uy) || 1;
  const ax = ux / len;
  const ay = uy / len;
  let vx = -ay;
  let vy = ax;
  if (vy < 0) {
    vx = -vx;
    vy = -vy;
  }
  const cx = (outer.x + inner.x) / 2;
  const cy = (outer.y + inner.y) / 2;
  const W = len * 1.4;
  const H = len * 0.7;
  const out = new Float32Array(outW * outH);
  for (let j = 0; j < outH; j++) {
    const t = ((j + 0.5) / outH - 0.5) * H;
    for (let i = 0; i < outW; i++) {
      const s = ((i + 0.5) / outW - 0.5) * W;
      out[j * outW + i] = sample(g, w, h, cx + ax * s + vx * t, cy + ay * s + vy * t);
    }
  }
  return out;
}

/** Normalize çapraz korelasyon (−1…1). Desensiz (düz) bölgede 0 döner. */
export function ncc(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  // Standart sapma 2 gri düzeyin altındaysa bölge düz kabul edilir.
  if (saa / n < 4 || sbb / n < 4) return 0;
  return sab / Math.sqrt(saa * sbb);
}

/** MediaPipe yüz noktaları: kişinin sağ gözü 33 (dış) / 133 (iç), sol gözü 263 (dış) / 362 (iç). */
export const EYE_CORNERS = { right: [33, 133], left: [263, 362] } as const;

/** İki göz bölgesinin (biri aynalanmış) benzerliği; yüz noktaları yoksa null. */
export function eyeSimilarity(g: Float32Array, w: number, h: number, landmarks: Pt[]): number | null {
  if (landmarks.length < 468) return null;
  const px = (i: number): Pt => ({ x: landmarks[i].x * w, y: landmarks[i].y * h });
  const r = eyeCrop(g, w, h, px(EYE_CORNERS.right[0]), px(EYE_CORNERS.right[1]));
  const l = eyeCrop(g, w, h, px(EYE_CORNERS.left[0]), px(EYE_CORNERS.left[1]));
  return ncc(r, l);
}

/** Hassasiyet → "göz açık" sayılacak en düşük benzerlik (yüksek hassasiyet daha kolay uyarır). */
export const PATCH_THRESHOLDS: Record<PatchCheckLevel, number> = { low: 0.55, medium: 0.45, high: 0.35 };

export type PatchState = 'unknown' | 'covered' | 'open';

/**
 * Zaman içinde karar verir: yüz görünürken benzerlik eşiğin üstünde `holdMs` boyunca kalırsa
 * kapalı olması gereken göz açık sayılır. Kısa göz kırpmaları, yüz kayıpları ve tek tük ölçümler uyarı doğurmaz.
 */
export class PatchMonitor {
  private openSince: number | null = null;
  private snoozeUntil = 0;
  private recent: number[] = [];
  state: PatchState = 'unknown';

  constructor(
    public threshold: number,
    private holdMs = 3000,
  ) {}

  /** Yeni ölçüm; uyarı verilmesi gerekiyorsa true döner. */
  update(t: number, similarity: number | null): boolean {
    if (similarity == null) {
      this.openSince = null;
      this.recent = [];
      this.state = 'unknown';
      return false;
    }
    this.recent.push(similarity);
    if (this.recent.length > 5) this.recent.shift();
    const med = [...this.recent].sort((a, b) => a - b)[Math.floor(this.recent.length / 2)];
    if (med >= this.threshold) {
      this.state = 'open';
      this.openSince ??= t;
    } else {
      this.state = 'covered';
      this.openSince = null;
    }
    return this.openSince != null && t - this.openSince >= this.holdMs && t >= this.snoozeUntil;
  }

  /** "Bant takılı, devam" sonrası bir süre uyarma. */
  snooze(t: number, ms = 60_000): void {
    this.snoozeUntil = t + ms;
    this.openSince = null;
  }
}
