import { getBreathState } from './breathing';

describe('getBreathState', () => {
  it.each([
    [0, 'inhale', 4],
    [999, 'inhale', 4],
    [1000, 'inhale', 3],
    [3999, 'inhale', 1],
    [4000, 'holdIn', 4],
    [8000, 'exhale', 4],
    [11500, 'exhale', 1],
    [12000, 'holdOut', 4],
    [16000, 'inhale', 4],
  ])('at %i ms is in %s with %i seconds left', (elapsedMs, phaseKey, secondsLeft) => {
    const state = getBreathState(elapsedMs);
    expect(state.phase.key).toBe(phaseKey);
    expect(state.secondsLeft).toBe(secondsLeft);
  });

  it('counts completed 16-second cycles', () => {
    expect(getBreathState(15999).completedCycles).toBe(0);
    expect(getBreathState(16000).completedCycles).toBe(1);
    expect(getBreathState(16000 * 3 + 5000).completedCycles).toBe(3);
  });

  it('reports the time remaining in the current phase', () => {
    expect(getBreathState(0).phaseRemainingMs).toBe(4000);
    expect(getBreathState(9250).phaseRemainingMs).toBe(2750);
  });

  it('treats negative time as the start of the exercise', () => {
    const state = getBreathState(-500);
    expect(state.phaseIndex).toBe(0);
    expect(state.secondsLeft).toBe(4);
    expect(state.completedCycles).toBe(0);
  });
});
