import type { DictEntry, DictResult } from '@/ingest/tdk';
import { bestMatch, stemCandidates } from './stem';

/**
 * Çevrimdışı sözlüğün dilimleri — saf, testli (yükleme `ingest/offlineDict`te).
 *
 * Veri ilk harfe göre dilimlere ayrılmış (bkz. `scripts/dict/`). Arama TDK'daki
 * gibi: önce kelimenin kendisi, yoksa aday kökler (`stemCandidates`);
 * bulunanların en az soyulmuşu.
 */

const SEPARATOR = '\u001f';

/** Dilim adı: ilk harf (Türkçe harfler ASCII dosya adlarıyla; betikteki `shardOf`la aynı) */
export function shardOf(word: string): string {
  const first = word[0] ?? '';
  const map: Record<string, string> = { ç: 'c2', ğ: 'g2', ı: 'i2', ö: 'o2', ş: 's2', ü: 'u2', â: 'a', î: 'i', û: 'u' };
  if (map[first]) return map[first];
  return /^[a-z]$/.test(first) ? first : 'diger';
}

/** Dilim metni → kelime başına maddeler (satır: `kelime\ttür\tanlam␟anlam`, anlam `[etiket] metin`) */
export function parseShard(text: string): Map<string, DictEntry[]> {
  const words = new Map<string, DictEntry[]>();
  for (const line of text.split('\n')) {
    const [word, pos, body] = line.split('\t');
    if (!word || !body) continue;
    const meanings = body.split(SEPARATOR).map((raw) => {
      const labelled = /^\[([^\]]*)\] (.*)$/.exec(raw);
      const labels = labelled ? labelled[1].split(', ').filter(Boolean) : [];
      return { text: labelled ? labelled[2] : raw, tags: [pos, ...labels].filter(Boolean) };
    });
    const list = words.get(word) ?? [];
    list.push({ word, meanings });
    words.set(word, list);
  }
  return words;
}

type ShardLoader = (id: string) => Promise<Map<string, DictEntry[]> | null>;

/** Arama (dilim yükleyicisi dışarıdan: testlerde varlıksız çalışsın) */
export async function lookupIn(load: ShardLoader, word: string): Promise<DictResult | null> {
  const [form, ...stems] = stemCandidates(word);
  if (!form) return null;
  const found: { word: string; entries: DictEntry[] }[] = [];
  for (const candidate of [form, ...stems]) {
    const entries = (await load(shardOf(candidate)))?.get(candidate);
    if (entries?.length) found.push({ word: candidate, entries });
  }
  if (!found.length) return null;
  const best = found.find((item) => item.word === form) ?? bestMatch(found)!;
  return {
    query: form,
    entries: best.entries,
    alternatives: found.filter((item) => item !== best).map((item) => item.word),
    source: 'wiktionary',
  };
}
