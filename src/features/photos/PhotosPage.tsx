import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AlignmentPhoto, ReflexOffset } from '../../model/types';
import { distanceMm, focalFromFov, irisWidthPx } from '../../platform/distance';
import { toGray } from '../../platform/eyeCheck';
import { loadLandmarker } from '../../platform/useFaceDistance';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { alignmentIssues, eyeBand, findReflex, irises, reflexAsymmetry, type Pt } from './photo';

const fmtDate = (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const mm = (v: number) => `${Math.abs(v).toFixed(1).replace('.', ',')} mm`;

function describeOffset(o: ReflexOffset | null): string {
  if (!o) return 'bulunamadı';
  const h = Math.abs(o.dx) < 0.15 ? 'ortada' : `${mm(o.dx)} ${o.dx > 0 ? 'burun' : 'şakak'} tarafında`;
  const v = Math.abs(o.dy) < 0.15 ? '' : `, ${mm(o.dy)} ${o.dy > 0 ? 'aşağıda' : 'yukarıda'}`;
  return h + v;
}

/** Fotoğrafın altındaki yansıma özeti. */
export function ReflexSummary({ p }: { p: AlignmentPhoto }) {
  if (!p.reflex) return null;
  const asym = reflexAsymmetry(p.reflex.right, p.reflex.left);
  return (
    <div className="small muted">
      Işık yansıması — sağ göz: {describeOffset(p.reflex.right)} · sol göz: {describeOffset(p.reflex.left)}
      {asym && (
        <>
          {' '}
          · iki göz farkı ≈ {mm(Math.hypot(asym.dx, asym.dy))} (kabaca {asym.deg}°)
        </>
      )}
    </div>
  );
}

/** Fotoğraf: görüntünün solunda kişinin sağ gözü durur (karşıdan bakan biri gibi). */
export function PhotoView({ p }: { p: AlignmentPhoto }) {
  return (
    <figure style={{ margin: 0 }}>
      <img src={p.image} alt={`${fmtDate(p.at)} göz fotoğrafı`} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
      <figcaption className="row spread small muted" style={{ marginTop: 2 }}>
        <span>← Sağ göz</span>
        <span>
          {fmtDate(p.at)}
          {p.withGlasses ? ' · 👓' : ''}
        </span>
        <span>Sol göz →</span>
      </figcaption>
    </figure>
  );
}

export default function PhotosPage() {
  const { photos } = useProfileResults();
  const { deletePhoto, updatePhoto } = useStore();
  const [capturing, setCapturing] = useState(false);
  const sorted = [...photos].sort((a, b) => b.at - a.at);
  const first = sorted[sorted.length - 1];
  const last = sorted[0];

  if (capturing) return <Capture onClose={() => setCapturing(false)} />;

  return (
    <div className="page stack">
      <div className="row spread">
        <h1>📸 Göz kayması günlüğü</h1>
        <Link className="btn ghost" to="/">
          ← Geri
        </Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Şaşılık (göz kayması) takibi için her hafta aynı şekilde bir yüz fotoğrafı çek. Çekim anında ekran beyaz yanar;
        gözlerinde oluşan ışık yansımasının konumu iki gözün hizasını gösterir (doktorların “Hirschberg” testindeki gibi).
        Fotoğraflar yalnızca bu cihazda saklanır; yedek dosyasına dahildir.
      </p>
      <button className="btn primary big" onClick={() => setCapturing(true)}>
        📷 Yeni fotoğraf çek
      </button>
      {first && last && first.id !== last.id && (
        <div className="card stack" style={{ margin: 0 }} data-testid="photo-compare">
          <strong>İlk ve son fotoğraf</strong>
          <PhotoView p={first} />
          <PhotoView p={last} />
        </div>
      )}
      {sorted.length === 0 && <p className="muted">Henüz fotoğraf yok.</p>}
      {sorted.map((p) => (
        <div key={p.id} className="card stack" style={{ margin: 0, gap: 6 }}>
          <PhotoView p={p} />
          <ReflexSummary p={p} />
          <input
            type="text"
            placeholder="Not (örn. yorgunken, gözlüksüz uzağa bakarken…)"
            value={p.note}
            onChange={(e) => updatePhoto(p.id, { note: e.target.value })}
            aria-label="Fotoğraf notu"
          />
          <div className="row spread">
            <Segmented
              label="Gözlük"
              value={p.withGlasses ? 'yes' : 'no'}
              onChange={(v) => updatePhoto(p.id, { withGlasses: v === 'yes' })}
              options={[
                { value: 'yes', label: '👓 Gözlükle' },
                { value: 'no', label: 'Gözlüksüz' },
              ]}
            />
            <button className="btn ghost danger" onClick={() => confirm('Bu fotoğraf silinsin mi?') && deletePhoto(p.id)}>
              Sil
            </button>
          </div>
        </div>
      ))}
      <p className="muted small" style={{ margin: 0 }}>
        Yansıma ölçümü kabaca bir bilgidir, tanı koymaz. Kayma fark edersen ya da arttığını düşünürsen fotoğrafları göz
        doktoruna göster. Ani başlayan kayma ya da çift görme acil değerlendirme gerektirir.
      </p>
    </div>
  );
}

type Status = 'loading' | 'searching' | 'ready' | 'error';

function Capture({ onClose }: { onClose(): void }) {
  const profile = useProfile();
  const { addPhoto } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastLm = useRef<Pt[] | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [issues, setIssues] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);
  const [shot, setShot] = useState<Omit<AlignmentPhoto, 'id' | 'profileId' | 'at' | 'note' | 'withGlasses'> | null>(null);
  const [withGlasses, setWithGlasses] = useState(profile.wearsGlasses);
  useWakeLock(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const landmarker = await loadLandmarker();
        const focal = profile.cameraFocalPx ?? focalFromFov();
        const tick = () => {
          if (cancelled) return;
          if (video.readyState >= 2 && video.videoWidth) {
            const lm = landmarker.detectForVideo(video, performance.now()).faceLandmarks?.[0];
            if (lm) {
              const w = video.videoWidth;
              const h = video.videoHeight;
              const iris = irisWidthPx(lm, w, h);
              const cm = iris ? distanceMm(iris, w, focal) / 10 : null;
              lastLm.current = lm;
              setIssues(alignmentIssues(lm, w, h, cm).issues);
              setStatus('ready');
            } else {
              lastLm.current = null;
              setStatus('searching');
            }
          }
          timer = window.setTimeout(tick, 180);
        };
        tick();
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError((e as Error)?.message || 'Kamera açılamadı.');
        }
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const take = async () => {
    const video = videoRef.current;
    if (!video) return;
    setFlash(true);
    // Kameranın pozlaması beyaz ekrana uyum sağlasın
    await new Promise((r) => setTimeout(r, 450));
    const w = video.videoWidth;
    const h = video.videoHeight;
    const frame = document.createElement('canvas');
    frame.width = w;
    frame.height = h;
    const ctx = frame.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, w, h);
    setFlash(false);
    let lm: Pt[] | null = null;
    try {
      lm = (await loadLandmarker()).detectForVideo(frame as unknown as HTMLVideoElement, performance.now()).faceLandmarks?.[0] ?? null;
    } catch {
      lm = null;
    }
    lm ??= lastLm.current;
    if (!lm) return;
    const gray = toGray(ctx.getImageData(0, 0, w, h).data, w, h);
    const ir = irises(lm, w, h);
    const reflex = ir ? { right: findReflex(gray, w, h, ir.right, 'right'), left: findReflex(gray, w, h, ir.left, 'left') } : undefined;
    const band = eyeBand(lm, w, h);
    const out = document.createElement('canvas');
    const scale = Math.min(1, 720 / band.w);
    out.width = Math.round(band.w * scale);
    out.height = Math.round(band.h * scale);
    out.getContext('2d')!.drawImage(frame, band.x, band.y, band.w, band.h, 0, 0, out.width, out.height);
    setShot({ image: out.toDataURL('image/jpeg', 0.85), reflex });
  };

  if (shot) {
    const preview: AlignmentPhoto = { ...shot, id: 'preview', profileId: profile.id, at: Date.now(), note: '', withGlasses };
    return (
      <div className="page stack">
        <h1>Fotoğraf</h1>
        <PhotoView p={preview} />
        <ReflexSummary p={preview} />
        <Segmented
          label="Gözlük"
          value={withGlasses ? 'yes' : 'no'}
          onChange={(v) => setWithGlasses(v === 'yes')}
          options={[
            { value: 'yes', label: '👓 Gözlükle çekildi' },
            { value: 'no', label: 'Gözlüksüz' },
          ]}
        />
        <div className="row">
          <button
            className="btn primary"
            onClick={() => {
              addPhoto({ ...shot, withGlasses, note: '' });
              onClose();
            }}
          >
            Kaydet
          </button>
          <button className="btn" onClick={() => setShot(null)}>
            Tekrar çek
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-screen" style={{ background: '#000' }}>
      <div className="game-hud" style={{ color: '#fff' }}>
        <button onClick={onClose} aria-label="Kapat">
          ✕
        </button>
        <span>📷 Kameraya bak</span>
        <span />
      </div>
      <div className="game-canvas-wrap" style={{ position: 'relative' }}>
        {/* Önizleme ayna gibi gösterilir; kaydedilen fotoğraf aynalanmaz (karşıdan bakan biri gibi). */}
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '18%',
            right: '18%',
            top: '32%',
            height: '16%',
            border: '2px dashed rgba(255,255,255,0.7)',
            borderRadius: 40,
          }}
        />
      </div>
      <div className="stack" style={{ padding: '8px 12px calc(12px + env(safe-area-inset-bottom))', gap: 8, color: '#fff' }}>
        <div className="small" role="status" data-testid="photo-status">
          {status === 'loading' && 'Kamera ve yüz modeli yükleniyor…'}
          {status === 'searching' && 'Yüz aranıyor… Telefonu göz hizasında, yaklaşık 40 cm uzakta tut.'}
          {status === 'error' && `Kamera kullanılamıyor: ${error}`}
          {status === 'ready' && (issues.length ? issues.join(' ') : '✓ Hazır: gözlerini kameraya dik ve fotoğrafı çek.')}
        </div>
        <button className="btn primary big" disabled={status !== 'ready'} onClick={take}>
          Fotoğrafı çek
        </button>
        <span className="small" style={{ opacity: 0.8 }}>
          Gözlerini kesik çizgili alana getir, başını dik tut ve doğrudan kamera merceğine bak. Çekimde ekran yarım saniye beyaz
          yanar.
        </span>
      </div>
      {flash && <div aria-hidden style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 1000 }} />}
    </div>
  );
}
