import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './keys';

/**
 * Alıntı defteri: okurken altı çizilen cümleler.
 *
 * Hızlı okumanın en sık eleştirisi "okuyorsun ama aklında kalmıyor". Önemli
 * cümleyi işaretleyip bir not düşmek, metinle etkin ilişki kurmanın en basit
 * yolu; defterde biriken alıntılar da kitabın kısa bir özetine dönüşüyor.
 */

export interface Highlight {
  id: string;
  docId: string;
  docTitle: string;
  /** Cümlenin metindeki başlangıç konumu — dokununca buraya atlanır */
  charOffset: number;
  sentence: string;
  note?: string;
  createdAt: number;
}

const MAX_HIGHLIGHTS = 5000;

export async function listHighlights(): Promise<Highlight[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.highlights);
    return raw ? (JSON.parse(raw) as Highlight[]) : [];
  } catch {
    return [];
  }
}

async function write(items: Highlight[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.highlights, JSON.stringify(items.slice(0, MAX_HIGHLIGHTS)));
}

export async function highlightsForDoc(docId: string): Promise<Highlight[]> {
  return (await listHighlights()).filter((item) => item.docId === docId);
}

/**
 * Cümleyi deftere ekler. Aynı cümle zaten işaretliyse yeni kayıt açılmaz,
 * yalnızca not güncellenir.
 */
export async function addHighlight(
  input: Omit<Highlight, 'id' | 'createdAt'>
): Promise<Highlight> {
  const items = await listHighlights();
  const existing = items.find(
    (item) => item.docId === input.docId && item.charOffset === input.charOffset
  );
  if (existing) {
    const updated = { ...existing, note: input.note || existing.note };
    await write(items.map((item) => (item.id === existing.id ? updated : item)));
    return updated;
  }
  const created: Highlight = {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  await write([created, ...items]);
  return created;
}

export async function deleteHighlight(id: string): Promise<void> {
  await write((await listHighlights()).filter((item) => item.id !== id));
}
