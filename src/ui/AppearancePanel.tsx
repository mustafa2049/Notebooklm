import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  readingColors,
  READING_THEMES,
  textColorChoices,
  type ReadingThemeId,
} from '@/appearance/palettes';
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  LINE_SPACINGS,
  stepFontScale,
} from '@/appearance/typography';
import { MODE_CHUNK_SIZE, MODE_LABEL, READER_MODES } from '@/reader/modes';
import { useSettings } from '@/store/SettingsContext';
import { ColorPicker } from './ColorPicker';
import { Chip, Toggle, Txt } from './primitives';
import { fontPreviewStyle, readingFontStyle, type ReadingFontId } from './theme';

/**
 * Okuma görünümü paneli: mod, yazı boyutu, satır aralığı, yazı tipi, renk
 * teması, yazı rengi ve özel renkler. Okuyucudaki "Aa" sayfası ile Ayarlar
 * aynı bileşeni kullanır; değişiklik anında kaydedilir ve metne yansır.
 */

const FONT_OPTIONS: { id: Exclude<ReadingFontId, 'auto'>; label: string }[] = [
  { id: 'sans', label: 'Sistem' },
  { id: 'serif', label: 'Tırnaklı' },
  { id: 'hyperlegible', label: 'Disleksi dostu' },
];

type PickerState = null | 'theme' | 'text';

