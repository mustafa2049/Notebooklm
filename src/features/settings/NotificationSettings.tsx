import { useEffect, useState } from 'react';
import type { Profile } from '../../model/types';
import { isCapacitor } from '../../platform/native';
import {
  exactAlarmAllowed,
  nativePermission,
  openExactAlarmSetting,
  requestNativePermission,
  type NativePermission,
} from '../../platform/nativeNotifications';
import { isIos, isStandalone, notificationsSupported, notify, requestNotificationPermission } from '../../platform/notifications';
import { planNotifications } from '../../platform/notifyPlan';
import { buildIcs } from '../../platform/reminders';
import { shareOrDownloadFile } from '../../platform/share';
import { useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';

const fmtWhen = (t: number) =>
  new Date(t).toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Ayarlar → Bildirimler: hatırlatma saatleri, bildirim türleri, izinler ve sıradaki bildirimler. */
export function NotificationSettings({ profile }: { profile: Profile }) {
  const { data, updateProfile } = useStore();
  const up = (patch: Partial<Profile>) => updateProfile(profile.id, patch);
  const native = isCapacitor();
  const [newTime, setNewTime] = useState('18:00');
  const [perm, setPerm] = useState<NativePermission | NotificationPermission>(
    native ? 'prompt' : notificationsSupported() ? Notification.permission : 'unsupported',
  );
  const [exact, setExact] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!native) return;
    nativePermission().then(setPerm);
    exactAlarmAllowed().then(setExact);
  }, [native]);

  const askPermission = async () => setPerm(native ? await requestNativePermission() : await requestNotificationPermission());

  const test = async () => {
    if (native) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{ id: 1, title: 'Deneme bildirimi', body: 'Bildirimler çalışıyor 👍', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }],
      });
      setMsg('5 saniye içinde bir deneme bildirimi gelecek. Uygulamayı kapatıp bekleyebilirsin.');
      // Deneme bildirimi plan eşitlemesinde silinmesin diye plan hemen yenilenmez.
    } else {
      notify('Deneme bildirimi', 'Bildirimler çalışıyor 👍', 'test');
    }
  };

  const upcoming = planNotifications(data, Date.now()).filter((n) => n.profileId === profile.id).slice(0, 4);
  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange(v: boolean): void }) => (
    <div className="toggle-row">
      <span className="small">{label}</span>
      <Segmented
        label={label}
        value={value ? 'on' : 'off'}
        onChange={(v) => onChange(v === 'on')}
        options={[
          { value: 'on', label: 'Açık' },
          { value: 'off', label: 'Kapalı' },
        ]}
      />
    </div>
  );

  return (
    <div className="card stack" data-testid="notification-settings">
      <strong>⏰ Kapama hatırlatma saatleri</strong>
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
        <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="Yeni hatırlatma saati" />
        <button
          className="btn"
          onClick={() => newTime && !profile.reminderTimes.includes(newTime) && up({ reminderTimes: [...profile.reminderTimes, newTime].sort() })}
        >
          ＋ Ekle
        </button>
      </div>
      <span className="muted small">O gün hedef dolduysa ya da bant zaten takılıysa hatırlatma gelmez.</span>

      <strong>🔔 Diğer bildirimler</strong>
      <Toggle label="🎉 Hedef dolunca “bandı çıkarabilirsin”" value={profile.notifyGoal} onChange={(notifyGoal) => up({ notifyGoal })} />
      <Toggle label="⏱ Hedeften 1 saat sonra bant hâlâ takılıysa" value={profile.notifyForgot} onChange={(notifyForgot) => up({ notifyForgot })} />
      <Toggle label="👁️ Görme testi günü" value={profile.notifyVision} onChange={(notifyVision) => up({ notifyVision })} />
      <Toggle label="🩺 Kontrol randevusu (bir gün önce ve aynı gün)" value={profile.notifyVisit} onChange={(notifyVisit) => up({ notifyVisit })} />
      <Toggle
        label="📝 Günlük hatırlatması"
        value={!!profile.notifyDiaryTime}
        onChange={(on) => up({ notifyDiaryTime: on ? '20:30' : null })}
      />
      {profile.notifyDiaryTime && (
        <label className="toggle-row small">
          Günlük hatırlatma saati
          <input
            type="time"
            style={{ width: 'auto' }}
            value={profile.notifyDiaryTime}
            onChange={(e) => e.target.value && up({ notifyDiaryTime: e.target.value })}
          />
        </label>
      )}

      <div className="row">
        {(perm === 'default' || perm === 'prompt') && (
          <button className="btn primary" onClick={askPermission}>
            🔔 Bildirimlere izin ver
          </button>
        )}
        {perm === 'granted' && (
          <button className="btn" onClick={test}>
            🔔 Bildirimi dene
          </button>
        )}
        {!native && (
          <button
            className="btn"
            disabled={profile.reminderTimes.length === 0}
            onClick={() => shareOrDownloadFile('goz-kapama-hatirlatici.ics', buildIcs(profile), 'text/calendar', 'Göz kapama hatırlatıcısı')}
          >
            📅 Telefon takvimine ekle
          </button>
        )}
      </div>
      {perm === 'denied' && (
        <div className="banner warn small">Bildirim izni kapalı. Telefonun Ayarlar → Uygulamalar → Göz Egzersiz → Bildirimler bölümünden açabilirsin.</div>
      )}
      {native && perm === 'granted' && !exact && (
        <div className="banner warn small">
          Tam saatli alarm izni kapalı; bildirimler birkaç dakika geç gelebilir.{' '}
          <button className="btn ghost small" style={{ minHeight: 0, padding: 0 }} onClick={() => openExactAlarmSetting().then(() => exactAlarmAllowed().then(setExact))}>
            İzni aç →
          </button>
        </div>
      )}
      {msg && <div className="banner small">{msg}</div>}
      <p className="muted small" style={{ margin: 0 }}>
        {native
          ? 'Bildirimler uygulama kapalıyken de gelir. Telefon yeniden başlasa bile kurulu kalır.'
          : `Tarayıcı sürümünde bildirimler uygulama açıkken çalışır${isIos() && !isStandalone() ? ' (iPhone’da önce “Ana Ekrana Ekle” gerekir)' : ''}. Uygulama kapalıyken de hatırlatılmak için “Telefon takvimine ekle”yi kullanın ya da Android uygulamasını kurun.`}
      </p>
      {upcoming.length > 0 && (
        <div className="small">
          <strong>Sıradaki bildirimler</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }} data-testid="upcoming-notifications">
            {upcoming.map((n) => (
              <li key={n.key}>
                {fmtWhen(n.at)} — {n.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
