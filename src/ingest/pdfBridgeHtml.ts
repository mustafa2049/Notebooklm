/**
 * WebView içinde çalışacak sayfayı üretir.
 *
 * Neden böyle: pdf.js tarayıcı için yazılmış (dinamik `import`, WebAssembly,
 * `ImageData`) ve Hermes onu derleyemiyor. Telefonda çözüm, kodu gerçek bir
 * tarayıcı motorunda — gizli bir WebView'de — çalıştırmak.
 *
 * Sayfa yalnızca **metin öğelerini** geri gönderiyor; öğelerden metin üretme işi
 * `pdfText.ts`'de, yani tek yerde ve testli. Böylece web ve telefon aynı
 * algoritmayı paylaşıyor.
 *
 * Bu dosya saf bir dize üreticisi: React Native bağımlılığı yok, dolayısıyla
 * üretilen sayfa gerçek bir tarayıcıda test edilebiliyor.
 */

/** Sayfanın `postMessage` ile gönderdiği yanıt. */
export type BridgeMessage =
  | { type: 'ready' }
  | { type: 'progress'; page: number; total: number }
  | { type: 'result'; pages: { str: string; hasEOL: boolean; y: number | null }[][]; title?: string }
  | { type: 'error'; message: string };

export interface BridgeHtmlOptions {
  /** `pdf.min.mjs` içeriği */
  pdfCode: string;
  /** `pdf.worker.min.mjs` içeriği */
  workerCode: string;
  /**
   * Çıkarılacak PDF, base64 olarak. Sayfanın içine gömülüyor çünkü WebView'e
   * sonradan enjekte edilen betiğin uzunluk sınırı belirsiz; büyük dosyalarda
   * sessizce kesilebilir. Verilmezse sayfa `window.__extract(base64)` çağrısını
   * bekler (tarayıcıda test bu yolu kullanıyor).
   */
  base64Pdf?: string;
}

/**
 * Sayfanın beklediği çağrı: `window.__extract(base64Pdf)`.
 *
 * PDF baytları base64 olarak geliyor çünkü WebView köprüsü yalnızca metin
 * taşıyabiliyor. Kod blob URL'lerinden `import()` ile yükleniyor: iki ES
 * modülünü tek bir betik içine yapıştırmak (adlandırma çakışmaları yüzünden)
 * çalışmaz, blob'dan içe aktarmak modül sınırlarını korur.
 */
export function buildBridgeHtml({ pdfCode, workerCode, base64Pdf }: BridgeHtmlOptions): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body>
<script id="pdfjs-code" type="text/plain">${escapeForScriptTag(pdfCode)}</script>
<script id="pdfjs-worker-code" type="text/plain">${escapeForScriptTag(workerCode)}</script>
${base64Pdf ? `<script id="pdf-data" type="text/plain">${base64Pdf}</script>` : ''}
<script>
${BRIDGE_SCRIPT}
</script>
</body>
</html>`;
}

/**
 * Kod, `<script type="text/plain">` içine gömülüyor. Tek kaçırılması gereken
 * şey `</script`: tarayıcı betiği orada kapatır. Ayırıcı bir kaçış yeterli,
 * JSON'a çevirmek 1,8 MB'lık kodu gereksizce büyütürdü.
 */
function escapeForScriptTag(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script');
}

/** WebView içinde çalışan köprü betiği (saf tarayıcı JavaScript'i). */
const BRIDGE_SCRIPT = String.raw`
(function () {
  var loaded = null;

  function send(message) {
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(text);
    } else {
      // Tarayıcıda test edildiğinde: sonucu burada bırakıyoruz
      window.__lastMessage = message;
      window.dispatchEvent(new MessageEvent('bridge', { data: text }));
    }
  }

  function codeUrl(id) {
    var code = document.getElementById(id).textContent;
    return URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  }

  function load() {
    if (loaded) return loaded;
    loaded = (async function () {
      var pdfjs = await import(codeUrl('pdfjs-code'));
      var worker = await import(codeUrl('pdfjs-worker-code'));
      // pdf.js bu global varsa ayrıştırmayı aynı iş parçacığında yapıyor;
      // gerçek worker açmaya çalışmıyor. WebView zaten ayrı bir süreç olduğu
      // için uygulamanın arayüzü bundan etkilenmiyor.
      globalThis.pdfjsWorker = worker;
      pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.mjs';
      return pdfjs;
    })();
    return loaded;
  }

  function toBytes(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  window.__extract = async function (base64) {
    try {
      var pdfjs = await load();
      var doc = await pdfjs.getDocument({
        data: toBytes(base64),
        disableFontFace: true,
        useSystemFonts: false,
        verbosity: 0,
      }).promise;

      var pages = [];
      for (var number = 1; number <= doc.numPages; number++) {
        var page = await doc.getPage(number);
        var content = await page.getTextContent();
        var items = [];
        for (var i = 0; i < content.items.length; i++) {
          var item = content.items[i];
          if (typeof item.str !== 'string') continue;
          items.push({
            str: item.str,
            hasEOL: Boolean(item.hasEOL),
            y: item.transform && item.transform.length > 5 ? item.transform[5] : null,
          });
        }
        pages.push(items);
        page.cleanup();
        send({ type: 'progress', page: number, total: doc.numPages });
      }

      var title;
      try {
        var meta = await doc.getMetadata();
        var raw = meta && meta.info && meta.info.Title ? String(meta.info.Title).trim() : '';
        if (raw) title = raw;
      } catch (ignored) {}

      await doc.loadingTask.destroy();
      send({ type: 'result', pages: pages, title: title });
    } catch (caught) {
      send({ type: 'error', message: (caught && caught.message) || 'PDF okunamadı.' });
    }
  };

  send({ type: 'ready' });

  var embedded = document.getElementById('pdf-data');
  if (embedded) window.__extract(embedded.textContent.trim());
})();
`;
