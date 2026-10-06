import { Link, Navigate, useParams } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { DichopticKind } from '../../model/types';
import { useProfile, useStore } from '../../storage/store';
import { GameHost } from '../../games/GameHost';
import type { Game } from '../../games/engine';
import { adaptContrast, makePalette, type DichopticPalette } from '../../games/dichoptic/anaglyph';
import { createBlocks } from '../../games/dichoptic/blocks';
import { createBreakout } from '../../games/dichoptic/breakout';
import { createStars } from '../../games/dichoptic/stars';
import { createSnake } from '../../games/dichoptic/snake';
import { Stars } from '../../ui/components';
import { starsFor } from '../kids/rewards';

const FACTORIES: Record<DichopticKind, (p: DichopticPalette) => Game> = {
  blocks: createBlocks,
  breakout: createBreakout,
  stars: createStars,
  snake: createSnake,
};

const CONTROLS: Partial<Record<DichopticKind, readonly (readonly [string, string])[]>> = {
  blocks: [
    ['ArrowLeft', '◀'],
    ['ArrowUp', '⟳'],
    ['ArrowDown', '▼'],
    [' ', '⤓'],
    ['ArrowRight', '▶'],
  ],
  snake: [
    ['ArrowLeft', '◀'],
    ['ArrowUp', '▲'],
    ['ArrowDown', '▼'],
    ['ArrowRight', '▶'],
  ],
};

export default function DichopticPlay() {
  const { kind } = useParams();
  const profile = useProfile();
  const { updateProfile, addResult } = useStore();
  const contrast = profile.dichopticContrast;
  // Kontrast oturum boyunca sabit kalır; uyarlanan değer "Tekrar oyna" ile başlayan oyunda kullanılır.
  const palette = makePalette(profile.anaglyph, profile.amblyopicEye, contrast);

  if (!kind || !(kind in FACTORIES)) return <Navigate to="/play" replace />;
  const k = kind as DichopticKind;
  const info = tr.activity[k];
  const kid = profile.mode === 'child';

  if (!profile.anaglyph.calibrated) {
    return (
      <div className="page stack">
        <h1>Önce gözlük ayarı</h1>
        <p>Dikoptik oyunlardan önce kırmızı-mavi gözlüğünü bir kez tanıtman gerekiyor (yaklaşık 1 dakika).</p>
        <Link className="btn primary big" to="/calibrate">
          🥽 Kalibrasyona başla
        </Link>
        <Link className="btn" to="/play">
          Geri
        </Link>
      </div>
    );
  }

  return (
    <GameHost
      key={k}
      title={`${info.icon} ${info.name}`}
      theme="dark"
      durationSec={kid ? 300 : 600}
      create={() => FACTORIES[k](palette)}
      intro={
        <>
          <p style={{ margin: 0 }}>{info.desc}</p>
          <div className="banner" style={{ textAlign: 'left', color: '#eee', background: '#222' }}>
            🥽 Kırmızı-mavi gözlüğünü tak, <b>bandı çıkar</b>; iki gözün de açık olmalı. Sağlam göz kontrastı:{' '}
            <b>%{Math.round(contrast * 100)}</b>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
            <span>
              <span style={{ color: palette.amb, fontSize: 28 }}>●</span> tembel göz
            </span>
            <span>
              <span style={{ color: palette.fel, fontSize: 28 }}>■</span> sağlam göz
            </span>
          </div>
          <p className="small" style={{ margin: 0, color: '#aaa' }}>
            Çift görme, baş ağrısı ya da göz yorgunluğu olursa dur ve dinlen.
          </p>
        </>
      }
      controls={
        CONTROLS[k]
          ? (game) => (
              <div className="row" style={{ justifyContent: 'center', padding: '6px 8px calc(10px + env(safe-area-inset-bottom))', gap: 8 }}>
                {CONTROLS[k]!.map(([key, label]) => (
                  <button
                    key={key}
                    className="btn"
                    style={{ fontSize: 24, minWidth: 56, minHeight: 56, background: '#222', color: '#bbb', border: '1px solid #444' }}
                    onClick={() => game.key?.(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )
          : undefined
      }
      onFinish={(stats, sec) => {
        const next = adaptContrast(contrast, stats.performance, sec);
        addResult({ kind: k, durationSec: sec, score: stats.score, level: stats.level, performance: stats.performance, contrast });
        if (next !== contrast) updateProfile(profile.id, { dichopticContrast: next });
        return (
          <>
            <Stars count={starsFor(stats.performance, sec)} />
            <p style={{ margin: 0 }}>
              Skor <b>{stats.score}</b> · Seviye <b>{stats.level}</b> · Başarı <b>%{Math.round(stats.performance * 100)}</b>
            </p>
            <p className="small" style={{ margin: 0 }}>
              {next > contrast
                ? `Harika! Sağlam göz kontrastı %${Math.round(contrast * 100)} → %${Math.round(next * 100)} yükseltildi.`
                : next < contrast
                  ? `Sağlam göz kontrastı %${Math.round(contrast * 100)} → %${Math.round(next * 100)} düşürüldü; bir sonraki oyun biraz daha kolay olacak.`
                  : `Sağlam göz kontrastı %${Math.round(contrast * 100)} olarak kalıyor.`}
            </p>
          </>
        );
      }}
    />
  );
}
