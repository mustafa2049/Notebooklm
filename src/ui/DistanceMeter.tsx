import { useState } from 'react';
import { PATCH_THRESHOLDS } from '../platform/eyeCheck';
import { calibrateFocal } from '../platform/distance';
import { cameraStatusText, useFaceDistance, type FaceDistance } from '../platform/useFaceDistance';
import { useProfile, useStore } from '../storage/store';

/** Hedef mesafeden %15'ten fazla sapma uyarı sayılır. */
export const DISTANCE_TOLERANCE = 0.15;

export function distanceOk(d: FaceDistance, targetCm: number): boolean | null {
  if (d.status !== 'ok' || d.distanceCm == null) return null;
  return Math.abs(d.distanceCm - targetCm) / targetCm <= DISTANCE_TOLERANCE;
}

/** Canlı mesafe göstergesi. */
export function DistanceMeter({ d, targetCm, compact }: { d: FaceDistance; targetCm?: number; compact?: boolean }) {
  if (d.status === 'off') return null;
  const ok = targetCm ? distanceOk(d, targetCm) : null;
  const hint =
    ok === false && d.distanceCm != null && targetCm
      ? d.distanceCm < targetCm
        ? ' — biraz uzaklaş'
        : ' — biraz yaklaş'
      : ok
        ? ' ✓'
        : '';
  return (
    <div
      className={compact ? 'small' : 'banner'}
      role="status"
      aria-live="polite"
      style={{
        borderLeftColor: ok === false ? 'var(--warning)' : ok ? 'var(--success)' : undefined,
        fontWeight: compact ? 700 : undefined,
      }}
    >
      📷 {cameraStatusText(d)}
      {targetCm && d.status === 'ok' ? ` (hedef ${targetCm} cm)` : ''}
      {hint}
    </div>
  );
}

/** Ayarlar'daki kamera kalibrasyonu: kullanıcı ekrandan tam 40 cm uzakta otururken ölçer. */
export function CameraCalibration() {
  const profile = useProfile();
  const { updateProfile } = useStore();
  const [on, setOn] = useState(false);
  const d = useFaceDistance(on, profile.cameraFocalPx);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="stack">
      {!on ? (
        <button className="btn" onClick={() => setOn(true)}>
          📷 Kamerayı aç ve mesafeyi gör
        </button>
      ) : (
        <>
          <DistanceMeter d={d} />
          <p className="muted small" style={{ margin: 0 }}>
            Daha doğru ölçüm için: bir cetvel ya da mezurayla gözlerin ekrandan tam <b>40 cm</b> uzakta olacak şekilde otur,
            kameraya düz bak ve aşağıdaki düğmeye bas.
          </p>
          <div className="row">
            <button
              className="btn primary"
              disabled={d.status !== 'ok' || !d.irisPx}
              onClick={() => {
                updateProfile(profile.id, { cameraFocalPx: Math.round(calibrateFocal(d.irisPx!, d.frameWidth, 400)) });
                setMsg('Kalibrasyon kaydedildi ✓');
              }}
            >
              Şu an tam 40 cm uzaktayım
            </button>
            <button className="btn" onClick={() => setOn(false)}>
              Kamerayı kapat
            </button>
          </div>
          {msg && <div className="banner">{msg}</div>}
        </>
      )}
    </div>
  );
}

/** Bant kontrolü denemesi: canlı benzerlik ve "iki göz açık / bir göz kapalı" kararı. */
export function PatchCheckPreview() {
  const profile = useProfile();
  const [on, setOn] = useState(false);
  const d = useFaceDistance(on, profile.cameraFocalPx, { analyzeEyes: true });
  const threshold = PATCH_THRESHOLDS[profile.patchCheckLevel];
  const m = d.status === 'ok' ? (d.eyeMatch ?? null) : null;

  if (!on) {
    return (
      <button className="btn" onClick={() => setOn(true)}>
        🏴‍☠️ Bant kontrolünü dene
      </button>
    );
  }
  return (
    <div className="stack" style={{ gap: 6 }} data-testid="patch-preview">
      <div className="small" role="status">
        {d.status !== 'ok'
          ? cameraStatusText(d)
          : m == null
            ? 'Gözler aranıyor…'
            : m >= threshold
              ? '👀 İki göz açık görünüyor'
              : '🏴‍☠️ Bir göz kapalı görünüyor'}
      </div>
      <div className="progress" aria-label="Göz benzerliği">
        <div style={{ width: `${Math.max(0, Math.min(1, m ?? 0)) * 100}%`, background: m != null && m >= threshold ? 'var(--warning)' : undefined }} />
      </div>
      <span className="muted small">
        Benzerlik {m == null ? '–' : `%${Math.round(Math.max(0, m) * 100)}`} · uyarı eşiği %{Math.round(threshold * 100)}. Önce iki gözün açıkken,
        sonra bandı takınca dene: bantla çubuk eşiğin altına inmeli. İnmiyorsa hassasiyeti düşür; açık gözde uyarı gelmiyorsa yükselt.
      </span>
      <button className="btn" onClick={() => setOn(false)}>
        Kamerayı kapat
      </button>
    </div>
  );
}
