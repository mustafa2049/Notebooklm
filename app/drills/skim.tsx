import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { practicePassages, type Passage } from '@/content/passages';
import { listAssessments } from '@/storage/assessments';
import { useSettings } from '@/store/SettingsContext';
import { recordDrill } from '@/storage/drills';
import { previewOfText } from '@/train/drills/reading';
import { arrangeOptions } from '@/train/shuffle';
import { DrillHeader } from '@/ui/DrillHeader';
import { Button, Card, Screen, Txt } from '@/ui/primitives';
import { QuestionCard } from '@/ui/QuestionCard';
import { fontStyle } from '@/ui/theme';

/**
 * Göz gezdirme (ön okuma): metnin yalnızca başlığı ve paragrafların ilk
 * cümleleri kısa bir süre gösterilir, sonra ana fikir sorulur.
 *
 * Bilgi metinlerinde paragrafın ana fikri çoğunlukla ilk cümlededir. Okumaya
 * başlamadan önce bu "iskelete" bakmak metnin haritasını çıkarır; asıl
 * okumada anlamayı kolaylaştırır. Okuyucudaki araç panelinde aynı önizleme
 * "Önizle" sekmesinde var.
 */

const SECONDS = 20;
type Phase = 'intro' | 'preview' | 'question' | 'done';

export default function SkimScreen() {
  const { theme, settings } = useSettings();
  const [pool, setPool] = useState<Passage[]>(() => practicePassages([]));
  const [passage, setPassage] = useState<Passage>(() => pick(practicePassages([])));

  useEffect(() => {
    listAssessments().then((history) => {
      const tested = history.flatMap((record) => (record.kind === 'test' && record.passageId ? [record.passageId] : []));
      const next = practicePassages(tested);
      setPool(next);
      setPassage(pick(next));
    });
  }, []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [left, setLeft] = useState(SECONDS);
  const [chosen, setChosen] = useState<string | undefined>();
  const startedAt = useRef(0);

  const outline = useMemo(() => previewOfText(passage.text), [passage]);
  const question = passage.questions.find((item) => item.kind === 'anaFikir')!;
  const options = useMemo(
    () => arrangeOptions(question.prompt + passage.id, question.correct, question.wrong),
    [question, passage.id]
  );

  useEffect(() => {
    if (phase !== 'preview') return;
    if (left <= 0) {
      setPhase('question');
      return;
    }
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, left]);

  const answer = (option: string) => {
    setChosen(option);
    void recordDrill({
      drill: 'skim',
      at: Date.now(),
      ms: Date.now() - startedAt.current,
      correct: option === question.correct ? 1 : 0,
      total: 1,
    });
    setPhase('done');
  };

  const fontSize = 17 * settings.fontScale;

  return (
    <Screen>
      <DrillHeader title="Göz gezdirme" />

      {phase === 'intro' ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="dim">
            Bir metnin yalnızca başlığını ve paragraflarının ilk cümlelerini {SECONDS} saniye
            göreceksin. Sonra metnin ana fikrini soracağız.
          </Txt>
          <Card style={{ gap: theme.space(1) }}>
            <Txt variant="body">Neden?</Txt>
            <Txt variant="dim" style={{ fontSize: 13 }}>
              Okumadan önce metnin iskeletine bakmak, nereye gittiğini bilerek okumanı sağlar.
              Ders kitabı, rapor ya da makale okurken en işe yarayan alışkanlıklardan biri.
            </Txt>
          </Card>
          <Button
            label="Başla"
            onPress={() => {
              startedAt.current = Date.now();
              setLeft(SECONDS);
              setPhase('preview');
            }}
          />
        </View>
      ) : null}

      {phase === 'preview' ? (
        <View style={{ gap: theme.space(3) }}>
          <Txt variant="mono" style={{ color: theme.colors.accent }}>
            {left} sn
          </Txt>
          <Txt variant="heading">{passage.title}</Txt>
          {outline.map((sentence, index) => (
            <Txt key={index} style={{ fontSize, lineHeight: fontSize * 1.55, ...fontStyle(theme) }}>
              {sentence} …
            </Txt>
          ))}
          <Button label="Hazırım" variant="secondary" onPress={() => setPhase('question')} />
        </View>
      ) : null}

      {phase === 'question' || phase === 'done' ? (
        <View style={{ gap: theme.space(3) }}>
          <QuestionCard
            prompt={question.prompt}
            options={options}
            answer={question.correct}
            chosen={chosen}
            onChoose={answer}
          />
          {phase === 'done' ? (
            <Card style={{ gap: theme.space(2) }}>
              <Txt variant="dim">
                {chosen === question.correct
                  ? 'Yalnızca ilk cümlelerden ana fikri yakaladın.'
                  : 'İlk cümleler metnin yönünü verir ama her zaman ana fikri söylemez; bir sonrakinde paragrafların nasıl başladığına dikkat et.'}
              </Txt>
              <Button
                label="Başka bir metin"
                onPress={() => {
                  setPassage(pick(pool, passage.id));
                  setChosen(undefined);
                  setPhase('intro');
                }}
              />
            </Card>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function pick(pool: Passage[], except?: string): Passage {
  const options = pool.length > 1 ? pool.filter((passage) => passage.id !== except) : pool;
  return options[Math.floor(Math.random() * options.length)];
}
