import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/store/SettingsContext';
import { Icon, type IconName } from '@/ui/Icon';
import { fontStyle } from '@/ui/theme';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  /**
   * İkon ve etiketi tek bir bileşende çiziyoruz (`tabBarShowLabel: false`).
   *
   * Gerekçe: gezinme kütüphanesinin kendi etiket yerleşimi, sekme çubuğu
   * yüksekliğine bağlı olarak etiket kutusunu 5–9 px'e sıkıştırıp yazıyı
   * kırpıyordu. Kendi bileşenimizde yüksekliği doğrudan belirliyoruz.
   */
  const tabItem = (name: IconName, label: string) =>
    function TabItem({ color }: { color: ColorValue }) {
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4, width: 84 }}>
          <Icon name={name} size={22} color={String(color)} />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              lineHeight: 14,
              color: String(color),
              ...fontStyle(theme, '600'),
            }}
          >
            {label}
          </Text>
        </View>
      );
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
        },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Kütüphane', tabBarIcon: tabItem('library', 'Kütüphane') }}
      />
      <Tabs.Screen
        name="train"
        options={{ title: 'Antrenman', tabBarIcon: tabItem('train', 'Antrenman') }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'İstatistik', tabBarIcon: tabItem('chart', 'İstatistik') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ayarlar', tabBarIcon: tabItem('settings', 'Ayarlar') }}
      />
    </Tabs>
  );
}
