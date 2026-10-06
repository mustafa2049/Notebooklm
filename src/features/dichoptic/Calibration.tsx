import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tr } from '../../i18n/tr';
import type { AnaglyphSettings, Eye } from '../../model/types';
import { filterColors, fellowEyeOf, makePalette } from '../../games/dichoptic/anaglyph';
import { useProfile, useStore } from '../../storage/store';
import { Segmented } from '../../ui/components';

const rgb = ([r, g, b]: number[]) => `rgb(${r},${g},${b})`;

export default function Calibration() {
  const profile = useProfile();
  const { updateProfile } = useStore();
  const nav = useNavigate();
  const [a, setA] = useState<AnaglyphSettings>(profile.anaglyph);
  const [step, setStep] = useState(0);
  const set = (patch: Partial<AnaglyphSettings>) => setA((x) => ({ ...x, ...patch }));
  const { red, other } = filterColors(a);
  const otherName = a.glasses === 'red-blue' ? 'mavi' : a.glasses === 'red-green' ? 'yeşil' : 'camgöbeği';
  const redEyeName = tr.eye[a.redEye].toLowerCase();
  const otherEye: Eye = fellowEyeOf(a.redEye);
  const otherEyeName = tr.eye[otherEye].toLowerCase();
  const pal = makePalette(a, profile.amblyopicEye, 1);

  const save = () => {
    updateProfile(profile.id, { anaglyph: { ...a, calibrated: true } });
    nav(-1);
  };

  const sw: React.CSSProperties = { width: 110, height: 110, borderRadius: 12 };

  return (
    <div className="game-screen" style={{ overflow: 'auto' }}>
      <div className="game-hud">
        <button onClick={() => nav(-1)} aria-label="Kapat">
          ✕
        </button>
        <span>Gözlük kalibrasyonu {step + 1}/4</span>
        <span />
      </div>
      <div className="page stack" style={{ color: '#fff', paddingTop: 8 }}>
        {step === 0 && (
          <>
            <h2 style={{ margin: 0 }}>Gözlüğünü tanıt</h2>
            <p className="small" style={{ margin: 0, color: '#bbb' }}>
              Ekran parlaklığını yükselt, gece modunu / mavi ışık filtresini kapat. Gözlüğü gözlük camlarının (varsa)
              üstüne takabilirsin.
            </p>
            <strong>Gözlük tipi</strong>
            <Segmented
              label="Gözlük tipi"
              value={a.glasses}
              onChange={(g) => set({ glasses: g })}
              options={[
                { value: 'red-cyan', label: 'Kırmızı-Camgöbeği' },
                { value: 'red-blue', label: 'Kırmızı-Mavi' },
                { value: 'red-green', label: 'Kırmızı-Yeşil' },
              ]}
            />
            <strong>Kırmızı cam hangi gözün önünde?</strong>
            <Segmented
              label="Kırmızı cam"
              value={a.redEye}
              onChange={(e) => set({ redEye: e })}
              options={[
                { value: 'left', label: tr.eye.left },
                { value: 'right', label: tr.eye.right },
              ]}
            />
            <p className="small" style={{ margin: 0, color: '#bbb' }}>
              Çoğu gözlükte kırmızı cam sol gözdedir. Gözlüğü ters takarak kırmızıyı tembel göze de verebilirsin; uygulama
              renkleri buna göre ayarlar.
            </p>
            <button className="btn primary big" onClick={() => setStep(1)}>
              Devam
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={{ margin: 0 }}>Kırmızı sızıntı testi</h2>
            <p style={{ margin: 0 }}>
              <b>{tr.eye[a.redEye]}</b> gözünü kapat; sadece <b>{otherName}</b> camın arkasındaki {otherEyeName}le bak.
              Aşağıdaki <b>kırmızı kare</b> tamamen kaybolmalı (zeminle aynı siyah görünmeli).
            </p>
            <div className="row" style={{ justifyContent: 'center', padding: 16 }}>
              <div style={{ ...sw, background: rgb(red) }} />
            </div>
            <label className="field">
              Kırmızı parlaklığı: {a.redLevel}
              <input type="range" min={80} max={255} value={a.redLevel} onChange={(e) => set({ redLevel: Number(e.target.value) })} />
            </label>
            <p className="small" style={{ margin: 0, color: '#bbb' }}>
              Kare hâlâ hafifçe görünüyorsa kaydırıcıyı sola çek. Kaybolduğu en yüksek değeri seç.
            </p>
            <div className="row spread">
              <button className="btn" onClick={() => setStep(0)}>
                Geri
              </button>
              <button className="btn primary" onClick={() => setStep(2)}>
                Devam
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ margin: 0 }}>{otherName[0].toUpperCase() + otherName.slice(1)} sızıntı testi</h2>
            <p style={{ margin: 0 }}>
              Şimdi <b>{tr.eye[otherEye]}</b> gözünü kapat; sadece <b>kırmızı</b> camın arkasındaki {redEyeName}le bak.
              Aşağıdaki <b>{otherName} kare</b> tamamen kaybolmalı.
            </p>
            <div className="row" style={{ justifyContent: 'center', padding: 16 }}>
              <div style={{ ...sw, background: rgb(other) }} />
            </div>
            <label className="field">
              {otherName[0].toUpperCase() + otherName.slice(1)} parlaklığı: {a.cyanLevel}
              <input type="range" min={80} max={255} value={a.cyanLevel} onChange={(e) => set({ cyanLevel: Number(e.target.value) })} />
            </label>
            <div className="row spread">
              <button className="btn" onClick={() => setStep(1)}>
                Geri
              </button>
              <button className="btn primary" onClick={() => setStep(3)}>
                Devam
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ margin: 0 }}>İki gözle kontrol</h2>
            <p style={{ margin: 0 }}>
              İki gözünü de aç. Solda <b>tembel gözüne</b> giden bir daire, sağda <b>sağlam gözüne</b> giden bir kare var.
              Gri çerçeveyi iki gözün de görür.
            </p>
            <div
              className="row"
              style={{ justifyContent: 'center', gap: 32, padding: 20, border: `4px solid ${pal.both}`, borderRadius: 16 }}
            >
              <div style={{ ...sw, borderRadius: '50%', background: pal.amb }} />
              <div style={{ ...sw, background: pal.fel }} />
            </div>
            <ul className="small" style={{ margin: 0, color: '#ddd', paddingLeft: 18 }}>
              <li>İkisini de aynı anda görüyorsan harika: kalibrasyon tamam.</li>
              <li>
                Sadece kareyi görüyorsan beynin tembel gözü bastırıyor olabilir; bu normaldir. Oyunlarda sağlam göze
                giden öğeler soluk başlar ve bu bastırma zamanla azalabilir.
              </li>
              <li>Renkler karışık görünüyorsa gözlüğün yönünü (kırmızı cam hangi gözde) kontrol et.</li>
            </ul>
            <div className="row spread">
              <button className="btn" onClick={() => setStep(2)}>
                Geri
              </button>
              <button className="btn primary" onClick={save}>
                Kaydet
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
