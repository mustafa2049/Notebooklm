import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '@/storage/keys';
import type { PiperConfig } from './piperConfig';

/**
 * İçe aktarılan seslerin listesi. Model dosyası ayrı durur (bkz.
 * `modelStore`); burada adı, yapılandırması ve ölçülen hızı.
 */

export interface VoiceEntry {
  id: string;
  name: string;
  /** Model dosyasının boyutu (bayt) */
  size: number;
  config: PiperConfig;
  /** İçe aktarırken ölçülen doğal hız (kelime/dk, yapılandırmadaki ölçekle) */
  naturalWpm?: number;
  addedAt: number;
}

const listeners = new Set<() => void>();

export function onVoicesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function listVoices(): Promise<VoiceEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.voices);
    return raw ? (JSON.parse(raw) as VoiceEntry[]) : [];
  } catch {
    return [];
  }
}

export async function getVoice(id: string): Promise<VoiceEntry | undefined> {
  return (await listVoices()).find((voice) => voice.id === id);
}

async function write(voices: VoiceEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.voices, JSON.stringify(voices));
  listeners.forEach((listener) => listener());
}

export async function saveVoice(entry: VoiceEntry): Promise<void> {
  const voices = (await listVoices()).filter((voice) => voice.id !== entry.id);
  await write([...voices, entry]);
}

export async function removeVoiceEntry(id: string): Promise<void> {
  await write((await listVoices()).filter((voice) => voice.id !== id));
}
