import { Platform } from 'react-native';

/**
 * Metin dosyasını kullanıcıya verir: web'de dosya iner, telefonda paylaşım
 * menüsü açılır (Drive'a, e-postaya, dosyalara kaydetmek için). Yedek ve
 * not dışa aktarma bunu kullanır.
 */
export async function shareFile({
  fileName,
  content,
  mimeType,
  dialogTitle,
}: {
  fileName: string;
  content: string;
  mimeType: string;
  dialogTitle: string;
}): Promise<{ fileName: string; bytes: number }> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { fileName, bytes: blob.size };
  }

  const [{ File, Paths }, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Bu cihazda paylaşım kullanılamıyor.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
  return { fileName, bytes: content.length };
}
