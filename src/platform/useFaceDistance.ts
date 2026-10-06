import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { distanceMm, focalFromFov, irisWidthPx } from './distance';

export type CameraStatus = 'off' | 'loading' | 'searching' | 'ok' | 'denied' | 'error';

export interface FaceDistance {
  status: CameraStatus;
  /** Son ölçülen mesafe (cm), yüz yoksa null. */
  distanceCm: number | null;
  /** Kalibrasyon için ham ölçüm. */
  irisPx: number | null;
  frameWidth: number;
  error?: string;
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/** Modeli bir kez yükler (uygulamanın kendi sunucusundan; internet gerekmez). */
function loadLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const base = `${import.meta.env.BASE_URL}mediapipe/`;
      const fileset = await FilesetResolver.forVisionTasks(`${base}wasm`);
      const create = (delegate: 'GPU' | 'CPU') =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${base}face_landmarker.task`, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
      try {
        return await create('GPU');
      } catch {
        return await create('CPU');
      }
    })();
    landmarkerPromise.catch(() => (landmarkerPromise = null));
  }
  return landmarkerPromise;
}

/**
 * Ön kamerayla yüz-ekran mesafesini ölçer. Görüntü yalnızca cihazda işlenir, hiçbir yere gönderilmez.
 * `focalRef` kalibrasyonla ölçülen odak uzaklığıdır; yoksa tipik görüş açısından tahmin edilir.
 */
export function useFaceDistance(enabled: boolean, focalRef?: number): FaceDistance {
  const [state, setState] = useState<FaceDistance>({ status: 'off', distanceCm: null, irisPx: null, frameWidth: 0 });
  const focalRefRef = useRef(focalRef ?? focalFromFov());
  focalRefRef.current = focalRef ?? focalFromFov();

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'off', distanceCm: null, irisPx: null, frameWidth: 0 });
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer = 0;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    setState((s) => ({ ...s, status: 'loading' }));

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Bu tarayıcı kamerayı desteklemiyor.');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) return;
        video.srcObject = stream;
        await video.play();
        const landmarker = await loadLandmarker();
        if (cancelled) return;
        // Ölçümleri yumuşatmak için son birkaç değerin ortancası kullanılır.
        const recent: number[] = [];
        const tick = () => {
          if (cancelled) return;
          if (video.readyState >= 2 && video.videoWidth > 0) {
            const res = landmarker.detectForVideo(video, performance.now());
            const lm = res.faceLandmarks?.[0];
            const iris = lm ? irisWidthPx(lm, video.videoWidth, video.videoHeight) : null;
            if (iris) {
              recent.push(distanceMm(iris, video.videoWidth, focalRefRef.current) / 10);
              if (recent.length > 5) recent.shift();
              const med = [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)];
              setState({ status: 'ok', distanceCm: Math.round(med), irisPx: iris, frameWidth: video.videoWidth });
            } else {
              recent.length = 0;
              setState({ status: 'searching', distanceCm: null, irisPx: null, frameWidth: video.videoWidth });
            }
          }
          timer = window.setTimeout(tick, 200);
        };
        tick();
      } catch (e) {
        if (cancelled) return;
        const err = e as DOMException;
        const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
        setState({
          status: denied ? 'denied' : 'error',
          distanceCm: null,
          irisPx: null,
          frameWidth: 0,
          error: denied ? 'Kamera izni verilmedi.' : err?.message || 'Kamera başlatılamadı.',
        });
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [enabled]);

  return state;
}

export function cameraStatusText(s: FaceDistance): string {
  switch (s.status) {
    case 'loading':
      return 'Kamera ve yüz modeli yükleniyor…';
    case 'searching':
      return 'Yüz aranıyor… Kameraya düz bak, yüzün aydınlık olsun.';
    case 'ok':
      return `Ekrana uzaklık ≈ ${s.distanceCm} cm`;
    case 'denied':
      return 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verebilirsin.';
    case 'error':
      return s.error ?? 'Kamera kullanılamıyor.';
    default:
      return '';
  }
}
