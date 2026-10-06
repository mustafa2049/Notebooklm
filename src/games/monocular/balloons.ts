import { LevelStaircase, pick, rand, type Game } from '../engine';

/** Birbirine benzeyen harf grupları: seviye arttıkça ayırt etmek zorlaşır. */
const GROUPS = [
  ['A', 'K', 'S', 'T', 'Z'],
  ['E', 'F', 'B', 'P', 'R'],
  ['O', 'Q', 'C', 'G', 'D'],
  ['b', 'd', 'p', 'q'],
  ['M', 'N', 'W', 'V'],
  ['3', '8', '6', '9', '5'],
];
const COLORS = ['#ff6b6b', '#ffd43b', '#69db7c', '#74c0fc', '#da77f2', '#ffa94d'];

interface Balloon {
  x: number;
  y: number;
  r: number;
  vy: number;
  letter: string;
  color: string;
  wobble: number;
  pop: number;
}

export function createBalloons(): Game {
  const stair = new LevelStaircase(1, 1, 18, 3);
  let w = 0;
  let h = 0;
  let balloons: Balloon[] = [];
  let group = GROUPS[0];
  let target = 'A';
  let spawn = 0;
  let score = 0;
  let sinceChange = 0;
  const topBar = 64;

  const newTarget = () => {
    // Düşük seviyede kolay ayırt edilen grup, yüksekte benzer harfler
    group = stair.level < 4 ? GROUPS[0] : pick(GROUPS.slice(1));
    target = pick(group);
    sinceChange = 0;
  };
  newTarget();

  const fontSize = () => Math.max(9, 34 - stair.level * 1.6);

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    update(dt) {
      spawn -= dt;
      const lv = stair.level;
      if (spawn <= 0) {
        spawn = Math.max(0.5, 1.2 - lv * 0.04);
        const r = Math.max(26, Math.min(40, w / 10));
        const isTarget = Math.random() < 0.38;
        const others = group.filter((g) => g !== target);
        balloons.push({
          x: rand(r + 6, w - r - 6),
          y: h + r,
          r,
          vy: rand(55, 80) + lv * 6,
          letter: isTarget ? target : pick(others),
          color: pick(COLORS),
          wobble: rand(0, Math.PI * 2),
          pop: 0,
        });
      }
      for (const b of balloons) {
        b.wobble += dt * 2;
        if (b.pop > 0) b.pop += dt;
        else b.y -= b.vy * dt;
      }
      balloons = balloons.filter((b) => {
        if (b.pop > 0.25) return false;
        if (b.pop === 0 && b.y < topBar - b.r) {
          if (b.letter === target) stair.miss(); // hedef kaçtı
          return false;
        }
        return true;
      });
    },
    draw(ctx) {
      ctx.fillStyle = '#f4f9ff';
      ctx.fillRect(0, 0, w, h);
      const fs = fontSize();
      for (const b of balloons) {
        const x = b.x + Math.sin(b.wobble) * 6;
        const s = b.pop > 0 ? 1 + b.pop * 3 : 1;
        ctx.globalAlpha = b.pop > 0 ? Math.max(0, 1 - b.pop * 4) : 1;
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, b.y + b.r);
        ctx.quadraticCurveTo(x + 8, b.y + b.r + 20, x, b.y + b.r + 36);
        ctx.stroke();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(x, b.y, b.r * 0.86 * s, b.r * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.15, b.r * 0.25, -0.5, 0, Math.PI * 2);
        ctx.fill();
        if (b.pop === 0) {
          ctx.fillStyle = '#111';
          ctx.font = `700 ${fs}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.letter, x, b.y + 1);
        }
      }
      ctx.globalAlpha = 1;
      // Hedef harf çubuğu
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, topBar);
      ctx.strokeStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(0, topBar);
      ctx.lineTo(w, topBar);
      ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('Bu harfi patlat:', w / 2 + 10, topBar / 2);
      ctx.fillStyle = '#d1242f';
      ctx.font = '800 40px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(target, w / 2 + 22, topBar / 2 + 2);
    },
    pointerDown(px, py) {
      const hit = balloons.find((b) => b.pop === 0 && Math.hypot(b.x + Math.sin(b.wobble) * 6 - px, b.y - py) <= b.r + 8);
      if (!hit) return;
      if (hit.letter === target) {
        hit.pop = 0.001;
        score += 10 * stair.level;
        stair.hit();
        if (++sinceChange >= 8) newTarget();
      } else {
        stair.miss();
        hit.vy *= 1.6; // yanlış balon hızlanıp uzaklaşır
      }
    },
    stats() {
      return { score, level: stair.level, performance: stair.accuracy };
    },
  };
}
