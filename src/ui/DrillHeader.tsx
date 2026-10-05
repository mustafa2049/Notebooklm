import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { IconButton, Txt } from './primitives';

/** Egzersiz ekranlarının ortak başlığı: ad + kapat. */
export function DrillHeader({ title }: { title: string }) {
  const router = useRouter();
  const { theme } = useSettings();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.space(3),
      }}
    >
      <Txt variant="title">{title}</Txt>
      <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Kapat" />
    </View>
  );
}
