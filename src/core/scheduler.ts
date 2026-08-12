/**
 * Oynatma saati — saf durum makinesi.
 *
 * `setInterval` kullanmıyoruz: her tur bir miktar gecikme eklediği için hata
 * birikir (500 WPM'de dakikalar içinde saniyeler kayar) ve sekme arka plana
 * alındığında tamamen bozulur. Bunun yerine hedef zaman biriktiriyoruz —
 * `nextDueAt += süre` — böylece kare gecikmeleri birbirini götürür.
 *
 * Tüm fonksiyonlar saftır; `tick` bir zaman damgası alıp yeni durum döner.
 * Bu sayede tempo doğruluğu gerçek zaman beklemeden test edilebilir.
 */

export interface PlaybackState {
  /** Gösterilen chunk indeksi */
  index: number;
  playing: boolean;
  /** Metnin sonuna gelindi */
  finished: boolean;
  /** Geçerli karenin bitiş zamanı (aynı saat tabanı: performance.now) */
  nextDueAt: number;
  /** Son duraklamadan bu yana geçen kare sayısı (yumuşak başlangıç için) */
  framesSinceResume: number;
}

/** Bir tick'te en fazla kaç kare ilerlenebilir. */
const MAX_ADVANCE_PER_TICK = 3;
/**
 * Bu kadar geri kalındıysa geçmişi hızlı sarmak yerine saat şimdiye çekilir.
 * Sekme arka plandayken rAF durur; dönüşte 300 kelimeyi bir anda geçmek yerine
 * kullanıcının kaldığı yerden devam etmesi gerekir.
 */
const RESYNC_THRESHOLD_MS = 400;

export type DurationFn = (index: number, framesSinceResume: number) => number;

export function createPlayback(index = 0): PlaybackState {
  return { index, playing: false, finished: false, nextDueAt: 0, framesSinceResume: 0 };
}

export function play(state: PlaybackState, now: number, durationOf: DurationFn): PlaybackState {
  if (state.playing) return state;
  return {
    ...state,
    playing: true,
    finished: false,
    framesSinceResume: 0,
    nextDueAt: now + durationOf(state.index, 0),
  };
}

export function pause(state: PlaybackState): PlaybackState {
  if (!state.playing) return state;
  return { ...state, playing: false };
}

/** Belirli bir kareye atlar; oynatma sürüyorsa saat yeniden kurulur. */
export function seek(
  state: PlaybackState,
  index: number,
  now: number,
  durationOf: DurationFn
): PlaybackState {
  const next = Math.max(0, index);
  return {
    ...state,
    index: next,
    finished: false,
    framesSinceResume: 0,
    nextDueAt: state.playing ? now + durationOf(next, 0) : state.nextDueAt,
  };
}

/**
 * Zamanı ilerletir. Süresi gelmiş kareleri geçer, gerekiyorsa saati yeniden
 * eşitler. Durum değişmediyse aynı nesneyi döner (gereksiz render olmaz).
 */
export function tick(
  state: PlaybackState,
  now: number,
  total: number,
  durationOf: DurationFn
): PlaybackState {
  if (!state.playing || state.finished || total === 0) return state;

  let { index, nextDueAt, framesSinceResume } = state;
  let changed = false;

  for (let advanced = 0; advanced < MAX_ADVANCE_PER_TICK && now >= nextDueAt; advanced++) {
    if (index + 1 >= total) {
      return { ...state, index: total - 1, playing: false, finished: true };
    }
    index += 1;
    framesSinceResume += 1;
    nextDueAt += durationOf(index, framesSinceResume);
    changed = true;
  }

  if (now - nextDueAt > RESYNC_THRESHOLD_MS) {
    nextDueAt = now + durationOf(index, framesSinceResume);
    changed = true;
  }

  return changed ? { ...state, index, nextDueAt, framesSinceResume } : state;
}
