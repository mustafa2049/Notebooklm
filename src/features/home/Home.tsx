import { Link } from 'react-router-dom';
import { dayKey, formatDuration, formatMinutes } from '../../model/time';
import { BINOCULAR_KINDS } from '../../model/types';
import { usePatchStats, useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { ProgressRing } from '../../ui/components';
import { computeBadges, starsFor } from '../kids/rewards';

export default function Home() {
  const profile = useProfile();
  const { data, startTimer, stopTimer } = useStore();
  const { today, goal, progress, streak, runningSince, now, sessions } = usePatchStats();
  const { results, gabor } = useProfileResults();
  const kid = profile.mode === 'child';
  const todayKey = dayKey(now);
  const todays = results.filter((r) => dayKey(r.at) === todayKey);
  const totalStars = results.reduce((a, r) => a + starsFor(r.performance, r.durationSec), 0);
  const badges = computeBadges(sessions, results, gabor, goal, now);
  const earned = badges.filter((b) => b.earned);

  const tasks = [
    { done: progress >= 1, text: `Bant: ${formatMinutes(today)} / ${formatMinutes(goal)}`, to: '/timer' },
    { done: todays.some((r) => !BINOCULAR_KINDS.has(r.kind)), text: 'Bantla 1 egzersiz oyna', to: '/play#bant' },
    { done: todays.some((r) => BINOCULAR_KINDS.has(r.kind)), text: 'Gözlükle 1 oyun oyna', to: '/play#gozluk' },
  ];

  const hour = new Date(now).getHours();
  const greet = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  return (
    <div className="page">
      <div className="row spread">
        <div>
          <h1>
            {greet}, {profile.name}
            {kid ? ' 🏴‍☠️' : ''}
          </h1>
          {data.profiles.length > 1 && (
            <Link className="small" to="/settings#profiller">
              Profil değiştir
            </Link>
          )}
        </div>
        {kid && (
          <Link to="/badges" className="badge-pill" style={{ fontSize: '1em', textDecoration: 'none' }}>
            ⭐ {totalStars} · 🏅 {earned.length}
          </Link>
        )}
      </div>

      <div className="card row" style={{ gap: 20, flexWrap: 'nowrap' }}>
        <ProgressRing value={progress} size={120} stroke={12}>
          <div style={{ fontWeight: 700 }}>%{Math.min(999, Math.round(progress * 100))}</div>
        </ProgressRing>
        <div className="stack" style={{ gap: 8, flex: 1 }}>
          <div>
            <div className="muted small">Bugünkü kapama</div>
            <div style={{ fontSize: '1.4em', fontWeight: 700 }}>
              {runningSince ? formatDuration(today * 60_000) : formatMinutes(today)}
            </div>
          </div>
          {runningSince ? (
            <button className="btn" onClick={stopTimer}>
              ⏸ Bandı çıkardım
            </button>
          ) : (
            <button className="btn primary" onClick={startTimer}>
              ▶ Bandı taktım
            </button>
          )}
          {streak > 0 && <div className="small">🔥 {streak} günlük seri</div>}
        </div>
      </div>

      <div className="card">
        <strong>{kid ? 'Bugünkü görevler 🗺️' : 'Bugün'}</strong>
        <div className="stack" style={{ gap: 6, marginTop: 8 }}>
          {tasks.map((t) => (
            <Link key={t.text} to={t.to} className="row" style={{ color: 'inherit', textDecoration: 'none', gap: 10 }}>
              <span style={{ fontSize: '1.3em' }}>{t.done ? '✅' : '⬜'}</span>
              <span style={{ textDecoration: t.done ? 'line-through' : undefined }}>{t.text}</span>
            </Link>
          ))}
        </div>
        {kid && tasks.every((t) => t.done) && <div className="banner" style={{ marginTop: 10 }}>🎉 Bugünün tüm görevleri tamam, kaptan!</div>}
      </div>

      <div className="grid">
        <Link className="tile" to="/play#bant">
          <span className="icon">🔍</span>
          <strong>Bantla egzersiz</strong>
          <span className="muted small">Tembel gözle yakın görme oyunları</span>
        </Link>
        <Link className="tile" to="/play#gozluk">
          <span className="icon">🥽</span>
          <strong>Gözlükle oyunlar</strong>
          <span className="muted small">İki gözü birlikte çalıştır</span>
        </Link>
        <Link className="tile" to="/play/gabor">
          <span className="icon">🌀</span>
          <strong>Gabor eğitimi</strong>
          <span className="muted small">Kontrast duyarlılığını izle</span>
        </Link>
        <Link className="tile" to="/stats">
          <span className="icon">📈</span>
          <strong>İlerleme</strong>
          <span className="muted small">Grafikler ve geçmiş</span>
        </Link>
      </div>
    </div>
  );
}
