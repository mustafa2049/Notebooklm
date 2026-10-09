import { describe, expect, it } from 'vitest';
import { alignmentIssues, eyeBand, findReflex, irises, reflexAsymmetry } from './photo';

const W = 400;
const H = 300;
const lm = () => {
  const p = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (i: number, x: number, y: number) => (p[i] = { x: x / W, y: y / H });
  set(33, 140, 120); // sağ göz dış (görüntüde solda)
  set(133, 180, 120);
  set(362, 220, 120);
  set(263, 260, 120); // sol göz dış
  set(1, 200, 160); // burun ucu
  set(468, 160, 120); // iris A merkez (sağ göz)
  set(469, 150, 120);
  set(471, 170, 120);
  set(473, 240, 120); // iris B merkez (sol göz)
  set(474, 250, 120);
  set(476, 230, 120);
  return p;
};

describe('alignment photos', () => {
  it('accepts a straight, centered face and flags tilt, turn and distance', () => {
    expect(alignmentIssues(lm(), W, H, 40).ok).toBe(true);
    const tilted = lm();
    tilted[263] = { x: 260 / W, y: 140 / H };
    expect(alignmentIssues(tilted, W, H, 40).issues.join()).toMatch(/eğik/);
    const turned = lm();
    turned[1] = { x: 230 / W, y: 160 / H };
    expect(alignmentIssues(turned, W, H, 40).issues.join()).toMatch(/karşıya/);
    expect(alignmentIssues(lm(), W, H, 25).issues).toContain('Biraz uzaklaş.');
    expect(alignmentIssues(lm(), W, H, 60).issues).toContain('Biraz yaklaş.');
  });

  it('crops a band around both eyes', () => {
    const b = eyeBand(lm(), W, H);
    expect(b.x).toBeLessThanOrEqual(140);
    expect(b.x + b.w).toBeGreaterThanOrEqual(260);
    expect(b.y).toBeLessThan(120);
    expect(b.y + b.h).toBeGreaterThan(120);
  });

  it('matches irises to eyes and finds the light reflex in mm', () => {
    const ir = irises(lm(), W, H)!;
    expect(ir.right.center.x).toBe(160);
    expect(ir.left.center.x).toBe(240);
    expect(ir.right.radius).toBe(10);
    const g = new Float32Array(W * H).fill(60);
    // Sağ gözde yansıma 2 px burun tarafında (+x), sol gözde 2 px burun tarafında (−x) ve 1 px aşağıda
    const spot = (cx: number, cy: number) => {
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) g[y * W + x] = 250;
    };
    spot(162, 120);
    spot(238, 121);
    const r = findReflex(g, W, H, ir.right, 'right')!;
    const l = findReflex(g, W, H, ir.left, 'left')!;
    expect(r.dx).toBeCloseTo(1.17, 2); // 2 px × 11,7 / 20
    expect(l.dx).toBeCloseTo(1.17, 2);
    expect(l.dy).toBeCloseTo(0.585, 1);
    expect(reflexAsymmetry(r, l)).toMatchObject({ dx: 0, deg: 4 });
    // Yansıma yoksa null
    expect(findReflex(new Float32Array(W * H).fill(60), W, H, ir.right, 'right')).toBeNull();
    expect(reflexAsymmetry(r, null)).toBeNull();
  });
});
