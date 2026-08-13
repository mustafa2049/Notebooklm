const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/*
 * pdf.js kodu telefonda gizli bir WebView'de çalışıyor (bkz. src/ingest/pdfBridge).
 * WebView'e verebilmek için kodun *varlık* olarak paketlenmesi gerekiyor:
 * `.txt` uzantılı kopyalar `npm run vendor:pdfjs` ile üretiliyor ve burada
 * varlık uzantısı olarak tanıtılıyor. `.mjs` bırakılsaydı Metro onu kaynak
 * modül sayıp paketlemeye çalışırdı — Hermes de derleyemezdi.
 */
config.resolver.assetExts.push('txt');

module.exports = config;
