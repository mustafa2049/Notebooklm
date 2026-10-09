import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { addDays, formatMinutes, startOfDay } from '../../model/time';
import type { Compliance, GlassesWear, Symptom } from '../../model/types';
import { shareOrCopyLink } from '../../platform/share';
import { isCapacitor } from '../../platform/native';
import { usePatchStats, useProfileResults } from '../../storage/selectors';
import { useProfile } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { RxSummary } from '../rx/RxForm';
import { formatArcsec } from '../stereo/StereoPage';
import { directionName } from '../meridional/meridional';
import { toTenths } from '../vision/acuity';
import { decodeReport, encodeReport, reportUrl, type SharedReport } from './share';
import { buildSummary } from './summary';

const fmtDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const pct = (v: number) => `%${Math.round(v * 100)}`;

export default function ReportPage() {
  const profile = useProfile();
  const { sessions, now } = usePatchStats();
  const { results, gabor, visionTests, stereoTests, orientationTests, diary } = useProfileResults();
  const [weeks, setWeeks] = useState<number>(4);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const report = useMemo<SharedReport>(() => {
    const earliest = Math.min(
      now,
      ...sessions.map((x) => x.start),
      ...results.map((x) => x.at),
      ...gabor.map((x) => x.at),
      ...visionTests.map((x) => x.at),
      ...stereoTests.map((x) => x.at),
      ...orientationTests.map((x) => x.at),
    );
    const from = weeks === 0 ? earliest : addDays(startOfDay(now), -(weeks * 7 - 1));
    return {
      v: 1,
      name: profile.name,
      amblyopicEye: profile.amblyopicEye,
      dailyGoalMin: profile.dailyGoalMin,
      nearExerciseMin: profile.nearExerciseMin,
      binocularMin: profile.binocularMin,
      doctorNote: profile.doctorNote,
      ...(profile.prescription ? { prescription: profile.prescription } : {}),
      wearsGlasses: profile.wearsGlasses,
      generatedAt: now,
      summary: buildSummary({ profile, sessions, results, gabor, visionTests, stereoTests, orientationTests, diary, from, now }),
    };
    // Rapor dakikada bir yenilenir (zamanlayıcı çalışırken her saniye değil)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, sessions, results, gabor, visionTests, stereoTests, orientationTests, diary, Math.floor(now / 60_000), weeks]);

  const shareLink = async () => {
    const url = reportUrl(await encodeReport(report));
    const r = await shareOrCopyLink(url, `${profile.name} – göz tedavisi raporu`);
    setLinkMsg(
      r === 'shared'
        ? 'Bağlantı paylaşıldı ✓'
        : r === 'copied'
          ? 'Bağlantı panoya kopyalandı ✓ — doktorunuza mesajla gönderebilirsiniz.'
          : r === 'cancelled'
            ? null
            : url,
    );
  };

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
        <div className="row">
          {/* Android uygulamasının WebView'i yazdırmayı desteklemez; orada bağlantı paylaşımı kullanılır. */}
          {!isCapacitor() && (
            <button className="btn primary" onClick={() => window.print()}>
              🖨️ Yazdır / PDF
            </button>
          )}
          <button className="btn" onClick={shareLink}>
            🔗 Bağlantı ile paylaş
          </button>
        </div>
        {linkMsg && (
          <div className="banner small" style={{ wordBreak: 'break-all' }} data-testid="link-msg">
            {linkMsg}
          </div>
        )}
        <p className="muted small" style={{ margin: 0 }}>
          “Yazdır / PDF” ile dosya oluşturabilirsiniz. “Bağlantı ile paylaş” raporun özetini bağlantının içine yazar: veri
          hiçbir sunucuya yüklenmez, bağlantıyı açan kişi yalnızca bu özeti görür.
        </p>
      </div>
      <ReportView r={report} />
    </div>
  );
}

/** Salt okunur rapor görünümü (yerel rapor ve paylaşılan bağlantı için ortak). */
export function ReportView({ r }: { r: SharedReport }) {
  const s = r.summary;
  return (
    <div className="card" data-testid="report">
      <h2 style={{ marginTop: 0 }}>Göz tembelliği tedavi özeti</h2>
      <table className="report-table">
        <tbody>
          <tr>
            <th>Hasta</th>
            <td>{r.name}</td>
          </tr>
          <tr>
            <th>Tembel göz</th>
            <td>{tr.eye[r.amblyopicEye]}</td>
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
              Kapama {formatMinutes(r.dailyGoalMin)}/gün · bantla yakın egzersiz {r.nearExerciseMin} dk/gün
              {r.binocularMin > 0 && ` · dikoptik ${r.binocularMin} dk/gün`}
            </td>
          </tr>
          {r.prescription && (
            <tr>
              <th>Gözlük reçetesi</th>
              <td>
                <RxSummary rx={r.prescription} amblyopicEye={r.amblyopicEye} />
                {r.prescription.date && <span className="muted small">Reçete tarihi: {fmtDate(r.prescription.date)}</span>}
              </td>
            </tr>
          )}
          {r.doctorNote && (
            <tr>
              <th>Doktor notu</th>
              <td>{r.doctorNote}</td>
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
      {s.vision.length === 0 && s.gabor.length === 0 && !s.stereo && !s.orientation?.length && <p className="muted">Bu dönemde ölçüm yok.</p>}
      {s.stereo && (
        <p style={{ margin: '6px 0' }}>
          3D (stereo) görme eşiği: {formatArcsec(s.stereo.first)} → <b>{formatArcsec(s.stereo.last)}</b> ({s.stereo.n} test; küçük
          değer daha iyi, normal ≈ 60″ ve altı)
        </p>
      )}
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
                  {v.eye === r.amblyopicEye ? ' (tembel)' : ''}
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

      {s.orientation?.length > 0 && (
        <table className="report-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Yöne göre kontrast eşiği (tembel göz)</th>
              <th>İlk</th>
              <th>Son</th>
              <th>Test</th>
            </tr>
          </thead>
          <tbody>
            {s.orientation.map((o) => (
              <tr key={o.deg}>
                <td>
                  {directionName(o.deg)} çizgiler ({o.deg}°)
                </td>
                <td>%{(o.first * 100).toFixed(1)}</td>
                <td>
                  <b>%{(o.last * 100).toFixed(1)}</b>
                </td>
                <td>{o.n}</td>
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
      {s.glasses && s.glasses.rate != null && (
        <p style={{ margin: '4px 0' }}>
          👓 Gözlük takma: {(['all', 'most', 'little', 'none'] as GlassesWear[]).map((k, i) => (
            <span key={k}>
              {i > 0 && ' · '}
              {tr.glassesWear[k]} <b>{s.glasses[k]}</b>
            </span>
          ))}{' '}
          — günün çoğunda takılan gün oranı <b>{pct(s.glasses.rate)}</b>
        </p>
      )}
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
        Göz Egzersiz uygulamasıyla oluşturuldu ({new Date(r.generatedAt).toLocaleDateString('tr-TR')}). Ev ölçümleri yaklaşık
        değerlerdir; klinik ölçümün yerine geçmez.
      </p>
    </div>
  );
}

/** Doktorun açtığı paylaşılan rapor bağlantısı: `#/shared/<veri>`. Profil gerektirmez. */
export function SharedReportPage() {
  const { data } = useParams();
  const [r, setR] = useState<SharedReport | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!data) return;
    decodeReport(data).then(setR, () => setErr(true));
  }, [data]);
  return (
    <div className="page">
      <div className="row spread no-print">
        <h1>🩺 Paylaşılan rapor</h1>
        <button className="btn" onClick={() => window.print()}>
          🖨️ Yazdır
        </button>
      </div>
      {err && <div className="banner warn">Bu bağlantı açılamadı. Bağlantının eksiksiz kopyalandığından emin olun.</div>}
      {!r && !err && <p className="muted">Yükleniyor…</p>}
      {r && <ReportView r={r} />}
      <p className="muted small no-print">
        Bu rapor bir hastanın Göz Egzersiz uygulamasından paylaşıldı. Veriler bağlantının içinde taşınır; hiçbir sunucuda saklanmaz.
      </p>
    </div>
  );
}
