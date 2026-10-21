import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSettings } from '@/store/SettingsContext';
import type { VocabEntry } from '@/storage/vocab';
import { applyReview } from '@/train/review';
import { buildRound, MIN_WORDS, type Question } from '@/train/vocabGame';
import { haptics } from './haptics';
import { Button, Card, Txt } from './primitives';

/**
 * Kelime defterinin "Oyun" sekmesi: 10 soruluk tur (bkz. `train/vocabGame`).
 * Her cevap tekrar sırasını günceller: bilinen kelimenin aralığı uzar,
 * yanlış cevaplanan kelime yakında yeniden sorulur.
 */
export function VocabGame({
  entries,
  onAnswer,
}: {
  entries: VocabEntry[];
  /** Cevaplanan kelimenin güncel kaydı (tekrar bilgisi) */
  onAnswer: (updated: VocabEntry) => void;
}) {
  const { theme, settings } = useSettings();
  const [seed, setSeed] = useState(0);
  // Tur başlarken bir kez kurulur: cevaplar defteri değiştirse de sorular kaymasın
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const round = useMemo<Question[]>(() => buildRound(entries), [seed]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const restart = useCallback(() => {
    setSeed((value) => value + 1);
    setIndex(0);
    setChosen(null);
    setScore(0);
  }, []);

  if (round.length === 0) {
    return (
      <Card style={{ gap: theme.space(2) }}>
        <Txt variant="heading">Oyun için kelime az</Txt>
        <Txt variant="dim">
          {`Oyun için defterde en az ${MIN_WORDS} kelime gerekir; anlamı ya da kaydedildiği cümle olanlar soruluyor. Okurken kelimeye uzun basıp "Deftere kaydet"e dokun.`}
        </Txt>
      </Card>
    );
  }

  if (index >= round.length) {
    return (
      <Card style={{ gap: theme.space(3) }}>
        <Txt variant="heading">
          {score} / {round.length}
        </Txt>
        <Txt variant="dim">
          {score === round.length
            ? 'Hepsi doğru. Bu kelimelerin tekrar aralığı uzadı.'
            : 'Yanlış cevapladığın kelimeler tekrar sırasında öne alındı; yakında yeniden sorulacak.'}
        </Txt>
        <Button label="Yeniden oyna" icon="restart" onPress={restart} />
      </Card>
    );
  }

  const question = round[index];
  const entry = entries.find((item) => item.id === question.entryId);
  const answered = chosen !== null;

  const choose = (option: number) => {
    if (answered || !entry) return;
    const correct = option === question.answer;
    setChosen(option);
    if (correct) {
      setScore((value) => value + 1);
      haptics.success(settings.haptics);
    } else {
      haptics.step(settings.haptics);
    }
    onAnswer(applyReview(entry, correct, Date.now()));
  };

  return (
    <Card style={{ gap: theme.space(3) }}>
      <Txt variant="dim" style={{ fontSize: 12 }}>
        {index + 1} / {round.length} · {question.kind === 'meaning' ? 'Anlamı hangisi?' : 'Boşluğa hangisi gelir?'}
      </Txt>
      <Txt variant={question.kind === 'meaning' ? 'title' : 'body'} style={question.kind === 'meaning' ? { fontSize: 26 } : { fontSize: 18, lineHeight: 28 }}>
        {question.prompt}
      </Txt>
      {question.kind === 'cloze' ? (
        <Txt variant="dim" style={{ fontSize: 12 }}>
          Kelime cümlede çekimli olabilir; şıklarda yalın hâli var.
        </Txt>
      ) : null}
      <View style={{ gap: theme.space(2) }}>
        {question.options.map((option, optionIndex) => {
          const isAnswer = optionIndex === question.answer;
          const isChosen = optionIndex === chosen;
          const color = answered && isAnswer ? theme.colors.success : answered && isChosen ? theme.colors.danger : null;
          return (
            <Pressable
              key={`${optionIndex}-${option}`}
              onPress={() => choose(optionIndex)}
              disabled={answered}
              accessibilityRole="button"
              accessibilityState={{ selected: isChosen, disabled: answered }}
              style={({ pressed }) => ({
                paddingVertical: theme.space(3),
                paddingHorizontal: theme.space(4),
                borderRadius: theme.radius.md,
                borderWidth: 1.5,
                borderColor: color ?? theme.colors.border,
                backgroundColor: theme.colors.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Txt variant="body" style={{ fontSize: 15, color: color ?? theme.colors.text }}>
                {option}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {answered ? (
        <>
          {entry && question.kind === 'meaning' ? (
            <Txt variant="dim" style={{ fontSize: 13 }}>
              “{entry.sentence}”
            </Txt>
          ) : null}
          <Button
            label={index + 1 < round.length ? 'Sonraki' : 'Sonucu gör'}
            onPress={() => {
              setChosen(null);
              setIndex((value) => value + 1);
            }}
          />
        </>
      ) : null}
    </Card>
  );
}
