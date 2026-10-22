import { requireOptionalNativeModule } from 'expo';

/**
 * Yerel Piper motoru (yalnızca Android; bkz. android/…/PiperVoiceModule.kt).
 * Modül yoksa (iOS, web, Expo Go) `null`.
 */
export interface PiperVoiceNative {
  /** `key`: ses kimliği (aynı anda birden çok ses açık olabilir) */
  load(key: string, path: string, sampleRate: number): Promise<void>;
  synthesize(key: string, ids: number[], noise: number, length: number, noiseW: number): Promise<{ id: number; durationMs: number }>;
  /** Bitince `true`, kesilirse `false` */
  play(id: number): Promise<boolean>;
  stop(): void;
  release(id: number): void;
  unload(key: string): Promise<void>;
}

export default requireOptionalNativeModule<PiperVoiceNative>('PiperVoice');
