import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReaderMode } from '@/core/types';
import { KEYS } from './keys';

export type ThemePreference = 'dark' | 'light' | 'system';

export interface Settings {
  /** Hedef okuma hızı (dakikadaki kelime) */
  wpm: number;
  /** Bir karede gösterilen kelime sayısı (1–4) */
  chunkSize: number;
  mode: ReaderMode;
  /** Noktalama ve kelime uzunluğu tempo çarpanları */
  useMultipliers: boolean;
  /** Duraklamadan sonra yumuşak başlangıç */
  rampUp: boolean;
  /** Uzun kelimeleri hece sınırından bölerek göster */
  splitLongWords: boolean;
  /** Bionic modda kalın gösterilen bölümün oranı */
  bionicRatio: number;
  /** RSVP modunda pivot kılavuz çizgileri */
  showPivotGuides: boolean;
  /** Vurgu modunda okunmayan kısmı soldur */
  dimSurrounding: boolean;
  theme: ThemePreference;
  /** Yazı boyutu çarpanı */
  fontScale: number;
  /** Disleksi dostu font (Atkinson Hyperlegible) */
  hyperlegible: boolean;
  /** Titreşimli geri bildirim (yalnızca telefonda) */
  haptics: boolean;
  /**
   * Web'de bağlantıdan metin çekmek için CORS vekil sunucusu.
   * Tarayıcı başka bir siteye doğrudan istek atmayı engellediği için gerekli;
   * telefonda böyle bir kısıt yok ve doğrudan istek atılır.
   */
  urlProxy: string;
}

export const DEFAULT_SETTINGS: Settings = {
  wpm: 300,
  chunkSize: 1,
  mode: 'rsvp',
  useMultipliers: true,
  rampUp: true,
  splitLongWords: true,
  bionicRatio: 0.4,
  showPivotGuides: true,
  dimSurrounding: true,
  theme: 'dark',
  fontScale: 1,
  hyperlegible: false,
  haptics: true,
  urlProxy: 'https://r.jina.ai/',
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    if (!raw) return DEFAULT_SETTINGS;
    // Eksik alanlar varsayılanla tamamlanır: yeni ayar eklenince eski kayıt bozulmaz
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}
