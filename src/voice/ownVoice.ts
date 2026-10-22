import { normalizeForSpeech, phonemeIds, phonemize, speechChunks } from '@/core/phonemize';
import { createBackend } from './backend';
import type { VoiceEntry } from './library';
import { CALIBRATION_TEXT, countWords, lengthScaleFor, measuredWpm, slowScale } from './rate';
import type { Clip, VoiceBackend } from './types';

/**
 * Kendi sesinle okuma — platformdan bağımsız katman.
 *
 * Metin söylendiği gibi yazılır, uzunsa parçalara bölünür, her parça
 * fonemlere ve kimliklere çevrilir; motor (web ya da telefon) sesi üretir ve
 * çalar. Parça çalarken sıradaki üretilir; sıradaki cümle de önceden
 * hazırlanabilir (`prefetch`) — cümleler arasında boşluk kalmasın.
 */

/** Bellekte tutulan üretilmiş parça sayısı */
const CACHE_SIZE = 8;

export interface SpeakOptions {
  lengthScale: number;
  onDone: () => void;
  onError: (error: unknown) => void;
}

export class OwnVoice {
  private generation = 0;
  private readonly cache = new Map<string, Promise<Clip>>();
  /** Motor tek seferde tek parça üretir */
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(
    readonly entry: VoiceEntry,
    private readonly backend: VoiceBackend
  ) {}

  static async open(entry: VoiceEntry): Promise<OwnVoice> {
    const backend = createBackend();
    await backend.load(entry.id, entry.config);
    return new OwnVoice(entry, backend);
  }

  /** Okuma hızına göre ölçek */
  scaleFor(wpm: number): number {
    return lengthScaleFor(wpm, this.entry.naturalWpm, this.entry.config.lengthScale);
  }

  /** Tek kelime ya da cümle dinlerken */
  slowScale(): number {
    return slowScale(this.entry.config.lengthScale);
  }

  private chunksOf(text: string): string[] {
    return speechChunks(normalizeForSpeech(text)).filter((chunk) => /[A-Za-zÇĞİÖŞÜçğıöşüâîû]/.test(chunk));
  }

  private clip(chunk: string, lengthScale: number): Promise<Clip> {
    const key = `${lengthScale}|${chunk}`;
    const cached = this.cache.get(key);
    if (cached) {
      // En son kullanılan sona: eski parçalar önce çıkar
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    const { config } = this.entry;
    const ids = phonemeIds(phonemize(chunk, { normalized: true }), config.idMap);
    const pending = this.queue.then(() =>
      this.backend.synthesize(ids, [config.noiseScale, lengthScale, config.noiseW])
    );
    this.queue = pending.catch(() => undefined);
    this.cache.set(key, pending);
    pending.catch(() => this.cache.delete(key));
    while (this.cache.size > CACHE_SIZE) {
      const [oldest, clip] = this.cache.entries().next().value as [string, Promise<Clip>];
      this.cache.delete(oldest);
      clip.then((value) => this.backend.release(value)).catch(() => undefined);
    }
    return pending;
  }

  /** Metni seslendirir; önceki seslendirmeyi keser */
  speak(text: string, { lengthScale, onDone, onError }: SpeakOptions): void {
    const run = ++this.generation;
    this.backend.stop();
    void (async () => {
      try {
        const chunks = this.chunksOf(text);
        for (let i = 0; i < chunks.length; i++) {
          const clip = await this.clip(chunks[i], lengthScale);
          if (run !== this.generation) return;
          if (chunks[i + 1]) void this.clip(chunks[i + 1], lengthScale).catch(() => undefined);
          const finished = await this.backend.play(clip);
          if (run !== this.generation || !finished) return;
        }
        if (run === this.generation) onDone();
      } catch (error) {
        if (run === this.generation) onError(error);
      }
    })();
  }

  /** Sıradaki cümlenin ilk parçasını şimdiden üretir */
  prefetch(text: string, lengthScale: number): void {
    const first = this.chunksOf(text)[0];
    if (first) void this.clip(first, lengthScale).catch(() => undefined);
  }

  stop(): void {
    this.generation++;
    this.backend.stop();
  }

  /** Sesin doğal hızı (kelime/dk): kalibrasyon paragrafı seslendirilip süresi ölçülür */
  async measureNaturalWpm(): Promise<number> {
    let duration = 0;
    for (const chunk of this.chunksOf(CALIBRATION_TEXT)) {
      duration += (await this.clip(chunk, this.entry.config.lengthScale)).durationMs;
    }
    return measuredWpm(countWords(CALIBRATION_TEXT), duration);
  }

  async close(): Promise<void> {
    this.stop();
    for (const clip of this.cache.values()) clip.then((value) => this.backend.release(value)).catch(() => undefined);
    this.cache.clear();
    await this.backend.unload();
  }
}
