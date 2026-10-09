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

/** Bir gözün gözlük değerleri (eksi silindir yazımı). */
export interface EyeRx {
  /** Küre (diyoptri): + hipermetropi, − miyopi. */
  sph: number;
  /** Silindir (diyoptri): astigmat. */
  cyl: number;
  /** Eksen (0–180°). */
  axis: number;
}

export interface Prescription {
  right: EyeRx;
  left: EyeRx;
  /** Reçete tarihi "YYYY-AA-GG". */
  date?: string;
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
  /** Gözlük reçetesi. */
  prescription?: Prescription;
  /** Kişi numaralı gözlük kullanıyor mu (egzersiz öncesi hatırlatma için). */
  wearsGlasses: boolean;
  /** Kurulum sihirbazı ana sayfadan gizlendi mi. */
  setupDismissed?: boolean;
  /** Kurulumda "gözlük kullanmıyorum" seçildi. */
  rxSkipped?: boolean;
  /** Kurulumda doktorun planı onaylandı. */
  planConfirmed?: boolean;
  /** Bildirim: kapama hedefine ulaşınca. */
  notifyGoal: boolean;
  /** Bildirim: hedeften 1 saat sonra zamanlayıcı hâlâ çalışıyorsa. */
  notifyForgot: boolean;
  /** Bildirim: görme testi günü. */
  notifyVision: boolean;
  /** Bildirim: kontrol randevusundan önce. */
  notifyVisit: boolean;
  /** Günlük hatırlatma saati "HH:MM" (null = kapalı). */
  notifyDiaryTime: string | null;
  /** Bantlı oyunlarda kamera ile sağlam gözün kapalı olduğunu kontrol et. */
  patchCheck: boolean;
  patchCheckLevel: PatchCheckLevel;
  createdAt: number;
}

export type PatchCheckLevel = 'low' | 'medium' | 'high';

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
  wearsGlasses: false,
  notifyGoal: true,
  notifyForgot: true,
  notifyVision: true,
  notifyVisit: true,
  notifyDiaryTime: '20:30',
  patchCheck: false,
  patchCheckLevel: 'medium',
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

/** Yöne göre (astigmat ekseni) kontrast eşiği ölçümü ya da eğitimi. */
export interface OrientationTest {
  id: string;
  profileId: string;
  at: number;
  eye: Eye;
  cycles: number;
  viewing: GaborViewing;
  mode: 'test' | 'train';
  /** Çizgi açısı (derece, ekranda yataydan saat yönü tersine) ve Michelson kontrast eşiği. */
  thresholds: { deg: number; threshold: number }[];
}

/** Pelli-Robson benzeri harf testiyle kontrast duyarlılığı (log CS; büyük değer daha iyi). */
export interface ContrastTest {
  id: string;
  profileId: string;
  at: number;
  eye: Eye;
  logCS: number;
  distanceCm: number;
  withGlasses?: boolean;
}

/** Işık yansımasının iris merkezine göre kayması (mm; + kişinin burnuna doğru / aşağı). */
export interface ReflexOffset {
  dx: number;
  dy: number;
}

/** Göz kayması takibi için yüz fotoğrafı (yalnızca göz bandı, JPEG). */
export interface AlignmentPhoto {
  id: string;
  profileId: string;
  at: number;
  /** data:image/jpeg;base64,… */
  image: string;
  withGlasses: boolean;
  note: string;
  /** Otomatik bulunan ışık yansımaları (bulunamadıysa null). */
  reflex?: { right: ReflexOffset | null; left: ReflexOffset | null };
}

/** Evde yapılan görme keskinliği testi. */
export interface VisionTest {
  id: string;
  profileId: string;
  at: number;
  eye: Eye;
  logMAR: number;
  distanceCm: number;
  /** Test gözlükle mi yapıldı. */
  withGlasses?: boolean;
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
/** Numaralı gözlüğün gün içinde ne kadar takıldığı. */
export type GlassesWear = 'all' | 'most' | 'little' | 'none';

/** Günlük semptom ve uyum kaydı (gün başına bir tane). */
export interface DiaryEntry {
  id: string;
  profileId: string;
  day: string;
  symptoms: Symptom[];
  compliance: Compliance;
  /** Gözlük takma (gözlük kullanmayanlarda yok). */
  glasses?: GlassesWear;
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
  orientationTests: OrientationTest[];
  contrastTests: ContrastTest[];
  photos: AlignmentPhoto[];
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
  orientationTests: [],
  contrastTests: [],
  photos: [],
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
