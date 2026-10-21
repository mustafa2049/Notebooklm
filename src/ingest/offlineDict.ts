import { lookupIn, parseShard, shardOf } from '@/core/dictShard';
import { readAssetText } from './assetText';
import type { DictEntry, DictResult } from './tdk';

/**
 * Çevrimdışı sözlük: uygulamayla gelen Vikisözlük verisi (~110 bin kelime,
 * bkz. `scripts/dict/`). TDK'ya ulaşılamayınca ya da TDK bulamayınca bakılır.
 *
 * Bir dilim ilk gerektiğinde okunup bellekte tutulur (bütün sözlük birden
 * yüklenmez); ayrıştırma ve arama `core/dictShard`te.
 */

const shards = new Map<string, Promise<Map<string, DictEntry[]> | null>>();

async function loadShard(id: string): Promise<Map<string, DictEntry[]> | null> {
  let pending = shards.get(id);
  if (!pending) {
    pending = (async () => {
      const { DICT_SHARDS } = await import('./dictShards');
      const module = DICT_SHARDS[id];
      if (module === undefined) return null;
      return parseShard(await readAssetText(module));
    })();
    // Okunamazsa bir dahaki aramada yeniden denensin
    pending.catch(() => shards.delete(id));
    shards.set(id, pending);
  }
  return pending;
}

/** Çevrimdışı sözlükte arar; bulunamazsa ya da veri okunamazsa `null` */
export async function lookupOffline(word: string): Promise<DictResult | null> {
  try {
    return await lookupIn(loadShard, word);
  } catch {
    return null;
  }
}

/** Önerilen başka kökü doğrudan getirir */
export async function lookupOfflineExact(word: string): Promise<DictResult | null> {
  try {
    const entries = (await loadShard(shardOf(word)))?.get(word);
    return entries?.length ? { query: word, entries, alternatives: [], source: 'wiktionary' } : null;
  } catch {
    return null;
  }
}
