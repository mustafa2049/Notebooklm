import { drawFlashes, LevelStaircase, rand, type Flash, type Game } from '../engine';

interface Target {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
}

export function createCatch(): Game {
  const stair = new LevelStaircase(1, 1, 15, 3);
  let w = 0;
  let h = 0;
  let targets: Target[] = [];
  let flashes: Flash[] = [];
  let score = 0;
  let spawnIn = 0.3;
  let lastDt = 0;

  const params = () => {
    const lv = stair.level;
    return {
      r: Math.max(7, 38 - lv * 2.2),
      speed: 50 + lv * 14,
      life: Math.max(1.6, 3.8 - lv * 0.12),
      max: 1 + Math.floor(lv / 4),
    };
  };

  const spawn = () => {
    const p = params();
    const a = rand(0, Math.PI * 2);
    targets.push({
      x: rand(p.r + 10, w - p.r - 10),
      y: rand(p.r + 10, h - p.r - 10),
      vx: Math.cos(a) * p.speed,
      vy: Math.sin(a) * p.speed,
      r: p.r,
      life: p.life,
    });
  };

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    update(dt) {
      lastDt = dt;
      spawnIn -= dt;
      if (spawnIn <= 0 && targets.length < params().max) {
        spawn();
        spawnIn = 0.4;
      }
      for (const t of targets) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        if (t.x < t.r || t.x > w - t.r) t.vx *= -1;
        if (t.y < t.r || t.y > h - t.r) t.vy *= -1;
        t.life -= dt;
      }
      const expired = targets.filter((t) => t.life <= 0);
      expired.forEach((t) => {
        stair.miss();
        flashes.push({ x: t.x, y: t.y, t: 0, ok: false });
      });
      targets = targets.filter((t) => t.life > 0);
    },
    draw(ctx) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      for (const t of targets) {
        const fade = Math.min(1, t.life / 0.6);
        ctx.globalAlpha = 0.35 + 0.65 * fade;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d00';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      flashes = drawFlashes(ctx, flashes, lastDt);
    },
    pointerDown(x, y) {
      const hit = targets.find((t) => Math.hypot(t.x - x, t.y - y) <= t.r + 12);
      if (hit) {
        targets = targets.filter((t) => t !== hit);
        score += 5 * stair.level;
        stair.hit();
        flashes.push({ x: hit.x, y: hit.y, t: 0, ok: true });
      }
    },
    stats() {
      return { score, level: stair.level, performance: stair.accuracy };
    },
  };
}
