import { get, set } from 'idb-keyval';
import { emptyData, type AppData } from '../model/types';
import { normalizeData } from './export';

const KEY = 'goz-egzersiz:data:v1';

export async function loadData(): Promise<AppData> {
  try {
    const raw = await get(KEY);
    return raw ? normalizeData(raw) : emptyData();
  } catch (err) {
    console.error('Veri okunamadı', err);
    return emptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  await set(KEY, data);
}

/** Tarayıcıdan verinin kalıcı tutulmasını iste (önbellek temizliğinde silinmesin). */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // desteklenmiyor
  }
}
