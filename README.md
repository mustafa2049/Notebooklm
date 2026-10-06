# Göz Egzersiz: Göz Tembelliği (Ambliyopi) Destek Uygulaması

Telefonda ve bilgisayarda çalışan, internet olmadan da kullanılabilen bir web uygulaması (PWA). Göz tembelliği
tedavisinde şunlara yardım eder:

| Özellik | Ne yapar? |
|---|---|
| 🏴‍☠️ **Kapama zamanlayıcısı** | Bandı taktığınızda başlatın, çıkardığınızda durdurun. Günlük hedef halkası, takvim, seri sayacı, hatırlatıcılar ve elle kayıt ekleme. Telefon kilitlense de süre doğru hesaplanır. |
| 🔍 **Bant takılıyken egzersizler** | Tembel gözle oynanan yakın görme oyunları: *Farklı Olanı Bul*, *Balon Patlat*, *Hedef Yakala*, *Labirent*, *Noktaları Birleştir*, *Dönen E*. Başarıya göre zorlaşır (harfler küçülür ve sıklaşır, hedefler hızlanır). |
| 🥽 **Kırmızı-mavi gözlükle dikoptik oyunlar** | Bant gerekmez. Oyunun bir kısmı yalnızca tembel göze (tam parlak), bir kısmı yalnızca sağlam göze (soluk) gösterilir: *Dikoptik Bloklar* (Tetris benzeri), *Dikoptik Top*, *Yıldız Toplama*, *Dikoptik Yılan*. Sağlam göz kontrastı başarıya göre otomatik artar. |
| 🎬 **Dikoptik film** | Kendi videonuzu (ya da bilgisayarda paylaşılan bir sekmeyi) kırmızı-mavi gözlükle izleyin: tembel göz tam, sağlam göz azaltılmış parlaklıkta görür. İsteğe bağlı tamamlayıcı maske, 20 dakikada bir mola hatırlatması. |
| 🌀 **Gabor algısal öğrenme** | Soluk çizgili desenlerin yönünü bulma. 3-aşağı 1-yukarı merdiven yöntemiyle kontrast eşiği ölçülür ve zaman içindeki değişimi grafikte izlenir. |
| 📈 **İlerleme** | Günlük kapama grafiği, Gabor eşiği, dikoptik kontrast eğrisi, oyun tablosu. Doktor için CSV ve yedek için JSON dışa aktarma. |
| 🔊 **Sesler** | Doğru/yanlış/seviye sesleri (dosyasız, WebAudio). Oyun ekranından ya da Ayarlar'dan kapatılabilir. |
| 🧒 **Çocuk modu** | Büyük düğmeler, günlük görev listesi, yıldızlar, 14 rozet ve ebeveyn şifresiyle kilitli ayarlar. Birden fazla profil desteklenir. |

> ⚠️ **Tıbbi uyarı:** Bu uygulama tıbbi bir cihaz değildir ve göz doktorunun yerine geçmez. Kapama süresini, hangi
> gözün kapatılacağını ve dikoptik tedavi kullanımını mutlaka göz doktorunuzla belirleyin.

## Bilimsel arka plan

