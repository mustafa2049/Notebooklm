/**
 * Yedek dosyasının biçimi, doğrulaması ve birleştirme kuralları — saf, testli.
 *
 * Bütün veriler yalnızca cihazda duruyor; tarayıcı verisi silinirse seri,
 * ölçümler ve kütüphane gider. Yedek bunun sigortası ve cihaz değiştirmenin
 * yolu. Okuma/yazma `storage/backup.ts` içinde; burada depoya dokunulmuyor.
 *
 * İçe aktarma **birleştirir**, ezmez: aynı yedeği iki kez yüklemek kopya
 * üretmez, telefondaki ve bilgisayardaki kayıtlar bir arada kalır.
 */

export const BACKUP_FORMAT = 'hizliokuma-yedek';
export const BACKUP_VERSION = 1;
export const KEY_PREFIX = 'hizliokuma/v1/';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: number;
  /** Depo anahtarı → ham JSON metni (depoda nasılsa öyle) */
  keys: Record<string, string>;
  /** Doküman kimliği → metin */
  texts: Record<string, string>;
}

/**
 * Yedeğe girmeyen ayarlar. API anahtarı dosyayla birlikte paylaşılabilir,
 * bulut klasörüne düşebilir — anahtar yalnızca girildiği cihazda kalır.
 */
const PRIVATE_SETTINGS = ['aiApiKey'] as const;

export type ValidationResult = { ok: true; backup: Backup } | { ok: false; error: string };

function isRecordOf(value: unknown, check: (item: unknown) => boolean): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(check)
  );
}

/** Dosyadan okunan metni yedek olarak doğrular. Hata mesajı kullanıcıya gösterilir. */
export function validateBackup(raw: string): ValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Dosya okunamadı: geçerli bir JSON değil.' };
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Bu bir Hızlı Okuma yedeği değil.' };
  }
  const value = data as Partial<Backup>;
  if (value.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'Bu bir Hızlı Okuma yedeği değil.' };
  }
  if (typeof value.version !== 'number' || value.version < 1) {
    return { ok: false, error: 'Yedeğin sürümü okunamadı.' };
  }
  if (value.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: 'Bu yedek uygulamanın daha yeni bir sürümüyle alınmış. Önce uygulamayı güncelle.',
    };
  }
  if (typeof value.createdAt !== 'number') {
    return { ok: false, error: 'Yedeğin tarihi okunamadı.' };
  }
  if (!isRecordOf(value.keys, (item) => typeof item === 'string')) {
    return { ok: false, error: 'Yedeğin içeriği bozuk.' };
  }
  if (!isRecordOf(value.texts, (item) => typeof item === 'string')) {
    return { ok: false, error: 'Yedekteki metinler bozuk.' };
  }

  const keys: Record<string, string> = {};
  for (const [key, json] of Object.entries(value.keys as Record<string, string>)) {
    // Başka uygulamanın anahtarı yazılamaz
    if (!key.startsWith(KEY_PREFIX)) continue;
    try {
      JSON.parse(json);
    } catch {
      return { ok: false, error: 'Yedeğin içeriği bozuk.' };
    }
    keys[key] = json;
  }

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: value.version,
      createdAt: value.createdAt,
      keys,
      texts: value.texts as Record<string, string>,
    },
  };
}

/** Depodaki değerlerden yedek oluşturur (gizli ayarlar çıkarılır). */
export function createBackup(
  stored: Record<string, string>,
  texts: Record<string, string>,
  now: number
): Backup {
  const keys: Record<string, string> = {};
  for (const [key, json] of Object.entries(stored)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    keys[key] = key === `${KEY_PREFIX}settings` ? withoutPrivateSettings(json) : json;
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: now, keys, texts };
}

function withoutPrivateSettings(json: string): string {
  try {
    const settings = JSON.parse(json) as Record<string, unknown>;
    for (const name of PRIVATE_SETTINGS) delete settings[name];
    return JSON.stringify(settings);
  } catch {
    return '{}';
  }
}

// ------------------------------------------------------------- özet

export interface BackupSummary {
  documents: number;
  sessions: number;
  assessments: number;
  vocab: number;
  highlights: number;
  hasSettings: boolean;
}

function arrayLength(json: string | undefined): number {
  if (!json) return 0;
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
}

/** Geri yüklemeden önce kullanıcıya "bu yedekte ne var" göstermek için. */
export function summarizeBackup(backup: Backup): BackupSummary {
  const key = (name: string) => backup.keys[`${KEY_PREFIX}${name}`];
  return {
    documents: arrayLength(key('documents')),
    sessions: arrayLength(key('sessions')),
    assessments: arrayLength(key('assessments')),
    vocab: arrayLength(key('vocab')),
    highlights: arrayLength(key('highlights')),
    hasSettings: Boolean(key('settings')),
  };
}

// ------------------------------------------------------------- birleştirme

type Item = Record<string, unknown>;

interface ListRule {
  /** Aynı kaydı tanıyan anahtar */
  identity: (item: Item) => string;
  /** Depodaki üst sınırla aynı */
  max: number;
}

const byId = (item: Item) => String(item.id);

/** Liste tutan anahtarlar ve kayıtların nasıl tekilleştirileceği. */
const LIST_RULES: Record<string, ListRule> = {
  documents: { identity: byId, max: Number.POSITIVE_INFINITY },
  // Oturumların kimliği yok; aynı an + aynı doküman + aynı süre aynı oturumdur
  sessions: { identity: (s) => `${s.at}|${s.docId}|${s.ms}`, max: 1000 },
  assessments: { identity: byId, max: 500 },
  drills: { identity: (d) => `${d.drill}|${d.at}`, max: 500 },
  // Defter aynı kelimeyi iki kez tutmuyor (bkz. addVocab); iki cihazda ayrı
  // kimlikle eklenmiş aynı kelime de tek kayıt olmalı
  vocab: {
    identity: (v) => String(v.word ?? '').trim().toLocaleLowerCase('tr'),
    max: 2000,
  },
  highlights: { identity: byId, max: 5000 },
  recalls: { identity: byId, max: 2000 },
};

