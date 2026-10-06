import { drawFlashes, LevelStaircase, pick, type Flash, type Game } from '../engine';

export type Dir = 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown';
const DIRS: Dir[] = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
const ANGLE: Record<Dir, number> = {
  ArrowRight: 0,
  ArrowDown: Math.PI / 2,
  ArrowLeft: Math.PI,
  ArrowUp: -Math.PI / 2,
};

/** Seviyeye karşılık gelen harf yüksekliği (CSS piksel). */
export const eSizeForLevel = (level: number) => Math.max(5, 140 * Math.pow(0.84, level - 1));

/** Bacakları `dir` yönüne bakan, 5×5 ızgaralı E optotipi çizer. */
export function drawE(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: Dir, color = '#000') {
  const u = size / 5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ANGLE[dir]);
  ctx.fillStyle = color;
  const l = -size / 2;
  ctx.fillRect(l, l, u, size); // sırt
  ctx.fillRect(l, l, size, u); // üst bacak
  ctx.fillRect(l, l + 2 * u, size, u); // orta bacak
  ctx.fillRect(l, l + 4 * u, size, u); // alt bacak
  ctx.restore();
}

export function createTumblingE(): Game {
  const stair = new LevelStaircase(1, 1, 25, 2);
  let w = 0;
  let h = 0;
  let dir: Dir = pick(DIRS);
  let score = 0;
  let best = 1;
  let flashes: Flash[] = [];
  let lastDt = 0;
  let swipe: [number, number] | null = null;

  const answer = (d: Dir) => {
    const ok = d === dir;
    flashes.push({ x: w / 2, y: h / 2, t: 0, ok });
    if (ok) {
      score += stair.level * 5;
      stair.hit();
      best = Math.max(best, stair.level);
    } else stair.miss();
    let nd = pick(DIRS);
    while (nd === dir) nd = pick(DIRS);
    dir = nd;
  };

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    update(dt) {
      lastDt = dt;
    },
    draw(ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      drawE(ctx, w / 2, h / 2, Math.min(eSizeForLevel(stair.level), Math.min(w, h) * 0.6), dir);
      ctx.fillStyle = '#888';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Kaydır ya da ok tuşlarını kullan', w / 2, h - 16);
      flashes = drawFlashes(ctx, flashes, lastDt);
    },
    pointerDown(x, y) {
      swipe = [x, y];
    },
    pointerUp(x, y) {
      if (!swipe) return;
      const dx = x - swipe[0];
      const dy = y - swipe[1];
      swipe = null;
      if (Math.hypot(dx, dy) < 30) return;
      answer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp');
    },
    key(k) {
      if ((DIRS as string[]).includes(k)) answer(k as Dir);
    },
    stats() {
      return { score, level: best, performance: stair.accuracy };
    },
  };
}
