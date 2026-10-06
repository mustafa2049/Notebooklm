import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { DichopticKind, ExerciseKind } from '../../model/types';
import { useProfile, useStore } from '../../storage/store';

const EXERCISES: ExerciseKind[] = ['odd-one-out', 'catch', 'dots', 'tumbling-e'];
const DICHOPTIC: DichopticKind[] = ['blocks', 'breakout', 'stars'];

export default function PlayHub() {
  const profile = useProfile();
  const { runningSince } = useStore();
  const loc = useLocation();
  const covered = profile.amblyopicEye === 'left' ? tr.eye.right : tr.eye.left;

  useEffect(() => {
    if (loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView();
  }, [loc.hash]);

  return (
    <div className="page">
      <h1>Egzersizler</h1>

      <h2 id="bant">🏴‍☠️ Bant takılıyken</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        {covered} kapalıyken tembel gözle oynanır. {runningSince ? '⏱ Kapama zamanlayıcısı çalışıyor.' : ''}
      </p>
      <div className="grid">
        {EXERCISES.map((k) => (
          <Link key={k} className="tile" to={`/play/exercise/${k}`}>
            <span className="icon">{tr.activity[k].icon}</span>
            <strong>{tr.activity[k].name}</strong>
            <span className="muted small">{tr.activity[k].desc}</span>
          </Link>
        ))}
      </div>

      <h2 id="gozluk">🥽 Kırmızı-mavi gözlükle (iki göz birlikte)</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Bant takılmaz. Tembel göz tam parlaklıkta, sağlam göz soluk görür; iki gözün birlikte çalışması gerekir. Sağlam
        göz kontrastı şu an <b>%{Math.round(profile.dichopticContrast * 100)}</b> ve başarına göre otomatik ayarlanır.
      </p>
      {!profile.anaglyph.calibrated && (
        <div className="banner warn" style={{ marginBottom: 12 }}>
          Önce gözlüğünü tanıtman gerekiyor. <Link to="/calibrate">Kalibrasyona başla →</Link>
        </div>
      )}
      <div className="grid">
        {DICHOPTIC.map((k) => (
          <Link key={k} className="tile" to={`/play/dichoptic/${k}`}>
            <span className="icon">{tr.activity[k].icon}</span>
            <strong>{tr.activity[k].name}</strong>
            <span className="muted small">{tr.activity[k].desc}</span>
          </Link>
        ))}
        <Link className="tile" to="/calibrate">
          <span className="icon">🎛️</span>
          <strong>Gözlük kalibrasyonu</strong>
          <span className="muted small">
            {profile.anaglyph.calibrated ? 'Kalibrasyon yapıldı. Yeniden ayarlamak için dokun.' : 'Renkleri gözlüğüne göre ayarla.'}
          </span>
        </Link>
      </div>

      <h2 id="gabor">🌀 Algısal öğrenme</h2>
      <div className="grid">
        <Link className="tile" to="/play/gabor">
          <span className="icon">🌀</span>
          <strong>Gabor eğitimi</strong>
          <span className="muted small">
            Soluk çizgili desenlerin yönünü bul. Kontrast duyarlılığını ölçer ve geliştirmeyi hedefler.
          </span>
        </Link>
      </div>

      <p className="muted small" style={{ marginTop: 24 }}>
        Göz yorgunluğuna karşı her 20 dakikada bir 20 saniye uzağa bak. Rahatsızlık hissedersen ara ver.
      </p>
    </div>
  );
}
