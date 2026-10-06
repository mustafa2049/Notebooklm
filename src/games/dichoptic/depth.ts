import { renderRds, squareMask } from '../../features/stereo/render';
import { drawFlashes, LevelStaircase, type Flash, type Game } from '../engine';
import { drawFusionFrame, type DichopticPalette } from './anaglyph';

const GRID = 3;

/**
 * Derinlik Avı: rastgele noktalar arasında 3×3 yerden birinde havada yüzen bir kare var.
 * Kare yalnızca iki gözün görüntüsü birleşince (stereo görme) fark edilir.
 * Seviye arttıkça kayma (disparite) ve kare küçülür.
 */
export function createDepth(p: DichopticPalette): Game {
  const stair = new LevelStaircase(1, 1, 14, 2);
  let w = 0;
  let h = 0;
  let target = 0;
  let img: ImageData | null = null;
  let imgKey = '';
  let score = 0;
  let flashes: Flash[] = [];
  let lastDt = 0;

  const area = () => {
    const size = Math.min(w, h) - 40;
    return { x: (w - size) / 2, y: (h - size) / 2, size };
  };

  const newRound = () => {
    let t = Math.floor(Math.random() * GRID * GRID);
    while (t === target) t = Math.floor(Math.random() * GRID * GRID);
    target = t;
    img = null;
  };
  newRound();

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      img = null;
    },
    update(dt) {
      lastDt = dt;
    },
    draw(ctx) {
      const dpr = ctx.canvas.width / Math.max(1, w);
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, w, h);
      const a = area();
      const key = `${w}x${h}@${stair.level}:${target}`;
      if (!img || imgKey !== key) {
        const dw = Math.round(a.size * dpr);
        const cell = dw / GRID;
        const col = target % GRID;
        const row = Math.floor(target / GRID);
        const shapeSize = cell * Math.max(0.4, 0.75 - stair.level * 0.025);
        const shift = Math.max(1, Math.round(10 * dpr * Math.pow(0.8, stair.level - 1)));
        const dot = Math.max(2, Math.round(1.5 * dpr));
        img = renderRds(dw, dw, dot, squareMask((col + 0.5) * cell, (row + 0.5) * cell, shapeSize), shift, p.left, p.right);
        imgKey = key;
      }
      ctx.putImageData(img, Math.round(a.x * dpr), Math.round(a.y * dpr));
      drawFusionFrame(ctx, w, h, p);
      // İki gözün de gördüğü ızgara çizgileri konum bulmayı kolaylaştırır
      ctx.strokeStyle = p.both;
      ctx.lineWidth = 1;
      ctx.strokeRect(a.x, a.y, a.size, a.size);
      for (let i = 1; i < GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(a.x + (a.size * i) / GRID, a.y);
        ctx.lineTo(a.x + (a.size * i) / GRID, a.y + a.size);
        ctx.moveTo(a.x, a.y + (a.size * i) / GRID);
        ctx.lineTo(a.x + a.size, a.y + (a.size * i) / GRID);
        ctx.stroke();
      }
      flashes = drawFlashes(ctx, flashes, lastDt);
    },
    pointerDown(x, y) {
      const a = area();
      const col = Math.floor(((x - a.x) / a.size) * GRID);
      const row = Math.floor(((y - a.y) / a.size) * GRID);
      if (col < 0 || row < 0 || col >= GRID || row >= GRID) return;
      const ok = row * GRID + col === target;
      flashes.push({ x: a.x + ((col + 0.5) * a.size) / GRID, y: a.y + ((row + 0.5) * a.size) / GRID, t: 0, ok });
      if (ok) {
        score += 10 * stair.level;
        stair.hit();
      } else stair.miss();
      newRound();
    },
    stats() {
      return { score, level: stair.level, performance: stair.accuracy };
    },
  };
}
