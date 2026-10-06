import { describe, expect, it } from 'vitest';
import { canMove, E, generateMaze, N, S, W } from './maze';

describe('generateMaze', () => {
  it('produces a perfect maze: every cell reachable, passages = cells - 1', () => {
    for (const [c, r] of [
      [5, 5],
      [12, 20],
      [1, 7],
    ]) {
      const m = generateMaze(c, r);
      const seen = new Set([0]);
      const queue = [0];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (!canMove(m, cur, dx, dy)) continue;
          const next = cur + dy * c + dx;
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      expect(seen.size).toBe(c * r);
      const bits = m.cells.reduce((a, v) => a + [N, E, S, W].filter((b) => v & b).length, 0);
      expect(bits / 2).toBe(c * r - 1);
    }
  });

  it('never opens passages through the outer border', () => {
    const m = generateMaze(8, 6);
    m.cells.forEach((v, i) => {
      const x = i % 8;
      const y = Math.floor(i / 8);
      if (y === 0) expect(v & N).toBe(0);
      if (y === 5) expect(v & S).toBe(0);
      if (x === 0) expect(v & W).toBe(0);
      if (x === 7) expect(v & E).toBe(0);
    });
  });
});
