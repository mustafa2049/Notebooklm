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
  /** Oyun ses efektleri açık mı. */
  soundOn: boolean;
  /** Tedavi planı: günlük bantla yakın egzersiz hedefi (dakika). */
  nearExerciseMin: number;
  /** Tedavi planı: günlük gözlüklü (dikoptik) etkinlik hedefi (dakika, 0 = kapalı). */
  binocularMin: number;
  /** Kaç günde bir evde görme testi yapılacağı (0 = kapalı). */
  visionTestEveryDays: number;
  /** Doktorun önerisi (serbest metin). */
  doctorNote: string;
  /** Sonraki kontrol tarihi "YYYY-AA-GG". */
  nextVisit?: string;
  /** Ekran ölçeği: 1 mm kaç CSS pikseli (kredi kartıyla ölçülür). */
  screenPxPerMm?: number;
  /** Ön kameranın odak uzaklığı (piksel, 640 px genişlik için); kalibrasyonla ölçülür. */
  cameraFocalPx?: number;
  /** Oyunlarda ekrana çok yaklaşınca kamera ile uyar. */
  proximityWarn: boolean;
  /** Son yedek alma zamanı. */
  lastBackupAt?: number;
  createdAt: number;
}

/** Yeni ve eski profiller için varsayılan alanlar. */
export const profileDefaults = (): Omit<Profile, 'id' | 'name' | 'anaglyph'> => ({
  mode: 'adult',
  amblyopicEye: 'left',
  dailyGoalMin: 120,
  reminderTimes: [],
  dichopticContrast: 0.2,
  soundOn: true,
  nearExerciseMin: 20,
  binocularMin: 0,
  visionTestEveryDays: 7,
  doctorNote: '',
  proximityWarn: false,
  createdAt: Date.now(),
});

/** Bir kapama dönemi (bant takılı geçen süre). */
export interface PatchSession {
  id: string;
  profileId: string;
  start: number;
  end: number;
}

export type ExerciseKind = 'odd-one-out' | 'catch' | 'dots' | 'tumbling-e' | 'maze' | 'balloons';
export type DichopticKind = 'blocks' | 'breakout' | 'stars' | 'snake' | 'puzzle' | 'depth';
export type ActivityKind = ExerciseKind | DichopticKind | 'video' | 'reading';

/** İki gözü birlikte çalıştıran (gözlükle yapılan) etkinlikler. */
export const BINOCULAR_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>([
  'blocks',
  'breakout',
  'stars',
  'snake',
  'puzzle',
  'depth',
  'video',
  'reading',
]);

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

/** Evde yapılan görme keskinliği testi. */
export interface VisionTest {
  id: string;
  profileId: string;
  at: number;
  eye: Eye;
  logMAR: number;
  distanceCm: number;
}

/** Rastgele nokta stereogramıyla ölçülen stereo (derinlik) görme eşiği. */
export interface StereoTest {
  id: string;
  profileId: string;
  at: number;
  /** Arcsaniye; null = en büyük disparitede de derinlik algılanamadı. */
  arcsec: number | null;
  distanceCm: number;
}

export type Symptom = 'headache' | 'double' | 'strain' | 'squint' | 'none';
export type Compliance = 'full' | 'partial' | 'none';

/** Günlük semptom ve uyum kaydı (gün başına bir tane). */
export interface DiaryEntry {
  id: string;
  profileId: string;
  day: string;
  symptoms: Symptom[];
  compliance: Compliance;
  note: string;
}

export interface AppData {
  version: 1;
  profiles: Profile[];
  activeProfileId: string | null;
  sessions: PatchSession[];
  results: ActivityResult[];
  gabor: GaborResult[];
  visionTests: VisionTest[];
  stereoTests: StereoTest[];
  diary: DiaryEntry[];
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
  visionTests: [],
  stereoTests: [],
  diary: [],
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
