import { useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeTr } from '../../platform/speechParse';
import { useProfile } from '../../storage/store';
import { ANISO_LIMIT, anisometropia, describeRx, formatRx } from '../rx/rx';
import { DOCTOR_QUESTIONS, GUIDE, type GuideSection } from './guideContent';
import { tr } from '../../i18n/tr';

const textOf = (s: GuideSection) => normalizeTr([s.title, ...s.body.flat()].join(' '));

export default function GuidePage() {
  const profile = useProfile();
  const [q, setQ] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const query = normalizeTr(q).trim();
  const sections = query ? GUIDE.filter((s) => textOf(s).includes(query)) : GUIDE;
  const rx = profile.prescription;

  const copyQuestions = async () => {
    const list = DOCTOR_QUESTIONS.filter((_, i) => checked.size === 0 || checked.has(i));
    const text = `Doktora sorularım:\n${list.map((x) => `• ${x}`).join('\n')}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Doktora sorularım', text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // paylaşım iptal edildi
    }
  };

  return (
    <div className="page stack">
      <div className="row spread">
        <h1>📚 Rehber</h1>
        <Link className="btn ghost" to="/">
          ← Geri
        </Link>
      </div>
      <input type="search" placeholder="Ara: kapama, astigmat, çift görme…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rehberde ara" />

      {!query && rx && (
        <div className="card small stack" style={{ margin: 0, gap: 4 }} data-testid="guide-rx">
          <strong>Senin reçeten</strong>
          {(['right', 'left'] as const).map((e) => (
            <div key={e}>
              <b>{tr.eye[e]}</b>
              {e === profile.amblyopicEye ? ' (tembel)' : ''}: {formatRx(rx[e])} → {describeRx(rx[e])}
            </div>
          ))}
          <div className="muted">
            İki göz arasındaki fark {anisometropia(rx).toFixed(2).replace('.', ',')} D
            {anisometropia(rx) >= ANISO_LIMIT ? ' — belirgin; tembelliğin bir nedeni olabilir.' : ' — küçük.'} Bant{' '}
            {tr.eye[profile.amblyopicEye === 'left' ? 'right' : 'left'].toLowerCase()}e takılır.
          </div>
        </div>
      )}

      {sections.length === 0 && <p className="muted">“{q}” için sonuç yok.</p>}
      {sections.map((s) => (
        <details key={s.id} className="card guide" style={{ margin: 0 }} open={!!query}>
          <summary>
            <span aria-hidden>{s.icon}</span> {s.title}
          </summary>
          {s.body.map((b, i) =>
            typeof b === 'string' ? (
              <p key={i}>{b}</p>
            ) : (
              <ul key={i}>
                {b.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ),
          )}
        </details>
      ))}

      {!query && (
        <div className="card stack" style={{ margin: 0 }} data-testid="doctor-questions">
          <strong>🗒️ Doktora sorulacak sorular</strong>
          <span className="muted small">Kontrolden önce sormak istediklerini işaretle ve telefonuna kaydet ya da paylaş.</span>
          {DOCTOR_QUESTIONS.map((x, i) => (
            <label key={x} className="row small" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => {
                  const n = new Set(checked);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  setChecked(n);
                  setCopied(false);
                }}
              />
              <span>{x}</span>
            </label>
          ))}
          <button className="btn" onClick={copyQuestions}>
            {copied ? '✓ Hazır' : checked.size ? `📋 Seçili ${checked.size} soruyu paylaş` : '📋 Tüm soruları paylaş'}
          </button>
          <Link className="small" to="/report">
            Kontrole doktor raporunu da götür →
          </Link>
        </div>
      )}

      <p className="muted small" style={{ margin: 0 }}>
        Bu rehber genel bilgi içindir ve göz doktorunun önerisinin yerine geçmez. Kaynaklar: PEDIG çalışmaları, Amerikan
        Oftalmoloji Akademisi ambliyopi kılavuzu (2022).
      </p>
    </div>
  );
}
