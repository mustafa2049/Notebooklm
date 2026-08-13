/** AsyncStorage anahtarları tek yerde toplanır ki sürüm geçişleri kolay olsun. */
const PREFIX = 'hizliokuma/v1';

export const KEYS = {
  settings: `${PREFIX}/settings`,
  documents: `${PREFIX}/documents`,
  sessions: `${PREFIX}/sessions`,
  progress: (id: string) => `${PREFIX}/progress/${id}`,
  /** Kelime defteri */
  vocab: `${PREFIX}/vocab`,
  /** AI token/maliyet sayacı (toplam) */
  aiUsage: `${PREFIX}/ai-usage`,
  /** Doküman başına AI çıktısı önbelleği — aynı özet için iki kez ödenmesin */
  aiCache: (id: string) => `${PREFIX}/ai/${id}`,
};
