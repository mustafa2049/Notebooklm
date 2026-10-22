import { Platform } from 'react-native';
import { forgetOwnVoice } from './active';
import { removeVoiceEntry, saveVoice, type VoiceEntry } from './library';
import { deleteModel, saveModel } from './modelStore';
import { OwnVoice } from './ownVoice';
import { parsePiperConfig, voiceNameFromFile } from './piperConfig';
import type { PickedModel } from './types';

/**
 * Ses paketi ekleme: dosyaları seçtir, doğrula, kaydet, dene.
 *
 * Paket standart Piper biçimi: `<ad>.onnx` + `<ad>.onnx.json` (ikisi birlikte
 * seçilir). Web'de ikisini içeren `.zip` de olur; telefonda zip 60 MB'ı
 * belleğe almayı gerektirdiği için kabul edilmez.
 */

export interface PickedVoice {
  /** Model dosyasının adı (ses adı bundan türetilir) */
  name: string;
  model: PickedModel;
  configText: string;
}

const MIN_MODEL_BYTES = 1_000_000;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Dosya seçtirir; vazgeçilirse `null`, eksik/yanlış seçimde anlaşılır hata */
export async function pickVoice(): Promise<PickedVoice | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: Platform.OS === 'web' ? ['.onnx', '.json', '.zip', 'application/zip', 'application/json', 'application/octet-stream'] : '*/*',
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const { assets } = result;

  const zip = assets.find((asset) => /\.zip$/i.test(asset.name));
  if (zip) {
    if (!zip.file) throw new Error('Telefonda zip yerine içindeki iki dosyayı (.onnx ve .onnx.json) birlikte seç.');
    return fromZip(zip.file);
  }
  const onnx = assets.find((asset) => /\.onnx$/i.test(asset.name));
  const json = assets.find((asset) => /\.json$/i.test(asset.name));
  if (!onnx && !json) throw new Error('Ses dosyası seçilmedi: .onnx ve .onnx.json dosyalarını birlikte seç.');
  if (!onnx) throw new Error('Model dosyası (.onnx) eksik: yapılandırmayla birlikte onu da seç.');
  if (!json) throw new Error('Yapılandırma dosyası (.onnx.json) eksik: modelle birlikte onu da seç.');
  let configText: string;
  if (json.file) configText = await json.file.text();
  else {
    const { File } = await import('expo-file-system');
    configText = await new File(json.uri).text();
  }
  return { name: onnx.name, model: { uri: onnx.uri, file: onnx.file }, configText };
}

async function fromZip(file: Blob): Promise<PickedVoice> {
  const JSZip = (await import('jszip')).default;
  const archive = await JSZip.loadAsync(file);
  const entries = Object.values(archive.files).filter((entry) => !entry.dir);
  const onnx = entries.find((entry) => /\.onnx$/i.test(entry.name));
  const json = entries.find((entry) => /\.onnx\.json$/i.test(entry.name)) ?? entries.find((entry) => /\.json$/i.test(entry.name));
  if (!onnx || !json) throw new Error('Zip dosyasında .onnx ve .onnx.json bulunamadı.');
  return {
    name: onnx.name.split('/').pop() ?? onnx.name,
    model: { uri: '', file: await onnx.async('blob') },
    configText: await json.async('string'),
  };
}

/**
 * Seçilen paketi doğrular, kaydeder ve dener: model açılır, örnek paragraf
 * seslendirilip sesin doğal hızı ölçülür. Açılamazsa kaydedilen dosya silinir.
 */
export async function importVoice(
  picked: PickedVoice,
  onStep?: (step: string) => void
): Promise<{ entry: VoiceEntry; warnings: string[] }> {
  const parsed = parsePiperConfig(picked.configText);
  if (!parsed.ok) throw new Error(parsed.error);
  const id = `ses-${Date.now().toString(36)}`;
  onStep?.('Ses kaydediliyor…');
  const size = await saveModel(id, picked.model);
  if (size < MIN_MODEL_BYTES) {
    await deleteModel(id).catch(() => undefined);
    throw new Error('Model dosyası çok küçük; doğru .onnx dosyasını seçtiğinden emin ol.');
  }
  const entry: VoiceEntry = {
    id,
    name: parsed.config.name ?? voiceNameFromFile(picked.name),
    size,
    config: parsed.config,
    addedAt: Date.now(),
  };
  onStep?.('Ses deneniyor…');
  let voice: OwnVoice | null = null;
  try {
    voice = await OwnVoice.open(entry);
    entry.naturalWpm = await voice.measureNaturalWpm();
  } catch (error) {
    await deleteModel(id).catch(() => undefined);
    throw new Error(`Ses açılamadı: ${message(error)}`);
  } finally {
    await voice?.close().catch(() => undefined);
  }
  if (!entry.naturalWpm) {
    await deleteModel(id).catch(() => undefined);
    throw new Error('Ses açıldı ama ses üretmedi; dosyalar aynı sese mi ait?');
  }
  await saveVoice(entry);
  return { entry, warnings: parsed.warnings };
}

export async function deleteVoice(id: string): Promise<void> {
  forgetOwnVoice(id);
  await deleteModel(id).catch(() => undefined);
  await removeVoiceEntry(id);
}
