import { describe, expect, it } from 'vitest';
import { eyeCrop, eyeSimilarity, ncc, PatchMonitor, PATCH_THRESHOLDS } from './eyeCheck';

const W = 200;
const H = 100;

/** Simetrik sentetik yüz: iki "göz" (beyaz alan + koyu iris + kirpik çizgisi); istenirse bir göz düz bantla kapatılır. */
function face(patch: 'none' | 'left' | 'right', irisShift = 0): Float32Array {
  const g = new Float32Array(W * H).fill(150);
  const eye = (cx: number, dir: number, covered: boolean) => {
    for (let y = 35; y < 65; y++)
      for (let x = cx - 25; x < cx + 25; x++) {
        const dx = (x - cx) * dir;
        const dy = y - 50;
        let v = 150;
        if ((dx * dx) / 400 + (dy * dy) / 64 < 1) v = 230; // sklera
        if ((dx - 4 - irisShift) ** 2 + dy * dy < 36) v = 40; // iris (burun tarafına yakın)
        if (dy === -8 && Math.abs(dx) < 20) v = 20; // üst kirpik
        if (covered) v = 190; // ten rengi bant
        g[y * W + x] = v;
      }
  };
  // Görüntüde solda kişinin sağ gözü, sağda sol gözü durur; iris ikisinde de burna yakın.
  eye(60, 1, patch === 'right');
  eye(140, -1, patch === 'left');
  return g;
}

// Köşe noktaları: sağ göz dış 33 (x=40), iç 133 (x=80); sol göz dış 263 (x=160), iç 362 (x=120)
const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
landmarks[33] = { x: 40 / W, y: 0.5 };
landmarks[133] = { x: 80 / W, y: 0.5 };
landmarks[263] = { x: 160 / W, y: 0.5 };
landmarks[362] = { x: 120 / W, y: 0.5 };

describe('eye check', () => {
  it('crops mirror-symmetric eyes into near-identical patches', () => {
    const g = face('none');
    const r = eyeCrop(g, W, H, { x: 40, y: 50 }, { x: 80, y: 50 });
    const l = eyeCrop(g, W, H, { x: 160, y: 50 }, { x: 120, y: 50 });
    expect(ncc(r, l)).toBeGreaterThan(0.95);
  });

  it('drops similarity when one eye is patched, and tolerates small gaze changes', () => {
    expect(eyeSimilarity(face('none'), W, H, landmarks)!).toBeGreaterThan(0.9);
    expect(eyeSimilarity(face('none', 2), W, H, landmarks)!).toBeGreaterThan(PATCH_THRESHOLDS.low);
    expect(eyeSimilarity(face('left'), W, H, landmarks)!).toBeLessThan(0.2);
    expect(eyeSimilarity(face('right'), W, H, landmarks)!).toBeLessThan(0.2);
    expect(eyeSimilarity(face('none'), W, H, [])).toBeNull();
  });

  it('returns 0 for flat regions', () => {
    expect(ncc(new Float32Array(10).fill(5), new Float32Array(10).map((_, i) => i * 10))).toBe(0);
  });

  it('alerts only after the eye stays open for the hold time, with snooze', () => {
    const m = new PatchMonitor(0.45, 3000);
    expect(m.update(0, 0.1)).toBe(false);
    expect(m.state).toBe('covered');
    expect(m.update(200, 0.8)).toBe(false); // ortanca hâlâ düşük olabilir
    for (let t = 400; t < 3000; t += 200) expect(m.update(t, 0.8)).toBe(false);
    expect(m.state).toBe('open');
    let alerted = false;
    for (let t = 3000; t < 4000; t += 200) alerted ||= m.update(t, 0.8);
    expect(alerted).toBe(true);
    m.snooze(4000, 60_000);
    let again = false;
    for (let t = 4200; t < 30_000; t += 200) again ||= m.update(t, 0.8);
    expect(again).toBe(false);
    // Yüz kaybolunca sayaç sıfırlanır
    expect(m.update(70_000, null)).toBe(false);
    expect(m.state).toBe('unknown');
  });
});
