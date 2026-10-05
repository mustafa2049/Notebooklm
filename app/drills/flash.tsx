import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { practicePassages } from '@/content/passages';
import { useSettings } from '@/store/SettingsContext';
import { recordDrill } from '@/storage/drills';
import {
  FLASH_START,
  makeFlashTrial,
  nextFlashLevel,
  phrasePool,
  type FlashLevel,
  type FlashTrial,
} from '@/train/drills/flash';
import { DrillHeader } from '@/ui/DrillHeader';
import { Button, Card, Screen, Txt } from '@/ui/primitives';
import { fontStyle } from '@/ui/theme';

/**
 * Flaş kelime ekranı.
 *
 * Akış: odak işareti → grup kısa süre görünür → maske (görüntü gözde
 * "kalmasın") → dört seçenek. Gösterim süresi `requestAnimationFrame` ile
 * ölçülüyor: ekran tazelemesine bağlı olduğu için ~16 ms hassasiyetle; bu
 * sınır arayüzde gösterilen süreyi gerçek kılıyor, daha incesini vaat etmiyor.
 */

const TRIALS = 20;
type Phase = 'intro' | 'fixation' | 'show' | 'mask' | 'choose' | 'feedback' | 'done';

/** `ms` dolana kadar kare kare bekler; ekran tazelemesine hizalı. */
function afterMs(ms: number, done: () => void): () => void {
  let frame = 0;
  const start = performance.now();
  const step = (now: number) => {
    if (now - start >= ms) done();
    else frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

export default function FlashScreen() {
  const { theme, settings } = useSettings();
  const pools = useMemo(() => {
    // Yalnızca egzersiz metinleri: test metinlerinden parça görmek ölçümü şişirmesin
    const texts = practicePassages([]).map((passage) => passage.text);
    return [1, 2, 3, 4].map((span) => phrasePool(texts, span));
  }, []);

  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState<FlashLevel>(FLASH_START);
  const [trial, setTrial] = useState<FlashTrial | null>(null);
  const [count, setCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [bestSpan, setBestSpan] = useState({ span: 0, ms: 0 });
  const startedAt = useRef(0);

  // Evre zamanlaması
  useEffect(() => {
    if (phase === 'fixation') return afterMs(500, () => setPhase('show'));
    if (phase === 'show') return afterMs(level.durationMs, () => setPhase('mask'));
    if (phase === 'mask') return afterMs(150, () => setPhase('choose'));
    if (phase === 'feedback') return afterMs(700, () => nextTrial());
    return undefined;
    // nextTrial her render'da yeni; evre değişimi yeterli tetikleyici
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, level.durationMs]);

  const nextTrial = (currentLevel = level, done = count) => {
    if (done >= TRIALS) {
      setPhase('done');
      return;
    }
    setTrial(makeFlashTrial(pools[currentLevel.span - 1], Math.random));
    setPhase('fixation');
  };

  const start = () => {
    startedAt.current = Date.now();
    setLevel(FLASH_START);
    setCount(0);
    setCorrectCount(0);
    setBestSpan({ span: 0, ms: 0 });
    nextTrial(FLASH_START, 0);
  };

  const choose = (option: string) => {
    if (!trial) return;
    const correct = option === trial.target;
    setLastCorrect(correct);
    if (correct) {
      setCorrectCount((value) => value + 1);
      setBestSpan((current) =>
        level.span > current.span || (level.span === current.span && level.durationMs < current.ms)
          ? { span: level.span, ms: level.durationMs }
          : current
      );
    }
    const nextLevel = nextFlashLevel(level, correct);
    setLevel(nextLevel);
    const done = count + 1;
    setCount(done);
    if (done >= TRIALS) {
      void recordDrill({
        drill: 'flash',
        at: Date.now(),
        ms: Date.now() - startedAt.current,
        span: correct && level.span > bestSpan.span ? level.span : bestSpan.span,
        flashMs: bestSpan.ms || level.durationMs,
        correct: correctCount + (correct ? 1 : 0),
        total: TRIALS,
      });
    }
    setPhase('feedback');
  };

  const big = { fontSize: 26 * settings.fontScale, ...fontStyle(theme, '700') };

  return (
    <Screen>
      <DrillHeader title="Flaş kelime" />

      {phase === 'intro' ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="dim">
            Ekranın ortasındaki + işaretine bak. Bir kelime grubu çok kısa süre görünecek;
            sonra dört seçenekten gördüğünü seç. Doğru bildikçe süre kısalır, sonra grup
            büyür. {TRIALS} deneme sürer.
          </Txt>
          <Card style={{ gap: theme.space(1) }}>
            <Txt variant="body">Neden?</Txt>
            <Txt variant="dim" style={{ fontSize: 13 }}>
              Okurken göz her duruşta birkaç harf ya da kelimeyi tanır. Bir bakışta daha
              geniş bir grubu tanıyabilmek, parça parça okuma modunda kullandığın beceri.
            </Txt>
          </Card>
          <Button label="Başla" onPress={start} />
        </View>
      ) : null}

      {phase !== 'intro' && phase !== 'done' ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {count + (phase === 'feedback' ? 0 : 1)} / {TRIALS} · {level.span} kelime ·{' '}
            {level.durationMs} ms
          </Txt>
          <View
            style={{
              height: 140,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.md,
            }}
          >
            {phase === 'fixation' ? (
              <Txt style={{ ...big, color: theme.colors.textFaint }}>+</Txt>
            ) : phase === 'show' ? (
              <Txt style={{ ...big, color: theme.colors.text, textAlign: 'center' }}>
                {trial?.target}
              </Txt>
            ) : phase === 'mask' ? (
              <Txt style={{ ...big, color: theme.colors.textFaint }}>
                {'#'.repeat(Math.max(4, trial?.target.length ?? 8))}
              </Txt>
            ) : phase === 'feedback' ? (
              <Txt
                style={{ ...big, color: lastCorrect ? theme.colors.success : theme.colors.danger }}
              >
                {lastCorrect ? 'Doğru' : trial?.target}
              </Txt>
            ) : (
              <Txt variant="dim">Ne gördün?</Txt>
            )}
          </View>
          {phase === 'choose' && trial ? (
            <View style={{ gap: theme.space(2) }}>
              {trial.options.map((option) => (
                <Button key={option} label={option} variant="secondary" onPress={() => choose(option)} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {phase === 'done' ? (
        <Card style={{ gap: theme.space(2) }}>
          <Txt variant="heading">
            {correctCount} / {TRIALS} doğru
          </Txt>
          <Txt variant="dim">
            {bestSpan.span > 0
              ? `Doğru tanıdığın en geniş grup: ${bestSpan.span} kelime, ${bestSpan.ms} ms.`
              : 'Bu turda doğru tanınan grup olmadı; süre otomatik olarak uzayacak.'}
          </Txt>
          <Button label="Yeniden" onPress={start} />
        </Card>
      ) : null}
    </Screen>
  );
}
