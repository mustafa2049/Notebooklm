import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { dayKey } from '../../model/time';
import type { Compliance, GlassesWear, Symptom } from '../../model/types';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { persistentSymptoms } from '../report/summary';

const SYMPTOMS: Symptom[] = ['none', 'headache', 'double', 'strain', 'squint'];

export default function DiaryPage() {
  const profile = useProfile();
  const { saveDiary } = useStore();
  const { diary } = useProfileResults();
  const today = dayKey(Date.now());
  const existing = diary.find((d) => d.day === today);
  const [symptoms, setSymptoms] = useState<Symptom[]>(existing?.symptoms ?? []);
  const [compliance, setCompliance] = useState<Compliance>(existing?.compliance ?? 'full');
  const [glasses, setGlasses] = useState<GlassesWear>(existing?.glasses ?? 'all');
  const [note, setNote] = useState(existing?.note ?? '');
  const [saved, setSaved] = useState(false);
  const kid = profile.mode === 'child';

  const toggle = (s: Symptom) => {
    setSaved(false);
    if (s === 'none') return setSymptoms(['none']);
    const next = symptoms.filter((x) => x !== 'none');
    setSymptoms(next.includes(s) ? next.filter((x) => x !== s) : [...next, s]);
  };

  const save = () => {
    saveDiary({
      day: today,
      symptoms: symptoms.length ? symptoms : ['none'],
      compliance,
      ...(profile.wearsGlasses ? { glasses } : {}),
      note: note.trim(),
    });
    setSaved(true);
  };

  const recent = [...diary].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14);
  const warn = persistentSymptoms(diary, profile.id, Date.now());

  return (
    <div className="page">
      <div className="row spread">
        <h1>📝 Günlük</h1>
        <Link className="btn ghost" to="/">
          ← Geri
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Her gün kısaca nasıl hissettiğini kaydet. Bu bilgiler doktor raporunda özetlenir.
      </p>

      <div className="card stack">
        <strong>{kid ? 'Bugün gözlerin nasıl?' : 'Bugün herhangi bir belirti var mı?'}</strong>
        <div className="row" style={{ gap: 8 }}>
          {SYMPTOMS.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${symptoms.includes(s) ? 'primary' : ''}`}
              aria-pressed={symptoms.includes(s)}
              onClick={() => toggle(s)}
            >
              {tr.symptom[s]}
            </button>
          ))}
        </div>
        <strong>Bandı bugün önerilen süre kadar taktın mı?</strong>
        <Segmented
          label="Uyum"
          value={compliance}
          onChange={(c) => {
            setCompliance(c);
            setSaved(false);
          }}
          options={(['full', 'partial', 'none'] as Compliance[]).map((c) => ({ value: c, label: tr.compliance[c] }))}
        />
        {profile.wearsGlasses && (
          <>
            <strong>👓 {kid ? 'Bugün gözlüğünü ne kadar taktın?' : 'Gözlüğü bugün ne kadar taktın?'}</strong>
            <Segmented
              label="Gözlük"
              value={glasses}
              onChange={(g) => {
                setGlasses(g);
                setSaved(false);
              }}
              options={(['all', 'most', 'little', 'none'] as GlassesWear[]).map((g) => ({ value: g, label: tr.glassesWear[g] }))}
            />
          </>
        )}
        <label className="field">
          Not (isteğe bağlı)
          <textarea
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            placeholder="Örn. bant cildimi tahriş etti, okulda takamadım…"
          />
        </label>
        <button className="btn primary" onClick={save}>
          {existing ? 'Güncelle' : 'Kaydet'}
        </button>
        {saved && <div className="banner">Kaydedildi ✓</div>}
      </div>

      {warn && (
        <div className="banner warn">
          Son 3 gündür belirti işaretledin. Belirtiler sürerse egzersizlere ara ver ve göz doktoruna danış.
        </div>
      )}

      <h2>Son kayıtlar</h2>
      {recent.length === 0 && <p className="muted">Henüz kayıt yok.</p>}
      <div className="stack">
        {recent.map((d) => (
          <div key={d.id} className="card" style={{ margin: 0, padding: '10px 14px' }}>
            <div className="row spread">
              <b>{new Date(`${d.day}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' })}</b>
              <span className="row" style={{ gap: 6 }}>
                {d.glasses && <span className="badge-pill">👓 {tr.glassesWear[d.glasses]}</span>}
                <span className="badge-pill">{tr.compliance[d.compliance]}</span>
              </span>
            </div>
            <div className="small">{d.symptoms.map((s) => tr.symptom[s]).join(', ')}</div>
            {d.note && <div className="muted small">{d.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
