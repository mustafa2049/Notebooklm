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

- **PDF yalnızca web sürümünde okunuyor.** pdf.js tarayıcı için yazılmış bir
  kütüphane (dinamik `import()`, WebAssembly, `ImageData`); telefonun JavaScript
  motoru Hermes onu derleyemiyor. Telefonda TXT, EPUB ve bağlantı çalışıyor.
  Çözüm yolu: pdf.js'i gizli bir WebView içinde çalıştırıp metni `postMessage`
  ile geri almak.
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

## Veri

Metinler, ilerleme ve istatistikler yalnızca cihazda tutulur; hiçbir sunucuya
gönderilmez. Küçük veriler AsyncStorage'da, doküman metinleri web'de IndexedDB
ve telefonda dosya sisteminde saklanır.
