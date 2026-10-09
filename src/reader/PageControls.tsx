import React from 'react';
import { Platform, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { Slider } from '@/ui/Slider';
import { formatShortDuration } from '@/ui/format';
import { IconButton, Txt } from '@/ui/primitives';

/**
 * Sayfa modunun alt çubuğu. Yüksekliği sabit: içerik değişince (ör. "metin
 * bitti") sayfa alanı küçülüp sayfalar yeniden kurulmasın diye bütün satırlar
 * tek satır ve hep yerinde.
 */
export function PageControls({
  pageIndex,
  pageCount,
  remainingMs,
  finished,
  onTurn,
  onSeekPage,
}: {
  pageIndex: number;
  pageCount: number;
  remainingMs: number;
  finished: boolean;
  onTurn: (delta: 1 | -1) => void;
  onSeekPage: (index: number) => void;
}) {
  const { theme } = useSettings();
  const last = Math.max(0, pageCount - 1);

  return (
    <View style={{ gap: theme.space(1) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
        <IconButton
          name="chevronLeft"
          onPress={() => onTurn(-1)}
          accessibilityLabel="Önceki sayfa"
          emphasis={pageIndex > 0 ? 'strong' : 'faint'}
        />
        <View style={{ flex: 1 }}>
          <Slider
            value={Math.min(pageIndex, last)}
            min={0}
            max={Math.max(1, last)}
            step={1}
            onChange={(value) => onSeekPage(Math.round(value))}
          />
        </View>
        <IconButton
          name="chevronRight"
          onPress={() => onTurn(1)}
          accessibilityLabel="Sonraki sayfa"
          emphasis="strong"
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.space(2) }}>
        <Txt variant="dim" numberOfLines={1} style={{ fontSize: 13 }}>
          Sayfa {pageCount > 0 ? pageIndex + 1 : 0} / {pageCount}
        </Txt>
        <Txt
          variant="dim"
          numberOfLines={1}
          style={{ fontSize: 13, color: finished ? theme.colors.success : theme.colors.textDim }}
        >
          {finished ? 'Metin bitti' : `~${formatShortDuration(remainingMs)} kaldı`}
        </Txt>
      </View>
      {Platform.OS === 'web' ? (
        <Txt
          variant="dim"
          numberOfLines={1}
          style={{ fontSize: 12, textAlign: 'center', color: theme.colors.textFaint }}
        >
          ←/→ sayfa · / ara · B yer imi · uzun bas: alıntı
        </Txt>
      ) : null}
    </View>
  );
}
