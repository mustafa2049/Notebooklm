import { Directory, File, Paths } from 'expo-file-system';

/**
 * Doküman metinlerinin saklandığı yer — **native (Android/iOS)** uygulaması.
 * Web sürümü `blobStore.web.ts` içinde IndexedDB ile yazılmıştır; Metro paket
 * oluştururken platforma göre doğru dosyayı seçer.
 *
 * Kitap boyutundaki metinler AsyncStorage'a konmaz: Android'de AsyncStorage
 * SQLite tabanlıdır ve büyük değerlerde hem yavaşlar hem sınıra takılır.
 */
function docsDirectory(): Directory {
  const dir = new Directory(Paths.document, 'documents');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function fileFor(id: string): File {
  return new File(docsDirectory(), `${id}.txt`);
}

export async function writeText(id: string, text: string): Promise<void> {
  const file = fileFor(id);
  if (!file.exists) file.create({ intermediates: true });
  file.write(text);
}

export async function readText(id: string): Promise<string | null> {
  const file = fileFor(id);
  if (!file.exists) return null;
  return file.text();
}

export async function deleteText(id: string): Promise<void> {
  const file = fileFor(id);
  if (file.exists) file.delete();
}
