import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { CHALLENGES, progressLabel, type ChallengeProgress } from '@/habit/challenges';
import { useSettings } from '@/store/SettingsContext';
import { abandonChallenge, loadChallenges, startChallenge, type StoredChallenge } from '@/storage/challenges';
import { formatDayKey } from '@/ui/format';
import { Button, Card, IconButton, ProgressBar, Screen, SectionHeader, Txt } from '@/ui/primitives';

/**
 * Okuma meydan okumaları: süreli, somut hedefler (7 gün üst üste, 30 günde bir
 * kitap…). İlerleme oturumlardan ve bitirilen kitaplardan hesaplanır.
 */

type Item = ChallengeProgress & { entry: StoredChallenge };

const STATUS_LABEL: Record<Item['status'], string> = {
  active: 'Sürüyor',
  done: 'Tamamlandı',
  missed: 'Kaçtı',
  abandoned: 'Bırakıldı',
};

export default function ChallengesScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const [items, setItems] = useState<Item[] | null>(null);

  const load = useCallback(() => {
    void loadChallenges().then(setItems);
  }, []);
  useFocusEffect(load);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const active = (items ?? []).filter((item) => item.status === 'active');
  const history = (items ?? []).filter((item) => item.status !== 'active');
  const running = new Set(active.map((item) => item.def.id));

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -theme.space(2) }}>
        <IconButton name="chevronLeft" onPress={back} accessibilityLabel="Geri" emphasis="strong" />
        <Txt variant="title" style={{ fontSize: 26 }}>
          Meydan okumalar
        </Txt>
      </View>
      <Txt variant="dim" style={{ marginTop: theme.space(1) }}>
        Süreli, küçük hedefler alışkanlığı kurmanın en kolay yolu. İlerleme okuduklarından kendiliğinden
        hesaplanır; tamamlayınca rozet kazanırsın.
      </Txt>

      {active.length ? (
        <>
          <SectionHeader title="Sürenler" />
          <View style={{ gap: theme.space(2) }}>
            {active.map((item) => (
              <Card key={`${item.def.id}-${item.entry.startedAt}`} style={{ gap: theme.space(2) }}>
                <Txt variant="body">{item.def.title}</Txt>
                <ProgressBar ratio={item.ratio} />
                <Txt variant="dim" style={{ fontSize: 13 }}>
                  {progressLabel(item)} · {item.daysLeft === 1 ? 'bugün son gün' : `${item.daysLeft} gün kaldı`}
                </Txt>
                <Button
                  label="Bırak"
                  variant="ghost"
                  onPress={() => void abandonChallenge(item.entry).then(load)}
                />
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Başlat" />
      <View style={{ gap: theme.space(2) }}>
        {CHALLENGES.filter((def) => !running.has(def.id)).map((def) => (
          <Card key={def.id} style={{ gap: theme.space(2) }}>
            <Txt variant="body">{def.title}</Txt>
            <Txt variant="dim" style={{ fontSize: 13 }}>
              {def.detail} Süre: {def.days} gün, bugün başlar.
            </Txt>
            <Button
              label="Başla"
              icon="play"
              variant="secondary"
              onPress={() => void startChallenge(def.id).then(load)}
            />
          </Card>
        ))}
      </View>

      {history.length ? (
        <>
          <SectionHeader title="Geçmiş" />
          <View style={{ gap: theme.space(2) }}>
            {history.map((item) => (
              <View
                key={`${item.def.id}-${item.entry.startedAt}`}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.space(2) }}
              >
                <Txt variant="body" style={{ flex: 1, fontSize: 14 }}>
                  {item.def.title}
                  <Txt variant="dim" style={{ fontSize: 12 }}>
                    {' '}
                    · {formatDayKey(item.startDay, false)}
                  </Txt>
                </Txt>
                <Txt
                  variant="dim"
                  style={{
                    fontSize: 13,
                    color: item.status === 'done' ? theme.colors.success : theme.colors.textDim,
                  }}
                >
                  {STATUS_LABEL[item.status]}
                </Txt>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
