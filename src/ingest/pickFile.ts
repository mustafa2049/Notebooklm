import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { extractEpub } from './fromEpub';
import { extractPdf } from './fromPdf';
import { normalizeText } from './normalize';
import type { ExtractedDocument } from './types';

export type PickedKind = 'txt' | 'pdf' | 'epub';

export interface PickedDocument extends ExtractedDocument {
  kind: PickedKind;
  fileName: string;
}

/** PDF okuma yalnızca web'de mümkün (bkz. `types.PdfNotSupportedError`). */
export const PDF_SUPPORTED = Platform.OS === 'web';

const MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/epub+zip',
  ...(PDF_SUPPORTED ? ['application/pdf'] : []),
];

/**
 * Dosya seçtirip metnini çıkarır. Kullanıcı vazgeçerse `null` döner.
 *
 * Baytları okumanın iki yolu var: web'de seçici bir tarayıcı `File` nesnesi
 * veriyor, telefonda ise `file://` adresi. İkisini burada tek bir yerde
 * ayırıyoruz ki çıkarıcılar platformdan habersiz kalsın.
 */
export async function pickAndExtract(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const fileName = asset.name ?? 'belge';
  const kind = detectKind(fileName, asset.mimeType);

  if (kind === 'txt') {
    const text = await readAssetText(asset);
    return { kind, fileName, text: normalizeText(text), title: stripExtension(fileName) };
  }

  const bytes = await readAssetBytes(asset);
  const extracted = kind === 'pdf' ? await extractPdf(bytes) : await extractEpub(bytes);
  return {
    kind,
    fileName,
    text: extracted.text,
    title: extracted.title ?? stripExtension(fileName),
    // EPUB'un kendi bölümleri; konumları çağıran hesaplıyor (bkz. joinChapters)
    chapters: extracted.chapters,
  };
}

function detectKind(fileName: string, mimeType?: string | null): PickedKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (lower.endsWith('.epub') || mimeType === 'application/epub+zip') return 'epub';
  return 'txt';
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

type Asset = DocumentPicker.DocumentPickerAsset;

async function readAssetText(asset: Asset): Promise<string> {
  if (asset.file) return asset.file.text();
  const { File } = await import('expo-file-system');
  return new File(asset.uri).text();
}

async function readAssetBytes(asset: Asset): Promise<Uint8Array> {
  if (asset.file) return new Uint8Array(await asset.file.arrayBuffer());
  const { File } = await import('expo-file-system');
  return new File(asset.uri).bytes();
}
