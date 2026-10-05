import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { passageById, TEST_PASSAGES, type Passage } from '@/content/passages';
import { countWordsInText } from '@/ingest/normalize';
import { useSettings } from '@/store/SettingsContext';
import { listAssessments, recordAssessment } from '@/storage/assessments';
import { recordSession } from '@/storage/stats';
import {
  effectiveOf,
  improvement,
  nextTestPassageId,
  reliability,
  reliableTests,
  scoreAssessment,
  suggestTargetWpm,
  type AssessmentRecord,
  type Score,
} from '@/train/assessment';
import { arrangeOptions } from '@/train/shuffle';
import { formatNumber } from '@/ui/format';
import { Button, Card, IconButton, Screen, Txt } from '@/ui/primitives';
import { QuestionCard } from '@/ui/QuestionCard';
import { fontStyle } from '@/ui/theme';

/**
 * Seviye testi: kendi hızında okuma + anlama soruları.
 *
 * Uygulamanın temposu yok — metin normal sayfa düzeninde, kaydırılarak okunur.
 * Ölçtüğümüz şey uygulamanın değil **kullanıcının** hızı: kitabı elinde
 * okurken ne kadar hızlı ve ne kadar anlayarak okuyor. Haftada bir tekrarlanınca
 * antrenmanın gerçek okumaya yansıyıp yansımadığı görülür.
 *
 * Sorular metin gizlendikten sonra gelir: cevabı metinde aramak anlamayı değil
 * bulmayı ölçerdi.
 */

type Phase = 'intro' | 'reading' | 'questions' | 'result';

export default function AssessScreen() {
  const { passage: requested } = useLocalSearchParams<{ passage?: string }>();
  const router = useRouter();
  const { theme } = useSettings();

  const [history, setHistory] = useState<AssessmentRecord[] | null>(null);

  useEffect(() => {
    listAssessments().then(setHistory);
  }, []);

  const passage = useMemo<Passage | undefined>(() => {
    if (!history) return undefined;
    return (
      passageById(requested) ??
      passageById(nextTestPassageId(TEST_PASSAGES.map((item) => item.id), history))
    );
  }, [history, requested]);

  if (!history || !passage) {
    return (
      <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }

  return <Assessment passage={passage} history={history} onExit={() => router.back()} />;
}

function Assessment({
  passage,
  history,
  onExit,
}: {
  passage: Passage;
  history: AssessmentRecord[];
  onExit: () => void;
}) {
  const { theme, settings, update } = useSettings();
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ score: Score; record: AssessmentRecord } | null>(null);
  const [applied, setApplied] = useState(false);

  const startedAt = useRef(0);
  const readMs = useRef(0);

  const words = useMemo(() => countWordsInText(passage.text), [passage.text]);
  const paragraphs = useMemo(() => passage.text.split(/\n\s*\n/), [passage.text]);
  const questions = useMemo(
    () =>
      passage.questions.map((question) => ({
        ...question,
        options: arrangeOptions(question.prompt, question.correct, question.wrong),
      })),
    [passage.questions]
  );

  const firstTest = history.filter((record) => record.kind === 'test').length === 0;
  const allAnswered = Object.keys(answers).length === questions.length;

  const finish = async () => {
    const correct = questions.filter((question, index) => answers[index] === question.correct).length;
    const score = scoreAssessment(readMs.current, words, correct, questions.length);
    const check = reliability(score);
    const record = await recordAssessment({
      kind: 'test',
      at: Date.now(),
      passageId: passage.id,
      ms: readMs.current,
      words,
      wpm: score.wpm,
      correct,
      total: questions.length,
      source: 'gömülü',
      reliable: check.reliable,
      note: check.note,
    });
    // Test okuması da okumadır: günlük dakikaya ve seriye sayılır
    await recordSession({
      docId: `test:${passage.id}`,
      mode: 'test',
      at: Date.now(),
      ms: readMs.current,
      words,
      targetWpm: settings.wpm,
    });
    setResult({ score, record });
    setPhase('result');
  };

  // Her evre kendi kaydırma konumuyla başlasın (anahtar değişince yeniden kurulur)
  return (
    <Screen key={phase}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.space(4),
        }}
      >
        <Txt variant="title">{firstTest ? 'Seviye testi' : 'Haftalık ölçüm'}</Txt>
        <IconButton name="close" onPress={onExit} accessibilityLabel="Kapat" />
      </View>

      {phase === 'intro' ? (
        <View style={{ gap: theme.space(4) }}>
          <Card style={{ gap: theme.space(2) }}>
            <Txt variant="heading">Ne ölçüyoruz?</Txt>
            <Txt variant="dim">
              Kendi normal hızında, kitap okur gibi okuduğunda dakikada kaç kelime okuduğunu ve
              ne kadarını anladığını. İkisinin çarpımı efektif hızın: anlamadan hızlanmak
              gelişim sayılmaz.
            </Txt>
          </Card>
          <Card style={{ gap: theme.space(2) }}>
            <Txt variant="heading">Nasıl?</Txt>
            <Txt variant="dim">
              1. “Başla”ya bastığında metin açılır ve süre başlar.{'\n'}2. Hızlanmaya çalışma;
              her zamanki gibi oku.{'\n'}3. Bitince en alttaki “Bitirdim”e bas.{'\n'}4. Metin
              gizlenir ve {questions.length} soru gelir.
            </Txt>
          </Card>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            Metin: {passage.title} · {formatNumber(words)} kelime · yaklaşık 2 dakika
          </Txt>
          <Button
            label="Başla"
            onPress={() => {
              startedAt.current = Date.now();
              setPhase('reading');
            }}
          />
        </View>
      ) : null}

      {phase === 'reading' ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="heading">{passage.title}</Txt>
          {paragraphs.map((paragraph, index) => (
            <Txt
              key={index}
              variant="body"
              style={{
                fontSize: 18 * settings.fontScale,
                lineHeight: 18 * settings.fontScale * 1.6,
                ...fontStyle(theme),
              }}
            >
              {paragraph}
            </Txt>
          ))}
          <Button
            label="Bitirdim"
            icon="check"
            onPress={() => {
              readMs.current = Date.now() - startedAt.current;
              setPhase('questions');
            }}
          />
        </View>
      ) : null}

      {phase === 'questions' ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="dim">
            Metne bakmadan cevapla. Her soruda tek seçim hakkın var.
          </Txt>
          {questions.map((question, index) => (
            <QuestionCard
              key={index}
              number={index + 1}
              prompt={question.prompt}
              options={question.options}
              answer={question.correct}
              chosen={answers[index]}
              onChoose={(option) => setAnswers((current) => ({ ...current, [index]: option }))}
            />
          ))}
          <Button label="Sonucu gör" disabled={!allAnswered} onPress={finish} />
        </View>
      ) : null}

      {phase === 'result' && result ? (
        <Result
          score={result.score}
          record={result.record}
          history={[result.record, ...history]}
          applied={applied}
          currentWpm={settings.wpm}
          onApply={(wpm) => {
            update({ wpm });
            setApplied(true);
          }}
          onExit={onExit}
        />
      ) : null}
    </Screen>
  );
}

