/** İçe aktarma katmanının platformdan bağımsız tipleri ve hataları. */

export interface ExtractedDocument {
  title?: string;
  text: string;
}

export class NoTextLayerError extends Error {
  constructor() {
    super(
      'Bu PDF’de metin katmanı yok — taranmış (fotoğraf) bir belge olabilir. ' +
        'Metin tanıma (OCR) uygulama içinde yapılmıyor.'
    );
    this.name = 'NoTextLayerError';
  }
}

/**
 * PDF okuma yalnızca web sürümünde çalışıyor.
 *
 * Sebep teknik: pdf.js tarayıcı için yazılmış bir kütüphane — içinde dinamik
 * `import()` ifadeleri, WebAssembly ve `ImageData` gibi çağrılar var. React
 * Native'in JavaScript motoru (Hermes) bu paketi derleyemiyor, dolayısıyla
 * telefon sürümüne dahil edilemiyor.
 *
 * Çözüm yolu (henüz yapılmadı): pdf.js'i gizli bir `react-native-webview`
 * içinde çalıştırıp çıkarılan metni `postMessage` ile geri almak. TXT ve EPUB
 * saf JavaScript olduğu için telefonda sorunsuz çalışıyor.
 */
export class PdfNotSupportedError extends Error {
  constructor() {
    super(
      'PDF okuma şu an yalnızca web sürümünde çalışıyor. ' +
        'Telefonda TXT ve EPUB dosyalarını ya da bir bağlantıyı kullanabilirsin.'
    );
    this.name = 'PdfNotSupportedError';
  }
}
