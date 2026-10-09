/**
 * Klasikler: telif süresi dolmuş Türk edebiyatından, Vikikaynak'ta tam metni
 * bulunan eserler. Tek dokunuşla kütüphaneye eklenir (mevcut bağlantıdan
 * içe aktarma yoluyla — internet gerekir).
 *
 * Telif: Türkiye'de koruma, eser sahibinin ölümünden itibaren 70 yıl sürer
 * (FSEK m. 27). Ömer Seyfettin 1920'de öldü; eserleri kamu malıdır.
 *
 * **Her bağlantı listeye girmeden önce tek tek açılıp tam metnin sayfada
 * olduğu doğrulandı.** Başka yazarlardan denenen sayfalar (Sait Faik,
 * Sabahattin Ali, Namık Kemal) Vikikaynak'ta bu adlarla bulunamadığı için
 * listeye alınmadı; doğrulanmamış bağlantı göstermek, kullanıcıyı hata
 * ekranına göndermek demek.
 */

export interface Classic {
  title: string;
  author: string;
  /** Kısa tanıtım (içeriği ele vermeden) */
  blurb: string;
  url: string;
}

const BASE = 'https://tr.wikisource.org/wiki/';

export const CLASSICS: Classic[] = [
  {
    title: 'Kaşağı',
    author: 'Ömer Seyfettin',
    blurb: 'Bir çocukluk anısı ve vicdanın ağırlığı.',
    url: `${BASE}Kaşağı`,
  },
  {
    title: 'Diyet',
    author: 'Ömer Seyfettin',
    blurb: 'Demirci Koca Ali ve verilmiş bir söz.',
    url: `${BASE}Diyet`,
  },
  {
    title: 'Forsa',
    author: 'Ömer Seyfettin',
    blurb: 'Akdeniz kıyısında, esir bir denizcinin hikâyesi.',
    url: `${BASE}Forsa`,
  },
  {
    title: 'Pembe İncili Kaftan',
    author: 'Ömer Seyfettin',
    blurb: 'Divanda geçen bir onur hikâyesi.',
    url: `${BASE}Pembe_İncili_Kaftan`,
  },
  {
    title: 'Falaka',
    author: 'Ömer Seyfettin',
    blurb: 'Mahalle mektebinden çocukluk anıları.',
    url: `${BASE}Falaka`,
  },
  {
    title: 'Bomba',
    author: 'Ömer Seyfettin',
    blurb: 'Balkanlarda, bir kış gecesi.',
    url: `${BASE}Bomba`,
  },
  {
    title: 'Yalnız Efe',
    author: 'Ömer Seyfettin',
    blurb: 'Dağlarda dilden dile dolaşan bir efsane.',
    url: `${BASE}Yalnız_Efe`,
  },
  {
    title: 'Başını Vermeyen Şehit',
    author: 'Ömer Seyfettin',
    blurb: 'Bir bayram arifesinde sınır kalesi.',
    url: `${BASE}Başını_Vermeyen_Şehit`,
  },
  {
    title: 'Kesik Bıyık',
    author: 'Ömer Seyfettin',
    blurb: 'Moda uğruna kesilen bir bıyığın mizahi hikâyesi.',
    url: `${BASE}Kesik_Bıyık`,
  },
];

/** Yazara göre gruplar; yazarlar listedeki ilk geçiş sırasıyla */
export function classicsByAuthor(list: Classic[] = CLASSICS): { author: string; items: Classic[] }[] {
  const groups = new Map<string, Classic[]>();
  for (const classic of list) groups.set(classic.author, [...(groups.get(classic.author) ?? []), classic]);
  return [...groups.entries()].map(([author, items]) => ({ author, items }));
}
