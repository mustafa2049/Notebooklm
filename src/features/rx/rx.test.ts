import { describe, expect, it } from 'vitest';
import {
  anisometropia,
  describeRx,
  formatDiopter,
  formatRx,
  parseAxis,
  parseDiopter,
  sphericalEquivalent,
  validateEyeRx,
} from './rx';

const rx = { right: { sph: 2.5, cyl: -1.75, axis: 5 }, left: { sph: 2, cyl: -1, axis: 39 } };

describe('reçete', () => {
  it('parses diopters written with comma, dot, sign or unicode minus', () => {
    expect(parseDiopter('+2,50')).toBe(2.5);
    expect(parseDiopter('-1.75')).toBe(-1.75);
    expect(parseDiopter('−1')).toBe(-1);
    expect(parseDiopter('2')).toBe(2);
    expect(parseDiopter('1,3')).toBe(1.25);
    expect(parseDiopter('')).toBe(0);
    expect(parseDiopter('-0')).toBe(0);
    expect(parseDiopter('abc')).toBeNull();
    expect(parseAxis('39')).toBe(39);
    expect(parseAxis('5°')).toBe(5);
    expect(parseAxis('x')).toBeNull();
  });

  it('validates ranges and requires an axis with cylinder', () => {
    expect(validateEyeRx(rx.right)).toBeNull();
    expect(validateEyeRx({ sph: 25, cyl: 0, axis: 0 })).toMatch(/SPH/);
    expect(validateEyeRx({ sph: 1, cyl: -1, axis: 0 })).toMatch(/eksen/i);
    expect(validateEyeRx({ sph: 1, cyl: -1, axis: 190 })).toMatch(/AKS/);
  });

  it('computes spherical equivalent and anisometropia', () => {
    expect(sphericalEquivalent(rx.right)).toBeCloseTo(1.625);
    expect(sphericalEquivalent(rx.left)).toBeCloseTo(1.5);
    expect(anisometropia(rx)).toBeCloseTo(0.125);
  });

  it('formats in Turkish notation', () => {
    expect(formatDiopter(2.5)).toBe('+2,50');
    expect(formatDiopter(-1.75)).toBe('−1,75');
    expect(formatRx(rx.right)).toBe('+2,50 / −1,75 × 5°');
    expect(formatRx({ sph: -1, cyl: 0, axis: 0 })).toBe('−1,00 (silindir yok)');
    expect(describeRx(rx.right)).toBe('hipermetropi + astigmat');
  });
});
