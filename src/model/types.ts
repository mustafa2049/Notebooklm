export type Eye = 'left' | 'right';
export type Mode = 'adult' | 'child';

/** Kırmızı filtrenin karşısındaki renk: camgöbeği, mavi ya da yeşil. */
export type GlassesType = 'red-cyan' | 'red-blue' | 'red-green';

export interface AnaglyphSettings {
  glasses: GlassesType;
  /** Kırmızı filtre hangi gözün önünde. */
  redEye: Eye;
  /** Kırmızı kanal en yüksek parlaklığı (0–255), sızıntıyı azaltmak için düşürülebilir. */
  redLevel: number;
  /** Camgöbeği/mavi/yeşil kanal en yüksek parlaklığı (0–255). */
  cyanLevel: number;
  calibrated: boolean;
}

export interface Profile {
  id: string;
  name: string;
  mode: Mode;
  amblyopicEye: Eye;
  /** Günlük kapama hedefi (dakika). */
  dailyGoalMin: number;
  /** "HH:MM" biçiminde hatırlatma saatleri. */
  reminderTimes: string[];
  /** Çocuk modunda ayarları kilitleyen ebeveyn PIN'i. */
  parentPin?: string;
  anaglyph: AnaglyphSettings;
  /** Dikoptik oyunlarda sağlam göze giden öğelerin kontrastı (0.1–1). */
  dichopticContrast: number;
  createdAt: number;
}

/** Bir kapama dönemi (bant takılı geçen süre). */
export interface PatchSession {
  id: string;
  profileId: string;
  start: number;
  end: number;
}

export type ExerciseKind = 'odd-one-out' | 'catch' | 'dots' | 'tumbling-e';
export type DichopticKind = 'blocks' | 'breakout' | 'stars';
export type ActivityKind = ExerciseKind | DichopticKind;

export interface ActivityResult {
  id: string;
  profileId: string;
  kind: ActivityKind;
  at: number;
  durationSec: number;
  score: number;
  /** Oyun sonundaki zorluk seviyesi. */
  level: number;
  /** 0–1 arası başarı oranı (uyarlama ve yıldızlar için). */
  performance: number;
  /** Dikoptik oyunlarda kullanılan sağlam göz kontrastı. */
  contrast?: number;
}

export type GaborViewing = 'patch' | 'anaglyph';

export interface GaborResult {
  id: string;
  profileId: string;
  at: number;
  /** Michelson kontrast eşiği (0–1). */
  threshold: number;
  /** Yama başına döngü sayısı. */
  cycles: number;
  trials: number;
  viewing: GaborViewing;
}

export interface AppData {
  version: 1;
  profiles: Profile[];
  activeProfileId: string | null;
  sessions: PatchSession[];
  results: ActivityResult[];
  gabor: GaborResult[];
  /** Profil başına çalışan zamanlayıcının başlangıç zamanı (yoksa null). */
  timers: Record<string, number | null>;
}

export const emptyData = (): AppData => ({
  version: 1,
  profiles: [],
  activeProfileId: null,
  sessions: [],
  results: [],
  gabor: [],
  timers: {},
});

export const defaultAnaglyph = (): AnaglyphSettings => ({
  glasses: 'red-cyan',
  redEye: 'left',
  redLevel: 255,
  cyanLevel: 255,
  calibrated: false,
});

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
