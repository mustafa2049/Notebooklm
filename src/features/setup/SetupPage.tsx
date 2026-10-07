import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { Eye } from '../../model/types';
import { useProfileResults } from '../../storage/selectors';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';
import { RxForm } from '../rx/RxForm';
import { PinGate } from '../settings/SettingsPage';
import { ScreenScale } from '../vision/VisionPage';
import { setupProgress, setupSteps, type SetupStepId } from './setup';

/** Adım adım kurulum: tembel göz, reçete, doktor planı, ekran ölçüsü, gözlük ayarı, ilk görme testi. */
export default function SetupPage() {
  const profile = useProfile();
  const [unlocked, setUnlocked] = useState(false);
  if (profile.mode === 'child' && profile.parentPin && !unlocked) {
    return <PinGate pin={profile.parentPin} onUnlock={() => setUnlocked(true)} />;
  }
  return <Wizard />;
}

function Wizard() {
  const profile = useProfile();
  const { updateProfile } = useStore();
  const { visionTests } = useProfileResults();
  const nav = useNavigate();
  const steps = setupSteps(profile, visionTests);
  const { done, total } = setupProgress(steps);
  const [index, setIndex] = useState(() => Math.max(0, steps.findIndex((s) => !s.done)));
  const step = steps[index];
  const up = (patch: Parameters<typeof updateProfile>[1]) => updateProfile(profile.id, patch);
  const last = index === steps.length - 1;
  const next = () => (last ? nav('/') : setIndex(index + 1));

  return (
    <div className="page stack">
      <div className="row spread">
        <h1 style={{ margin: 0 }}>🧭 Kurulum</h1>
        <Link className="btn ghost" to="/">
          Kapat
        </Link>
      </div>
      <div className="row spread small">
        <nav className="steps" aria-label="Kurulum adımları">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={s.done ? 'done' : ''}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`${i + 1}. ${s.title}${s.done ? ' (tamam)' : ''}`}
              onClick={() => setIndex(i)}
            >
              {s.done && i !== index ? '✓' : i + 1}
            </button>
          ))}
        </nav>
        <span className="muted" data-testid="setup-progress">
          {done}/{total} tamam
        </span>
      </div>
      <div className="progress">
        <div style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <div className="card stack" style={{ margin: 0 }}>
        <h2 style={{ margin: 0 }}>
          {step.icon} {step.title} {step.done && <span className="muted small">✓ tamam</span>}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {step.desc}
        </p>
        <StepBody id={step.id} onNext={next} up={up} />
      </div>

      <div className="row spread">
        <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← Önceki
        </button>
        <button className={`btn ${step.done ? 'primary' : ''}`} onClick={next}>
          {last ? 'Bitir' : step.done ? 'Sonraki →' : 'Sonra yaparım →'}
        </button>
      </div>
      {done === total && (
        <div className="banner">
          🎉 Kurulum tamamlandı! Ayarları istediğin zaman <Link to="/settings">Ayarlar</Link>'dan değiştirebilirsin.
        </div>
      )}
    </div>
  );
}

