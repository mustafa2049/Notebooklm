import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { Eye } from '../../model/types';
import { sfx, unlockAudio } from '../../platform/sound';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { GlassesHint } from '../../ui/GlassesHint';
import { CS_LABEL, csCategory, dither, letterHeightMm, letterPixel, nextLetter, PelliRobsonRun, SLOAN, type Letter } from './contrast';

const BG = 235;
const DISTANCES = [
  { value: 40, label: '40 cm (telefon)' },
  { value: 100, label: '1 m (tablet/bilgisayar)' },
];

export const formatLogCS = (v: number) => v.toFixed(2).replace('.', ',');

export default function ContrastPage() {
  const profile = useProfile();
  const { addContrastTest } = useStore();
  const { contrastTests } = useProfileResults();
  const fellow: Eye = profile.amblyopicEye === 'left' ? 'right' : 'left';
  const [phase, setPhase] = useState<'setup' | 'cover' | 'test' | 'result'>('setup');
  const [distance, setDistance] = useState(40);
  const [bothEyes, setBothEyes] = useState(true);
  const [withGlasses, setWithGlasses] = useState(profile.wearsGlasses);
  const [queue, setQueue] = useState<Eye[]>([]);
  const [results, setResults] = useState<{ eye: Eye; logCS: number; reachedMax: boolean }[]>([]);

  const start = () => {
    unlockAudio();
    setResults([]);
    setQueue(bothEyes ? [profile.amblyopicEye, fellow] : [profile.amblyopicEye]);
    setPhase('cover');
  };

  const onEyeDone = (logCS: number, reachedMax: boolean) => {
    const eye = queue[0];
    addContrastTest({ eye, logCS, distanceCm: distance, withGlasses });
    setResults((r) => [...r, { eye, logCS, reachedMax }]);
    const rest = queue.slice(1);
    setQueue(rest);
    sfx('finish');
    setPhase(rest.length ? 'cover' : 'result');
  };

  if (phase === 'cover') {
    const eye = queue[0];
    return (
      <div className="page stack">
        <h1>
          {tr.eye[eye]} {eye === profile.amblyopicEye ? '(tembel göz)' : '(sağlam göz)'}
        </h1>
        <div className="banner warn">
          <b>{tr.eye[eye === 'left' ? 'right' : 'left']}</b> bantla ya da avucunla kapat (bastırmadan).
          {withGlasses ? ' Numaralı gözlüğün takılı olsun 👓.' : ''}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Ekranla gözün arasında <b>{distance === 100 ? '1 metre' : `${distance} cm`}</b> olsun. Ortada bir harf göreceksin;
          harfler giderek soluklaşır. Hangi harf olduğunu aşağıdan seç. Emin değilsen tahmin et; hiç göremiyorsan
          “Göremiyorum”a bas. Ekran parlaklığını yükselt ve ekrana ışık yansımamasına dikkat et.
        </p>
        <button className="btn primary big" onClick={() => setPhase('test')}>
          Hazırım
        </button>
      </div>
    );
  }

  if (phase === 'test') {
    return (
      <ContrastRunner
        key={queue[0]}
        distanceMm={distance * 10}
        pxPerMm={profile.screenPxPerMm ?? 3.78}
        onDone={onEyeDone}
        onExit={() => setPhase('setup')}
      />
    );
  }

  if (phase === 'result') {
    const amb = results.find((r) => r.eye === profile.amblyopicEye);
    const fel = results.find((r) => r.eye === fellow);
    return (
      <div className="page stack">
        <h1>Sonuç 🌗</h1>
        {results.map((r) => (
          <div key={r.eye} className="card" style={{ margin: 0 }}>
            <div className="muted small">
              {tr.eye[r.eye]} {r.eye === profile.amblyopicEye ? '(tembel göz)' : '(sağlam göz)'}
            </div>
            <div style={{ fontSize: '2em', fontWeight: 700 }}>{formatLogCS(r.logCS)}</div>
            <div className="small">
              log kontrast duyarlılığı · {CS_LABEL[csCategory(r.logCS)]}
              {r.reachedMax && ' · bu testte ölçülebilen en iyi değer'}
            </div>
          </div>
        ))}
        {amb && fel && (
          <div className={`banner ${fel.logCS - amb.logCS >= 0.3 ? 'warn' : ''}`}>
            İki göz farkı: <b>{formatLogCS(Math.max(0, fel.logCS - amb.logCS))}</b> log birim.{' '}
            {fel.logCS - amb.logCS >= 0.3
              ? 'Tembel göz soluk ayrıntıları belirgin şekilde daha zor görüyor; tedaviyle bu farkın azalması beklenir.'
              : 'İki göz arasındaki fark küçük. 🎉'}
          </div>
        )}
        <p className="muted small" style={{ margin: 0 }}>
          Kontrast duyarlılığı, soluk ve gri tonlu ayrıntıları görebilme yeteneğidir; harf tablosundaki keskinlik normale
          yaklaşsa bile tembel gözde düşük kalabilir. Ev ekranında ölçüm yaklaşıktır; her seferinde aynı cihaz, parlaklık ve
          ışıkta yap.
        </p>
        <div className="row">
          <Link className="btn primary" to="/stats">
            📈 İlerlemeyi gör
          </Link>
          <button className="btn" onClick={() => setPhase('setup')}>
            Yeni test
          </button>
        </div>
      </div>
    );
  }

  const last = (eye: Eye) => [...contrastTests].filter((v) => v.eye === eye).sort((a, b) => b.at - a.at)[0];
  return (
    <div className="page stack">
      <div className="row spread">
        <h1>🌗 Kontrast duyarlılığı</h1>
        <Link className="btn ghost" to="/">
          ← Geri
        </Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Pelli-Robson tablosuna benzer bir testtir. Büyük harfler üçerli gruplar hâlinde, her grupta biraz daha soluk
        gösterilir. Her göz için görebildiğin en soluk düzey ölçülür (yaklaşık 2 dakika).
      </p>
      <div className="field">
        <strong>Ekrana uzaklık</strong>
        <Segmented label="Mesafe" value={distance} onChange={setDistance} options={DISTANCES} />
      </div>
      <div className="field">
        <strong>Hangi gözler?</strong>
        <Segmented
          label="Gözler"
          value={bothEyes ? 'both' : 'amb'}
          onChange={(v) => setBothEyes(v === 'both')}
          options={[
            { value: 'both', label: 'İki göz (önerilen)' },
            { value: 'amb', label: 'Sadece tembel göz' },
          ]}
        />
      </div>
      <div className="field">
        <strong>👓 Numaralı gözlükle mi?</strong>
        <Segmented
          label="Gözlükle"
          value={withGlasses ? 'yes' : 'no'}
          onChange={(v) => setWithGlasses(v === 'yes')}
          options={[
            { value: 'yes', label: '👓 Gözlükle' },
            { value: 'no', label: 'Gözlüksüz' },
          ]}
        />
      </div>
      <GlassesHint show={profile.wearsGlasses && withGlasses} anaglyph={false} />
      {!profile.screenPxPerMm && (
        <div className="banner small">
          Harf boyu için <Link to="/vision">ekran ölçeğini</Link> bir kez ayarlaman önerilir (görme testinin ilk adımı).
        </div>
      )}
      {(last('left') || last('right')) && (
        <div className="card small" style={{ margin: 0 }}>
          <strong>Son ölçümler</strong>
          {(['left', 'right'] as Eye[]).map((e) => {
            const v = last(e);
            return v ? (
              <div key={e}>
                {tr.eye[e]}: <b>{formatLogCS(v.logCS)}</b> ({new Date(v.at).toLocaleDateString('tr-TR')}, {CS_LABEL[csCategory(v.logCS)]})
              </div>
            ) : null;
          })}
        </div>
      )}
      <button className="btn primary big" onClick={start}>
        Teste başla
      </button>
    </div>
  );
}

