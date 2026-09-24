# Notebooklm
Lm ai

## Nefes: 4 saniyelik kutu nefesi uygulaması

`nefes-app/` klasöründe Expo (React Native) ile yazılmış bir mobil uygulama var. Döngü: 4 sn nefes al, 4 sn tut, 4 sn nefes ver, 4 sn tut.

- Daire nefes alırken büyür, verirken küçülür.
- Her fazda geri sayım gösterilir ve hafif bir titreşim verilir.
- Tamamlanan turlar sayılır.
- Egzersiz sürerken ekran kapanmaz.

### Geliştirme

```bash
cd nefes-app
npm install
npx expo start   # Telefonda Expo Go ile QR kodu okutun
npm test         # Zamanlama testleri
```

### APK derleme

Android SDK ve JDK 17 veya üstü gerekir. `ANDROID_HOME` ortam değişkeni SDK klasörünü göstermelidir.

```bash
cd nefes-app
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

APK şu konumda oluşur: `nefes-app/android/app/build/outputs/apk/release/app-release.apk`. Bu APK debug anahtarıyla imzalanır. Telefona doğrudan kurulabilir ama Play Store'a yüklenemez.
