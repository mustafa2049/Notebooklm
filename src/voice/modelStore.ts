import { Directory, File, Paths } from 'expo-file-system';
import type { PickedModel } from './types';

/**
 * Ses modellerinin saklandığı yer — **telefon**: belgeler klasöründe
 * `voices/<id>/model.onnx`. Seçilen dosya JS belleğine alınmadan kopyalanır
 * (60 MB'lık dosya için). Web sürümü `modelStore.web.ts`.
 */

function voiceDirectory(id: string): Directory {
  return new Directory(Paths.document, 'voices', id);
}

function modelFile(id: string): File {
  return new File(voiceDirectory(id), 'model.onnx');
}

export async function saveModel(id: string, picked: PickedModel): Promise<number> {
  const dir = voiceDirectory(id);
  if (!dir.exists) dir.create({ intermediates: true });
  const target = modelFile(id);
  if (target.exists) target.delete();
  new File(picked.uri).copy(target);
  return target.size ?? 0;
}

/** Yerel motorun açacağı dosya yolu (file:// öneki olmadan) */
export function modelPath(id: string): string {
  return decodeURIComponent(modelFile(id).uri.replace(/^file:\/\//, ''));
}

export async function readModel(_id: string): Promise<Uint8Array> {
  throw new Error('Telefonda model dosyadan açılır (modelPath)');
}

export async function hasModel(id: string): Promise<boolean> {
  return modelFile(id).exists;
}

export async function deleteModel(id: string): Promise<void> {
  const dir = voiceDirectory(id);
  if (dir.exists) dir.delete();
}
