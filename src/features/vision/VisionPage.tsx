import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { Eye } from '../../model/types';
import { drawE, type Dir } from '../../games/monocular/tumblingE';
import { sfx, unlockAudio } from '../../platform/sound';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { DistanceMeter } from '../../ui/DistanceMeter';
import { useFaceDistance } from '../../platform/useFaceDistance';
import {
  AcuityTest,
  CARD_WIDTH_MM,
  CROWD_BAR,
  CROWD_GAP,
  letterHeightMm,
  measurableRange,
  toDecimal,
  toSnellen6,
  toTenths,
} from './acuity';

const DIRS: Dir[] = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
const DISTANCES = [
  { value: 40, label: '40 cm' },
  { value: 100, label: '1 m' },
  { value: 200, label: '2 m' },
  { value: 300, label: '3 m' },
];

type Phase = 'setup' | 'scale' | 'cover' | 'test' | 'result';

export function describeLogMAR(v: number): string {
  return `${toTenths(v)} (ondalık ${toDecimal(v).toFixed(2)}, ${toSnellen6(v)}, logMAR ${v.toFixed(2)})`;
}

export default function VisionPage() {
  const profile = useProfile();
  const { updateProfile, addVisionTest } = useStore();
  const { visionTests } = useProfileResults();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>(profile.screenPxPerMm ? 'setup' : 'scale');
  const [distance, setDistance] = useState(40);
  const [bothEyes, setBothEyes] = useState(true);
  const [withGlasses, setWithGlasses] = useState(profile.wearsGlasses);
  const fromSetup = useSearchParams()[0].get('from') === 'setup';
  const [queue, setQueue] = useState<Eye[]>([]);
  const [results, setResults] = useState<{ eye: Eye; logMAR: number; reachedBest: boolean }[]>([]);
  const pxPerMm = profile.screenPxPerMm ?? 3.78;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 4) : 1;
  const screenMin = typeof window !== 'undefined' ? Math.min(window.innerWidth, window.innerHeight - 200) : 400;
  const range = measurableRange(distance * 10, pxPerMm, dpr, screenMin);
  const fellow: Eye = profile.amblyopicEye === 'left' ? 'right' : 'left';
  // Kamera ölçümü yalnızca 1 m'ye kadar güvenilir (uzakta iris çok küçük görünür).
  const [useCamera, setUseCamera] = useState(false);
  const cameraOn = useCamera && distance <= 100 && (phase === 'setup' || phase === 'cover' || phase === 'test');
  const dist = useFaceDistance(cameraOn, profile.cameraFocalPx);
  const samples = useRef<number[]>([]);
  useEffect(() => {
    if (phase === 'test' && dist.status === 'ok' && dist.distanceCm) samples.current.push(dist.distanceCm);
  }, [phase, dist.distanceCm, dist.status]);

  const start = () => {
    unlockAudio();
    setResults([]);
    setQueue(bothEyes ? [profile.amblyopicEye, fellow] : [profile.amblyopicEye]);
    setPhase('cover');
  };

  const onEyeDone = (rawLogMAR: number, reachedBest: boolean) => {
    const eye = queue[0];
    // Kamerayla ölçülen gerçek mesafe hedeften farklıysa harflerin açısal boyutu da farklıdır:
    // logMAR, hedef/gerçek mesafe oranının logaritması kadar düzeltilir.
    const s = samples.current;
    const measured = s.length >= 3 ? [...s].sort((a, b) => a - b)[Math.floor(s.length / 2)] : null;
    samples.current = [];
    const logMAR = measured ? Math.round((rawLogMAR + Math.log10(distance / measured)) * 100) / 100 : rawLogMAR;
    addVisionTest({ eye, logMAR, distanceCm: measured ?? distance, withGlasses });
    const next = [...results, { eye, logMAR, reachedBest }];
    setResults(next);
    const rest = queue.slice(1);
    setQueue(rest);
    sfx('finish');
    setPhase(rest.length ? 'cover' : 'result');
  };

  if (phase === 'scale') {
    return (
      <ScreenScale
        initial={pxPerMm}
        onSave={(v) => {
          updateProfile(profile.id, { screenPxPerMm: v });
          setPhase('setup');
        }}
        onCancel={() => (profile.screenPxPerMm ? setPhase('setup') : nav(-1))}
      />
    );
  }

  if (phase === 'cover') {
    const eye = queue[0];
    const other = eye === 'left' ? tr.eye.right : tr.eye.left;
    return (
      <div className="page stack">
        <h1>
          {tr.eye[eye]} testi {eye === profile.amblyopicEye ? '(tembel göz)' : '(sağlam göz)'}
        </h1>
        <div className="banner warn">
          <b>{other}</b> bantla ya da avucunla kapat (bastırmadan).{' '}
          {withGlasses ? 'Numaralı gözlüğün takılı olsun 👓.' : 'Gözlüğünü çıkar.'}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Ekranla gözün arasında <b>{distance >= 100 ? `${distance / 100} metre` : `${distance} cm`}</b> olsun. Ortadaki E
          harfinin bacaklarının hangi yöne baktığını seç. Emin değilsen tahmin et; hiç göremiyorsan “Göremiyorum”a bas.
          {distance >= 100 && ' Uzaktan klavyenin ok tuşlarını kullanabilir ya da yanındaki birine söyleyip dokunmasını isteyebilirsin.'}
        </p>
        <DistanceMeter d={dist} targetCm={distance} />
        <button className="btn primary big" onClick={() => setPhase('test')}>
          Hazırım
        </button>
      </div>
    );
  }

  if (phase === 'test') {
    return (
      <AcuityRunner
        key={queue[0]}
        startLine={range.worst}
        bestLine={range.best}
        distanceMm={distance * 10}
        pxPerMm={pxPerMm}
        onDone={onEyeDone}
        onExit={() => setPhase('setup')}
        meter={<DistanceMeter d={dist} targetCm={distance} compact />}
      />
    );
  }

  if (phase === 'result') {
    const amb = results.find((r) => r.eye === profile.amblyopicEye);
    const fel = results.find((r) => r.eye === fellow);
    const diffLines = amb && fel ? Math.round((amb.logMAR - fel.logMAR) * 10) : null;
    return (
      <div className="page stack">
        <h1>Sonuç 👁️</h1>
        {results.map((r) => (
          <div key={r.eye} className="card" style={{ margin: 0 }}>
            <div className="muted small">
              {tr.eye[r.eye]} {r.eye === profile.amblyopicEye ? '(tembel göz)' : '(sağlam göz)'}
            </div>
            <div style={{ fontSize: '2em', fontWeight: 700 }}>{toTenths(r.logMAR)}</div>
            <div className="small">
              Ondalık {toDecimal(r.logMAR).toFixed(2)} · {toSnellen6(r.logMAR)} · logMAR {r.logMAR.toFixed(2)}
              {r.reachedBest && ' · bu mesafe ve ekranda ölçülebilen en iyi değer (gerçek değer daha iyi olabilir)'}
            </div>
          </div>
        ))}
        {diffLines !== null && (
          <div className={`banner ${diffLines >= 2 ? 'warn' : ''}`}>
            İki göz arasındaki fark: <b>{Math.max(0, diffLines)} satır</b>.{' '}
            {diffLines >= 2
              ? 'Tembel göz hâlâ belirgin şekilde geride; tedaviye düzenli devam etmek önemli.'
              : 'Gözler arasındaki fark küçük görünüyor. 🎉'}
          </div>
        )}
        <p className="muted small" style={{ margin: 0 }}>
          Bu ev testi yaklaşık bir değerdir ve göz doktorunun ölçümünün yerine geçmez. Sonuçlar ilerleme grafiğine ve doktor
          raporuna eklendi. En doğru karşılaştırma için her seferinde aynı mesafe, aynı cihaz ve aynı ışıkta test et.
        </p>
        <div className="row">
          {fromSetup ? (
            <Link className="btn primary" to="/setup">
              🧭 Kuruluma dön
            </Link>
          ) : (
            <Link className="btn primary" to="/stats">
              📈 İlerlemeyi gör
            </Link>
          )}
          <button className="btn" onClick={() => setPhase('setup')}>
            Yeni test
          </button>
        </div>
      </div>
    );
  }

  const last = (eye: Eye) => [...visionTests].filter((v) => v.eye === eye).sort((a, b) => b.at - a.at)[0];
  return (
    <div className="page stack">
      <div className="row spread">
        <h1>👁️ Evde görme testi</h1>
        <Link className="btn ghost" to="/">
          ← Geri
        </Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Kalabalıklaştırılmış E harfiyle her göz için görme keskinliğini yaklaşık olarak ölçer. Göz tembelliğinde harfler
        yan yana olunca daha zor görülür; bu yüzden harfin etrafında çubuklar bulunur.
      </p>
      <div className="field">
        <strong>Ekrana uzaklık</strong>
        <Segmented label="Mesafe" value={distance} onChange={setDistance} options={DISTANCES} />
        <span className="muted small">
          Telefonda 40 cm (kol mesafesi), bilgisayar ya da tablette 1–3 m önerilir. Bu ekranda ölçülebilen aralık:{' '}
          {toTenths(range.worst)} – {toTenths(range.best)}.
        </span>
      </div>
      {distance <= 100 && (
        <div className="field">
          <strong>Mesafe ölçümü</strong>
          <Segmented
            label="Kamera"
            value={useCamera ? 'cam' : 'manual'}
            onChange={(v) => setUseCamera(v === 'cam')}
            options={[
              { value: 'manual', label: 'Elle ölçtüm' },
              { value: 'cam', label: '📷 Kamerayla ölç' },
            ]}
          />
          <DistanceMeter d={dist} targetCm={distance} />
          {useCamera && (
            <span className="muted small">
              Görüntü yalnızca bu cihazda işlenir. Sonuç, testteki gerçek mesafeye göre otomatik düzeltilir.
            </span>
          )}
        </div>
      )}
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
        <span className="muted small">
          {profile.wearsGlasses
            ? 'Doktorlar görmeyi genellikle gözlükle (düzeltilmiş) ölçer. İlerlemeyi izlemek için her seferinde aynı seçimi yap.'
            : 'Gözlük kullanmıyorsan “Gözlüksüz” seçili kalsın.'}
        </span>
      </div>
      {(last('left') || last('right')) && (
        <div className="card small" style={{ margin: 0 }}>
          <strong>Son ölçümler</strong>
          {(['left', 'right'] as Eye[]).map((e) => {
            const v = last(e);
            return v ? (
              <div key={e}>
                {tr.eye[e]}: <b>{toTenths(v.logMAR)}</b> ({new Date(v.at).toLocaleDateString('tr-TR')}, {v.distanceCm} cm
                {v.withGlasses ? ', 👓 gözlükle' : v.withGlasses === false ? ', gözlüksüz' : ''})
              </div>
            ) : null;
          })}
        </div>
      )}
      <div className="muted small">
        Ekran ölçeği: {pxPerMm.toFixed(2)} px/mm ·{' '}
        <button className="btn ghost small" style={{ minHeight: 0, padding: 0 }} onClick={() => setPhase('scale')}>
          Yeniden ayarla
        </button>
      </div>
      {range.worst < range.best && (
        <div className="banner warn">
          Bu ekran bu mesafe için çok küçük ya da çözünürlüğü düşük. Daha yakın bir mesafe seç ya da daha büyük bir ekran kullan.
        </div>
      )}
      <button className="btn primary big" onClick={start} disabled={range.worst < range.best}>
        Teste başla
      </button>
    </div>
  );
}

