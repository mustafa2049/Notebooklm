import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useReminder } from '@/habit/useReminder';
import { SettingsProvider, useTheme } from '@/store/SettingsContext';

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
          name="import"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </View>
  );
}
