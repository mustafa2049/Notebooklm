import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BookPlan } from '@/habit/bookPlan';
import { KEYS } from './keys';

/** Kitap planları: kitap başına en çok bir plan (bkz. `habit/bookPlan`). */

export async function listPlans(): Promise<BookPlan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.plans);
    return raw ? (JSON.parse(raw) as BookPlan[]) : [];
  } catch {
    return [];
  }
}

export async function planFor(docId: string): Promise<BookPlan | null> {
  return (await listPlans()).find((plan) => plan.docId === docId) ?? null;
}

/** Kitabın planını yazar (varsa eskisinin yerine) */
export async function savePlan(plan: BookPlan): Promise<void> {
  const others = (await listPlans()).filter((item) => item.docId !== plan.docId);
  await AsyncStorage.setItem(KEYS.plans, JSON.stringify([plan, ...others]));
}

export async function removePlan(docId: string): Promise<void> {
  const plans = await listPlans();
  const kept = plans.filter((item) => item.docId !== docId);
  if (kept.length !== plans.length) await AsyncStorage.setItem(KEYS.plans, JSON.stringify(kept));
}
