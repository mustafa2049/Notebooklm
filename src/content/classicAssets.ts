// Üretildi: scripts/fetch-classics.mjs — elle düzenleme.
/* eslint-disable @typescript-eslint/no-require-imports */

const BASE = 'https://tr.wikisource.org/wiki/';

/**
 * Klasiklerin cihazdaki kopyaları: Vikikaynak bağlantısı → varlık (işlenmiş
 * HTML, `.txt` uzantılı). İçe aktarma internetsiz çalışsın diye.
 */
export const CLASSIC_ASSETS: Record<string, number> = {
  [`${BASE}Kaşağı`]: require('../../assets/classics/kasagi.txt'),
  [`${BASE}Diyet`]: require('../../assets/classics/diyet.txt'),
  [`${BASE}Forsa`]: require('../../assets/classics/forsa.txt'),
  [`${BASE}Pembe_İncili_Kaftan`]: require('../../assets/classics/pembe-incili-kaftan.txt'),
  [`${BASE}Falaka`]: require('../../assets/classics/falaka.txt'),
  [`${BASE}Bomba`]: require('../../assets/classics/bomba.txt'),
  [`${BASE}Yalnız_Efe`]: require('../../assets/classics/yalniz-efe.txt'),
  [`${BASE}Başını_Vermeyen_Şehit`]: require('../../assets/classics/basini-vermeyen-sehit.txt'),
  [`${BASE}Kesik_Bıyık`]: require('../../assets/classics/kesik-biyik.txt'),
  [`${BASE}Topuz`]: require('../../assets/classics/topuz.txt'),
  [`${BASE}Ferman`]: require('../../assets/classics/ferman.txt'),
  [`${BASE}Teke_Tek`]: require('../../assets/classics/teke-tek.txt'),
  [`${BASE}Kütük`]: require('../../assets/classics/kutuk.txt'),
  [`${BASE}And`]: require('../../assets/classics/and.txt'),
  [`${BASE}Bahar_ve_Kelebekler`]: require('../../assets/classics/bahar-ve-kelebekler.txt'),
  [`${BASE}Hürriyet_Bayrakları`]: require('../../assets/classics/hurriyet-bayraklari.txt'),
  [`${BASE}Primo_Türk_Çocuğu`]: require('../../assets/classics/primo-turk-cocugu.txt'),
  [`${BASE}Kurbağa_Duası`]: require('../../assets/classics/kurbaga-duasi.txt'),
  [`${BASE}Perili_Köşk`]: require('../../assets/classics/perili-kosk.txt'),
  [`${BASE}Tos`]: require('../../assets/classics/tos.txt'),
  [`${BASE}Pireler`]: require('../../assets/classics/pireler.txt'),
  [`${BASE}Yüksek_Ökçeler`]: require('../../assets/classics/yuksek-okceler.txt'),
  [`${BASE}Keramet`]: require('../../assets/classics/keramet.txt'),
  [`${BASE}Bir_Kayışın_Tesiri`]: require('../../assets/classics/bir-kayisin-tesiri.txt'),
  [`${BASE}İstiklâl_Marşı`]: require('../../assets/classics/istiklal-marsi.txt'),
  [`${BASE}Çanakkale_Şehitlerine`]: require('../../assets/classics/canakkale-sehitlerine.txt'),
  [`${BASE}Küfe`]: require('../../assets/classics/kufe.txt'),
  [`${BASE}Seyfi_Baba`]: require('../../assets/classics/seyfi-baba.txt'),
};
