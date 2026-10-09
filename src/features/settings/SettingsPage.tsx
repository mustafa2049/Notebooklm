import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { dayKey } from '../../model/time';
import { exportCsv, exportJson, importJson } from '../../storage/export';
import { useProfile, useStore } from '../../storage/store';
import { DisclaimerText, Segmented } from '../../ui/components';
import { CameraCalibration, PatchCheckPreview } from '../../ui/DistanceMeter';
import { shareOrDownloadFile } from '../../platform/share';
import { RxForm } from '../rx/RxForm';
import { NotificationSettings } from './NotificationSettings';

export default function SettingsPage() {
  const profile = useProfile();
  const [unlocked, setUnlocked] = useState(false);
  if (profile.mode === 'child' && profile.parentPin && !unlocked) {
    return <PinGate pin={profile.parentPin} onUnlock={() => setUnlocked(true)} />;
  }
  return <Settings />;
}

export function PinGate({ pin, onUnlock }: { pin: string; onUnlock(): void }) {
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

      <h2 id="recete">Gözlük reçetesi</h2>
      <div className="card stack">
        <Segmented
          label="Gözlük kullanımı"
          value={profile.wearsGlasses ? 'on' : 'off'}
          onChange={(v) => up({ wearsGlasses: v === 'on', ...(v === 'off' ? { rxSkipped: true } : {}) })}
          options={[
            { value: 'on', label: '👓 Gözlük kullanıyorum' },
            { value: 'off', label: 'Gözlük yok' },
          ]}
        />
        <p className="muted small" style={{ margin: 0 }}>
          Açıksa egzersizlerden önce gözlüğü takmanız hatırlatılır ve günlükte gözlük takma süresi sorulur.
        </p>
        <RxForm
          initial={profile.prescription}
          amblyopicEye={profile.amblyopicEye}
          onSave={(prescription) => up({ prescription, wearsGlasses: true })}
        />
      </div>

      <h2 id="plan">Tedavi planı</h2>
      <div className="card stack">
        <p className="muted small" style={{ margin: 0 }}>
          Doktorunuzun önerisine göre doldurun. Ana sayfadaki “Bugünkü plan” ve doktor raporu bu bilgileri kullanır.
        </p>
        <label className="field">
          Bantla yakın egzersiz (dakika/gün, 0 = gösterme)
          <input
            type="number"
            min={0}
            max={240}
            step={5}
            value={profile.nearExerciseMin}
            onChange={(e) => up({ nearExerciseMin: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })}
          />
        </label>
        <label className="field">
          Gözlükle (dikoptik) oyun / okuma / film (dakika/gün, 0 = gösterme)
          <input
            type="number"
            min={0}
            max={240}
            step={5}
            value={profile.binocularMin}
            onChange={(e) => up({ binocularMin: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })}
          />
        </label>
        <label className="field">
          Evde görme testi sıklığı (gün, 0 = hatırlatma)
          <input
            type="number"
            min={0}
            max={90}
            value={profile.visionTestEveryDays}
            onChange={(e) => up({ visionTestEveryDays: Math.max(0, Math.min(90, Number(e.target.value) || 0)) })}
          />
        </label>
        <label className="field">
          Sonraki kontrol tarihi
          <input type="date" value={profile.nextVisit ?? ''} onChange={(e) => up({ nextVisit: e.target.value || undefined })} />
        </label>
        <label className="field">
          Doktorun önerisi / notlar
          <textarea
            rows={3}
            value={profile.doctorNote}
            onChange={(e) => up({ doctorNote: e.target.value })}
            placeholder="Örn. Sağ göz günde 2 saat kapatılacak, 3 ay sonra kontrol."
          />
        </label>
        <div className="row">
          <Link className="btn" to="/report">
            🩺 Doktor raporu
          </Link>
          <Link className="btn" to="/vision">
            💳 Ekran ölçeği / görme testi
          </Link>
        </div>
      </div>

      <h2 id="kamera">Kamera: mesafe ve bant kontrolü</h2>
      <div className="card stack">
        <p className="muted small" style={{ margin: 0 }}>
          Ön kamera yüzünü ve gözlerinin irisini algılayarak ekrana uzaklığını tahmin eder. Görüntü yalnızca bu cihazda işlenir;
          kaydedilmez ve hiçbir yere gönderilmez. Görme ve 3D testlerinde mesafeyi kontrol etmek için de kullanılır.
        </p>
        <Segmented
          label="Yakınlık uyarısı"
          value={profile.proximityWarn ? 'on' : 'off'}
          onChange={(v) => up({ proximityWarn: v === 'on' })}
          options={[
            { value: 'off', label: 'Uyarı kapalı' },
            { value: 'on', label: '📏 Oyunlarda yakınlık uyarısı' },
          ]}
        />
        <span className="muted small">
          Açıkken oyun sırasında yüzün ekrana 25 cm'den fazla yaklaşırsa oyun bekler ve “biraz uzaklaş” uyarısı çıkar.
        </span>
        <CameraCalibration />
        {profile.cameraFocalPx && <span className="muted small">Kamera kalibre edildi ✓</span>}
      </div>
      <div className="card stack">
        <strong>🏴‍☠️ Bant kontrolü</strong>
        <Segmented
          label="Bant kontrolü"
          value={profile.patchCheck ? 'on' : 'off'}
          onChange={(v) => up({ patchCheck: v === 'on' })}
          options={[
            { value: 'off', label: 'Kapalı' },
            { value: 'on', label: '📷 Bantlı oyunlarda kontrol et' },
          ]}
        />
        <span className="muted small">
          Açıkken bantla oynanan oyunlarda ön kamera iki göz bölgesini karşılaştırır. Sağlam göz birkaç saniye açık görünürse oyun
          durur ve “bandı kontrol et” uyarısı çıkar. Görüntü yalnızca bu cihazda işlenir, kaydedilmez.
        </span>
        <div className="field">
          <strong>Hassasiyet</strong>
          <Segmented
            label="Hassasiyet"
            value={profile.patchCheckLevel}
            onChange={(patchCheckLevel) => up({ patchCheckLevel })}
            options={[
              { value: 'low', label: 'Düşük' },
              { value: 'medium', label: 'Orta' },
              { value: 'high', label: 'Yüksek' },
            ]}
          />
        </div>
        <PatchCheckPreview />
      </div>

      <h2>Ses</h2>
      <div className="card stack">
        <Segmented
          label="Oyun sesleri"
          value={profile.soundOn ? 'on' : 'off'}
          onChange={(v) => up({ soundOn: v === 'on' })}
          options={[
            { value: 'on', label: '🔊 Sesler açık' },
            { value: 'off', label: '🔇 Sesler kapalı' },
          ]}
        />
        <span className="muted small">Doğru, yanlış ve seviye atlama anlarında kısa sesler çalar.</span>
      </div>

      <h2 id="bildirimler">Bildirimler</h2>
      <NotificationSettings profile={profile} />

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
          verilerini silmeden önce yedek alın. Telefonda “Yedek al / paylaş” paylaşma menüsünü açar: Google Drive, WhatsApp ya
          da e-postaya kaydedebilirsiniz. Yeni cihazda ilk açılışta “Yedekten geri yükle” ile verilerinizi taşıyabilirsiniz.
        </p>
        <div className="muted small">
          Son yedek:{' '}
          {profile.lastBackupAt ? new Date(profile.lastBackupAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'hiç alınmadı'}
        </div>
        <div className="row">
          <button className="btn" onClick={() => shareOrDownloadFile(`goz-egzersiz-${profile.name}-${stamp}.csv`, exportCsv(data, profile.id), 'text/csv', 'Göz Egzersiz verileri')}>
            📄 Doktor için CSV
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              const r = await shareOrDownloadFile(`goz-egzersiz-yedek-${stamp}.json`, exportJson(data), 'application/json', 'Göz Egzersiz yedeği');
              if (r !== 'cancelled') {
                up({ lastBackupAt: Date.now() });
                setMsg(r === 'shared' ? 'Yedek paylaşıldı ✓' : 'Yedek dosyası indirildi ✓');
              }
            }}
          >
            💾 Yedek al / paylaş
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
        <Link className="btn" to="/setup">
          🧭 Kurulum sihirbazını aç
        </Link>
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
