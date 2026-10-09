import { Platform } from 'react-native';
import { openLibraryCovers, openLibrarySearchUrl } from '@/habit/cover';
import type { ExtractedCover } from '@/ingest/types';
import { deleteText, readText, writeText } from './blobStore';

/**
 * Kitap kapakları. Kapak, metinlerin durduğu yerde (web'de IndexedDB,
 * telefonda dosya) `cover-<id>` adıyla bir dize olarak saklanır: EPUB'dan
 * gelen küçültülmüş görselin `data:` adresi ya da Open Library adresi.
 * Yedeğe girmez — yeniden bulunabilir; kapak yoksa başlıktan üretilir.
 */

const NAME = (id: string) => `cover-${id}`;
/** Saklanan EPUB kapağının genişliği (raf ve kitap kartı için yeterli) */
const COVER_WIDTH = 300;
/** Telefonda küçültme yok: bundan büyük gömülü kapak saklanmaz */
const MAX_NATIVE_BASE64 = 400_000;
const SEARCH_TIMEOUT_MS = 10_000;

/** Liste ekranlarında aynı kapak tekrar tekrar okunmasın */
const memory = new Map<string, string | null>();
const listeners = new Set<(id: string) => void>();

export function onCoverChange(listener: (id: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function readCover(id: string): Promise<string | null> {
  if (memory.has(id)) return memory.get(id) ?? null;
  let value: string | null = null;
  try {
    value = await readText(NAME(id));
  } catch {
    value = null;
  }
  memory.set(id, value);
  return value;
}

export async function setCover(id: string, uri: string): Promise<void> {
  await writeText(NAME(id), uri);
  memory.set(id, uri);
  listeners.forEach((listener) => listener(id));
}

export async function removeCover(id: string): Promise<void> {
  memory.set(id, null);
  listeners.forEach((listener) => listener(id));
  await deleteText(NAME(id));
}

/** İçe aktarmada EPUB'un kendi kapağı: web'de küçültülüp JPEG olarak saklanır */
export async function saveImportedCover(id: string, cover: ExtractedCover): Promise<void> {
  const original = `data:${cover.mediaType};base64,${cover.base64}`;
  if (Platform.OS !== 'web') {
    if (cover.base64.length <= MAX_NATIVE_BASE64) await setCover(id, original);
    return;
  }
  await setCover(id, await downscaleOnWeb(original));
}

async function downscaleOnWeb(uri: string): Promise<string> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Kapak okunamadı.'));
    image.src = uri;
  });
  const scale = Math.min(1, COVER_WIDTH / Math.max(1, image.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return uri;
  // Saydam PNG kapaklar JPEG'de kararmasın
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export class CoverSearchError extends Error {}

/** Open Library'de başlığa göre kapak adayları (en çok 6) */
export async function searchCovers(title: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(openLibrarySearchUrl(title), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new CoverSearchError(`Open Library yanıt vermedi (HTTP ${response.status}).`);
    return openLibraryCovers(await response.json());
  } catch (error) {
    if (error instanceof CoverSearchError) throw error;
    throw new CoverSearchError('Open Library’ye ulaşılamadı. İnternet bağlantını kontrol et.');
  } finally {
    clearTimeout(timer);
  }
}
