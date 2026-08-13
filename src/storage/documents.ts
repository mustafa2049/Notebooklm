import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './keys';
import { deleteText, readText, writeText } from './blobStore';

export type DocumentSource = 'paste' | 'txt' | 'pdf' | 'epub' | 'url';

/**
 * Kütüphanedeki bir dokümanın künyesi. Metnin kendisi burada değil,
 * `blobStore`'da tutulur — kütüphane listesini açmak için kitapların tamamını
 * belleğe almak gerekmesin.
 */
export interface DocumentMeta {
  id: string;
  title: string;
  source: DocumentSource;
  /** Dosya adı veya bağlantı */
  sourceRef?: string;
  charCount: number;
  wordCount: number;
  createdAt: number;
}

/** Kaldığın yer. Chunk indeksi değil karakter offseti saklanır (bkz. core/progress). */
export interface DocumentProgress {
  charOffset: number;
  ratio: number;
  updatedAt: number;
  finished: boolean;
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.documents);
    const list = raw ? (JSON.parse(raw) as DocumentMeta[]) : [];
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function writeIndex(documents: DocumentMeta[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.documents, JSON.stringify(documents));
}

export async function getDocument(id: string): Promise<DocumentMeta | null> {
  const documents = await listDocuments();
  return documents.find((d) => d.id === id) ?? null;
}

export async function getDocumentText(id: string): Promise<string | null> {
  return readText(id);
}

export interface NewDocument {
  title: string;
  text: string;
  source: DocumentSource;
  sourceRef?: string;
  wordCount: number;
}

export async function addDocument(input: NewDocument): Promise<DocumentMeta> {
  const meta: DocumentMeta = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title.trim() || 'Adsız metin',
    source: input.source,
    sourceRef: input.sourceRef,
    charCount: input.text.length,
    wordCount: input.wordCount,
    createdAt: Date.now(),
  };

  await writeText(meta.id, input.text);
  const documents = await listDocuments();
  await writeIndex([meta, ...documents]);
  return meta;
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const documents = await listDocuments();
  await writeIndex(documents.map((d) => (d.id === id ? { ...d, title } : d)));
}

export async function removeDocument(id: string): Promise<void> {
  const documents = await listDocuments();
  await writeIndex(documents.filter((d) => d.id !== id));
  await AsyncStorage.removeItem(KEYS.progress(id));
  await AsyncStorage.removeItem(KEYS.aiCache(id));
  await deleteText(id);
}

export async function loadProgress(id: string): Promise<DocumentProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.progress(id));
    return raw ? (JSON.parse(raw) as DocumentProgress) : null;
  } catch {
    return null;
  }
}

export async function saveProgress(id: string, progress: DocumentProgress): Promise<void> {
  await AsyncStorage.setItem(KEYS.progress(id), JSON.stringify(progress));
}

/** Kütüphane listesini tek geçişte ilerleme bilgisiyle birlikte getirir. */
export async function listDocumentsWithProgress(): Promise<
  { meta: DocumentMeta; progress: DocumentProgress | null }[]
> {
  const documents = await listDocuments();
  const progresses = await Promise.all(documents.map((d) => loadProgress(d.id)));
  return documents.map((meta, index) => ({ meta, progress: progresses[index] }));
}
