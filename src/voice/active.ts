import { getVoice } from './library';
import { OwnVoice } from './ownVoice';

/**
 * Seçili kendi sesin tek örneği: model bir kez yüklenir (~60 MB), okuyucu ve
 * kelime sayfası aynı örneği kullanır. Başka ses seçilince eskisi kapanır.
 */

export interface OwnVoiceState {
  voice: OwnVoice | null;
  /** Yüklenemediyse nedeni */
  error?: string;
}

let current: { id: string; state: Promise<OwnVoiceState> } | null = null;
let loaded: OwnVoice | null = null;

function close(): void {
  const previous = current;
  current = null;
  loaded = null;
  void previous?.state.then((state) => state.voice?.close()).catch(() => undefined);
}

/** Seçili sesi açar (açıksa aynısını verir); boş kimlik = cihaz sesi */
export function ownVoiceFor(id: string): Promise<OwnVoiceState> {
  if (!id) {
    close();
    return Promise.resolve({ voice: null });
  }
  if (current?.id === id) return current.state;
  close();
  const state = (async (): Promise<OwnVoiceState> => {
    const entry = await getVoice(id);
    if (!entry) return { voice: null, error: 'Seçili ses bu cihazda yok; Ayarlar → Ses bölümünden yeniden ekle.' };
    try {
      const voice = await OwnVoice.open(entry);
      if (current?.id === id) loaded = voice;
      return { voice };
    } catch (error) {
      if (current?.id === id) current = null;
      return { voice: null, error: error instanceof Error ? error.message : String(error) };
    }
  })();
  current = { id, state };
  return state;
}

/** Çalan kendi sesini susturur (yüklenmeyi beklemeden) */
export function stopOwnVoice(): void {
  loaded?.stop();
}

/** Silinen ses açıksa kapatılır */
export function forgetOwnVoice(id: string): void {
  if (current?.id === id) close();
}
