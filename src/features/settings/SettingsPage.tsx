import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { dayKey } from '../../model/time';
import { isIos, isStandalone, notificationsSupported, notify, requestNotificationPermission } from '../../platform/notifications';
import { buildIcs } from '../../platform/reminders';
import { downloadText, exportCsv, exportJson, importJson } from '../../storage/export';
import { useProfile, useStore } from '../../storage/store';
import { DisclaimerText, Segmented } from '../../ui/components';

export default function SettingsPage() {
  const profile = useProfile();
  const [unlocked, setUnlocked] = useState(false);
  if (profile.mode === 'child' && profile.parentPin && !unlocked) {
    return <PinGate pin={profile.parentPin} onUnlock={() => setUnlocked(true)} />;
  }
  return <Settings />;
}

function PinGate({ pin, onUnlock }: { pin: string; onUnlock(): void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="page stack">
      <h1>🔒 Ebeveyn şifresi</h1>
      <p className="muted">Ayarları değiştirmek için ebeveyn şifresini girin.</p>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setErr(false);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (v === pin ? onUnlock() : setErr(true))}
      />
      {err && <div style={{ color: 'var(--danger)' }}>Şifre yanlış.</div>}
      <button className="btn primary" onClick={() => (v === pin ? onUnlock() : setErr(true))}>
        Aç
      </button>
    </div>
  );
}

