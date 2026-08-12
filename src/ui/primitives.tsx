import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/store/SettingsContext';
import { Icon, type IconName } from './Icon';
import { fontStyle } from './theme';

/** Güvenli alanı hesaba katan sayfa gövdesi. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children?: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + (padded ? theme.space(3) : 0),
    paddingBottom: insets.bottom + theme.space(6),
    paddingHorizontal: padded ? theme.space(4) : 0,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, padding, style]}>{children}</View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={[padding, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

type TextVariant = 'title' | 'heading' | 'body' | 'dim' | 'label' | 'mono';

export function Txt({
  children,
  variant = 'body',
  style,
  numberOfLines,
  onPress,
}: {
  children: React.ReactNode;
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const variants: Record<TextVariant, TextStyle> = {
    title: {
      fontSize: 30,
      color: theme.colors.text,
      letterSpacing: -0.5,
      ...fontStyle(theme, '800'),
    },
    heading: { fontSize: 18, color: theme.colors.text, ...fontStyle(theme, '700') },
    body: { fontSize: 15, color: theme.colors.text, lineHeight: 22, ...fontStyle(theme) },
    dim: { fontSize: 14, color: theme.colors.textDim, lineHeight: 20, ...fontStyle(theme) },
    label: {
      fontSize: 11,
      color: theme.colors.textFaint,
      letterSpacing: 1,
      textTransform: 'uppercase',
      ...fontStyle(theme, '700'),
    },
    mono: { fontSize: 15, color: theme.colors.text, fontFamily: theme.font.mono },
  };

  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      suppressHighlighting={onPress ? true : undefined}
      style={[variants[variant], style]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: theme.space(4),
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.7 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.colors.accent, fg: '#FFFFFF', border: 'transparent' },
    secondary: { bg: theme.colors.surfaceAlt, fg: theme.colors.text, border: theme.colors.border },
    ghost: { bg: 'transparent', fg: theme.colors.textDim, border: 'transparent' },
    danger: { bg: 'transparent', fg: theme.colors.danger, border: theme.colors.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space(2),
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderRadius: theme.radius.pill,
          paddingVertical: theme.space(3.5),
          paddingHorizontal: theme.space(5),
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={palette.fg} />}
      <Text style={{ color: palette.fg, fontSize: 15, ...fontStyle(theme, '700') }}>{label}</Text>
    </Pressable>
  );
}

/** Dokunma alanı geniş, yuvarlak ikon düğmesi (okuyucu kontrolleri için). */
export function IconButton({
  name,
  onPress,
  size = 24,
  emphasis = 'normal',
  accessibilityLabel,
}: {
  name: IconName;
  onPress: () => void;
  size?: number;
  emphasis?: 'normal' | 'strong' | 'faint';
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const color =
    emphasis === 'strong'
      ? theme.colors.text
      : emphasis === 'faint'
        ? theme.colors.textFaint
        : theme.colors.textDim;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={({ pressed }) => ({
        padding: theme.space(2.5),
        borderRadius: theme.radius.pill,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

/** Seçili/seçilmemiş küçük etiket düğmesi (mod seçici, chunk boyutu). */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
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
      <Text
        style={{
          color: active ? theme.colors.accent : theme.colors.textDim,
          fontSize: 13,
          ...fontStyle(theme, '700'),
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Toggle({
  value,
  onChange,
  label,
  hint,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(3),
        paddingVertical: theme.space(3),
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="body">{label}</Txt>
        {hint ? (
          <Txt variant="dim" style={{ marginTop: 2, fontSize: 13 }}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <View
        style={{
          width: 46,
          height: 28,
          borderRadius: 14,
          padding: 3,
          backgroundColor: value ? theme.colors.accent : theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: value ? theme.colors.accent : theme.colors.border,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: value ? '#FFFFFF' : theme.colors.textFaint,
          }}
        />
      </View>
    </Pressable>
  );
}

/** İnce ilerleme çubuğu. */
export function ProgressBar({ ratio, height = 4 }: { ratio: number; height?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
          height: '100%',
          backgroundColor: theme.colors.accent,
        }}
      />
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />
  );
}

/** Başlık + alt açıklama satırı. */
export function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: theme.space(6), marginBottom: theme.space(3) }}>
      <Txt variant="label">{title}</Txt>
      {hint ? (
        <Txt variant="dim" style={{ marginTop: theme.space(1.5) }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}
