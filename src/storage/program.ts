import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProgramState } from '@/train/program';
import { KEYS } from './keys';

/** 4 haftalık programın durumu (hesaplar `train/program.ts` içinde). */
export async function loadProgram(): Promise<ProgramState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.program);
    return raw ? (JSON.parse(raw) as ProgramState) : null;
  } catch {
    return null;
  }
}

export async function saveProgram(state: ProgramState | null): Promise<void> {
  if (state === null) await AsyncStorage.removeItem(KEYS.program);
  else await AsyncStorage.setItem(KEYS.program, JSON.stringify(state));
}
