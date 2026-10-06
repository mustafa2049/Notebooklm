import { describe, expect, it } from 'vitest';
import { newSnake, step, turn } from './snakeLogic';

describe('snake logic', () => {
  it('moves the head forward and keeps length', () => {
    const s = newSnake(10, 10);
    s.food = [0, 0];
    const head = s.body[0];
    expect(step(s)).toBe('move');
    expect(s.body[0]).toEqual([head[0] + 1, head[1]]);
    expect(s.body).toHaveLength(3);
  });

  it('grows when eating and places new food off the body', () => {
    const s = newSnake(10, 10);
    s.food = [s.body[0][0] + 1, s.body[0][1]];
    expect(step(s)).toBe('eat');
    expect(s.body).toHaveLength(4);
    expect(s.body.some(([x, y]) => x === s.food[0] && y === s.food[1])).toBe(false);
  });

  it('ignores reversing into itself', () => {
    const s = newSnake(10, 10);
    turn(s, 'left');
    expect(s.next).toBe('right');
    turn(s, 'up');
    expect(s.next).toBe('up');
  });

  it('crashes into the wall and restarts with length 3', () => {
    const s = newSnake(6, 6);
    s.food = [0, 5];
    s.body = [
      [5, 2],
      [4, 2],
      [3, 2],
      [2, 2],
    ];
    expect(step(s)).toBe('crash');
    expect(s.body).toHaveLength(3);
    expect(s.dir).toBe('right');
  });

  it('crashes into its own body', () => {
    const s = newSnake(10, 10);
    s.food = [9, 9];
    s.body = [
      [5, 5],
      [6, 5],
      [6, 6],
      [5, 6],
      [4, 6],
    ];
    s.dir = s.next = 'up';
    turn(s, 'right');
    expect(step(s)).toBe('crash');
  });
});
