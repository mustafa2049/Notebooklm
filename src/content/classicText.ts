import { readAssetText } from '@/ingest/assetText';
import { extractUrl } from '@/ingest/fromUrl';
import { htmlToText } from '@/ingest/html2text';
import { normalizeText } from '@/ingest/normalize';
import { CLASSIC_ASSETS } from './classicAssets';
import type { Classic } from './classics';

/**
 * Klasiğin metni: uygulamayla gelen kopyadan (internet gerekmez, bkz.
 * `scripts/fetch-classics.mjs`), yoksa ya da okunamazsa Vikikaynak'tan.
 * Gömülü kopya çevrimiçi yoldakiyle aynı `htmlToText`'ten geçer.
 */
export async function classicText(classic: Classic, proxy: string): Promise<string> {
  const asset = CLASSIC_ASSETS[classic.url];
  if (asset !== undefined) {
    try {
      const text = normalizeText(htmlToText(await readAssetText(asset)));
      if (text.trim().length > 200) return text;
    } catch {
      // Varlık okunamazsa çevrimiçi yol
    }
  }
  return (await extractUrl(classic.url, proxy)).text;
}
