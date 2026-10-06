import { downloadText } from '../storage/export';
import { isCapacitor, nativeShareFile, nativeShareUrl } from './native';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Dosyayı paylaşma menüsüyle (Drive, WhatsApp, e-posta…) gönderir; desteklenmiyorsa indirir.
 * Android uygulamasında sistemin paylaşma menüsü kullanılır (WebView dosya indiremez).
 */
export async function shareOrDownloadFile(filename: string, text: string, mime: string, title: string): Promise<ShareOutcome> {
  if (isCapacitor()) return (await nativeShareFile(filename, text, title)) ? 'shared' : 'cancelled';
  try {
    const file = new File([text], filename, { type: mime });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    // paylaşım başarısız → indirmeye düş
  }
  downloadText(filename, text, mime);
  return 'downloaded';
}

/** Bağlantıyı paylaşır ya da panoya kopyalar. */
export async function shareOrCopyLink(url: string, title: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (isCapacitor()) return (await nativeShareUrl(url, title)) ? 'shared' : 'cancelled';
  try {
    if (navigator.share) {
      await navigator.share({ url, title });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
