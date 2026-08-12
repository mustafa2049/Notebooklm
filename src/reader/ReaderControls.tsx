import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { Icon } from '@/ui/Icon';
import { Slider } from '@/ui/Slider';
import { formatNumber, formatShortDuration } from '@/ui/format';
import { IconButton, Txt } from '@/ui/primitives';

interface ReaderControlsProps {
  playing: boolean;
  ratio: number;
  wordsRead: number;
  totalWords: number;
  remainingMs: number;
  onToggle: () => void;
  onRestart: () => void;
  onPreviousSentence: () => void;
  onNextSentence: () => void;
  onSeek: (ratio: number) => void;
}

/**
 * Alt kontrol çubuğu. Tek elle kullanım için her şey ekranın alt yarısında ve
 * dokunma hedefleri 44 pt'nin altına düşmüyor.
 *
 * `React.memo`: okuyucu her kelimede yeniden render oluyor, kontrol çubuğunun
 * ise yalnızca ilerleme/durum değiştiğinde render olması gerekiyor.
 */
export const ReaderControls = React.memo(function ReaderControls({
  playing,
  ratio,
  wordsRead,
  totalWords,
  remainingMs,
  onToggle,
  onRestart,
  onPreviousSentence,
  onNextSentence,
  onSeek,
}: ReaderControlsProps) {
  const { theme, settings, update } = useSettings();

  return (
    <View style={{ gap: theme.space(1) }}>
      <Slider value={ratio} min={0} max={1} step={0.001} onChange={onSeek} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt variant="dim" style={{ fontSize: 13 }}>
          {formatNumber(wordsRead)} / {formatNumber(totalWords)} kelime
        </Txt>
        <Txt variant="dim" style={{ fontSize: 13 }}>
          ~{formatShortDuration(remainingMs)} kaldı
        </Txt>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space(4),
          marginTop: theme.space(3),
        }}
      >
        <IconButton name="restart" onPress={onRestart} accessibilityLabel="Baştan başla" emphasis="faint" />
        <IconButton name="prev" onPress={onPreviousSentence} accessibilityLabel="Önceki cümle" />

        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Duraklat' : 'Oynat'}
          style={({ pressed }) => ({
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Icon name={playing ? 'pause' : 'play'} size={30} color="#FFFFFF" />
        </Pressable>

        <IconButton name="next" onPress={onNextSentence} accessibilityLabel="Sonraki cümle" />
        <IconButton
          name="focus"
          onPress={() => update({ showPivotGuides: !settings.showPivotGuides })}
          accessibilityLabel="Pivot kılavuzunu aç/kapat"
          emphasis="faint"
        />
      </View>

      <Slider
        value={settings.wpm}
        min={100}
        max={1200}
        step={25}
        onChange={(wpm) => update({ wpm })}
        label="Hız"
        format={(wpm) => `${wpm} kelime/dk`}
      />

      {Platform.OS === 'web' ? (
        <Txt variant="dim" style={{ fontSize: 12, textAlign: 'center', color: theme.colors.textFaint }}>
          Boşluk: oynat/duraklat · ←/→: cümle · ↑/↓: hız · R: baştan
        </Txt>
      ) : null}
    </View>
  );
});