function Result({
  score,
  record,
  history,
  applied,
  currentWpm,
  onApply,
  onExit,
}: {
  score: Score;
  record: AssessmentRecord;
  history: AssessmentRecord[];
  applied: boolean;
  currentWpm: number;
  onApply: (wpm: number) => void;
  onExit: () => void;
}) {
  const { theme } = useSettings();
  const suggested = suggestTargetWpm(score);
  const progress = improvement(history);
  const previous = reliableTests(history).filter((item) => item.id !== record.id).pop();

  return (
    <View style={{ gap: theme.space(4) }}>
      <View style={{ flexDirection: 'row', gap: theme.space(3) }}>
        <Metric label="Doğal hız" value={formatNumber(score.wpm)} unit="kel/dk" />
        <Metric label="Anlama" value={`%${Math.round(score.comprehension * 100)}`} unit="" />
      </View>
      <Metric
        label="Efektif hız"
        value={formatNumber(score.effectiveWpm)}
        unit="kel/dk · hız × anlama"
        emphasis
      />

      {!record.reliable ? (
        <Card style={{ borderColor: theme.colors.warning, gap: theme.space(1) }}>
          <Txt variant="body" style={{ color: theme.colors.warning }}>
            Bu ölçüm gelişim grafiğine katılmadı
          </Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {record.note} İstersen daha sonra yeniden dene.
          </Txt>
        </Card>
      ) : null}

      {record.reliable && previous ? (
        <Txt variant="dim">
          Önceki ölçüme göre efektif hızın{' '}
          {describeChange((score.effectiveWpm - effectiveOf(previous)) / effectiveOf(previous))}.
        </Txt>
      ) : null}
      {progress && progress.tests > 2 ? (
        <Txt variant="dim">
          İlk ölçümüne göre: {describeChange(progress.change)} ({progress.tests} ölçüm).
        </Txt>
      ) : null}
      {record.reliable && !previous ? (
        <Txt variant="dim">
          Bu senin başlangıç noktan. Bir hafta sonra yeni bir metinle tekrar ölçeceğiz;
          gelişimin ancak o zaman görünür.
        </Txt>
      ) : null}

      {record.reliable ? (
        <Card style={{ gap: theme.space(2) }}>
          <Txt variant="heading">Antrenman temposu önerisi</Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {score.comprehension >= 0.7
              ? 'Anlaman iyi: doğal hızının biraz üstünde çalışmak, rahat bölgenin hemen dışına çıkarır.'
              : 'Önce anlamayı sağlamlaştır: bir süre doğal hızında çalış, sonra arttır.'}
          </Txt>
          {suggested !== currentWpm && !applied ? (
            <Button label={`Hedefi ${suggested} kelime/dk yap`} onPress={() => onApply(suggested)} />
          ) : (
            <Txt variant="body" style={{ color: theme.colors.success }}>
              Hedef hızın {currentWpm} kelime/dk.
            </Txt>
          )}
        </Card>
      ) : null}

      <Button label="Bitir" variant="secondary" onPress={onExit} />
    </View>
  );
}

function describeChange(change: number): string {
  const percent = Math.round(Math.abs(change) * 100);
  if (percent < 3) return 'yaklaşık aynı kaldı';
  return change > 0 ? `%${percent} arttı` : `%${percent} azaldı`;
}

function Metric({
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
