import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { practicePassages } from '@/content/passages';
import { useSettings } from '@/store/SettingsContext';
import { listDocumentsWithProgress, type DocumentMeta } from '@/storage/documents';
import { listVocab } from '@/storage/vocab';
import { EXERCISES } from '@/train/exercises';
import { dueCount } from '@/train/review';
import { formatDuration } from '@/ui/format';
import { Icon, type IconName } from '@/ui/Icon';
import { Button, Card, Chip, Screen, SectionHeader, Txt } from '@/ui/primitives';

/**
 * Antrenman: ölçüm, ısınma, okuma becerileri, hız egzersizleri.
 *
 * Hız egzersizleri artık kütüphane boşken de çalışıyor: gömülü egzersiz
 * metinleri ("pratik:" önekli) seçilebiliyor.
 */

const DRILLS: { title: string; detail: string; href: string; icon: IconName; section: 'warmup' | 'skill' }[] = [
  {
    title: 'Schulte tablosu',
    detail: 'Gözü merkezde tutup sayıları sırayla bul — dikkat ve çevresel görüş ısınması.',
    href: '/drills/schulte',
    icon: 'grid',
    section: 'warmup',
  },
  {
    title: 'Flaş kelime',
    detail: 'Kısa süre görünen kelime grubunu tanı. Bir bakışta gördüğün alan genişler.',
    href: '/drills/flash',
    icon: 'eye',
    section: 'warmup',
  },
  {
    title: 'Tarama',
    detail: 'Metinde aranan bilgiyi okumadan, bakarak bul.',
    href: '/drills/scan',
    icon: 'search',
    section: 'skill',
  },
  {
    title: 'Göz gezdirme',
    detail: 'Yalnızca ilk cümlelerden metnin ana fikrini yakala.',
    href: '/drills/skim',
    icon: 'book',
    section: 'skill',
  },
];

export default function TrainScreen() {
  const router = useRouter();
  const { theme, settings } = useSettings();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [vocab, setVocab] = useState({ total: 0, due: 0 });
  const practice = practicePassages([]);

  useFocusEffect(
    useCallback(() => {
      listDocumentsWithProgress().then((items) => {
        const metas = items.map((item) => item.meta);
        setDocuments(metas);
        setSelected((current) => current ?? metas[0]?.id ?? `pratik:${practice[0].id}`);
      });
      listVocab().then((entries) =>
        setVocab({ total: entries.length, due: dueCount(entries, Date.now()) })
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const drillCards = (section: 'warmup' | 'skill') => (
    <View style={{ gap: theme.space(2) }}>
      {DRILLS.filter((drill) => drill.section === section).map((drill) => (
        <Card key={drill.href} onPress={() => router.push(drill.href as never)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(3) }}>
            <Icon name={drill.icon} size={22} color={theme.colors.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="body">{drill.title}</Txt>
              <Txt variant="dim" style={{ fontSize: 13 }}>
                {drill.detail}
              </Txt>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  const isPractice = selected?.startsWith('pratik:') ?? false;

  return (
    <Screen>
      <Txt variant="title">Antrenman</Txt>

      <SectionHeader
        title="Ölçüm"
        hint="Kendi hızında iki dakikalık okuma + beş soru. Haftada bir tekrarla; gerçekten hızlanıp hızlanmadığını bu gösterir."
      />
      <Button label="Seviye testi / haftalık ölçüm" icon="check" onPress={() => router.push('/assess')} />

      <SectionHeader title="Isınma" hint="Okumadan önce bir iki dakika." />
      {drillCards('warmup')}

      <SectionHeader
        title="Okuma becerileri"
        hint="Araştırmalara göre hızlı okumanın gerçekten işe yarayan kısmı: neyi aradığını bilerek bakmak."
      />
      {drillCards('skill')}

      <SectionHeader
        title="Hız egzersizleri"
        hint={`Hedef hızın (${settings.wpm} kelime/dk) üzerinden hesaplanır. Önce metni seç.`}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {documents.slice(0, 6).map((meta) => (
          <Chip
            key={meta.id}
            label={meta.title.length > 24 ? `${meta.title.slice(0, 22)}…` : meta.title}
            active={selected === meta.id}
            onPress={() => setSelected(meta.id)}
          />
        ))}
        {practice.map((passage) => (
          <Chip
            key={passage.id}
            label={`Pratik: ${passage.title}`}
            active={selected === `pratik:${passage.id}`}
            onPress={() => setSelected(`pratik:${passage.id}`)}
          />
        ))}
      </View>
      <View style={{ gap: theme.space(3), marginTop: theme.space(3) }}>
        {EXERCISES.map((exercise) => (
          <Card
            key={exercise.id}
            onPress={() =>
              selected &&
              router.push(`/training/run?exercise=${exercise.id}&docId=${encodeURIComponent(selected)}`)
            }
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

      {selected && !isPractice ? (
        <>
          <SectionHeader
            title="Anlama testi"
            hint="Seçili metinde okuduğun bölümden sorular. Sonuç Gelişim ekranına kaydedilir."
          />
          <Button
            label="Anlama testini çöz"
            variant="secondary"
            icon="check"
            onPress={() => router.push(`/training/quiz?docId=${selected}`)}
          />
        </>
      ) : null}

      <SectionHeader
        title="Kelime defteri"
        hint="Okurken uzun basıp kaydettiğin kelimeler, geçtikleri cümleyle birlikte burada."
      />
      <Button
        label={
          vocab.total === 0
            ? 'Defteri aç (boş)'
            : vocab.due > 0
              ? `Tekrar et (${vocab.due} kelime hazır)`
              : `Defteri aç (${vocab.total} kelime)`
        }
        variant="secondary"
        icon="book"
        onPress={() => router.push('/vocab')}
      />
    </Screen>
  );
}
