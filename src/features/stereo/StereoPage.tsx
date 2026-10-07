import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { makePalette } from '../../games/dichoptic/anaglyph';
import { sfx, unlockAudio } from '../../platform/sound';
import { useFaceDistance } from '../../platform/useFaceDistance';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { DistanceMeter } from '../../ui/DistanceMeter';
import { Segmented } from '../../ui/components';
import { renderRds, squareMask } from './render';
import { arcsecForPx, availableLevels, StereoTestRun, stereoCategory } from './stereo';
import { GlassesHint } from '../../ui/GlassesHint';

type Dir = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
const DIRS: Dir[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const OFFSET: Record<Dir, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const TARGET_CM = 40;

export function formatArcsec(a: number | null): string {
  return a === null ? 'algılanamadı' : `${Math.round(a)}″`;
}

export default function StereoPage() {
  const profile = useProfile();
  const { addStereoTest } = useStore();
  const { stereoTests } = useProfileResults();
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  const [useCamera, setUseCamera] = useState(false);
  const dist = useFaceDistance(useCamera && phase !== 'result', profile.cameraFocalPx);
  const samples = useRef<number[]>([]);
  const [result, setResult] = useState<{ arcsec: number | null; reachedBest: boolean; distanceCm: number } | null>(null);
  const pxPerMm = profile.screenPxPerMm ?? 3.78;
  const dpr = Math.min(window.devicePixelRatio || 1, 4);
  const levels = availableLevels(TARGET_CM * 10, pxPerMm, dpr);

  useEffect(() => {
    if (phase === 'test' && dist.status === 'ok' && dist.distanceCm) samples.current.push(dist.distanceCm);
  }, [phase, dist.distanceCm, dist.status]);

  if (!profile.anaglyph.calibrated) {
    return (
      <div className="page stack">
        <h1>Önce gözlük ayarı</h1>
        <p>3D görme testinden önce kırmızı-mavi gözlüğünü bir kez tanıtman gerekiyor (yaklaşık 1 dakika).</p>
        <Link className="btn primary big" to="/calibrate">
          🥽 Kalibrasyona başla
        </Link>
      </div>
    );
  }

  if (phase === 'test') {
    return (
      <StereoRunner
        levels={levels}
        onExit={() => setPhase('setup')}
        meter={<DistanceMeter d={dist} targetCm={TARGET_CM} compact />}
        onDone={(passed, reachedBest) => {
          // Gerçek mesafe ölçüldüyse açısal disparite ona göre düzeltilir (açı mesafeyle ters orantılı).
          const s = samples.current;
          const measured = s.length >= 3 ? [...s].sort((a, b) => a - b)[Math.floor(s.length / 2)] : null;
          const distanceCm = measured ?? TARGET_CM;
          const arcsec = passed === null ? null : Math.round((passed * TARGET_CM) / distanceCm);
          addStereoTest({ arcsec, distanceCm });
          setResult({ arcsec, reachedBest, distanceCm });
          sfx('finish');
          setPhase('result');
        }}
      />
    );
  }

  if (phase === 'result' && result) {
    const cat = stereoCategory(result.arcsec);
    return (
      <div className="page stack">
        <h1>Sonuç 🧊</h1>
        <div className="card" style={{ margin: 0 }}>
          <div className="muted small">Stereo (derinlik) görme eşiği</div>
          <div style={{ fontSize: '2em', fontWeight: 700 }}>{formatArcsec(result.arcsec)}</div>
          <div className={`badge-pill`} style={{ marginTop: 4 }}>
            {cat.tone === 'good' ? '🟢' : cat.tone === 'mid' ? '🟡' : '🔴'} {cat.label}
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            Mesafe {result.distanceCm} cm{useCamera ? ' (kamerayla ölçüldü)' : ''}
            {result.reachedBest && ' · bu ekranda gösterilebilen en küçük değer (gerçek değer daha iyi olabilir)'}
          </div>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Küçük sayı daha iyi derinlik algısı demektir (normal yaklaşık 60″ ve altı). Göz tembelliğinde stereo görme çoğu zaman
          azalmıştır; tedaviyle ve özellikle iki gözü birlikte çalıştıran egzersizlerle gelişebilir. Ev testi yaklaşıktır.
        </p>
        <div className="row">
          <Link className="btn primary" to="/play/dichoptic/depth">
            🧊 Derinlik Avı oyna
          </Link>
          <button className="btn" onClick={() => setPhase('setup')}>
            Yeni test
          </button>
        </div>
      </div>
    );
  }

  const last = [...stereoTests].sort((a, b) => b.at - a.at)[0];
  return (
    <div className="page stack">
      <div className="row spread">
        <h1>🧊 3D (stereo) görme testi</h1>
        <Link className="btn ghost" to="/">
          ← Geri
        </Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Ekranda rastgele noktalar göreceksin. Kırmızı-mavi gözlükle <b>iki gözün açıkken</b> noktaların arasında bir
        kare havada yüzüyormuş gibi “öne çıkar”. Karenin ortanın <b>üstünde, altında, solunda mı sağında mı</b> olduğunu
        seç. Kare giderek daha az öne çıkar; görebildiğin en küçük derinlik farkı ölçülür.
      </p>
      <div className="banner small">
        Bu test yalnızca iki göz birlikte çalışınca yapılabilir: bir gözünü kapatırsan kare tamamen kaybolur. Bandı çıkar,
        gözlüğünü tak, ekranı yaklaşık <b>{TARGET_CM} cm</b> uzakta tut.
      </div>
      <div className="field">
        <strong>Mesafe ölçümü</strong>
        <Segmented
          label="Kamera"
          value={useCamera ? 'cam' : 'manual'}
          onChange={(v) => setUseCamera(v === 'cam')}
          options={[
            { value: 'manual', label: `Elle (${TARGET_CM} cm)` },
            { value: 'cam', label: '📷 Kamerayla ölç' },
          ]}
        />
        <DistanceMeter d={dist} targetCm={TARGET_CM} />
      </div>
      {last && (
        <div className="muted small">
          Son sonuç: <b>{formatArcsec(last.arcsec)}</b> ({new Date(last.at).toLocaleDateString('tr-TR')})
        </div>
      )}
      <div className="muted small">
        Bu ekranda ölçülebilen en küçük değer ≈ {Math.round(arcsecForPx(1, TARGET_CM * 10, pxPerMm, dpr))}″
        {!profile.screenPxPerMm && (
          <>
            {' '}
            · Daha doğru sonuç için <Link to="/vision">ekran ölçeğini ayarla</Link>.
          </>
        )}
      </div>
      <GlassesHint show={profile.wearsGlasses} anaglyph />
      <button
        className="btn primary big"
        disabled={!levels.length}
        onClick={() => {
          unlockAudio();
          samples.current = [];
          setPhase('test');
        }}
      >
        Teste başla
      </button>
    </div>
  );
}

function StereoRunner({
  levels,
  onDone,
  onExit,
  meter,
}: {
  levels: { arcsec: number; px: number }[];
  onDone(passed: number | null, reachedBest: boolean): void;
  onExit(): void;
  meter: React.ReactNode;
}) {
  const profile = useProfile();
  // Palet sabit tutulur; yoksa her yeniden çizimde (ör. mesafe göstergesi) noktalar yeniden üretilirdi.
  const palette = useMemo(() => makePalette(profile.anaglyph, profile.amblyopicEye, 1), [profile.anaglyph, profile.amblyopicEye]);
  const runRef = useRef(new StereoTestRun(levels));
  const [dir, setDir] = useState<Dir>(() => DIRS[Math.floor(Math.random() * 4)]);
  const [trial, setTrial] = useState(0);
  const [flash, setFlash] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useWakeLock(true);
  const run = runRef.current;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || run.done) return;
    const rect = cv.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 4);
    cv.width = Math.round(rect.width * d);
    cv.height = Math.round(rect.height * d);
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const size = Math.min(cv.width, cv.height) - Math.round(24 * d);
    const ox = Math.round((cv.width - size) / 2);
    const oy = Math.round((cv.height - size) / 2);
    const sq = size * 0.24;
    const [dx, dy] = OFFSET[dir];
    const cx = size / 2 + dx * size * 0.27;
    const cy = size / 2 + dy * size * 0.27;
    const dot = Math.max(2, Math.round(1.5 * d));
    ctx.putImageData(renderRds(size, size, dot, squareMask(cx, cy, sq), run.current.px, palette.left, palette.right), ox, oy);
    // İki gözün de gördüğü çerçeve ve orta nokta (füzyon için)
    ctx.strokeStyle = palette.both;
    ctx.lineWidth = Math.max(2, 3 * d);
    ctx.strokeRect(ox - 4 * d, oy - 4 * d, size + 8 * d, size + 8 * d);
    ctx.fillStyle = palette.both;
    ctx.fillRect(ox + size / 2 - 3 * d, oy + size / 2 - 3 * d, 6 * d, 6 * d);
  }, [dir, trial, run, palette.left, palette.right, palette.both]);

  const answer = useCallback(
    (d: Dir | null) => {
      const ok = d === dir;
      runRef.current.answer(ok);
      setFlash(ok);
      setTimeout(() => setFlash(null), 250);
      if (runRef.current.done) {
        onDone(runRef.current.passed, runRef.current.reachedBest);
        return;
      }
      setDir(DIRS[Math.floor(Math.random() * 4)]);
      setTrial((t) => t + 1);
    },
    [dir, onDone],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((DIRS as string[]).includes(e.key)) {
        e.preventDefault();
        answer(e.key as Dir);
      } else if (e.key === ' ' || e.key === 'Escape') answer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  return (
    <div className="game-screen">
      <div className="game-hud">
        <button onClick={onExit} aria-label="Testten çık">
          ✕
        </button>
        <span>
          Düzey {run.index + 1}/{levels.length} · {run.current?.arcsec}″
        </span>
        <span style={{ minWidth: 44, textAlign: 'right' }}>{flash === null ? '' : flash ? '✓' : '·'}</span>
      </div>
      <div style={{ textAlign: 'center', padding: '0 8px' }}>{meter}</div>
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="stack" style={{ padding: '8px 12px calc(12px + env(safe-area-inset-bottom))', gap: 8 }}>
        <div className="row" style={{ justifyContent: 'center' }}>
          {(
            [
              ['ArrowLeft', '⬅️', 'Sol'],
              ['ArrowUp', '⬆️', 'Üst'],
              ['ArrowDown', '⬇️', 'Alt'],
              ['ArrowRight', '➡️', 'Sağ'],
            ] as const
          ).map(([k, icon, label]) => (
            <button key={k} className="btn" style={{ fontSize: 26, minWidth: 64, minHeight: 60 }} onClick={() => answer(k)} aria-label={label}>
              {icon}
            </button>
          ))}
        </div>
        <button className="btn" onClick={() => answer(null)}>
          Kare göremiyorum
        </button>
      </div>
    </div>
  );
}
