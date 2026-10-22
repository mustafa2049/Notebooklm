import PiperVoice from '../../modules/piper-voice';
import { modelPath } from './modelStore';
import type { PiperConfig } from './piperConfig';
import type { Clip, VoiceBackend } from './types';

/**
 * Kendi sesin motoru — **Android**: yerel modül (`modules/piper-voice`,
 * onnxruntime-android). Model dosyadan açılır; üretilen ses JS'e gelmez,
 * kimliğiyle çalınır.
 */

export const OWN_VOICE_SUPPORTED = PiperVoice !== null;

interface NativeClip extends Clip {
  id: number;
}

export function createBackend(): VoiceBackend {
  const native = PiperVoice;
  if (!native) throw new Error('Ses motoru bu derlemede yok.');
  let key: string | null = null;
  return {
    async load(voiceId: string, config: PiperConfig) {
      await native.load(voiceId, modelPath(voiceId), config.sampleRate);
      key = voiceId;
    },
    async synthesize(ids: number[], [noise, length, noiseW]: [number, number, number]): Promise<NativeClip> {
      if (!key) throw new Error('Ses yüklenmedi.');
      return native.synthesize(key, ids, noise, length, noiseW);
    },
    play(clip: Clip) {
      return native.play((clip as NativeClip).id);
    },
    stop() {
      native.stop();
    },
    release(clip: Clip) {
      native.release((clip as NativeClip).id);
    },
    async unload() {
      if (!key) return;
      const loaded = key;
      key = null;
      await native.unload(loaded);
    },
  };
}
