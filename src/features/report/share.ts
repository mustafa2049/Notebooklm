import type { Eye } from '../../model/types';
import type { ReportSummary } from './summary';
import { publicBaseUrl } from '../../platform/native';

/** Bağlantı içinde taşınan, salt okunur rapor. Kişisel ham veri değil, yalnızca özet içerir. */
export interface SharedReport {
  v: 1;
  name: string;
  amblyopicEye: Eye;
  dailyGoalMin: number;
  nearExerciseMin: number;
  binocularMin: number;
  doctorNote: string;
  generatedAt: number;
  summary: ReportSummary;
}

const toB64Url = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Raporu sıkıştırıp bağlantıya yazılabilir metne çevirir. */
export async function encodeReport(r: SharedReport): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(r));
  return toB64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodeReport(data: string): Promise<SharedReport> {
  const json = await pipe(fromB64Url(data), new DecompressionStream('deflate-raw'));
  const r = JSON.parse(new TextDecoder().decode(json)) as SharedReport;
  if (r?.v !== 1 || !r.summary) throw new Error('Geçersiz rapor bağlantısı');
  return r;
}

/** Herkesin açabileceği web adresine göre paylaşım bağlantısı. */
export function reportUrl(data: string, base = publicBaseUrl()): string {
  return `${base}#/shared/${data}`;
}