function ContrastRunner({
  distanceMm,
  pxPerMm,
  onDone,
  onExit,
}: {
  distanceMm: number;
  pxPerMm: number;
  onDone(logCS: number, reachedMax: boolean): void;
  onExit(): void;
}) {
  const runRef = useRef(new PelliRobsonRun());
  const [triplet, setTriplet] = useState<Letter[]>(() => [nextLetter([])]);
  const [flash, setFlash] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useWakeLock(true);
  const run = runRef.current;
  const letter = triplet[triplet.length - 1];

  // Harfi gerçek boyutta, istenen kontrastta ve titreşimle (dithering) çiz.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(rect.width * d);
    cv.height = Math.round(rect.height * d);
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    const capPx = Math.min(letterHeightMm(distanceMm) * pxPerMm * d, cv.height * 0.8, cv.width * 0.8);
    // Önce harf maskesi (siyah zemin üzerine beyaz harf), sonra piksel piksel renk.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(capPx / 0.72)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(letter, cv.width / 2, cv.height / 2 + capPx / 2);
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const fg = letterPixel(BG, run.contrast);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i] / 255;
      const v = dither(BG * (1 - a) + fg * a);
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [letter, distanceMm, pxPerMm, run.contrast, run.level]);

  const answer = useCallback(
    (l: Letter | null) => {
      const ok = l === letter;
      run.answer(ok);
      setFlash(ok);
      window.setTimeout(() => setFlash(null), 250);
      if (run.done) {
        onDone(run.logCS, run.reachedMax);
        return;
      }
      // Yeni üçlüde harf tekrarı kontrolü sıfırlanır.
      const prev = run.letterInTriplet === 0 ? [] : triplet;
      setTriplet([...prev, nextLetter(prev)]);
    },
    [letter, run, triplet, onDone],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if ((SLOAN as readonly string[]).includes(k)) answer(k as Letter);
      else if (e.key === ' ' || e.key === 'Escape') answer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  return (
    <div className="game-screen light" style={{ background: `rgb(${BG},${BG},${BG})` }}>
      <div className="game-hud">
        <button onClick={onExit} aria-label="Testten çık">
          ✕
        </button>
        <span>
          Düzey {run.level + 1}/16 · {run.letterInTriplet + 1}. harf / 3
        </span>
        <span style={{ minWidth: 44, textAlign: 'right' }}>{flash === null ? '' : flash ? '✓' : '·'}</span>
      </div>
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} data-testid="contrast-canvas" />
      </div>
      <div className="stack" style={{ padding: '8px 12px calc(12px + env(safe-area-inset-bottom))', gap: 8 }}>
        <div className="letter-pad">
          {SLOAN.map((l) => (
            <button key={l} className="btn" onClick={() => answer(l)} aria-label={`Harf ${l}`}>
              {l}
            </button>
          ))}
        </div>
        <button className="btn" onClick={() => answer(null)}>
          Göremiyorum
        </button>
      </div>
    </div>
  );
}
