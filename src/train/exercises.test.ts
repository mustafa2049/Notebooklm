import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById, nextPhaseInMs, phaseAt } from './exercises';

describe('egzersizler', () => {
  it('her egzersizin evreleri sıfırdan başlar ve süreyi aşmaz', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.phases[0].atMs).toBe(0);
      for (const phase of exercise.phases) {
        expect(phase.atMs).toBeLessThan(exercise.durationMs);
        expect(phase.wpmFactor).toBeGreaterThan(0);
      }
    }
  });

  it('evreler zaman sırasında', () => {
    for (const exercise of EXERCISES) {
      const times = exercise.phases.map((phase) => phase.atMs);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });

  it('geçerli evreyi bulur', () => {
    const ramp = exerciseById('ramp')!;
    expect(phaseAt(ramp, 0).wpmFactor).toBe(1);
    expect(phaseAt(ramp, 25_000).wpmFactor).toBe(1.25);
    expect(phaseAt(ramp, 45_000).wpmFactor).toBe(1.5);
    expect(phaseAt(ramp, 200_000).wpmFactor).toBe(1);
  });

  it('sonraki evreye kalan süreyi verir', () => {
    const ramp = exerciseById('ramp')!;
    expect(nextPhaseInMs(ramp, 0)).toBe(20_000);
    expect(nextPhaseInMs(ramp, 19_000)).toBe(1_000);
    expect(nextPhaseInMs(ramp, 80_000)).toBeNull();
  });

  it('bilinmeyen egzersiz kimliğinde undefined döner', () => {
    expect(exerciseById('yok')).toBeUndefined();
    expect(exerciseById(undefined)).toBeUndefined();
  });
});
