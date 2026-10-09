import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { PLAN_STATE_LABEL, planStatus, wordsReadToday, type BookPlan } from '@/habit/bookPlan';
import { finishEstimateDays } from '@/habit/books';
import { useSettings } from '@/store/SettingsContext';
import {
  listDocumentsWithProgress,
  removeDocument,
  SOURCE_LABEL,
  type DocumentMeta,
  type DocumentProgress,
} from '@/storage/documents';
import { listAssessments } from '@/storage/assessments';
import { listPlans } from '@/storage/plans';
import { listSessions, type ReadingSession } from '@/storage/stats';
import { naturalWpm } from '@/train/assessment';
import { planStateColor } from '@/ui/PlanSection';
import { Icon } from '@/ui/Icon';
import { formatNumber, formatPercent, formatShortDuration } from '@/ui/format';
import { Button, Card, IconButton, ProgressBar, Screen, Txt } from '@/ui/primitives';

export default function LibraryScreen() {
  const router = useRouter();
  const { theme, settings } = useSettings();
  const [items, setItems] = useState<{ meta: DocumentMeta; progress: DocumentProgress | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [plans, setPlans] = useState<BookPlan[]>([]);
  const [wpm, setWpm] = useState(230);

  const refresh = useCallback(() => {
    listDocumentsWithProgress().then((next) => {
      setItems(next);
      setLoading(false);
    });
    // Bitiş tahmini için: oturumlar okuyucudan dönünce güncellenmiş olur
    listSessions().then(setSessions);
    listPlans().then(setPlans);
    listAssessments().then((history) => setWpm(naturalWpm(history)));
  }, []);

  // Okuyucudan dönüldüğünde ilerleme güncellenmiş olur
  useFocusEffect(refresh);

  const confirmRemove = (meta: DocumentMeta) => {
    const remove = () => removeDocument(meta.id).then(refresh);
    if (Platform.OS === 'web') {
      // Alert.alert web'de düğme göstermiyor; tarayıcının kendi onayını kullan
      if (window.confirm(`"${meta.title}" silinsin mi?`)) remove();
      return;
    }
    Alert.alert('Silinsin mi?', meta.title, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: remove },
    ]);
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.space(5),
        }}
      >
        <View>
          <Txt variant="title">Kütüphane</Txt>
          <Txt variant="dim">
            {settings.wpm} kelime/dakika hedefi ·{' '}
            <Txt variant="dim" style={{ color: theme.colors.accent }} onPress={() => router.push('/books')}>
              Okuduğum kitaplar
            </Txt>
          </Txt>
        </View>
        <IconButton
          name="plus"
          size={28}
          emphasis="strong"
          onPress={() => router.push('/import')}
          accessibilityLabel="Metin ekle"
        />
      </View>


      {loading ? null : items.length === 0 ? (
        <EmptyState onAdd={() => router.push('/import')} />
      ) : (
        <View style={{ gap: theme.space(3) }}>
          {items.map(({ meta, progress }) => (
            <Card key={meta.id} onPress={() => router.push(`/reader/${meta.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space(3) }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="heading" numberOfLines={2}>
                    {meta.title}
                  </Txt>
                  <Txt variant="dim" style={{ marginTop: theme.space(1), fontSize: 13 }}>
                    {SOURCE_LABEL[meta.source]} · {formatNumber(meta.wordCount)} kelime · ~
                    {formatShortDuration((meta.wordCount / settings.wpm) * 60000)}
                  </Txt>
                </View>
                <IconButton
                  name="book"
                  size={18}
                  emphasis="faint"
                  onPress={() => router.push(`/book/${meta.id}`)}
                  accessibilityLabel={`${meta.title}: kitap kartı`}
                />
                <IconButton
                  name="trash"
                  size={18}
                  emphasis="faint"
                  onPress={() => confirmRemove(meta)}
                  accessibilityLabel={`${meta.title} sil`}
                />
              </View>

              {progress && progress.ratio > 0.001 ? (
                <View style={{ marginTop: theme.space(3), gap: theme.space(1.5) }}>
                  <ProgressBar ratio={progress.ratio} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt variant="dim" style={{ fontSize: 12 }}>
                      {progress.finished
                        ? 'Tamamlandı'
                        : `${formatPercent(progress.ratio)} okundu${estimateLabel(
                            finishEstimateDays(
                              Math.round(meta.wordCount * (1 - progress.ratio)),
                              sessions,
                              Date.now()
                            )
                          )}`}
                    </Txt>
                    <Txt
                      variant="dim"
                      style={{ fontSize: 12, color: theme.colors.accent }}
                    >
                      Devam et →
                    </Txt>
                  </View>
                </View>
              ) : null}
              <PlanLine
                plan={plans.find((plan) => plan.docId === meta.id)}
                meta={meta}
                progress={progress}
                sessions={sessions}
                wpm={wpm}
              />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Kitabın planı varsa tek satır: bugünkü pay ve durum */
function PlanLine({
  plan,
  meta,
  progress,
  sessions,
  wpm,
}: {
  plan: BookPlan | undefined;
  meta: DocumentMeta;
  progress: DocumentProgress | null;
  sessions: ReadingSession[];
  wpm: number;
}) {
  const { theme } = useSettings();
  if (!plan) return null;
  const now = Date.now();
  const status = planStatus(
    plan,
    {
      wordCount: meta.wordCount,
      readWords: Math.round(meta.wordCount * (progress?.ratio ?? 0)),
      finished: Boolean(progress?.finished),
      todayRead: wordsReadToday(sessions, meta.id, now),
    },
    now,
    wpm
  );
  const detail =
    status.state === 'done'
      ? 'plan tamamlandı'
      : status.state === 'overdue'
        ? 'süre doldu, yeni süre seç'
        : status.todayLeft === 0
          ? `bugünkü pay okundu · ${status.daysLeft} gün kaldı`
          : `bugün ~${status.todayMinutes} dk · ${status.daysLeft} gün kaldı`;
  return (
    <Txt variant="dim" style={{ fontSize: 12, marginTop: theme.space(2) }}>
      <Txt variant="dim" style={{ fontSize: 12, color: planStateColor(status.state, theme.colors) }}>
        Plan: {PLAN_STATE_LABEL[status.state]}
      </Txt>{' '}
      · {detail}
    </Txt>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { theme } = useSettings();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: theme.space(10), gap: theme.space(3) }}>
      <Icon name="library" size={40} color={theme.colors.textFaint} />
      <Txt variant="heading">Kütüphane boş</Txt>
      <Txt variant="dim" style={{ textAlign: 'center', maxWidth: 280 }}>
        Bir metin yapıştır, dosya yükle ya da bağlantı ver — hemen hızlı okumaya başla.
      </Txt>
      <Button label="Metin ekle" icon="plus" onPress={onAdd} style={{ marginTop: theme.space(2) }} />
    </Card>
  );
}

/** "bu tempoyla ~6 okuma gününde biter" — veri yoksa hiçbir şey söylemez. */
function estimateLabel(days: number | null): string {
  if (days === null || days <= 0) return '';
  return days === 1 ? ' · bu tempoyla bir okuma gününde biter' : ` · bu tempoyla ~${days} okuma gününde biter`;
}
