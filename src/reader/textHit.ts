import type React from 'react';
import { Platform, type NativeSyntheticEvent, type TextLayoutEventData, type View } from 'react-native';
import { lineOfIndex } from '@/core/lineFocus';
import type { ParagraphGeometry } from '@/core/wordHit';

/**
 * Uzun basılan noktadaki karakter — platforma özgü kısım.
 *
 * Web: tarayıcı noktadaki öğeyi verir (`elementFromPoint`); öğenin metin
 * düğümlerinde her karakterin kutusuna bakılır (`Range`) — kesin. Paragraf
 * kökü `id="<önek><anahtar>"` taşır; dizin, kökteki metin düğümleri sırayla
 * sayılarak paragraf düzeyine çevrilir. Seçilemez metinde (`user-select:
 * none`) de çalışır, çünkü imleç değil karakter kutusu kullanılıyor.
 *
 * Telefon: `onTextLayout` satırlarıyla tahmin (bkz. `core/wordHit`); burada
 * yalnızca içerik alanının ekrandaki yeri ölçülür.
 */

export function domHit(clientX: number, clientY: number, prefix: string): { key: string; index: number } | null {
  if (typeof document === 'undefined') return null;
  const element = document.elementFromPoint(clientX, clientY);
  const root = element?.closest(`[id^="${prefix}"]`);
  if (!element || !root) return null;

  // Noktadaki karakter: öğenin kendi metin düğümlerinde en yakın karakter kutusu
  let best: { node: Text; offset: number; distance: number } | null = null;
  const range = document.createRange();
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType !== Node.TEXT_NODE) continue;
    const node = child as Text;
    for (let i = 0; i < node.data.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      for (const rect of Array.from(range.getClientRects())) {
        if (clientY < rect.top || clientY > rect.bottom) continue;
        const distance = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
        if (!best || distance < best.distance) best = { node, offset: i, distance };
      }
    }
  }
  if (!best) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let index = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node === best.node) return { key: root.id.slice(prefix.length), index: index + best.offset };
    index += (node as Text).data.length;
  }
  return null;
}

/**
 * Paragraftaki `index`. karakterin dikey ortası, paragrafın üstüne göre
 * (satır odağı rehberi izlerken). Web'de karakter kutusundan, telefonda
 * `onTextLayout` satırlarından; ölçü yoksa `null`.
 */
export function charMiddle(
  geometry: React.MutableRefObject<Map<string, ParagraphGeometry>>,
  prefix: string,
  key: string,
  index: number
): number | null {
  if (Platform.OS !== 'web') {
    const lines = geometry.current.get(key)?.lines;
    if (!lines?.length) return null;
    const line = lines[lineOfIndex(lines.map((item) => item.text.length), index)];
    return line.y + line.height / 2;
  }
  const root = typeof document === 'undefined' ? null : document.getElementById(`${prefix}${key}`);
  if (!root) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let start = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = (node as Text).data.length;
    if (index < start + length) {
      const range = document.createRange();
      range.setStart(node, index - start);
      range.setEnd(node, index - start + 1);
      const rect = range.getClientRects()[0];
      return rect ? (rect.top + rect.bottom) / 2 - root.getBoundingClientRect().top : null;
    }
    start += length;
  }
  return null;
}

/** Görünümün ekrandaki sol üst köşesi (dokunma olaylarının `pageX/pageY` uzayında) */
export function measureOrigin(view: View | null): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }
    view.measure((_x, _y, _width, _height, pageX, pageY) => resolve({ x: pageX, y: pageY }));
  });
}

/** Telefonda paragrafın satırları (`onTextLayout` web'de yok) */
export function textLayout(geometry: React.MutableRefObject<Map<string, ParagraphGeometry>>, key: string) {
  if (Platform.OS === 'web') return {};
  return {
    onTextLayout: (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const lines = event.nativeEvent.lines.map(({ text, x, y, width, height }) => ({ text, x, y, width, height }));
      const current = geometry.current.get(key);
      geometry.current.set(key, { x: 0, y: 0, width: 0, height: 0, ...current, lines });
    },
  };
}
