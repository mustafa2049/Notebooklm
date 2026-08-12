/**
 * Doküman metinlerinin saklandığı yer — **web** uygulaması.
 *
 * localStorage yerine IndexedDB: bir kitabın metni 1–3 MB olabiliyor,
 * localStorage'ın toplam ~5 MB sınırı birkaç kitapta doluyor. IndexedDB
 * ayrıca ana iş parçacığını bloklamaz.
 */

const DB_NAME = 'hizliokuma';
const STORE = 'documents';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function writeText(id: string, text: string): Promise<void> {
  await withStore('readwrite', (store) => store.put(text, id));
}

export async function readText(id: string): Promise<string | null> {
  const value = await withStore<string | undefined>('readonly', (store) => store.get(id));
  return value ?? null;
}

export async function deleteText(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}
