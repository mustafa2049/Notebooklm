import { clamp, pick, type Game } from '../engine';
import { drawFusionFrame, type DichopticPalette } from './anaglyph';

const COLS = 10;
const ROWS = 20;

type Shape = number[][];
const SHAPES: Shape[] = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
];

const rotate = (s: Shape): Shape => s[0].map((_, c) => s.map((row) => row[c]).reverse());

export interface BlocksState {
  board: number[][];
  shape: Shape;
  x: number;
  y: number;
}

export function collides(board: number[][], shape: Shape, x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  return false;
}

/** Dolan satırları siler ve silinen satır sayısını döndürür. */
export function clearLines(board: number[][]): number {
  let n = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(Boolean)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      n++;
      r++;
    }
  }
  return n;
}

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export function createBlocks(p: DichopticPalette): Game {
  let w = 0;
  let h = 0;
  let cell = 20;
  let ox = 0;
  let oy = 0;
  let board = emptyBoard();
  let shape = pick(SHAPES);
  let x = 3;
  let y = -1;
  let fall = 0;
  let lines = 0;
  let pieces = 0;
  let topOuts = 0;
  let score = 0;
  let drag: { x0: number; y0: number; moved: number; t: number } | null = null;

  const level = () => 1 + Math.floor(lines / 5);
  const interval = () => Math.max(0.15, 0.85 - (level() - 1) * 0.07);

  const spawn = () => {
    shape = pick(SHAPES);
    x = Math.floor((COLS - shape[0].length) / 2);
    y = -shape.length + 1;
    if (collides(board, shape, x, y)) {
      // Tahta doldu: temizle ve devam et (skor korunur).
      topOuts++;
      board = emptyBoard();
    }
  };

  const lock = () => {
    shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v && y + r >= 0) board[y + r][x + c] = 1;
      }),
    );
    pieces++;
    const n = clearLines(board);
    lines += n;
    score += [0, 40, 100, 300, 1200][n] * level();
    spawn();
  };

  const move = (dx: number) => {
    if (!collides(board, shape, x + dx, y)) x += dx;
  };
  const rot = () => {
    const r = rotate(shape);
    for (const k of [0, -1, 1, -2, 2]) {
      if (!collides(board, r, x + k, y)) {
        shape = r;
        x += k;
        return;
      }
    }
  };
  const softDrop = () => {
    if (!collides(board, shape, x, y + 1)) y++;
    else lock();
    fall = 0;
  };
  const hardDrop = () => {
    while (!collides(board, shape, x, y + 1)) y++;
    score += 2;
    lock();
    fall = 0;
  };

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cell = Math.floor(Math.min((w - 40) / COLS, (h - 40) / ROWS));
      ox = Math.floor((w - cell * COLS) / 2);
      oy = Math.floor((h - cell * ROWS) / 2);
    },
    update(dt) {
      fall += dt;
      if (fall >= interval()) {
        fall = 0;
        softDrop();
      }
    },
    draw(ctx) {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, w, h);
      drawFusionFrame(ctx, w, h, p);
      // Kuyu kenarları (iki göz)
      ctx.strokeStyle = p.both;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox - 2, oy - 2, cell * COLS + 4, cell * ROWS + 4);
      const pad = Math.max(1, cell * 0.08);
      // Yerleşmiş bloklar → sağlam göz
      ctx.fillStyle = p.fel;
      board.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v) ctx.fillRect(ox + c * cell + pad, oy + r * cell + pad, cell - 2 * pad, cell - 2 * pad);
        }),
      );
      // Düşen parça → tembel göz
      ctx.fillStyle = p.amb;
      shape.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v && y + r >= 0) ctx.fillRect(ox + (x + c) * cell + pad, oy + (y + r) * cell + pad, cell - 2 * pad, cell - 2 * pad);
        }),
      );
    },
    pointerDown(px, py) {
      drag = { x0: px, y0: py, moved: 0, t: performance.now() };
    },
    pointerMove(px, _py, down) {
      if (!down || !drag) return;
      const steps = Math.trunc((px - drag.x0) / cell) - drag.moved;
      for (let i = 0; i < Math.abs(steps); i++) move(Math.sign(steps));
      drag.moved += steps;
    },
    pointerUp(px, py) {
      if (!drag) return;
      const dy = py - drag.y0;
      const dx = px - drag.x0;
      const quick = performance.now() - drag.t < 400;
      if (dy > cell * 3 && quick && Math.abs(dy) > Math.abs(dx)) hardDrop();
      else if (drag.moved === 0 && Math.hypot(dx, dy) < 15) rot();
      drag = null;
    },
    key(k) {
      if (k === 'ArrowLeft') move(-1);
      else if (k === 'ArrowRight') move(1);
      else if (k === 'ArrowUp') rot();
      else if (k === 'ArrowDown') softDrop();
      else if (k === ' ') hardDrop();
    },
    stats() {
      // Verimlilik: her satır 10 hücre, her parça 4 hücre. Taşmalar cezalandırılır.
      const eff = pieces ? (lines * 10) / (pieces * 4) : 0;
      return { score, level: level(), performance: clamp(eff / (1 + topOuts * 0.5), 0, 1) };
    },
  };
}
