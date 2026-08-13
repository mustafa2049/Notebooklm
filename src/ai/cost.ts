import type { TokenUsage } from './types';

/**
 * Token sayacı ve maliyet tahmini.
 *
 * **Fiyat tablosu bilerek yok.** Sağlayıcıyı kullanıcı seçiyor (Claude, OpenAI,
 * Gemini, OpenRouter, yerel model…) ve fiyatlar zamanla değişiyor; koda gömülü
 * bir tablo bir süre sonra kullanıcıya yanlış sayı gösterirdi. Bunun yerine
 * fiyatlar Ayarlar'dan giriliyor (1 milyon token başına dolar). Girilmezse
 * yalnızca token sayısı gösterilir — uydurma bir maliyet gösterilmez.
 */

export interface TokenPrices {
  /** 1M girdi tokeni başına USD; 0 = bilinmiyor */
  inputPerMillion: number;
  /** 1M çıktı tokeni başına USD; 0 = bilinmiyor */
  outputPerMillion: number;
}

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  /** Fiyat girilmişse birikmiş tahmini maliyet (USD) */
  costUsd: number;
}

export const EMPTY_TOTALS: UsageTotals = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
};

/** Fiyat girilmemişse `null` döner — "0 dolar" demek yanıltıcı olurdu. */
export function estimateCost(usage: TokenUsage, prices: TokenPrices): number | null {
  const { inputPerMillion, outputPerMillion } = prices;
  if (inputPerMillion <= 0 && outputPerMillion <= 0) return null;
  return (
    (usage.inputTokens * Math.max(0, inputPerMillion)) / 1_000_000 +
    (usage.outputTokens * Math.max(0, outputPerMillion)) / 1_000_000
  );
}

export function addUsage(totals: UsageTotals, usage: TokenUsage, prices: TokenPrices): UsageTotals {
  return {
    calls: totals.calls + 1,
    inputTokens: totals.inputTokens + usage.inputTokens,
    outputTokens: totals.outputTokens + usage.outputTokens,
    costUsd: totals.costUsd + (estimateCost(usage, prices) ?? 0),
  };
}

/** 12.400 token → "12,4 B" (binlerde kısaltma, Türkçe ayraçla) */
export function formatTokens(count: number): string {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  const digits = thousands < 100 ? 1 : 0;
  return `${thousands.toFixed(digits).replace('.', ',')} B`;
}

/**
 * Küçük tutarlar önemli: bir özet birkaç sente denk geliyor, iki hane
 * gösterilirse hep "0,00" yazardı. 1 dolar altında dört hane gösteriyoruz.
 */
export function formatCost(usd: number | null): string | null {
  if (usd === null) return null;
  const digits = usd > 0 && usd < 1 ? 4 : 2;
  return `$${usd.toFixed(digits).replace('.', ',')}`;
}