/** Kredi kartıyla ekran ölçeği ayarı. */
export function ScreenScale({
  initial,
  onSave,
  onCancel,
  embedded = false,
  cancelLabel = 'Vazgeç',
}: {
  initial: number;
  onSave(v: number): void;
  onCancel(): void;
  /** Kurulum sihirbazının içinde başlıksız gösterilir. */
  embedded?: boolean;
  cancelLabel?: string;
}) {
  const [v, setV] = useState(initial);
  const w = CARD_WIDTH_MM * v;
  return (
    <div className={embedded ? 'stack' : 'page stack'}>
      {!embedded && <h1>💳 Ekran ölçeği</h1>}
      <p className="muted" style={{ margin: 0 }}>
        Harflerin gerçek boyutta çizilmesi için ekranını bir kez ölçmemiz gerekiyor. Bir banka kartını (ya da aynı boyuttaki
        herhangi bir kartı) aşağıdaki kutunun üzerine koy ve kutunun genişliği kartla tam aynı olana kadar kaydırıcıyı ayarla.
      </p>
      <div style={{ overflow: 'hidden', padding: '8px 0' }}>
        <div
          data-testid="card-box"
          style={{
            width: w,
            height: w * (53.98 / CARD_WIDTH_MM),
            borderRadius: v * 3.2,
            border: '2px solid var(--primary)',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 25%, transparent), transparent)',
            display: 'grid',
            placeItems: 'center',
          }}
          className="muted small"
        >
          Kartı buraya hizala
        </div>
      </div>
      <label className="field">
        Ölçek: {v.toFixed(2)} px/mm
        <input type="range" min={2} max={10} step={0.01} value={v} onChange={(e) => setV(Number(e.target.value))} />
      </label>
      <div className="row">
        <button className="btn" onClick={() => setV(Math.max(2, v - 0.02))} aria-label="Küçült">
          −
        </button>
        <button className="btn" onClick={() => setV(Math.min(10, v + 0.02))} aria-label="Büyüt">
          ＋
        </button>
      </div>
      <div className="row spread">
        <button className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className="btn primary" onClick={() => onSave(Math.round(v * 100) / 100)}>
          Kaydet
        </button>
      </div>
    </div>
  );
}

