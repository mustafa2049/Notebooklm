import { shuffle, type Rng } from '../shuffle';

/**
 * Schulte tablosu: karışık dizilmiş 1…n² sayılarına sırayla dokunmak.
 *
 * Göz merkezde sabit tutulup sayılar çevresel görüşle aranır. Hızlı okuma
 * kurslarının klasik ısınmasıdır; dikkat ve görsel taramayı çalıştırır. Okuma
 * hızına doğrudan etkisine dair kanıt sınırlı — uygulamada da böyle anlatılır.
 */

export interface SchulteState {
  size: number;
  cells: number[];
  /** Dokunulması gereken sıradaki sayı */
  next: number;
  errors: number;
  done: boolean;
}

export function createSchulte(size: number, rng: Rng): SchulteState {
  const count = size * size;
  const numbers = Array.from({ length: count }, (_, i) => i + 1);
  return { size, cells: shuffle(numbers, rng), next: 1, errors: 0, done: false };
}

export function tapSchulte(state: SchulteState, value: number): SchulteState {
  if (state.done) return state;
  if (value !== state.next) return { ...state, errors: state.errors + 1 };
  const last = state.size * state.size;
  return { ...state, next: value + 1, done: value === last };
}
