import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { formatDuration } from '../../model/time';
import { makePalette } from '../../games/dichoptic/anaglyph';
import { createVideoRenderer, paletteToVec3, type VideoRenderer } from '../../games/dichoptic/videoRenderer';
import { sfx } from '../../platform/sound';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';

/** Bu kadar saniyede bir mola önerilir (20 dakika). */
const BREAK_EVERY = 20 * 60;
/** Kaydedilecek en kısa izleme süresi. */
const MIN_SAVE = 30;
const MAX_WIDTH = 1280;

const canShareScreen = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

export default function VideoPlay() {
  const profile = useProfile();
  const { addResult } = useStore();
  const nav = useNavigate();
  const contrast = profile.dichopticContrast;
  const palette = makePalette(profile.anaglyph, profile.amblyopicEye, contrast);
  const colors = paletteToVec3(profile.anaglyph, profile.amblyopicEye, contrast);

  const [source, setSource] = useState<'file' | 'screen' | null>(null);
  const [mask, setMask] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [watched, setWatched] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<VideoRenderer | null>(null);
  const urlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchedRef = useRef(0);
  const savedRef = useRef(false);
  const optsRef = useRef({ colors, mask });
  optsRef.current = { colors, mask };
  const saveRef = useRef<() => void>(() => {});
  saveRef.current = () => {
    if (savedRef.current || watchedRef.current < MIN_SAVE) return;
    savedRef.current = true;
    const sec = watchedRef.current;
    addResult({ kind: 'video', durationSec: sec, score: Math.round(sec / 60), level: 1, performance: Math.min(1, sec / 1200), contrast });
  };

  useWakeLock(playing);

  // Çizim döngüsü
  useEffect(() => {
    if (!source) return;
    const canvas = canvasRef.current!;
    const renderer = createVideoRenderer(canvas);
    if (!renderer) {
      setError('Bu cihaz WebGL desteklemiyor; dikoptik film modu kullanılamıyor.');
      return;
    }
    rendererRef.current = renderer;
    const t0 = performance.now();
    let raf = 0;
    const frame = () => {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        const scale = Math.min(1, MAX_WIDTH / v.videoWidth);
        const cw = Math.round(v.videoWidth * scale);
        const ch = Math.round(v.videoHeight * scale);
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
        const { colors: c, mask: m } = optsRef.current;
        renderer.render(v, { amb: c.amb, fel: c.fel, mask: m, time: (performance.now() - t0) / 1000 });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [source]);

  // İzlenen süre sayacı (yalnızca video oynarken)
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      watchedRef.current += 1;
      setWatched(watchedRef.current);
      if (watchedRef.current % BREAK_EVERY === 0) {
        videoRef.current?.pause();
        setOnBreak(true);
        sfx('level');
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  // Sayfadan çıkarken kaydet ve kaynakları bırak
  useEffect(
    () => () => {
      saveRef.current();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const startVideo = async () => {
    const v = videoRef.current!;
    try {
      await v.play();
    } catch {
      // Otomatik oynatma engellendi; kullanıcı ▶ ile başlatır.
    }
  };

  const openFile = (file: File | undefined) => {
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    const v = videoRef.current!;
    v.srcObject = null;
    v.muted = false;
    v.src = urlRef.current;
    setSource('file');
    startVideo();
  };

  const shareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', finish);
      const v = videoRef.current!;
      v.muted = true;
      v.srcObject = stream;
      setSource('screen');
      startVideo();
    } catch {
      setError('Ekran paylaşımı başlatılamadı ya da iptal edildi.');
    }
  };

  function finish() {
    videoRef.current?.pause();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    saveRef.current();
    sfx('finish');
    setDone(true);
  }

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) startVideo();
    else v.pause();
  };

  const fullscreen = () => {
    const el = screenRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  if (!profile.anaglyph.calibrated) {
    return (
      <div className="page stack">
        <h1>Önce gözlük ayarı</h1>
        <p>Dikoptik filmden önce kırmızı-mavi gözlüğünü bir kez tanıtman gerekiyor (yaklaşık 1 dakika).</p>
        <Link className="btn primary big" to="/calibrate">
          🥽 Kalibrasyona başla
        </Link>
        <Link className="btn" to="/play">
          Geri
        </Link>
      </div>
    );
  }

  const video = (
    <video
      ref={videoRef}
      playsInline
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={finish}
      onError={() => source === 'file' && setError('Bu video dosyası açılamadı. MP4 (H.264) ya da WebM deneyin.')}
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
    />
  );

  const setup = (
      <div className="page stack">
        <div className="row spread">
          <h1>
            {tr.activity.video.icon} {tr.activity.video.name}
          </h1>
          <Link className="btn ghost" to="/play">
            ← Geri
          </Link>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Kendi videonu ya da filmini kırmızı-mavi gözlükle izle. Görüntü <b>tembel gözüne tam parlaklıkta</b>, sağlam
          gözüne <b>%{Math.round(contrast * 100)}</b> parlaklıkta gösterilir. Böylece beyin tembel gözü kullanmaya
          yönlendirilir. Bu yöntem, araştırmalarda kapamaya yakın sonuç veren dikoptik film tedavilerinden esinlenmiştir.
        </p>
        <div className="field">
          <strong>Tamamlayıcı maske</strong>
          <Segmented
            label="Maske"
            value={mask ? 'on' : 'off'}
            onChange={(v) => setMask(v === 'on')}
            options={[
              { value: 'off', label: 'Kapalı' },
              { value: 'on', label: 'Açık' },
            ]}
          />
          <span className="muted small">
            Açıkken görüntüde yavaşça gezinen lekeleri yalnızca tembel göz görür; sağlam göz o bölgelerde boşluk görür.
          </span>
        </div>
        <label className="btn primary big" style={{ cursor: 'pointer' }}>
          📁 Video dosyası seç
          <input type="file" accept="video/*" hidden onChange={(e) => openFile(e.target.files?.[0])} data-testid="video-file" />
        </label>
        {canShareScreen() && (
          <button className="btn big" onClick={shareScreen}>
            🖥️ Ekran ya da sekme paylaş (bilgisayarda)
          </button>
        )}
        {error && <div className="banner warn">{error}</div>}
        <ul className="muted small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Video cihazında kalır, hiçbir yere yüklenmez.</li>
          <li>Ekran paylaşımıyla YouTube gibi bir sekmeyi izleyebilirsin. Netflix gibi şifreli (DRM) içerikler siyah görünür.</li>
          <li>Bandı çıkar, gözlüğünü tak. Her 20 dakikada bir mola hatırlatması gelir.</li>
          <li>Sağlam göz parlaklığı dikoptik oyunlardaki başarına göre ayarlanır (Ayarlar’dan da değiştirebilirsin).</li>
        </ul>
      </div>
  );

  const player = (
    <div className="game-screen" ref={screenRef}>
      <div className="game-hud">
        <button onClick={finish} aria-label="Bitir">
          ✕
        </button>
        <span>🎬 {formatDuration(watched * 1000)}</span>
        <span>Sağlam göz %{Math.round(contrast * 100)}</span>
        <button onClick={() => setMask(!mask)} aria-label="Maskeyi aç/kapat">
          {mask ? '◐ Maske' : '○ Maske'}
        </button>
      </div>
      <div className="game-canvas-wrap" style={{ display: 'grid', placeItems: 'center', padding: 8 }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'static',
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
            border: `6px solid ${palette.both}`,
            borderRadius: 8,
            background: '#000',
          }}
          onClick={toggle}
        />
        {error && (
          <div className="game-overlay">
            <div className="panel">
              <p>{error}</p>
              <button className="btn" onClick={() => nav('/play')}>
                Geri
              </button>
            </div>
          </div>
        )}
        {onBreak && !done && (
          <div className="game-overlay">
            <div className="panel">
              <h2 style={{ margin: 0 }}>Mola zamanı 👀</h2>
              <p style={{ margin: 0 }}>20 dakikadır izliyorsun. Gözlüğü çıkar, 20 saniye uzağa bak, gözlerini kırp.</p>
              <button
                className="btn primary big"
                onClick={() => {
                  setOnBreak(false);
                  startVideo();
                }}
              >
                Devam et
              </button>
              <button className="btn" onClick={finish}>
                Bitir
              </button>
            </div>
          </div>
        )}
        {done && (
          <div className="game-overlay">
            <div className="panel">
              <h2 style={{ margin: 0 }}>İzleme bitti 🎬</h2>
              <p style={{ margin: 0 }}>
                Dikoptik izleme süresi: <b>{formatDuration(watched * 1000)}</b>
              </p>
              {watched < MIN_SAVE && <p className="small">30 saniyeden kısa izlemeler kaydedilmez.</p>}
              <button className="btn primary big" onClick={() => nav('/play')}>
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
      {!done && (
        <div className="row" style={{ justifyContent: 'center', gap: 12, padding: '8px 8px calc(12px + env(safe-area-inset-bottom))' }}>
          <button className="btn" style={{ minWidth: 72, minHeight: 56, fontSize: 22 }} onClick={toggle} aria-label={playing ? 'Duraklat' : 'Oynat'}>
            {playing ? '❚❚' : '▶'}
          </button>
          {source === 'file' && (
            <button className="btn" style={{ minWidth: 72, minHeight: 56, fontSize: 22 }} onClick={fullscreen} aria-label="Tam ekran">
              ⛶
            </button>
          )}
          <button className="btn" style={{ minHeight: 56 }} onClick={finish}>
            Bitir ve kaydet
          </button>
        </div>
      )}
    </div>
  );

  // Video öğesi aynı konumda kalır; kaynak seçilince yeniden oluşturulmaz.
  return (
    <>
      {video}
      {source ? player : setup}
    </>
  );
}
