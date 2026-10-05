import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AssessmentRecord } from '@/train/assessment';
import { KEYS } from './keys';

/**
 * Seviye testleri ve anlama testi sonuçları.
 *
 * Bu kayıtlar olmadan uygulama gelişimi ölçemiyordu: quiz puanı ekranda
 * gösterilip unutuluyordu. Artık her sonuç saklanıyor ve Gelişim ekranı
 * efektif hızın zaman içindeki seyrini buradan çiziyor.
 */

const MAX_RECORDS = 500;

export async function listAssessments(): Promise<AssessmentRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.assessments);
    return raw ? (JSON.parse(raw) as AssessmentRecord[]) : [];
  } catch {
    return [];
  }
}

export async function recordAssessment(
  record: Omit<AssessmentRecord, 'id'>
): Promise<AssessmentRecord> {
  const full: AssessmentRecord = {
    ...record,
    id: `${record.at.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  };
  const records = await listAssessments();
  await AsyncStorage.setItem(
    KEYS.assessments,
    JSON.stringify([full, ...records].slice(0, MAX_RECORDS))
  );
  return full;
}
