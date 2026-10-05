import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { LEVEL_LABEL } from '@/content/passages';
import { useSettings } from '@/store/SettingsContext';
import { listAssessments } from '@/storage/assessments';
import { heatmapDays, weeklyComparison } from '@/habit/summary';
import {
  dayKey,
  listSessions,
  summarize,
  type ReadingSession,
  type StatsSummary,
} from '@/storage/stats';
import { Heatmap } from '@/ui/Heatmap';
import {
  baselineWpm,
  effectiveOf,
  improvement,
  levelOf,
  reliableTests,
  testDue,
  type AssessmentRecord,
} from '@/train/assessment';
import type { Badge } from '@/habit/badges';
import { loadBadges } from '@/storage/badges';
import { BadgeList } from '@/ui/BadgeList';
import { BarChart } from '@/ui/BarChart';
import { formatDuration, formatNumber } from '@/ui/format';
import { LineChart } from '@/ui/LineChart';
import { Button, Card, Screen, SectionHeader, Txt } from '@/ui/primitives';

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function shortDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const WEEKDAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

export default function StatsScreen() {
  const { theme, settings } = useSettings();
  const router = useRouter();
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  useFocusEffect(
    useCallback(() => {
      listSessions().then((loaded) => {
        setSessions(loaded);
        setSummary(summarize(loaded));
      });
      listAssessments().then(setAssessments);
      loadBadges().then(setBadges);
    }, [])
  );

  if (!summary) return <Screen />;

  const hasData = summary.totalWords > 0;
  const today = dayKey(Date.now());
  const baseline = baselineWpm(assessments);

  return (
    <Screen>
      <Txt variant="title">Gelişim</Txt>
      <Txt variant="dim">Antrenman temposu {settings.wpm} kelime/dk</Txt>

      <RealProgress assessments={assessments} onTest={() => router.push('/assess')} />

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
            {/* Bu sayı uygulamanın gösterdiği tempo — okuma becerisi değil.
                Beceri yukarıdaki ölçümlerde. */}
            <Stat label="Antrenman temposu" value={formatNumber(summary.averageWpm)} unit="kel/dk ort." />
            {/* En iyi hız yalnızca 100+ kelimelik oturumlardan sayılıyor;
                henüz öyle bir oturum yoksa 0 göstermek yanıltıcı olur */}
            <Stat
              label="En yüksek tempo"
              value={summary.bestWpm > 0 ? formatNumber(summary.bestWpm) : '—'}
              unit={summary.bestWpm > 0 ? 'kel/dk' : '100+ kelime gerek'}
            />
          </View>

          <WeekCard sessions={sessions} />

          <SectionHeader title="Okuma takvimi" hint="Son 16 hafta · gün başına okuma dakikası" />
          <Card>
            <Heatmap days={heatmapDays(sessions, Date.now(), 16)} />
          </Card>

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

          <SectionHeader
            title={`Rozetler · ${badges.filter((badge) => badge.earned).length} / ${badges.length}`}
            hint="Puan yok; yalnızca anlamlı kilometre taşları. Hız rozeti bilerek yok — efektif hız var."
          />
          <BadgeList badges={badges} />

          <SectionHeader title="Toplam" />
          <Card style={{ gap: theme.space(2) }}>
            <Row label="Okunan kelime" value={formatNumber(summary.totalWords)} />
            <Row label="Okuma süresi" value={formatDuration(summary.totalMs)} />
            <Row
              label="Kazanılan süre"
              value={savedTime(summary.totalWords, summary.totalMs, baseline.wpm)}
              hint={
                baseline.measured
                  ? `Aynı metinleri ilk ölçümdeki doğal hızınla (${formatNumber(baseline.wpm)} kel/dk) okusaydın ne kadar sürerdi karşılaştırması`
                  : 'Ortalama yetişkin hızıyla (230 kel/dk) karşılaştırma — seviye testini yaparsan kendi başlangıç hızın kullanılır'
              }
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

function savedTime(words: number, actualMs: number, baselineWpm: number): string {
  const baselineMs = (words / baselineWpm) * 60000;
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

/**
 * Gerçek gelişim: kendi hızında okuma ölçümleri. Uygulamanın temposundan
 * bağımsız tek sayı burası — "gerçekten hızlandım mı?" sorusunun cevabı.
 */
function RealProgress({
  assessments,
  onTest,
}: {
  assessments: AssessmentRecord[];
  onTest: () => void;
}) {
  const { theme } = useSettings();
  const allTests = reliableTests(assessments);
  const latest = allTests[allTests.length - 1];
  // Grafik yalnızca son ölçümün seviyesini çizer: farklı zorluk aynı çizgide yanıltır
  const level = latest ? levelOf(latest) : 'orta';
  const tests = allTests.filter((record) => levelOf(record) === level);
  const otherLevels = allTests.length - tests.length;
  const change = improvement(assessments);
  const due = testDue(assessments, Date.now());
  const quizzes = assessments.filter((record) => record.kind === 'quiz').slice(0, 5);
  const quizComprehension =
    quizzes.length > 0
      ? quizzes.reduce((sum, record) => sum + record.correct / Math.max(1, record.total), 0) /
        quizzes.length
      : null;

  return (
    <>
      <SectionHeader
        title="Gerçek gelişim"
        hint="Kendi hızında okuma ölçümleri. Efektif hız = doğal hız × anlama: anlamadan hızlanmak gelişim sayılmaz."
      />
      {!latest ? (
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading">Henüz ölçüm yok</Txt>
          <Txt variant="dim">
            İki dakikalık bir metin oku, beş soruyu cevapla: doğal hızını ve anlama oranını
            görelim. Gelişimin bu başlangıç noktasına göre ölçülecek.
          </Txt>
          <Button label="Seviye testini yap" icon="check" onPress={onTest} />
        </Card>
      ) : (
        <Card style={{ gap: theme.space(3) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.space(3) }}>
            <Figure label="Doğal hız" value={formatNumber(latest.wpm)} unit="kel/dk" />
            <Figure
              label="Anlama"
              value={`%${Math.round((latest.correct / latest.total) * 100)}`}
              unit=""
            />
            <Figure label="Efektif" value={formatNumber(effectiveOf(latest))} unit="kel/dk" accent />
          </View>
          <Txt variant="dim" style={{ fontSize: 12 }}>
            Seviye: {LEVEL_LABEL[level]}
            {otherLevels > 0 ? ` · diğer seviyelerde ${otherLevels} ölçüm (grafikte yok)` : ''}
          </Txt>
          {tests.length > 1 ? (
            <LineChart
              unit="kel/dk efektif"
              points={tests.map((record) => ({
                label: shortDate(record.at),
                value: effectiveOf(record),
              }))}
            />
          ) : null}
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {change
              ? `Bu seviyedeki ilk ölçüme göre efektif hızın ${
                  Math.abs(change.change) < 0.03
                    ? 'yaklaşık aynı'
                    : `${change.change > 0 ? '%' + Math.round(change.change * 100) + ' arttı' : '%' + Math.round(-change.change * 100) + ' azaldı'}`
                } (${change.tests} ölçüm).`
              : 'Bu seviyede bir sonraki ölçümden sonra gelişim grafiği burada görünecek.'}
          </Txt>
          <Button
            label={due ? 'Haftalık ölçüm zamanı' : 'Yeniden ölç'}
            variant={due ? 'primary' : 'secondary'}
            icon="check"
            onPress={onTest}
          />
        </Card>
      )}
      {quizComprehension !== null ? (
        <Txt variant="dim" style={{ fontSize: 13, marginTop: theme.space(2) }}>
          Son {quizzes.length} anlama testinde ortalama anlama: %{Math.round(quizComprehension * 100)}
        </Txt>
      ) : null}
    </>
  );
}

function Figure({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  const { theme } = useSettings();
  return (
    <View style={{ gap: 2 }}>
      <Txt variant="label">{label}</Txt>
      <Txt
        variant="title"
        style={{ fontSize: 24, color: accent ? theme.colors.accent : theme.colors.text }}
      >
        {value}
      </Txt>
      {unit ? (
        <Txt variant="dim" style={{ fontSize: 11 }}>
          {unit}
        </Txt>
      ) : null}
    </View>
  );
}

/** Bu hafta / geçen hafta: dakika, okuma günü, kelime. */
function WeekCard({ sessions }: { sessions: ReadingSession[] }) {
  const { theme } = useSettings();
  const { thisWeek, lastWeek } = weeklyComparison(sessions, Date.now());
  const minutes = (ms: number) => Math.round(ms / 60000);
  const delta = minutes(thisWeek.ms) - minutes(lastWeek.ms);

  return (
    <>
      <SectionHeader title="Bu hafta" hint="Pazartesiden bugüne; geçen haftanın tamamıyla karşılaştırma" />
      <Card style={{ gap: theme.space(2) }}>
        <Row label="Okuma süresi" value={`${minutes(thisWeek.ms)} dk`} />
        <Row label="Okuduğun gün" value={`${thisWeek.days} / 7`} />
        <Row label="Kelime" value={formatNumber(thisWeek.words)} />
        <Txt variant="dim" style={{ fontSize: 13 }}>
          Geçen hafta: {minutes(lastWeek.ms)} dk, {lastWeek.days} gün.{' '}
          {lastWeek.ms === 0
            ? ''
            : delta >= 0
              ? `Şimdiden ${delta} dk önündesin.`
              : `Geçen haftayı yakalamak için ${-delta} dk kaldı.`}
        </Txt>
      </Card>
    </>
  );
}
