import { lookupOffline, lookupOfflineExact } from './offlineDict';
import { DictOfflineError, lookupExact, lookupWord, type DictResult } from './tdk';

/**
 * Kelime anlamı: önce TDK (internet), olmazsa uygulamayla gelen Vikisözlük.
 *
 * - TDK'ya ulaşılamazsa Vikisözlük'e bakılır; o da bulamazsa çevrimdışı
 *   hatası korunur ("İnternet bağlantını kontrol et").
 * - TDK bulamazsa da Vikisözlük'e bakılır (bazı kelimeler yalnızca orada).
 */
export async function lookUpMeaning(word: string, exact?: string): Promise<DictResult | null> {
  let online: DictResult | null;
  try {
    online = exact ? await lookupExact(exact) : await lookupWord(word);
  } catch (error) {
    if (!(error instanceof DictOfflineError)) throw error;
    const offline = exact ? await lookupOfflineExact(exact) : await lookupOffline(word);
    if (offline) return { ...offline, tdkUnreachable: true };
    throw error;
  }
  if (online) return { ...online, source: 'tdk' };
  return exact ? lookupOfflineExact(exact) : lookupOffline(word);
}
