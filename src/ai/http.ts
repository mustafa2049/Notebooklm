import { AiError } from './types';

/**
 * İki bağdaştırıcının paylaştığı HTTP katmanı: istek atma ve hata çevirisi.
 *
 * Sağlayıcıların hata gövdeleri farklı biçimlerde geliyor ama HTTP kodları
 * ortak; kullanıcıya gösterilecek Türkçe mesajı koda göre burada üretiyoruz.
 */

/** İstek bu süreyi aşarsa iptal edilir (uzun metinlerde model yavaş olabilir). */
const TIMEOUT_MS = 120_000;

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // Çağıranın iptali ile zaman aşımını birleştir
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (caught) {
    if (signal?.aborted) throw new AiError('İstek iptal edildi.', { cause: caught });
    if (controller.signal.aborted) {
      throw new AiError('Model yanıt vermedi (zaman aşımı). Daha kısa bir metinle deneyebilirsin.', {
        retryable: true,
        cause: caught,
      });
    }
    throw new AiError(
      'Sağlayıcıya ulaşılamadı. İnternet bağlantını ve Ayarlar’daki adresi kontrol et. ' +
        'Tarayıcıda çalışıyorsan sağlayıcı tarayıcıdan gelen isteklere izin vermiyor olabilir.',
      { retryable: true, cause: caught }
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  const raw = await response.text();

  if (!response.ok) {
    throw new AiError(messageForStatus(response.status, raw), {
      status: response.status,
      // 429 ve 5xx geçici; 4xx'in kalanı yapılandırma hatası
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch (caught) {
    throw new AiError('Sağlayıcı beklenmeyen bir yanıt döndürdü (geçerli JSON değil).', {
      cause: caught,
    });
  }
}

/** Sağlayıcı gövdesinden insan okuyabilir bir açıklama çıkarmaya çalışır. */
function detailFrom(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
    const error = parsed.error;
    const detail =
      (typeof error === 'string' ? error : error?.message) ?? parsed.message ?? '';
    return detail ? ` (${detail.slice(0, 200)})` : '';
  } catch {
    return raw ? ` (${raw.slice(0, 200)})` : '';
  }
}

function messageForStatus(status: number, raw: string): string {
  const detail = detailFrom(raw);
  switch (status) {
    case 400:
      return `İstek sağlayıcı tarafından reddedildi — model adı yanlış olabilir.${detail}`;
    case 401:
    case 403:
      return `API anahtarı kabul edilmedi. Ayarlar’dan kontrol edebilirsin.${detail}`;
    case 404:
      return `Adres ya da model bulunamadı. Ayarlar’daki sunucu adresini ve model adını kontrol et.${detail}`;
    case 402:
      return `Sağlayıcı hesabında yeterli bakiye yok.${detail}`;
    case 413:
      return `Metin sağlayıcının sınırı için çok uzun. Daha kısa bir bölümle dene.${detail}`;
    case 429:
      return `Sağlayıcı hız sınırına takıldı. Biraz bekleyip yeniden dene.${detail}`;
    default:
      if (status >= 500) return `Sağlayıcıda geçici bir sorun var (HTTP ${status}).${detail}`;
      return `Sağlayıcı hatası (HTTP ${status}).${detail}`;
  }
}

/** `{ "a": 1 }` metnini ayrıştırır; model kod bloğu içinde döndürürse temizler. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch (caught) {
    throw new AiError('Model geçerli JSON döndürmedi.', { retryable: true, cause: caught });
  }
}
