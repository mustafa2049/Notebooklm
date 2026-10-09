import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { contrastRatio, MIN_CONTRAST, normalizeHex, readability } from '@/appearance/color';
import { PICKER_SWATCHES } from '@/appearance/palettes';
import { useSettings } from '@/store/SettingsContext';
import { readingFontStyle } from './theme';
import { Button, Chip, Field, Txt } from './primitives';

/**
 * Serbest renk seçici: hızlı renk ızgarası + renk kodu alanı.
 *
 * Kullanıcı istediği rengi seçebilir; ama yazı zeminde okunmayacaksa (kontrast
 * 3:1'in altı) "Uygula" kapalı kalır ve nedeni sayıyla yazılır. Kontrast
 * oranı her zaman görünür: 4,5:1 ve üstü rahat okunur.
 */
export function ColorPicker({
  editBackground,
  initialBg,
  initialText,
  onApply,
  onCancel,
}: {
  /** Özel tema: zemin ve yazı birlikte; değilse yalnızca yazı rengi */
  editBackground: boolean;
  initialBg: string;
  initialText: string;
  onApply: (bg: string, text: string) => void;
  onCancel: () => void;
}) {
  const { theme, settings, readingTheme } = useSettings();
  const [bg, setBg] = useState(initialBg);
  const [text, setText] = useState(initialText);
  const [target, setTarget] = useState<'bg' | 'text'>(editBackground ? 'bg' : 'text');
  const [hexDraft, setHexDraft] = useState(editBackground ? initialBg : initialText);

  const ratio = contrastRatio(bg, text);
  const level = readability(ratio);
  const levelColor =
    level === 'rahat' ? theme.colors.success : level === 'zor' ? theme.colors.warning : theme.colors.danger;

  const choose = (hex: string) => {
    if (target === 'bg') setBg(hex);
    else setText(hex);
    setHexDraft(hex);
  };

  const switchTarget = (next: 'bg' | 'text') => {
    setTarget(next);
    setHexDraft(next === 'bg' ? bg : text);
  };

  return (
    <View style={{ gap: theme.space(3) }}>
      {editBackground ? (
        <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
          <Chip label="Zemin" active={target === 'bg'} onPress={() => switchTarget('bg')} />
          <Chip label="Yazı" active={target === 'text'} onPress={() => switchTarget('text')} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {PICKER_SWATCHES.map((hex) => {
          const selected = (target === 'bg' ? bg : text) === hex;
          return (
            <Pressable
              key={hex}
              onPress={() => choose(hex)}
              accessibilityRole="button"
              accessibilityLabel={`Renk ${hex}`}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: hex,
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? theme.colors.accent : theme.colors.border,
              }}
            />
          );
        })}
      </View>

      <Field
        label={target === 'bg' ? 'Zemin rengi kodu' : 'Yazı rengi kodu'}
        value={hexDraft}
        onChangeText={(value) => {
          setHexDraft(value);
          const normalized = normalizeHex(value);
          if (normalized) {
            if (target === 'bg') setBg(normalized);
            else setText(normalized);
          }
        }}
        placeholder="#RRGGBB"
      />

      <View
        style={{
          backgroundColor: bg,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.space(4),
        }}
      >
        <Text
          style={{
            color: text,
            fontSize: 17 * Math.min(settings.fontScale, 1.4),
            lineHeight: 17 * Math.min(settings.fontScale, 1.4) * settings.lineSpacing,
            ...readingFontStyle(readingTheme),
          }}
        >
          Okuma alışkanlığı, her gün birkaç sayfayla kurulur.
        </Text>
      </View>

      <Txt variant="dim" style={{ fontSize: 13, color: levelColor }}>
        Kontrast {ratio.toFixed(1)}:1 ·{' '}
        {level === 'rahat'
          ? 'rahat okunur'
          : level === 'zor'
            ? 'okunur ama yorucu olabilir (4,5:1 ve üstü önerilir)'
            : 'bu renklerle yazı okunmaz'}
      </Txt>

      <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
        <Button label="Vazgeç" variant="ghost" style={{ flex: 1 }} onPress={onCancel} />
        <Button
          label="Uygula"
          icon="check"
          style={{ flex: 1 }}
          disabled={ratio < MIN_CONTRAST}
          onPress={() => onApply(bg, text)}
        />
      </View>
    </View>
  );
}
