import { Asset } from 'expo-asset';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildBridgeHtml, type BridgeMessage } from './pdfBridgeHtml';
import { pagesToDocument } from './pdfText';
import type { ExtractedDocument } from './types';

/**
 * Telefonda PDF okuma: gizli bir WebView'de pdf.js çalıştırma.
 *
 * pdf.js Hermes'te derlenmiyor, ama Android'in WebView'i Chromium — yani pdf.js
 * için doğru ortam. Bu bileşen ekranda görünmüyor (0×0), yalnızca köprü olarak
 * duruyor: PDF base64 olarak sayfaya gömülüyor, sayfa metin öğelerini
 * `postMessage` ile geri gönderiyor, öğeden metne dönüşüm `pdfText.ts`'de
 * yapılıyor (web ile aynı algoritma).
 *
 * Bilinen sınırlar dürüstçe: çok büyük PDF'lerde JSON tek mesajda döndüğü için
 * bellek kullanımı artıyor, ve WebView açılışında ~1,8 MB pdf.js kodu
 * ayrıştırılıyor (ilk PDF'te birkaç saniye gecikme).
 */

interface Props {
  /** Çıkarılacak PDF, base64 */
  base64: string;
  onResult: (document: ExtractedDocument) => void;
  onError: (message: string) => void;
  /** Sayfa sayfa ilerleme (arayüzde "3/12 sayfa") */
  onProgress?: (page: number, total: number) => void;
}

export function PdfBridge({ base64, onResult, onError, onProgress }: Props) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildHtml(base64)
      .then((page) => {
        if (!cancelled) setHtml(page);
      })
      .catch((caught: unknown) =>
        onError(
          caught instanceof Error
            ? `PDF okuyucu hazırlanamadı: ${caught.message}`
            : 'PDF okuyucu hazırlanamadı.'
        )
      );
    return () => {
      cancelled = true;
    };
    // Yalnızca base64 değişince yeniden kurulmalı
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base64]);

  if (!html) return null;

  return (
    <View style={{ width: 0, height: 0, opacity: 0 }} pointerEvents="none">
      <WebView
        source={{ html }}
        // Sayfa yalnızca kendi içeriğini çalıştırıyor; ağa çıkmasına gerek yok
        originWhitelist={['about:*']}
        javaScriptEnabled
        // Dosya erişimi kapalı: sayfaya PDF'i biz veriyoruz
        allowFileAccess={false}
        onMessage={(event) => {
          let message: BridgeMessage;
          try {
            message = JSON.parse(event.nativeEvent.data) as BridgeMessage;
          } catch {
            onError('PDF köprüsünden beklenmeyen bir yanıt geldi.');
            return;
          }

          if (message.type === 'progress') {
            onProgress?.(message.page, message.total);
            return;
          }
          if (message.type === 'error') {
            onError(message.message);
            return;
          }
          if (message.type === 'result') {
            try {
              onResult(pagesToDocument({ pages: message.pages, title: message.title }));
            } catch (caught) {
              onError(caught instanceof Error ? caught.message : 'PDF metni çıkarılamadı.');
            }
          }
        }}
        onError={() => onError('PDF köprüsü açılamadı.')}
      />
    </View>
  );
}

async function buildHtml(base64: string): Promise<string> {
  const [pdfCode, workerCode] = await Promise.all([
    readAsset(require('../../assets/pdfjs/pdf.min.txt')),
    readAsset(require('../../assets/pdfjs/pdf.worker.min.txt')),
  ]);
  return buildBridgeHtml({ pdfCode, workerCode, base64Pdf: base64 });
}

/**
 * Varlık dosyasını metin olarak okur.
 *
 * Geliştirme sunucusunda varlık `http://` adresinden, üretim derlemesinde
 * cihazdaki bir dosyadan geliyor; iki durumu ayırmak gerekiyor çünkü
 * `fetch` Android'de `file://` adreslerini okuyamıyor.
 */
async function readAsset(module: number): Promise<string> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri.startsWith('file://')) {
    const { File } = await import('expo-file-system');
    return new File(uri).text();
  }
  const response = await fetch(uri);
  return response.text();
}
