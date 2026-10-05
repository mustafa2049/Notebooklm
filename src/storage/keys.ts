/** AsyncStorage anahtarları tek yerde toplanır ki sürüm geçişleri kolay olsun. */
const PREFIX = 'hizliokuma/v1';

export const KEYS = {
  settings: `${PREFIX}/settings`,
  documents: `${PREFIX}/documents`,
  sessions: `${PREFIX}/sessions`,
  progress: (id: string) => `${PREFIX}/progress/${id}`,
  /** Seviye testleri ve anlama testi sonuçları */
  assessments: `${PREFIX}/assessments`,
  /** Egzersiz sonuçları (Schulte, flaş kelime, tarama, göz gezdirme) */
  drills: `${PREFIX}/drills`,
  /** Kullanıcıya duyurulmuş rozetler */
  badgesSeen: `${PREFIX}/badges-seen`,
  /** Alıntı defteri: altı çizilen cümleler ve notlar */
  highlights: `${PREFIX}/highlights`,
  /** Kelime defteri */
  vocab: `${PREFIX}/vocab`,
  /** AI token/maliyet sayacı (toplam) */
  aiUsage: `${PREFIX}/ai-usage`,
  /** Doküman başına AI çıktısı önbelleği — aynı özet için iki kez ödenmesin */
  aiCache: (id: string) => `${PREFIX}/ai/${id}`,
};
