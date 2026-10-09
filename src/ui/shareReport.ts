import { Platform, Share } from 'react-native';
import { reportSvg, reportText, type ReportPalette, type WeeklyReport } from '@/habit/report';
import { QUOTE_CARD_SIZE, quoteSvg, quoteText, type QuoteInput, type QuotePalette } from '@/habit/quoteCard';
import { YEAR_CARD_SIZE, yearSvg, yearText, type YearReport } from '@/habit/yearReport';

/**
 * Kartları paylaşır. Web'de kart PNG olarak iner (SVG → tuval → PNG);
 * telefonda düz metin özeti sistem paylaşım menüsüyle gönderilir. Görsel
 * paylaşım telefonda ek bir yerel modül gerektirdiği için yapılmıyor.
 */
async function shareCard(card: {
  svg: string;
  width: number;
  height: number;
  /** Uzantısız dosya adı. Yalnızca ASCII: tarayıcılar bazı karakterlerde adı yok sayıyor */
  fileName: string;
  text: string;
}): Promise<'downloaded' | 'shared'> {
  if (Platform.OS !== 'web') {
    await Share.share({ message: card.text });
    return 'shared';
  }

  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Kart çizilemedi.'));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(card.svg)}`;
  await loaded;

  // 2× çözünürlük: telefonda paylaşıldığında bulanık görünmesin
  const canvas = document.createElement('canvas');
  canvas.width = card.width * 2;
  canvas.height = card.height * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tarayıcı tuvali desteklemiyor.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Kart görsele çevrilemedi.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.fileName}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

function dateStamp(): string {
  const today = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

export function shareWeeklyReport(report: WeeklyReport, palette: ReportPalette): Promise<'downloaded' | 'shared'> {
  return shareCard({
    svg: reportSvg(report, palette),
    width: 600,
    height: 600,
    fileName: `okuma-haftam-${dateStamp()}`,
    text: reportText(report),
  });
}

export function shareYearReport(report: YearReport, palette: ReportPalette): Promise<'downloaded' | 'shared'> {
  return shareCard({
    svg: yearSvg(report, palette),
    ...YEAR_CARD_SIZE,
    fileName: `okuma-yilim-${report.year}`,
    text: yearText(report),
  });
}

export function shareQuoteCard(quote: QuoteInput, palette: QuotePalette): Promise<'downloaded' | 'shared'> {
  return shareCard({
    svg: quoteSvg(quote, palette),
    ...QUOTE_CARD_SIZE,
    fileName: `alinti-${dateStamp()}`,
    text: quoteText(quote),
  });
}
