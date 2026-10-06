// Kamera ile mesafe ölçümü için MediaPipe dosyalarını public/mediapipe altına hazırlar:
// - wasm çalışma zamanı (node_modules'tan kopyalanır)
// - yüz/iris modeli (bir kez indirilir, sonra yeniden kullanılır)
// Uygulama bu dosyaları kendi sunucusundan yükler; internet olmadan da çalışır.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'public/mediapipe';
const WASM_SRC = 'node_modules/@mediapipe/tasks-vision/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MODEL = path.join(OUT, 'face_landmarker.task');

fs.mkdirSync(path.join(OUT, 'wasm'), { recursive: true });
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) {
  const src = path.join(WASM_SRC, f);
  const dst = path.join(OUT, 'wasm', f);
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst);
}

if (!fs.existsSync(MODEL) || fs.statSync(MODEL).size < 1_000_000) {
  console.log('Yüz modeli indiriliyor…');
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Model indirilemedi: ${res.status}`);
  fs.writeFileSync(MODEL, Buffer.from(await res.arrayBuffer()));
}
console.log('MediaPipe dosyaları hazır:', OUT);
