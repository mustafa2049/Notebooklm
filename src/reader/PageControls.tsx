import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { Slider } from '@/ui/Slider';
import { formatShortDuration } from '@/ui/format';
import { Icon } from '@/ui/Icon';
import { IconButton, Txt } from '@/ui/primitives';

export interface PacerControls {
  /** Rehber başlatıldı (oynuyor ya da duraklatıldı) */
  on: boolean;
  playing: boolean;
  wpm: number;
  onToggle: () => void;
  onSpeed: (delta: number) => void;
}

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
  pacer,
}: {
  pageIndex: number;
  pageCount: number;
  remainingMs: number;
  finished: boolean;
  onTurn: (delta: 1 | -1) => void;
  onSeekPage: (index: number) => void;
  /** Tempo rehberi: hedef hızda ilerleyen vurgu */
  pacer?: PacerControls;
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.space(2),
          paddingHorizontal: theme.space(2),
        }}
      >
        <Txt variant="dim" numberOfLines={1} style={{ fontSize: 13 }}>
          Sayfa {pageCount > 0 ? pageIndex + 1 : 0} / {pageCount}
        </Txt>
        {pacer ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(1) }}>
            {pacer.on ? <SpeedButton label="−" onPress={() => pacer.onSpeed(-25)} accessibilityLabel="Rehberi yavaşlat" /> : null}
            <Pressable
              onPress={pacer.onToggle}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={pacer.playing ? 'Tempo rehberini duraklat' : 'Tempo rehberini başlat'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 3,
                paddingHorizontal: theme.space(2),
                borderRadius: theme.radius.pill,
                borderWidth: 1,
                borderColor: pacer.on ? theme.colors.accent : theme.colors.border,
              }}
            >
              <Icon name={pacer.playing ? 'pause' : 'play'} size={12} color={pacer.on ? theme.colors.accent : theme.colors.textDim} />
              <Txt variant="dim" style={{ fontSize: 12, color: pacer.on ? theme.colors.accent : theme.colors.textDim }}>
                {pacer.on ? `${pacer.wpm}` : 'Rehber'}
              </Txt>
            </Pressable>
            {pacer.on ? <SpeedButton label="+" onPress={() => pacer.onSpeed(25)} accessibilityLabel="Rehberi hızlandır" /> : null}
          </View>
        ) : null}
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
          ←/→ sayfa · P rehber · / ara · B yer imi
        </Txt>
      ) : null}
    </View>
  );
}

function SpeedButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  const { theme } = useSettings();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Txt variant="dim" style={{ fontSize: 16, paddingHorizontal: 4, color: theme.colors.accent }}>
        {label}
      </Txt>
    </Pressable>
  );
}
