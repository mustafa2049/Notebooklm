import React from 'react';

/**
 * Web'de köprüye gerek yok: pdf.js doğrudan uygulamada çalışıyor
 * (`fromPdf.web.ts`). Bu dosya, `react-native-webview` ve 1,8 MB'lık pdf.js
 * varlıklarının web paketine hiç girmemesi için var — Metro `.web.tsx`'i
 * öncelikli çözüyor.
 */
export function PdfBridge(_props: {
  base64: string;
  onResult: (document: unknown) => void;
  onError: (message: string) => void;
  onProgress?: (page: number, total: number) => void;
}): React.ReactElement | null {
  return null;
}
