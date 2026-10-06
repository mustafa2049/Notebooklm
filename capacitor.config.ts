import type { CapacitorConfig } from '@capacitor/cli';

// Android uygulaması: web uygulamasının derlenmiş hali (dist) APK'nın içine gömülür, internet gerekmez.
const config: CapacitorConfig = {
  appId: 'com.gozegzersiz.app',
  appName: 'Göz Egzersiz',
  webDir: 'dist',
  android: {
    backgroundColor: '#0d1117',
  },
};

export default config;
