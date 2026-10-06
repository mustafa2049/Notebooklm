import { clamp, rand, type Game } from '../engine';
import { drawFusionFrame, type DichopticPalette } from './anaglyph';

interface Obj {
  x: number;
  y: number;
  r: number;
  vy: number;
  kind: 'star' | 'rock';
  spin: number;
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function createStars(p: DichopticPalette): Game {
  let w = 0;
  let h = 0;
  let objs: Obj[] = [];
  let shipX = 0;
  let spawn = 0;
  let collected = 0;
  let missed = 0;
  let crashes = 0;
  let score = 0;
  let keyDir = 0;
  let shake = 0;

  const level = () => 1 + Math.floor(collected / 10);
  const shipY = () => h - 60;

  return {
    resize(nw, nh) {
      if (w === 0) shipX = nw / 2;
      w = nw;
      h = nh;
    },
    update(dt) {
      shipX = clamp(shipX + keyDir * 420 * dt, 30, w - 30);
      spawn -= dt;
      const lv = level();
      if (spawn <= 0) {
        spawn = Math.max(0.35, 1.1 - lv * 0.07);
        const kind = Math.random() < Math.min(0.45, 0.25 + lv * 0.02) ? 'rock' : 'star';
        objs.push({
          x: rand(30, w - 30),
          y: -20,
          r: kind === 'star' ? Math.max(10, 18 - lv * 0.5) : rand(14, 22),
          vy: rand(120, 170) + lv * 18,
          kind,
          spin: rand(0, Math.PI),
        });
      }
      shake = Math.max(0, shake - dt);
      const sy = shipY();
      objs = objs.filter((o) => {
        o.y += o.vy * dt;
        o.spin += dt;
        if (Math.abs(o.x - shipX) < o.r + 22 && Math.abs(o.y - sy) < o.r + 14) {
          if (o.kind === 'star') {
            collected++;
            score += 10 * level();
          } else {
            crashes++;
            score = Math.max(0, score - 20);
            shake = 0.3;
          }
          return false;
        }
        if (o.y > h + 30) {
          if (o.kind === 'star') missed++;
          return false;
        }
        return true;
      });
    },
    draw(ctx) {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, w, h);
      drawFusionFrame(ctx, w, h, p);
      for (const o of objs) {
        if (o.kind === 'star') {
          ctx.fillStyle = p.amb; // tembel göz
          starPath(ctx, o.x, o.y, o.r, o.spin);
          ctx.fill();
        } else {
          ctx.fillStyle = p.fel; // sağlam göz
          ctx.beginPath();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + o.spin * 0.3;
            const rr = o.r * (0.75 + ((i * 37) % 10) / 40);
            const px = o.x + Math.cos(a) * rr;
            const py = o.y + Math.sin(a) * rr;
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      // Gemi → sağlam göz
      const sx = shipX + (shake ? rand(-4, 4) : 0);
      const sy = shipY();
      ctx.fillStyle = p.fel;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 20);
      ctx.lineTo(sx + 22, sy + 16);
      ctx.lineTo(sx, sy + 8);
      ctx.lineTo(sx - 22, sy + 16);
      ctx.closePath();
      ctx.fill();
    },
    pointerDown(px) {
      shipX = px;
    },
    pointerMove(px, _py, down) {
      if (down) shipX = px;
    },
    key(k) {
      if (k === 'ArrowLeft') keyDir = -1;
      else if (k === 'ArrowRight') keyDir = 1;
    },
    keyUp(k) {
      if ((k === 'ArrowLeft' && keyDir === -1) || (k === 'ArrowRight' && keyDir === 1)) keyDir = 0;
    },
    stats() {
      const total = collected + missed + crashes;
      return { score, level: level(), performance: total ? collected / total : 0 };
    },
  };
}