function Settings() {
  const profile = useProfile();
  const { data, updateProfile, deleteProfile, setActiveProfile, replaceAll } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [perm, setPerm] = useState(notificationsSupported() ? Notification.permission : 'unsupported');
  const [newTime, setNewTime] = useState('18:00');
  const [pinDraft, setPinDraft] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const up = (patch: Parameters<typeof updateProfile>[1]) => updateProfile(profile.id, patch);

  useEffect(() => {
    if (loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView();
  }, [loc.hash]);

  const stamp = dayKey(Date.now());

  return (
    <div className="page">
      <h1>Ayarlar</h1>

      <h2>Profil</h2>
      <div className="card stack">
        <label className="field">
          Ad
          <input type="text" value={profile.name} onChange={(e) => up({ name: e.target.value })} />
        </label>
        <div className="field">
          <strong>Mod</strong>
          <Segmented
            label="Mod"
            value={profile.mode}
            onChange={(mode) => up({ mode })}
            options={[
              { value: 'adult', label: '🧑 Yetişkin' },
              { value: 'child', label: '🧒 Çocuk' },
            ]}
          />
        </div>
        <div className="field">
          <strong>Tembel göz</strong>
          <Segmented
            label="Tembel göz"
            value={profile.amblyopicEye}
            onChange={(amblyopicEye) => up({ amblyopicEye })}
            options={[
              { value: 'left', label: tr.eye.left },
              { value: 'right', label: tr.eye.right },
            ]}
          />
        </div>
        <label className="field">
          Günlük kapama hedefi (dakika)
          <input
            type="number"
            min={10}
            max={720}
            step={10}
            value={profile.dailyGoalMin}
            onChange={(e) => up({ dailyGoalMin: Math.max(10, Math.min(720, Number(e.target.value) || 10)) })}
          />
        </label>
      </div>

      <h2>Hatırlatıcılar</h2>
      <div className="card stack">
        <div className="row">
          {profile.reminderTimes.map((t) => (
            <span key={t} className="badge-pill" style={{ fontSize: '0.95em' }}>
              ⏰ {t}{' '}
              <button
                className="btn ghost"
                style={{ minHeight: 24, padding: '0 4px' }}
                aria-label={`${t} hatırlatıcısını sil`}
                onClick={() => up({ reminderTimes: profile.reminderTimes.filter((x) => x !== t) })}
              >
                ✕
              </button>
            </span>
          ))}
          {profile.reminderTimes.length === 0 && <span className="muted">Hatırlatıcı yok.</span>}
        </div>
        <div className="row">
          <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
          <button
            className="btn"
            onClick={() => newTime && !profile.reminderTimes.includes(newTime) && up({ reminderTimes: [...profile.reminderTimes, newTime].sort() })}
          >
            ＋ Ekle
          </button>
        </div>
        <div className="row">
          {perm !== 'granted' && perm !== 'unsupported' && (
            <button className="btn" onClick={async () => setPerm(await requestNotificationPermission())}>
              🔔 Bildirimlere izin ver
            </button>
          )}
          {perm === 'granted' && (
            <button className="btn" onClick={() => notify('Deneme bildirimi', 'Bildirimler çalışıyor 👍', 'test')}>
              🔔 Bildirimi dene
            </button>
          )}
          <button
            className="btn primary"
            disabled={profile.reminderTimes.length === 0}
            onClick={() => downloadText(`goz-kapama-hatirlatici.ics`, buildIcs(profile), 'text/calendar')}
          >
            📅 Telefon takvimine ekle
          </button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Uygulama içi bildirimler uygulama açıkken çalışır{isIos() && !isStandalone() ? ' (iPhone’da önce “Ana Ekrana Ekle” gerekir)' : ''}.
          Uygulama kapalıyken de hatırlatılmak için <b>“Telefon takvimine ekle”</b> ile her gün tekrar eden alarmlı bir
          etkinlik oluşturun.
        </p>
      </div>

      {profile.mode === 'child' && (
        <>
          <h2>Ebeveyn şifresi</h2>
          <div className="card stack">
            <p className="muted small" style={{ margin: 0 }}>
              Çocuğun ayarları değiştirmemesi için 4 haneli bir şifre belirleyin.
              {profile.parentPin ? ' Şifre şu an etkin.' : ''}
            </p>
            <div className="row">
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="Yeni şifre"
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
              />
              <button
                className="btn"
                disabled={pinDraft.length < 4}
                onClick={() => {
                  up({ parentPin: pinDraft });
                  setPinDraft('');
                  setMsg('Şifre kaydedildi.');
                }}
              >
                Kaydet
              </button>
              {profile.parentPin && (
                <button className="btn danger" onClick={() => up({ parentPin: undefined })}>
                  Şifreyi kaldır
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <h2>Dikoptik oyunlar</h2>
      <div className="card stack">
        <div className="row spread">
          <span>
            Gözlük: <b>{profile.anaglyph.calibrated ? 'kalibre edildi' : 'kalibre edilmedi'}</b>
          </span>
          <Link className="btn" to="/calibrate">
            🎛️ Kalibrasyon
          </Link>
        </div>
        <label className="field">
          Sağlam göz kontrastı: %{Math.round(profile.dichopticContrast * 100)}
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(profile.dichopticContrast * 100)}
            onChange={(e) => up({ dichopticContrast: Number(e.target.value) / 100 })}
          />
        </label>
        <p className="muted small" style={{ margin: 0 }}>
          Normalde oyunlar bu değeri başarına göre kendisi ayarlar. Oyunda sağlam göze giden öğeleri hiç göremiyorsan
          artır; tembel göze giden öğeler kayboluyorsa azalt.
        </p>
      </div>

      <h2 id="profiller">Profiller</h2>
      <div className="card stack">
        {data.profiles.map((p) => (
          <div key={p.id} className="row spread">
            <span>
              {p.mode === 'child' ? '🧒' : '🧑'} {p.name} {p.id === profile.id && <span className="badge-pill">aktif</span>}
            </span>
            <div className="row" style={{ gap: 6 }}>
              {p.id !== profile.id && (
                <button className="btn" onClick={() => setActiveProfile(p.id)}>
                  Geç
                </button>
              )}
              <button
                className="btn ghost danger"
                aria-label={`${p.name} profilini sil`}
                onClick={() => {
                  if (confirm(`"${p.name}" profili ve tüm verileri silinsin mi? Bu işlem geri alınamaz.`)) deleteProfile(p.id);
                }}
              >
                🗑
              </button>
            </div>
          </div>
        ))}
        <button className="btn" onClick={() => nav('/new-profile')}>
          ＋ Yeni profil
        </button>
      </div>

      <h2 id="veri">Veriler</h2>
      <div className="card stack">
        <p className="muted small" style={{ margin: 0 }}>
          Tüm veriler yalnızca bu cihazda saklanır; hiçbir sunucuya gönderilmez. Telefon değiştirirken ya da tarayıcı
          verilerini silmeden önce yedek alın.
        </p>
        <div className="row">
          <button className="btn" onClick={() => downloadText(`goz-egzersiz-${profile.name}-${stamp}.csv`, exportCsv(data, profile.id), 'text/csv')}>
            📄 Doktor için CSV
          </button>
          <button className="btn" onClick={() => downloadText(`goz-egzersiz-yedek-${stamp}.json`, exportJson(data), 'application/json')}>
            💾 Yedek al (JSON)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📂 Yedekten geri yükle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const d = importJson(await f.text());
                if (confirm('Mevcut tüm verilerin yerine yedekteki veriler yüklensin mi?')) {
                  replaceAll(d);
                  setMsg('Yedek geri yüklendi.');
                }
              } catch {
                setMsg('Dosya okunamadı. Geçerli bir yedek dosyası seçin.');
              }
            }}
          />
        </div>
        {msg && <div className="banner">{msg}</div>}
      </div>

      <h2>Kurulum</h2>
      <div className="card small stack">
        <div>
          <b>Android (Chrome):</b> menü ⋮ → “Ana ekrana ekle” / “Uygulamayı yükle”.
        </div>
        <div>
          <b>iPhone (Safari):</b> Paylaş ⬆️ → “Ana Ekrana Ekle”.
        </div>
        <div>
          <b>Bilgisayar (Chrome/Edge):</b> adres çubuğundaki yükle simgesi ⊕ → “Yükle”.
        </div>
        <div className="muted">Kurulduktan sonra internet olmadan da çalışır.</div>
      </div>

      <h2>{tr.disclaimer.title}</h2>
      <div className="card small">
        <DisclaimerText />
      </div>
    </div>
  );
}
