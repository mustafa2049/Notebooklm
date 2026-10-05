import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey } from '@/habit/summary';
import { KEYS } from './keys';

/**
 * Egzersiz sonuçları: en iyi süreler, geçmiş ve "bugün ısınma yapıldı mı".
 */

export type DrillId = 'schulte' | 'flash' | 'scan' | 'skim';

export interface DrillResult {
  drill: DrillId;
  at: number;
  /** Egzersizin sürdüğü süre */
  ms: number;
  /** Schulte: tablo boyutu (3, 4, 5) */
  size?: number;
  /** Schulte: yanlış dokunuş */
  errors?: number;
  /** Flaş: ulaşılan en geniş grup (kelime) ve en kısa süre (ms) */
  span?: number;
  flashMs?: number;
  /** Tarama / göz gezdirme: doğru sayısı */
  correct?: number;
  total?: number;
}

const MAX_RESULTS = 500;

export async function listDrillResults(): Promise<DrillResult[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.drills);
    return raw ? (JSON.parse(raw) as DrillResult[]) : [];
  } catch {
    return [];
  }
}

export async function recordDrill(result: DrillResult): Promise<void> {
  const results = await listDrillResults();
  await AsyncStorage.setItem(KEYS.drills, JSON.stringify([result, ...results].slice(0, MAX_RESULTS)));
}

export function drillDoneOn(results: DrillResult[], day: string): boolean {
  return results.some((result) => dayKey(result.at) === day);
}
