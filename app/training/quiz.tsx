import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { buildCloze, type ClozeQuestion } from '@/core/cloze';
import { tokenize, tokenIndexForCharOffset } from '@/core/tokenizer';
import { useSettings } from '@/store/SettingsContext';
import { getDocumentText, loadProgress } from '@/storage/documents';
import { Button, Card, IconButton, Screen, Txt } from '@/ui/primitives';

/**
 * Anlama testi — okunan bölümden üretilen boşluk doldurma soruları.
 *
 * Yapay zekâ olmadığı için bu test "anlama"yı değil **hatırlamayı** ölçer;
 * arayüzde de bunu açıkça söylüyoruz. Yine de hız ile tutulan bilgi arasındaki
 * ilişkiyi görmek için yeterli bir gösterge.
 */
export default function QuizScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const router = useRouter();
  const { theme } = useSettings();

  const [text, setText] = useState<string | null>(null);
  const [readUntil, setReadUntil] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    Promise.all([getDocumentText(docId), loadProgress(docId)]).then(([content, progress]) => {
      if (cancelled) return;
      setText(content ?? '');
      setReadUntil(progress?.charOffset ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const questions = useMemo<ClozeQuestion[]>(() => {
    if (!text) return [];
    const tokens = tokenize(text);
    // Yalnızca okunan bölümden sor; hiç okunmadıysa metnin başından
    const readTokenCount =
      readUntil > 0
        ? tokenIndexForCharOffset(tokens, readUntil)
        : Math.min(tokens.length, 200);
    return buildCloze(tokens, { count: 5, from: 0, to: Math.max(30, readTokenCount) });
  }, [text, readUntil]);

  if (text === null) {
    return (
      <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter((q, index) => answers[index] === q.answer).length;
  const allAnswered = answeredCount === questions.length && questions.length > 0;

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.space(4),
        }}
      >
        <Txt variant="title">Anlama testi</Txt>
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Kapat" />
      </View>

      {questions.length === 0 ? (
        <Card style={{ gap: theme.space(3) }}>
          <Txt variant="heading">Soru üretilemedi</Txt>
          <Txt variant="dim">
            Bu metin soru üretmek için çok kısa ya da çok az farklı kelime içeriyor. Daha
            uzun bir bölüm okuduktan sonra yeniden dene.
          </Txt>
          <Button label="Geri dön" variant="secondary" onPress={() => router.back()} />
        </Card>
      ) : (
        <>
          <Txt variant="dim" style={{ marginBottom: theme.space(4) }}>
            Okuduğun bölümden {questions.length} soru. Bu test hatırlamayı ölçer — metni
            gerçekten yakalayıp yakalamadığının kaba bir göstergesi.
          </Txt>

          <View style={{ gap: theme.space(4) }}>
            {questions.map((question, index) => {
              const chosen = answers[index];
              return (
                <Card key={index} style={{ gap: theme.space(3) }}>
                  <Txt variant="body">{question.prompt}</Txt>
                  <View style={{ gap: theme.space(2) }}>
                    {question.options.map((option) => {
                      const isChosen = chosen === option;
                      const isCorrect = option === question.answer;
                      const revealed = chosen !== undefined;

                      const borderColor = !revealed
                        ? theme.colors.border
                        : isCorrect
                          ? theme.colors.success
                          : isChosen
                            ? theme.colors.danger
                            : theme.colors.border;

                      return (
                        <Pressable
                          key={option}
                          disabled={revealed}
                          onPress={() => setAnswers((current) => ({ ...current, [index]: option }))}
                          style={({ pressed }) => ({
                            borderWidth: 1,
                            borderColor,
                            borderRadius: theme.radius.sm,
                            paddingVertical: theme.space(3),
                            paddingHorizontal: theme.space(3.5),
                            opacity: pressed ? 0.7 : 1,
                            backgroundColor:
                              revealed && isCorrect ? theme.colors.accentSoft : 'transparent',
                          })}
                        >
                          <Txt variant="body">{option}</Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
          </View>

          {allAnswered ? (
            <Card style={{ marginTop: theme.space(5), gap: theme.space(2) }}>
              <Txt variant="label">Sonuç</Txt>
              <Txt variant="title">
                {correctCount} / {questions.length}
              </Txt>
              <Txt variant="dim">
                {correctCount === questions.length
                  ? 'Bu hızda anlamayı koruyorsun — hedefi 25 kelime arttırmayı deneyebilirsin.'
                  : correctCount >= questions.length / 2
                    ? 'Makul. Aynı hızda bir süre daha çalış, sonra arttır.'
                    : 'Hız fazla gelmiş olabilir. Hedefi biraz düşürüp anlamayı geri kazan.'}
              </Txt>
              <Button
                label="Bitir"
                variant="secondary"
                onPress={() => router.back()}
                style={{ marginTop: theme.space(2) }}
              />
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
