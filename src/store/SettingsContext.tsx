import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { createTheme, type Theme } from '@/ui/theme';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '@/storage/settings';

interface SettingsContextValue {
  settings: Settings;
  /** Tek veya birkaç ayarı günceller ve kalıcı olarak yazar */
  update: (patch: Partial<Settings>) => void;
  theme: Theme;
  /** Okuyucu tam ekran/odak modunda mı (kalıcı değil, oturumla sınırlı) */
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
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

  const theme = useMemo(
    () => createTheme({ dark, focusMode, hyperlegible: settings.hyperlegible }),
    [dark, focusMode, settings.hyperlegible]
  );

  const value = useMemo(
    () => ({ settings, update, theme, focusMode, setFocusMode, ready }),
    [settings, update, theme, focusMode, ready]
  );

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
