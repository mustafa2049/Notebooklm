import { Lexend_400Regular } from '@expo-google-fonts/lexend/400Regular';
import { Lexend_700Bold } from '@expo-google-fonts/lexend/700Bold';
import { Literata_400Regular } from '@expo-google-fonts/literata/400Regular';
import { Literata_700Bold } from '@expo-google-fonts/literata/700Bold';
import { Merriweather_400Regular } from '@expo-google-fonts/merriweather/400Regular';
import { Merriweather_700Bold } from '@expo-google-fonts/merriweather/700Bold';
import { isLoaded, loadAsync } from 'expo-font';
import { useEffect, useState } from 'react';
import type { ReadingFontId } from './theme';

/**
 * Uygulamayla gelen okuma yazı tipleri — **seçilince** yüklenir, açılışta
 * değil (web'de dosyalar ancak o zaman iner). Yalnızca normal ve kalın
 * ağırlıklar pakete giriyor (paketlerin kökünden almak bütün ağırlıkları
 * eklerdi). Hepsinde Türkçe harflerin tamamı var (dosyalarda denetlendi).
 *
 * - Lexend: okuma akıcılığı için tasarlanmış, geniş harf aralıklı (OFL)
 * - Literata: e-kitaplar için tasarlanmış tırnaklı (OFL)
 * - Merriweather: ekranda okumak için tırnaklı (OFL)
 * - OpenDyslexic: disleksi için ağırlıklı harf tabanları (OFL; Fontsource'un
 *   WOFF dosyalarından kayıpsız çevrildi, bkz. `scripts/fonts/`)
 */

export type LoadableFontId = 'lexend' | 'literata' | 'merriweather' | 'opendyslexic';

const SOURCES: Record<LoadableFontId, Record<string, number>> = {
  lexend: { Lexend_400Regular, Lexend_700Bold },
  literata: { Literata_400Regular, Literata_700Bold },
  merriweather: { Merriweather_400Regular, Merriweather_700Bold },
  opendyslexic: {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    OpenDyslexic_400Regular: require('../../assets/fonts/OpenDyslexic-Regular.otf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    OpenDyslexic_700Bold: require('../../assets/fonts/OpenDyslexic-Bold.otf'),
  },
};

export const LOADABLE_FONTS = Object.keys(SOURCES) as LoadableFontId[];

export function isLoadableFont(id: ReadingFontId): id is LoadableFontId {
  return id in SOURCES;
}

export function isFontReady(id: ReadingFontId): boolean {
  return !isLoadableFont(id) || Object.keys(SOURCES[id]).every((family) => isLoaded(family));
}

const pending = new Map<LoadableFontId, Promise<void>>();

/** Yazı tipini yükler (aynı anda ikinci istek aynı yüklemeyi bekler) */
export function loadReadingFont(id: LoadableFontId): Promise<void> {
  if (isFontReady(id)) return Promise.resolve();
  let promise = pending.get(id);
  if (!promise) {
    promise = loadAsync(SOURCES[id]).finally(() => pending.delete(id));
    pending.set(id, promise);
  }
  return promise;
}

/**
 * Yazı tipi hazır mı; değilse yükler. Hazır olana kadar `false`: okuyucu o
 * arada sistem yazı tipiyle çizer (yüklenmemiş bir yazı tipi telefonda
 * sessizce sistem fontuna düşüp yüklenince de değişmiyordu).
 */
export function useReadingFontReady(id: ReadingFontId): boolean {
  const [ready, setReady] = useState(() => isFontReady(id));
  useEffect(() => {
    if (isFontReady(id) || !isLoadableFont(id)) {
      setReady(true);
      return;
    }
    setReady(false);
    let cancelled = false;
    loadReadingFont(id)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // Yüklenemezse sistem yazı tipi kalır
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return ready;
}

/** Görünüm panelinde önizleme için hepsini yükler; yüklenenler listesi döner */
export function useAllReadingFonts(): Set<LoadableFontId> {
  const [loaded, setLoaded] = useState(() => new Set(LOADABLE_FONTS.filter(isFontReady)));
  useEffect(() => {
    let cancelled = false;
    for (const id of LOADABLE_FONTS) {
      if (isFontReady(id)) continue;
      loadReadingFont(id)
        .then(() => {
          if (!cancelled) setLoaded((current) => new Set([...current, id]));
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, []);
  return loaded;
}
