import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '@/store/SettingsContext';
import { recordUsage } from '@/storage/ai';
import { createProvider, isAiConfigured, pricesFrom } from './index';
import { formatCost, formatTokens } from './cost';
import type { AiResult } from './tasks';
import { AiError, type AiProvider } from './types';

/**
 * AI çağrılarını arayüzden koşturan kanca.
 *
 * Üç şeyi tek yerde toplar: sağlayıcının kurulması, harcamanın kaydı ve hata
 * mesajının Türkçeleştirilmiş hâli. Ekran bileşenleri sağlayıcıyı hiç görmez.
 * Ekrandan çıkılırsa süren istek iptal edilir (`AbortController`).
 */

export interface LastCall {
  tokens: string;
  /** Fiyat girilmemişse null — uydurma tutar gösterilmiyor */
  cost: string | null;
}

export interface UseAi {
  configured: boolean;
  busy: boolean;
  error: string | null;
  lastCall: LastCall | null;
  clearError: () => void;
  /** İşi koşturur; hata olursa `null` döner ve `error` dolar. */
  run: <T>(task: (provider: AiProvider, signal: AbortSignal) => Promise<AiResult<T>>) => Promise<T | null>;
}

export function useAi(): UseAi {
  const { settings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCall, setLastCall] = useState<LastCall | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const run = useCallback(
    async <T,>(
      task: (provider: AiProvider, signal: AbortSignal) => Promise<AiResult<T>>
    ): Promise<T | null> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setBusy(true);
      setError(null);
      try {
        const provider = createProvider(settings);
        const result = await task(provider, controller.signal);
        const totalTokens = result.usage.inputTokens + result.usage.outputTokens;
        const prices = pricesFrom(settings);
        const totals = await recordUsage(result.usage, prices);
        if (aliveRef.current) {
          setLastCall({
            tokens: formatTokens(totalTokens),
            cost:
              prices.inputPerMillion > 0 || prices.outputPerMillion > 0
                ? formatCost(totals.costUsd)
                : null,
          });
        }
        return result.value;
      } catch (caught) {
        // Kullanıcı ekrandan çıktıysa hata göstermenin anlamı yok
        if (controller.signal.aborted || !aliveRef.current) return null;
        setError(caught instanceof AiError ? caught.message : 'Beklenmeyen bir hata oluştu.');
        return null;
      } finally {
        if (aliveRef.current) setBusy(false);
      }
    },
    [settings]
  );

  return {
    configured: isAiConfigured(settings),
    busy,
    error,
    lastCall,
    clearError: useCallback(() => setError(null), []),
    run,
  };
}
