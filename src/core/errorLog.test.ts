import { describe, expect, it } from 'vitest';
import { appendEntry, formatErrorLog, MAX_ENTRIES, normalizeError, REPEAT_MS, type ErrorEntry } from './errorLog';

const entry = (at: number, message = 'Patladı'): ErrorEntry => ({ at, source: 'js', fatal: false, message });

describe('normalizeError', () => {
  it('Error: ad, ileti, kısaltılmış yığın', () => {
    const error = new TypeError('x is undefined');
    const result = normalizeError(error);
    expect(result.message).toBe('TypeError: x is undefined');
    expect(result.stack).toContain('x is undefined');
    expect(normalizeError(new Error('düz')).message).toBe('düz');
    const long = new Error('a'.repeat(2000));
    expect(normalizeError(long).message.length).toBe(500);
  });

  it('dize, nesne ve boş değerler', () => {
    expect(normalizeError('olmadı')).toEqual({ message: 'olmadı' });
    expect(normalizeError({ code: 7 })).toEqual({ message: '{"code":7}' });
    expect(normalizeError(undefined).message).toBe('undefined');
    expect(normalizeError('').message).toBe('Bilinmeyen hata');
  });
});

describe('appendEntry', () => {
  it('en yeni başa; aynı ileti hemen tekrar yazılmaz', () => {
    let list = appendEntry([], entry(1000));
    list = appendEntry(list, entry(1000 + REPEAT_MS - 1));
    expect(list).toHaveLength(1);
    list = appendEntry(list, entry(1000 + REPEAT_MS + 1));
    expect(list).toHaveLength(2);
    list = appendEntry(list, entry(1000 + REPEAT_MS + 2, 'Başka'));
    expect(list[0].message).toBe('Başka');
  });

  it('sınırı korur', () => {
    let list: ErrorEntry[] = [];
    for (let i = 0; i < MAX_ENTRIES + 10; i++) list = appendEntry(list, entry(i * 10_000, `h${i}`));
    expect(list).toHaveLength(MAX_ENTRIES);
    expect(list[0].message).toBe(`h${MAX_ENTRIES + 9}`);
  });
});

describe('formatErrorLog', () => {
  it('cihaz bilgisi ve her kayıt', () => {
    const at = new Date(2026, 9, 21, 9, 5, 7).getTime();
    const text = formatErrorLog(
      [{ at, source: 'render', fatal: true, message: 'TypeError: x', stack: 'at Page', route: '/reader/a' }],
      { app: '1.2.0 (3)', platform: 'android', os: '14' }
    );
    expect(text).toBe(
      'Hızlı Okuma — hata günlüğü\nUygulama: 1.2.0 (3) · android 14\n1 kayıt\n\n#1 2026-10-21 09:05:07 · ekran çizimi · uygulamayı kapattı · /reader/a\nTypeError: x\nat Page\n'
    );
    expect(formatErrorLog([], { app: '1', platform: 'web' })).toBe('Hızlı Okuma — hata günlüğü\nUygulama: 1 · web\n0 kayıt\n');
  });
});
