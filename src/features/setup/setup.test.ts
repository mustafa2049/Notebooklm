import { describe, expect, it } from 'vitest';
import { defaultAnaglyph, profileDefaults, type Profile } from '../../model/types';
import { setupProgress, setupSteps, showSetupCard } from './setup';

const p: Profile = { ...profileDefaults(), id: 'p', name: 'T', anaglyph: defaultAnaglyph() };

describe('setup wizard', () => {
  it('starts with only the eye step done', () => {
    const s = setupSteps(p, []);
    expect(setupProgress(s)).toEqual({ done: 1, total: 6 });
    expect(showSetupCard(p, s)).toBe(true);
  });

  it('marks steps done from profile and test data', () => {
    const full: Profile = {
      ...p,
      rxSkipped: true,
      planConfirmed: true,
      screenPxPerMm: 6,
      anaglyph: { ...defaultAnaglyph(), calibrated: true },
    };
    const s = setupSteps(full, [{ id: 'v', profileId: 'p', at: 1, eye: 'right', logMAR: 0.3, distanceCm: 40 }]);
    expect(setupProgress(s).done).toBe(6);
    expect(showSetupCard(full, s)).toBe(false);
    expect(setupSteps({ ...p, prescription: { right: { sph: 1, cyl: 0, axis: 0 }, left: { sph: 1, cyl: 0, axis: 0 } } }, []).find((x) => x.id === 'rx')?.done).toBe(true);
    // Başka profilin testi sayılmaz.
    expect(setupSteps(p, [{ id: 'v', profileId: 'x', at: 1, eye: 'right', logMAR: 0.3, distanceCm: 40 }]).find((x) => x.id === 'vision')?.done).toBe(false);
  });

  it('hides the card when dismissed', () => {
    expect(showSetupCard({ ...p, setupDismissed: true }, setupSteps(p, []))).toBe(false);
  });
});
