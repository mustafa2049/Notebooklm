import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { dayKey, formatDuration, formatMinutes } from '../../model/time';
import { usePatchStats, useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { ProgressRing } from '../../ui/components';
import { useRewards } from '../kids/useRewards';
import { activityMinutes, activityPath, CHALLENGE_BONUS, challengeDone, dailyChallenge, daysUntil, visionTestDue } from '../plan/plan';
import { persistentSymptoms } from '../report/summary';
import { weeklyComparison, weeklyMessage, type Metric } from '../report/weekly';
import { setupProgress, setupSteps, showSetupCard } from '../setup/setup';

function Trend({ m, fmt, testid }: { m: Metric; fmt(v: number): string; testid?: string }) {
  if (m.trend == null || m.delta == null) return null;
  const arrow = m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '＝';
  return (
    <span className={`small trend ${m.trend}`} data-testid={testid}>
      {arrow} {m.trend === 'same' ? 'aynı' : fmt(Math.abs(m.delta))}
    </span>
  );
}

const pct = (v: number) => `%${Math.round(v * 100)}`;

function PlanRow({ label, value, target, to }: { label: string; value: number; target: number; to: string }) {
  const done = value >= target;
  return (
    <Link to={to} style={{ color: 'inherit', textDecoration: 'none' }} className="stack" aria-label={label}>
      <div className="row spread small" style={{ gap: 4 }}>
        <span>
          {done ? '✅' : '⬜'} {label}
        </span>
        <span className="muted">
          {formatMinutes(value)} / {formatMinutes(target)}
        </span>
      </div>
      <div className={`progress ${done ? 'done' : ''}`} style={{ marginTop: -6 }}>
        <div style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
      </div>
    </Link>
  );
}

export default function Home() {
  const profile = useProfile();
  const { data, startTimer, stopTimer, updateProfile } = useStore();
  const { sessions, today, goal, progress, streak, runningSince, now } = usePatchStats();
  const { results, gabor, visionTests, stereoTests, diary } = useProfileResults();
  const { stars, badges } = useRewards();
  const kid = profile.mode === 'child';
  const todayKey = dayKey(now);
  const mins = activityMinutes(results, todayKey);
  const visionDue = visionTestDue(profile, visionTests, now);
  const visit = daysUntil(profile.nextVisit, now);
  const loggedToday = diary.some((d) => d.day === todayKey);
  const symptomWarn = persistentSymptoms(diary, profile.id, now);
  const challenge = dailyChallenge(todayKey, profile.id, profile.anaglyph.calibrated);
  const challengeOk = challengeDone(challenge, results, todayKey);
  const earned = badges.filter((b) => b.earned).length;
  const WEEK = 7 * 24 * 3600_000;
  const backupDue = profile.lastBackupAt ? now - profile.lastBackupAt > 2 * WEEK : now - profile.createdAt > WEEK;

  const planItems = [
    { label: 'Kapama', value: today, target: goal, to: '/timer' },
    ...(profile.nearExerciseMin > 0 ? [{ label: 'Bantla yakın egzersiz', value: mins.near, target: profile.nearExerciseMin, to: '/play#bant' }] : []),
    ...(profile.binocularMin > 0 ? [{ label: 'Gözlükle iki göz', value: mins.binocular, target: profile.binocularMin, to: '/play#gozluk' }] : []),
  ];
  const allDone = planItems.every((p) => p.value >= p.target) && !visionDue;

  const steps = setupSteps(profile, visionTests);
  const setup = setupProgress(steps);
  const nextStep = steps.find((x) => !x.done);
  // Haftalık özet dakikada bir yeniden hesaplanır.
  const minute = Math.floor(now / 60_000);
  const week = useMemo(
    () =>
      weeklyComparison({
        profile,
        // Çalışan zamanlayıcı da bu haftaya sayılır.
        sessions: runningSince ? [...sessions, { id: 'run', profileId: profile.id, start: runningSince, end: now }] : sessions,
        results,
        gabor,
        visionTests,
        stereoTests,
        diary,
        now,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, sessions, runningSince, results, gabor, visionTests, stereoTests, diary, minute],
  );

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
        <Link to="/badges" className="badge-pill" style={{ fontSize: '1em', textDecoration: 'none' }}>
          ⭐ {stars} · 🏅 {earned}
        </Link>
      </div>

      {showSetupCard(profile, steps) && (
        <div className="card stack" data-testid="setup-card" style={{ gap: 8 }}>
          <div className="row spread">
            <strong>
              🧭 Kurulum {setup.done}/{setup.total}
            </strong>
            <button className="btn ghost small" style={{ minHeight: 0, padding: '2px 6px' }} onClick={() => updateProfile(profile.id, { setupDismissed: true })}>
              Gizle
            </button>
          </div>
          <div className="progress">
            <div style={{ width: `${(setup.done / setup.total) * 100}%` }} />
          </div>
          {nextStep && (
            <div className="small">
              Sıradaki: {nextStep.icon} {nextStep.title}
            </div>
          )}
          <Link className="btn primary" to="/setup">
            Kuruluma devam et
          </Link>
        </div>
      )}

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

      <div className="card stack" style={{ gap: 12 }}>
        <div className="row spread">
          <strong>{kid ? 'Bugünkü görevler 🗺️' : 'Bugünkü plan'}</strong>
          {visit !== null && visit >= 0 && (
            <span className="badge-pill">🩺 {visit === 0 ? 'Kontrol bugün' : `Kontrole ${visit} gün`}</span>
          )}
        </div>
        {planItems.map((p) => (
          <PlanRow key={p.label} {...p} />
        ))}
        {visionDue && (
          <Link to="/vision" className="row small" style={{ color: 'inherit', textDecoration: 'none', gap: 8 }}>
            <span>⬜</span>
            <span>
              Görme testi zamanı <span className="muted">(her {profile.visionTestEveryDays} günde bir)</span>
            </span>
          </Link>
        )}
        {allDone && <div className="banner">🎉 {kid ? 'Bugünün tüm görevleri tamam, kaptan!' : 'Bugünkü plan tamamlandı.'}</div>}
      </div>

      <Link to="/stats" className="card stack" data-testid="weekly-card" style={{ color: 'inherit', textDecoration: 'none', gap: 10 }}>
        <div className="row spread">
          <strong>📅 {kid ? 'Bu haftam' : 'Bu hafta'}</strong>
          <span className="muted small">{week.hasPrev ? 'geçen haftaya göre' : `${week.days} gün`}</span>
        </div>
        <div className="trend-grid">
          <div>
            <div className="muted small">Kapama / gün</div>
            <div className="val">{formatMinutes(week.patchAvg.value)}</div>
            <Trend m={week.patchAvg} fmt={(v) => formatMinutes(v)} testid="trend-patch" />
          </div>
          <div>
            <div className="muted small">Hedef tutan gün</div>
            <div className="val">
              {week.metDays}/{week.days}
            </div>
            <Trend m={week.adherence} fmt={pct} />
          </div>
          <div>
            <div className="muted small">Oyun / gün</div>
            <div className="val">{formatMinutes(week.activityAvg.value)}</div>
            <Trend m={week.activityAvg} fmt={(v) => formatMinutes(v)} />
          </div>
          {week.glassesRate && (
            <div>
              <div className="muted small">👓 Gözlük</div>
              <div className="val">{pct(week.glassesRate.value)}</div>
              <Trend m={week.glassesRate} fmt={pct} />
            </div>
          )}
        </div>
        <div className="small" data-testid="weekly-msg">
          {weeklyMessage(week, profile.mode)}
        </div>
      </Link>

      <Link to={activityPath(challenge.kind)} className="card row" style={{ color: 'inherit', textDecoration: 'none', gap: 14, flexWrap: 'nowrap' }}>
        <span style={{ fontSize: '2.2em' }}>{challengeOk ? '🎁' : tr.activity[challenge.kind].icon}</span>
        <div>
          <strong>Günün sürprizi</strong>
          <div className="small">
            {challengeOk
              ? `Tamamlandı! +${CHALLENGE_BONUS} ⭐ kazandın.`
              : `${tr.activity[challenge.kind].name} oyununda en az ${challenge.stars} yıldız al, +${CHALLENGE_BONUS} ⭐ kazan.`}
          </div>
        </div>
      </Link>

      {!loggedToday && (
        <Link to="/diary" className="card row" style={{ color: 'inherit', textDecoration: 'none', gap: 14, flexWrap: 'nowrap' }}>
          <span style={{ fontSize: '2em' }}>📝</span>
          <div>
            <strong>{kid ? 'Bugün gözlerin nasıl?' : 'Bugün nasılsın?'}</strong>
            <div className="muted small">
              Belirtileri, bant uyumunu{profile.wearsGlasses ? ' ve gözlük takma süresini' : ''} 10 saniyede kaydet.
            </div>
          </div>
        </Link>
      )}
      {backupDue && (
        <Link to="/settings#veri" className="banner warn" style={{ display: 'block', color: 'inherit', textDecoration: 'none', marginTop: 12 }}>
          💾 {profile.lastBackupAt ? 'Son yedeğin üzerinden 2 haftadan fazla geçti.' : 'Henüz yedek almadın.'} Telefon değişirse
          verilerin kaybolmasın diye yedek al →
        </Link>
      )}
      {symptomWarn && (
        <div className="banner warn">Son 3 gündür belirti kaydettin. Sürerse egzersizlere ara ver ve göz doktoruna danış.</div>
      )}

      <div className="grid" style={{ marginTop: 12 }}>
        <Link className="tile" to="/play#bant">
          <span className="icon">🔍</span>
          <strong>Bantla egzersiz</strong>
          <span className="muted small">Tembel gözle yakın görme oyunları</span>
        </Link>
        <Link className="tile" to="/play#gozluk">
          <span className="icon">🥽</span>
          <strong>Gözlükle oyunlar</strong>
          <span className="muted small">Oyun, okuma ve film</span>
        </Link>
        <Link className="tile" to="/vision">
          <span className="icon">👁️</span>
          <strong>Görme testi</strong>
          <span className="muted small">Her göz için evde ölçüm</span>
        </Link>
        <Link className="tile" to="/stereo">
          <span className="icon">🧊</span>
          <strong>3D görme testi</strong>
          <span className="muted small">Derinlik algısını ölç</span>
        </Link>
        <Link className="tile" to="/play/gabor">
          <span className="icon">🌀</span>
          <strong>Gabor eğitimi</strong>
          <span className="muted small">Kontrast duyarlılığı</span>
        </Link>
        <Link className="tile" to="/diary">
          <span className="icon">📝</span>
          <strong>Günlük</strong>
          <span className="muted small">Belirti ve uyum kaydı</span>
        </Link>
        <Link className="tile" to="/report">
          <span className="icon">🩺</span>
          <strong>Doktor raporu</strong>
          <span className="muted small">Yazdır ya da PDF al</span>
        </Link>
      </div>
    </div>
  );
}
