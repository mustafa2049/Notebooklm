/**
 * Kendi sesinin konuşma hızı — saf, testli.
 *
 * Piper'da hız `length_scale` ile ayarlanır (büyük değer = yavaş). Her sesin
 * doğal hızı farklı olduğu için içe aktarırken örnek paragraf seslendirilip
 * ölçülür (kelime/dk); okurken hedef hıza göre ölçek bu ölçümden hesaplanır.
 * Cihaz sesindeki gibi en çok iki kat hızlanır ya da yavaşlar.
 */

/** Kalibrasyon paragrafı: sıradan, uzun ve kısa kelimeler karışık */
export const CALIBRATION_TEXT =
  'Okumak, insanın kendi zihninde çıktığı uzun bir yolculuktur. Her sayfada yeni bir kapı açılır; bu kapılardan geçtikçe dünyaya başka gözlerle bakmaya başlarız.';

/** Ölçüm yokken varsayılan doğal hız */
export const DEFAULT_NATURAL_WPM = 150;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2;
/** Kelimenin okunuşu dinlenirken biraz yavaş (cihaz sesindeki 0,85 hızına denk) */
export const SLOW_FACTOR = 1.15;

export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => /[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(word)).length;
}

/** Ölçülen konuşmadan kelime/dk */
export function measuredWpm(words: number, durationMs: number): number {
  if (durationMs <= 0 || words <= 0) return 0;
  return Math.round((words * 60000) / durationMs);
}

const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/** Hedef hız için ölçek; `base` sesin yapılandırmasındaki varsayılan ölçek */
export function lengthScaleFor(targetWpm: number, naturalWpm: number | undefined, base = 1): number {
  const natural = naturalWpm && naturalWpm > 0 ? naturalWpm : DEFAULT_NATURAL_WPM;
  const scale = (base * natural) / Math.max(1, targetWpm);
  return Math.round(clamp(scale) * 1000) / 1000;
}

/** Tek kelime/cümle dinlerken: doğal hızın biraz altı */
export function slowScale(base = 1): number {
  return Math.round(clamp(base * SLOW_FACTOR) * 1000) / 1000;
}
