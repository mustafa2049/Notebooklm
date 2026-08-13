import AsyncStorage from '@react-native-async-storage/async-storage';
import { addUsage, EMPTY_TOTALS, type TokenPrices, type UsageTotals } from '@/ai/cost';
import type { Section } from '@/ai/tasks';
import type { TokenUsage } from '@/ai/types';
import type { AiQuestion } from '@/ai/validate';
import { KEYS } from './keys';

/**
 * AI çıktılarının ve harcama sayacının cihazda saklanması.
 *
 * İki amaç: (1) aynı özeti ikinci kez üretip tekrar para harcamamak,
 * (2) kullanıcının ne harcadığını görebilmesi. Sunucu yok, her şey cihazda.
 */

export interface AiChatTurn {
  role: 'user' | 'assistant';
  text: string;
  at: number;
}

export interface AiDocumentCache {
  summary?: { text: string; model: string; at: number };
  sections?: { items: Section[]; model: string; at: number };
  questions?: { items: AiQuestion[]; model: string; at: number };
  chat?: AiChatTurn[];
}

export async function loadAiCache(docId: string): Promise<AiDocumentCache> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.aiCache(docId));
    return raw ? (JSON.parse(raw) as AiDocumentCache) : {};
  } catch {
    return {};
  }
}

async function writeAiCache(docId: string, cache: AiDocumentCache): Promise<void> {
  await AsyncStorage.setItem(KEYS.aiCache(docId), JSON.stringify(cache));
}

/** Var olan önbelleğe tek alan yazar (diğer alanları korur). */
export async function patchAiCache(
  docId: string,
  patch: Partial<AiDocumentCache>
): Promise<AiDocumentCache> {
  const current = await loadAiCache(docId);
  const next = { ...current, ...patch };
  await writeAiCache(docId, next);
  return next;
}

export async function clearAiCache(docId: string): Promise<void> {
  await AsyncStorage.removeItem(KEYS.aiCache(docId));
}

// ------------------------------------------------------------- harcama

export async function loadUsageTotals(): Promise<UsageTotals> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.aiUsage);
    return raw ? { ...EMPTY_TOTALS, ...(JSON.parse(raw) as Partial<UsageTotals>) } : EMPTY_TOTALS;
  } catch {
    return EMPTY_TOTALS;
  }
}

/** Bir çağrının kullanımını toplama ekler ve yeni toplamı döndürür. */
export async function recordUsage(usage: TokenUsage, prices: TokenPrices): Promise<UsageTotals> {
  const next = addUsage(await loadUsageTotals(), usage, prices);
  await AsyncStorage.setItem(KEYS.aiUsage, JSON.stringify(next));
  return next;
}

export async function resetUsageTotals(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.aiUsage);
}
