import { parseJsonLoose, postJson } from './http';
import { AiError, type AiProvider, type AiRequest, type AiResponse } from './types';

/**
 * OpenAI uyumlu `/chat/completions` bağdaştırıcısı.
 *
 * Tek dosyayla çok sağlayıcı: OpenAI, Google Gemini (uyumluluk uç noktası),
 * OpenRouter, Groq, DeepSeek, Together ve **yerel modeller** (Ollama, LM Studio)
 * aynı istek biçimini konuşuyor. Kullanıcı Ayarlar'dan sunucu adresini ve model
 * adını verir; kod hiçbir sağlayıcıya özel davranmaz.
 */

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

interface OpenAiOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface OpenAiResponseBody {
  model?: string;
  choices?: {
    message?: { content?: string | null };
    finish_reason?: string;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** 400 gövdesinde `response_format` geçiyorsa alanı düşürmek anlamlı. */
function isUnsupportedFormatError(caught: unknown): boolean {
  if (!(caught instanceof AiError) || caught.status !== 400) return false;
  return /response_format|json_schema|schema/i.test(caught.message);
}

export function createOpenAiCompatibleProvider(options: OpenAiOptions): AiProvider {
  const model = options.model.trim();
  const baseUrl = (options.baseUrl?.trim() || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, '');

  return {
    kind: 'openai-compatible',
    model,

    async complete(request: AiRequest, signal?: AbortSignal): Promise<AiResponse> {
      if (!model) {
        throw new AiError('Model adı girilmemiş. Ayarlar’dan model adını yazman gerekiyor.');
      }

      const headers: Record<string, string> = {};
      // Yerel modeller (Ollama, LM Studio) anahtar istemiyor; boşsa başlık gönderilmez
      const key = options.apiKey.trim();
      if (key) headers.authorization = `Bearer ${key}`;

      const body: Record<string, unknown> = {
        model,
        max_tokens: request.maxTokens,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
        ...(request.schema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: request.schema.name,
                  schema: request.schema.schema,
                  strict: true,
                },
              },
            }
          : {}),
      };

      let raw: OpenAiResponseBody;
      try {
        raw = (await postJson(
          `${baseUrl}/chat/completions`,
          headers,
          body,
          signal
        )) as OpenAiResponseBody;
      } catch (caught) {
        // Yerel modellerin ve bazı uyumluluk uç noktalarının `response_format`
        // desteği yok; alanı düşürüp yeniden deniyoruz. İstem JSON biçimini
        // zaten tarif ediyor, yanıt `validate.ts` ile doğrulanıyor.
        if (!request.schema || !isUnsupportedFormatError(caught)) throw caught;
        const { response_format: _dropped, ...withoutFormat } = body;
        raw = (await postJson(
          `${baseUrl}/chat/completions`,
          headers,
          withoutFormat,
          signal
        )) as OpenAiResponseBody;
      }

      const choice = raw.choices?.[0];
      const text = (choice?.message?.content ?? '').trim();

      if (!text) {
        throw new AiError('Model boş yanıt döndürdü.', { retryable: true });
      }

      if (choice?.finish_reason === 'length' && request.schema) {
        throw new AiError(
          'Yanıt uzunluk sınırına takıldığı için yarım kaldı. Daha kısa bir bölümle dene.',
          { retryable: true }
        );
      }

      return {
        text,
        json: request.schema ? parseJsonLoose(text) : undefined,
        usage: {
          inputTokens: raw.usage?.prompt_tokens ?? 0,
          outputTokens: raw.usage?.completion_tokens ?? 0,
        },
        model: raw.model ?? model,
      };
    },
  };
}
