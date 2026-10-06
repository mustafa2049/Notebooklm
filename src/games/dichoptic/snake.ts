import { sfx } from '../../platform/sound';
import type { Game } from '../engine';
import { drawFusionFrame, type DichopticPalette } from './anaglyph';
import { newSnake, step, turn, type Dir, type SnakeState } from './snakeLogic';

const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

export function createSnake(p: DichopticPalette): Game {
  let w = 0;
  let h = 0;
  let cell = 20;
  let ox = 0;
  let oy = 0;
  let s: SnakeState | null = null;
  let acc = 0;
  let eaten = 0;
  let crashes = 0;
  let score = 0;
  let swipe: [number, number] | null = null;

  const level = () => 1 + Math.floor(eaten / 5);
  const interval = () => Math.max(0.09, 0.24 - (level() - 1) * 0.015);

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      const cols = 14;
      cell = Math.floor((w - 40) / cols);
      const rows = Math.max(10, Math.floor((h - 40) / cell));
      if (!s) s = newSnake(cols, rows);
      else {
        // Ekran boyutu değişince ızgarayı yeniden kur
        s = s.rows === rows ? s : newSnake(cols, rows);
      }
      ox = Math.floor((w - cell * s.cols) / 2);
      oy = Math.floor((h - cell * s.rows) / 2);
    },
    update(dt) {
      if (!s) return;
      acc += dt;
      while (acc >= interval()) {
        acc -= interval();
        const lv = level();
        const r = step(s);
        if (r === 'eat') {
          eaten++;
          score += 10 * level();
          sfx(level() > lv ? 'level' : 'hit');
        } else if (r === 'crash') {
          crashes++;
          score = Math.max(0, score - 15);
          sfx('miss');
        }
      }
    },
    draw(ctx) {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, w, h);
      drawFusionFrame(ctx, w, h, p);
      if (!s) return;
      ctx.strokeStyle = p.both;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox - 2, oy - 2, cell * s.cols + 4, cell * s.rows + 4);
      const pad = Math.max(1, cell * 0.1);
      // Gövde → sağlam göz
      ctx.fillStyle = p.fel;
      s.body.slice(1).forEach(([x, y]) => ctx.fillRect(ox + x * cell + pad, oy + y * cell + pad, cell - 2 * pad, cell - 2 * pad));
      // Baş ve yem → tembel göz
      ctx.fillStyle = p.amb;
      const [hx, hy] = s.body[0];
      ctx.fillRect(ox + hx * cell + pad / 2, oy + hy * cell + pad / 2, cell - pad, cell - pad);
      const [fx, fy] = s.food;
      ctx.beginPath();
      ctx.arc(ox + (fx + 0.5) * cell, oy + (fy + 0.5) * cell, cell * 0.36, 0, Math.PI * 2);
      ctx.fill();
    },
    pointerDown(x, y) {
      swipe = [x, y];
    },
    pointerMove(x, y, down) {
      if (!down || !swipe || !s) return;
      const dx = x - swipe[0];
      const dy = y - swipe[1];
      if (Math.hypot(dx, dy) < 24) return;
      turn(s, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      swipe = [x, y];
    },
    pointerUp() {
      swipe = null;
    },
    key(k) {
      if (s && KEYS[k]) turn(s, KEYS[k]);
    },
    stats() {
      return { score, level: level(), performance: eaten + crashes ? eaten / (eaten + crashes) : 0 };
    },
  };
}
