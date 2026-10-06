import { Navigate, useParams } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { ExerciseKind } from '../../model/types';
import { useProfile, useStore } from '../../storage/store';
import { GameHost } from '../../games/GameHost';
import type { Game } from '../../games/engine';
import { createOddOneOut } from '../../games/monocular/oddOneOut';
import { createCatch } from '../../games/monocular/catchTargets';
import { createConnectDots } from '../../games/monocular/connectDots';
import { createTumblingE, eSizeForLevel } from '../../games/monocular/tumblingE';
import { Stars } from '../../ui/components';
import { starsFor } from '../kids/rewards';

const FACTORIES: Record<ExerciseKind, () => Game> = {
  'odd-one-out': createOddOneOut,
  catch: createCatch,
  dots: createConnectDots,
  'tumbling-e': createTumblingE,
};

export default function ExercisePlay() {
  const { kind } = useParams();
  const profile = useProfile();
  const { runningSince, startTimer, addResult } = useStore();
  if (!kind || !(kind in FACTORIES)) return <Navigate to="/play" replace />;
  const k = kind as ExerciseKind;
  const info = tr.activity[k];
  const covered = profile.amblyopicEye === 'left' ? tr.eye.right : tr.eye.left;
  const kid = profile.mode === 'child';

  return (
    <GameHost
      key={k}
      title={`${info.icon} ${info.name}`}
      theme="light"
      durationSec={kid ? 180 : 300}
      create={FACTORIES[k]}
      intro={
        <>
          <p style={{ margin: 0 }}>{info.desc}</p>
          <div className="banner warn" style={{ textAlign: 'left', color: '#111' }}>
            🏴‍☠️ <b>{covered}</b> bantla kapalı olmalı. Ekranı yaklaşık 30–40 cm uzakta tut.
          </div>
          {!runningSince && (
            <button className="btn" onClick={startTimer}>
              ⏱ Kapama zamanlayıcısını da başlat
            </button>
          )}
        </>
      }
      controls={
        k === 'tumbling-e'
          ? (game) => (
              <div className="row" style={{ justifyContent: 'center', padding: '8px 8px calc(12px + env(safe-area-inset-bottom))' }}>
                {(
                  [
                    ['ArrowLeft', '⬅️'],
                    ['ArrowUp', '⬆️'],
                    ['ArrowDown', '⬇️'],
                    ['ArrowRight', '➡️'],
                  ] as const
                ).map(([key, label]) => (
                  <button key={key} className="btn" style={{ fontSize: 28, minWidth: 64, minHeight: 64 }} onClick={() => game.key?.(key)}>
                    {label}
                  </button>
                ))}
              </div>
            )
          : undefined
      }
      onFinish={(stats, sec) => {
        addResult({ kind: k, durationSec: sec, score: stats.score, level: stats.level, performance: stats.performance });
        return (
          <>
            <Stars count={starsFor(stats.performance, sec)} />
            <p style={{ margin: 0 }}>
              Skor <b>{stats.score}</b> · Seviye <b>{stats.level}</b> · Doğruluk <b>%{Math.round(stats.performance * 100)}</b>
            </p>
            {k === 'tumbling-e' && (
              <p className="small" style={{ margin: 0 }}>
                Görebildiğin en küçük E: yaklaşık {Math.round(eSizeForLevel(stats.level))} piksel. (Klinik ölçüm değildir;
                hep aynı mesafeden ve aynı cihazla oynarsan ilerlemeni karşılaştırabilirsin.)
              </p>
            )}
          </>
        );
      }}
    />
  );
}
