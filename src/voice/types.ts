import type { PiperConfig } from './piperConfig';

/** Seçilen model dosyası: telefonda adres, web'de dosya nesnesi de olabilir */
export interface PickedModel {
  uri: string;
  file?: Blob;
}

/** Üretilmiş ses parçası; içeriği motora özgü (web'de örnekler, telefonda yerel kimlik) */
export interface Clip {
  durationMs: number;
}

/**
 * Platforma özgü motor: modeli açar, fonem kimliklerinden ses üretir, çalar.
 * Metin işleme (normalleştirme, fonemler, parçalama) ortak katmanda
 * (`ownVoice.ts`); motor yalnızca sayı alır.
 */
export interface VoiceBackend {
  load(voiceId: string, config: PiperConfig): Promise<void>;
  /** `scales`: [noise_scale, length_scale, noise_w] */
  synthesize(ids: number[], scales: [number, number, number]): Promise<Clip>;
  /** Çalar; bitince `true`, durdurulursa `false` */
  play(clip: Clip): Promise<boolean>;
  stop(): void;
  /** Önbellekten çıkan parçanın belleği */
  release(clip: Clip): void;
  unload(): Promise<void>;
}
