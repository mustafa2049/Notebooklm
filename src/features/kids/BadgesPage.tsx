import { CHALLENGE_BONUS } from '../plan/plan';
import { useRewards } from './useRewards';

export default function BadgesPage() {
  const { stars, badges, challenges } = useRewards();

  return (
    <div className="page">
      <h1>Rozetler 🏅</h1>
      <p className="muted">
        Toplam yıldız: <b>⭐ {stars}</b> · Kazanılan rozet: <b>{badges.filter((b) => b.earned).length}</b> / {badges.length}
        {challenges > 0 && ` · ${challenges} sürpriz görev (+${challenges * CHALLENGE_BONUS} ⭐)`}
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
