import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { listDocumentsWithProgress, type DocumentMeta } from '@/storage/documents';
import { EXERCISES } from '@/train/exercises';
import { formatDuration } from '@/ui/format';
import { Button, Card, Chip, Screen, SectionHeader, Txt } from '@/ui/primitives';

export default function TrainScreen() {
  const router = useRouter();
  const { theme, settings } = useSettings();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listDocumentsWithProgress().then((items) => {
        const metas = items.map((item) => item.meta);
        setDocuments(metas);
        setSelected((current) => current ?? metas[0]?.id ?? null);
      });
    }, [])
  );

  if (documents.length === 0) {
    return (
      <Screen>
        <Txt variant="title">Antrenman</Txt>
        <Card style={{ marginTop: theme.space(6), gap: theme.space(3) }}>
          <Txt variant="heading">Önce bir metin gerekiyor</Txt>
          <Txt variant="dim">
            Egzersizler kütüphanendeki bir metin üzerinde çalışır. Bir metin ekleyip
            buraya dönebilirsin.
          </Txt>
          <Button label="Metin ekle" icon="plus" onPress={() => router.push('/import')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Txt variant="title">Antrenman</Txt>
      <Txt variant="dim">
        Egzersizler hedef hızın ({settings.wpm} kelime/dk) üzerinden hesaplanır.
      </Txt>

      <SectionHeader title="Metin" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {documents.slice(0, 6).map((meta) => (
          <Chip
            key={meta.id}
            label={meta.title.length > 24 ? `${meta.title.slice(0, 22)}…` : meta.title}
            active={selected === meta.id}
            onPress={() => setSelected(meta.id)}
          />
        ))}
      </View>

      <SectionHeader title="Egzersizler" />
      <View style={{ gap: theme.space(3) }}>
        {EXERCISES.map((exercise) => (
          <Card
            key={exercise.id}
            onPress={() => router.push(`/training/run?exercise=${exercise.id}&docId=${selected}`)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="heading">{exercise.title}</Txt>
              <Txt variant="dim" style={{ fontSize: 12 }}>
                {formatDuration(exercise.durationMs)}
              </Txt>
            </View>
            <Txt variant="dim" style={{ marginTop: theme.space(2) }}>
              {exercise.purpose}
            </Txt>
          </Card>
        ))}
      </View>

      <SectionHeader
        title="Anlama testi"
        hint="Okuduğun bölümden otomatik boşluk doldurma soruları üretilir. Hız, anlama pahasına yükseliyorsa hız değil kayıptır."
      />
      <Button
        label="Anlama testini çöz"
        variant="secondary"
        icon="check"
        onPress={() => router.push(`/training/quiz?docId=${selected}`)}
      />
    </Screen>
  );
}
