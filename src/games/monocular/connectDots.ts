import { sfx } from '../../platform/sound';
import { clamp, drawFlashes, rand, type Flash, type Game } from '../engine';

interface Dot {
  x: number;
  y: number;
}

export function createConnectDots(): Game {
  let level = 1;
  let w = 0;
  let h = 0;
  let dots: Dot[] = [];
  let next = 0;
  let errors = 0;
  let taps = 0;
  let good = 0;
  let score = 0;
  let flashes: Flash[] = [];
  let lastDt = 0;

  const fontSize = () => Math.max(9, 24 - level * 1.1);

  const newPuzzle = () => {
    const n = Math.min(24, 5 + level);
    const m = 30;
    const minDist = Math.max(28, Math.min(w, h) / Math.sqrt(n) / 1.6);
    dots = [];
    let tries = 0;
    while (dots.length < n && tries < 4000) {
      tries++;
      const d = { x: rand(m, w - m), y: rand(m, h - m) };
      if (dots.every((o) => Math.hypot(o.x - d.x, o.y - d.y) >= minDist)) dots.push(d);
    }
    next = 0;
    errors = 0;
  };

  return {
    resize(nw, nh) {
      const first = w === 0;
      w = nw;
      h = nh;
      if (first || dots.some((d) => d.x > w || d.y > h)) newPuzzle();
    },
    update(dt) {
      lastDt = dt;
    },
    draw(ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      // Çizilen yol
      ctx.strokeStyle = '#1f6feb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      dots.slice(0, next).forEach((d, i) => (i ? ctx.lineTo(d.x, d.y) : ctx.moveTo(d.x, d.y)));
      ctx.stroke();

      const fs = fontSize();
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      dots.forEach((d, i) => {
        ctx.fillStyle = i < next ? '#1f6feb' : '#000';
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(2.5, fs / 6), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(String(i + 1), d.x + 3, d.y - 2);
      });
      flashes = drawFlashes(ctx, flashes, lastDt);
    },
    pointerDown(x, y) {
      let best = -1;
      let bestD = Infinity;
      dots.forEach((d, i) => {
        const dist = Math.hypot(d.x - x, d.y - y);
        if (dist < bestD) {
          bestD = dist;
          best = i;
        }
      });
      if (best < 0 || bestD > 30) return;
      if (best < next) return; // zaten bağlanmış nokta
      taps++;
      const ok = best === next;
      flashes.push({ x: dots[best].x, y: dots[best].y, t: 0, ok });
      if (ok) {
        good++;
        next++;
        score += level;
        if (next < dots.length) sfx('hit');
        if (next === dots.length) {
          sfx('level');
          score += 10 * level;
          level = clamp(errors <= 1 ? level + 1 : errors >= 3 ? level - 1 : level, 1, 20);
          setTimeout(newPuzzle, 400);
        }
      } else {
        sfx('miss');
        errors++;
      }
    },
    stats() {
      return { score, level, performance: taps ? good / taps : 0 };
    },
  };
}