/** Tek göz için testi yürütür. */
function AcuityRunner({
  startLine,
  bestLine,
  distanceMm,
  pxPerMm,
  onDone,
  onExit,
  meter,
}: {
  meter?: React.ReactNode;
  startLine: number;
  bestLine: number;
  distanceMm: number;
  pxPerMm: number;
  onDone(logMAR: number, reachedBest: boolean): void;
  onExit(): void;
}) {
  const testRef = useRef(new AcuityTest(startLine, bestLine));
  const [dir, setDir] = useState<Dir>(() => DIRS[Math.floor(Math.random() * 4)]);
  const [, force] = useState(0);
  const [flash, setFlash] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const swipe = useRef<[number, number] | null>(null);
  useWakeLock(true);
  const t = testRef.current;

  // Harfi gerçek boyutunda ve cihaz pikseline hizalı çiz
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 4);
    cv.width = Math.round(rect.width * d);
    cv.height = Math.round(rect.height * d);
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const stroke = Math.max(1, Math.round((letterHeightMm(t.line, distanceMm) * pxPerMm * d) / 5));
    const size = stroke * 5;
    const cx = Math.round(cv.width / 2);
    const cy = Math.round(cv.height / 2);
    drawE(ctx, cx, cy, size, dir);
    // Kalabalıklaştırma çubukları
    const gap = Math.round(size * CROWD_GAP);
    const bar = Math.max(1, Math.round(size * CROWD_BAR));
    const half = size / 2;
    const outer = half + gap + bar;
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - outer, cy - outer, outer * 2, bar);
    ctx.fillRect(cx - outer, cy + outer - bar, outer * 2, bar);
    ctx.fillRect(cx - outer, cy - outer, bar, outer * 2);
    ctx.fillRect(cx + outer - bar, cy - outer, bar, outer * 2);
  });

  const answer = useCallback(
    (d: Dir | null) => {
      const ok = d === dir;
      testRef.current.answer(ok);
      setFlash(ok);
      setTimeout(() => setFlash(null), 250);
      if (testRef.current.done) {
        onDone(testRef.current.result(), testRef.current.reachedBest);
        return;
      }
      let nd = DIRS[Math.floor(Math.random() * 4)];
      while (nd === dir) nd = DIRS[Math.floor(Math.random() * 4)];
      setDir(nd);
      force((n) => n + 1);
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
    <div className="game-screen light">
      <div className="game-hud">
        <button onClick={onExit} aria-label="Testten çık">
          ✕
        </button>
        <span>
          Düzey {toTenths(t.line)} · {t.letterInLine + 1}. harf / 5
        </span>
        <span style={{ minWidth: 44, textAlign: 'right' }}>{flash === null ? '' : flash ? '✓' : '·'}</span>
      </div>
      {meter && <div style={{ textAlign: 'center', padding: '0 8px' }}>{meter}</div>}
      <div
        className="game-canvas-wrap"
        onPointerDown={(e) => (swipe.current = [e.clientX, e.clientY])}
        onPointerUp={(e) => {
          if (!swipe.current) return;
          const dx = e.clientX - swipe.current[0];
          const dy = e.clientY - swipe.current[1];
          swipe.current = null;
          if (Math.hypot(dx, dy) < 30) return;
          answer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp');
        }}
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} />
      </div>
      <div className="stack" style={{ padding: '8px 12px calc(12px + env(safe-area-inset-bottom))', gap: 8 }}>
        <div className="row" style={{ justifyContent: 'center' }}>
          {(
            [
              ['ArrowLeft', '⬅️', 'Sol'],
              ['ArrowUp', '⬆️', 'Yukarı'],
              ['ArrowDown', '⬇️', 'Aşağı'],
              ['ArrowRight', '➡️', 'Sağ'],
            ] as const
          ).map(([k, icon, label]) => (
            <button key={k} className="btn" style={{ fontSize: 26, minWidth: 64, minHeight: 60 }} onClick={() => answer(k)} aria-label={label}>
              {icon}
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
