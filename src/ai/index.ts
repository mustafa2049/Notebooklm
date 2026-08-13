import { Platform } from 'react-native';
import type { Settings } from '@/storage/settings';
import { createAnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from './anthropic';
import type { TokenPrices } from './cost';
import { createOpenAiCompatibleProvider, DEFAULT_OPENAI_BASE_URL } from './openaiCompatible';
import { AiError, type AiProvider } from './types';

/**
 * Ayarlardan sağlayıcı üretimi — platform bilen tek AI dosyası.
 *
 * Bağdaştırıcılar `react-native` içe aktarmıyor (testlerde doğrudan koşuyorlar);
 * tarayıcıda mı çalışıyoruz bilgisini buradan alıyorlar.
 */

export function isAiConfigured(settings: Settings): boolean {
  if (settings.aiProvider === 'anthropic') return settings.aiApiKey.trim().length > 0;
  // Yerel modelde anahtar gerekmiyor ama adres ve model adı gerekiyor
  const hasModel = settings.aiModel.trim().length > 0;
  return hasModel && (settings.aiApiKey.trim().length > 0 || settings.aiBaseUrl.trim().length > 0);
}

export function createProvider(settings: Settings): AiProvider {
  if (!isAiConfigured(settings)) {
    throw new AiError('AI ayarlanmamış. Ayarlar → Yapay zekâ bölümünden sağlayıcı ve anahtar gir.');
  }

  if (settings.aiProvider === 'anthropic') {
    return createAnthropicProvider({
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      browser: Platform.OS === 'web',
    });
  }

  return createOpenAiCompatibleProvider({
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
    baseUrl: settings.aiBaseUrl,
  });
}

export function pricesFrom(settings: Settings): TokenPrices {
  return {
    inputPerMillion: settings.aiInputPrice,
    outputPerMillion: settings.aiOutputPrice,
  };
}

/** Ayarlar ekranında "boş bırakırsan bu kullanılır" bilgisi için. */
export function providerDefaults(kind: Settings['aiProvider']): { model: string; baseUrl: string } {
  return kind === 'anthropic'
    ? { model: DEFAULT_ANTHROPIC_MODEL, baseUrl: 'https://api.anthropic.com' }
    : { model: '', baseUrl: DEFAULT_OPENAI_BASE_URL };
}

export { AiError } from './types';
export type { AiProvider, AiRequest, AiResponse, TokenUsage } from './types';
export {
  addUsage,
  EMPTY_TOTALS,
  estimateCost,
  formatCost,
  formatTokens,
  type TokenPrices,
  type UsageTotals,
} from './cost';
export {
  askAboutText,
  explainWord,
  generateQuestions,
  generateSections,
  generateSummary,
  type AiResult,
  type ChatTurn,
  type Section,
} from './tasks';
export type { AiQuestion } from './validate';
