import { usePatchStats, useProfileResults } from '../../storage/selectors';
import { computeBadges, starsFor } from './rewards';

export default function BadgesPage() {
  const { sessions, goal, now } = usePatchStats();
  const { results, gabor } = useProfileResults();
  const badges = computeBadges(sessions, results, gabor, goal, now);
  const stars = results.reduce((a, r) => a + starsFor(r.performance, r.durationSec), 0);

  return (
    <div className="page">
      <h1>Rozetler 🏅</h1>
      <p className="muted">
        Toplam yıldız: <b>⭐ {stars}</b> · Kazanılan rozet: <b>{badges.filter((b) => b.earned).length}</b> / {badges.length}
      </p>
      <div className="grid">
        {badges.map((b) => (
          <div key={b.id} className="tile" style={{ opacity: b.earned ? 1 : 0.45, cursor: 'default' }}>
            <span className="icon" style={{ filter: b.earned ? undefined : 'grayscale(1)' }}>
              {b.icon}
            </span>
            <strong>{b.name}</strong>
            <span className="muted small">{b.desc}</span>
            {b.earned && <span className="badge-pill">Kazanıldı ✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
