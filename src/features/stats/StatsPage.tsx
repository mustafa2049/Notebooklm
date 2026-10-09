import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { addDays, dayKey, formatMinutes, startOfDay } from '../../model/time';
import type { ActivityKind, Eye } from '../../model/types';
import { toTenths } from '../vision/acuity';
import { usePatchStats, useProfileResults } from '../../storage/selectors';
import { useProfile } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { BarChart, LineChart } from '../../ui/charts';
import { OrientationBars } from '../meridional/MeridionalPage';

const fmtDay = (ts: number) => new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export default function StatsPage() {
  const profile = useProfile();
  const { byDay, goal, today, streak, now } = usePatchStats();
  const { results, gabor, visionTests, stereoTests, orientationTests, contrastTests } = useProfileResults();
  const lastOrientation = [...orientationTests].filter((o) => o.mode === 'test').sort((a, b) => b.at - a.at)[0];
  const [range, setRange] = useState(14);
  const [cycles, setCycles] = useState(6);

  const days = Array.from({ length: range }, (_, i) => addDays(startOfDay(now), i - range + 1));
  const bars = days.map((d) => {
    const v = byDay.get(dayKey(d)) ?? 0;
    return { label: fmtDay(d), value: Math.round(v), tip: `${fmtDay(d)}: ${formatMinutes(v)}` };
  });
  const avg = bars.reduce((a, b) => a + b.value, 0) / range;
  const total = [...byDay.values()].reduce((a, b) => a + b, 0);
  const metDays = bars.filter((b) => b.value >= goal).length;

  const gaborPts = gabor
    .filter((g) => g.cycles === cycles)
    .sort((a, b) => a.at - b.at)
    .map((g) => ({
      label: fmtDay(g.at),
      value: g.threshold,
      tip: `${fmtDay(g.at)} · %${(g.threshold * 100).toFixed(1)} (${g.viewing === 'patch' ? 'bantla' : 'gözlükle'})`,
    }));

  const contrastPts = results
    .filter((r) => r.contrast != null)
    .sort((a, b) => a.at - b.at)
    .map((r) => ({
      label: fmtDay(r.at),
      value: r.contrast!,
      tip: `${fmtDay(r.at)} · ${tr.activity[r.kind].name}: %${Math.round(r.contrast! * 100)}`,
    }));

  const byKind = new Map<ActivityKind, typeof results>();
  results.forEach((r) => byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), r]));

  return (
    <div className="page">
      <h1>İlerleme</h1>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        <Stat label="Bugün" value={formatMinutes(today)} />
        <Stat label={`${range} gün ortalaması`} value={formatMinutes(avg)} />
        <Stat label="Hedef tutturulan gün" value={`${metDays} / ${range}`} />
        <Stat label="Seri" value={`${streak} gün`} />
        <Stat label="Toplam kapama" value={formatMinutes(total)} />
        <Stat label="Sağlam göz kontrastı" value={`%${Math.round(profile.dichopticContrast * 100)}`} />
      </div>

      <div className="card">
        <div className="row spread">
          <strong>Günlük kapama (dakika)</strong>
          <Segmented
            label="Aralık"
            value={range}
            onChange={setRange}
            options={[
              { value: 7, label: '7 gün' },
              { value: 14, label: '14 gün' },
              { value: 30, label: '30 gün' },
            ]}
          />
        </div>
        <BarChart data={bars} goal={goal} ariaLabel="Günlük kapama dakikaları" />
        <Link className="small" to="/history">
          Takvim ve oturum listesi →
        </Link>
      </div>

      <div className="card">
        <div className="row spread">
          <strong>Görme keskinliği (ev testi)</strong>
          <Link className="small" to="/vision">
            Test yap →
          </Link>
        </div>
        {visionTests.length === 0 ? (
          <p className="muted">
            Henüz görme testi yok. <Link to="/vision">İlk testi yap →</Link>
          </p>
        ) : (
          (['left', 'right'] as Eye[]).map((eye) => {
            const pts = visionTests
              .filter((v) => v.eye === eye)
              .sort((a, b) => a.at - b.at)
              .map((v) => ({
                label: fmtDay(v.at),
                value: Math.pow(10, -v.logMAR),
                tip: `${fmtDay(v.at)} · ${toTenths(v.logMAR)} (logMAR ${v.logMAR.toFixed(2)}, ${v.distanceCm} cm)`,
              }));
            if (!pts.length) return null;
            return (
              <div key={eye} style={{ marginTop: 8 }}>
                <div className="small">
                  {tr.eye[eye]} {eye === profile.amblyopicEye ? '(tembel göz)' : '(sağlam göz)'} · son:{' '}
                  <b>{toTenths(-Math.log10(pts[pts.length - 1].value))}</b>
                </div>
                <LineChart
                  points={pts}
                  log
                  min={0.08}
                  max={1.6}
                  format={(v) => `${(v * 10).toFixed(v < 0.1 ? 2 : 1)}/10`}
                  ariaLabel={`${tr.eye[eye]} görme keskinliği zaman içinde`}
                />
              </div>
            );
          })
        )}
        {visionTests.length > 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            Yukarı çıkan çizgi = daha iyi görme. Ev testleri yaklaşıktır; aynı mesafe ve cihazla karşılaştırın.
          </p>
        )}
      </div>

      <div className="card">
        <div className="row spread">
          <strong>3D (stereo) görme</strong>
          <Link className="small" to="/stereo">
            Test yap →
          </Link>
        </div>
        {stereoTests.length === 0 ? (
          <p className="muted">
            Henüz 3D görme testi yok. <Link to="/stereo">İlk testi yap →</Link>
          </p>
        ) : (
          <>
            <LineChart
              points={[...stereoTests]
                .sort((a, b) => a.at - b.at)
                .map((t) => ({
                  label: fmtDay(t.at),
                  // Algılanamadı → grafikte en kötü değer (1000″) olarak gösterilir
                  value: t.arcsec ?? 1000,
                  tip: `${fmtDay(t.at)} · ${t.arcsec === null ? 'algılanamadı' : `${t.arcsec}″`}`,
                }))}
              log
              min={15}
              max={1000}
              format={(v) => `${Math.round(v)}″`}
              ariaLabel="Stereo görme eşiği zaman içinde"
            />
            <p className="muted small" style={{ margin: 0 }}>
              Aşağı inen çizgi = daha ince derinlik farkları görülüyor (daha iyi). Normal ≈ 60″ ve altı.
            </p>
          </>
        )}
      </div>

      <div className="card">
        <div className="row spread">
          <strong>Gabor kontrast eşiği</strong>
          <Segmented
            label="Desen inceliği"
            value={cycles}
            onChange={setCycles}
            options={[
              { value: 3, label: 'Kaba' },
              { value: 6, label: 'Orta' },
              { value: 10, label: 'İnce' },
            ]}
          />
        </div>
        {gaborPts.length ? (
          <>
            <LineChart points={gaborPts} log format={(v) => `%${(v * 100).toFixed(1)}`} ariaLabel="Gabor kontrast eşiği zaman içinde" />
            <p className="muted small" style={{ margin: 0 }}>
              Aşağı inen çizgi = daha soluk desenleri görebiliyorsun (daha iyi).
            </p>
          </>
        ) : (
          <p className="muted">
            Bu incelikte henüz seans yok. <Link to="/play/gabor">Gabor eğitimini dene →</Link>
          </p>
        )}
      </div>

      <div className="card stack" data-testid="contrast-stats">
        <strong>🌗 Kontrast duyarlılığı</strong>
        {contrastTests.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Henüz test yok. <Link to="/contrast">Kontrast testini yap →</Link>
          </p>
        ) : (
          (['left', 'right'] as Eye[]).map((eye) => {
            const pts = contrastTests
              .filter((c) => c.eye === eye)
              .sort((a, b) => a.at - b.at)
              .map((c) => ({ label: fmtDay(c.at), value: c.logCS, tip: `${fmtDay(c.at)} · log CS ${c.logCS.toFixed(2)}` }));
            if (!pts.length) return null;
            return (
              <div key={eye}>
                <div className="small">
                  {tr.eye[eye]} {eye === profile.amblyopicEye ? '(tembel göz)' : '(sağlam göz)'} · son:{' '}
                  <b>{pts[pts.length - 1].value.toFixed(2)}</b>
                </div>
                <LineChart points={pts} min={0} max={2.25} format={(v) => v.toFixed(2)} ariaLabel={`${tr.eye[eye]} kontrast duyarlılığı zaman içinde`} />
              </div>
            );
          })
        )}
        {contrastTests.length > 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            Yukarı çıkan çizgi = daha soluk ayrıntıları görebiliyorsun. Yetişkinlerde ≈1,65 ve üstü normal kabul edilir.
          </p>
        )}
      </div>

      <div className="card stack" data-testid="orientation-stats">
        <strong>📐 Yöne göre kontrast (astigmat)</strong>
        {lastOrientation ? (
          <>
            <OrientationBars t={lastOrientation.thresholds} />
            <p className="muted small" style={{ margin: 0 }}>
              Son ölçüm: {new Date(lastOrientation.at).toLocaleDateString('tr-TR')} · toplam{' '}
              {orientationTests.filter((o) => o.mode === 'test').length} ölçüm,{' '}
              {orientationTests.filter((o) => o.mode === 'train').length} çalışma.{' '}
              <Link to="/play/meridional">Yeniden ölç →</Link>
            </p>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Henüz ölçüm yok. <Link to="/play/meridional">Astigmat yönü testini dene →</Link>
          </p>
        )}
      </div>

      <div className="card">
        <strong>Dikoptik oyunlarda sağlam göz kontrastı</strong>
        {contrastPts.length ? (
          <>
            <LineChart points={contrastPts} min={0} max={1} format={(v) => `%${Math.round(v * 100)}`} ariaLabel="Sağlam göz kontrastı zaman içinde" />
            <p className="muted small" style={{ margin: 0 }}>
              Yukarı çıkan çizgi = iki göz daha dengeli çalışıyor. Hedef %100.
            </p>
          </>
        ) : (
          <p className="muted">Henüz dikoptik oyun oynanmadı.</p>
        )}
      </div>

      <div className="card">
        <strong>Oyunlar</strong>
        {byKind.size === 0 && <p className="muted">Henüz oyun oynanmadı.</p>}
        {byKind.size > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }} className="small">
            <thead>
              <tr style={{ textAlign: 'left' }} className="muted">
                <th>Oyun</th>
                <th>Oturum</th>
                <th>Süre</th>
                <th>En iyi sv.</th>
                <th>Son başarı</th>
              </tr>
            </thead>
            <tbody>
              {[...byKind.entries()].map(([k, rs]) => (
                <tr key={k} style={{ borderTop: '1px solid var(--border)' }}>
                  <td>
                    {tr.activity[k].icon} {tr.activity[k].name}
                  </td>
                  <td>{rs.length}</td>
                  <td>{formatMinutes(rs.reduce((a, r) => a + r.durationSec, 0) / 60)}</td>
                  <td>{Math.max(...rs.map((r) => r.level))}</td>
                  <td>%{Math.round(rs[rs.length - 1].performance * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="row">
        <Link className="btn primary" to="/report">
          🩺 Doktor raporu
        </Link>
        <Link className="btn" to="/diary">
          📝 Günlük
        </Link>
      </div>
      <p className="muted small">
        Ham verileri <Link to="/settings#veri">Ayarlar → Veriler</Link> bölümünden CSV olarak da indirebilirsiniz.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ margin: 0, padding: 12 }}>
      <div className="muted small">{label}</div>
      <div style={{ fontSize: '1.3em', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
