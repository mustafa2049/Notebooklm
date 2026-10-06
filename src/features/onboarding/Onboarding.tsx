import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import { defaultAnaglyph, type Eye, type Mode } from '../../model/types';
import { useStore } from '../../storage/store';
import { DisclaimerText, Segmented } from '../../ui/components';

const GOALS = [
  { value: 60, label: '1 sa' },
  { value: 120, label: '2 sa' },
  { value: 240, label: '4 sa' },
  { value: 360, label: '6 sa' },
];

export default function Onboarding() {
  const { addProfile, data } = useStore();
  const nav = useNavigate();
  const first = data.profiles.length === 0;
  const [step, setStep] = useState(first ? 0 : 1);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('adult');
  const [eye, setEye] = useState<Eye>('left');
  const [goal, setGoal] = useState(120);

  const finish = () => {
    addProfile({
      name: name.trim() || 'Ben',
      mode,
      amblyopicEye: eye,
      dailyGoalMin: goal,
      reminderTimes: ['10:00'],
      anaglyph: defaultAnaglyph(),
      dichopticContrast: 0.2,
    });
    nav('/', { replace: true });
  };

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      {step === 0 && (
        <div className="stack">
          <div className="mascot" aria-hidden>
            👁️
          </div>
          <h1>{tr.appName}’e hoş geldiniz</h1>
          <p className="muted">
            Göz tembelliği (ambliyopi) tedavisinde kapama süresini takip etmenize, bant takılıyken tembel gözü çalıştıran
            oyunlar oynamanıza, kırmızı-mavi gözlükle iki gözü birlikte çalıştırmanıza ve görme ilerlemenizi izlemenize
            yardım eder.
          </p>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{tr.disclaimer.title}</h2>
            <DisclaimerText />
          </div>
          <button className="btn primary big" onClick={() => setStep(1)}>
            {tr.disclaimer.accept}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <h1>Profil oluştur</h1>
          <label className="field">
            Ad
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Mustafa" autoFocus />
          </label>
          <div className="field">
            <strong>Kim kullanacak?</strong>
            <Segmented
              label="Kullanıcı tipi"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'adult', label: '🧑 Yetişkin' },
                { value: 'child', label: '🧒 Çocuk' },
              ]}
            />
            <span className="muted small">
              {mode === 'child'
                ? 'Çocuk modunda büyük butonlar, yıldızlar, rozetler ve ebeveyn şifresi bulunur.'
                : 'Yetişkin modunda sade arayüz ve ayrıntılı grafikler bulunur.'}
            </span>
          </div>
          <div className="row spread">
            {!first && (
              <button className="btn" onClick={() => nav(-1)}>
                Vazgeç
              </button>
            )}
            <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setStep(2)}>
              Devam
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <h1>Tembel göz hangisi?</h1>
          <p className="muted">
            Doktorunuzun belirttiği <b>tembel (zayıf) gözü</b> seçin. Kapama sırasında <b>diğer (sağlam) göz</b> kapatılır.
          </p>
          <Segmented
            label="Tembel göz"
            value={eye}
            onChange={setEye}
            options={[
              { value: 'left', label: tr.eye.left },
              { value: 'right', label: tr.eye.right },
            ]}
          />
          <div className="banner">
            Kapatılacak göz: <b>{eye === 'left' ? tr.eye.right : tr.eye.left}</b>
          </div>
          <div className="row spread">
            <button className="btn" onClick={() => setStep(1)}>
              Geri
            </button>
            <button className="btn primary" onClick={() => setStep(3)}>
              Devam
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          <h1>Günlük kapama hedefi</h1>
          <p className="muted">
            Doktorunuzun önerdiği süreyi seçin. Araştırmalar orta düzey göz tembelliğinde günde 2 saatin, ağır düzeyde
            günde 6 saatin sık kullanılan başlangıç süreleri olduğunu gösteriyor. Kapama sırasında yakın mesafe
            aktiviteleri (bu uygulamadaki egzersizler gibi) önerilir.
          </p>
          <Segmented label="Günlük hedef" value={goal} onChange={setGoal} options={GOALS} />
          <label className="field">
            Ya da dakika olarak girin
            <input
              type="number"
              min={10}
              max={720}
              step={10}
              value={goal}
              onChange={(e) => setGoal(Math.max(10, Math.min(720, Number(e.target.value) || 0)))}
            />
          </label>
          <div className="row spread">
            <button className="btn" onClick={() => setStep(2)}>
              Geri
            </button>
            <button className="btn primary" onClick={finish}>
              Başla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
