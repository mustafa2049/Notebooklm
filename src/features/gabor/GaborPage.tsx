import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { GaborViewing } from '../../model/types';
import { colorForEye, fellowEyeOf } from '../../games/dichoptic/anaglyph';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { renderGabor } from './gabor';
import { Staircase } from './staircase';
import { GlassesHint } from '../../ui/GlassesHint';

type Phase = 'setup' | 'fixation' | 'stimulus' | 'response' | 'feedback' | 'done';
type Tilt = 'left' | 'right';

const CYCLES = [
  { value: 3, label: 'Kaba' },
  { value: 6, label: 'Orta' },
  { value: 10, label: 'İnce' },
];

const TiltIcon = ({ tilt }: { tilt: Tilt }) => (
  <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
    {[-8, 0, 8].map((o) => (
      <line
        key={o}
        x1={tilt === 'right' ? 6 + o : 30 + o}
        y1={30}
        x2={tilt === 'right' ? 30 + o : 6 + o}
        y2={6}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

export default function GaborPage() {
  const profile = useProfile();
  const { addGabor } = useStore();
  const { gabor } = useProfileResults();
  const nav = useNavigate();
  const kid = profile.mode === 'child';
  const [viewing, setViewing] = useState<GaborViewing>('patch');
  const [cycles, setCycles] = useState(6);
  const [phase, setPhase] = useState<Phase>('setup');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const stair = useRef(new Staircase());
  const tilt = useRef<Tilt>('left');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timers = useRef<number[]>([]);
  useWakeLock(phase !== 'setup' && phase !== 'done');

  const anaglyph = viewing === 'anaglyph';
  const amb = colorForEye(profile.anaglyph, profile.amblyopicEye);
  const fel = colorForEye(profile.anaglyph, fellowEyeOf(profile.amblyopicEye));
  // Dikoptikte: tembel göz kanalı modüle edilir, sağlam göz düz bir zemin görür.
  const carrier: [number, number, number] = anaglyph ? amb : [255, 255, 255];
  const pedestal: [number, number, number] = anaglyph ? [fel[0] * 0.5, fel[1] * 0.5, fel[2] * 0.5] : [0, 0, 0];
  const bgCss = anaglyph
    ? `rgb(${Math.round(pedestal[0] + amb[0] * 0.5)},${Math.round(pedestal[1] + amb[1] * 0.5)},${Math.round(pedestal[2] + amb[2] * 0.5)})`
    : 'rgb(128,128,128)';

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
        const size = Math.round(Math.min(cv.width, cv.height, 340 * dpr) * 0.9);
        const img = renderGabor(
          { size, cycles, contrast: stair.current.contrast, orientation: tilt.current === 'right' ? Math.PI / 4 : -Math.PI / 4 },
          carrier,
          pedestal,
        );
        ctx.putImageData(img, Math.round(cx - size / 2), Math.round(cy - size / 2));
      } else {
        // Sabitleme artısı (iki göz de görür)
        ctx.strokeStyle = anaglyph ? '#000' : '#222';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx - 10 * dpr, cy);
        ctx.lineTo(cx + 10 * dpr, cy);
        ctx.moveTo(cx, cy - 10 * dpr);
        ctx.lineTo(cx, cy + 10 * dpr);
        ctx.stroke();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycles, bgCss, anaglyph],
  );

  const nextTrial = useCallback(() => {
    if (stair.current.done) {
      const th = stair.current.threshold();
      setResult(th);
      addGabor({ threshold: th, cycles, trials: stair.current.trials, viewing });
      setPhase('done');
      return;
    }
    tilt.current = Math.random() < 0.5 ? 'left' : 'right';
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
  }, [draw, addGabor, cycles, viewing, kid]);

  const answer = useCallback(
    (t: Tilt) => {
      if (phase !== 'stimulus' && phase !== 'response') return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const ok = t === tilt.current;
      stair.current.respond(ok);
      setFeedback(ok);
      setPhase('feedback');
      draw(false);
      later(() => {
        setFeedback(null);
        nextTrial();
      }, 350);
    },
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
    stair.current = new Staircase();
    setResult(null);
    setPhase('fixation');
    // Canvas'ın yerleşmesi için bir kare bekle
    requestAnimationFrame(() => nextTrial());
  };

  const previous = gabor
    .filter((g) => g.cycles === cycles && g.viewing === viewing)
    .sort((a, b) => a.at - b.at);
  const prev = phase === 'done' ? previous[previous.length - 2] : previous[previous.length - 1];

  if (phase === 'setup') {
    const covered = profile.amblyopicEye === 'left' ? tr.eye.right : tr.eye.left;
    return (
      <div className="page stack">
        <div className="row spread">
          <h1>🌀 Gabor eğitimi</h1>
          <Link className="btn ghost" to="/play">
            ← Geri
          </Link>
        </div>
        <p className="muted">
          Ekranda kısa süreliğine çizgili, bulanık kenarlı bir desen belirecek. Çizgilerin <b>sola mı sağa mı</b> eğik
          olduğunu seç. Emin değilsen tahmin et; desen giderek soluklaşır ve görebildiğin en soluk düzey ölçülür. Bu tür
          algısal öğrenme egzersizlerinin yetişkinlerde de görmeyi iyileştirebildiği gösterilmiştir.
        </p>
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
        <div className="field">
          <strong>Desen inceliği</strong>
          <Segmented label="Desen inceliği" value={cycles} onChange={setCycles} options={CYCLES} />
        </div>
        {prev && (
          <div className="muted small">
            Bu ayarla son eşik: %{(prev.threshold * 100).toFixed(1)} ({new Date(prev.at).toLocaleDateString('tr-TR')})
          </div>
        )}
        <p className="muted small">
          Yaklaşık 3–5 dakika sürer. Her seferinde aynı mesafeden (yaklaşık 40 cm), aynı ekran parlaklığıyla yap. Sonuç
          klinik bir ölçüm değildir; kendi ilerlemeni izlemen içindir.
        </p>
        <GlassesHint show={profile.wearsGlasses} anaglyph={anaglyph} />
        <button className="btn primary big" disabled={anaglyph && !profile.anaglyph.calibrated} onClick={start}>
          Başla
        </button>
      </div>
    );
  }

  return (
    <div className="game-screen" style={{ background: bgCss }}>
      <div className="game-hud" style={{ color: anaglyph ? '#000' : '#111' }}>
        <button onClick={() => nav('/play')} aria-label="Çık">
          ✕
        </button>
        <span>
          Deneme {stair.current.trials + (phase === 'done' ? 0 : 1)} · Kontrast %{(stair.current.contrast * 100).toFixed(1)}
        </span>
        <span />
      </div>
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} />
        {feedback !== null && (
          <div className="game-overlay" style={{ background: 'transparent', fontSize: 64 }} aria-live="polite">
            {feedback ? (kid ? '😃' : '✓') : kid ? '🙈' : '✗'}
          </div>
        )}
        {phase === 'done' && result !== null && (
          <div className="game-overlay">
            <div className="panel">
              <h2 style={{ margin: 0 }}>Seans tamam</h2>
              <p style={{ margin: 0, fontSize: '1.3em' }}>
                Kontrast eşiği: <b>%{(result * 100).toFixed(1)}</b>
              </p>
              {prev && (
                <p style={{ margin: 0 }}>
                  {result < prev.threshold
                    ? `Bir önceki seansa göre daha soluk desenleri görebildin (%${(prev.threshold * 100).toFixed(1)} → %${(result * 100).toFixed(1)}). 🎉`
                    : `Önceki seans: %${(prev.threshold * 100).toFixed(1)}. Günden güne dalgalanma normaldir; düzenli devam et.`}
                </p>
              )}
              <p className="small" style={{ margin: 0 }}>
                Düşük eşik daha iyi kontrast duyarlılığı demektir.
              </p>
              <button className="btn primary big" onClick={start}>
                Tekrar
              </button>
              <button className="btn" onClick={() => nav('/play')}>
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 16, padding: '10px 10px calc(16px + env(safe-area-inset-bottom))' }}>
        <button className="btn" style={{ minWidth: 130, minHeight: 64 }} onClick={() => answer('left')} aria-label="Sola eğik">
          <TiltIcon tilt="left" /> Sola
        </button>
        <button className="btn" style={{ minWidth: 130, minHeight: 64 }} onClick={() => answer('right')} aria-label="Sağa eğik">
          Sağa <TiltIcon tilt="right" />
        </button>
      </div>
    </div>
  );
}
