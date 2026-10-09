# Hızlı Okuma

Türkçeye göre ayarlanmış bir hızlı okuma uygulaması. Kendi metinlerini
(yapıştırma, TXT, EPUB, PDF, bağlantı) alıp dört farklı teknikle okutur,
ilerlemeni ve hızını cihazda saklar, hız antrenmanı egzersizleri sunar.

Expo (React Native) ile yazıldı: aynı kod hem Android'de hem tarayıcıda çalışır.

## Kurulum

```bash
npm install
npm run web        # tarayıcıda
npm start          # Expo Go ile telefonda (QR)
```

```bash
npm test           # okuma motorunun testleri
npm run typecheck  # tip kontrolü
```

## Okuma modları

| Mod | Ne yapar | Neye iyi gelir |
|---|---|---|
| **Kelime akışı** (RSVP) | Kelimeler ekranda sabit bir noktada tek tek belirir | Göz hiç hareket etmez, sakkadlar sıfırlanır |
| **Parça parça** | 2–4 kelime birlikte gösterilir | Çevresel görüşü kullanmayı öğretir |
| **Bionic** | Kelimelerin ilk heceleri koyulaştırılır | Kelime, tamamı taranmadan tanınır |
| **Yürüyen vurgu** | Normal paragraf üzerinde akan vurgu | Geri dönüşleri (regresyon) engeller |
| **Sayfa** | Metin kitap gibi sayfa sayfa; tempo yok, sayfayı sen çevirirsin | Öğrendiğini doğal okumaya aktarmak |

Kelime grubu boyutu (1–4) tempolu modların hepsinde ayarlanabilir; "Parça
parça" bunun hazır bir profili.

## Sayfa modu

- Sağa dokun ya da sola kaydır: sonraki sayfa; sol kenara dokun ya da sağa
  kaydır: önceki sayfa. Web'de ←/→, PageUp/PageDown, boşluk. Alt çubuktaki
  kaydırıcı sayfaya atlar; kalan süre son ölçümdeki doğal hızınla tahmin
  edilir. Uzun bas → "Hangi cümle?" → alıntı ya da kelime defteri.
- Sayfalar **yükseklikle** kuruluyor: her paragrafın kaç satır tutacağı, gizlice
  çizilen bir örnek paragrafla ölçülen satır kapasitesinden hesaplanıyor
  (yazı tipi, boyut ve ekran genişliği ne olursa olsun). Çizilen sayfa yine de
  alanı aşarsa pay küçülüp sayfalar yeniden kuruluyor — metin kesilmiyor.
  3 yazı tipi × 3 satır aralığı × %70–200 boyutta denendi, hiçbir sayfa
  taşmadı.
