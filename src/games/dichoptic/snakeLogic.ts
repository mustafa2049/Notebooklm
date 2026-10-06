export type Cell = [number, number];
export type Dir = 'up' | 'down' | 'left' | 'right';

const VEC: Record<Dir, Cell> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export interface SnakeState {
  cols: number;
  rows: number;
  /** Baş ilk elemandır. */
  body: Cell[];
  dir: Dir;
  /** Bir sonraki adımda uygulanacak yön (adım başına tek dönüş). */
  next: Dir;
  food: Cell;
}

export function newSnake(cols: number, rows: number, rnd: () => number = Math.random): SnakeState {
  const cy = Math.floor(rows / 2);
  const cx = Math.floor(cols / 2);
  const body: Cell[] = [
    [cx, cy],
    [cx - 1, cy],
    [cx - 2, cy],
  ];
  return { cols, rows, body, dir: 'right', next: 'right', food: placeFood(cols, rows, body, rnd) };
}

export function placeFood(cols: number, rows: number, body: Cell[], rnd: () => number = Math.random): Cell {
  const taken = new Set(body.map(([x, y]) => y * cols + x));
  const free: number[] = [];
  for (let i = 0; i < cols * rows; i++) if (!taken.has(i)) free.push(i);
  const i = free[Math.floor(rnd() * free.length)] ?? 0;
  return [i % cols, Math.floor(i / cols)];
}

/** Yön değiştir; yılanın kendi üstüne geri dönmesi engellenir. */
export function turn(s: SnakeState, d: Dir): void {
  if (d !== OPPOSITE[s.dir]) s.next = d;
}

export type StepResult = 'move' | 'eat' | 'crash';

/** Bir adım ilerletir. Çarpmada yılan ortada 3 uzunlukla yeniden başlar. */
export function step(s: SnakeState, rnd: () => number = Math.random): StepResult {
  s.dir = s.next;
  const [vx, vy] = VEC[s.dir];
  const [hx, hy] = s.body[0];
  const head: Cell = [hx + vx, hy + vy];
  const eats = head[0] === s.food[0] && head[1] === s.food[1];
  // Kuyruk bu adımda çekileceği için (yem yenmiyorsa) kuyruğa girmek çarpma sayılmaz.
  const body = eats ? s.body : s.body.slice(0, -1);
  const wall = head[0] < 0 || head[1] < 0 || head[0] >= s.cols || head[1] >= s.rows;
  if (wall || body.some(([x, y]) => x === head[0] && y === head[1])) {
    const fresh = newSnake(s.cols, s.rows, rnd);
    s.body = fresh.body;
    s.dir = s.next = 'right';
    if (s.body.some(([x, y]) => x === s.food[0] && y === s.food[1])) s.food = fresh.food;
    return 'crash';
  }
  s.body = [head, ...body];
  if (eats) {
    s.food = placeFood(s.cols, s.rows, s.body, rnd);
    return 'eat';
  }
  return 'move';
}
