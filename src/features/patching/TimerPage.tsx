import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { formatDuration, formatMinutes } from '../../model/time';
import { requestNotificationPermission } from '../../platform/notifications';
import { usePatchStats } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Modal, ProgressRing } from '../../ui/components';

/** Bu süreden uzun kesintisiz oturumlar için onay iste (bant unutulmuş olabilir). */
const LONG_SESSION_MS = 8 * 3600_000;

export default function TimerPage() {
  const profile = useProfile();
  const { startTimer, stopTimer, cancelTimer, addManualSession } = useStore();
  const { now, today, goal, progress, streak, runningSince } = usePatchStats();
  const [confirmLong, setConfirmLong] = useState(false);
  const [manual, setManual] = useState(false);
  const covered = profile.amblyopicEye === 'left' ? tr.eye.right : tr.eye.left;
  const kid = profile.mode === 'child';

  const start = () => {
    requestNotificationPermission();
    startTimer();
  };
  const stop = () => {
    if (runningSince && now - runningSince > LONG_SESSION_MS) setConfirmLong(true);
    else stopTimer();
  };

  return (
    <div className="page">
      <h1>{kid ? 'Korsan Bandı 🏴‍☠️' : 'Kapama Zamanlayıcısı'}</h1>
      <p className="muted">
        Kapatılacak göz: <b>{covered}</b> · Günlük hedef: <b>{formatMinutes(goal)}</b>
      </p>

      <div className="card" style={{ textAlign: 'center' }}>
        <ProgressRing value={progress} size={240}>
          <div className="big">{formatDuration(today * 60_000)}</div>
          <div className="muted small">bugün · %{Math.min(999, Math.round(progress * 100))}</div>
          {runningSince && <div className="small">bu oturum {formatDuration(now - runningSince)}</div>}
        </ProgressRing>

        <div className="stack" style={{ marginTop: 16 }}>
          {runningSince ? (
            <button className="btn big" onClick={stop}>
              ⏸ Bandı çıkardım
            </button>
          ) : (
            <button className="btn primary big" onClick={start}>
              ▶ Bandı taktım, başlat
            </button>
          )}
          {progress >= 1 && <div className="banner">🎉 Bugünkü hedef tamamlandı!</div>}
          {streak > 0 && (
            <div className="muted">
              🔥 {streak} gündür hedef tamam{kid ? ', harikasın!' : '.'}
            </div>
          )}
        </div>
      </div>

      {runningSince && (
        <div className="card">
          <strong>Bant takılıyken egzersiz yap</strong>
          <p className="muted small" style={{ margin: '4px 0 12px' }}>
            Kapama sırasında yakın mesafede yapılan aktiviteler önerilir. Zamanlayıcı egzersiz sırasında da çalışmaya
            devam eder.
          </p>
          <Link className="btn primary" to="/play#bant">
            🎮 Egzersizlere git
          </Link>
        </div>
      )}

      <div className="row">
        <Link className="btn" to="/history">
          📅 Geçmiş ve takvim
        </Link>
        <button className="btn" onClick={() => setManual(true)}>
          ＋ Elle ekle
        </button>
      </div>
      <p className="muted small">
        Zamanlayıcı başlangıç saatini kaydeder; telefon kilitlense ya da uygulama kapansa bile süre doğru hesaplanır.
      </p>

      {confirmLong && runningSince && (
        <Modal onClose={() => setConfirmLong(false)}>
          <h2 style={{ marginTop: 0 }}>Uzun bir oturum</h2>
          <p>
            Zamanlayıcı {formatDuration(now - runningSince)} süredir çalışıyor. Bandı gerçekten bu kadar süre taktınız mı?
          </p>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                stopTimer();
                setConfirmLong(false);
              }}
            >
              Evet, kaydet
            </button>
            <button
              className="btn"
              onClick={() => {
                setConfirmLong(false);
                setManual(true);
              }}
            >
              Hayır, süreyi elle gir
            </button>
          </div>
        </Modal>
      )}

      {manual && (
        <ManualEntry
          onClose={() => setManual(false)}
          onSave={(s, e) => {
            // Elle girilen süre çalışan zamanlayıcının yerine geçer.
            if (runningSince) cancelTimer();
            addManualSession(s, e);
            setManual(false);
          }}
        />
      )}
    </div>
  );
}

function ManualEntry({ onClose, onSave }: { onClose(): void; onSave(start: number, end: number): void }) {
  const { runningSince } = useStore();
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const [date, setDate] = useState(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
  const [from, setFrom] = useState(runningSince ? `${pad(new Date(runningSince).getHours())}:${pad(new Date(runningSince).getMinutes())}` : '09:00');
  const [to, setTo] = useState('11:00');
  const start = new Date(`${date}T${from}`).getTime();
  let end = new Date(`${date}T${to}`).getTime();
  if (end <= start) end += 24 * 3600_000;
  const valid = Number.isFinite(start) && Number.isFinite(end) && end - start <= 20 * 3600_000;

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Kapama süresini elle ekle</h2>
      <div className="stack">
        <label className="field">
          Tarih
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="row">
          <label className="field" style={{ flex: 1 }}>
            Başlangıç
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Bitiş
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {valid && <div className="muted">Süre: {formatMinutes((end - start) / 60000)}</div>}
        {runningSince && <div className="banner warn small">Çalışan zamanlayıcı kaydedilmeden durdurulacak.</div>}
        <div className="row">
          <button className="btn primary" disabled={!valid} onClick={() => onSave(start, end)}>
            Kaydet
          </button>
          <button className="btn" onClick={onClose}>
            Vazgeç
          </button>
        </div>
      </div>
    </Modal>
  );
}
