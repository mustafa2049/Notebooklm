import { describe, expect, it } from 'vitest';
import { eyeBreakDue, eyeBreakRemaining } from './eyeBreak';

describe('eyeBreakDue', () => {
  it('kapalıyken hiç tetiklenmez', () => {
    expect(eyeBreakDue(10 * 3_600_000, 0, 0)).toBe(false);
  });

  it('okuma süresi eşiği geçince tetiklenir', () => {
    expect(eyeBreakDue(19 * 60_000, 0, 20)).toBe(false);
    expect(eyeBreakDue(20 * 60_000, 0, 20)).toBe(true);
  });

  it('son moladan itibaren sayar', () => {
    expect(eyeBreakDue(35 * 60_000, 20 * 60_000, 20)).toBe(false);
    expect(eyeBreakDue(40 * 60_000, 20 * 60_000, 20)).toBe(true);
  });
});

describe('eyeBreakRemaining', () => {
  it('geri sayar ve sıfırda durur', () => {
    expect(eyeBreakRemaining(1000, 1000)).toBe(20);
    expect(eyeBreakRemaining(1000, 1000 + 19_100)).toBe(1);
    expect(eyeBreakRemaining(1000, 1000 + 25_000)).toBe(0);
  });
});
