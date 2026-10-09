import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AiProviderKind } from '@/ai/types';
import {
  DEFAULT_CUSTOM_BG,
  DEFAULT_CUSTOM_TEXT,
  type ReadingThemeId,
  type TextColorId,
} from '@/appearance/palettes';
import type { PageMarginId } from '@/appearance/typography';
import type { ReaderMode } from '@/core/types';
import type { ReadingFontId } from '@/ui/theme';
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
  /** Yazı boyutu çarpanı (0,7–2) */
  fontScale: number;

  // ---- Okuma görünümü (uygulama temasından ayrı) --------------------------
  /** Okuma ekranlarının renk teması; `auto` uygulama temasını izler */
  readingTheme: ReadingThemeId;
  /** Yazı rengi: temanın rengi (`auto`), hazır bir renk ya da `custom` */
  textColor: TextColorId;
  /** Özel tema zemini ve özel yazı rengi (#RRGGBB) */
  customBg: string;
  customText: string;
  /** Okunan metnin yazı tipi; `auto` uygulamanın yazı tipi */
  readingFont: ReadingFontId;
  /** Satır aralığı (yazı boyutunun katı) */
  lineSpacing: number;
  /** Sayfa düzeni: kenar boşluğu, iki yana yaslama, harf/kelime aralığı (düzey), heceleme */
  pageMargin: PageMarginId;
  justify: boolean;
  letterSpacing: number;
  wordSpacing: number;
  hyphenate: boolean;
  /** Okurken ekran kararmasın (uzun süre dokunulmazsa bırakılır) */
  keepAwake: boolean;
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
  /** Günlük hedef dakika mı kelime mi? Alışkanlık için dakika daha sezgisel. */
  goalUnit: 'minutes' | 'words';
  /** Günlük dakika hedefi (0 = hedef yok) */
  dailyGoalMinutes: number;
  /** Günlük kelime hedefi (0 = hedef yok) */
  dailyGoalWords: number;
  /**
   * Okuma ipucu: "sabah kahvesinden sonra" gibi. Uygulama niyeti
   * (implementation intention) — ne zaman ve nerede yapılacağı önceden
   * belirlenen davranış daha kolay alışkanlığa dönüşüyor. Hatırlatıcı metni
   * bunu kullanıyor.
   */
  readingCue: string;
  /** İlk açılış sihirbazı tamamlandı mı */
  onboardingDone: boolean;
  /** Odak seansı süresi (dakika) */
  focusMinutes: number;
  /** Yıllık kitap hedefi (0 = hedef yok) */
  yearlyBookGoal: number;
  /** Anlamlı bir okumadan sonra "kendi cümlenle anlat" kartı */
  recallPrompt: boolean;
  /** Göz molası: bu kadar dakika okuyunca 20 saniye uzağa bak (0 = kapalı) */
  eyeBreakMinutes: number;
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
  readingTheme: 'auto',
  textColor: 'auto',
  customBg: DEFAULT_CUSTOM_BG,
  customText: DEFAULT_CUSTOM_TEXT,
  readingFont: 'auto',
  lineSpacing: 1.7,
  pageMargin: 'normal',
  justify: false,
  letterSpacing: 0,
  wordSpacing: 0,
  hyphenate: false,
  keepAwake: true,
  hyperlegible: false,
  haptics: true,
  urlProxy: 'https://r.jina.ai/',
  goalUnit: 'minutes',
  dailyGoalMinutes: 10,
  dailyGoalWords: 2000,
  readingCue: '',
  onboardingDone: false,
  focusMinutes: 10,
  yearlyBookGoal: 0,
  recallPrompt: true,
  eyeBreakMinutes: 0,
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
