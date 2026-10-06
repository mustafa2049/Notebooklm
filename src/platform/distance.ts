/** Kamera görüntüsünden yüz-ekran mesafesi hesabı (saf fonksiyonlar). */

/** Yetişkin insan irisinin yatay çapı neredeyse sabittir (≈11,7 mm). */
export const IRIS_MM = 11.7;
/** Odak uzaklığı bu genişlikteki kareye göre saklanır. */
export const REF_WIDTH = 640;
/** Kalibrasyon yoksa varsayılan yatay görüş açısı (ön kameralar için tipik). */
export const DEFAULT_FOV_DEG = 60;

/** Görüş açısından odak uzaklığı (REF_WIDTH genişliğine göre piksel). */
export function focalFromFov(fovDeg = DEFAULT_FOV_DEG): number {
  return REF_WIDTH / 2 / Math.tan((fovDeg * Math.PI) / 360);
}

/** İris genişliğinden (piksel, `frameWidth` genişliğindeki karede) mesafe (mm). */
export function distanceMm(irisPx: number, frameWidth: number, focalRef: number): number {
  const f = (focalRef * frameWidth) / REF_WIDTH;
  return (f * IRIS_MM) / irisPx;
}

/** Bilinen mesafede ölçülen iris genişliğinden odak uzaklığı (kalibrasyon). */
export function calibrateFocal(irisPx: number, frameWidth: number, knownMm: number): number {
  return ((knownMm * irisPx) / IRIS_MM) * (REF_WIDTH / frameWidth);
}

interface Pt {
  x: number;
  y: number;
}

/**
 * MediaPipe Face Landmarker noktalarından iris genişliği (piksel).
 * 469/471 ve 474/476 iki irisin yatay kenar noktalarıdır. Bant bir gözü kapatabileceği için
 * iki gözden büyük olan alınır (kapalı gözün tahmini genellikle küçük çıkar).
 */
export function irisWidthPx(landmarks: Pt[], frameWidth: number, frameHeight: number): number | null {
  if (landmarks.length < 478) return null;
  const width = (a: Pt, b: Pt) => Math.hypot((a.x - b.x) * frameWidth, (a.y - b.y) * frameHeight);
  const w1 = width(landmarks[469], landmarks[471]);
  const w2 = width(landmarks[474], landmarks[476]);
  const w = Math.max(w1, w2);
  return w > 2 ? w : null;
}
