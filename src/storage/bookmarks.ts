import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './keys';

/**
 * Yer imleri: metinde dönülecek yerler ("şu sahneye geri döneceğim").
 *
 * Alıntıdan farkı: cümle değil konum saklanır, not yok; kaldığın yer
 * (ilerleme) zaten ayrıca tutulduğu için yer imi bilerek konan işaret.
 */

export interface Bookmark {
  id: string;
  docId: string;
  /** Metindeki karakter konumu (sayfanın ya da cümlenin başı) */
  charOffset: number;
  /** Konumdaki ilk kelimeler — listede tanımak için */
  excerpt: string;
  createdAt: number;
}

const MAX_BOOKMARKS = 2000;

export async function listBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.bookmarks);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

async function write(items: Bookmark[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.bookmarks, JSON.stringify(items.slice(0, MAX_BOOKMARKS)));
}

/** Kitabın yer imleri, metindeki sırasıyla */
export async function bookmarksForDoc(docId: string): Promise<Bookmark[]> {
  return (await listBookmarks())
    .filter((item) => item.docId === docId)
    .sort((a, b) => a.charOffset - b.charOffset);
}

/** Aynı yere ikinci yer imi konmaz; varsa olan döner */
export async function addBookmark(input: Omit<Bookmark, 'id' | 'createdAt'>): Promise<Bookmark> {
  const items = await listBookmarks();
  const existing = items.find(
    (item) => item.docId === input.docId && item.charOffset === input.charOffset
  );
  if (existing) return existing;
  const created: Bookmark = {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  await write([created, ...items]);
  return created;
}

export async function removeBookmarks(ids: string[]): Promise<void> {
  const remove = new Set(ids);
  await write((await listBookmarks()).filter((item) => !remove.has(item.id)));
}

/** Kitap silinince yer imleri de gider */
export async function removeBookmarksForDoc(docId: string): Promise<void> {
  const items = await listBookmarks();
  const kept = items.filter((item) => item.docId !== docId);
  if (kept.length !== items.length) await write(kept);
}
