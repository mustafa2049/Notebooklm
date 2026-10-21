import { Asset } from 'expo-asset';

/**
 * Uygulamayla gelen bir varlık dosyasını metin olarak okur (pdf.js kodu,
 * gömülü klasikler, sözlük dilimleri).
 *
 * Geliştirme sunucusunda ve web'de varlık `http(s)://` adresinden, telefonun
 * üretim derlemesinde cihazdaki bir dosyadan geliyor; iki durumu ayırmak
 * gerekiyor çünkü `fetch` Android'de `file://` adreslerini okuyamıyor.
 */
export async function readAssetText(module: number): Promise<string> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri.startsWith('file://')) {
    const { File } = await import('expo-file-system');
    return new File(uri).text();
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Varlık okunamadı (HTTP ${response.status})`);
  return response.text();
}
