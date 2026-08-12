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
- **Anlama testi yapay zekâ kullanmıyor**; metnin kendi kelimelerinden boşluk
  doldurma soruları üretiyor, yani anlamayı değil hatırlamayı ölçüyor.

## Veri

Metinler, ilerleme ve istatistikler yalnızca cihazda tutulur; hiçbir sunucuya
gönderilmez. Küçük veriler AsyncStorage'da, doküman metinleri web'de IndexedDB
ve telefonda dosya sisteminde saklanır.
