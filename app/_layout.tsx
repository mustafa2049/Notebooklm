// Yalnızca kullanılan iki ağırlık: paketin kökünden almak 14 dosyanın
// hepsini pakete (ve web'de çevrimdışı önbelleğe) sokuyordu
import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useReminder } from '@/habit/useReminder';
import { startPwa } from '@/pwa/pwa';
import { SettingsProvider, useTheme } from '@/store/SettingsContext';

// Web: çevrimdışı önbellek ve "ana ekrana ekle". Bileşen dışında, en başta:
// tarayıcının kurulum olayı uygulama çizilmeden gelebiliyor
startPwa();

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
