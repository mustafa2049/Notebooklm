import * as Speech from 'expo-speech';
import { ownVoiceFor, stopOwnVoice } from '@/voice/active';

/**
 * Cihazın Türkçe sesi ve tek seferlik seslendirme.
 *
 * Ses listesi her yerde hemen gelmiyor: tarayıcılar geç doldurabiliyor, bazen
 * hiç olay göndermiyor. Bu yüzden bekleme sınırlı ve boş liste kısa aralıkla
 * iki kez daha soruluyor. Türkçe ses bulunduysa sonuç hatırlanır; bulunamadıysa
 * sonraki istekte yeniden aranır (liste sonradan dolmuş olabilir).
 */

/** `own`: içe aktarılan kendi sesin (bkz. `src/voice/`) */
export type VoiceStatus = 'checking' | 'turkish' | 'fallback' | 'none' | 'own';

export interface VoiceInfo {
  status: Exclude<VoiceStatus, 'checking' | 'own'>;
  /** Türkçe sesin kimliği (yoksa cihazın varsayılanı kullanılır) */
  id?: string;
}

let remembered: VoiceInfo | null = null;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function search(attempt: number): Promise<VoiceInfo> {
  try {
    const voices = await Promise.race([
      Speech.getAvailableVoicesAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (voices === null) return { status: 'none' };
    if (voices.length === 0 && attempt < 2) {
      await wait(700);
      return search(attempt + 1);
    }
    const turkish = voices.find((item) => item.language?.toLowerCase().startsWith('tr'));
    if (turkish) return { status: 'turkish', id: turkish.identifier };
    return { status: voices.length ? 'fallback' : 'none' };
  } catch {
    return { status: 'none' };
  }
}

export async function findTurkishVoice(): Promise<VoiceInfo> {
  if (remembered) return remembered;
  const found = await search(0);
  if (found.status === 'turkish') remembered = found;
  return found;
}

/**
 * Metni bir kez, biraz yavaş seslendirir (kelimenin okunuşu, cümlesi).
 * Süren bir seslendirme varsa keser. Kendi sesin seçiliyse onunla okur;
 * açılamazsa cihazın sesine döner. Kullanılan sesin durumunu döndürür.
 */
export async function speakOnce(text: string, ownVoiceId = ''): Promise<Exclude<VoiceStatus, 'checking'>> {
  if (ownVoiceId) {
    const { voice } = await ownVoiceFor(ownVoiceId);
    if (voice) {
      void Speech.stop();
      voice.speak(text, { lengthScale: voice.slowScale(), onDone: () => undefined, onError: () => undefined });
      return 'own';
    }
  }
  const voice = await findTurkishVoice();
  if (voice.status === 'none') return 'none';
  stopOwnVoice();
  void Speech.stop();
  Speech.speak(text, { language: 'tr-TR', voice: voice.id, rate: 0.85 });
  return voice.status;
}

/** Süren tek seferlik seslendirmeyi keser (sayfa kapanınca) */
export function stopSpeaking(): void {
  stopOwnVoice();
  void Speech.stop();
}
