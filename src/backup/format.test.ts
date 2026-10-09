import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT,
  backupFileName,
  createBackup,
  KEY_PREFIX,
  mergeBackup,
  summarizeBackup,
  validateBackup,
  type Backup,
} from './format';

const k = (name: string) => `${KEY_PREFIX}${name}`;

function stored(): Record<string, string> {
  return {
    [k('settings')]: JSON.stringify({ wpm: 350, theme: 'light', aiApiKey: 'gizli-anahtar' }),
    [k('documents')]: JSON.stringify([{ id: 'd1', title: 'Kitap', createdAt: 1 }]),
    [k('sessions')]: JSON.stringify([{ docId: 'd1', at: 100, ms: 60000, words: 300, mode: 'rsvp' }]),
    [k('assessments')]: JSON.stringify([{ id: 'a1', at: 50 }]),
    [k('vocab')]: JSON.stringify([{ id: 'v1', word: 'Müphem', createdAt: 10 }]),
    [k('badges-seen')]: JSON.stringify(['ilk-oturum']),
    [k('progress/d1')]: JSON.stringify({ charOffset: 10, ratio: 0.1, updatedAt: 100, finished: false }),
    'baska-uygulama/anahtar': '"dokunma"',
  };
}

function backupOf(keys: Record<string, string>, texts: Record<string, string> = {}): Backup {
  return createBackup(keys, texts, 1_700_000_000_000);
}

describe('createBackup', () => {
  it('API anahtarını yedeğe koymaz', () => {
    const backup = backupOf(stored());
    expect(backup.keys[k('settings')]).not.toContain('gizli-anahtar');
    expect(JSON.parse(backup.keys[k('settings')]).wpm).toBe(350);
  });

  it('yalnızca uygulamanın anahtarlarını alır', () => {
    expect(Object.keys(backupOf(stored()).keys)).not.toContain('baska-uygulama/anahtar');
  });
});

describe('validateBackup', () => {
  it('kendi ürettiği yedeği kabul eder', () => {
    const backup = backupOf(stored(), { d1: 'metin' });
    const result = validateBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.texts.d1).toBe('metin');
  });

  it('JSON olmayanı reddeder', () => {
    expect(validateBackup('bu json değil').ok).toBe(false);
  });

  it('başka biçimi reddeder', () => {
    expect(validateBackup(JSON.stringify({ format: 'baska', version: 1 })).ok).toBe(false);
  });

  it('daha yeni sürümü güncelleme isteyerek reddeder', () => {
    const result = validateBackup(
      JSON.stringify({ format: BACKUP_FORMAT, version: 99, createdAt: 1, keys: {}, texts: {} })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('güncelle');
  });

  it('bozuk değerleri reddeder', () => {
    const raw = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      createdAt: 1,
      keys: { [k('sessions')]: '{bozuk' },
      texts: {},
    });
    expect(validateBackup(raw).ok).toBe(false);
    expect(
      validateBackup(
        JSON.stringify({ format: BACKUP_FORMAT, version: 1, createdAt: 1, keys: { a: 1 }, texts: {} })
      ).ok
    ).toBe(false);
  });

  it('uygulamaya ait olmayan anahtarları atar', () => {
    const raw = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      createdAt: 1,
      keys: { 'baska/anahtar': '1', [k('vocab')]: '[]' },
      texts: {},
    });
    const result = validateBackup(raw);
    expect(result.ok && Object.keys(result.backup.keys)).toEqual([k('vocab')]);
  });
});

describe('summarizeBackup', () => {
  it('kayıt sayılarını verir', () => {
    expect(summarizeBackup(backupOf(stored()))).toMatchObject({
      documents: 1,
      sessions: 1,
      assessments: 1,
      vocab: 1,
      highlights: 0,
      bookmarks: 0,
      hasSettings: true,
    });
  });
});

