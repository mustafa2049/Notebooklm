import { parseJsonLoose, postJson } from './http';
import { AiError, type AiProvider, type AiRequest, type AiResponse } from './types';

/**
 * Claude (Anthropic Messages API) bağdaştırıcısı.
 *
 * Resmî `@anthropic-ai/sdk` paketi kullanılmıyor: paketin kendi README'si
 * "React Native is not supported at this time" diyor ve birincil hedefimiz
 * Android. Tek bir `fetch` yolu, web'de SDK + telefonda ayrı yol ikilisinden
 * hem daha az kod hem daha az sapma demek. Kullanılan alanlar (Messages API,
 * `output_config.format`) kararlı ve dokümante.
 */

const DEFAULT_BASE_URL = 'https://api.anthropic.com';

/**
 * Varsayılan model: hızlı ve ucuz olan. Özet ve soru üretimi sınırları belli
 * işler, en pahalı modele gerek yok. Kullanıcı Ayarlar'dan daha güçlü bir model
 * adı yazabilir; kod model adına göre hiçbir varsayım yapmıyor.
 */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5';

/** Messages API sürüm başlığı — sabit. */
const API_VERSION = '2023-06-01';

/**
 * Düşünme derinliği. Bu işlerde `medium`, belirgin kalite kaybı olmadan token
 * harcamasını düşürüyor. Eski modeller bu alanı tanımıyor; tanımadığında
 * aşağıdaki geri çekilme (fallback) devreye giriyor.
 */
const EFFORT = 'medium';

interface AnthropicOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /**
   * Tarayıcıdan çalışıyorsak `true`. Platform tespiti bilerek burada değil
   * çağıranda (`src/ai/index.ts`): bu dosya `react-native` içe aktarmadığı
   * için testlerde doğrudan koşabiliyor.
   */
  browser?: boolean;
}

interface AnthropicResponseBody {
  model?: string;
  stop_reason?: string;
  stop_details?: { category?: string | null; explanation?: string | null } | null;
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

function hasOutputConfig(body: Record<string, unknown>): boolean {
  const config = body.output_config;
  return typeof config === 'object' && config !== null && Object.keys(config).length > 0;
}

/**
 * 400, "bu alanı tanımıyorum" mu demek istiyor? Sağlayıcı hata gövdesinde alanın
 * adını geçiriyor; sadece bu durumda alanı düşürüp yeniden deniyoruz. Model adı
 * yanlış olduğunda gelen 400'de bu adlar geçmez, o hata olduğu gibi yükselir.
 */
function isUnsupportedFieldError(caught: unknown): boolean {
  if (!(caught instanceof AiError) || caught.status !== 400) return false;
  return /output_config|effort|json_schema|format/i.test(caught.message);
}

export function createAnthropicProvider(options: AnthropicOptions): AiProvider {
  const model = options.model?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const baseUrl = (options.baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');

  return {
    kind: 'anthropic',
    model,

    async complete(request: AiRequest, signal?: AbortSignal): Promise<AiResponse> {
      if (!options.apiKey.trim()) {
        throw new AiError('Anthropic API anahtarı girilmemiş. Ayarlar’dan ekleyebilirsin.');
      }

      const headers: Record<string, string> = {
        'x-api-key': options.apiKey.trim(),
        'anthropic-version': API_VERSION,
      };

      // Tarayıcı, API anahtarını sızdırma riski nedeniyle çapraz köken istekleri
      // varsayılan olarak engelliyor; Anthropic bu başlıkla açık izin istiyor.
      // Başlığın adı ve değeri resmî SDK kaynağından birebir alındı.
      if (options.browser) {
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      }

      const base = {
        model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
      };

      const schemaFormat = request.schema
        ? { format: { type: 'json_schema', schema: request.schema.schema } }
        : {};

      /**
       * Model adını kullanıcı yazıyor; yazdığı model `output_config`'i ya da
       * yapılandırılmış çıktıyı tanımıyorsa istek 400 döner. Bu durumda önce
       * `effort`'ten, sonra `output_config`'in tamamından vazgeçip yeniden
       * deniyoruz. Şema düşse de istem JSON biçimini açıkça tarif ediyor ve
       * yanıt `validate.ts` ile doğrulanıyor — özellik kaybolmuyor, garanti
       * zayıflıyor.
       */
      const attempts: Record<string, unknown>[] = [
        { ...base, output_config: { effort: EFFORT, ...schemaFormat } },
        { ...base, output_config: schemaFormat },
        base,
      ];

      let raw: AnthropicResponseBody | null = null;
      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        if (i > 0 && !hasOutputConfig(attempts[i - 1])) break;
        try {
          raw = (await postJson(
            `${baseUrl}/v1/messages`,
            headers,
            attempt,
            signal
          )) as AnthropicResponseBody;
          break;
        } catch (caught) {
          const last = i === attempts.length - 1;
          if (last || !isUnsupportedFieldError(caught)) throw caught;
        }
      }
      if (!raw) throw new AiError('Sağlayıcıdan yanıt alınamadı.', { retryable: true });

      // Güvenlik sınıflandırıcısı isteği reddettiğinde HTTP 200 dönüyor ve
      // `content` boş olabiliyor — `content[0]` okumadan önce bunu kontrol et.
      if (raw.stop_reason === 'refusal') {
        const category = raw.stop_details?.category;
        throw new AiError(
          `Model bu isteği yanıtlamayı reddetti${category ? ` (${category})` : ''}. ` +
            'Metnin içeriği sağlayıcının politikasına takılmış olabilir.'
        );
      }

      const text = (raw.content ?? [])
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text as string)
        .join('')
        .trim();

      if (!text) {
        throw new AiError('Model boş yanıt döndürdü.', { retryable: true });
      }

      // Yanıt max_tokens'a takıldıysa JSON yarım kalır; sebebi açıkça söyle
      if (raw.stop_reason === 'max_tokens' && request.schema) {
        throw new AiError(
          'Yanıt uzunluk sınırına takıldığı için yarım kaldı. Daha kısa bir bölümle dene.',
          { retryable: true }
        );
      }

      return {
        text,
        json: request.schema ? parseJsonLoose(text) : undefined,
        usage: {
          inputTokens: raw.usage?.input_tokens ?? 0,
          outputTokens: raw.usage?.output_tokens ?? 0,
        },
        model: raw.model ?? model,
      };
    },
  };
}