function timeOf(item: Item): number {
  const value = item.at ?? item.createdAt ?? 0;
  return typeof value === 'number' ? value : 0;
}

function parse(json: string | undefined): unknown {
  if (json === undefined) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function mergeList(current: unknown, incoming: unknown, rule: ListRule): Item[] {
  const items = (value: unknown): Item[] =>
    Array.isArray(value) ? value.filter((item): item is Item => typeof item === 'object' && item !== null) : [];

  const merged = new Map<string, Item>();
  // Mevcut kayıt önce gelir: aynı kayıt iki yanda varsa cihazdaki kalır
  for (const item of [...items(current), ...items(incoming)]) {
    const id = rule.identity(item);
    if (!merged.has(id)) merged.set(id, item);
  }
  return [...merged.values()].sort((a, b) => timeOf(b) - timeOf(a)).slice(0, rule.max);
}

function mergeStringSet(current: unknown, incoming: unknown): string[] {
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  return [...new Set([...strings(current), ...strings(incoming)])];
}

/** İlerleme: en son güncellenen kazanır, ama ilk bitiş tarihi korunur. */
function mergeProgress(current: Item, incoming: Item): Item {
  const newer = Number(incoming.updatedAt ?? 0) > Number(current.updatedAt ?? 0) ? incoming : current;
  const finishes = [current.finishedAt, incoming.finishedAt].filter(
    (value): value is number => typeof value === 'number'
  );
  const result: Item = { ...newer };
  if (finishes.length) result.finishedAt = Math.min(...finishes);
  return result;
}

export interface MergeOptions {
  /** Ayarlar yalnızca kullanıcı isterse alınır (görünüm cihaza göre değişebilir) */
  includeSettings: boolean;
}

export interface MergeResult {
  /** Yazılması gereken anahtarlar (değişmeyenler yok) */
  keys: Record<string, string>;
  /** Eklenmesi gereken doküman metinleri (zaten olanlar yok) */
  texts: Record<string, string>;
}

/**
 * Cihazdaki verilerle yedeği birleştirir. Yalnızca değişen anahtarları ve
 * eksik metinleri döner; aynı yedeği ikinci kez vermek boş sonuç verir.
 */
export function mergeBackup(
  current: { keys: Record<string, string>; textIds: Set<string> },
  incoming: Backup,
  options: MergeOptions
): MergeResult {
  const writes: Record<string, string> = {};

  for (const [key, incomingJson] of Object.entries(incoming.keys)) {
    const name = key.slice(KEY_PREFIX.length);
    const currentJson = current.keys[key];
    let next: string | undefined;

    if (name === 'settings') {
      if (!options.includeSettings) continue;
      const mine = (parse(currentJson) ?? {}) as Item;
      const theirs = (parse(incomingJson) ?? {}) as Item;
      const merged: Item = { ...mine, ...theirs };
      // Gizli ayarlar yedekte yok; cihazdaki değer korunur
      for (const privateName of PRIVATE_SETTINGS) {
        if (privateName in mine) merged[privateName] = mine[privateName];
        else delete merged[privateName];
      }
      next = JSON.stringify(merged);
    } else if (LIST_RULES[name]) {
      next = JSON.stringify(mergeList(parse(currentJson), parse(incomingJson), LIST_RULES[name]));
    } else if (name === 'badges-seen') {
      next = JSON.stringify(mergeStringSet(parse(currentJson), parse(incomingJson)));
    } else if (name.startsWith('progress/')) {
      const mine = parse(currentJson);
      const theirs = parse(incomingJson);
      next =
        mine && typeof mine === 'object' && theirs && typeof theirs === 'object'
          ? JSON.stringify(mergeProgress(mine as Item, theirs as Item))
          : incomingJson;
    } else {
      // AI önbelleği, harcama sayacı ve bilinmeyen anahtarlar: cihazdaki varsa o kalır
      next = currentJson ?? incomingJson;
    }

    if (next !== undefined && next !== currentJson) {
      // Sıra farkı dışında aynıysa yazma (tekrar içe aktarma "değişiklik" sayılmasın)
      if (currentJson !== undefined && sameJson(currentJson, next)) continue;
      writes[key] = next;
    }
  }

  // Metinler yalnızca birleşik kütüphanede yer alan ve cihazda olmayan dokümanlar için
  const documentsJson = writes[`${KEY_PREFIX}documents`] ?? current.keys[`${KEY_PREFIX}documents`];
  const documents = parse(documentsJson);
  const knownIds = new Set(
    Array.isArray(documents) ? documents.map((doc) => String((doc as Item).id)) : []
  );
  const texts: Record<string, string> = {};
  for (const [id, text] of Object.entries(incoming.texts)) {
    if (knownIds.has(id) && !current.textIds.has(id)) texts[id] = text;
  }

  return { keys: writes, texts };
}

function sameJson(a: string, b: string): boolean {
  if (a === b) return true;
  const left = parse(a);
  const right = parse(b);
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    const seen = new Set(left.map((item) => JSON.stringify(item)));
    return right.every((item) => seen.has(JSON.stringify(item)));
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Dosya adı: hizli-okuma-yedek-2025-10-15.json */
export function backupFileName(now: number): string {
  const date = new Date(now);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `hizli-okuma-yedek-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
