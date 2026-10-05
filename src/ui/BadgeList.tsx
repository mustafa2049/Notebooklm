import React from 'react';
import { View } from 'react-native';
import type { Badge } from '@/habit/badges';
import { useSettings } from '@/store/SettingsContext';
import { Icon } from './Icon';
import { Card, Txt } from './primitives';

/** Rozet listesi: kazanılanlar renkli, kilitliler soluk ve nasıl kazanılacağıyla. */
export function BadgeList({ badges }: { badges: Badge[] }) {
  const { theme } = useSettings();
  return (
    <Card style={{ gap: theme.space(3) }}>
      {badges.map((badge) => (
        <View
          key={badge.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(3), opacity: badge.earned ? 1 : 0.45 }}
          accessibilityLabel={`${badge.title}: ${badge.earned ? 'kazanıldı' : 'kilitli'}. ${badge.detail}`}
        >
          <Icon
            name="award"
            size={22}
            color={badge.earned ? theme.colors.accent : theme.colors.textFaint}
          />
          <View style={{ flex: 1 }}>
            <Txt variant="body">{badge.title}</Txt>
            <Txt variant="dim" style={{ fontSize: 12 }}>
              {badge.earned ? `Kazanıldı · ${badge.detail}` : badge.detail}
            </Txt>
          </View>
        </View>
      ))}
    </Card>
  );
}
