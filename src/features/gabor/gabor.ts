export interface GaborSpec {
  /** Kenar uzunluğu (cihaz pikseli). */
  size: number;
  /** Yama boyunca döngü sayısı. */
  cycles: number;
  /** Radyan; 0 dikey çizgiler, pozitif saat yönünde eğim. */
  orientation: number;
  /** Michelson kontrastı (0–1). */
  contrast: number;
  phase?: number;
}

type RGB = [number, number, number];

/**
 * Gabor yaması çizer (sinüs ızgarası × Gauss zarf).
 * `carrier` modüle edilen renk (tek göz için tam beyaz, dikoptikte tembel gözün rengi),
 * `pedestal` iki gözün de gördüğü sabit zemin rengidir.
 * 8 bitlik ekranda düşük kontrastları gösterebilmek için rastgele titreşim (dithering) eklenir.
 */
export function renderGabor(spec: GaborSpec, carrier: RGB, pedestal: RGB): ImageData {
  const { size, cycles, orientation, contrast } = spec;
  const phase = spec.phase ?? Math.random() * Math.PI * 2;
  const img = new ImageData(size, size);
  const c = size / 2;
  const sigma = size / 6;
  const k = (2 * Math.PI * cycles) / size;
  const cos = Math.cos(orientation);
  const sin = Math.sin(orientation);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const xr = dx * cos + dy * sin;
      const env = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      const m = 0.5 * (1 + contrast * env * Math.sin(k * xr + phase));
      const i = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v = pedestal[ch] + carrier[ch] * m;
        img.data[i + ch] = Math.max(0, Math.min(255, Math.round(v + Math.random() - 0.5)));
      }
      img.data[i + 3] = 255;
    }
  }
  return img;
}
