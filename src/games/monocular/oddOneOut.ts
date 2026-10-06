import { drawFlashes, LevelStaircase, pick, type Flash, type Game } from '../engine';

/** Birbirine benzeyen harf çiftleri: [hedef, çeldirici]. */
const PAIRS: [string, string][] = [
  ['O', 'C'],
  ['E', 'F'],
  ['P', 'R'],
  ['C', 'G'],
  ['b', 'd'],
  ['p', 'q'],
  ['M', 'N'],
  ['6', '9'],
  ['3', '8'],
  ['I', 'L'],
  ['V', 'Y'],
  ['n', 'h'],
];

export function createOddOneOut(): Game {
  const stair = new LevelStaircase(1, 1, 20, 2);
  let w = 0;
  let h = 0;
  let flashes: Flash[] = [];
  let score = 0;
  let round = { grid: 3, size: 60, gap: 1.6, target: 0, pair: PAIRS[0] };
  let cells: { x: number; y: number }[] = [];
  let lastDt = 0;
  let started = false;

  const layout = () => {
    const lv = stair.level;
    const grid = Math.min(9, 3 + Math.floor(lv / 2));
    // Seviye arttıkça harfler küçülür ve birbirine yaklaşır (kalabalık etkisi).
    const maxSize = Math.min(w, h - 20) / (grid * 1.7);
    const size = Math.max(12, Math.min(72, maxSize) * Math.pow(0.9, lv - 1));
    const gap = Math.max(1.15, 1.7 - lv * 0.03);
    round = { ...round, grid, size, gap };
    const step = size * gap;
    const ox = w / 2 - ((grid - 1) * step) / 2;
    const oy = h / 2 - ((grid - 1) * step) / 2;
    cells = [];
    for (let r = 0; r < grid; r++) for (let c = 0; c < grid; c++) cells.push({ x: ox + c * step, y: oy + r * step });
  };

  const newRound = () => {
    round.pair = pick(PAIRS);
    layout();
    round.target = Math.floor(Math.random() * cells.length);
  };

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      if (!started) {
        started = true;
        newRound();
        return;
      }
      const t = round.target;
      layout();
      round.target = Math.min(t, cells.length - 1);
    },
    update(dt) {
      lastDt = dt;
    },
    draw(ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${round.size}px ui-monospace, Menlo, Consolas, monospace`;
      cells.forEach((c, i) => ctx.fillText(i === round.target ? round.pair[0] : round.pair[1], c.x, c.y));
      flashes = drawFlashes(ctx, flashes, lastDt);
    },
    pointerDown(x, y) {
      let best = -1;
      let bestD = Infinity;
      cells.forEach((c, i) => {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best < 0 || bestD > round.size * round.gap) return;
      const ok = best === round.target;
      flashes.push({ x: cells[best].x, y: cells[best].y, t: 0, ok });
      if (ok) {
        score += 10 * stair.level;
        stair.hit();
        newRound();
      } else {
        stair.miss();
      }
    },
    stats() {
      return { score, level: stair.level, performance: stair.accuracy };
    },
  };
}
