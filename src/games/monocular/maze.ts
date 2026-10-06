import { sfx } from '../../platform/sound';
import { clamp, drawFlashes, type Flash, type Game } from '../engine';

/** Hücre geçiş bitleri */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const DIRS = [
  { bit: N, dx: 0, dy: -1, opp: S },
  { bit: E, dx: 1, dy: 0, opp: W },
  { bit: S, dx: 0, dy: 1, opp: N },
  { bit: W, dx: -1, dy: 0, opp: E },
];

export interface Maze {
  cols: number;
  rows: number;
  /** Her hücre için açık geçişlerin bit maskesi. */
  cells: number[];
}

/** Yinelemeli derinlik öncelikli arama ile mükemmel labirent (her hücre çifti arasında tek yol). */
export function generateMaze(cols: number, rows: number, rnd: () => number = Math.random): Maze {
  const cells = new Array(cols * rows).fill(0);
  const seen = new Array(cols * rows).fill(false);
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    const options = DIRS.filter((d) => {
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny * cols + nx];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(rnd() * options.length)];
    const next = (cy + d.dy) * cols + cx + d.dx;
    cells[cur] |= d.bit;
    cells[next] |= d.opp;
    seen[next] = true;
    stack.push(next);
  }
  return { cols, rows, cells };
}

/** İki komşu hücre arasında geçiş var mı? */
export function canMove(m: Maze, from: number, dx: number, dy: number): boolean {
  const d = DIRS.find((k) => k.dx === dx && k.dy === dy);
  return !!d && (m.cells[from] & d.bit) !== 0;
}

