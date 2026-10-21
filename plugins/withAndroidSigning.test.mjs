import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { applySigning, applyMemory } = require('./withAndroidSigning.js');

// `expo prebuild`in ürettiği app/build.gradle'ın ilgili kısmı (SDK 57)
const TEMPLATE = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
        }
    }
`;

describe('applySigning', () => {
  it('release imzası ortam değişkeninden; debug derlemesi aynı kalır', () => {
    const result = applySigning(TEMPLATE);
    expect(result).toContain("storeFile file(System.getenv('HO_KEYSTORE_PATH'))");
    expect(result).toContain("keyAlias System.getenv('HO_KEY_ALIAS') ?: 'hizliokuma'");
    expect(result).toContain(
      "signingConfig System.getenv('HO_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug"
    );
    // debug buildType'ı hâlâ debug imzalı
    expect(result).toMatch(/debug \{\s*signingConfig signingConfigs\.debug\s*\}/);
    // release imza bloğu signingConfigs'in içinde, buildTypes'tan önce
    expect(result.indexOf('HO_KEYSTORE_PATH')).toBeLessThan(result.indexOf('buildTypes'));
  });

  it('iki kez uygulanınca değişmez', () => {
    const once = applySigning(TEMPLATE);
    expect(applySigning(once)).toBe(once);
  });

  it('şablon tanınmazsa sessizce debug imzasıyla bırakmaz, hata verir', () => {
    expect(() => applySigning('android { }')).toThrow(/signingConfigs\.debug/);
    const noRelease = TEMPLATE.replace(/release \{[\s\S]*?\n {8}\}/, '');
    expect(() => applySigning(noRelease)).toThrow(/buildTypes\.release/);
  });
});

describe('applyMemory', () => {
  it('var olan değeri değiştirir, yoksa ekler', () => {
    const existing = [{ type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx2048m' }];
    expect(applyMemory(existing)[0].value).toBe('-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    expect(applyMemory([])).toEqual([
      { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m' },
    ]);
  });
});
