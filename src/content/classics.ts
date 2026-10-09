/**
 * Klasikler: telif süresi dolmuş Türk edebiyatından, Vikikaynak'ta tam metni
 * bulunan eserler. Tek dokunuşla kütüphaneye eklenir (mevcut bağlantıdan
 * içe aktarma yoluyla — internet gerekir).
 *
 * Telif: Türkiye'de koruma, eser sahibinin ölümünden itibaren 70 yıl sürer
 * (FSEK m. 27). Ömer Seyfettin 1920'de, Mehmet Âkif Ersoy 1936'da öldü;
 * eserleri kamu malıdır.
 *
 * **Her bağlantı listeye girmeden önce tek tek açılıp tam metnin ve yazar
 * adının sayfada olduğu doğrulandı** (Vikikaynak'ın hız sınırına takılmamak
 * için istekler arası 20 sn). Bu adlarla bulunamayanlar listeye alınmadı:
 * Sabahattin Ali (Kağnı, Ses, Değirmen), Halit Ziya (Mai ve Siyah, Bir Yazın
 * Tarihi), Hüseyin Rahmi (Gulyabani, Şıpsevdi), Araba Sevdası, Sergüzeşt,
 * İntibah, Eylül, Karabibik, Felatun Bey ile Rakım Efendi ve Ömer Seyfettin'in
 * Gizli Mabet, Efruz Bey, Harem, Kızıl Elma Neresi, Beyaz Lale, Nakarat, Eski
 * Kahramanlar öyküleri. Tevfik Fikret'in "Han-ı Yağma"sı düzenleme uyarılı,
 * Ahmet Haşim'in "Merdiven"i çok kısa olduğu için alınmadı. Doğrulanmamış
 * bağlantı göstermek, kullanıcıyı hata ekranına göndermek demek.
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
  {
    title: 'Topuz',
    author: 'Ömer Seyfettin',
    blurb: 'İlk yayım: Yeni Mecmua, 1917.',
    url: `${BASE}Topuz`,
  },
  {
    title: 'Ferman',
    author: 'Ömer Seyfettin',
    blurb: 'İlk yayım: Yeni Mecmua, 1917.',
    url: `${BASE}Ferman`,
  },
  {
    title: 'Teke Tek',
    author: 'Ömer Seyfettin',
    blurb: 'İlk yayım: Yeni Mecmua, 1917.',
    url: `${BASE}Teke_Tek`,
  },
  {
    title: 'Kütük',
    author: 'Ömer Seyfettin',
    blurb: 'İlk yayım: Yeni Mecmua, 1917.',
    url: `${BASE}Kütük`,
  },
  {
    title: 'And',
    author: 'Ömer Seyfettin',
    blurb: 'İlk yayım: Genç Kalemler, 1912.',
    url: `${BASE}And`,
  },
  {
    title: 'Bahar ve Kelebekler',
    author: 'Ömer Seyfettin',
    blurb: 'İlk yayım: Genç Kalemler, 1911.',
    url: `${BASE}Bahar_ve_Kelebekler`,
  },
  {
    title: 'Hürriyet Bayrakları',
    author: 'Ömer Seyfettin',
    blurb: 'İlk yayım: Türk Yurdu, 1916.',
    url: `${BASE}Hürriyet_Bayrakları`,
  },
  {
    title: 'Primo Türk Çocuğu',
    author: 'Ömer Seyfettin',
    blurb: '“Serin ve karanlık…” diye başlayan uzun öykü.',
    url: `${BASE}Primo_Türk_Çocuğu`,
  },
  {
    title: 'Kurbağa Duası',
    author: 'Ömer Seyfettin',
    blurb: 'Reşat Nuri’ye ithaf edilmiş bir taşra hikâyesi.',
    url: `${BASE}Kurbağa_Duası`,
  },
  {
    title: 'Perili Köşk',
    author: 'Ömer Seyfettin',
    blurb: 'Perili denen bir köşk ve Sermet Bey.',
    url: `${BASE}Perili_Köşk`,
  },
  {
    title: 'Tos',
    author: 'Ömer Seyfettin',
    blurb: '“İki saattir eski geyik postu seccadesinin üstünde…”',
    url: `${BASE}Tos`,
  },
  {
    title: 'Pireler',
    author: 'Ömer Seyfettin',
    blurb: '“Aşk filan değil…” diye başlayan bir rastlantı hikâyesi.',
    url: `${BASE}Pireler`,
  },
  {
    title: 'Yüksek Ökçeler',
    author: 'Ömer Seyfettin',
    blurb: 'Göztepe’deki köşkünde yaşayan genç dul Hatice Hanım.',
    url: `${BASE}Yüksek_Ökçeler`,
  },
  {
    title: 'Kerâmet',
    author: 'Ömer Seyfettin',
    blurb: '“Yangın yarım saatten beri devam ediyordu…”',
    url: `${BASE}Keramet`,
  },
  {
    title: 'Bir Kayışın Tesiri',
    author: 'Ömer Seyfettin',
    blurb: '“Bir zabit arkadaşımla oturuyorduk…”',
    url: `${BASE}Bir_Kayışın_Tesiri`,
  },
  {
    title: 'İstiklâl Marşı',
    author: 'Mehmet Âkif Ersoy',
    blurb: '1921’de kabul edilen millî marşın tam metni.',
    url: `${BASE}İstiklâl_Marşı`,
  },
  {
    title: 'Çanakkale Şehitlerine',
    author: 'Mehmet Âkif Ersoy',
    blurb: 'Safahat’ın “Âsım” kitabından; ilk yayım Sebîlürreşâd, 1924.',
    url: `${BASE}Çanakkale_Şehitlerine`,
  },
  {
    title: 'Küfe',
    author: 'Mehmet Âkif Ersoy',
    blurb: 'Safahat’tan manzum bir hikâye.',
    url: `${BASE}Küfe`,
  },
  {
    title: 'Seyfi Baba',
    author: 'Mehmet Âkif Ersoy',
    blurb: 'Safahat’tan: “Geçen akşam eve geldim…”',
    url: `${BASE}Seyfi_Baba`,
  },
];

/** Yazara göre gruplar; yazarlar listedeki ilk geçiş sırasıyla */
export function classicsByAuthor(list: Classic[] = CLASSICS): { author: string; items: Classic[] }[] {
  const groups = new Map<string, Classic[]>();
  for (const classic of list) groups.set(classic.author, [...(groups.get(classic.author) ?? []), classic]);
  return [...groups.entries()].map(([author, items]) => ({ author, items }));
}
