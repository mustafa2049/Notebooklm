export const PHASE_SECONDS = 4;
export const PHASE_MS = PHASE_SECONDS * 1000;

export type PhaseKey = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

export type Phase = {
  key: PhaseKey;
  label: string;
};

export const PHASES: readonly Phase[] = [
  { key: 'inhale', label: 'Nefes Al' },
  { key: 'holdIn', label: 'Tut' },
  { key: 'exhale', label: 'Nefes Ver' },
  { key: 'holdOut', label: 'Tut' },
];

export type BreathState = {
  phaseIndex: number;
  phase: Phase;
  /** Seconds left in the current phase: 4, 3, 2, 1. */
  secondsLeft: number;
  completedCycles: number;
  phaseRemainingMs: number;
};

/**
 * Derives the exercise state from the total elapsed time, so the display
 * never drifts no matter how irregularly the timer ticks.
 */
export function getBreathState(elapsedMs: number): BreathState {
  const safeMs = Math.max(0, elapsedMs);
  const phaseCount = Math.floor(safeMs / PHASE_MS);
  const phaseIndex = phaseCount % PHASES.length;
  const intoPhaseMs = safeMs - phaseCount * PHASE_MS;

  return {
    phaseIndex,
    phase: PHASES[phaseIndex],
    secondsLeft: PHASE_SECONDS - Math.floor(intoPhaseMs / 1000),
    completedCycles: Math.floor(phaseCount / PHASES.length),
    phaseRemainingMs: PHASE_MS - intoPhaseMs,
  };
}