- **Kapama süresi (PEDIG):** Orta düzey ambliyopide günde 2 saat kapama, 6 saat kadar etkili bulunmuştur. Ağır
  ambliyopide 6 saat, tam gün kapama kadar etkilidir. Kapama sırasında yakın mesafe aktiviteleri önerilir.
  [Healio](https://www.healio.com/news/ophthalmology/20120331/amblyopia-treatment-2-hours-of-patching-as-effective-as-6-hours-study-shows),
  [EyeWiki](https://eyewiki.org/Amblyopia)
- **Dikoptik tedavi:** Sağlam göze giden görüntünün kontrastını düşürüp iki gözü birlikte çalıştırma yaklaşımı
  (Luminopia, CureSight, Hess ve Li'nin dikoptik Tetris'i). Bazı çalışmalarda kapamaya denk sonuç ve daha iyi uyum
  görülmüştür.
  [Cleveland Clinic](https://consultqd.clevelandclinic.org/real-world-evidence-supports-dichoptic-therapy-for-amblyopia),
  [RCT](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8905014/)
- **Algısal öğrenme:** Yetişkin ambliyopide Gabor desenleriyle yapılan eğitimin görme keskinliğini artırabildiği
  gösterilmiştir. [Polat ve ark., PNAS 2004](https://www.pnas.org/doi/10.1073/pnas.0401200101)

## Kurulum (kullanıcı)

Uygulama GitHub Pages'te yayınlandıktan sonra adresi açın:

- **Android (Chrome):** menü ⋮ → *Ana ekrana ekle* / *Uygulamayı yükle*
- **iPhone (Safari):** Paylaş ⬆️ → *Ana Ekrana Ekle* (bildirimler için gereklidir, iOS 16.4+)
- **Bilgisayar (Chrome/Edge):** adres çubuğundaki yükle simgesi ⊕

Veriler yalnızca cihazınızda (IndexedDB) saklanır. Telefon değiştirirken *Ayarlar → Veriler → Yedek al* kullanın.

**Hatırlatıcılar:** Web uygulamaları kapalıyken kendiliğinden bildirim planlayamaz. Bu yüzden *Ayarlar →
Hatırlatıcılar → Telefon takvimine ekle* ile her gün tekrar eden, alarmlı bir takvim etkinliği (.ics) oluşturun.
Uygulama açıkken hatırlatma ve "hedefe ulaştınız" bildirimleri ayrıca gelir.

**Kırmızı-mavi gözlük:** Herhangi bir kırmızı-camgöbeği (anaglif 3D) karton ya da plastik gözlük yeterlidir. İlk
kullanımda *Gözlük kalibrasyonu* ile renk sızıntısını ayarlayın.

## Geliştirme

```bash
npm install
npm run dev        # geliştirme sunucusu
npm test           # birim testleri (Vitest)
npm run build      # üretim derlemesi (dist/)
npm run preview -- --port 4173 &   # derlemeyi sun
npm run smoke      # uçtan uca duman testi + ekran görüntüleri (screenshots/)
```

`npm run smoke` için Chromium yolu `CHROMIUM_PATH` ile, adres `BASE_URL` ile değiştirilebilir.

### GitHub Pages'te yayınlama

1. Depoda **Settings → Pages → Source: GitHub Actions** seçin.
2. `main` dalına her gönderimde `.github/workflows/deploy.yml` testleri çalıştırır, `VITE_BASE=/<depo-adı>/` ile
   derler ve yayınlar. Elle çalıştırmak için *Actions → Run workflow* kullanılabilir.

### Hazır ZIP paketi

`npm run zip` derleyip `goz-egzersiz-web.zip` üretir (içinde `index.html` kökte). Her GitHub gönderiminde aynı
paket **Actions → ilgili çalıştırma → Artifacts → goz-egzersiz-web** altından da indirilebilir.

- En kolay yayın: ZIP'i [app.netlify.com/drop](https://app.netlify.com/drop) sayfasına sürükleyip bırakın.
- ZIP'i açıp `index.html`'e çift tıklamak **çalışmaz**: tarayıcılar `file://` üzerinden uygulama betiklerini ve
  çevrimdışı önbelleği çalıştırmaz. Dosyaların bir web sunucusundan (Netlify, GitHub Pages ya da yerelde
  `python3 -m http.server`) sunulması gerekir.

### Netlify'da yayınlama

Depodaki `netlify.toml` derleme ayarlarını içerir.

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project → GitHub** → bu depoyu seçin.
2. Ayarlar dosyadan otomatik gelir (`npm run build`, yayın klasörü `dist`). **Deploy** deyin.
3. Verilen `https://<ad>.netlify.app` adresini telefonda açıp ana ekrana ekleyin.

Hesap bağlamadan denemek için: `npm run build` sonrası oluşan `dist` klasörünü
[app.netlify.com/drop](https://app.netlify.com/drop) sayfasına sürükleyip bırakın.

### Proje yapısı

```
src/
  model/            veri tipleri, zaman/seri hesapları
  storage/          IndexedDB, React store, dışa/içe aktarma
  platform/         bildirim, hatırlatıcı (.ics), ekran uyanık tutma
  games/            canvas motoru, tek göz oyunları, dikoptik oyunlar ve anaglif renkleri
  features/         ekranlar (onboarding, kapama, egzersiz, dikoptik, gabor, istatistik, ayarlar, çocuk modu)
  ui/               ortak bileşenler, grafikler, stiller
e2e/smoke.mjs       Playwright duman testi
```

### Bilgisayar sürümü

Aynı PWA masaüstünde Chrome/Edge ile kurulabilir. İleride mağaza ya da kurulum dosyası gerekirse kod
[Tauri](https://tauri.app/) ile paketlenebilir. Platforma özgü kod `src/platform/` altında toplanmıştır.
