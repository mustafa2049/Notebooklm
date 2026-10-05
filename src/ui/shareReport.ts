import { Platform, Share } from 'react-native';
import { reportSvg, reportText, type ReportPalette, type WeeklyReport } from '@/habit/report';

/**
 * Haftalık kartı paylaşır. Web'de kart PNG olarak iner (SVG → tuval → PNG);
 * telefonda düz metin özeti sistem paylaşım menüsüyle gönderilir. Görsel
 * paylaşım telefonda ek bir yerel modül gerektirdiği için yapılmıyor.
 */
export async function shareWeeklyReport(
  report: WeeklyReport,
  palette: ReportPalette
): Promise<'downloaded' | 'shared'> {
  if (Platform.OS !== 'web') {
    await Share.share({ message: reportText(report) });
    return 'shared';
  }

  const svg = reportSvg(report, palette);
  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Kart çizilemedi.'));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await loaded;

  // 2× çözünürlük: telefonda paylaşıldığında bulanık görünmesin
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tarayıcı tuvali desteklemiyor.');
  context.drawImage(image, 0, 0, 1200, 1200);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Kart görsele çevrilemedi.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const today = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');
  // Dosya adında yalnızca ASCII: tarayıcılar bazı karakterlerde adı yok sayıyor
  link.download = `okuma-haftam-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