export function AppearancePanel({ showModes = false }: { showModes?: boolean }) {
  const { theme, appTheme, readingTheme, settings, update, focusMode, setFocusMode } = useSettings();
  const [picker, setPicker] = useState<PickerState>(null);

  const reading = readingTheme.colors;
  const effectiveFont: Exclude<ReadingFontId, 'auto'> =
    settings.readingFont === 'auto' ? (settings.hyperlegible ? 'hyperlegible' : 'sans') : settings.readingFont;

  const section = (title: string) => (
    <Txt variant="label" style={{ marginTop: theme.space(2) }}>
      {title}
    </Txt>
  );

  return (
    <View style={{ gap: theme.space(2) }}>
      {/* Önizleme: seçimler burada ve arkadaki metinde aynı anda görünür */}
      <View
        style={{
          backgroundColor: reading.bg,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: reading.border,
          padding: theme.space(4),
        }}
      >
        <Text
          style={{
            color: reading.text,
            fontSize: 17 * Math.min(settings.fontScale, 1.4),
            lineHeight: 17 * Math.min(settings.fontScale, 1.4) * settings.lineSpacing,
            ...readingFontStyle(readingTheme),
          }}
        >
          Okuma alışkanlığı, her gün birkaç sayfayla kurulur.
        </Text>
      </View>
      {readingTheme.textFallback ? (
        <Txt variant="dim" style={{ fontSize: 12, color: theme.colors.warning }}>
          Seçtiğin yazı rengi bu zeminde okunmuyor; temanın kendi rengi kullanılıyor.
        </Txt>
      ) : null}

      {showModes ? (
        <>
          {section('Okuma modu')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
            {READER_MODES.map((mode) => (
              <Chip
                key={mode}
                label={MODE_LABEL[mode]}
                active={settings.mode === mode}
                onPress={() =>
                  update({
                    mode,
                    ...(MODE_CHUNK_SIZE[mode] ? { chunkSize: MODE_CHUNK_SIZE[mode]! } : {}),
                  })
                }
              />
            ))}
          </View>
          {/* Okuyucuya özel: başlıkta yer kalmadığı için buraya taşındı (F tuşu da çalışır) */}
          <Toggle
            label="Odak modu"
            hint="Koyu temalarda zemin tam siyah olur. Klavyede F."
            value={focusMode}
            onChange={setFocusMode}
          />
        </>
      ) : null}

      {section('Yazı boyutu')}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(3) }}>
        <SizeButton
          label="A−"
          small
          disabled={settings.fontScale <= FONT_SCALE_MIN}
          onPress={() => update({ fontScale: stepFontScale(settings.fontScale, -1) })}
          accessibilityLabel="Yazıyı küçült"
        />
        <Txt variant="mono" style={{ minWidth: 56, textAlign: 'center' }}>
          %{Math.round(settings.fontScale * 100)}
        </Txt>
        <SizeButton
          label="A+"
          disabled={settings.fontScale >= FONT_SCALE_MAX}
          onPress={() => update({ fontScale: stepFontScale(settings.fontScale, 1) })}
          accessibilityLabel="Yazıyı büyüt"
        />
      </View>

      {section('Satır aralığı')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {LINE_SPACINGS.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            active={Math.abs(settings.lineSpacing - option.value) < 0.01}
            onPress={() => update({ lineSpacing: option.value })}
          />
        ))}
      </View>

      {section('Yazı tipi')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {FONT_OPTIONS.map((option) => {
          const active = effectiveFont === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => update({ readingFont: option.id })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                paddingVertical: theme.space(2),
                paddingHorizontal: theme.space(3.5),
                borderRadius: theme.radius.pill,
                backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceAlt,
                borderWidth: 1,
                borderColor: active ? theme.colors.accent : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {/* Seçenek kendi yazı tipiyle yazılıyor: farkı görerek seç */}
              <Text
                style={{
                  color: active ? theme.colors.accent : theme.colors.textDim,
                  fontSize: 15,
                  ...fontPreviewStyle(option.id),
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {section('Renk teması')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {READING_THEMES.map((option) => {
          const preview = readingColors({
            readingTheme: option.id,
            textColor: 'auto',
            customBg: settings.customBg,
            customText: settings.customText,
            appDark: appTheme.dark,
            focusMode,
          }).colors;
          const active = settings.readingTheme === option.id;
          return (
            <Swatch
              key={option.id}
              label={option.label}
              bg={preview.bg}
              fg={preview.text}
              active={active}
              onPress={() => {
                if (option.id === 'custom') {
                  setPicker('theme');
                  return;
                }
                setPicker(null);
                update({ readingTheme: option.id as ReadingThemeId });
              }}
            />
          );
        })}
      </View>
      {picker === 'theme' ? (
        <View style={{ marginTop: theme.space(2) }}>
          <ColorPicker
            editBackground
            initialBg={settings.customBg}
            initialText={settings.customText}
            onCancel={() => setPicker(null)}
            onApply={(bg, text) => {
              update({ readingTheme: 'custom', customBg: bg, customText: text, textColor: 'custom' });
              setPicker(null);
            }}
          />
        </View>
      ) : null}

      {section('Yazı rengi')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2), alignItems: 'center' }}>
        <Chip
          label="Temanın"
          active={settings.textColor === 'auto'}
          onPress={() => {
            setPicker(null);
            update({ textColor: 'auto' });
          }}
        />
        {/* Zeminde okunmayacak renkler hiç listelenmiyor */}
        {textColorChoices(reading.bg).map((color) => (
          <Pressable
            key={color.id}
            onPress={() => {
              setPicker(null);
              update({ textColor: color.id });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Yazı rengi: ${color.label}`}
            accessibilityState={{ selected: settings.textColor === color.id }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: reading.bg,
              borderWidth: settings.textColor === color.id ? 3 : 1,
              borderColor: settings.textColor === color.id ? theme.colors.accent : theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: color.hex, fontSize: 15, fontWeight: '700' }}>A</Text>
          </Pressable>
        ))}
        <Chip
          label="Özel"
          active={settings.textColor === 'custom' || picker === 'text'}
          onPress={() => setPicker(picker === 'text' ? null : 'text')}
        />
      </View>
      {picker === 'text' ? (
        <View style={{ marginTop: theme.space(2) }}>
          <ColorPicker
            editBackground={false}
            initialBg={reading.bg}
            initialText={settings.customText}
            onCancel={() => setPicker(null)}
            onApply={(_bg, text) => {
              update({ textColor: 'custom', customText: text });
              setPicker(null);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function SizeButton({
  label,
  onPress,
  disabled,
  small,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  small?: boolean;
  accessibilityLabel: string;
}) {
  const { theme } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 52,
        height: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: theme.colors.text, fontSize: small ? 15 : 21, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function Swatch({
  label,
  bg,
  fg,
  active,
  onPress,
}: {
  label: string;
  bg: string;
  fg: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Renk teması: ${label}`}
      accessibilityState={{ selected: active }}
      style={{ alignItems: 'center', gap: 4, width: 62 }}
    >
      <View
        style={{
          width: 56,
          height: 44,
          borderRadius: theme.radius.sm + 2,
          backgroundColor: bg,
          borderWidth: active ? 3 : 1,
          borderColor: active ? theme.colors.accent : theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: fg, fontSize: 17, fontWeight: '700' }}>Aa</Text>
      </View>
      <Txt variant="dim" style={{ fontSize: 11 }} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}
