import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  backupFileName,
  createBackup,
  KEY_PREFIX,
  mergeBackup,
  validateBackup,
  type Backup,
  type MergeOptions,
  type ValidationResult,
} from '@/backup/format';
import { readText, writeText } from './blobStore';
import { listDocuments } from './documents';

/**
 * Yedeği depodan toplama, dosyaya yazma ve geri yükleme. Biçim ve birleştirme
 * kuralları `backup/format.ts` içinde (saf, testli).
 */

async function readStoredKeys(): Promise<Record<string, string>> {
  const all = await AsyncStorage.getAllKeys();
  const ours = all.filter((key) => key.startsWith(KEY_PREFIX));
  const pairs = await AsyncStorage.multiGet(ours);
  const keys: Record<string, string> = {};
  for (const [key, value] of pairs) if (value !== null) keys[key] = value;
  return keys;
}

export async function buildBackup(now = Date.now()): Promise<Backup> {
  const [keys, documents] = await Promise.all([readStoredKeys(), listDocuments()]);
  const texts: Record<string, string> = {};
  for (const doc of documents) {
    const text = await readText(doc.id);
    if (text !== null) texts[doc.id] = text;
  }
  return createBackup(keys, texts, now);
}

/**
 * Yedeği dışa verir: web'de dosya iner, telefonda paylaşım menüsü açılır
 * (Drive'a, e-postaya, dosyalara kaydetmek için).
 */
export async function exportBackup(): Promise<{ fileName: string; bytes: number }> {
  const now = Date.now();
  const json = JSON.stringify(await buildBackup(now));
  const fileName = backupFileName(now);

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { fileName, bytes: blob.size };
  }

  const [{ File, Paths }, Sharing] = await Promise.all([
    import('expo-file-system'),
    import('expo-sharing'),
  ]);
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Bu cihazda paylaşım kullanılamıyor.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Yedeği kaydet',
  });
  return { fileName, bytes: json.length };
}

/** Dosya seçtirir ve yedek olarak doğrular. Vazgeçilirse `null`. */
export async function pickBackup(): Promise<ValidationResult | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    // Android'de Drive vb. JSON'u farklı türle verebiliyor; içerik zaten doğrulanıyor
    type: Platform.OS === 'web' ? ['application/json', '.json'] : '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  let raw: string;
  if (asset.file) {
    raw = await asset.file.text();
  } else {
    const { File } = await import('expo-file-system');
    raw = await new File(asset.uri).text();
  }
  return validateBackup(raw);
}

export interface RestoreReport {
  changedKeys: number;
  addedTexts: number;
}

/** Yedeği cihazdaki verilerle birleştirerek yazar (bkz. `mergeBackup`). */
export async function restoreBackup(backup: Backup, options: MergeOptions): Promise<RestoreReport> {
  const [keys, documents] = await Promise.all([readStoredKeys(), listDocuments()]);
  const textIds = new Set<string>();
  for (const doc of documents) {
    if ((await readText(doc.id)) !== null) textIds.add(doc.id);
  }

  const result = mergeBackup({ keys, textIds }, backup, options);
  // Önce metinler: kütüphane listesi metni olmayan bir dokümanı göstermesin
  for (const [id, text] of Object.entries(result.texts)) await writeText(id, text);
  const entries = Object.entries(result.keys);
  if (entries.length) await AsyncStorage.multiSet(entries);

  return { changedKeys: entries.length, addedTexts: Object.keys(result.texts).length };
}
