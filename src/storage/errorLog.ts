import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { appendEntry, normalizeError, type ErrorEntry, type ErrorSource } from '@/core/errorLog';

/**
 * Hata günlüğünün deposu ve yakalayıcısı.
 *
 * Yedeğin anahtar önekinin (`hizliokuma/v1`) dışında: hatalar cihaza özgü,
 * başka cihaza taşınmaz. Yakalanan: telefonda yakalanmamış JavaScript hataları
 * (`ErrorUtils`), web'de `error` ve `unhandledrejection` olayları, ekran
 * çizerken patlayan hatalar (kök düzendeki `ErrorBoundary`).
 */

const KEY = 'hizliokuma-log/v1/errors';

/** Hatanın olduğu ekran (kök düzen yol değiştikçe günceller) */
let route: string | undefined;
export function setErrorRoute(path: string | undefined): void {
  route = path;
}

export async function listErrors(): Promise<ErrorEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

// Yazmalar sıraya girer: art arda iki hata birbirinin kaydını ezmesin
let queue: Promise<void> = Promise.resolve();

export function recordError(error: unknown, options: { source: ErrorSource; fatal?: boolean }): Promise<void> {
  const { message, stack } = normalizeError(error);
  const entry: ErrorEntry = {
    at: Date.now(),
    source: options.source,
    fatal: Boolean(options.fatal),
    message,
    ...(stack ? { stack } : {}),
    ...(route ? { route } : {}),
  };
  queue = queue.then(async () => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(appendEntry(await listErrors(), entry)));
    } catch {
      // Günlük yazılamazsa uygulama yine çalışsın
    }
  });
  return queue;
}

export async function clearErrors(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** Paylaşılan günlüğün başına yazılan cihaz bilgisi */
export function deviceInfo(): { app: string; platform: string; os?: string } {
  const config = Constants.expoConfig;
  const build = config?.android?.versionCode;
  return {
    app: `${config?.version ?? '?'}${Platform.OS === 'android' && build ? ` (${build})` : ''}`,
    platform: Platform.OS,
    os: Platform.OS === 'web' ? undefined : String(Platform.Version),
  };
}

interface GlobalErrorUtils {
  getGlobalHandler: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

let installed = false;

/** Yakalayıcıları bir kez kurar (uygulama açılırken) */
export function installErrorLog(): void {
  if (installed) return;
  installed = true;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (event) => {
      void recordError(event.error ?? event.message, { source: 'js' });
    });
    window.addEventListener('unhandledrejection', (event) => {
      void recordError(event.reason, { source: 'promise' });
    });
    return;
  }

  const utils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    if (!isFatal) {
      void recordError(error, { source: 'js' });
      previous?.(error, isFatal);
      return;
    }
    // Uygulamayı kapatacak hata: önce kayıt (en çok bir saniye beklenir)
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1000));
    void Promise.race([recordError(error, { source: 'js', fatal: true }), timeout]).finally(() =>
      previous?.(error, isFatal)
    );
  });
}
