/** İçe aktarma katmanının platformdan bağımsız tipleri ve hataları. */

export interface ExtractedChapter {
  title: string;
  /** Bölümün metni (normalleştirilmemiş) */
  text: string;
}

export interface ExtractedDocument {
  title?: string;
  text: string;
  /**
   * Kaynakta gerçek bölüm sınırı varsa (EPUB'da spine öğeleri) bölümler burada.
   * Karakter konumu bilerek verilmiyor: metin kaydedilirken normalleştirildiği
   * için konumlar kayıyor — konumlar birleştirme sırasında hesaplanıyor
   * (bkz. `joinChapters`).
   */
  chapters?: ExtractedChapter[];
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
