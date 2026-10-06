import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { formatDuration } from '../../model/time';
import { makePalette } from '../../games/dichoptic/anaglyph';
import { sfx } from '../../platform/sound';
import { useWakeLock } from '../../platform/wakeLock';
import { useProfile, useStore } from '../../storage/store';
import { READING_TEXTS, splitDichoptic } from './texts';

export default function ReadingPage() {
  const profile = useProfile();
  const { addResult } = useStore();
  const nav = useNavigate();
  const [choice, setChoice] = useState(0);
  const [custom, setCustom] = useState('');
  const [fontSize, setFontSize] = useState(profile.mode === 'child' ? 30 : 24);
  const [phase, setPhase] = useState<'setup' | 'reading' | 'done'>('setup');
  const [seconds, setSeconds] = useState(0);
  const savedRef = useRef(false);
  const contrast = profile.dichopticContrast;
  const palette = makePalette(profile.anaglyph, profile.amblyopicEye, contrast);
  useWakeLock(phase === 'reading');

  const text = choice === -1 ? custom : READING_TEXTS[choice].text;
  const words = useMemo(() => splitDichoptic(text), [text]);

  useEffect(() => {
    if (phase !== 'reading') return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const finish = () => {
    setPhase('done');
    sfx('finish');
    if (savedRef.current || seconds < 15) return;
    savedRef.current = true;
    addResult({
      kind: 'reading',
      durationSec: seconds,
      score: words.length,
      level: Math.round(fontSize),
      performance: Math.min(1, seconds / 120),
      contrast,
    });
  };

  if (!profile.anaglyph.calibrated) {
    return (
      <div className="page stack">
        <h1>Önce gözlük ayarı</h1>
        <p>Dikoptik okumadan önce kırmızı-mavi gözlüğünü bir kez tanıtman gerekiyor (yaklaşık 1 dakika).</p>
        <Link className="btn primary big" to="/calibrate">
          🥽 Kalibrasyona başla
        </Link>
        <Link className="btn" to="/play">
          Geri
        </Link>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="page stack">
        <div className="row spread">
          <h1>
            {tr.activity.reading.icon} {tr.activity.reading.name}
          </h1>
          <Link className="btn ghost" to="/play">
            ← Geri
          </Link>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Kırmızı-mavi gözlüğünü tak, bandı çıkar. Kelimelerin yarısı yalnızca tembel gözüne, yarısı yalnızca sağlam gözüne
          (%{Math.round(contrast * 100)} parlaklıkta) gösterilir. Metni akıcı okuyabiliyorsan iki gözün birlikte çalışıyor
          demektir. Bir göz kelimeleri “kaybediyorsa” yavaşla ve o kelimelere odaklan.
        </p>
        <label className="field">
          Metin
          <select value={choice} onChange={(e) => setChoice(Number(e.target.value))}>
            {READING_TEXTS.map((t, i) => (
              <option key={t.title} value={i}>
                {t.title}
              </option>
            ))}
            <option value={-1}>Kendi metnim…</option>
          </select>
        </label>
        {choice === -1 && (
          <label className="field">
            Okumak istediğin metni yapıştır
            <textarea rows={6} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Bir kitap sayfası, haber ya da ders notu…" />
          </label>
        )}
        <label className="field">
          Yazı boyutu: {fontSize} px
          <input type="range" min={16} max={44} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
        </label>
        <button
          className="btn primary big"
          disabled={words.length < 5}
          onClick={() => {
            savedRef.current = false;
            setSeconds(0);
            setPhase('reading');
          }}
        >
          Okumaya başla
        </button>
      </div>
    );
  }

  const wpm = seconds > 0 ? Math.round((words.length / seconds) * 60) : 0;
  return (
    <div className="game-screen" style={{ overflow: 'hidden' }}>
      <div className="game-hud">
        <button onClick={() => (phase === 'reading' ? finish() : nav('/play'))} aria-label="Bitir">
          ✕
        </button>
        <span>📖 {formatDuration(seconds * 1000)}</span>
        <span>{words.length} kelime</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        <div
          data-testid="reading-text"
          style={{
            border: `5px solid ${palette.both}`,
            borderRadius: 12,
            padding: '18px 16px',
            maxWidth: 760,
            margin: '0 auto',
            fontSize,
            lineHeight: 1.7,
            fontWeight: 600,
            letterSpacing: '0.02em',
            userSelect: 'text',
          }}
        >
          {words.map((w, i) => (
            <span key={i} style={{ color: w.eye === 0 ? palette.amb : palette.fel }}>
              {w.word}{' '}
            </span>
          ))}
        </div>
      </div>
      {phase === 'reading' ? (
        <div className="row" style={{ justifyContent: 'center', padding: '8px 8px calc(12px + env(safe-area-inset-bottom))' }}>
          <button className="btn primary" style={{ minHeight: 56, minWidth: 180 }} onClick={finish}>
            ✓ Bitirdim
          </button>
        </div>
      ) : (
        <div className="game-overlay">
          <div className="panel">
            <h2 style={{ margin: 0 }}>Okuma bitti 📖</h2>
            <p style={{ margin: 0 }}>
              {words.length} kelimeyi {formatDuration(seconds * 1000)} sürede okudun: dakikada yaklaşık <b>{wpm}</b> kelime.
            </p>
            {seconds < 15 && <p className="small">15 saniyeden kısa okumalar kaydedilmez.</p>}
            <p className="small" style={{ margin: 0 }}>
              Okuma hızın zamanla arttıkça iki gözün daha iyi birlikte çalıştığını gösterebilir.
            </p>
            <button className="btn primary big" onClick={() => setPhase('setup')}>
              Başka metin
            </button>
            <button className="btn" onClick={() => nav('/play')}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