- Okuma süresi sayfanın ekranda kaldığı süreden sayılıyor, ama açık bırakılan
  ekran okuma sayılmıyor (sayfa başına en çok 50 kel/dk'lık süre) ve hızla
  çevrilen sayfanın kelimeleri sayılmıyor (1000 kel/dk'dan hızlı). Oturumlar
  günlük süreye ve seriye sayılır, "antrenman temposu" istatistiğine girmez.
  Odak seansı, göz molası ve "Aklında ne kaldı?" kartı sayfa modunda da çalışır.

## Okuma görünümü

Okuyucuda başlıktaki **Aa** (ya da Ayarlar → Okuma görünümü): mod, yazı boyutu
(%70–200; web'de +/− tuşları), satır aralığı (sıkı/normal/geniş), yazı tipi
(sistem, tırnaklı, disleksi dostu) ve renkler. Okuma görünümü uygulama
temasından ayrı: arayüz koyu kalırken metin sepya zeminde okunabilir; okuyucu,
antrenman ve ölçüm ekranları bununla çiziliyor.

- **Renk temaları**: Uygulamayla aynı, Koyu, Siyah (OLED), Gece (sıcak), Açık,
  Beyaz, Sepya, Yeşil. Testler her temada yazı/zemin kontrastının en az 7:1
  olduğunu doğruluyor.
- **Yazı rengi**: seçili zeminde rahat okunmayan (WCAG 4,5:1 altı) renkler
  listede hiç çıkmıyor; tema değişip seçili renk okunmaz kalırsa temanın rengi
  kullanılıyor ve bu yazıyor.
- **Özel renkler**: zemin ve yazı serbest seçilebilir (ızgara ya da renk kodu);
  kontrast oranı canlı gösteriliyor, 3:1'in altında "Uygula" kapalı.
- **Sayfa düzeni**: kenar boşluğu (dar/normal/geniş), sola ya da iki yana
  yaslama, harf aralığı, kelime aralığı ve satır sonunda heceleme. React
  Native'de `hyphens` ve `wordSpacing` stili olmadığı için ikisi görünmez
  işaretlerle yapılıyor (`src/core/typeset.ts`, testli): heceleme uzun
  kelimelere hece sınırlarında yumuşak tire (U+00AD) koyuyor — Türkçe hece
  yapısı düzenli, sözlük gerekmiyor; baş ve sonda tek harf ayrılmıyor, büyük
  harfli kısaltmalar bölünmüyor. Kelime aralığı her boşluktan önce ince boşluk
  (U+2009). Sayfalama aynı dönüşümü ölçüm paragrafına da uyguluyor; 5 düzen ×
  3 yazı tipi × 4 boyutta (60 yapılandırma) hiçbir sayfa taşmadı. Android'de
  yumuşak tire yalnızca heceleme açıkken dikkate alındığı için o anda
  `android_hyphenationFrequency` da açılıyor; Bionic modda heceleme yok (kelime
  iki parçaya bölünüyor).
- **Akşam sıcak tonu** (Aa → en alt, varsayılan kapalı): seçilen saatler
  arasında (ör. 21:00–07:00, gece yarısını aşabilir) okuma teması kendiliğinden
  Gece, Sepya ya da Siyah olur; sabah seçtiğin temaya döner. Saat dakikada bir
  kontrol ediliyor; akşam tonunda yazı rengi temanın kendi rengi
  (`src/appearance/evening.ts`, testli).
- **Ekranı açık tut** (varsayılan açık): okurken ekran kararmıyor
  (`expo-keep-awake`; web'de tarayıcının Wake Lock API'si, her tarayıcıda yok).
  10 dakika hiçbir şey olmazsa (sayfa çevrilmez, RSVP ilerlemezse) kilit
  bırakılıyor; açık unutulan telefon pili bitirmesin.

## Arama ve yer imleri

- **Ara**: okuyucuda büyüteç (yapay zekâ açıksa ✦ panelinde "Ara" sekmesi);
  web'de `/` ya da Ctrl+F. Tarayıcının kendi araması Sayfa modunda yalnızca
  görünen sayfayı görür; bu arama metnin tamamında. Büyük/küçük harf Türkçe
  kurallarıyla ("İSTANBUL" ↔ "istanbul", "IŞIK" ↔ "ışık"), satır sonu ve çift
  boşluk fark etmiyor. Aranan sözde Türkçe harf yoksa şapkasız yazım da
  bulunuyor ("ogretmen" → "öğretmen"); Türkçe harf varsa yazıldığı gibi
  ("ılık", "ilik"i bulmaz). Sonuca dokununca o yere gidiliyor; Sayfa modunda
  bulunan cümle, sayfa çevrilene kadar vurgulu. En çok 200 sonuç listeleniyor,
  toplam yine yazıyor (`src/core/search.ts`, testli).
- **Yer imi**: başlıktaki yer imi düğmesi (web'de B). Sayfa modunda görünen
  sayfa, diğer modlarda okunan cümle imlenir; bulunulan yerde yer imi varsa
  düğme dolu ve dokununca kalkar. "İmler" sekmesinde sayfa numarası (ya da
  yüzde) ve ilk kelimelerle listelenir. Yedeğe dahil; kitap silinince yer
  imleri de silinir (alıntılar defterde kalır).
- Odak modu düğmesi yer açmak için **Aa** paneline taşındı (F tuşu aynı).
- İlerleme, sayfa çevrilip 2 sn içinde uygulamadan çıkılsa da kaydediliyor
  (arka plana alınma / sekme kapanma anında yazılıyor).

## Kitap kartı ve bitirme planı

Kütüphanede kitabın yanındaki kitap simgesi **kitap kartını** açar: ilerleme,
harcanan süre, okuduğun günler, ilk/son okuma, bu kitaptaki kendi hızın (Sayfa
modundan; en az 2 dakikalık okumayla), bu tempoyla bitiş tahmini, bölümler, yer
imleri, alıntılar, özetlerin ve bu kitaptan kaydettiğin kelimeler. Bölüme, yer
imine ya da alıntıya dokununca okuyucu o yerden açılır.

**Bitirme planı** ("X günde bitir", `src/habit/bookPlan.ts`, testli): 3/7/14/30
gün ya da gün gün ayarlanır; bugün 1. gün sayılır. Her günün payı **günün
başında kalan kelimenin kalan günlere bölünmesiyle** bulunur: geride kalınca
kalan kendiliğinden sonraki günlere yayılır, önde gidince pay küçülür — "dünü
telafi et" diye ayrıca yük binmez. Durum: Öndesin / Yolunda / Geride / Süre
doldu / Bitti (yarım günlük pay kadar fark gerekiyor). Dakika karşılığı son
ölçümdeki doğal hızla. Bugün ekranında "Kitap planın" kartı, kütüphanede plan
satırı. Planlar yedeğe dahil; kitap silinince planı da silinir.

## Okuma günlüğü ve "Okuma yılım" kartı

- Kitap kartında **Bitirdim** (kâğıttan ya da başka yerde bitirilen kitap
  için de) ve bitince 1–5 yıldız + kısa not. Günlük yedeğe dahil; kitap
  kütüphaneden silinse de günlükte kalır.
- **Okuduğum kitaplar** (Kütüphane başlığındaki bağlantı, kitap kartı ya da
  Bugün'deki yıllık hedef kartı): bitirilenler yıl yıl, puan ve notuyla. Kısa
  metinler (5.000 kelimenin altı) günlüğe yazılmadıkça kitap sayılmaz.
- Her yıl için **Okuma yılım** kartı (`src/habit/yearReport.ts`, testli):
  bitirilen kitap, okuma süresi, kelime, okunan gün, en uzun seri, yılın kitabı
  (en yüksek puan) ve yılın alıntısı (notlu olan öncelikli). Haftalık kartla aynı
  yöntem: web'de PNG iner, telefonda metin paylaşılır.

## Türkçeye özel davranışlar

Bunlar sonradan eklenmiş süsler değil, motorun içindeki kararlar:

- **Cümle bölme.** Türkçede nokta her zaman cümle bitirmez. Kısaltma sözlüğü
  (`Dr.`, `vb.`, `M.Ö.`), ondalık sayı ve tarihler (`3.14`, `12.08.2026`), tek
  harflik baş harfler (`M. Kemal`) ve "nokta sonrası küçük harf" sezgisi yanlış
  bölmeleri engelliyor.
- **Heceleme.** Türkçe hece yapısı düzenli olduğu için sözlük gerekmiyor; 14
  harfi geçen kelimeler hece sınırından bölünüp iki karede gösteriliyor
  (`gözlemleyebileceğimizi` → `gözlemleye` + `bileceğimizi`).
- **Pivot (ORP).** Gözün sabitlendiği harf, klasik uzunluk tablosundan sonra en
  yakın sesli harfe kaydırılıyor. Pivot ekranın ortasında değil %40'ında: Türkçede
  ekler sona geldiği için pivot sonrası bölüm daha uzun, sağa yer ayırmak aynı
  ekranda daha büyük yazı demek.
- **Büyük harf.** Arayüzdeki büyük harfli etiketler CSS ile değil Türkçe
  kurallarıyla üretiliyor: `textTransform: uppercase` "en iyi hız"ı "EN IYI HIZ"
  yapıyordu, doğrusu "EN İYİ HIZ".

## Mimari

Okuma motoru (`src/core/`) saf TypeScript — React ve platform bağımlılığı yok,
dolayısıyla test edilebiliyor. Dört mod aynı motoru paylaşır, yalnızca çizim
katmanı değişir.

```
src/
  core/        tokenizer, heceleme, ORP, chunker, tempo, oynatma saati, sayfalama, cloze
  reader/      motoru süren hook + üç çizim katmanı + kontroller
  ingest/      metin normalleştirme, TXT/PDF/EPUB/URL çıkarımı
  storage/     ayarlar, kütüphane, ilerleme, istatistikler (hepsi cihazda)
  train/       antrenman egzersizlerinin tanımı
  ui/          tema, ikonlar (SVG), temel bileşenler
app/           expo-router ekranları
```

İki tasarım kararı dikkate değer:

**Oynatma saati `setInterval` kullanmıyor.** Her tur bir miktar gecikme eklediği
için hata birikir (500 kelime/dk'da dakikalar içinde saniyeler kayar) ve sekme
arka plana alındığında bozulur. Yerine hedef zaman biriktiren saf bir durum
makinesi var (`core/scheduler.ts`): `nextDueAt += süre`. Kare gecikmeleri
birbirini götürüyor, tempo doğruluğu da gerçek zaman beklemeden test edilebiliyor.

**İlerleme karakter offseti olarak saklanıyor**, chunk indeksi olarak değil.
Kullanıcı kelime grubu boyutunu ya da modu değiştirdiğinde chunk listesi baştan
kurulup indeksler kayıyor; karakter offseti sabit kaldığı için okuyucu yerini
kaybetmiyor.

## Bilinen sınırlar

- **Telefonda PDF gizli bir WebView üzerinden okunuyor ve henüz gerçek cihazda
  denenmedi.** pdf.js tarayıcı için yazılmış (dinamik `import()`, WebAssembly,
  `ImageData`) ve Hermes onu derleyemiyor; bu yüzden telefonda kod Android'in
  WebView'inde (Chromium) çalışıyor. Köprünün sayfası ve paylaşılan metin
  üretme algoritması gerçek Chromium'da test edildi, ama React Native
  tarafındaki bağlantı (varlık okuma, `postMessage`) yalnızca cihazda
  doğrulanabilir. Web'de pdf.js doğrudan uygulamada çalışıyor.
- **Taranmış PDF'lerde metin katmanı olmadığı için okuma yapılamıyor**; uygulama
  bunu açıkça söylüyor, OCR yok.
- **Bağlantıdan okuma web'de vekil sunucu gerektiriyor.** Tarayıcılar başka
  sitelere doğrudan istek atmayı engelliyor (CORS); varsayılan `r.jina.ai`
  üçüncü taraf bir servis ve Ayarlar'dan değiştirilebilir. Telefonda böyle bir
  kısıt olmadığı için sayfa doğrudan indiriliyor.
- **Paylaş menüsü yalnızca kurulu web uygulamasında çıkıyor.** Aşağıya bakın:
  Android'in paylaş listesinde görünmek için uygulamanın telefona kurulmuş olması
  gerekiyor. Expo Go ile açılan sürüm paylaş listesine çıkmıyor; çıkması için
  ACTION_SEND intent filtresi ve intent ekstralarını okuyan bir native modül
  (dev build) gerekiyor — Expo'nun `Linking` API'si yalnızca bağlantı adresini
  veriyor, paylaşılan metni vermiyor.

## Yapay zekâ (isteğe bağlı)

Ayarlar → Yapay zekâ bölümünden bir sağlayıcı tanımlanınca özet, gerçek anlama
soruları, kelime açıklaması, metinle sohbet ve bölümlere ayırma açılıyor. Hiçbir
şey girilmezse uygulama bunlar olmadan tam çalışıyor.

- **Sağlayıcı seçilebilir.** İki API biçimi destekleniyor: Claude (Anthropic
  Messages API) ve OpenAI uyumlu `/chat/completions` — yani OpenAI, Gemini
  uyumluluk adresi, OpenRouter, Groq, DeepSeek ve bilgisayarda çalışan yerel
  modeller (Ollama, LM Studio). Yeni bir sağlayıcı eklemek `AiProvider`
  arayüzünü uygulayan tek bir dosya yazmak demek (`src/ai/`).
- **Anahtar cihazda duruyor.** Hiçbir sunucuya gönderilmiyor, yalnızca seçilen
  sağlayıcıya gidiyor. Web'de tarayıcı deposunda durduğu için o tarayıcı
  profiline erişen biri okuyabilir — ortak bilgisayarda kullanılmamalı.
- **Harcama görünür.** Her çağrıdan sonra kullanılan token yazıyor; Ayarlar'a
  1M token fiyatı girilirse tahmini tutar da gösteriliyor. Fiyat tablosu koda
  gömülmedi: sağlayıcı kullanıcının seçimi ve fiyatlar değişiyor, gömülü tablo
  bir süre sonra yanlış sayı gösterirdi.
- **Özet, bölümler ve sorular doküman başına saklanıyor**; aynı çıktı için ikinci
  kez ödeme yapılmıyor.
- **Model adı kullanıcıdan.** Girilen model `output_config` ya da
  `response_format` desteklemiyorsa istek bu alanlar düşürülüp yeniden deneniyor;
  istem JSON biçimini zaten tarif ediyor ve yanıt çalışma anında doğrulanıyor.

## Fotoğraftan metin

İçe aktarma → **Fotoğraf**: basılı kitabın sayfalarını kamerayla çek ya da
galeriden seç (birden çok sayfa); her sayfa yapay zekâyla metne çevrilip
sırayla eklenir, kaydetmeden önce düzeltilebilir. Kurallar istemde açık
(`transcribeRequest`): birebir aktar, düzeltme/özet yok, paragrafları koru,
satır sonu tirelerini birleştir, sayfa numarası ve üst/alt bilgiyi atla, metin
yoksa "METİN YOK" yaz (uygulama bunu anlaşılır hataya çevirir; sayfaya
dokunup yeniden denenebilir). Görsel Anthropic'e `image` bloğu, OpenAI uyumlu
sağlayıcılara `image_url` (data URL) olarak gider — istek gövdeleri testli.

- Web'de fotoğraf tuvalde uzun kenarı 1600 px'e küçültülüp JPEG yapılıyor
  (sağlayıcılar zaten bu civara indiriyor; fazlası yükleme ve token israfı).
  Telefonda küçültme modülü yok; kalite %60'la boyut sınırda tutuluyor.
- Yapay zekâ tanımlı değilse sekme bunu ve nedenini söylüyor: cihazda Türkçe
  metin tanıma bu uygulama için fazla ağır. Fotoğraf yalnızca seçilen
  sağlayıcıya gider. Sayfa başına yaklaşık 2–3 bin token.
- `expo-image-picker` (Expo SDK modülü); izin metinleri `app.json`'da Türkçe,
  mikrofon izni istenmiyor.

## Word (.docx) dosyaları

Dosya seçici .docx kabul ediyor (`src/ingest/fromDocx.ts`, testli): paragraflar
ve satır sonları korunuyor, tablolar satır satır okunuyor, izlenen
değişiklikte silinmiş metin atlanıyor. **Başlık stilleri bölüm oluyor**
(EPUB'daki gibi içindekiler, uyku zamanlayıcısının "bölüm sonu" ve kitap
kartındaki bölüm listesi bunu kullanıyor); stil adları `styles.xml`'den
okunduğu için Türkçe Word'ün "Balk1" kimlikleri de tanınıyor. "Title" stili
belgenin adı oluyor. Eski .doc biçimi desteklenmiyor (anlaşılır hata).

## EPUB bölümleri

EPUB'lar artık tek metne düz biçimde birleşmiyor: bölüm başlıkları dosyanın
içindekiler tablosundan (EPUB 3'te `nav.xhtml`, EPUB 2'de `toc.ncx`; yoksa
bölümün `<h1>`/`<title>`'ı) okunuyor ve okuyucuda bölüm listesi açılıyor.
Başlıkta kaçıncı bölümde olduğun yazıyor ("3/12"), listeden dokununca o bölüme
atlıyor. Bu bölümler yapay zekâ bölümlemesinden farklı: dosyanın kendi
verisinden geldikleri için AI gerekmiyor ve AI açıkken bile bunlar
gösteriliyor — var olan bilgi için para harcanmıyor.

Bölüm konumları, her bölüm **ayrı ayrı** normalleştirilip birleştirilerek
hesaplanıyor (`joinChapters`); önce birleştirip sonra normalleştirmek konumları
kaydırırdı.

## Günlük hedef ve hatırlatıcı

Ayarlar → Alışkanlık'tan günlük kelime hedefi verilebiliyor; kütüphanenin
üstünde bugünün ilerlemesi, kalan kelime ve hedef hızında kalan süre görünüyor.
Hedef sıfıra çekilirse kart hiç çizilmiyor.

Günlük hatırlatıcı **yalnızca telefon uygulamasında** çalışıyor
(`expo-notifications`, günlük yerel bildirim). Tarayıcıda zamanlanmış bildirim
sunucu tarafı gerektirdiği için web sürümünde bu ayar yerine bunu açıklayan bir
not duruyor. Bildirim metni günlük hedefi içerdiği için uygulama her açılışta
hatırlatıcıyı yeniden planlıyor.

## Gerçek gelişimi ölçmek

Uygulamanın tempo ayarı bir beceri ölçüsü değil: 600 kelime/dakikaya ayarlayıp
ekrana bakan herkes "600 okumuş" görünür. Bu yüzden gelişim ayrıca ölçülüyor.

- **Seviye testi / haftalık ölçüm** (Antrenman → Ölçüm): gömülü bir metin
  normal sayfa düzeninde, **kendi hızında** okunur; "Bitirdim"den sonra metin
  gizlenir ve beş soru gelir. Sonuç: doğal hız, anlama ve **efektif hız = doğal
  hız × anlama**. Araştırmalar hız ile anlama arasında takas olduğunu
  gösteriyor (Rayner ve ark., 2016); yalnızca hızı izlemek anlamadan
  "hızlandığını" sanmaya götürür.
- Gerçekçi olmayan ölçümler (çok hızlı/yavaş, çok düşük anlama) saklanır ama
  trende girmez; nedeni ekranda yazar.
- **Gömülü metinler ve seviyeler**: bu uygulama için yazılmış 28 özgün Türkçe
  metin — üç seviyede 26 test metni (8 kolay, 10 orta, 8 zor) ve 2 egzersiz
  metni; her birinde 5 soru (cevabın metindeki kanıtıyla) ve tarama görevleri.
  Zorluk Ateşman (1997) okunabilirlik formülüyle ölçülüyor: kolay 70–89, orta
  50–69, zor 30–49; her seviyede metinler arası fark 15 puandan az. Egzersizler
  henüz test edilmemiş metinleri kullanmaz; tanıdık metin ölçümü şişirirdi.
- **Seviye önerisi**: aynı seviyedeki son iki ölçümde anlama %80 ve üstündeyse
  bir üst, ikisinde de %60'ın altındaysa bir alt seviye önerilir; ölçüm
  ekranında seviye elle de seçilebilir. **Gelişim yalnızca aynı seviyedeki
  ölçümler arasında karşılaştırılır** — kolay metindeki hızı zor metindekiyle
  kıyaslamak zorluk farkını gelişim gibi gösterirdi.
- Anlama testi sonuçları da kaydediliyor; **Gelişim** sekmesi efektif hızın
  ölçümler boyunca seyrini çiziyor. "Kazanılan süre" kullanıcının kendi
  başlangıç hızına göre hesaplanıyor.

## Bugün, alışkanlık ve rozetler

- **Bugün** sekmesi: seri, günlük hedef, okumaya devam (bitiş tahminiyle),
  bugün için en fazla üç öneri (ölçüm zamanı, günün ısınması, kelime tekrarı).
- **Başlangıç sihirbazı**: önce *ne zaman* okuyacağını sorar (uygulama niyeti:
  davranışı bir duruma bağlamak alışkanlığı kolaylaştırır), sonra günde kaç
  dakika (küçük başla), sonra seviye testi. Hatırlatıcı metni bu ipucuyla
  konuşur: "Akşam yemeğinden sonra: 15 dakika okuma zamanı."
- **Esnek seri**: bir gün kaçırmak seriyi bozmaz, iki gün üst üste kaçırmak
  bozar. Dün kaçırıldıysa Bugün ekranı uyarır.
- **Odak seansı**: 5–20 dakika; yalnızca okuma süresi sayılır, süre dolunca
  okuma durur.
- **Okuma takvimi** (16 hafta), haftalık karşılaştırma, kitap bitiş tahmini ve
  yıllık kitap hedefi (≥5.000 kelimelik, bu yıl bitirilen metinler).
- **Rozetler**: 14 kilometre taşı, puan/seviye yok. Hız rozeti bilerek yok;
  efektif hız gelişimi ödüllendiriliyor.

## Egzersizler

| Egzersiz | Ne çalıştırır | Not |
|---|---|---|
| Schulte tablosu | Dikkat, çevresel görüş | Okuma hızına doğrudan etkisinin kanıtı sınırlı; ısınma olarak |
| Flaş kelime | Bir bakışta tanınan kelime grubu | Merdiven yöntemiyle uyarlanır (2 doğru zorlaştırır, 1 yanlış kolaylaştırır) |
| Tarama | Aranan bilgiyi okumadan bulma | Araştırmalara göre gerçekten işe yarayan "hızlı okuma" becerilerinden |
| Göz gezdirme | Paragraf başlarından ana fikri yakalama | Okuyucudaki "Önizle" sekmesiyle aynı mantık |
| Hız egzersizleri | Isınma, hız rampası, göz genişletme, regresyon kırma | Kütüphane boşken gömülü pratik metinleriyle de çalışır |

## 4 haftalık program

Antrenman → 4 haftalık program: haftada beş kısa ders (~10 dakika). Her ders bir
ipucu, ısınma (Schulte / flaş kelime), uygulama (hız egzersizi, tarama, göz
gezdirme ya da kendi metninde odak seansı) ve anlama kontrolünden oluşuyor;
haftanın son dersi ölçüm. Haftaların teması: temel ve geri dönüşler, kelime
grupları, tempo ve tarama, pekiştirme ve aktarım.

- Adımlar uygulamanın mevcut ekranlarını açar; ders başladıktan sonra kaydedilen
  sonuçlarla işaretlenir, ekrandan çıkıp dönmek ilerlemeyi kaybettirmez.
- **Uyarlanır tempo**: anlama %80 ve üstü → program temposu %5 (en az 25) artar,
  %60–80 → aynı kalır, %60'ın altı → %10 düşer. Normal okuma ayarına dokunmaz.
- Kaçırılan gün programı sıfırlamaz: sıradaki ders takvime değil sıraya bağlı.
- Bu bir alıştırma düzeni; sonuç haftalık ölçümlerde görülür, vaat yok.

## Okuduktan sonra: alıntılar ve kendi cümlenle özet

- **Alıntı defteri**: okurken ekrana uzun bas → Alıntı. Cümle isteğe bağlı bir
  notla kaydedilir; akış modlarında işaretli cümleler hafif zeminle görünür.
  Antrenman → Alıntılar ve özetler: kitap kitap liste, dokununca metindeki
  yerine dönülür, kopyala/paylaş, sil.
- **Alıntı kartı**: alıntının yanındaki görsel düğmesi cümleyi kitabın adıyla
  kare bir karta çevirir (okuma temasının renkleriyle; web'de PNG iner,
  telefonda metin paylaşılır). Kısa alıntı büyük, uzun alıntı küçük yazıyla;
  çok uzunsa "…" ile kesilir (`src/habit/quoteCard.ts`, testli).
- **"Aklında ne kaldı?"**: odak seansı bitince, metin bitince ya da en az 3
  dakika okuyup çıkarken okuduğunu 1–2 cümleyle anlatman istenir (hatırlama
  pratiği; bir kez sorar, her zaman geçilebilir, ayardan kapatılabilir). Yapay
  zekâ tanımlıysa özet **yalnızca o oturumda okunan bölümle** karşılaştırılır:
  yakaladıkların, kaçanlar ve kısa geri bildirim (şemalı, doğrulanan yanıt).

## Dinleyerek oku

Okuyucu başlığındaki kulaklık düğmesi metni cümle cümle seslendirir ve okunan
cümleyi akış görünümünde vurgular; hız ayarı konuşma hızına eşlenir. Birim
**cümle**; ses kelime sınırlarını bildiriyorsa (`onBoundary`) okunan **kelime**
de altı çizili ve renkli gösterilir, bildirmiyorsa vurgu cümle düzeyinde kalır
— durum satırı hangisinin olduğunu yazar ("kelime kelime / cümle cümle
vurgulanır"). Kelime olayı her platformda ve her seste gelmiyor (ör. Chrome'un
ağ sesleri göndermiyor). Türkçe ses yoksa ekranda yazar. Dinleme ayrı oturum
olarak kaydedilir: günlük süreye sayılır, okuma temposu istatistiğine girmez.
Bitince okuyucu dinlemenin kaldığı cümleden devam eder. Ses çıkışı cihazın
konuşma motoruna bağlı; telefonda denenmesi gerekiyor.

**Uyku zamanlayıcısı**: dinleme satırındaki "Uyku" düğmesine dokundukça
kapalı → 10 → 20 → 30 dk → bölüm sonu (kitabın bölümleri varsa). Süre dolunca
ya da bölüm bitince ses **cümlenin sonunda** durur, kaldığın yer (sıradaki
cümle) kaydedilir; yeniden oynatınca süresi dolmuş zamanlayıcı kendiliğinden
kapanır (`src/habit/sleepTimer.ts`, testli).

## Göz molası ve haftanın kartı

- **Göz molası** (Ayarlar → kapalı/20/30 dk): belirlenen süre kadar okuyunca
  okuma durur ve 20 saniyelik "uzağa bak" sayacı açılır (20-20-20 kuralı).
  Yalnızca okuma süresi sayılır.
- **Haftanın kartı** (Gelişim): süre, gün, kelime, seri ve efektif hız. Web'de
  kart PNG olarak iner; telefonda metin özeti paylaşım menüsüyle gider (görsel
  paylaşım ek bir yerel modül gerektirdiği için yok).

## Klasikler

İçe aktarma → Klasikler: Vikikaynak'tan telif süresi dolmuş eserler, yazara
göre gruplu — Ömer Seyfettin'den 24 öykü, Mehmet Âkif Ersoy'dan 4 şiir
(İstiklâl Marşı, Çanakkale Şehitlerine, Küfe, Seyfi Baba). Her bağlantı listeye
girmeden önce tek tek açılıp tam metnin ve yazar adının sayfada olduğu
doğrulandı (Vikikaynak'ın hız sınırı yüzünden istekler arası 20 sn). Sabahattin
Ali, Halit Ziya, Hüseyin Rahmi, Recaizade, Namık Kemal, Mehmet Rauf, Nabizade
Nazım ve Ahmet Mithat'tan denenen eserler Vikikaynak'ta bu adlarla bulunamadı;
listede yok. İnternet gerektirir; web'de vekil sunucu üzerinden çekilir.

## Kelime defteri

Okurken kelimeye uzun basılınca açılan panelden kelime, **geçtiği cümleyle
birlikte** deftere kaydediliyor (yapay zekâ gerekmiyor; açıksa açıklama da not
olarak ekleniyor). Antrenman sekmesinden açılan defterde iki görünüm var: liste
ve tekrar. Tekrar aralığı basit ve açıklanabilir: bilinen kelime her doğru
tekrarda iki kat uzun aralıkla (1, 2, 4, 8… gün, en çok 30 gün), bilinmeyen
kelime aynı gün içinde yeniden soruluyor (`src/train/review.ts`, testli).

## Paylaş → Hızlı Okuma (Android)

Web sürümü PWA olarak kurulabiliyor ve kurulduğunda Android'in paylaş menüsünde
görünüyor:

1. Netlify adresini Chrome'da aç.
2. Menü → **Uygulamayı yükle** (ya da "Ana ekrana ekle").
3. Artık herhangi bir uygulamada **Paylaş → Hızlı Okuma** ile metin veya bağlantı
   gönderilebiliyor; içerik "Metin ekle" ekranına düşüyor.

Paylaşılan içerik otomatik kaydedilmiyor: Chrome bir sayfayı paylaştığında
genelde yalnızca başlık ve bağlantı gönderiyor, metnin kendisi gelmiyor. Ekranda
ne geldiği görünüyor ve ekleme kararı kullanıcıda kalıyor.

Aynı parametreler derin bağlantıyla da çalışıyor:
`hizliokuma://import?sharedText=...` veya `?sharedUrl=...`.

## Çevrimdışı kullanım (web)

Web sürümü ilk açılışta kendini tarayıcıya kaydediyor; sonraki açılışlarda
**internet olmadan da** açılıyor. Kitaplar zaten cihazda (IndexedDB), önbelleğe
alınan yalnızca uygulamanın dosyaları (~3,9 MB, PDF okuyucu dahil).

- `npm run build:web`, `expo export`'tan sonra `scripts/generate-sw.mjs`'i
  çalıştırıyor: derleme çıktısındaki dosyalar içerik özetleriyle listelenip
  `dist/sw.js`'e yazılıyor (şablon `scripts/sw/template.js`, yeni bağımlılık yok).
  Netlify'a yüklenen klasörde `sw.js` olmalı; `expo export`'u tek başına
  çalıştırmak onu üretmez.
- Sayfa açılışı **önce ağdan**: yeni sürüm hemen görünüyor. Ağ yoksa ya da
  4 saniyede yanıt gelmezse önbellekteki uygulama açılıyor.
- Yeni sürümde yalnızca değişen dosyalar iniyor (adında içerik özeti olanlar bir
  önceki önbellekten kopyalanıyor). Bir önceki sürümün önbelleği bir sürüm daha
  tutuluyor: eski sürümle açık kalmış bir sekme sonradan yüklediği parçaları
  (ör. PDF okuyucu) bulmaya devam etsin.
- Service worker yalnızca üretim derlemesinde kaydediliyor; geliştirme
  sunucusunda kapalı.
- `public/_headers`: `sw.js` önbelleğe alınmıyor, `/_expo/static/*` (adları
  içerik özetli) bir yıl önbellekte.

İnternet isteyenler: bağlantıdan ve klasiklerden içe aktarma, yapay zekâ.
Ayarlar → **Uygulama olarak kullan** kartı önbelleğin durumunu gösteriyor ve
Android Chrome'da "Ana ekrana ekle" düğmesi, iPhone'da Safari talimatı veriyor.

## CI ve dağıtım

`.github/workflows/ci.yml` her push'ta üç şeyi koşuyor: tip kontrolü, testler ve
**web derlemesi**. Derleme adımı testlerin yakalamadığı hataları yakalıyor —
paketleyici sorunları (platform dosyaları, dinamik `import()`'lar, eksik
varlıklar) yalnızca gerçek derlemede ortaya çıkıyor. Çıktı `web-dist` adıyla
saklanıyor.

Netlify yayını `main` dalına push'ta çalışıyor ama iki gizli anahtar
gerektiriyor: depo ayarlarında **Secrets and variables → Actions** altına
`NETLIFY_AUTH_TOKEN` ve `NETLIFY_SITE_ID` eklenmeli. Anahtarlar yokken adım
sessizce atlanıyor (CI kırmızıya düşmüyor) ve günlükte nedenini yazıyor.
Alternatif olarak Netlify'a depo doğrudan bağlanabilir; `netlify.toml` bunun için
hazır duruyor.

## Telefonda PDF (WebView köprüsü)

Akış: dosya seçiliyor → baytlar base64'e çevriliyor → 0×0 boyutlu gizli bir
WebView, içine pdf.js ve PDF gömülmüş bir sayfa açıyor → sayfa **metin
öğelerini** (`str`, `hasEOL`, dikey konum) `postMessage` ile geri gönderiyor →
öğelerden metin üretme işi `src/ingest/pdfText.ts`'de yapılıyor.

Neden öğeler geri gönderiliyor da metin değil: algoritma tek yerde duruyor ve
testli; web ile telefon aynı kodu kullanıyor, davranış farkı olmuyor. Aynı PDF
iki yolda da 148 kelime verdi.

pdf.js kodu (`pdf.min.mjs` + `pdf.worker.min.mjs`) `npm run vendor:pdfjs` ile
`assets/pdfjs/*.txt` altına kopyalanıyor ve uygulama varlığı olarak
paketleniyor. CDN'den indirmek PDF açmayı internete ve üçüncü bir tarafa
bağlardı; `.txt` uzantısı Metro'nun bu dosyaları kaynak modül sanmaması için
(bkz. `metro.config.js`). Bileşen platforma göre ayrık: `PdfBridge.web.tsx` boş
döndüğü için 1,8 MB'lık varlıklar ve `react-native-webview` web paketine hiç
girmiyor.

## Web ilk yükleme

pdf.js ve jszip artık **kullanıldıklarında** yükleniyor (`await import(...)`).
Metro bunları ayrı parçalara ayırdığı için ilk yüklemede inen paket
3,33 MB'tan **1,43 MB**'a düştü; PDF içe aktaran kullanıcı pdf.js parçalarını o
anda indiriyor, hiç PDF açmayan hiç indirmiyor.

Disleksi dostu yazı tipinin yalnızca kullanılan iki ağırlığı (normal, kalın)
pakete giriyor: paketin kökünden içe aktarmak 14 dosyanın hepsini (~700 KB)
ekliyordu.

## Veri

Metinler, ilerleme ve istatistikler yalnızca cihazda tutulur; hiçbir sunucuya
gönderilmez. Küçük veriler AsyncStorage'da, doküman metinleri web'de IndexedDB
ve telefonda dosya sisteminde saklanır.

**Yedekleme** (Ayarlar → Veriler): bütün kayıtlar ve metinler tek bir JSON
dosyasına aktarılır (web'de iner, telefonda paylaşım menüsü açılır). Geri
yükleme cihazdakilerle **birleştirir**: hiçbir kayıt silinmez, aynı yedeği iki
kez yüklemek kopya üretmez, ayarlar yalnızca istenirse alınır. API anahtarı
yedeğe girmez — dosya paylaşılabilir.