export function createMaze(): Game {
  let level = 1;
  let w = 0;
  let h = 0;
  let maze: Maze = generateMaze(5, 5);
  let pos = 0;
  let trail: number[] = [0];
  let cell = 20;
  let ox = 0;
  let oy = 0;
  let grabbed = false;
  let hits = 0;
  let solved = 0;
  let wallHits = 0;
  let cooldown = 0;
  let score = 0;
  let flashes: Flash[] = [];
  let lastDt = 0;

  const layout = () => {
    cell = Math.floor(Math.min((w - 24) / maze.cols, (h - 24) / maze.rows));
    ox = Math.floor((w - cell * maze.cols) / 2);
    oy = Math.floor((h - cell * maze.rows) / 2);
  };

  const newMaze = () => {
    const cols = Math.min(20, 4 + level);
    const aspect = h > 0 ? h / w : 1.5;
    const rows = clamp(Math.round(cols * aspect), 4, 30);
    maze = generateMaze(cols, rows);
    pos = 0;
    trail = [0];
    hits = 0;
    layout();
  };

  const center = (i: number) => [ox + (i % maze.cols + 0.5) * cell, oy + (Math.floor(i / maze.cols) + 0.5) * cell] as const;
  const goal = () => maze.cols * maze.rows - 1;

  const tryMove = (dx: number, dy: number) => {
    const x = pos % maze.cols;
    const y = Math.floor(pos / maze.cols);
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= maze.cols || ny >= maze.rows) return;
    if (canMove(maze, pos, dx, dy)) {
      pos = ny * maze.cols + nx;
      // Geri dönülürse iz kısalır
      if (trail.length > 1 && trail[trail.length - 2] === pos) trail.pop();
      else trail.push(pos);
      if (pos === goal()) {
        solved++;
        score += 20 * level;
        const [fx, fy] = center(pos);
        flashes.push({ x: fx, y: fy, t: 0, ok: true });
        sfx('level');
        level = clamp(hits <= 2 ? level + 1 : level, 1, 16);
        setTimeout(newMaze, 350);
      }
    } else if (cooldown <= 0) {
      hits++;
      wallHits++;
      cooldown = 0.6;
      const [fx, fy] = center(pos);
      flashes.push({ x: fx, y: fy, t: 0, ok: false });
      sfx('miss');
    }
  };

  const toCell = (px: number, py: number) => {
    const x = Math.floor((px - ox) / cell);
    const y = Math.floor((py - oy) / cell);
    return x >= 0 && y >= 0 && x < maze.cols && y < maze.rows ? [x, y] : null;
  };

  const drag = (x: number, y: number) => {
    const c = toCell(x, y);
    if (!c) return;
    // Hızlı sürüklemede birkaç hücreyi adım adım geç; duvar varsa dur.
    for (let i = 0; i < 4; i++) {
      const dx = c[0] - (pos % maze.cols);
      const dy = c[1] - Math.floor(pos / maze.cols);
      if (!dx && !dy) return;
      const sx = Math.sign(dx);
      const sy = Math.sign(dy);
      const [p, q] = Math.abs(dx) >= Math.abs(dy) ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]];
      if (canMove(maze, pos, p[0], p[1])) tryMove(p[0], p[1]);
      else if ((q[0] || q[1]) && canMove(maze, pos, q[0], q[1])) tryMove(q[0], q[1]);
      else {
        if (Math.abs(dx) + Math.abs(dy) === 1) tryMove(dx, dy); // duvara çarptı
        return;
      }
      if (pos === goal()) return;
    }
  };

  return {
    resize(nw, nh) {
      const first = w === 0;
      w = nw;
      h = nh;
      if (first) newMaze();
      else layout();
    },
    update(dt) {
      lastDt = dt;
      cooldown -= dt;
    },
    draw(ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      // Çıkış
      const [gx, gy] = center(goal());
      ctx.fillStyle = '#2da44e';
      ctx.fillRect(gx - cell / 2 + 1, gy - cell / 2 + 1, cell - 2, cell - 2);
      // İz
      ctx.strokeStyle = '#1f6feb';
      ctx.lineWidth = Math.max(1.5, cell * 0.12);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      trail.forEach((c, i) => {
        const [x, y] = center(c);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
      // Duvarlar: seviye arttıkça incelir
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(1, cell * (0.14 - level * 0.004));
      ctx.lineCap = 'square';
      ctx.beginPath();
      for (let i = 0; i < maze.cells.length; i++) {
        const x = ox + (i % maze.cols) * cell;
        const y = oy + Math.floor(i / maze.cols) * cell;
        const c = maze.cells[i];
        if (!(c & N)) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + cell, y);
        }
        if (!(c & W)) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cell);
        }
        if (i % maze.cols === maze.cols - 1 && !(c & E)) {
          ctx.moveTo(x + cell, y);
          ctx.lineTo(x + cell, y + cell);
        }
        if (Math.floor(i / maze.cols) === maze.rows - 1 && !(c & S)) {
          ctx.moveTo(x, y + cell);
          ctx.lineTo(x + cell, y + cell);
        }
      }
      ctx.stroke();
      // Oyuncu
      const [px, py] = center(pos);
      ctx.fillStyle = '#d1242f';
      ctx.beginPath();
      ctx.arc(px, py, Math.max(3, cell * 0.28), 0, Math.PI * 2);
      ctx.fill();
      flashes = drawFlashes(ctx, flashes, lastDt);
    },
    pointerDown(x, y) {
      const c = toCell(x, y);
      grabbed = !!c && Math.abs(c[0] - (pos % maze.cols)) + Math.abs(c[1] - Math.floor(pos / maze.cols)) <= 1;
      if (grabbed) drag(x, y);
    },
    pointerMove(x, y, down) {
      if (down && grabbed) drag(x, y);
    },
    pointerUp() {
      grabbed = false;
    },
    key(k) {
      if (k === 'ArrowLeft') tryMove(-1, 0);
      else if (k === 'ArrowRight') tryMove(1, 0);
      else if (k === 'ArrowUp') tryMove(0, -1);
      else if (k === 'ArrowDown') tryMove(0, 1);
    },
    stats() {
      const perf = solved + wallHits ? solved / (solved + wallHits * 0.25) : 0;
      return { score, level, performance: clamp(perf, 0, 1) };
    },
  };
}
