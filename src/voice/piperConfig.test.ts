import { describe, expect, it } from 'vitest';
import { parsePiperConfig, voiceNameFromFile } from './piperConfig';

// Türkçe bir Piper sesinin kullandığı sembollerin tamamı
const SYMBOLS = "_^$ !',-.:;?abcdefhijklmnoprstuvyzæçðøħŋœɐɑɒɓɔɕɖɗɘəɚɛɜɞɟɠɡɢɣɤɥɦɧɨɪɫɬɭɮɯɰɱɲɳɴɵɶɸɹɺɻɽɾʀʁʂʃʄʈʉʊʋʌʍʎʏʐʑʒʔʕʘʙʛʜʝʟʡʢʲˈˌːˑ˞βθχᵻⱱ";
const idMap = Object.fromEntries([...SYMBOLS].map((symbol, i) => [symbol, [i]]));
const config = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    audio: { sample_rate: 22050, quality: 'medium' },
    inference: { noise_scale: 0.667, length_scale: 1, noise_w: 0.8 },
    phoneme_type: 'espeak',
    num_speakers: 1,
    language: { code: 'tr_TR' },
    phoneme_id_map: idMap,
    ...extra,
  });

describe('parsePiperConfig', () => {
  it('hazır Türkçe ses: uyarı yok', () => {
    const result = parsePiperConfig(config());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
    expect(result.config).toMatchObject({ sampleRate: 22050, noiseScale: 0.667, lengthScale: 1, noiseW: 0.8, language: 'tr_TR' });
  });

  it('kendi eğittiğin ses: ad ve çözümleyici sürümü okunur', () => {
    const result = parsePiperConfig(config({ phoneme_type: 'text', hizliokuma: { phonemizer: 1, voice_name: 'Benim sesim' } }));
    expect(result.ok && result.config).toMatchObject({ phonemeType: 'text', phonemizer: 1, name: 'Benim sesim' });
    const newer = parsePiperConfig(config({ hizliokuma: { phonemizer: 99 } }));
    expect(newer.ok && newer.warnings.join(' ')).toMatch(/daha yeni/);
  });

  it('Türkçe olmayan ve eksik sembollü ses uyarı verir', () => {
    const english = parsePiperConfig(config({ language: { code: 'en_US' } }));
    expect(english.ok && english.warnings[0]).toMatch(/Türkçe için eğitilmemiş/);
    const { ɯ, ...withoutI } = idMap;
    const missing = parsePiperConfig(config({ phoneme_id_map: withoutI }));
    expect(missing.ok && missing.warnings.join(' ')).toMatch(/ɯ/);
    expect(ɯ).toBeDefined();
  });

  it('bozuk ya da başka dosya reddedilir', () => {
    expect(parsePiperConfig('{').ok).toBe(false);
    expect(parsePiperConfig('{"wpm": 300}').ok).toBe(false);
    const { _, ...noPad } = idMap;
    expect(parsePiperConfig(config({ phoneme_id_map: noPad })).ok).toBe(false);
    expect(_).toBeDefined();
    expect(parsePiperConfig(config({ audio: { sample_rate: 1000 } })).ok).toBe(false);
  });
});

describe('voiceNameFromFile', () => {
  it('Piper adlandırmasından ses adı', () => {
    expect(voiceNameFromFile('tr_TR-dfki-medium.onnx')).toBe('dfki');
    expect(voiceNameFromFile('tr_TR-benim-sesim-medium.onnx.json')).toBe('benim-sesim');
    expect(voiceNameFromFile('model.onnx')).toBe('model');
  });
});
