import { describe, expect, it } from 'vitest';
import { gridForLevel, makeDeck, MemoryBoard } from './memoryLogic';

describe('memory deck', () => {
  it('contains every symbol exactly twice', () => {
    const deck = makeDeck(8);
    expect(deck).toHaveLength(16);
    const counts = new Map<number, number>();
    deck.forEach((c) => counts.set(c.sym, (counts.get(c.sym) ?? 0) + 1));
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
  });

  it('grid sizes always hold an even number of cards', () => {
    for (let lv = 1; lv < 8; lv++) {
      const [c, r] = gridForLevel(lv);
      expect((c * r) % 2).toBe(0);
    }
  });
});

describe('MemoryBoard', () => {
  const board = () =>
    new MemoryBoard([
      { sym: 0, state: 'down' },
      { sym: 1, state: 'down' },
      { sym: 0, state: 'down' },
      { sym: 1, state: 'down' },
    ]);

  it('matches equal symbols', () => {
    const b = board();
    expect(b.flip(0)).toBe('first');
    expect(b.flip(2)).toBe('match');
    expect(b.cards[0].state).toBe('matched');
    expect(b.matches).toBe(1);
    expect(b.attempts).toBe(1);
  });

  it('blocks a third flip until the mismatch is hidden', () => {
    const b = board();
    b.flip(0);
    expect(b.flip(1)).toBe('mismatch');
    expect(b.flip(2)).toBe('ignored');
    b.hideMismatch();
    expect(b.cards[0].state).toBe('down');
    expect(b.flip(2)).toBe('first');
  });

  it('ignores flipping an already open card and reports completion', () => {
    const b = board();
    b.flip(0);
    expect(b.flip(0)).toBe('ignored');
    b.flip(2);
    b.flip(1);
    b.flip(3);
    expect(b.done).toBe(true);
  });
});
