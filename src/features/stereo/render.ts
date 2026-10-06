import { rdsEyes, rdsPixels, type ShapeMask } from './stereo';

type RGB = readonly [number, number, number];

/** Cihaz pikseli boyutunda anaglif rastgele nokta stereogramı görüntüsü. */
export function renderRds(w: number, h: number, dot: number, mask: ShapeMask, shift: number, left: RGB, right: RGB): ImageData {
  const eyes = rdsEyes(w, h, dot, mask, shift);
  return new ImageData(rdsPixels(eyes, left, right), w, h);
}

/** Merkezi (cx, cy), kenarı `size` olan kare maskesi. */
export const squareMask =
  (cx: number, cy: number, size: number): ShapeMask =>
  (x, y) =>
    Math.abs(x - cx) < size / 2 && Math.abs(y - cy) < size / 2;
