import type { VoiceBackend } from './types';

/**
 * Kendi sesin motoru — desteklenmeyen platformlar (iOS). Web sürümü
 * `backend.web.ts` (onnxruntime-web), Android `backend.android.ts` (yerel
 * modül).
 */
export const OWN_VOICE_SUPPORTED = false;

export function createBackend(): VoiceBackend {
  throw new Error('Kendi sesin bu cihazda desteklenmiyor.');
}
