import type * as Ort from 'onnxruntime-web';
import { readModel } from './modelStore';
import type { PiperConfig } from './piperConfig';
import type { Clip, VoiceBackend } from './types';

/**
 * Kendi sesin motoru — **web**: onnxruntime-web (WASM) modeli tarayıcıda
 * çalıştırır, ses Web Audio ile çalınır.
 *
 * onnxruntime paketlenmez: `npm run vendor:ort` dosyalarını `public/ort/`'a
 * kopyalar ve ilk kullanımda `<script>` ile yüklenir (Metro'nun dinamik
 * WASM yüklemesiyle uğraşmamak için; ~14 MB, yalnızca kendi sesin
 * kullanılınca iner, sonra service worker önbelleğinde).
 */

export const OWN_VOICE_SUPPORTED = true;

/** `scripts/vendor-ort.mjs` ile aynı sürüm (dosya adları içerik özetli değil, sürüm klasörde) */
export const ORT_VERSION = '1.30.0';
const ORT_BASE = `/ort/${ORT_VERSION}/`;

type OrtModule = typeof Ort;
declare global {
  interface Window {
    ort?: OrtModule;
  }
}

let ortLoading: Promise<OrtModule> | null = null;

function loadOrt(): Promise<OrtModule> {
  if (window.ort) return Promise.resolve(window.ort);
  ortLoading ??= new Promise<OrtModule>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${ORT_BASE}ort.wasm.min.js`;
    script.async = true;
    script.onload = () => {
      const ort = window.ort;
      if (!ort) return reject(new Error('Ses motoru yüklenemedi.'));
      ort.env.wasm.wasmPaths = ORT_BASE;
      // Çok iş parçacığı için sayfanın "cross-origin isolated" olması gerekir; değil
      ort.env.wasm.numThreads = 1;
      // Hesaplama ayrı bir işçide: okuma ekranı takılmasın
      ort.env.wasm.proxy = true;
      resolve(ort);
    };
    script.onerror = () => {
      ortLoading = null;
      reject(new Error('Ses motoru yüklenemedi (internet yoksa uygulama önbelleğe alınmamış olabilir).'));
    };
    document.head.appendChild(script);
  });
  return ortLoading;
}

interface WebClip extends Clip {
  samples: Float32Array;
  sampleRate: number;
}

export function createBackend(): VoiceBackend {
  let ort: OrtModule | null = null;
  let session: Ort.InferenceSession | null = null;
  let sampleRate = 22050;
  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let settle: ((finished: boolean) => void) | null = null;

  return {
    async load(voiceId: string, config: PiperConfig) {
      ort = await loadOrt();
      const bytes = await readModel(voiceId);
      try {
        session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      } catch (error) {
        // İşçi açılamazsa (eski tarayıcı) ana iş parçacığında dene
        if (!ort.env.wasm.proxy) throw error;
        ort.env.wasm.proxy = false;
        session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      }
      sampleRate = config.sampleRate;
    },

    async synthesize(ids: number[], [noise, length, noiseW]: [number, number, number]): Promise<WebClip> {
      if (!ort || !session) throw new Error('Ses yüklenmedi.');
      const feeds: Record<string, Ort.Tensor> = {
        input: new ort.Tensor('int64', BigInt64Array.from(ids, (id) => BigInt(id)), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([noise, length, noiseW]), [3]),
      };
      if (session.inputNames.includes('sid')) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(0)]), [1]);
      const result = await session.run(feeds);
      const output = result[session.outputNames[0]];
      const samples = Float32Array.from(output.data as Float32Array);
      output.dispose?.();
      return { samples, sampleRate, durationMs: (samples.length / sampleRate) * 1000 };
    },

    play(clip: Clip): Promise<boolean> {
      const { samples, sampleRate: rate } = clip as WebClip;
      return new Promise<boolean>((resolve) => {
        context ??= new AudioContext();
        if (context.state === 'suspended') void context.resume();
        const buffer = context.createBuffer(1, samples.length, rate);
        buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
        const node = context.createBufferSource();
        node.buffer = buffer;
        node.connect(context.destination);
        node.onended = () => {
          if (source !== node) return;
          source = null;
          settle = null;
          resolve(true);
        };
        source = node;
        settle = resolve;
        node.start();
      });
    },

    stop() {
      const node = source;
      const done = settle;
      source = null;
      settle = null;
      try {
        node?.stop();
      } catch {
        // zaten bitmiş
      }
      done?.(false);
    },

    release() {
      // Web'de örnekler çöp toplayıcıya kalır
    },

    async unload() {
      this.stop();
      await session?.release();
      session = null;
    },
  };
}
