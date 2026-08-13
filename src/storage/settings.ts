import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AiProviderKind } from '@/ai/types';
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

  // ---- Alışkanlık ---------------------------------------------------------
  /** Günlük kelime hedefi (0 = hedef yok) */
  dailyGoalWords: number;
  /** Günlük hatırlatıcı (yalnızca telefonda) */
  reminderEnabled: boolean;
  /** Hatırlatıcı saati (cihazın yerel saati) */
  reminderHour: number;
  reminderMinute: number;

  // ---- AI (isteğe bağlı) -------------------------------------------------
  /**
   * Hangi API biçimi kullanılacak. `anthropic` = Claude Messages API,
   * `openai-compatible` = OpenAI biçimini konuşan her şey (OpenAI, Gemini
   * uyumluluk uç noktası, OpenRouter, Groq, DeepSeek, Ollama, LM Studio).
   */
  aiProvider: AiProviderKind;
  /**
   * API anahtarı. **Yalnızca bu cihazda** saklanır; hiçbir yere gönderilmez,
   * yalnızca seçilen sağlayıcıya gider. Web'de tarayıcı deposunda durur:
   * o tarayıcı profiline erişen biri okuyabilir (ortak bilgisayarda kullanma).
   */
  aiApiKey: string;
  /** Boşsa sağlayıcının varsayılan adresi kullanılır */
  aiBaseUrl: string;
  /** Boşsa bağdaştırıcının varsayılan modeli kullanılır */
  aiModel: string;
  /** 1M girdi tokeni başına USD — maliyet tahmini için, 0 = gösterme */
  aiInputPrice: number;
  /** 1M çıktı tokeni başına USD */
  aiOutputPrice: number;
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
  dailyGoalWords: 2000,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  aiProvider: 'anthropic',
  aiApiKey: '',
  aiBaseUrl: '',
  aiModel: '',
  aiInputPrice: 0,
  aiOutputPrice: 0,
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
