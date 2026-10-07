import { useState } from 'react';
import type { Eye, EyeRx, Prescription } from '../../model/types';
import {
  ANISO_LIMIT,
  anisometropia,
  describeRx,
  formatDiopter,
  formatRx,
  parseAxis,
  parseDiopter,
  sphericalEquivalent,
  validateEyeRx,
} from './rx';

interface Draft {
  sph: string;
  cyl: string;
  axis: string;
}

const toDraft = (rx?: EyeRx): Draft =>
  rx ? { sph: formatDiopter(rx.sph), cyl: formatDiopter(rx.cyl), axis: String(rx.axis) } : { sph: '', cyl: '', axis: '' };

const COL = { sph: 'SPH', cyl: 'CYL', axis: 'AKS' } as const;

const EYES: { eye: Eye; label: string; short: string }[] = [
  { eye: 'right', label: 'Sağ göz (OD)', short: 'Sağ (OD)' },
  { eye: 'left', label: 'Sol göz (OS)', short: 'Sol (OS)' },
];

/** Gözlük reçetesi giriş formu (Ayarlar ve kurulum sihirbazı). */
export function RxForm({
  initial,
  amblyopicEye,
  onSave,
  saveLabel = 'Reçeteyi kaydet',
}: {
  initial?: Prescription;
  amblyopicEye: Eye;
  onSave(p: Prescription): void;
  saveLabel?: string;
}) {
  const [draft, setDraft] = useState<Record<Eye, Draft>>({ right: toDraft(initial?.right), left: toDraft(initial?.left) });
  const [date, setDate] = useState(initial?.date ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (eye: Eye, key: keyof Draft, v: string) => {
    setDraft((d) => ({ ...d, [eye]: { ...d[eye], [key]: v } }));
    setErr(null);
    setSaved(false);
  };

  const parse = (eye: Eye): EyeRx | string => {
    const d = draft[eye];
    const sph = parseDiopter(d.sph);
    const cyl = parseDiopter(d.cyl);
    const axis = parseAxis(d.axis);
    const name = eye === 'right' ? 'Sağ göz' : 'Sol göz';
    if (sph == null || cyl == null || axis == null) return `${name}: değerler sayı olmalı (örn. +2,50)`;
    const rx = { sph, cyl, axis: cyl === 0 ? 0 : axis };
    const e = validateEyeRx(rx);
    return e ? `${name}: ${e}` : rx;
  };

  const save = () => {
    const right = parse('right');
    const left = parse('left');
    if (typeof right === 'string') return setErr(right);
    if (typeof left === 'string') return setErr(left);
    const p: Prescription = { right, left, ...(date ? { date } : {}) };
    setDraft({ right: toDraft(right), left: toDraft(left) });
    onSave(p);
    setSaved(true);
  };

  return (
    <div className="stack">
      <table className="rx-table">
        <thead>
          <tr>
            <th />
            <th>SPH</th>
            <th>CYL</th>
            <th>AKS</th>
          </tr>
        </thead>
        <tbody>
          {EYES.map(({ eye, short }) => (
            <tr key={eye}>
              <th scope="row">
                {short}
                {eye === amblyopicEye && <span className="tag">tembel</span>}
              </th>
              {(['sph', 'cyl', 'axis'] as const).map((k) => (
                <td key={k}>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    aria-label={`${eye === 'right' ? 'Sağ' : 'Sol'} ${COL[k]}`}
                    placeholder={k === 'sph' ? '+2,50' : k === 'cyl' ? '−1,00' : '90'}
                    value={draft[eye][k]}
                    onChange={(e) => set(eye, k, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <label className="field">
        Reçete tarihi
        <input type="date" value={date} onChange={(e) => (setDate(e.target.value), setSaved(false))} />
      </label>
      <p className="muted small" style={{ margin: 0 }}>
        Reçetedeki “UZAK” satırını yazın. Silindir yoksa CYL ve AKS boş kalabilir. Ondalık için virgül ya da nokta kullanılabilir.
      </p>
      {err && <div className="banner warn">{err}</div>}
      <button className="btn primary" onClick={save}>
        {saved ? '✓ Kaydedildi' : saveLabel}
      </button>
      {initial && <RxSummary rx={initial} amblyopicEye={amblyopicEye} />}
    </div>
  );
}

/** Kayıtlı reçetenin kısa açıklaması. */
export function RxSummary({ rx, amblyopicEye }: { rx: Prescription; amblyopicEye?: Eye }) {
  const aniso = anisometropia(rx);
  return (
    <div className="small stack" style={{ gap: 4 }}>
      {EYES.map(({ eye, label }) => (
        <div key={eye}>
          <b>{label}:</b> {formatRx(rx[eye])} — {describeRx(rx[eye])}
          {eye === amblyopicEye && ' (tembel göz)'}
          <span className="muted"> · SE {formatDiopter(sphericalEquivalent(rx[eye]), 3).replace(/0$/, '')}</span>
        </div>
      ))}
      <div className="muted">
        İki göz farkı (anizometropi): {formatDiopter(aniso, 2).replace('+', '')} D
        {aniso >= ANISO_LIMIT ? ' — fark büyük; tembelliğin bir nedeni olabilir, gözlüğü sürekli takmak önemli.' : ''}
      </div>
    </div>
  );
}
