import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { bestMatch, stemCandidates } from '@/core/stem';

/**
 * TDK Güncel Türkçe Sözlük'ten kelime anlamı (yapay zekâ gerekmez).
 *
 * `sozluk.gov.tr/gts?ara=` herkese açık; CORS izni verdiği için web'de de
 * doğrudan çağrılabiliyor. Çekimli kelime sözlükte olmadığından önce kelimenin
 * kendisi, bulunamazsa aday kökler (`stemCandidates`) birlikte sorulur ve
 * bulunanların en az soyulmuşu gösterilir.
 *
 * Bulunan maddeler cihazda önbelleğe alınır (yedeğe girmez: yeniden
 * indirilebilir), aynı kelime için ikinci istek atılmaz.
 */

const ENDPOINT = 'https://sozluk.gov.tr/gts?ara=';
/** Yedek dışı önbellek: yedek yalnızca `hizliokuma/v1` önekini alıyor */
const CACHE_KEY = 'hizliokuma-cache/v1/tdk';
const CACHE_LIMIT = 300;
const TIMEOUT_MS = 10_000;
/** Bir maddeden gösterilen en çok anlam */
const MAX_MEANINGS = 3;

export interface DictMeaning {
  text: string;
  /** "isim", "sıfat", "mecaz"… */
  tags: string[];
  example?: string;
}

export interface DictEntry {
  /** Madde başı ("kalem") */
  word: string;
  /** Köken ("Arapça ḳalem") */
  origin?: string;
  meanings: DictMeaning[];
}

export interface DictResult {
  /** Aranan biçim (çekimli olabilir) */
  query: string;
  entries: DictEntry[];
  /** Başka bulunan kökler ("yazmak" yanında "yaz") */
  alternatives: string[];
}

export class DictOfflineError extends Error {
  constructor() {
    super('Sözlüğe ulaşılamadı. İnternet bağlantını kontrol et.');
  }
}

interface RawMeaning {
  anlam?: unknown;
  ozelliklerListe?: { tam_adi?: unknown }[] | null;
  orneklerListe?: { ornek?: unknown }[] | null;
}
interface RawEntry {
  madde?: unknown;
  lisan?: unknown;
  anlamlarListe?: RawMeaning[] | null;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * TDK yanıtını ayrıştırır. Bulunamadıysa (`{"error": …}`) boş liste.
 * Aynı yazılışlı maddeler (yaz¹, yaz²) ayrı girdi olarak döner.
 */
export function parseTdk(body: unknown): DictEntry[] {
  if (!Array.isArray(body)) return [];
  const entries: DictEntry[] = [];
  for (const raw of body as RawEntry[]) {
    const word = text(raw?.madde);
    if (!word) continue;
    const meanings: DictMeaning[] = [];
    for (const meaning of raw.anlamlarListe ?? []) {
      const value = text(meaning?.anlam);
      if (!value) continue;
      const tags = (meaning.ozelliklerListe ?? []).map((tag) => text(tag?.tam_adi)).filter(Boolean);
      const example = (meaning.orneklerListe ?? []).map((item) => text(item?.ornek)).find(Boolean);
      meanings.push({ text: value, tags, ...(example ? { example } : {}) });
      if (meanings.length >= MAX_MEANINGS) break;
    }
    if (!meanings.length) continue;
    const origin = text(raw.lisan);
    entries.push({ word, ...(origin ? { origin } : {}), meanings });
  }
  return entries;
}

/** Deftere not olarak: "isim · Yazma, çizme… ; Resmî kuruluşlarda…" */
export function entryNote(entry: DictEntry): string {
  const lines = entry.meanings.map((meaning, index) => {
    const tags = meaning.tags.length ? `(${meaning.tags.join(', ')}) ` : '';
    return `${index + 1}. ${tags}${meaning.text}`;
  });
  return [`TDK — ${entry.word}`, ...lines].join('\n');
}

type Cache = Record<string, { entries: DictEntry[]; at: number }>;

async function readCache(): Promise<Cache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

async function remember(word: string, entries: DictEntry[]): Promise<void> {
  const cache = await readCache();
  cache[word] = { entries, at: Date.now() };
  const names = Object.keys(cache);
  if (names.length > CACHE_LIMIT) {
    names.sort((a, b) => cache[a].at - cache[b].at);
    for (const name of names.slice(0, names.length - CACHE_LIMIT)) delete cache[name];
  }
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Önbellek yazılamazsa sonuç yine gösterilir
  }
}

/** Oturum içi: bulunamayanlar tekrar sorulmasın */
const missing = new Set<string>();

async function fetchWord(word: string): Promise<DictEntry[]> {
  if (missing.has(word)) return [];
  const cached = (await readCache())[word];
  if (cached) return cached.entries;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(ENDPOINT + encodeURIComponent(word), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // Sunucu tarayıcı dışı istemcilere boş yanıt veriyor; web'de tarayıcı kendi kimliğini yollar
        ...(Platform.OS === 'web'
          ? {}
          : { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' }),
      },
    });
  } catch {
    throw new DictOfflineError();
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new DictOfflineError();
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new DictOfflineError();
  }
  const entries = parseTdk(body);
  if (entries.length) await remember(word, entries);
  else missing.add(word);
  return entries;
}

/**
 * Kelimeyi sözlükte arar. Önce kelimenin kendisi; yoksa aday kökler paralel
 * sorulur. Hiçbiri yoksa `null`. Ağ hatasında `DictOfflineError`.
 */
export async function lookupWord(word: string): Promise<DictResult | null> {
  const [form, ...stems] = stemCandidates(word);
  if (!form) return null;
  const direct = await fetchWord(form);
  if (direct.length) return { query: form, entries: direct, alternatives: [] };
  if (!stems.length) return null;

  const results = await Promise.allSettled(stems.map((stem) => fetchWord(stem)));
  const found = stems
    .map((stem, index) => {
      const result = results[index];
      return { word: stem, entries: result.status === 'fulfilled' ? result.value : [] };
    })
    .filter((item) => item.entries.length);
  if (!found.length) {
    // Hepsi ağ hatasıysa çevrimdışıyız
    if (results.every((result) => result.status === 'rejected')) throw new DictOfflineError();
    return null;
  }
  const best = bestMatch(found)!;
  return {
    query: form,
    entries: best.entries,
    alternatives: found.filter((item) => item !== best).map((item) => item.word),
  };
}

/** Önerilen başka kökü doğrudan getirir (önbellekten ya da ağdan) */
export async function lookupExact(word: string): Promise<DictResult | null> {
  const entries = await fetchWord(word);
  return entries.length ? { query: word, entries, alternatives: [] } : null;
}
