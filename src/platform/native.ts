import { Capacitor } from '@capacitor/core';

/** Android/iOS uygulaması (Capacitor) içinde mi çalışıyoruz? */
export const isCapacitor = (): boolean => Capacitor.isNativePlatform();

/** Masaüstü uygulaması (Tauri) içinde mi çalışıyoruz? */
export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Yerel (kurulu) uygulama içinde mi? Bu durumda service worker gerekmez. */
export const isNativeApp = (): boolean => isCapacitor() || isTauri();

/**
 * Paylaşım bağlantıları için herkesin açabileceği web adresi.
 * Tarayıcıda çalışırken mevcut adres kullanılır; kurulu uygulamada adres yerel olduğundan
 * (https://localhost, tauri://localhost) derlemede verilen VITE_PUBLIC_URL ya da GitHub Pages adresi kullanılır.
 */
export function publicBaseUrl(): string {
  if (!isNativeApp()) return `${location.origin}${location.pathname}`;
  return import.meta.env.VITE_PUBLIC_URL || 'https://mustafa2049.github.io/Notebooklm/';
}

/** Android uygulamasında dosyayı geçici klasöre yazıp sistem paylaşma menüsüyle gönderir. */
export async function nativeShareFile(filename: string, text: string, title: string): Promise<boolean> {
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title, files: [uri] });
    return true;
  } catch {
    return false; // kullanıcı paylaşmaktan vazgeçti
  }
}

export async function nativeShareUrl(url: string, title: string): Promise<boolean> {
  const { Share } = await import('@capacitor/share');
  try {
    await Share.share({ title, url });
    return true;
  } catch {
    return false;
  }
}
