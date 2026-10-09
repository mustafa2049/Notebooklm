import { describe, expect, it } from 'vitest';
import { eveningRangeLabel, inEveningWindow, isEvening } from './evening';

const at = (hour: number, minute = 0) => new Date(2026, 9, 9, hour, minute);

describe('akşam tonu', () => {
  it('gece yarısını aşan aralık: 21:00–07:00', () => {
    expect(inEveningWindow(at(20, 59), 21, 7)).toBe(false);
    expect(inEveningWindow(at(21, 0), 21, 7)).toBe(true);
    expect(inEveningWindow(at(23, 30), 21, 7)).toBe(true);
    expect(inEveningWindow(at(3, 0), 21, 7)).toBe(true);
    expect(inEveningWindow(at(6, 59), 21, 7)).toBe(true);
    expect(inEveningWindow(at(7, 0), 21, 7)).toBe(false);
    expect(inEveningWindow(at(12, 0), 21, 7)).toBe(false);
  });

  it('aynı gün içindeki aralık ve boş aralık', () => {
    expect(inEveningWindow(at(19, 30), 19, 23)).toBe(true);
    expect(inEveningWindow(at(23, 30), 19, 23)).toBe(false);
    expect(inEveningWindow(at(10, 0), 8, 8)).toBe(false);
  });

  it('kapalıyken hiç devreye girmiyor', () => {
    const settings = { eveningEnabled: false, eveningStart: 21, eveningEnd: 7, eveningTheme: 'night' as const };
    expect(isEvening(settings, at(23))).toBe(false);
    expect(isEvening({ ...settings, eveningEnabled: true }, at(23))).toBe(true);
  });

  it('aralık etiketi', () => {
    expect(eveningRangeLabel(21, 7)).toBe('21:00–07:00');
  });
});
