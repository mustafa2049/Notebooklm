/*
 * Hızlı Okuma service worker'ı — uygulamanın kendisini cihazda saklar ki
 * internet yokken de açılsın. Kitaplar zaten cihazda (IndexedDB); burada
 * yalnızca uygulamanın dosyaları var.
 *
 * Bu dosya bir şablon: `npm run build:web` sonunda `scripts/generate-sw.mjs`
 * derleme çıktısındaki dosyaların listesini aşağıya yazıp `dist/sw.js`
 * olarak kaydeder. Liste değişince (her yeni sürümde) dosya da değişir ve
 * tarayıcı yeni service worker'ı kurar.
 *
 * Stratejiler:
 * - Sayfa açılışı (gezinme): önce ağ — yeni sürüm hemen görünsün. Ağ yoksa ya
 *   da birkaç saniyede yanıt gelmezse önbellekteki uygulama kabuğu.
 * - Uygulama dosyaları: önce önbellek. Adlarında içerik özeti olan dosyalar
 *   hiç değişmez; diğerleri bu sürümün önbelleğinden gelir.
 * - Başka sitelere giden istekler (yapay zekâ, Vikikaynak, bağlantılar) ve
 *   listede olmayan her şey tarayıcıya bırakılır.
 */

const VERSION = '__VERSION__';
/** [yol, adında içerik özeti var mı] */
const PRECACHE = __PRECACHE__;

const PREFIX = 'hizliokuma-app-';
const CACHE = PREFIX + VERSION;
/** Önbellekte sürümün kurulma zamanı (eski sürümleri sıralamak için) */
const META = '/__sw-meta';
/** Uygulama kabuğu: her adres aynı index.html'i açar (tek sayfalık uygulama) */
const SHELL = '/';
/** Ağdan bu kadar beklenir; sonra önbellekteki kabuk açılır */
const NAVIGATION_TIMEOUT_MS = 4000;
/** Adında içerik özeti olan dosya (ifade `scripts/sw/precache.mjs`'ten gelir) */
const HASHED = __HASHED__;

const PRECACHED = new Set(PRECACHE.map(([path]) => path));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(PRECACHE.map(([path, hashed]) => store(cache, path, hashed)));
      await cache.put(META, new Response(JSON.stringify({ installedAt: Date.now() })));
      // Yeni sürüm beklemeden devreye girer; eski sürümle açık kalmış sayfalar
      // dosyalarını bir önceki önbellekte bulmaya devam eder (bkz. activate)
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = (await caches.keys()).filter((name) => name.startsWith(PREFIX) && name !== CACHE);
      const previous = await Promise.all(
        names.map(async (name) => ({ name, installedAt: await installedAt(name) })),
      );
      // Bir önceki sürüm kalır, daha eskiler ve yarım kalmış kurulumlar silinir
      previous.sort((a, b) => b.installedAt - a.installedAt);
      const keep = previous.find((entry) => entry.installedAt > 0);
      await Promise.all(
        previous.filter((entry) => entry !== keep).map((entry) => caches.delete(entry.name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }
  if (PRECACHED.has(url.pathname) || HASHED.test(url.pathname)) {
    event.respondWith(fromCache(request, url.pathname));
  }
});

async function store(cache, path, hashed) {
  // Yarıda kalan bir kurulum yeniden denenirken inenler tekrar inmesin
  if (await cache.match(path)) return;
  // Adında içerik özeti olan dosya önceki sürümde varsa içeriği aynıdır
  const previous = hashed ? await caches.match(path) : undefined;
  if (previous) {
    await cache.put(path, previous);
    return;
  }
  const response = await fetch(new Request(path, { cache: 'reload' }));
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  await cache.put(path, await settled(response));
}

/**
 * Yönlendirmeyle gelmiş yanıt sayfa açılışında kullanılamıyor (tarayıcı
 * reddediyor); içerik aynı kalır, yönlendirme izi silinir.
 */
async function settled(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function navigate(request) {
  const network = fetch(request);
  // Ağ hatası, kabuk döndürüldükten sonra konsolu kirletmesin
  network.catch(() => undefined);
  try {
    return await Promise.race([network, timeout(NAVIGATION_TIMEOUT_MS)]);
  } catch {
    const shell = await (await caches.open(CACHE)).match(SHELL);
    // Kabuk yoksa (kurulum bitmeden) ağı beklemekten başka yol yok
    return shell || network;
  }
}

async function fromCache(request, path) {
  const current = await caches.open(CACHE);
  const hit =
    (await current.match(path)) ||
    // Bir önceki sürümün parçası: o sürümle açık kalmış sayfa için
    (HASHED.test(path) ? await caches.match(path) : undefined);
  return hit || fetch(request);
}

async function installedAt(name) {
  try {
    const meta = await (await caches.open(name)).match(META);
    if (!meta) return 0;
    const value = (await meta.json()).installedAt;
    return typeof value === 'number' ? value : 0;
  } catch {
    return 0;
  }
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}
