/** Tüm canvas oyunlarının uyguladığı arayüz. Koordinatlar CSS pikselidir. */
export interface Game {
  resize(w: number, h: number): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  pointerDown?(x: number, y: number): void;
  pointerMove?(x: number, y: number, down: boolean): void;
  pointerUp?(x: number, y: number): void;
  key?(key: string): void;
  keyUp?(key: string): void;
  stats(): GameStats;
}

export interface GameStats {
  score: number;
  level: number;
  /** 0–1 arası başarı oranı. */
  performance: number;
}

/** Canvas'ı oyuna bağlar: DPI ölçekleme, döngü, dokunma/fare/klavye girdisi. */
export function runGame(canvas: HTMLCanvasElement, game: Game, isRunning: () => boolean): () => void {
  const ctx = canvas.getContext('2d')!;
  let w = 0;
  let h = 0;
  let raf = 0;
  let last = performance.now();
  let down = false;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.resize(w, h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const frame = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (isRunning()) game.update(dt);
    ctx.save();
    game.draw(ctx);
    ctx.restore();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const pos = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top] as const;
  };
  const onDown = (e: PointerEvent) => {
    if (!isRunning()) return;
    down = true;
    canvas.setPointerCapture?.(e.pointerId);
    game.pointerDown?.(...pos(e));
  };
  const onMove = (e: PointerEvent) => {
    if (!isRunning()) return;
    game.pointerMove?.(...pos(e), down);
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    down = false;
    if (isRunning()) game.pointerUp?.(...pos(e));
  };
  const onKey = (e: KeyboardEvent) => {
    if (!isRunning() || !game.key) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    game.key(e.key);
  };
  const onKeyUp = (e: KeyboardEvent) => game.keyUp?.(e.key);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
  };
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Uyarlanabilir zorluk: art arda `up` doğru → seviye artar, her yanlış → seviye azalır.
 */
export class LevelStaircase {
  level: number;
  private streak = 0;
  correct = 0;
  total = 0;
  constructor(
    start: number,
    private min: number,
    private max: number,
    private up = 2,
  ) {
    this.level = start;
  }
  hit() {
    this.correct++;
    this.total++;
    if (++this.streak >= this.up) {
      this.streak = 0;
      this.level = Math.min(this.max, this.level + 1);
    }
  }
  miss() {
    this.total++;
    this.streak = 0;
    this.level = Math.max(this.min, this.level - 1);
  }
  get accuracy() {
    return this.total ? this.correct / this.total : 0;
  }
}

/** Kısa geri bildirim efekti (doğru/yanlış halkası). */
export interface Flash {
  x: number;
  y: number;
  t: number;
  ok: boolean;
}

export function drawFlashes(ctx: CanvasRenderingContext2D, flashes: Flash[], dt: number): Flash[] {
  for (const f of flashes) {
    f.t += dt;
    const a = Math.max(0, 1 - f.t / 0.5);
    ctx.strokeStyle = f.ok ? `rgba(46,160,67,${a})` : `rgba(218,54,51,${a})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 20 + f.t * 80, 0, Math.PI * 2);
    ctx.stroke();
  }
  return flashes.filter((f) => f.t < 0.5);
}
