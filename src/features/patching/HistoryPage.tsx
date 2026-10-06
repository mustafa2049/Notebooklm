import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dayKey, formatMinutes } from '../../model/time';
import { usePatchStats } from '../../storage/selectors';
import { useStore } from '../../storage/store';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function HistoryPage() {
  const { byDay, goal, sessions, now } = usePatchStats();
  const { deleteSession } = useStore();
  const [offset, setOffset] = useState(0);

  const base = new Date(now);
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (month.getDay() + 6) % 7; // Pazartesi ile başla
  const todayKey = dayKey(now);

  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
    const key = dayKey(d.getTime());
    const min = byDay.get(key) ?? 0;
    const ratio = Math.min(1, min / goal);
    return { day: i + 1, key, min, ratio };
  });
  const monthTotal = cells.reduce((a, c) => a + c.min, 0);
  const metDays = cells.filter((c) => c.ratio >= 1).length;

  const recent = [...sessions].sort((a, b) => b.start - a.start).slice(0, 30);
  const fmtTime = (t: number) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });

  return (
    <div className="page">
      <div className="row spread">
        <h1>Kapama geçmişi</h1>
        <Link className="btn ghost" to="/timer">
          ← Zamanlayıcı
        </Link>
      </div>

      <div className="card">
        <div className="row spread" style={{ marginBottom: 8 }}>
          <button className="btn ghost" onClick={() => setOffset(offset - 1)} aria-label="Önceki ay">
            ‹
          </button>
          <strong>
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </strong>
          <button className="btn ghost" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Sonraki ay">
            ›
          </button>
        </div>
        <div className="calendar">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cell head">
              {w}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`e${i}`} />
          ))}
          {cells.map((c) => (
            <div
              key={c.key}
              className="cell"
              title={`${c.key}: ${formatMinutes(c.min)}`}
              style={{
                background:
                  c.ratio >= 1
                    ? 'var(--success)'
                    : c.ratio > 0
                      ? `color-mix(in srgb, var(--primary) ${Math.round(20 + c.ratio * 60)}%, var(--surface-2))`
                      : undefined,
                color: c.ratio >= 1 ? '#fff' : undefined,
                outline: c.key === todayKey ? '2px solid var(--text)' : undefined,
              }}
            >
              {c.ratio >= 1 ? '✓' : c.day}
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Bu ay: {formatMinutes(monthTotal)} · Hedef tutturulan gün: {metDays}. Yeşil gün = hedef tamam, mavi tonu =
          kısmen.
        </p>
      </div>

      <h2>Son oturumlar</h2>
      {recent.length === 0 && <p className="muted">Henüz kayıt yok.</p>}
      <div className="stack">
        {recent.map((s) => (
          <div key={s.id} className="card row spread" style={{ margin: 0, padding: '10px 14px' }}>
            <div>
              <div>
                <b>{fmtDate(s.start)}</b> · {fmtTime(s.start)}–{fmtTime(s.end)}
              </div>
              <div className="muted small">{formatMinutes((s.end - s.start) / 60000)}</div>
            </div>
            <button
              className="btn ghost danger"
              aria-label="Sil"
              onClick={() => {
                if (confirm('Bu oturum silinsin mi?')) deleteSession(s.id);
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
