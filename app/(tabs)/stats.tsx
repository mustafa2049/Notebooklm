import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { dayKey, listSessions, summarize, type StatsSummary } from '@/storage/stats';
import { BarChart } from '@/ui/BarChart';
import { formatDuration, formatNumber } from '@/ui/format';
import { Card, Screen, SectionHeader, Txt } from '@/ui/primitives';

const WEEKDAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

export default function StatsScreen() {
  const { theme, settings } = useSettings();
  const [summary, setSummary] = useState<StatsSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      listSessions().then((sessions) => setSummary(summarize(sessions)));
    }, [])
  );

  if (!summary) return <Screen />;

  const hasData = summary.totalWords > 0;
  const today = dayKey(Date.now());

  return (
    <Screen>
      <Txt variant="title">İstatistik</Txt>
      <Txt variant="dim">Hedef {settings.wpm} kelime/dk</Txt>

      {!hasData ? (
        <Card style={{ marginTop: theme.space(6), gap: theme.space(2) }}>
          <Txt variant="heading">Henüz veri yok</Txt>
          <Txt variant="dim">
            Bir metni en az üç saniye okuduğunda oturum kaydedilir ve buradaki grafikler
            dolmaya başlar.
          </Txt>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: theme.space(3), marginTop: theme.space(5) }}>
            <Stat label="Gün serisi" value={`${summary.streak}`} unit="gün" emphasis />
            <Stat label="Bugün" value={formatNumber(summary.todayWords)} unit="kelime" />
          </View>

          <View style={{ flexDirection: 'row', gap: theme.space(3), marginTop: theme.space(3) }}>
            <Stat label="Ortalama hız" value={formatNumber(summary.averageWpm)} unit="kel/dk" />
            <Stat label="En iyi hız" value={formatNumber(summary.bestWpm)} unit="kel/dk" />
          </View>

          <SectionHeader title="Son 14 gün" hint="Günlük okunan kelime sayısı" />
          <Card>
            <BarChart
              bars={summary.daily.map((day) => ({
                label: WEEKDAYS[new Date(day.day).getDay()],
                value: day.words,
                emphasis: day.day === today,
              }))}
            />
          </Card>

          <SectionHeader title="Toplam" />
          <Card style={{ gap: theme.space(2) }}>
            <Row label="Okunan kelime" value={formatNumber(summary.totalWords)} />
            <Row label="Okuma süresi" value={formatDuration(summary.totalMs)} />
            <Row
              label="Kazanılan süre"
              value={savedTime(summary.totalWords, summary.totalMs)}
              hint="Aynı metni dakikada 230 kelimeyle okusaydın ne kadar sürerdi karşılaştırması"
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

/** Ortalama bir yetişkin okuma hızı — "kazanılan süre" karşılaştırması için. */
const BASELINE_WPM = 230;

function savedTime(words: number, actualMs: number): string {
  const baselineMs = (words / BASELINE_WPM) * 60000;
  const saved = baselineMs - actualMs;
  if (saved <= 0) return 'henüz yok';
  return formatDuration(saved);
}

function Stat({
  label,
  value,
  unit,
  emphasis,
}: {
  label: string;
  value: string;
  unit: string;
  emphasis?: boolean;
}) {
  const { theme } = useSettings();
  return (
    <Card style={{ flex: 1, gap: theme.space(1) }}>
      <Txt variant="label">{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.space(1.5) }}>
        <Txt
          variant="title"
          style={{ fontSize: 28, color: emphasis ? theme.colors.accent : theme.colors.text }}
        >
          {value}
        </Txt>
        <Txt variant="dim" style={{ fontSize: 12 }}>
          {unit}
        </Txt>
      </View>
    </Card>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const { theme } = useSettings();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.space(4) }}>
      <View style={{ flex: 1 }}>
        <Txt variant="body">{label}</Txt>
        {hint ? (
          <Txt variant="dim" style={{ fontSize: 12, marginTop: 2 }}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <Txt variant="mono" style={{ color: theme.colors.accent }}>
        {value}
      </Txt>
    </View>
  );
}
