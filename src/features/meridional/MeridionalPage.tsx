import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { GaborViewing, OrientationTest } from '../../model/types';
import { colorForEye, fellowEyeOf } from '../../games/dichoptic/anaglyph';
import { sfx, unlockAudio } from '../../platform/sound';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { GlassesHint } from '../../ui/GlassesHint';
import { renderGabor } from '../gabor/gabor';
import { formatRx } from '../rx/rx';
import {
  ANISOTROPY_LIMIT,
  FOUR_DIRECTIONS,
  InterleavedStaircases,
  anisotropy,
  directionName,
  orientationRad,
  principalMeridians,
  weakest,
} from './meridional';

type Phase = 'setup' | 'fixation' | 'stimulus' | 'response' | 'feedback' | 'done';
type Side = 'left' | 'right';

/** Ekranda verilen açıda çizgiler (önizleme simgesi). */
export function LinesIcon({ deg, size = 28 }: { deg: number; size?: number }) {
  const r = (deg * Math.PI) / 180;
  const dx = Math.cos(r) * 11;
  const dy = -Math.sin(r) * 11;
  const nx = -dy / 11;
  const ny = dx / 11;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      {[-6, 0, 6].map((o) => (
        <line
          key={o}
          x1={14 - dx + nx * o}
          y1={14 - dy + ny * o}
          x2={14 + dx + nx * o}
          y2={14 + dy + ny * o}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export const pctTh = (t: number) => `%${(t * 100).toFixed(1)}`;

/** Yön başına eşikler; en zayıf yön işaretlenir. */
export function OrientationBars({ t }: { t: OrientationTest['thresholds'] }) {
  const weak = weakest(t);
  const showWeak = t.length > 1 && anisotropy(t) >= 1.2;
  const best = Math.min(...t.map((x) => x.threshold));
  return (
    <div className="stack" style={{ gap: 6 }}>
      {t.map((x) => (
        <div key={x.deg} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
          <LinesIcon deg={x.deg} />
          <span style={{ minWidth: 92 }} className="small">
            {directionName(x.deg)} ({x.deg}°)
          </span>
          <div className="progress" style={{ flex: 1 }}>
            <div style={{ width: `${Math.max(8, (best / x.threshold) * 100)}%` }} />
          </div>
          <b className="small" style={{ minWidth: 52, textAlign: 'right' }}>
            {pctTh(x.threshold)}
          </b>
          {showWeak && weak?.deg === x.deg && <span className="tag">zayıf</span>}
        </div>
      ))}
    </div>
  );
}

export default function MeridionalPage() {
  const profile = useProfile();
  const { addOrientationTest } = useStore();
  const { orientationTests } = useProfileResults();
  const nav = useNavigate();
  const kid = profile.mode === 'child';
  const eye = profile.amblyopicEye;
  const rx = profile.prescription?.[eye];
  const principal = principalMeridians(rx);
  const lastTest = [...orientationTests].filter((o) => o.mode === 'test').sort((a, b) => b.at - a.at)[0];
  const weakDir = lastTest ? weakest(lastTest.thresholds) : null;

  const [mode, setMode] = useState<'test' | 'train'>('test');
  const [dirSet, setDirSet] = useState<'principal' | 'four'>('principal');
  const [viewing, setViewing] = useState<GaborViewing>('patch');
  const [phase, setPhase] = useState<Phase>('setup');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [result, setResult] = useState<OrientationTest['thresholds'] | null>(null);
  const stairs = useRef(new InterleavedStaircases(principal));
  const trial = useRef<{ deg: number; contrast: number; side: Side }>({ deg: 0, contrast: 0.3, side: 'left' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timers = useRef<number[]>([]);
  useWakeLock(phase !== 'setup' && phase !== 'done');

  const anaglyph = viewing === 'anaglyph';
  const amb = colorForEye(profile.anaglyph, eye);
  const fel = colorForEye(profile.anaglyph, fellowEyeOf(eye));
  const carrier: [number, number, number] = anaglyph ? amb : [255, 255, 255];
  const pedestal: [number, number, number] = anaglyph ? [fel[0] * 0.5, fel[1] * 0.5, fel[2] * 0.5] : [0, 0, 0];
  const bgCss = anaglyph
    ? `rgb(${Math.round(pedestal[0] + amb[0] * 0.5)},${Math.round(pedestal[1] + amb[1] * 0.5)},${Math.round(pedestal[2] + amb[2] * 0.5)})`
    : 'rgb(128,128,128)';
  const cycles = 6;

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const draw = useCallback(
    (show: boolean) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = bgCss;
      ctx.fillRect(0, 0, cv.width, cv.height);
      const cx = cv.width / 2;
      const cy = cv.height / 2;
      if (show) {
        const { deg, contrast, side } = trial.current;
        const size = Math.round(Math.min(cv.width * 0.44, cv.height * 0.8, 240 * dpr));
        const x = side === 'left' ? cx - cv.width * 0.25 : cx + cv.width * 0.25;
        const img = renderGabor({ size, cycles, contrast, orientation: orientationRad(deg) }, carrier, pedestal);
        ctx.putImageData(img, Math.round(x - size / 2), Math.round(cy - size / 2));
      }
      // Sabitleme artısı (her zaman ortada; iki göz de görür)
      ctx.strokeStyle = anaglyph ? '#000' : '#222';
      ctx.lineWidth = 3 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx - 10 * dpr, cy);
      ctx.lineTo(cx + 10 * dpr, cy);
      ctx.moveTo(cx, cy - 10 * dpr);
      ctx.lineTo(cx, cy + 10 * dpr);
      ctx.stroke();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bgCss, anaglyph],
  );

  const nextTrial = useCallback(() => {
    const s = stairs.current;
    if (s.done) {
      const t = s.thresholds();
      setResult(t);
      addOrientationTest({ eye, cycles, viewing, mode, thresholds: t });
      sfx('finish');
      setPhase('done');
      return;
    }
    trial.current = { ...s.next(), side: Math.random() < 0.5 ? 'left' : 'right' };
    setPhase('fixation');
    draw(false);
    later(() => {
      setPhase('stimulus');
      draw(true);
      later(() => {
        setPhase('response');
        draw(false);
      }, kid ? 1000 : 600);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, addOrientationTest, eye, viewing, mode, kid]);

  const answer = useCallback(
    (side: Side) => {
      if (phase !== 'stimulus' && phase !== 'response') return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const ok = side === trial.current.side;
      stairs.current.respond(trial.current.deg, ok);
      sfx(ok ? 'hit' : 'miss');
      setFeedback(ok);
      setPhase('feedback');
      draw(false);
      later(() => {
        setFeedback(null);
        nextTrial();
      }, 350);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, draw, nextTrial],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') answer('left');
      if (e.key === 'ArrowRight') answer('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  const start = () => {
    unlockAudio();
    const dirs = mode === 'train' && weakDir ? [weakDir.deg] : dirSet === 'four' ? FOUR_DIRECTIONS : principal;
    stairs.current = new InterleavedStaircases(dirs, mode === 'train' ? { maxReversals: 12, maxTrials: 80 } : {});
    setResult(null);
    setPhase('fixation');
    requestAnimationFrame(() => nextTrial());
  };

  if (phase === 'setup') {
    const covered = tr.eye[fellowEyeOf(eye)];
    return (
      <div className="page stack">
        <div className="row spread">
          <h1>📐 Astigmat yönü</h1>
          <Link className="btn ghost" to="/play">
            ← Geri
          </Link>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Astigmatlı tembel gözde görme bazı yönlerdeki çizgilerde daha zayıf kalabilir (meridyonal ambliyopi). Ekranda
          ortadaki artının <b>solunda ya da sağında</b> kısa süre soluk çizgili bir desen belirecek; hangi tarafta olduğunu
          seç. Desen giderek soluklaşır ve her yön için ayrı ayrı görebildiğin en soluk düzey ölçülür.
        </p>
        <div className="card small stack" style={{ margin: 0, gap: 4 }}>
          <div>
            <b>{tr.eye[eye]} (tembel)</b>:{' '}
            {rx ? `${formatRx(rx)}` : 'reçete girilmemiş'}
          </div>
          <div className="row" style={{ gap: 6 }}>
            Ölçülecek ana yönler:
            {principal.map((d) => (
              <span key={d} className="badge-pill row" style={{ gap: 4 }}>
                <LinesIcon deg={d} size={20} /> {directionName(d)} {d}°
              </span>
            ))}
          </div>
          {!rx && (
            <span className="muted">
              <Link to="/settings#recete">Reçeteni gir</Link>, ölçüm astigmat eksenine göre yapılsın. Şimdilik yatay ve dikey ölçülür.
            </span>
          )}
        </div>
        <div className="field">
          <strong>Ne yapalım?</strong>
          <Segmented
            label="Mod"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'test', label: '📏 Yönleri ölç' },
              { value: 'train', label: '💪 Zayıf yönü çalıştır' },
            ]}
          />
          {mode === 'train' && (
            <span className="muted small">
              {weakDir
                ? `Son ölçümde en zor yön: ${directionName(weakDir.deg)} (${weakDir.deg}°). Bu yöndeki desenlerle 5–7 dakika çalışılır.`
                : 'Önce “Yönleri ölç” ile bir ölçüm yap.'}
            </span>
          )}
        </div>
        {mode === 'test' && (
          <div className="field">
            <strong>Yönler</strong>
            <Segmented
              label="Yönler"
              value={dirSet}
              onChange={setDirSet}
              options={[
                { value: 'principal', label: 'İki ana yön (≈4 dk)' },
                { value: 'four', label: '4 yön (≈8 dk)' },
              ]}
            />
          </div>
        )}
        <div className="field">
          <strong>Nasıl bakacaksın?</strong>
          <Segmented
            label="Görüntüleme"
            value={viewing}
            onChange={setViewing}
            options={[
              { value: 'patch', label: '🏴‍☠️ Bantla' },
              { value: 'anaglyph', label: '🥽 Gözlükle' },
            ]}
          />
          <span className="muted small">
            {viewing === 'patch'
              ? `${covered} bantla kapalı olmalı.`
              : 'Kırmızı-mavi gözlükle iki göz açık: desen yalnızca tembel göze gösterilir.'}
          </span>
        </div>
        {anaglyph && !profile.anaglyph.calibrated && (
          <div className="banner warn">
            Önce <Link to="/calibrate">gözlük kalibrasyonunu</Link> yapın.
          </div>
        )}
        <GlassesHint show={profile.wearsGlasses} anaglyph={anaglyph} />
        {lastTest && (
          <div className="card small" style={{ margin: 0 }}>
            <strong>Son ölçüm ({new Date(lastTest.at).toLocaleDateString('tr-TR')})</strong>
            <OrientationBars t={lastTest.thresholds} />
          </div>
        )}
        <p className="muted small" style={{ margin: 0 }}>
          Numaralı gözlükle yap: amaç gözlük takılıyken bile süren yön farkını bulmak ve çalıştırmak. Her seferinde aynı
          mesafeden (≈40 cm) ve aynı parlaklıkta yap. Klinik bir ölçüm değildir.
        </p>
        <button
          className="btn primary big"
          disabled={(anaglyph && !profile.anaglyph.calibrated) || (mode === 'train' && !weakDir)}
          onClick={start}
        >
          Başla
        </button>
      </div>
    );
  }

  const aniso = result ? anisotropy(result) : 1;
  return (
    <div className="game-screen" style={{ background: bgCss }}>
      <div className="game-hud" style={{ color: anaglyph ? '#000' : '#111' }}>
        <button onClick={() => nav('/play')} aria-label="Çık">
          ✕
        </button>
        <span>Deneme {stairs.current.trials + (phase === 'done' ? 0 : 1)}</span>
        <span />
      </div>
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} />
        {feedback !== null && (
          <div className="game-overlay" style={{ background: 'transparent', fontSize: 64 }} aria-live="polite">
            {feedback ? (kid ? '😃' : '✓') : kid ? '🙈' : '✗'}
          </div>
        )}
        {phase === 'done' && result && (
          <div className="game-overlay">
            <div className="panel">
              <h2 style={{ margin: 0 }}>{mode === 'test' ? 'Sonuç 📐' : 'Çalışma tamam 💪'}</h2>
              <OrientationBars t={result} />
              {result.length > 1 && (
                <p className="small" style={{ margin: 0 }}>
                  {aniso >= ANISOTROPY_LIMIT
                    ? `Yönler arasında belirgin fark var (${aniso.toFixed(1)} kat). “Zayıf yönü çalıştır” ile bu yönü düzenli çalıştırabilirsin. Gözlükle de sürerse doktoruna söyle.`
                    : 'Yönler arasında belirgin fark görünmüyor 👍'}
                </p>
              )}
              <p className="small muted" style={{ margin: 0 }}>
                Düşük yüzde daha iyi: daha soluk desenleri görebiliyorsun demektir.
              </p>
              <button className="btn primary big" onClick={start}>
                Tekrar
              </button>
              <button className="btn" onClick={() => setPhase('setup')}>
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 16, padding: '10px 10px calc(16px + env(safe-area-inset-bottom))' }}>
        <button className="btn" style={{ minWidth: 130, minHeight: 64 }} onClick={() => answer('left')} aria-label="Solda">
          ◀ Solda
        </button>
        <button className="btn" style={{ minWidth: 130, minHeight: 64 }} onClick={() => answer('right')} aria-label="Sağda">
          Sağda ▶
        </button>
      </div>
    </div>
  );
}