function StepBody({
  id,
  onNext,
  up,
}: {
  id: SetupStepId;
  onNext(): void;
  up(patch: Parameters<ReturnType<typeof useStore>['updateProfile']>[1]): void;
}) {
  const profile = useProfile();
  const fellow: Eye = profile.amblyopicEye === 'left' ? 'right' : 'left';

  switch (id) {
    case 'eye':
      return (
        <>
          <Segmented
            label="Tembel göz"
            value={profile.amblyopicEye}
            onChange={(amblyopicEye) => up({ amblyopicEye })}
            options={[
              { value: 'left', label: tr.eye.left },
              { value: 'right', label: tr.eye.right },
            ]}
          />
          <div className="banner small">
            Tembel göz: <b>{tr.eye[profile.amblyopicEye]}</b> · Bant <b>{tr.eye[fellow].toLowerCase()}e</b> (sağlam göze)
            takılır. Böylece beyin tembel gözü kullanmak zorunda kalır.
          </div>
        </>
      );

    case 'rx':
      return (
        <>
          <Segmented
            label="Gözlük kullanımı"
            value={profile.wearsGlasses ? 'on' : profile.rxSkipped ? 'off' : ''}
            onChange={(v) => up(v === 'on' ? { wearsGlasses: true, rxSkipped: false } : { wearsGlasses: false, rxSkipped: true })}
            options={[
              { value: 'on', label: '👓 Gözlük kullanıyorum' },
              { value: 'off', label: 'Gözlüğüm yok' },
            ]}
          />
          {profile.wearsGlasses && (
            <RxForm
              initial={profile.prescription}
              amblyopicEye={profile.amblyopicEye}
              saveLabel="Kaydet ve devam et"
              onSave={(prescription) => {
                up({ prescription, wearsGlasses: true });
                onNext();
              }}
            />
          )}
          {profile.rxSkipped && !profile.wearsGlasses && (
            <p className="muted small" style={{ margin: 0 }}>
              Doktor gözlük verirse buraya ya da Ayarlar → Gözlük reçetesi bölümüne girebilirsin. Göz tembelliğinde gözlük
              tedavinin ilk adımıdır; gözlük verildiyse gün boyu takılmalıdır.
            </p>
          )}
        </>
      );

    case 'plan':
      return <PlanStep onDone={onNext} />;

    case 'screen':
      return (
        <ScreenScale
          embedded
          initial={profile.screenPxPerMm ?? 3.78}
          cancelLabel="Kartım yok, atla"
          onSave={(screenPxPerMm) => {
            up({ screenPxPerMm });
            onNext();
          }}
          onCancel={onNext}
        />
      );

    case 'glasses':
      return (
        <>
          <p className="small" style={{ margin: 0 }}>
            İki gözlü (dikoptik) oyunlar, okuma, film ve 3D testi için karton kırmızı-mavi (anaglif) gözlük gerekir.
            Ayarda ekrandaki renkler gözlüğüne göre düzenlenir; yaklaşık 1 dakika sürer.
            {profile.wearsGlasses && ' Numaralı gözlüğünün üzerine tak.'}
          </p>
          <Link className="btn primary" to="/calibrate">
            🥽 {profile.anaglyph.calibrated ? 'Ayarı yeniden yap' : 'Gözlük ayarını yap'}
          </Link>
          {!profile.anaglyph.calibrated && (
            <span className="muted small">Gözlüğün yoksa bu adımı atlayabilirsin; bantla yapılan egzersizler gözlüksüz çalışır.</span>
          )}
        </>
      );

    case 'vision':
      return (
        <>
          <p className="small" style={{ margin: 0 }}>
            Her göz için kalabalıklaştırılmış E harfiyle yaklaşık görme düzeyi ölçülür (2–3 dakika). Sonraki testler bu
            başlangıçla karşılaştırılır.
          </p>
          <Link className="btn primary" to="/vision?from=setup">
            👁️ Görme testine başla
          </Link>
        </>
      );
  }
}

function PlanStep({ onDone }: { onDone(): void }) {
  const profile = useProfile();
  const { updateProfile } = useStore();
  const [goal, setGoal] = useState(profile.dailyGoalMin);
  const [visit, setVisit] = useState(profile.nextVisit ?? '');
  const [note, setNote] = useState(profile.doctorNote);
  return (
    <>
      <label className="field">
        Günlük kapama süresi (dakika)
        <input
          type="number"
          min={10}
          max={720}
          step={10}
          value={goal}
          onChange={(e) => setGoal(Math.max(10, Math.min(720, Number(e.target.value) || 10)))}
        />
      </label>
      <span className="muted small">
        Doktorunun söylediği süreyi yaz (örn. 2 saat = 120). Emin değilsen doktoruna sor; uygulama süreyi kendisi belirlemez.
      </span>
      <label className="field">
        Sonraki kontrol tarihi
        <input type="date" value={visit} onChange={(e) => setVisit(e.target.value)} />
      </label>
      <label className="field">
        Doktorun önerisi / notlar
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Örn. Sol göz günde 2 saat kapatılacak, gözlük gün boyu takılacak."
        />
      </label>
      <button
        className="btn primary"
        onClick={() => {
          updateProfile(profile.id, { dailyGoalMin: goal, nextVisit: visit || undefined, doctorNote: note.trim(), planConfirmed: true });
          onDone();
        }}
      >
        Planı kaydet
      </button>
    </>
  );
}
