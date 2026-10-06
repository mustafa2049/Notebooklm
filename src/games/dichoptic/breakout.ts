import { sfx } from '../../platform/sound';
import { clamp, type Game } from '../engine';
import { drawFusionFrame, type DichopticPalette } from './anaglyph';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}

export function createBreakout(p: DichopticPalette): Game {
  let w = 0;
  let h = 0;
  let level = 1;
  let score = 0;
  let hits = 0;
  let misses = 0;
  let bricks: Brick[] = [];
  const paddle = { x: 0, w: 100, h: 14, y: 0 };
  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 9, stuck: true, wait: 0.8 };
  let keyDir = 0;

  const speed = () => 260 + level * 35;

  const buildBricks = () => {
    const cols = 8;
    const rows = Math.min(7, 3 + level);
    const margin = 28;
    const bw = (w - margin * 2) / cols;
    const bh = Math.max(14, Math.min(26, h * 0.035));
    bricks = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        bricks.push({ x: margin + c * bw + 3, y: margin + 30 + r * (bh + 6), w: bw - 6, h: bh, alive: true });
  };

  const resetBall = () => {
    ball.stuck = true;
    ball.wait = 0.8;
  };

  const launch = () => {
    const a = (-Math.PI / 2) + (Math.random() - 0.5) * 0.8;
    ball.vx = Math.cos(a) * speed();
    ball.vy = Math.sin(a) * speed();
    ball.stuck = false;
  };

  return {
    resize(nw, nh) {
      const first = w === 0;
      w = nw;
      h = nh;
      paddle.w = clamp(w * 0.22, 70, 160);
      paddle.y = h - 50;
      if (first) {
        paddle.x = w / 2;
        buildBricks();
      } else {
        // Ekran boyutu değişince yerleşimi yenile ama kırılan tuğlaları koru.
        paddle.x = clamp(paddle.x, paddle.w / 2, w - paddle.w / 2);
        const alive = bricks.map((b) => b.alive);
        buildBricks();
        bricks.forEach((b, i) => (b.alive = alive[i] ?? true));
      }
    },
    update(dt) {
      paddle.x = clamp(paddle.x + keyDir * 500 * dt, paddle.w / 2 + 10, w - paddle.w / 2 - 10);
      if (ball.stuck) {
        ball.x = paddle.x;
        ball.y = paddle.y - ball.r - 2;
        ball.wait -= dt;
        if (ball.wait <= 0) launch();
        return;
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < ball.r + 10) {
        ball.x = ball.r + 10;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x > w - ball.r - 10) {
        ball.x = w - ball.r - 10;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y < ball.r + 10) {
        ball.y = ball.r + 10;
        ball.vy = Math.abs(ball.vy);
      }
      // Raket
      if (
        ball.vy > 0 &&
        ball.y + ball.r >= paddle.y &&
        ball.y + ball.r <= paddle.y + paddle.h + 10 &&
        Math.abs(ball.x - paddle.x) <= paddle.w / 2 + ball.r
      ) {
        const off = (ball.x - paddle.x) / (paddle.w / 2);
        const a = -Math.PI / 2 + off * 1.0;
        ball.vx = Math.cos(a) * speed();
        ball.vy = Math.sin(a) * speed();
        hits++;
        sfx('tick');
      }
      // Tuğlalar
      for (const b of bricks) {
        if (!b.alive) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
          b.alive = false;
          sfx('hit');
          score += 10 * level;
          const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
          const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
          if (overlapX < overlapY) ball.vx *= -1;
          else ball.vy *= -1;
          break;
        }
      }
      if (bricks.every((b) => !b.alive)) {
        level++;
        sfx('level');
        score += 100;
        buildBricks();
        resetBall();
      }
      if (ball.y > h + ball.r) {
        misses++;
        sfx('miss');
        resetBall();
      }
    },
    draw(ctx) {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, w, h);
      drawFusionFrame(ctx, w, h, p);
      // Tuğlalar ve top → tembel göz
      ctx.fillStyle = p.amb;
      for (const b of bricks) if (b.alive) ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      // Raket → sağlam göz
      ctx.fillStyle = p.fel;
      ctx.fillRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h);
    },
    pointerDown(px) {
      paddle.x = px;
    },
    pointerMove(px) {
      paddle.x = px;
    },
    key(k) {
      if (k === 'ArrowLeft') keyDir = -1;
      else if (k === 'ArrowRight') keyDir = 1;
    },
    keyUp(k) {
      if ((k === 'ArrowLeft' && keyDir === -1) || (k === 'ArrowRight' && keyDir === 1)) keyDir = 0;
    },
    stats() {
      return { score, level, performance: hits + misses ? hits / (hits + misses) : 0 };
    },
  };
}
