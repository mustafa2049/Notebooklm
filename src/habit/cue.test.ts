import { describe, expect, it } from 'vitest';
import { reminderBody } from './cue';

describe('reminderBody', () => {
  it('ipucu ve dakika hedefini birlikte söyler', () => {
    expect(
      reminderBody({ cue: 'sabah kahvesinden sonra', goalUnit: 'minutes', goalMinutes: 10, goalWords: 0 })
    ).toBe('Sabah kahvesinden sonra: 10 dakika okuma zamanı.');
  });

  it('Türkçe büyük harfi doğru yapar', () => {
    expect(reminderBody({ cue: 'işten sonra', goalUnit: 'minutes', goalMinutes: 5, goalWords: 0 })).toMatch(
      /^İşten sonra/
    );
  });

  it('ipucu yoksa hedefle konuşur', () => {
    expect(reminderBody({ cue: '', goalUnit: 'words', goalMinutes: 0, goalWords: 2000 })).toBe(
      'Bugünkü hedefin 2000 kelime. Kısa bir tur yeter.'
    );
  });

  it('hiçbiri yoksa genel bir davet', () => {
    expect(reminderBody({ cue: '', goalUnit: 'minutes', goalMinutes: 0, goalWords: 0 })).toMatch(/okumaya/);
  });
});