describe('mergeBackup', () => {
  const noSettings = { includeSettings: false };

  it('boş cihaza her şeyi geri yükler', () => {
    const backup = backupOf(stored(), { d1: 'metin' });
    const result = mergeBackup({ keys: {}, textIds: new Set() }, backup, { includeSettings: true });
    expect(JSON.parse(result.keys[k('sessions')])).toHaveLength(1);
    expect(result.texts).toEqual({ d1: 'metin' });
  });

  it('aynı yedeği tekrar içe aktarmak hiçbir şey değiştirmez', () => {
    const keys = stored();
    const backup = backupOf(keys, { d1: 'metin' });
    const result = mergeBackup({ keys, textIds: new Set(['d1']) }, backup, noSettings);
    expect(result).toEqual({ keys: {}, texts: {} });
  });

  it('iki cihazın kayıtlarını birleştirir, kopya üretmez', () => {
    const mine = stored();
    const other = stored();
    other[k('sessions')] = JSON.stringify([
      { docId: 'd1', at: 100, ms: 60000, words: 300, mode: 'rsvp' }, // aynı oturum
      { docId: 'd2', at: 200, ms: 30000, words: 150, mode: 'flow' },
    ]);
    other[k('documents')] = JSON.stringify([
      { id: 'd1', title: 'Kitap', createdAt: 1 },
      { id: 'd2', title: 'Makale', createdAt: 2 },
    ]);
    const result = mergeBackup(
      { keys: mine, textIds: new Set(['d1']) },
      backupOf(other, { d1: 'eski', d2: 'yeni metin' }),
      noSettings
    );
    const sessions = JSON.parse(result.keys[k('sessions')]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].at).toBe(200); // yeniden eskiye
    expect(JSON.parse(result.keys[k('documents')])).toHaveLength(2);
    // Cihazda olan metin üzerine yazılmaz
    expect(result.texts).toEqual({ d2: 'yeni metin' });
  });

  it('kelime defterinde aynı kelimeyi farklı kimlikle de olsa tek tutar', () => {
    const other = stored();
    other[k('vocab')] = JSON.stringify([{ id: 'v9', word: 'müphem ', createdAt: 20 }]);
    const result = mergeBackup({ keys: stored(), textIds: new Set() }, backupOf(other), noSettings);
    expect(result.keys[k('vocab')]).toBeUndefined();
  });

  it('aynı yerdeki yer imini iki cihazdan gelse de tek tutar', () => {
    const mine = stored();
    mine[k('bookmarks')] = JSON.stringify([{ id: 'b1', docId: 'd1', charOffset: 120, createdAt: 10 }]);
    const other = stored();
    other[k('bookmarks')] = JSON.stringify([
      { id: 'b7', docId: 'd1', charOffset: 120, createdAt: 30 },
      { id: 'b8', docId: 'd1', charOffset: 900, createdAt: 40 },
    ]);
    const result = mergeBackup({ keys: mine, textIds: new Set() }, backupOf(other), noSettings);
    const merged = JSON.parse(result.keys[k('bookmarks')]);
    expect(merged.map((b: { id: string }) => b.id).sort()).toEqual(['b1', 'b8']);
    expect(summarizeBackup(backupOf(other)).bookmarks).toBe(2);
  });

  it('kitap başına tek plan: iki cihazda kurulmuşsa cihazdaki kalır', () => {
    const mine = stored();
    mine[k('plans')] = JSON.stringify([{ docId: 'd1', targetDay: '2026-10-20', createdAt: 5 }]);
    const other = stored();
    other[k('plans')] = JSON.stringify([
      { docId: 'd1', targetDay: '2026-11-01', createdAt: 9 },
      { docId: 'd2', targetDay: '2026-10-30', createdAt: 8 },
    ]);
    const result = mergeBackup({ keys: mine, textIds: new Set() }, backupOf(other), noSettings);
    const plans = JSON.parse(result.keys[k('plans')]);
    expect(plans).toHaveLength(2);
    expect(plans.find((p: { docId: string }) => p.docId === 'd1').targetDay).toBe('2026-10-20');
  });

  it('ayarları yalnızca istenirse alır ve API anahtarını korur', () => {
    const other = stored();
    other[k('settings')] = JSON.stringify({ wpm: 500, theme: 'dark' });
    const backup = backupOf(other);

    expect(mergeBackup({ keys: stored(), textIds: new Set() }, backup, noSettings).keys[k('settings')]).toBeUndefined();

    const result = mergeBackup({ keys: stored(), textIds: new Set() }, backup, { includeSettings: true });
    const settings = JSON.parse(result.keys[k('settings')]);
    expect(settings.wpm).toBe(500);
    expect(settings.aiApiKey).toBe('gizli-anahtar');
  });

  it('ilerlemede son güncellenen kazanır, ilk bitiş tarihi korunur', () => {
    const mine = stored();
    mine[k('progress/d1')] = JSON.stringify({ ratio: 0.2, updatedAt: 300, finished: false, finishedAt: 50 });
    const other = stored();
    other[k('progress/d1')] = JSON.stringify({ ratio: 0.9, updatedAt: 400, finished: true, finishedAt: 80 });
    const result = mergeBackup({ keys: mine, textIds: new Set() }, backupOf(other), noSettings);
    expect(JSON.parse(result.keys[k('progress/d1')])).toMatchObject({ ratio: 0.9, finishedAt: 50 });
  });

  it('görülmüş rozetleri birleştirir', () => {
    const other = stored();
    other[k('badges-seen')] = JSON.stringify(['ilk-oturum', 'seri-7']);
    const result = mergeBackup({ keys: stored(), textIds: new Set() }, backupOf(other), noSettings);
    expect(JSON.parse(result.keys[k('badges-seen')])).toEqual(['ilk-oturum', 'seri-7']);
  });

  it('kütüphanede olmayan dokümanın metnini almaz', () => {
    const result = mergeBackup(
      { keys: stored(), textIds: new Set() },
      backupOf(stored(), { yabanci: 'x' }),
      noSettings
    );
    expect(result.texts).toEqual({});
  });
});

describe('backupFileName', () => {
  it('tarihli dosya adı verir', () => {
    expect(backupFileName(new Date(2025, 9, 5).getTime())).toBe('hizli-okuma-yedek-2025-10-05.json');
  });
});
