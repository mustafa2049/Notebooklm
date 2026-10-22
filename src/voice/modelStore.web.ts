import type { PickedModel } from './types';

/**
 * Ses modellerinin saklandığı yer — **web**: ayrı bir IndexedDB veritabanı
 * (metinlerin `hizliokuma` veritabanının sürümüne dokunmamak için). Model
 * Blob olarak durur; ~60 MB.
 */

const DB_NAME = 'hizliokuma-voices';
const STORE = 'models';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveModel(id: string, picked: PickedModel): Promise<number> {
  const blob = picked.file ?? (await (await fetch(picked.uri)).blob());
  await withStore('readwrite', (store) => store.put(blob, id));
  // Tarayıcı yer açmak için silmesin
  void navigator.storage?.persist?.().catch(() => undefined);
  return blob.size;
}

/** Model baytları (web motoru için) */
export async function readModel(id: string): Promise<Uint8Array> {
  const blob = await withStore<Blob | undefined>('readonly', (store) => store.get(id));
  if (!blob) throw new Error('Ses dosyası bu tarayıcıda bulunamadı; sesi yeniden ekle.');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Web'de dosya yolu yok */
export function modelPath(_id: string): string {
  throw new Error('Web’de dosya yolu yok');
}

export async function hasModel(id: string): Promise<boolean> {
  return Boolean(await withStore<Blob | undefined>('readonly', (store) => store.get(id)));
}

export async function deleteModel(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}
