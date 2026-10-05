import React from 'react';
import { View } from 'react-native';
import { dailyGoalStatus, type GoalUnit } from '@/habit/goal';
import { useSettings } from '@/store/SettingsContext';
import { formatNumber } from './format';
import { Card, ProgressBar, Txt } from './primitives';

/**
 * Günlük hedef kartı.
 *
 * Hedef tanımlı değilse hiç çizilmiyor. Hedef bittiğinde "devam et" baskısı
 * kurmuyor, günü kapatıyor: alışkanlığın işi her gün biraz okumak, bir günde
 * çok okumak değil.
 */
export function DailyGoal({
  todayMs,
  todayWords,
  streak,
}: {
  todayMs: number;
  todayWords: number;
  streak: number;
}) {
  const { theme, settings } = useSettings();
  const status = dailyGoalStatus({
    unit: settings.goalUnit as GoalUnit,
    goalMinutes: settings.dailyGoalMinutes,
    goalWords: settings.dailyGoalWords,
    todayMs,
    todayWords,
    wpm: settings.wpm,
  });
  if (!status.active) return null;

  const unitLabel = status.unit === 'minutes' ? 'dk' : 'kelime';

  return (
    <Card style={{ gap: theme.space(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt variant="body" style={{ flex: 1 }}>
          {status.done ? 'Bugünün hedefi tamam' : 'Bugünün hedefi'}
        </Txt>
        <Txt variant="dim" style={{ fontSize: 13 }}>
          {formatNumber(status.doneValue)} / {formatNumber(status.goalValue)} {unitLabel}
        </Txt>
      </View>
      <ProgressBar ratio={status.ratio} />
      <Txt variant="dim" style={{ fontSize: 12 }}>
        {status.done
          ? streak > 1
            ? `${streak} gündür okuyorsun. Bugünlük bu kadar yeter.`
            : 'Bugünlük bu kadar yeter.'
          : status.unit === 'minutes'
            ? `${status.minutesLeft} dakika kaldı`
            : `${formatNumber(status.remaining)} kelime kaldı · hedef hızında yaklaşık ${status.minutesLeft} dk`}
      </Txt>
    </Card>
  );
}
