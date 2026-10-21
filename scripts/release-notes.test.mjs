import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { releaseNotes } from './release-notes.mjs';

const SAMPLE = `# Sürüm notları

Giriş.

## 1.10.0

- On.

## 1.2.0 — 21 Ekim 2026

- Birinci.
- İkinci.

## 1.1.0 — 20 Ekim 2026

- Eski.
`;

describe('releaseNotes', () => {
  it('başlığından sonraki başlığa kadar; tarih başlıkta olabilir', () => {
    expect(releaseNotes(SAMPLE, '1.2.0')).toBe('- Birinci.\n- İkinci.');
    expect(releaseNotes(SAMPLE, '1.1.0')).toBe('- Eski.');
  });

  it('sürüm adı tam eşleşir (1.1.0, 1.10.0 değil); yoksa null', () => {
    expect(releaseNotes(SAMPLE, '1.10.0')).toBe('- On.');
    expect(releaseNotes(SAMPLE, '1.0')).toBeNull();
    expect(releaseNotes(SAMPLE, '9.9.9')).toBeNull();
  });

  it("depodaki CHANGELOG app.json'daki sürümü içeriyor", () => {
    const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
    const { version } = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
    expect(releaseNotes(changelog, version)).toBeTruthy();
  });
});
