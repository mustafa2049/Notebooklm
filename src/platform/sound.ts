export type Sfx = 'hit' | 'miss' | 'level' | 'finish' | 'tick';

let enabled = true;
let ctx: AudioContext | null = null;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // iOS ses bağlamını yalnızca kullanıcı etkileşiminden sonra açar.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** [frekans Hz, başlangıç sn, süre sn] notaları */
const SOUNDS: Record<Sfx, { type: OscillatorType; notes: [number, number, number][]; gain: number }> = {
  hit: { type: 'sine', notes: [[880, 0, 0.08], [1320, 0.06, 0.1]], gain: 0.18 },
  miss: { type: 'triangle', notes: [[220, 0, 0.16]], gain: 0.2 },
  level: { type: 'sine', notes: [[660, 0, 0.1], [880, 0.1, 0.1], [1100, 0.2, 0.16]], gain: 0.16 },
  finish: { type: 'sine', notes: [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.3]], gain: 0.16 },
  tick: { type: 'square', notes: [[1200, 0, 0.03]], gain: 0.05 },
};

/** Kısa ses efekti çalar (ses dosyası gerektirmez). */
export function sfx(name: Sfx): void {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const s = SOUNDS[name];
  const t0 = ac.currentTime;
  for (const [freq, start, dur] of s.notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = s.type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(s.gain, t0 + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.02);
  }
}

/** Ses bağlamını kullanıcı dokunuşuyla önceden aç. */
export function unlockAudio(): void {
  if (enabled) audio();
}
