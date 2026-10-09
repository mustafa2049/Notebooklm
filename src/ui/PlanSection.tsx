import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  createPlan,
  daysBetween,
  dayKeyAfter,
  PLAN_STATE_LABEL,
  planStatus,
  wordsReadToday,
  type BookPlan,
  type PlanState,
} from '@/habit/bookPlan';
import { dayKey } from '@/habit/summary';
import { useSettings } from '@/store/SettingsContext';
import { planFor, removePlan, savePlan } from '@/storage/plans';
import type { ReadingSession } from '@/storage/stats';
import { formatDayKey, formatNumber } from './format';
import { Button, Chip, ProgressBar, Txt } from './primitives';
import { fontStyle } from './theme';

/**
 * Kitap kartındaki "Bitirme planı": plan kur, durumunu gör, değiştir.
 * Hesap `habit/bookPlan`'da; burada yalnızca gösterim.
 */

const QUICK_DAYS = [3, 7, 14, 30];
const MAX_DAYS = 365;

export function planStateColor(state: PlanState, colors: { success: string; warning: string; danger: string; textDim: string; accent: string }): string {
  switch (state) {
    case 'ahead':
    case 'done':
      return colors.success;
    case 'onTrack':
      return colors.accent;
    case 'behind':
      return colors.warning;
    case 'overdue':
      return colors.danger;
  }
}

export function PlanSection({
  docId,
  wordCount,
  readWords,
  finished,
  sessions,
  wpm,
  onChange,
}: {
  docId: string;
  wordCount: number;
  readWords: number;
  finished: boolean;
  sessions: ReadingSession[];
  /** Doğal okuma hızı (dakika tahmini için) */
  wpm: number;
  onChange?: () => void;
}) {
  const { theme } = useSettings();
  const [plan, setPlan] = useState<BookPlan | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState(7);

  const load = useCallback(() => {
    void planFor(docId).then(setPlan);
  }, [docId]);
  useEffect(load, [load]);

  if (plan === undefined) return null;

  const now = Date.now();
  const remaining = Math.max(0, wordCount - readWords);
  const status = plan
    ? planStatus(plan, { wordCount, readWords, finished, todayRead: wordsReadToday(sessions, docId, now) }, now, wpm)
    : null;

  const start = async () => {
    await savePlan(createPlan({ docId, days, readWords, now: Date.now() }));
    setEditing(false);
    load();
    onChange?.();
  };
  const cancel = async () => {
    await removePlan(docId);
    setEditing(false);
    load();
    onChange?.();
  };

  const setup = !plan || editing || status?.state === 'overdue';

  return (
    <View style={{ gap: theme.space(3) }}>
      {status && plan ? (
        <View style={{ gap: theme.space(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
            <Txt variant="body" style={{ flex: 1 }}>
              {status.state === 'done'
                ? 'Plan tamamlandı: kitabı bitirdin.'
                : status.state === 'overdue'
                  ? `Süre ${formatDayKey(plan.targetDay)} günü doldu; ${formatNumber(status.remainingWords)} kelime kaldı.`
                  : `${formatDayKey(plan.targetDay)} gününe kadar · ${status.daysLeft === 1 ? 'bugün son gün' : `${status.daysLeft} gün kaldı`}`}
            </Txt>
            <StateBadge state={status.state} />
          </View>
          {status.state !== 'done' && status.state !== 'overdue' ? (
            <>
              <ProgressBar ratio={status.todayTarget ? status.todayRead / status.todayTarget : 1} />
              <Txt variant="dim" style={{ fontSize: 13 }}>
                {status.todayLeft === 0
                  ? `Bugünkü payını okudun (${formatNumber(status.todayTarget)} kelime). Yarın kalan yeniden bölünecek.`
                  : `Bugün: ${formatNumber(status.todayTarget)} kelimeden ${formatNumber(status.todayLeft)} kelime kaldı · ~${status.todayMinutes} dk`}
              </Txt>
            </>
          ) : null}
        </View>
      ) : (
        <Txt variant="dim">
          Bu kitabı kaç günde bitirmek istersin? Her günün payı, okudukça yeniden hesaplanır:
          geride kalırsan kalan sonraki günlere yayılır.
        </Txt>
      )}

      {setup && !finished ? (
        <View style={{ gap: theme.space(2) }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
            {QUICK_DAYS.map((value) => (
              <Chip key={value} label={`${value} gün`} active={days === value} onPress={() => setDays(value)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(3) }}>
            <Stepper label="−" onPress={() => setDays((value) => Math.max(1, value - 1))} accessibilityLabel="Bir gün azalt" />
            <Txt variant="mono" style={{ minWidth: 64, textAlign: 'center' }}>
              {days} gün
            </Txt>
            <Stepper label="+" onPress={() => setDays((value) => Math.min(MAX_DAYS, value + 1))} accessibilityLabel="Bir gün artır" />
          </View>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Son gün {formatDayKey(dayKeyAfter(now, days - 1))} · günde ~{formatNumber(Math.ceil(remaining / days))} kelime
            (~{Math.max(1, Math.ceil(remaining / days / Math.max(60, wpm)))} dk)
          </Txt>
          <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
            {plan ? <Button label="Vazgeç" variant="ghost" style={{ flex: 1 }} onPress={() => setEditing(false)} /> : null}
            <Button label={plan ? 'Planı güncelle' : 'Planı başlat'} icon="check" style={{ flex: 1 }} onPress={() => void start()} />
          </View>
        </View>
      ) : null}

      {plan && !setup ? (
        <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
          {status?.state !== 'done' ? (
            <Button
              label="Süreyi değiştir"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                setDays(Math.max(1, daysBetween(dayKey(Date.now()), plan.targetDay) + 1));
                setEditing(true);
              }}
            />
          ) : null}
          <Button label="Planı kaldır" variant="ghost" style={{ flex: 1 }} onPress={() => void cancel()} />
        </View>
      ) : null}
    </View>
  );
}

export function StateBadge({ state }: { state: PlanState }) {
  const { theme } = useSettings();
  const color = planStateColor(state, theme.colors);
  return (
    <View
      style={{
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: color,
        paddingHorizontal: theme.space(2),
        paddingVertical: 2,
      }}
    >
      <Text style={{ color, fontSize: 12, ...fontStyle(theme, '700') }}>{PLAN_STATE_LABEL[state]}</Text>
    </View>
  );
}

function Stepper({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  const { theme } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 44,
        height: 40,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: theme.colors.text, fontSize: 20, ...fontStyle(theme, '700') }}>{label}</Text>
    </Pressable>
  );
}
