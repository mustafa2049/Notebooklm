# Takvimli NoFap

Takvim üzerinden seri (streak) takibi yapan, kurulum gerektirmeyen, tamamen çevrimdışı
çalışan bir web uygulaması. Veriler yalnızca tarayıcının `localStorage`'ında tutulur;
hiçbir sunucuya gönderilmez, hesap açmak gerekmez.

## Özellikler

- **Aylık takvim** — her gün temiz / kayma olarak işaretlenir, bugün çerçeveyle vurgulanır.
- **Seri sayacı** — güncel seri, hedefe göre ilerleme halkası, seri başlangıç tarihi.
- **İstatistikler** — en uzun seri, toplam temiz gün, kayma sayısı, başarı oranı.
- **Yıllık ısı haritası** — bir yılın tamamı tek bakışta; yıllar arasında gezinilebilir.
- **Rozetler** — 1, 3, 7, 14, 21, 30, 60, 90, 180 ve 365 günlük kilometre taşları.
- **Günlük** — güne not, ruh hâli (5 kademe) ve kaymalarda tetikleyici etiketleri.
- **Acil durum modu** — 4-7-8 nefes egzersizi ve isteği geçirmeye yönelik hatırlatmalar.
- **Açık / koyu tema**, klavye ve ekran okuyucu desteği, duyarlı (mobil öncelikli) düzen.
- **Yedekleme** — tüm veriyi JSON olarak dışa/içe aktarma.
- **PWA** — telefona "ana ekrana ekle" ile kurulur, internetsiz açılır.

## Çalıştırma

Derleme adımı ya da bağımlılık yok. Yerel bir sunucu yeterli:

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

`index.html` dosyasını doğrudan çift tıklayarak da açabilirsin; bu durumda uygulama
çalışır ama Service Worker (çevrimdışı önbellek) devre dışı kalır.

Telefona kurmak için siteyi `https` üzerinden (ör. GitHub Pages) yayınlayıp
tarayıcı menüsünden **Ana ekrana ekle**'yi seç.

## Kullanım

- Takvimde bir güne dokun → durum, ruh hâli, not ve tetikleyicileri düzenle.
- **Bugünü İşaretle** günü tek dokunuşla temiz olarak kaydeder.
- **Kayma Kaydet** bugünün düzenleme penceresini açar; durumu "Kayma" seçtiğinde
  tetikleyici etiketleri görünür.
- **Ayarlar (⚙)** → başlangıç tarihi, hedef gün sayısı, yedek al / geri yükle, sıfırla.

## Hesaplama mantığı

- **Güncel seri** = son kaymanın ertesi gününden bugüne kadar geçen gün sayısı.
  Hiç kayma yoksa başlangıç tarihinden itibaren sayılır. Bugün kayma işaretliyse 0'dır.
- **En uzun seri** = başlangıç ile bugün arasındaki, kaymalarla bölünmüş en uzun aralık.
- **Temiz gün** = başlangıçtan bugüne toplam gün − kayma sayısı.
  Yani işaretlenmemiş geçmiş günler temiz sayılır; seriyi bozan tek şey kayma kaydıdır.
- **Başarı oranı** = temiz gün / toplam gün.

## Dosya yapısı

```
index.html              arayüz
css/style.css           tema değişkenleri ve düzen
js/app.js               durum yönetimi, hesaplamalar, tüm görünümler
sw.js                   çevrimdışı önbellek (Service Worker)
manifest.webmanifest    PWA tanımı
assets/icon.svg         uygulama simgesi
```

## Veri biçimi

`localStorage` anahtarı: `nofap-takvim-v1`

```json
{
  "version": 1,
  "startDate": "2026-06-12",
  "goal": 90,
  "theme": "dark",
  "days": {
    "2026-07-30": {
      "status": "relapse",
      "mood": 2,
      "note": "Gece geç saatte kaydım.",
      "triggers": ["Uykusuzluk"]
    }
  }
}
```

Tarayıcı verisini temizlemek kayıtları da siler — düzenli olarak **Dışa aktar** ile
yedek almanı öneririm.

## Not

Bu uygulama bir alışkanlık takip aracıdır, tıbbi tavsiye vermez. Zorlanıyorsan bir uzmandan
destek almayı düşün.
