import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { addDays, formatMinutes, startOfDay } from '../../model/time';
import type { Compliance, Symptom } from '../../model/types';
import { usePatchStats, useProfileResults } from '../../storage/selectors';
import { useProfile } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { toTenths } from '../vision/acuity';
import { buildSummary } from './summary';

const fmtDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const pct = (v: number) => `%${Math.round(v * 100)}`;

export default function ReportPage() {
  const profile = useProfile();
  const { sessions, now } = usePatchStats();
  const { results, gabor, visionTests, diary } = useProfileResults();
  const [weeks, setWeeks] = useState<number>(4);

  const s = useMemo(() => {
    const earliest = Math.min(
      now,
      ...sessions.map((x) => x.start),
      ...results.map((x) => x.at),
      ...gabor.map((x) => x.at),
      ...visionTests.map((x) => x.at),
    );
    const from = weeks === 0 ? earliest : addDays(startOfDay(now), -(weeks * 7 - 1));
    return buildSummary({ profile, sessions, results, gabor, visionTests, diary, from, now });
  }, [profile, sessions, results, gabor, visionTests, diary, now, weeks]);

  const amblyopic = tr.eye[profile.amblyopicEye];

  return (
    <div className="page">
      <div className="row spread no-print">
        <h1>🩺 Doktor raporu</h1>
        <Link className="btn ghost" to="/stats">
          ← Geri
        </Link>
      </div>
      <div className="stack no-print">
        <Segmented
          label="Dönem"
          value={weeks}
          onChange={setWeeks}
          options={[
            { value: 2, label: '2 hafta' },
            { value: 4, label: '4 hafta' },
            { value: 12, label: '12 hafta' },
            { value: 0, label: 'Tümü' },
          ]}
        />
        <button className="btn primary" onClick={() => window.print()}>
          🖨️ Yazdır / PDF olarak kaydet
        </button>
        <p className="muted small" style={{ margin: 0 }}>
          Yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçerek dosya oluşturabilir, kontrolde doktorunuza
          gösterebilir ya da gönderebilirsiniz.
        </p>
      </div>

      <div className="card" data-testid="report">
        <h2 style={{ marginTop: 0 }}>Göz tembelliği tedavi özeti</h2>
        <table className="report-table">
          <tbody>
            <tr>
              <th>Hasta</th>
              <td>{profile.name}</td>
            </tr>
            <tr>
              <th>Tembel göz</th>
              <td>{amblyopic}</td>
            </tr>
            <tr>
              <th>Dönem</th>
              <td>
                {fmtDate(s.from)} – {fmtDate(s.to)} ({s.days} gün)
              </td>
            </tr>
            <tr>
              <th>Plan</th>
              <td>
                Kapama {formatMinutes(profile.dailyGoalMin)}/gün · bantla yakın egzersiz {profile.nearExerciseMin} dk/gün
                {profile.binocularMin > 0 && ` · dikoptik ${profile.binocularMin} dk/gün`}
              </td>
            </tr>
            {profile.doctorNote && (
              <tr>
                <th>Doktor notu</th>
                <td>{profile.doctorNote}</td>
              </tr>
            )}
          </tbody>
        </table>

        <h3>Kapama</h3>
        <p style={{ margin: '4px 0' }}>
          Toplam <b>{formatMinutes(s.totalPatchMin)}</b> · günlük ortalama <b>{formatMinutes(s.avgDailyMin)}</b> · hedefe
          ulaşılan gün oranı <b>{pct(s.adherence)}</b>
        </p>
        <table className="report-table">
          <thead>
            <tr>
              <th>Hafta başı</th>
              <th>Ort. dk/gün</th>
              <th>Hedef tutan gün</th>
            </tr>
          </thead>
          <tbody>
            {s.weeks.map((w) => (
              <tr key={w.start}>
                <td>{fmtDate(w.start)}</td>
                <td>{Math.round(w.avgMin)}</td>
                <td>
                  {w.metDays}/{w.days}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Egzersizler</h3>
        <p style={{ margin: '4px 0' }}>
          Bantla yakın egzersiz <b>{formatMinutes(s.nearMin)}</b> · gözlükle (dikoptik) <b>{formatMinutes(s.binocularMin)}</b>
        </p>
        {s.activities.length > 0 && (
          <table className="report-table">
            <thead>
              <tr>
                <th>Etkinlik</th>
                <th>Oturum</th>
                <th>Süre</th>
              </tr>
            </thead>
            <tbody>
              {s.activities.map((a) => (
                <tr key={a.kind}>
                  <td>{tr.activity[a.kind].name}</td>
                  <td>{a.sessions}</td>
                  <td>{formatMinutes(a.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {s.contrast && (
          <p style={{ margin: '6px 0' }}>
            Dikoptik oyunlarda sağlam göz kontrastı: {pct(s.contrast.first)} → <b>{pct(s.contrast.last)}</b> (iki göz dengesi
            arttıkça yükselir)
          </p>
        )}

        <h3>Ölçümler (ev testleri, yaklaşık)</h3>
        {s.vision.length === 0 && s.gabor.length === 0 && <p className="muted">Bu dönemde ölçüm yok.</p>}
        {s.vision.length > 0 && (
          <table className="report-table">
            <thead>
              <tr>
                <th>Görme keskinliği</th>
                <th>İlk</th>
                <th>Son</th>
                <th>Test</th>
              </tr>
            </thead>
            <tbody>
              {s.vision.map((v) => (
                <tr key={v.eye}>
                  <td>
                    {tr.eye[v.eye]}
                    {v.eye === profile.amblyopicEye ? ' (tembel)' : ''}
                  </td>
                  <td>
                    {toTenths(v.first)} (logMAR {v.first.toFixed(2)})
                  </td>
                  <td>
                    <b>{toTenths(v.last)}</b> (logMAR {v.last.toFixed(2)})
                  </td>
                  <td>{v.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {s.gabor.length > 0 && (
          <table className="report-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Gabor kontrast eşiği</th>
                <th>İlk</th>
                <th>Son</th>
                <th>Seans</th>
              </tr>
            </thead>
            <tbody>
              {s.gabor.map((g) => (
                <tr key={g.cycles}>
                  <td>{g.cycles === 3 ? 'Kaba' : g.cycles === 6 ? 'Orta' : 'İnce'} desen</td>
                  <td>%{(g.first * 100).toFixed(1)}</td>
                  <td>
                    <b>%{(g.last * 100).toFixed(1)}</b>
                  </td>
                  <td>{g.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Günlük</h3>
        <p style={{ margin: '4px 0' }}>
          Belirtiler:{' '}
          {(['headache', 'double', 'strain', 'squint'] as Symptom[]).map((k, i) => (
            <span key={k}>
              {i > 0 && ' · '}
              {tr.symptom[k]} <b>{s.symptoms[k]}</b> gün
            </span>
          ))}
        </p>
        <p style={{ margin: '4px 0' }}>
          Uyum:{' '}
          {(['full', 'partial', 'none'] as Compliance[]).map((k, i) => (
            <span key={k}>
              {i > 0 && ' · '}
              {tr.compliance[k]} <b>{s.compliance[k]}</b>
            </span>
          ))}
        </p>
        {s.notes.length > 0 && (
          <ul className="small" style={{ margin: '4px 0', paddingLeft: 18 }}>
            {s.notes.map((n) => (
              <li key={n.day}>
                {fmtDate(n.day)}: {n.note}
              </li>
            ))}
          </ul>
        )}
        <p className="muted small" style={{ marginBottom: 0 }}>
          Göz Egzersiz uygulamasıyla oluşturuldu ({new Date(now).toLocaleDateString('tr-TR')}). Ev ölçümleri yaklaşık
          değerlerdir; klinik ölçümün yerine geçmez.
        </p>
      </div>
    </div>
  );
}
