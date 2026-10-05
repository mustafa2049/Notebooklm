import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import { listAssessments } from '@/storage/assessments';
import { loadProgram, saveProgram } from '@/storage/program';
import { reliableTests, suggestTargetWpm, scoreAssessment } from '@/train/assessment';
import {
  nextLesson,
  PROGRAM_LESSONS,
  programProgress,
  startProgram,
  WEEK_THEMES,
  type ProgramState,
} from '@/train/program';
import { Icon } from '@/ui/Icon';
import { Button, Card, IconButton, ProgressBar, Screen, SectionHeader, Txt } from '@/ui/primitives';

/**
 * 4 haftalık program: genel bakış.
 *
 * Programa başlamadan önce ne olduğu dürüstçe anlatılır: bir alıştırma düzeni,
 * vaat değil. Sonuç haftalık ölçümlerde görülür.
 */
export default function ProgramScreen() {
  const router = useRouter();
  const { theme, settings } = useSettings();
  const [state, setState] = useState<ProgramState | null | undefined>(undefined);
  const [startWpm, setStartWpm] = useState(settings.wpm);
  const [confirmReset, setConfirmReset] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProgram().then(setState);
      // Başlangıç temposu: son güvenilir ölçüme göre önerilen, yoksa ayardaki hız
      listAssessments().then((history) => {
        const last = reliableTests(history).pop();
        if (last) {
          setStartWpm(suggestTargetWpm(scoreAssessment(last.ms, last.words, last.correct, last.total)));
        }
      });
    }, [])
  );

  if (state === undefined) return <Screen />;

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.space(4),
      }}
    >
      <Txt variant="title">4 haftalık program</Txt>
      <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Kapat" />
    </View>
  );

  if (state === null) {
    return (
      <Screen>
        {header}
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading">Ne yapacağız?</Txt>
          <Txt variant="dim">
            Dört hafta, haftada beş kısa ders (her biri ~10 dakika). Her ders: kısa bir ipucu,
            ısınma, uygulama ve anlama kontrolü. Haftanın son dersi ölçüm.
          </Txt>
          {WEEK_THEMES.map((theme_, index) => (
            <Txt key={theme_} variant="body" style={{ fontSize: 15 }}>
              {index + 1}. hafta · {theme_}
            </Txt>
          ))}
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Program temposu anlamana göre ayarlanır: %80 ve üstü anlamada biraz hızlanır, %60'ın
            altında yavaşlar. Bir günü kaçırmak programı sıfırlamaz; kaldığın dersten devam
            edersin.
          </Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Dürüst not: bu bir alıştırma düzeni. Ne kadar hızlanacağını önceden söyleyemeyiz;
            sonucu haftalık ölçümlerde birlikte göreceğiz.
          </Txt>
          <Txt variant="body">Başlangıç temposu: {startWpm} kelime/dk</Txt>
          <Button
            label="Programa başla"
            icon="play"
            onPress={async () => {
              const created = startProgram(startWpm, Date.now());
              await saveProgram(created);
              setState(created);
              router.push('/program/lesson');
            }}
          />
        </Card>
      </Screen>
    );
  }

  const progress = programProgress(state);
  const next = nextLesson(state);
  const done = new Set(state.completed.map((result) => result.id));

  return (
    <Screen>
      {header}
      <Card style={{ gap: theme.space(3) }}>
        <Txt variant="heading">
          {progress.finished
            ? 'Program tamamlandı'
            : `${progress.week}. hafta · ${progress.day}. ders`}
        </Txt>
        <ProgressBar ratio={progress.done / progress.total} />
        <Txt variant="dim" style={{ fontSize: 13 }}>
          {progress.done} / {progress.total} ders · program temposu {state.wpm} kelime/dk
        </Txt>
        {next ? (
          <Button
            label={state.active?.id === next.id ? `Derse devam: ${next.title}` : `Sıradaki ders: ${next.title}`}
            icon="play"
            onPress={() => router.push('/program/lesson')}
          />
        ) : (
          <Txt variant="dim">
            Tebrikler. Bundan sonra alışkanlık devralıyor: her gün biraz oku, haftada bir ölç.
          </Txt>
        )}
      </Card>

      {WEEK_THEMES.map((weekTheme, index) => (
        <View key={weekTheme}>
          <SectionHeader title={`${index + 1}. hafta · ${weekTheme}`} />
          <View style={{ gap: theme.space(1.5) }}>
            {PROGRAM_LESSONS.filter((item) => item.week === index + 1).map((item) => {
              const result = state.completed.find((entry) => entry.id === item.id);
              const isNext = next?.id === item.id;
              return (
                <View
                  key={item.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}
                >
                  <Icon
                    name={done.has(item.id) ? 'check' : isNext ? 'play' : 'chevronRight'}
                    size={16}
                    color={
                      done.has(item.id)
                        ? theme.colors.success
                        : isNext
                          ? theme.colors.accent
                          : theme.colors.textFaint
                    }
                  />
                  <Txt
                    variant={isNext ? 'body' : 'dim'}
                    style={{ flex: 1, fontSize: 14 }}
                  >
                    {item.day}. {item.title}
                  </Txt>
                  {result?.comprehension !== undefined ? (
                    <Txt variant="dim" style={{ fontSize: 12 }}>
                      %{Math.round(result.comprehension * 100)} · {result.wpm}
                    </Txt>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <View style={{ marginTop: theme.space(6), gap: theme.space(2) }}>
        {confirmReset ? (
          <>
            <Txt variant="dim" style={{ fontSize: 13 }}>
              Program baştan başlar; ölçümlerin ve okuma geçmişin silinmez.
            </Txt>
            <Button
              label="Evet, baştan başlat"
              variant="danger"
              onPress={async () => {
                await saveProgram(null);
                setState(null);
                setConfirmReset(false);
              }}
            />
            <Button label="Vazgeç" variant="ghost" onPress={() => setConfirmReset(false)} />
          </>
        ) : (
          <Button label="Programı sıfırla" variant="ghost" onPress={() => setConfirmReset(true)} />
        )}
      </View>
    </Screen>
  );
}
