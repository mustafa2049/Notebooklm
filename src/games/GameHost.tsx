import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '../model/time';
import { sfx, unlockAudio } from '../platform/sound';
import { useWakeLock } from '../platform/wakeLock';
import { useStore } from '../storage/store';
import { runGame, type Game, type GameStats } from './engine';

type Phase = 'intro' | 'playing' | 'paused' | 'done';

export interface GameHostProps {
  title: string;
  /** Başlamadan önce gösterilen açıklama ve uyarılar. */
  intro: ReactNode;
  create(): Game;
  durationSec: number;
  theme: 'light' | 'dark';
  /** Oturum bitince çağrılır; dönen içerik sonuç ekranında gösterilir. */
  onFinish(stats: GameStats, playedSec: number): ReactNode;
  /** Oyun ekranının altında gösterilen kontroller (ör. yön düğmeleri). */
  controls?(game: Game): ReactNode;
}

export function GameHost({ title, intro, create, durationSec, theme, onFinish, controls }: GameHostProps) {
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [game, setGame] = useState<Game>(() => create());
  const [elapsed, setElapsed] = useState(0);
  const [hud, setHud] = useState<GameStats>({ score: 0, level: 1, performance: 0 });
  const [result, setResult] = useState<ReactNode>(null);
  useWakeLock(phase === 'playing');
  const { profile, updateProfile } = useStore();
  const soundOn = profile?.soundOn ?? true;
  const play = () => {
    unlockAudio();
    setPhase('playing');
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    return runGame(canvasRef.current, game, () => phaseRef.current === 'playing');
  }, [game]);

  // Süre sayacı ve HUD güncellemesi
  useEffect(() => {
    if (phase !== 'playing') return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now();
      setElapsed((e) => e + (t - last) / 1000);
      last = t;
      setHud(game.stats());
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, game]);

  useEffect(() => {
    if (phase === 'playing' && elapsed >= durationSec) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  // Sekme gizlenince duraklat
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && phaseRef.current === 'playing') setPhase('paused');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const finish = () => {
    sfx('finish');
    setPhase('done');
    setResult(onFinish(game.stats(), Math.round(elapsed)));
  };

  const restart = () => {
    setGame(create());
    setElapsed(0);
    setResult(null);
    setPhase('playing');
  };

  const remaining = Math.max(0, durationSec - elapsed);

  return (
    <div className={`game-screen ${theme === 'light' ? 'light' : ''}`}>
      <div className="game-hud">
        <button onClick={() => (phase === 'playing' ? setPhase('paused') : nav(-1))} aria-label="Duraklat ya da çık">
          {phase === 'playing' ? '⏸' : '✕'}
        </button>
        <span>Skor {hud.score}</span>
        <span>Sv {hud.level}</span>
        <button
          onClick={() => profile && updateProfile(profile.id, { soundOn: !soundOn })}
          aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
        <span>{formatDuration(remaining * 1000)}</span>
      </div>
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} />
        {phase === 'intro' && (
          <div className="game-overlay">
            <div className="panel">
              <h2 style={{ margin: 0 }}>{title}</h2>
              {intro}
              <button className="btn primary big" onClick={play}>
                Başla
              </button>
              <button className="btn" onClick={() => nav(-1)}>
                Geri
              </button>
            </div>
          </div>
        )}
        {phase === 'paused' && (
          <div className="game-overlay">
            <div className="panel">
              <h2 style={{ margin: 0 }}>Duraklatıldı</h2>
              <p style={{ margin: 0 }}>Gözlerini dinlendirmek için uzağa bakabilirsin.</p>
              <button className="btn primary big" onClick={play}>
                Devam et
              </button>
              <button className="btn" onClick={finish}>
                Bitir ve kaydet
              </button>
            </div>
          </div>
        )}
        {phase === 'done' && (
          <div className="game-overlay">
            <div className="panel">
              <h2 style={{ margin: 0 }}>Bitti! 👏</h2>
              {result}
              <button className="btn primary big" onClick={restart}>
                Tekrar oyna
              </button>
              <button className="btn" onClick={() => nav(-1)}>
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
      {phase === 'playing' && controls?.(game)}
    </div>
  );
}
