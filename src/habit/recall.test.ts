import { describe, expect, it } from 'vitest';
import { RECALL_MIN_LEAVE_MS, shouldPromptRecall } from './recall';

const base = { activeMs: 0, alreadyAsked: false, enabled: true };

describe('shouldPromptRecall', () => {
  it('odak seansı bitince sorar', () => {
    expect(shouldPromptRecall({ ...base, trigger: 'focusDone' })).toBe(true);
  });

  it('çıkarken yalnızca yeterince okunduysa sorar', () => {
    expect(shouldPromptRecall({ ...base, trigger: 'leave', activeMs: 60_000 })).toBe(false);
    expect(shouldPromptRecall({ ...base, trigger: 'leave', activeMs: RECALL_MIN_LEAVE_MS })).toBe(true);
  });

  it('çok kısa metnin sonunda sormaz', () => {
    expect(shouldPromptRecall({ ...base, trigger: 'finished', activeMs: 20_000 })).toBe(false);
    expect(shouldPromptRecall({ ...base, trigger: 'finished', activeMs: 90_000 })).toBe(true);
  });

  it('bir kez sorar ve kapatılabilir', () => {
    expect(shouldPromptRecall({ ...base, trigger: 'focusDone', alreadyAsked: true })).toBe(false);
    expect(shouldPromptRecall({ ...base, trigger: 'focusDone', enabled: false })).toBe(false);
  });
});
