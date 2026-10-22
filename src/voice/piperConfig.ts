import { missingPhonemes, phonemize, PHONEMIZER_VERSION, type PhonemeIdMap } from '@/core/phonemize';

/**
 * Piper ses paketinin yapılandırması (`.onnx.json`) — saf, testli.
 *
 * Standart Piper biçimi: hazır Türkçe sesler (ör. `tr_TR-dfki-medium`) de,
 * bu uygulamanın eğitim setiyle (`voice-training/`) eğitilen kendi sesin de
 * aynı iki dosyadır: model (`.onnx`) ve bu yapılandırma.
 */

export interface PiperConfig {
  sampleRate: number;
  idMap: PhonemeIdMap;
  /** Çıkarım ayarları (yapılandırmadaki varsayılanlar) */
  noiseScale: number;
  lengthScale: number;
  noiseW: number;
  numSpeakers: number;
  /** `espeak` (hazır sesler) ya da `text` (fonemleri bizim çözümleyicinin ürettiği) */
  phonemeType: string;
  /** Dil kodu (ör. tr_TR) */
  language: string;
  /** Bu uygulamanın eğitim setiyle eğitildiyse çözümleyici sürümü */
  phonemizer?: number;
  /** Eğitimde verilen ad */
  name?: string;
}

export type ConfigResult =
  | { ok: true; config: PiperConfig; warnings: string[] }
  | { ok: false; error: string };

/** Türkçenin bütün seslerini içeren deneme cümlesi (sembol kontrolü için) */
const COVERAGE_TEXT =
  'Çiğ köfteyi ağzında gezdirdi, "Şu ışığı söndür!" diye bağırdı; jandarma, ve hâlâ öğretmen müdürle buluşmadı mı?';

function isIdMap(value: unknown): value is PhonemeIdMap {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every(
    (ids) => Array.isArray(ids) && ids.length > 0 && ids.every((id) => Number.isInteger(id) && id >= 0)
  );
}

const number = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

export function parsePiperConfig(raw: string): ConfigResult {
  let json: Record<string, any>;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Yapılandırma dosyası (.onnx.json) okunamadı.' };
  }
  const sampleRate = json?.audio?.sample_rate;
  const idMap = json?.phoneme_id_map;
  if (typeof sampleRate !== 'number' || !isIdMap(idMap)) {
    return { ok: false, error: 'Bu bir Piper ses yapılandırması değil (.onnx.json bekleniyor).' };
  }
  if (!idMap['^'] || !idMap['$'] || !idMap['_']) {
    return { ok: false, error: 'Ses yapılandırmasında başlangıç/bitiş sembolleri eksik.' };
  }
  if (sampleRate < 8000 || sampleRate > 48000) {
    return { ok: false, error: `Örnekleme hızı desteklenmiyor (${sampleRate} Hz).` };
  }
  const inference = json.inference ?? {};
  const config: PiperConfig = {
    sampleRate,
    idMap,
    noiseScale: number(inference.noise_scale, 0.667),
    lengthScale: number(inference.length_scale, 1),
    noiseW: number(inference.noise_w, 0.8),
    numSpeakers: number(json.num_speakers, 1),
    phonemeType: typeof json.phoneme_type === 'string' ? json.phoneme_type : 'espeak',
    language: json.language?.code ?? json.espeak?.voice ?? '',
    phonemizer: typeof json.hizliokuma?.phonemizer === 'number' ? json.hizliokuma.phonemizer : undefined,
    name: typeof json.hizliokuma?.voice_name === 'string' ? json.hizliokuma.voice_name : undefined,
  };

  const warnings: string[] = [];
  if (config.language && !/^tr/i.test(config.language)) {
    warnings.push(`Bu ses Türkçe için eğitilmemiş (${config.language}); Türkçe metni bozuk okuyabilir.`);
  }
  const missing = missingPhonemes(phonemize(COVERAGE_TEXT), idMap);
  if (missing.length) warnings.push(`Sesin tanımadığı sesler atlanacak: ${missing.join(' ')}`);
  if (config.phonemizer !== undefined && config.phonemizer > PHONEMIZER_VERSION) {
    warnings.push('Ses uygulamanın daha yeni bir sürümüyle eğitilmiş; en iyi sonuç için uygulamayı güncelle.');
  }
  return { ok: true, config, warnings };
}

/** Dosya adından ses adı: "tr_TR-dfki-medium.onnx" → "dfki" */
export function voiceNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.onnx(\.json)?$/i, '').replace(/\.json$/i, '');
  const parts = base.split('-');
  if (parts.length >= 3 && /^[a-z]{2}(_[A-Z]{2})?$/.test(parts[0])) return parts.slice(1, -1).join('-');
  return base || 'Ses';
}
