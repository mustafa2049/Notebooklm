import { Platform, Share } from 'react-native';

/**
 * Metni paylaşır: telefonda sistem paylaşım menüsü, web'de panoya kopyalama
 * (tarayıcıların paylaşım desteği tutarsız). Kopyalanamazsa `failed`.
 */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  try {
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'failed';
  }
}
