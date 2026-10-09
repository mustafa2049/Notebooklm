import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { buildVersion, HASHED, precacheEntries, renderServiceWorker } from './precache.mjs';

const template = readFileSync(resolve(import.meta.dirname, 'template.js'), 'utf8');

const build = (overrides = {}) =>
  Object.entries({
    'index.html': '<html>v1</html>',
    'manifest.json': '{}',
    'favicon.ico': 'ico',
    'icons/icon-192.png': 'png',
    '_expo/static/js/web/entry-294025356e48279b8a6251048b1d26fd.js': 'entry',
    '_expo/static/js/web/pdf-5e3ce640937390fc3952f70972084be7.js': 'pdf',
    'assets/node_modules/@expo-google-fonts/a/400Regular/A_400Regular.86635252a71fd7c43fd5b0c41bdc5d54.ttf': 'font',
    'assets/node_modules/expo-router/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png': 'icon',
    'metadata.json': '{}',
    _redirects: '/* /index.html 200',
    _headers: '/sw.js',
    'sw.js': 'eski',
    ...overrides,
  }).map(([path, content]) => ({ path, content }));

describe('precacheEntries', () => {
  it('uygulama kabuğunu "/" adresiyle, sunucu dosyalarını hiç almıyor', () => {
    const urls = precacheEntries(build()).map((entry) => entry.url);
    expect(urls).toContain('/');
    expect(urls).not.toContain('/index.html');
    for (const skipped of ['/metadata.json', '/_redirects', '/_headers', '/sw.js']) {
      expect(urls).not.toContain(skipped);
    }
    expect(urls).toContain('/manifest.json');
    expect(urls).toContain('/icons/icon-192.png');
  });

  it('içerik özetli adları ayırt ediyor', () => {
    const hashed = Object.fromEntries(precacheEntries(build()).map((entry) => [entry.url, entry.hashed]));
    expect(hashed['/_expo/static/js/web/entry-294025356e48279b8a6251048b1d26fd.js']).toBe(true);
    expect(
      hashed[
        '/assets/node_modules/expo-router/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png'
      ],
    ).toBe(true);
    expect(hashed['/']).toBe(false);
    expect(hashed['/manifest.json']).toBe(false);
    expect(hashed['/icons/icon-192.png']).toBe(false);
    // Kısa sayı dizisi özet sayılmaz
    expect(HASHED.test('/icons/icon-192.png')).toBe(false);
    expect(HASHED.test('/kitap-2024.png')).toBe(false);
  });

  it('adresleri tarayıcının istediği biçimde yazıyor ve sıralıyor', () => {
    const urls = precacheEntries(build({ 'icons/ana ekran.png': 'x' })).map((entry) => entry.url);
    expect(urls).toContain('/icons/ana%20ekran.png');
    expect(urls).toContain(
      '/assets/node_modules/@expo-google-fonts/a/400Regular/A_400Regular.86635252a71fd7c43fd5b0c41bdc5d54.ttf',
    );
    expect([...urls].sort()).toEqual(urls);
  });
});

describe('buildVersion', () => {
  it('aynı derleme aynı sürüm; tek dosya değişince sürüm değişiyor', () => {
    const first = buildVersion(precacheEntries(build()));
    expect(buildVersion(precacheEntries(build()))).toBe(first);
    expect(buildVersion(precacheEntries(build({ 'index.html': '<html>v2</html>' })))).not.toBe(first);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
  });

  it('atlanan dosyalar sürümü etkilemiyor', () => {
    const first = buildVersion(precacheEntries(build()));
    expect(buildVersion(precacheEntries(build({ 'metadata.json': '{"x":1}' })))).toBe(first);
  });
});

describe('renderServiceWorker', () => {
  it('yer tutucuları dolduruyor; çıktı geçerli JavaScript', () => {
    const entries = precacheEntries(build());
    const { code, version } = renderServiceWorker(template, entries);
    expect(code).not.toMatch(/__(VERSION|PRECACHE|HASHED)__/);
    expect(code).toContain(`const VERSION = "${version}";`);
    expect(code).toContain('["/",0]');
    expect(code).toContain('["/_expo/static/js/web/entry-294025356e48279b8a6251048b1d26fd.js",1]');
    expect(() => new Script(code)).not.toThrow();
  });

  it('bozuk şablonu reddediyor', () => {
    expect(() => renderServiceWorker('const x = 1;', [])).toThrow(/bir kez/);
    expect(() =>
      renderServiceWorker("'__VERSION__' __PRECACHE__ __PRECACHE__ __HASHED__", []),
    ).toThrow(/__PRECACHE__/);
  });
});
