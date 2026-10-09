import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Web'de uygulamayı "uygulama gibi" kullanmak: çevrimdışı önbellek (service
 * worker, bkz. `scripts/generate-sw.mjs`) ve ana ekrana ekleme.
 *
 * Service worker yalnızca üretim derlemesinde kaydedilir: geliştirme
 * sunucusunda kod sürekli değişiyor, önbellek eski kodu gösterirdi.
 * Telefon uygulamasında hiçbiri gerekmiyor; orada her şey zaten cihazda.
 */

export interface PwaState {
  /** Tarayıcı service worker destekliyor */
  supported: boolean;
  /** Üretim derlemesi: çevrimdışı önbellek yalnızca bunda var */
  production: boolean;
  /** Önbellek hazır: uygulama internetsiz açılır */
  offlineReady: boolean;
  /** Ana ekrandan (uygulama olarak) açılmış */
  standalone: boolean;
  /** Tarayıcı kendi kurulum penceresini açabilir (Android ve masaüstü Chrome/Edge) */
  canInstall: boolean;
  /** Bu oturumda kuruldu */
  installed: boolean;
  /** iPhone/iPad: kurulum yalnızca Paylaş menüsünden */
  ios: boolean;
}

/** Chrome'un kurulum olayı (standart değil, DOM tiplerinde yok) */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let state: PwaState = {
  supported: false,
  production: !__DEV__,
  offlineReady: false,
  standalone: false,
  canInstall: false,
  installed: false,
  ios: false,
};
const listeners = new Set<() => void>();
let deferred: InstallPromptEvent | null = null;
let started = false;

function patch(next: Partial<PwaState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

/**
 * Bir kez, uygulama açılırken çağrılır. Kurulum olayı uygulama çizilmeden
 * gelebildiği için dinleyiciler burada, en başta kuruluyor.
 */
export function startPwa() {
  if (started || Platform.OS !== 'web' || typeof window === 'undefined') return;
  started = true;

  const nav = navigator as Navigator & { standalone?: boolean };
  patch({
    supported: 'serviceWorker' in navigator,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true,
    // iPadOS kendini masaüstü Safari gibi tanıtıyor; dokunmatik ekranından anlaşılır
    ios: /iphone|ipad|ipod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1),
  });

  // Tarayıcının kendi "yükle" şeridi engellenmiyor; olay yalnızca Ayarlar'daki
  // düğme için saklanıyor
  window.addEventListener('beforeinstallprompt', (event) => {
    deferred = event as InstallPromptEvent;
    patch({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    patch({ canInstall: false, installed: true });
  });

  if (__DEV__ || !('serviceWorker' in navigator)) return;
  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      // `ready`: etkin bir service worker var, yani dosyaların hepsi önbellekte
      .then(() => navigator.serviceWorker.ready)
      .then(() => patch({ offlineReady: true }))
      .catch((error: unknown) => console.warn('Çevrimdışı önbellek kurulamadı:', error));
  };
  // Kurulum, sayfanın kendi dosyalarıyla yarışmasın
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Tarayıcının kurulum penceresini açar (her olay bir kez kullanılabiliyor) */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred;
  if (!event) return 'unavailable';
  deferred = null;
  patch({ canInstall: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') patch({ installed: true });
  return outcome;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
