import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { booksFinishedInYear, finishEstimateDays, yearlyGoalStatus } from '@/habit/books';
import { dailySuggestions, type Suggestion } from '@/habit/today';
import { useSettings } from '@/store/SettingsContext';
import { listAssessments } from '@/storage/assessments';
import {
  listDocumentsWithProgress,
  type DocumentMeta,
  type DocumentProgress,
} from '@/storage/documents';
import { drillDoneOn, listDrillResults } from '@/storage/drills';
import { dayKey, listSessions, summarize, type ReadingSession, type StatsSummary } from '@/storage/stats';
import { listVocab } from '@/storage/vocab';
import { improvement, testDue, type AssessmentRecord } from '@/train/assessment';
import { dueCount } from '@/train/review';
import { DailyGoal } from '@/ui/DailyGoal';
import { formatPercent } from '@/ui/format';
import { Icon } from '@/ui/Icon';
import { Button, Card, ProgressBar, Screen, SectionHeader, Txt } from '@/ui/primitives';

/**
 * Bugün — uygulama açılınca ilk görülen ekran.
 *
 * Alışkanlık uygulamalarında işe yarayan düzen: açınca ne yapacağın belli.
 * Sıra: seri → günlük hedef → okumaya devam → bugün için öneriler → gelişim.
 */

interface Snapshot {
  summary: StatsSummary;
  sessions: ReadingSession[];
  assessments: AssessmentRecord[];
  current: { meta: DocumentMeta; progress: DocumentProgress | null } | null;
  booksThisYear: number;
  suggestions: Suggestion[];
}

