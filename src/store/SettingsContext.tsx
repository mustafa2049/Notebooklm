import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { isEvening } from '@/appearance/evening';
import { createReadingTheme, createTheme, type ReadingTheme, type Theme } from '@/ui/theme';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '@/storage/settings';

interface SettingsContextValue {
  settings: Settings;
  /** Tek veya birkaç ayarı günceller ve kalıcı olarak yazar */
  update: (patch: Partial<Settings>) => void;
  theme: Theme;
  /** Her zaman uygulamanın kendi teması (okuma sarmalayıcısının içinde de) */
  appTheme: Theme;
  /**
   * Okuma ekranlarının teması (okuma renkleri + okuma yazı tipi). Doğrudan
   * kullanmak yerine `ReadingThemeProvider` ile sarmak yeterli: altındaki
   * bileşenlerin `theme`'i bu olur.
   */
  readingTheme: ReadingTheme;
  /** Okuyucu tam ekran/odak modunda mı (kalıcı değil, oturumla sınırlı) */
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  /** Akşam sıcak tonu şu an devrede mi */
  evening: boolean;
  /** Ayarlar diskten okunana kadar false */
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [focusMode, setFocusMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      // Yazma işi arka planda; arayüz beklemesin
      void saveSettings(next);
      return next;
    });
  }, []);

  const dark = settings.theme === 'system' ? systemScheme !== 'light' : settings.theme === 'dark';

  // Akşam tonu: saat sınırı geçilince tema kendiliğinden değişsin (dakikada bir bakılır)
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!settings.eveningEnabled) return;
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [settings.eveningEnabled]);
  const evening = isEvening(settings, new Date(clock));

  const theme = useMemo(
    () => createTheme({ dark, focusMode, hyperlegible: settings.hyperlegible }),
    [dark, focusMode, settings.hyperlegible]
  );

  const readingTheme = useMemo(
    () =>
      createReadingTheme(theme, {
        // Akşam tonunda yazı da temanın kendi rengi: seçili özel renk o zeminde okunmayabilir
        readingTheme: evening ? settings.eveningTheme : settings.readingTheme,
        textColor: evening ? 'auto' : settings.textColor,
        customBg: settings.customBg,
        customText: settings.customText,
        focusMode,
        readingFont: settings.readingFont,
        hyperlegible: settings.hyperlegible,
      }),
    [
      theme,
      focusMode,
      evening,
      settings.eveningTheme,
      settings.readingTheme,
      settings.textColor,
      settings.customBg,
      settings.customText,
      settings.readingFont,
      settings.hyperlegible,
    ]
  );

  const value = useMemo(
    () => ({ settings, update, theme, appTheme: theme, readingTheme, focusMode, setFocusMode, evening, ready }),
    [settings, update, theme, readingTheme, focusMode, evening, ready]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/**
 * Okuma ekranlarını sarar: altındaki her bileşen (metin, çubuklar, araç
 * paneli, kartlar) okuma renklerini ve okuma yazı tipini kullanır. Böylece
 * sepya zeminde okurken panel de sepya olur, arayüzün geri kalanı değişmez.
 */
export function ReadingThemeProvider({ children }: { children: React.ReactNode }) {
  const context = useSettings();
  const value = useMemo(() => ({ ...context, theme: context.readingTheme }), [context]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings, SettingsProvider içinde kullanılmalı');
  return context;
}

/** Sadece temaya ihtiyaç duyan bileşenler için kısayol. */
export function useTheme(): Theme {
  return useSettings().theme;
}
