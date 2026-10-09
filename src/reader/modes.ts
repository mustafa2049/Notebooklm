import type { ReaderMode } from '@/core/types';

/** Okuma modlarının adları — okuyucu, Ayarlar ve görünüm paneli aynı listeyi kullanır. */
export const MODE_LABEL: Record<ReaderMode, string> = {
  rsvp: 'Kelime akışı',
  chunk: 'Parça parça',
  bionic: 'Bionic',
  highlight: 'Yürüyen vurgu',
  page: 'Sayfa',
  scroll: 'Kaydırma',
};

export const READER_MODES = Object.keys(MODE_LABEL) as ReaderMode[];

/** "Parça parça", kelime akışının hazır bir profili: aynı çizim, farklı ayar. */
export const MODE_CHUNK_SIZE: Partial<Record<ReaderMode, number>> = { rsvp: 1, chunk: 3 };

/** Tempolu (uygulamanın hız verdiği) modlar; Sayfa modunda tempo yok. */
export function isPacedMode(mode: ReaderMode): boolean {
  return mode !== 'page';
}
