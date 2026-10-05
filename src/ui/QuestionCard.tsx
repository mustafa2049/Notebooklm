import React from 'react';
import { Pressable, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { Card, Txt } from './primitives';

/**
 * Çoktan seçmeli tek soru. Anlama testi, seviye testi ve egzersizler aynı
 * kartı kullanıyor: şık seçilince doğru/yanlış renklenir, varsa metinden
 * alınmış kanıt görünür. Seçim bir kez yapılır; sonradan değiştirilemez ki
 * puan "deneyip bulma" ile şişmesin.
 */
export function QuestionCard({
  number,
  prompt,
  options,
  answer,
  chosen,
  onChoose,
  evidence,
}: {
  number?: number;
  prompt: string;
  options: string[];
  answer: string;
  chosen: string | undefined;
  onChoose: (option: string) => void;
  evidence?: string;
}) {
  const { theme } = useSettings();
  const revealed = chosen !== undefined;

  return (
    <Card style={{ gap: theme.space(3) }}>
      <Txt variant="body">
        {number !== undefined ? `${number}. ` : ''}
        {prompt}
      </Txt>
      <View style={{ gap: theme.space(2) }}>
        {options.map((option) => {
          const isChosen = chosen === option;
          const isCorrect = option === answer;

          const borderColor = !revealed
            ? theme.colors.border
            : isCorrect
              ? theme.colors.success
              : isChosen
                ? theme.colors.danger
                : theme.colors.border;

          return (
            <Pressable
              key={option}
              disabled={revealed}
              onPress={() => onChoose(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isChosen, disabled: revealed }}
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor,
                borderRadius: theme.radius.sm,
                paddingVertical: theme.space(3),
                paddingHorizontal: theme.space(3.5),
                opacity: pressed ? 0.7 : 1,
                backgroundColor: revealed && isCorrect ? theme.colors.accentSoft : 'transparent',
              })}
            >
              <Txt variant="body">{option}</Txt>
            </Pressable>
          );
        })}
      </View>
      {revealed && evidence ? (
        <Txt variant="dim" style={{ fontSize: 12 }}>
          Metinden: “{evidence}”
        </Txt>
      ) : null}
    </Card>
  );
}
