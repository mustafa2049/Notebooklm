import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/store/SettingsContext';
import { Icon, type IconName } from '@/ui/Icon';
import { fontStyle } from '@/ui/theme';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const tabIcon = (name: IconName) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return <Icon name={name} size={22} color={String(color)} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          // Güvenli alan + açık yükseklik: yoksa etiketlerin alt çıkıntıları
          // ("Ayarlar"daki y) ekranın kenarında kırpılıyor
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontSize: 11, ...fontStyle(theme, '600') },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Kütüphane', tabBarIcon: tabIcon('library') }}
      />
      <Tabs.Screen name="train" options={{ title: 'Antrenman', tabBarIcon: tabIcon('train') }} />
      <Tabs.Screen name="stats" options={{ title: 'İstatistik', tabBarIcon: tabIcon('chart') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ayarlar', tabBarIcon: tabIcon('settings') }} />
    </Tabs>
  );
}
