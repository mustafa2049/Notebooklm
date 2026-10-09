/**
 * Göz kayması fotoğraf günlüğü için saf hesaplar: hizalama uyarıları, kırpma alanı ve
 * kornea ışık yansımasının (Hirschberg yöntemindeki gibi) iris merkezine göre konumu.
 */
import { IRIS_MM } from '../../platform/distance';
import type { Eye, ReflexOffset } from '../../model/types';

export interface Pt {
  x: number;
  y: number;
}

// MediaPipe yüz noktaları
const R_OUT = 33;
const R_IN = 133;
const L_OUT = 263;
const NOSE_TIP = 1;
const IRIS_A = [468, 469, 471] as const; // merkez, yatay iki kenar
const IRIS_B = [473, 474, 476] as const;

const px = (lm: Pt[], i: number, w: number, h: number): Pt => ({ x: lm[i].x * w, y: lm[i].y * h });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export interface Alignment {
  ok: boolean;
  issues: string[];
  /** Baş eğikliği (derece). */
  rollDeg: number;
}

/** Fotoğrafın her seferinde aynı açıdan çekilmesi için uyarılar. */
export function alignmentIssues(lm: Pt[], w: number, h: number, distanceCm: number | null, targetCm = 40): Alignment {
  const issues: string[] = [];
  const ro = px(lm, R_OUT, w, h);
  const lo = px(lm, L_OUT, w, h);
  const eyeDist = dist(ro, lo);
  const mid = { x: (ro.x + lo.x) / 2, y: (ro.y + lo.y) / 2 };
  const rollDeg = (Math.atan2(lo.y - ro.y, lo.x - ro.x) * 180) / Math.PI;
  if (Math.abs(rollDeg) > 4) issues.push('Başını dik tut (yana eğik).');
  const nose = px(lm, NOSE_TIP, w, h);
  if (Math.abs(nose.x - mid.x) / eyeDist > 0.08) issues.push('Yüzünü tam karşıya çevir.');
  if (mid.x < w * 0.35 || mid.x > w * 0.65 || mid.y < h * 0.25 || mid.y > h * 0.65) issues.push('Yüzünü ekranın ortasına getir.');
  if (distanceCm != null) {
    if (distanceCm < targetCm * 0.8) issues.push('Biraz uzaklaş.');
    else if (distanceCm > targetCm * 1.25) issues.push('Biraz yaklaş.');
  }
  return { ok: issues.length === 0, issues, rollDeg };
}

/** Kaydedilecek bölge: iki gözü içeren yatay şerit (piksel). */
export function eyeBand(lm: Pt[], w: number, h: number): { x: number; y: number; w: number; h: number } {
  const ro = px(lm, R_OUT, w, h);
  const lo = px(lm, L_OUT, w, h);
  const d = dist(ro, lo);
  const cx = (ro.x + lo.x) / 2;
  const cy = (ro.y + lo.y) / 2;
  const bw = Math.min(w, d * 1.9);
  const bh = Math.min(h, d * 0.75);
  const x = Math.max(0, Math.min(w - bw, cx - bw / 2));
  const y = Math.max(0, Math.min(h - bh, cy - bh / 2));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(bw), h: Math.round(bh) };
}

export interface IrisInfo {
  center: Pt;
  radius: number;
}

/** Kişinin sağ ve sol gözünün irisi (göz köşelerine yakınlığa göre eşleştirilir). */
export function irises(lm: Pt[], w: number, h: number): Record<Eye, IrisInfo> | null {
  if (lm.length < 478) return null;
  const iris = (ids: readonly number[]): IrisInfo => ({
    center: px(lm, ids[0], w, h),
    radius: dist(px(lm, ids[1], w, h), px(lm, ids[2], w, h)) / 2,
  });
  const a = iris(IRIS_A);
  const b = iris(IRIS_B);
  const rMid = { x: (px(lm, R_OUT, w, h).x + px(lm, R_IN, w, h).x) / 2, y: px(lm, R_OUT, w, h).y };
  const aIsRight = dist(a.center, rMid) < dist(b.center, rMid);
  return aIsRight ? { right: a, left: b } : { right: b, left: a };
}

/**
 * İris içindeki en parlak lekenin (ekran ya da flaş yansıması) iris merkezine göre konumu (mm).
 * `dx` pozitifse yansıma kişinin burnuna doğru, `dy` pozitifse aşağıdadır. Bulunamazsa null.
 */
export function findReflex(g: Float32Array, w: number, h: number, iris: IrisInfo, eye: Eye): ReflexOffset | null {
  const r = iris.radius * 0.9;
  if (r < 3) return null;
  let max = 0;
  const x0 = Math.max(0, Math.floor(iris.center.x - r));
  const x1 = Math.min(w - 1, Math.ceil(iris.center.x + r));
  const y0 = Math.max(0, Math.floor(iris.center.y - r));
  const y1 = Math.min(h - 1, Math.ceil(iris.center.y + r));
  const inside = (x: number, y: number) => (x - iris.center.x) ** 2 + (y - iris.center.y) ** 2 <= r * r;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) max = Math.max(max, g[y * w + x]);
  if (max < 170) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  let total = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      total++;
      if (g[y * w + x] >= max - 25) {
        sx += x;
        sy += y;
        n++;
      }
    }
  // Parlak alan irisin çok büyük kısmını kaplıyorsa (aşırı pozlama) güvenilmez.
  if (!n || n > total * 0.25) return null;
  const mmPerPx = IRIS_MM / (2 * iris.radius);
  const dxImg = sx / n - iris.center.x;
  const dyImg = sy / n - iris.center.y;
  // Ham (aynalanmamış) karede kişinin sağ gözünün burun tarafı +x, sol gözününki −x yönündedir.
  const nasal = eye === 'right' ? dxImg : -dxImg;
  return { dx: Math.round(nasal * mmPerPx * 100) / 100, dy: Math.round(dyImg * mmPerPx * 100) / 100 };
}

/**
 * İki gözdeki yansıma farkı (mm). Sağlıklı hizalı gözlerde yansımalar simetriktir (ikisi de hafif burun tarafında).
 * Kaba kural: 1 mm fark ≈ 7° (≈ 15 prizma diyoptri). Bu yalnızca bilgi içindir, tanı koymaz.
 */
export function reflexAsymmetry(right: ReflexOffset | null, left: ReflexOffset | null): { dx: number; dy: number; deg: number } | null {
  if (!right || !left) return null;
  const dx = Math.round((right.dx - left.dx) * 100) / 100;
  const dy = Math.round((right.dy - left.dy) * 100) / 100;
  return { dx, dy, deg: Math.round(Math.hypot(dx, dy) * 7) };
}
