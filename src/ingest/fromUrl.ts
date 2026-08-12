import { Platform } from 'react-native';
import { htmlTitle, htmlToText } from './html2text';
import { normalizeText } from './normalize';
import type { ExtractedDocument } from './types';

/**
 * Bir bağlantıdan makale metni çeker.
 *
 * Platform farkı: telefonda tarayıcı güvenlik kısıtı (CORS) olmadığı için
 * doğrudan istek atılır. Web'de tarayıcı başka bir siteye istek atmayı
 * engellediğinden bir vekil sunucu gerekir; varsayılan `r.jina.ai` sayfayı
 * temiz metne dönüştürüp döndürüyor, dolayısıyla ayrıca HTML ayıklamak
 * gerekmiyor.
 *
 * Bu, üçüncü taraf bir servise bağımlılık demek — kapanırsa web'de bu özellik
 * çalışmaz, telefon sürümü etkilenmez.
 */
export async function extractUrl(url: string, proxy: string): Promise<ExtractedDocument> {
  const target = normalizeUrl(url);
  const useProxy = Platform.OS === 'web' && proxy.trim().length > 0;
  const request = useProxy ? `${proxy.trim().replace(/\/?$/, '/')}${target}` : target;

  let response: Response;
  try {
    response = await fetch(request, { headers: { Accept: 'text/html,text/plain,*/*' } });
  } catch (error) {
    throw new Error(
      useProxy
        ? 'Bağlantıya ulaşılamadı. Vekil sunucu adresini Ayarlar’dan kontrol edebilirsin.'
        : 'Bağlantıya ulaşılamadı. İnternet bağlantını kontrol et.'
    );
  }

  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (HTTP ${response.status}).`);
  }

  const body = await response.text();
  const looksLikeHtml = /^\s*<(!doctype|html|head|body)/i.test(body) || body.includes('</p>');

  if (looksLikeHtml) {
    const text = htmlToText(body);
    if (text.trim().length < 200) {
      throw new Error('Sayfada okunabilir metin bulunamadı. JavaScript ile yüklenen bir sayfa olabilir.');
    }
    return { title: htmlTitle(body) ?? hostOf(target), text: normalizeText(text) };
  }

  // Vekil sunucunun düz metin çıktısı: başlık satırlarını ayıkla
  return parsePlainReaderOutput(body, target);
}

/** r.jina.ai çıktısı "Title: ...", "URL Source: ..." başlıklarıyla geliyor. */
function parsePlainReaderOutput(body: string, url: string): ExtractedDocument {
  const title = body.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
  const contentStart = body.search(/^Markdown Content:\s*$/m);
  const raw = contentStart >= 0 ? body.slice(body.indexOf('\n', contentStart) + 1) : body;

  const text = stripMarkdown(raw);
  if (text.trim().length < 200) {
    throw new Error('Sayfada okunabilir metin bulunamadı.');
  }
  return { title: title || hostOf(url), text: normalizeText(text) };
}

/** Markdown işaretlerini okuma akışını bozmayacak şekilde temizler. */
function stripMarkdown(text: string): string {
  return text
    .replace(/^```[\s\S]*?```$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, '')
    .replace(/^\s*[-=]{3,}\s*$/gm, '');
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, '').split('/')[0];
}
