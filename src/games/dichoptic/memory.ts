import { sfx } from '../../platform/sound';
import { clamp, type Game } from '../engine';
import { drawFusionFrame, type DichopticPalette } from './anaglyph';
import { gridForLevel, makeDeck, MemoryBoard } from './memoryLogic';

const SHAPES = 8;

/** 16 farklı sembol: 8 şekil × (dolu / içi boş). */
function drawSymbol(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, r: number) {
  const shape = id % SHAPES;
  const filled = id < SHAPES;
  ctx.beginPath();
  const poly = (n: number, rot: number, rr = r) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
  switch (shape) {
    case 0:
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 1:
      ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      break;
    case 2:
      poly(3, -Math.PI / 2, r * 1.1);
      break;
    case 3:
      poly(4, 0, r * 1.1);
      break;
    case 4:
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r * 1.1;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      break;
    case 5: {
      const t = r * 0.35;
      ctx.rect(x - t, y - r, t * 2, r * 2);
      ctx.rect(x - r, y - t, r * 2, t * 2);
      break;
    }
    case 6:
      poly(6, 0);
      break;
    default:
      ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
  }
  if (filled) ctx.fill('nonzero');
  else {
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.stroke();
  }
}

export function createMemory(p: DichopticPalette): Game {
  let w = 0;
  let h = 0;
  let level = 1;
  let board = new MemoryBoard([]);
  let cols = 4;
  let rows = 3;
  let cell = 60;
  let ox = 0;
  let oy = 0;
  let hideIn = 0;
  let nextIn = 0;
  let score = 0;
  let attempts = 0;
  let matches = 0;

  const layout = () => {
    cell = Math.floor(Math.min((w - 40) / cols, (h - 40) / rows));
    ox = Math.floor((w - cell * cols) / 2);
    oy = Math.floor((h - cell * rows) / 2);
  };

  const newBoard = () => {
    [cols, rows] = gridForLevel(level);
    board = new MemoryBoard(makeDeck((cols * rows) / 2));
    layout();
  };

  return {
    resize(nw, nh) {
      const first = w === 0;
      w = nw;
      h = nh;
      if (first) newBoard();
      else layout();
    },
    update(dt) {
      if (hideIn > 0 && (hideIn -= dt) <= 0) board.hideMismatch();
      if (nextIn > 0 && (nextIn -= dt) <= 0) {
        level = clamp(level + 1, 1, 6);
        newBoard();
      }
    },
    draw(ctx) {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, w, h);
      drawFusionFrame(ctx, w, h, p);
      const pad = Math.max(3, cell * 0.08);
      board.cards.forEach((c, i) => {
        const x = ox + (i % cols) * cell + pad;
        const y = oy + Math.floor(i / cols) * cell + pad;
        const s = cell - 2 * pad;
        if (c.state === 'down') {
          // Kapalı kart → sağlam göz (çizgili desen)
          ctx.fillStyle = p.fel;
          ctx.fillRect(x, y, s, s);
          ctx.fillStyle = p.bg;
          for (let k = 1; k < 4; k++) ctx.fillRect(x + (k * s) / 4 - 1, y + 4, 2, s - 8);
        } else {
          // Açık kart: çerçeve sağlam göze, sembol tembel göze
          ctx.strokeStyle = p.fel;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
          ctx.fillStyle = p.amb;
          ctx.strokeStyle = p.amb;
          ctx.globalAlpha = c.state === 'matched' ? 0.55 : 1;
          drawSymbol(ctx, c.sym, x + s / 2, y + s / 2, s * 0.3);
          ctx.globalAlpha = 1;
        }
      });
    },
    pointerDown(px, py) {
      if (nextIn > 0) return;
      if (board.waiting) {
        // Eşleşmeyen kartlar açıkken dokunmak onları hemen kapatır.
        board.hideMismatch();
        hideIn = 0;
      }
      const c = Math.floor((px - ox) / cell);
      const r = Math.floor((py - oy) / cell);
      if (c < 0 || r < 0 || c >= cols || r >= rows) return;
      const res = board.flip(r * cols + c);
      if (res === 'match') {
        matches++;
        attempts++;
        score += 10 * level;
        if (board.done) {
          sfx('level');
          score += 50 * level;
          nextIn = 0.9;
        } else sfx('hit');
      } else if (res === 'mismatch') {
        attempts++;
        sfx('tick');
        hideIn = 0.9;
      }
    },
    stats() {
      // Rastgele oyunda bile bazı eşleşmeler olur; bu yüzden başarıyı iki katı ile ölçekle.
      return { score, level, performance: attempts ? clamp((matches / attempts) * 2, 0, 1) : 0 };
    },
  };
}
