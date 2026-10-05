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

Kelime grubu boyutu (1–4) dört modun hepsinde ayarlanabilir; "Parça parça"
bunun hazır bir profili.

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
- **"Aklında ne kaldı?"**: odak seansı bitince, metin bitince ya da en az 3
  dakika okuyup çıkarken okuduğunu 1–2 cümleyle anlatman istenir (hatırlama
  pratiği; bir kez sorar, her zaman geçilebilir, ayardan kapatılabilir). Yapay
  zekâ tanımlıysa özet **yalnızca o oturumda okunan bölümle** karşılaştırılır:
  yakaladıkların, kaçanlar ve kısa geri bildirim (şemalı, doğrulanan yanıt).

## Dinleyerek oku

Okuyucu başlığındaki kulaklık düğmesi metni cümle cümle seslendirir ve okunan
cümleyi akış görünümünde vurgular; hız ayarı konuşma hızına eşlenir. Birim
**cümle**: kelime sınırı olayı her platformda ve her seste gelmiyor. Türkçe ses
yoksa ekranda yazar. Dinleme ayrı oturum olarak kaydedilir: günlük süreye
sayılır, okuma temposu istatistiğine girmez. Bitince okuyucu dinlemenin kaldığı
cümleden devam eder. Ses çıkışı cihazın konuşma motoruna bağlı; telefonda
denenmesi gerekiyor.

## Göz molası ve haftanın kartı

- **Göz molası** (Ayarlar → kapalı/20/30 dk): belirlenen süre kadar okuyunca
  okuma durur ve 20 saniyelik "uzağa bak" sayacı açılır (20-20-20 kuralı).
  Yalnızca okuma süresi sayılır.
- **Haftanın kartı** (Gelişim): süre, gün, kelime, seri ve efektif hız. Web'de
  kart PNG olarak iner; telefonda metin özeti paylaşım menüsüyle gider (görsel
  paylaşım ek bir yerel modül gerektirdiği için yok).

## Klasikler

İçe aktarma → Klasikler: Vikikaynak'tan telif süresi dolmuş Ömer Seyfettin
öyküleri. Her bağlantı listeye girmeden önce açılıp doğrulandı. İnternet
gerektirir; web'de vekil sunucu üzerinden çekilir.

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

## Veri

Metinler, ilerleme ve istatistikler yalnızca cihazda tutulur; hiçbir sunucuya
gönderilmez. Küçük veriler AsyncStorage'da, doküman metinleri web'de IndexedDB
ve telefonda dosya sisteminde saklanır.

**Yedekleme** (Ayarlar → Veriler): bütün kayıtlar ve metinler tek bir JSON
dosyasına aktarılır (web'de iner, telefonda paylaşım menüsü açılır). Geri
yükleme cihazdakilerle **birleştirir**: hiçbir kayıt silinmez, aynı yedeği iki
kez yüklemek kopya üretmez, ayarlar yalnızca istenirse alınır. API anahtarı
yedeğe girmez — dosya paylaşılabilir.
