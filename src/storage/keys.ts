/** AsyncStorage anahtarları tek yerde toplanır ki sürüm geçişleri kolay olsun. */
const PREFIX = 'hizliokuma/v1';

export const KEYS = {
  settings: `${PREFIX}/settings`,
  documents: `${PREFIX}/documents`,
  sessions: `${PREFIX}/sessions`,
  progress: (id: string) => `${PREFIX}/progress/${id}`,
};
