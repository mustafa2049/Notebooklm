const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

/**
 * Android yayın imzası ve derleme belleği — `expo prebuild` her seferinde
 * `android/` klasörünü baştan ürettiği için elle yapılan ayarlar kayboluyordu.
 *
 * İmza anahtarı depoda değil: yolu ve şifresi derleme anında ortam
 * değişkenlerinden okunur (GitHub'da gizli değerlerden, bkz.
 * `.github/workflows/android.yml`):
 * - `HO_KEYSTORE_PATH`: anahtar dosyası (.jks)
 * - `HO_KEY_PASSWORD`: anahtar deposunun ve anahtarın şifresi
 * - `HO_KEY_ALIAS`: anahtarın adı (varsayılan `hizliokuma`)
 *
 * Değişkenler yoksa release derlemesi debug anahtarıyla imzalanır (yalnızca
 * deneme içindir: telefondaki uygulamanın üstüne güncelleme olarak kurulamaz).
 */

const MARKER = 'Hızlı Okuma: yayın imzası';

const RELEASE_SIGNING = `
        // ${MARKER} (plugins/withAndroidSigning.js). Anahtar yolu ve
        // şifresi ortam değişkenlerinden; yoksa debug imzası kullanılır.
        release {
            if (System.getenv('HO_KEYSTORE_PATH')) {
                storeFile file(System.getenv('HO_KEYSTORE_PATH'))
                storePassword System.getenv('HO_KEY_PASSWORD')
                keyAlias System.getenv('HO_KEY_ALIAS') ?: 'hizliokuma'
                keyPassword System.getenv('HO_KEY_PASSWORD')
            }
        }`;

/** Şablondaki release imzasını ortam değişkenine bağlar (saf: testlerde de kullanılır) */
function applySigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  // signingConfigs { debug { ... } } bloğunun sonuna release imzası
  const debugBlock = /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n\s*\})/;
  if (!debugBlock.test(gradle)) {
    throw new Error('withAndroidSigning: build.gradle içinde signingConfigs.debug bulunamadı (şablon değişmiş olabilir).');
  }
  let result = gradle.replace(debugBlock, `$1${RELEASE_SIGNING}`);

  // buildTypes.release içindeki debug imzası
  const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseType.test(result)) {
    throw new Error('withAndroidSigning: buildTypes.release içinde imza satırı bulunamadı (şablon değişmiş olabilir).');
  }
  result = result.replace(
    releaseType,
    "$1signingConfig System.getenv('HO_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug"
  );
  return result;
}

/** Gradle'a 4 GB bellek: varsayılan 2 GB'la Metro paketlemesi ara sıra yetmiyordu */
function applyMemory(properties) {
  const value = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';
  const existing = properties.find((item) => item.type === 'property' && item.key === 'org.gradle.jvmargs');
  if (existing) existing.value = value;
  else properties.push({ type: 'property', key: 'org.gradle.jvmargs', value });
  return properties;
}

function withAndroidSigning(config) {
  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withAndroidSigning: yalnızca Groovy build.gradle destekleniyor.');
    }
    mod.modResults.contents = applySigning(mod.modResults.contents);
    return mod;
  });
  return withGradleProperties(config, (mod) => {
    mod.modResults = applyMemory(mod.modResults);
    return mod;
  });
}

module.exports = withAndroidSigning;
module.exports.applySigning = applySigning;
module.exports.applyMemory = applyMemory;
