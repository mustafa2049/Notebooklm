/**
 * AI katmanının sağlayıcıdan bağımsız arayüzü.
 *
 * Uygulamanın hiçbir yeri belirli bir sağlayıcıyı bilmez: özet, soru üretimi ve
 * sohbet yalnızca `AiProvider` arayüzüne konuşur. Yeni bir sağlayıcı eklemek =
 * bu arayüzü uygulayan tek bir dosya yazmak.
 */

export type AiProviderKind = 'anthropic' | 'openai-compatible';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Yanıtın uyması gereken JSON şeması (soru ve bölüm üretiminde kullanılır). */
export interface AiSchema {
  /** Sağlayıcıların şemaya verdiği ad (OpenAI uyumlu API zorunlu tutuyor) */
  name: string;
  schema: Record<string, unknown>;
}

export interface AiRequest {
  system: string;
  prompt: string;
  /** Verilirse yanıt JSON olarak şemaya uydurulur */
  schema?: AiSchema;
  maxTokens: number;
}

export interface AiResponse {
  /** Modelin düz metin yanıtı */
  text: string;
  /** `schema` verildiyse ayrıştırılmış JSON */
  json?: unknown;
  usage: TokenUsage;
  /** Yanıtı gerçekte üreten model (ayarlanandan farklı olabilir) */
  model: string;
}

export interface AiProvider {
  readonly kind: AiProviderKind;
  readonly model: string;
  complete(request: AiRequest, signal?: AbortSignal): Promise<AiResponse>;
}

/**
 * Kullanıcıya gösterilebilir AI hatası.
 *
 * Sağlayıcıların ham hata gövdeleri İngilizce ve teknik; bunları burada
 * Türkçeye ve eyleme dönüştürülebilir bir mesaja çeviriyoruz. `retryable`,
 * arayüzün "yeniden dene" düğmesi gösterip göstermeyeceğini belirler.
 */
export class AiError extends Error {
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, options: { retryable?: boolean; status?: number; cause?: unknown } = {}) {
    super(message);
    this.name = 'AiError';
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}
