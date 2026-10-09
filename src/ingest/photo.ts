import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { AiImage } from '@/ai/types';

/**
 * Kitap sayfasının fotoğrafı: kamera ya da galeri.
 *
 * Fotoğrafı metne çeviren yapay zekâ (bkz. `transcribeImage`); cihazda Türkçe
 * metin tanıma (OCR) bu uygulama için fazla ağır. Fotoğraf yalnızca kullanıcının
 * seçtiği sağlayıcıya gider.
 */

export interface PagePhoto {
  id: string;
  /** Küçük önizleme için */
  uri: string;
  image: AiImage;
}

/**
 * Uzun kenar bundan büyükse küçültülür (web'de). Sağlayıcılar büyük görseli
 * zaten bu civara indiriyor: fazlası yalnızca yükleme ve token israfı; bir
 * kitap sayfasının yazısı bu boyutta rahat okunuyor.
 */
export const MAX_EDGE = 1600;
/** Sağlayıcıların görsel sınırı ~5 MB; base64 bundan büyükse gönderilmez */
const MAX_BASE64 = 6_500_000;

let counter = 0;

export async function pickPhotos(source: 'camera' | 'library'): Promise<PagePhoto[]> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Kamera izni verilmedi. Telefonun ayarlarından Hızlı Okuma’ya kamera izni verebilirsin.');
    }
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // Telefonda küçültme modülü yok: kalite düşürülerek boyut sınırda tutuluyor
    quality: Platform.OS === 'web' ? 1 : 0.6,
    base64: Platform.OS !== 'web',
    allowsMultipleSelection: source === 'library',
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets) return [];
  return Promise.all(result.assets.map(toPagePhoto));
}

async function toPagePhoto(asset: ImagePicker.ImagePickerAsset): Promise<PagePhoto> {
  counter += 1;
  const id = `${Date.now().toString(36)}-${counter}`;
  const base64 = Platform.OS === 'web' ? await downscaleOnWeb(asset.uri) : asset.base64;
  if (!base64) throw new Error('Fotoğraf okunamadı.');
  if (base64.length > MAX_BASE64) {
    throw new Error('Fotoğraf çok büyük. Daha düşük çözünürlükle çekmeyi dene.');
  }
  // Telefonda base64 hep JPEG (bkz. expo-image-picker); web'de tuvalden JPEG
  return { id, uri: asset.uri, image: { mediaType: 'image/jpeg', base64 } };
}

/** Tarayıcıda: görseli tuvale çizip uzun kenarı `MAX_EDGE` olacak şekilde JPEG'e çevirir */
async function downscaleOnWeb(uri: string): Promise<string> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Fotoğraf açılamadı.'));
    image.src = uri;
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tarayıcı tuvali desteklemiyor.');
  // Saydam PNG'de zemin siyah çıkmasın
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
