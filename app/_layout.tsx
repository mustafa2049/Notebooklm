// Yalnızca kullanılan iki ağırlık: paketin kökünden almak 14 dosyanın
// hepsini pakete (ve web'de çevrimdışı önbelleğe) sokuyordu
import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APP_DARK } from '@/appearance/palettes';
import { formatErrorLog } from '@/core/errorLog';
import { useReminder } from '@/habit/useReminder';
import { startPwa } from '@/pwa/pwa';
import { SettingsProvider, useTheme } from '@/store/SettingsContext';
import { deviceInfo, installErrorLog, listErrors, recordError, setErrorRoute } from '@/storage/errorLog';
import { shareText } from '@/ui/shareText';

// Web: çevrimdışı önbellek ve "ana ekrana ekle". Bileşen dışında, en başta:
// tarayıcının kurulum olayı uygulama çizilmeden gelebiliyor
startPwa();
// Hata günlüğü: yakalanmamış hatalar cihazda saklanır (Ayarlar → Hata günlüğü)
installErrorLog();

/**
 * Bir ekran çizilirken patlarsa: hata günlüğe yazılır, uygulama beyaz ekranda
 * kalmaz. Ayarlar sağlayıcısının dışında olabileceği için renkler sabit.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const [shared, setShared] = useState<string | null>(null);
  const router = useRouter();
  // Ekran çizilirken patladığında yol henüz kaydedilmemiş olabilir
  const pathname = usePathname();
  useEffect(() => {
    setErrorRoute(pathname);
    void recordError(error, { source: 'render' });
  }, [error, pathname]);
  const share = async () => {
    const result = await shareText(formatErrorLog(await listErrors(), deviceInfo()));
    setShared(result === 'copied' ? 'Günlük panoya kopyalandı.' : result === 'failed' ? 'Paylaşılamadı.' : null);
  };
  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: primary ? APP_DARK.accent : APP_DARK.surfaceAlt,
      }}
    >
      <Text style={{ color: primary ? '#FFFFFF' : APP_DARK.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: APP_DARK.bg }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 }}
    >
      <Text style={{ color: APP_DARK.text, fontSize: 24, fontWeight: '700' }}>Bir şeyler ters gitti</Text>
      <Text style={{ color: APP_DARK.textDim, fontSize: 15, lineHeight: 22 }}>
        Bu ekran açılırken bir hata oldu. Hata cihazdaki günlüğe yazıldı; aşağıdan paylaşıp
        geliştiriciye gönderebilirsin. Verilerin silinmedi.
      </Text>
      <Text style={{ color: APP_DARK.textFaint, fontSize: 12 }} numberOfLines={4}>
        {error.message}
      </Text>
      {button('Tekrar dene', () => void retry(), true)}
      {button('Ana ekrana dön', () => {
        router.replace('/');
        void retry();
      })}
      {button('Günlüğü paylaş', () => void share())}
      {shared ? <Text style={{ color: APP_DARK.textDim, fontSize: 13 }}>{shared}</Text> : null}
    </ScrollView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <RootStack />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const theme = useTheme();
  // Disleksi dostu font isteğe bağlı; yüklenmesini beklemeden uygulamayı
  // açıyoruz, ayar kapalıyken zaten kullanılmıyor
  useFonts({ AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_700Bold });

  // Hatırlatıcı her açılışta ayarlarla eşitleniyor (bkz. useReminder)
  useReminder();

  // Hata günlüğünde hatanın hangi ekranda olduğu görünsün
  const pathname = usePathname();
  useEffect(() => setErrorRoute(pathname), [pathname]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reader/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="import"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </View>
  );
}