function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 5) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function TodayScreen() {
  const router = useRouter();
  const { theme, settings, ready } = useSettings();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  // İlk açılışta bir kez sihirbaz (ayarlar diskten okunduktan sonra)
  const onboardingShown = useRef(false);
  useEffect(() => {
    if (!ready || settings.onboardingDone || onboardingShown.current) return;
    onboardingShown.current = true;
    router.push('/onboarding');
  }, [ready, settings.onboardingDone, router]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const now = Date.now();
      Promise.all([
        listSessions(),
        listAssessments(),
        listDocumentsWithProgress(),
        listDrillResults(),
        listVocab(),
      ]).then(([sessions, assessments, documents, drills, vocab]) => {
        if (cancelled) return;
        // Okumaya devam: en son dokunulan, bitmemiş doküman
        const unfinished = documents
          .filter((item) => !item.progress?.finished)
          .sort((a, b) => (b.progress?.updatedAt ?? 0) - (a.progress?.updatedAt ?? 0));
        const tests = assessments.filter((record) => record.kind === 'test');

        setSnapshot({
          summary: summarize(sessions, now),
          sessions,
          assessments,
          current: unfinished[0] ?? null,
          booksThisYear: booksFinishedInYear(
            documents.map((item) => ({
              wordCount: item.meta.wordCount,
              finished: Boolean(item.progress?.finished),
              finishedAt: item.progress?.finishedAt,
            })),
            now
          ),
          suggestions: dailySuggestions(
            {
              noTestYet: tests.length === 0,
              testDue: testDue(assessments, now),
              dueWords: dueCount(vocab, now),
              warmupDoneToday: drillDoneOn(drills, dayKey(now)),
            },
            now
          ),
        });
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!snapshot) return <Screen />;

  const { summary, current } = snapshot;
  const progressChange = improvement(snapshot.assessments);

  return (
    <Screen>
      <Txt variant="dim">{greeting(Date.now())}</Txt>
      <Txt variant="title">Bugün</Txt>

      <StreakCard summary={summary} />

      <View style={{ marginTop: theme.space(3) }}>
        <DailyGoal todayMs={summary.todayMs} todayWords={summary.todayWords} streak={summary.streak} />
      </View>

      <SectionHeader title="Okumaya devam" />
      {current ? (
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading" numberOfLines={2}>
            {current.meta.title}
          </Txt>
          {current.progress && current.progress.ratio > 0.001 ? (
            <View style={{ gap: theme.space(1.5) }}>
              <ProgressBar ratio={current.progress.ratio} />
              <Txt variant="dim" style={{ fontSize: 12 }}>
                {formatPercent(current.progress.ratio)} okundu
                {finishLabel(
                  finishEstimateDays(
                    Math.round(current.meta.wordCount * (1 - current.progress.ratio)),
                    snapshot.sessions,
                    Date.now()
                  )
                )}
              </Txt>
            </View>
          ) : null}
          <View style={{ gap: theme.space(2) }}>
            <Button
              label="Devam et"
              icon="play"
              onPress={() => router.push(`/reader/${current.meta.id}`)}
            />
            <Button
              label={`${settings.focusMinutes} dakikalık odak seansı`}
              icon="focus"
              variant="secondary"
              onPress={() =>
                router.push(`/reader/${current.meta.id}?seans=${settings.focusMinutes * 60}`)
              }
            />
          </View>
        </Card>
      ) : (
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="dim">
            Kütüphanende yarım kalmış bir metin yok. Bir kitap, makale ya da bağlantı ekle.
          </Txt>
          <Button label="Metin ekle" icon="plus" onPress={() => router.push('/import')} />
        </Card>
      )}

      {snapshot.suggestions.length > 0 ? (
        <>
          <SectionHeader title="Bugün için" />
          <View style={{ gap: theme.space(2) }}>
            {snapshot.suggestions.map((item) => (
              <Card key={item.id} onPress={() => router.push(item.href as never)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(3) }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="body">{item.title}</Txt>
                    <Txt variant="dim" style={{ fontSize: 13 }}>
                      {item.detail}
                    </Txt>
                  </View>
                  <Icon name="chevronRight" size={20} color={theme.colors.textFaint} />
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {progressChange || settings.yearlyBookGoal > 0 ? (
        <SectionHeader title="Gelişim" />
      ) : null}
      {progressChange ? (
        <Pressable onPress={() => router.push('/stats')}>
          <Txt variant="body">
            Efektif okuma hızın ilk ölçüme göre{' '}
            <Txt
              variant="body"
              style={{ color: progressChange.change >= 0 ? theme.colors.success : theme.colors.warning }}
            >
              {progressChange.change >= 0 ? '%' : '-%'}
              {Math.round(Math.abs(progressChange.change) * 100)}
            </Txt>{' '}
            değişti ({progressChange.tests} ölçüm).
          </Txt>
        </Pressable>
      ) : null}
      {settings.yearlyBookGoal > 0 ? (
        <YearlyBooks finished={snapshot.booksThisYear} goal={settings.yearlyBookGoal} />
      ) : null}
    </Screen>
  );
}

function finishLabel(days: number | null): string {
  if (days === null || days <= 0) return '';
  return days === 1 ? ' · bu tempoyla bir okuma gününde biter' : ` · bu tempoyla ~${days} okuma gününde biter`;
}

/**
 * Seri kartı. Esnek kural burada da açıkça yazıyor: bir gün kaçırmak seriyi
 * bozmaz, iki gün üst üste bozar. Tehlikedeyse tek cümleyle söylüyor.
 */
function StreakCard({ summary }: { summary: StatsSummary }) {
  const { theme } = useSettings();
  const message = summary.streakAtRisk
    ? 'Dün okumadın — bugün okursan serin sürer.'
    : summary.readToday
      ? 'Bugün okudun. Seri devam ediyor.'
      : summary.streak > 0
        ? 'Bugün biraz okuyarak seriyi büyüt.'
        : 'Bugün okuyarak yeni bir seri başlat.';

  return (
    <Card
      style={{
        marginTop: theme.space(4),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(4),
        borderColor: summary.streakAtRisk ? theme.colors.warning : theme.colors.border,
      }}
    >
      <View style={{ alignItems: 'center', minWidth: 56 }}>
        <Txt variant="title" style={{ fontSize: 34, color: theme.colors.accent }}>
          {summary.streak}
        </Txt>
        <Txt variant="dim" style={{ fontSize: 11 }}>
          gün seri
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body">{message}</Txt>
        <Txt variant="dim" style={{ fontSize: 12 }}>
          Bir gün kaçırmak seriyi bozmaz; iki gün üst üste kaçırmak bozar.
        </Txt>
      </View>
    </Card>
  );
}

function YearlyBooks({ finished, goal }: { finished: number; goal: number }) {
  const { theme } = useSettings();
  const status = yearlyGoalStatus(finished, goal, Date.now());
  return (
    <Card style={{ gap: theme.space(2), marginTop: theme.space(3) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt variant="body">Bu yılın kitapları</Txt>
        <Txt variant="dim" style={{ fontSize: 13 }}>
          {finished} / {goal}
        </Txt>
      </View>
      <ProgressBar ratio={Math.min(1, finished / goal)} />
      <Txt variant="dim" style={{ fontSize: 12 }}>
        {status.remaining === 0
          ? 'Yıllık hedefe ulaştın.'
          : `${status.remaining} kitap kaldı · yılın bitmesine ${status.weeksLeft} hafta var`}
      </Txt>
    </Card>
  );
}
