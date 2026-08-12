import { describe, expect, it } from 'vitest';
import { createPlayback, pause, play, seek, tick } from './scheduler';

const fixed = (ms: number) => () => ms;

describe('scheduler', () => {
  it('duraklatılmışken tick durumu değiştirmez', () => {
    const state = createPlayback(0);
    expect(tick(state, 10_000, 10, fixed(100))).toBe(state);
  });

  it('süresi gelince bir sonraki kareye geçer', () => {
    let state = play(createPlayback(0), 0, fixed(100));
    state = tick(state, 50, 10, fixed(100));
    expect(state.index).toBe(0);
    state = tick(state, 100, 10, fixed(100));
    expect(state.index).toBe(1);
  });

  it('durum değişmediğinde aynı nesneyi döner (gereksiz render olmaz)', () => {
    const state = play(createPlayback(0), 0, fixed(100));
    expect(tick(state, 50, 10, fixed(100))).toBe(state);
  });

  it('metnin sonunda durur ve son karede kalır', () => {
    let state = play(createPlayback(0), 0, fixed(100));
    let now = 0;
    while (!state.finished && now < 10_000) {
      now += 16;
      state = tick(state, now, 3, fixed(100));
    }
    expect(state.finished).toBe(true);
    expect(state.playing).toBe(false);
    expect(state.index).toBe(2);
  });

  it('uzun süre arka planda kalınca metni hızlı sarmaz', () => {
    let state = play(createPlayback(0), 0, fixed(100));
    // Sekme 30 saniye arka planda kaldı: rAF hiç çalışmadı
    state = tick(state, 30_000, 1000, fixed(100));
    // En fazla birkaç kare ilerlemeli, 300 kelime atlamamalı
    expect(state.index).toBeLessThanOrEqual(3);
    expect(state.playing).toBe(true);
    // Saat yeniden eşitlendiği için sıradaki kare şimdiden sonra
    expect(state.nextDueAt).toBeGreaterThan(30_000);
  });

  it('duraklat/devam et kaldığı kareyi korur', () => {
    let state = play(createPlayback(5), 1000, fixed(100));
    state = pause(state);
    expect(state.index).toBe(5);
    state = play(state, 9999, fixed(100));
    expect(state.index).toBe(5);
    expect(state.nextDueAt).toBe(9999 + 100);
  });

  it('seek yumuşak başlangıç sayacını sıfırlar', () => {
    let state = play(createPlayback(0), 0, fixed(100));
    state = tick(state, 500, 100, fixed(100));
    expect(state.framesSinceResume).toBeGreaterThan(0);
    state = seek(state, 42, 600, fixed(100));
    expect(state.index).toBe(42);
    expect(state.framesSinceResume).toBe(0);
    expect(state.nextDueAt).toBe(700);
  });

  it('duraklatılmışken seek saati kurmaz', () => {
    const state = seek(createPlayback(0), 10, 500, fixed(100));
    expect(state.index).toBe(10);
    expect(state.playing).toBe(false);
  });

  it('yumuşak başlangıç çarpanı ilk karelere uygulanır', () => {
    const durations: number[] = [];
    const durationOf = (_i: number, frames: number) => {
      const ms = frames === 0 ? 160 : frames === 1 ? 130 : 100;
      durations.push(ms);
      return ms;
    };
    let state = play(createPlayback(0), 0, durationOf);
    let now = 0;
    for (let i = 0; i < 5; i++) {
      now += 200;
      state = tick(state, now, 100, durationOf);
    }
    expect(durations.slice(0, 3)).toEqual([160, 130, 100]);
  });
});
