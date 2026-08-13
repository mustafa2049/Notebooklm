import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { generateQuestions } from '@/ai/tasks';
import { useAi } from '@/ai/useAi';
import { buildCloze } from '@/core/cloze';
import { tokenize, tokenIndexForCharOffset } from '@/core/tokenizer';
import { useSettings } from '@/store/SettingsContext';
import { loadAiCache, patchAiCache } from '@/storage/ai';
import { getDocumentText, loadProgress } from '@/storage/documents';
import { Button, Card, IconButton, Screen, Txt } from '@/ui/primitives';

/**
 * Anlama testi. İki kaynaktan soru gelebilir:
 *
 * - **Cloze (varsayılan, ücretsiz):** metnin kendi kelimelerinden boşluk açılır.
 *   Bu test "anlama"yı değil **hatırlamayı** ölçer; arayüzde bunu açıkça
 *   söylüyoruz.
 * - **Yapay zekâ (ayarlanmışsa):** çıkarım, ana fikir ve neden-sonuç soruları.
 *   Her sorunun yanında metinden alınmış **kanıt cümlesi** gösterilir; model
 *   uydurursa bu görünür olur.
 */

interface QuizItem {
  prompt: string;
  options: string[];
  answer: string;
  /** AI sorularında cevabı destekleyen, metinden alınmış cümle */
  evidence?: string;
}

export default function QuizScreen() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const router = useRouter();
  const { theme } = useSettings();
  const ai = useAi();

  const [text, setText] = useState<string | null>(null);
  const [readUntil, setReadUntil] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [aiItems, setAiItems] = useState<QuizItem[] | null>(null);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    Promise.all([getDocumentText(docId), loadProgress(docId), loadAiCache(docId)]).then(
      ([content, progress, cache]) => {
        if (cancelled) return;
        setText(content ?? '');
        setReadUntil(progress?.charOffset ?? 0);
        // Daha önce üretilmiş sorular varsa ücretsiz olarak yeniden gösterilir
        if (cache.questions?.items.length) setAiItems(cache.questions.items.map(toQuizItem));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const clozeItems = useMemo<QuizItem[]>(() => {
    if (!text) return [];
    const tokens = tokenize(text);
    // Yalnızca okunan bölümden sor; hiç okunmadıysa metnin başından
    const readTokenCount =
      readUntil > 0
        ? tokenIndexForCharOffset(tokens, readUntil)
        : Math.min(tokens.length, 200);
    return buildCloze(tokens, { count: 5, from: 0, to: Math.max(30, readTokenCount) }).map(
      (question) => ({
        prompt: question.prompt,
        options: question.options,
        answer: question.answer,
      })
    );
  }, [text, readUntil]);

  const questions = aiItems ?? clozeItems;

  /** Soruları okunan bölümden üret: okumadığı yerden soru sormak anlamsız. */
  const makeAiQuestions = async () => {
    if (!text || !docId) return;
    const upTo = readUntil > 0 ? Math.max(600, readUntil) : Math.min(text.length, 4000);
    const value = await ai.run((provider, signal) =>
      generateQuestions(provider, text.slice(0, upTo), 5, signal)
    );
    if (!value) return;
    setAnswers({});
    setAiItems(value.map(toQuizItem));
    await patchAiCache(docId, { questions: { items: value, model: '', at: Date.now() } });
  };

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

      {ai.configured ? (
        <Card style={{ gap: theme.space(2), marginBottom: theme.space(4) }}>
          <Txt variant="body">
            {aiItems ? 'Yapay zekâ soruları' : 'Gerçek anlama soruları'}
          </Txt>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {aiItems
              ? 'Bu sorular okuduğun bölümden çıkarıldı; her cevabın altında metinden alınmış kanıt cümlesi var.'
              : 'Boşluk doldurma yerine çıkarım ve ana fikir soruları üretilir. Bir kez üretilir ve saklanır.'}
          </Txt>
          <Button
            label={aiItems ? 'Yeniden üret' : 'AI ile soru üret'}
            icon="sparkle"
            variant={aiItems ? 'secondary' : 'primary'}
            disabled={ai.busy || !text}
            onPress={makeAiQuestions}
          />
          {ai.busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
              <ActivityIndicator color={theme.colors.accent} />
              <Txt variant="dim">Sorular hazırlanıyor…</Txt>
            </View>
          ) : null}
          {ai.error ? (
            <Txt variant="body" style={{ color: theme.colors.danger, fontSize: 13 }}>
              {ai.error}
            </Txt>
          ) : null}
          {ai.lastCall ? (
            <Txt variant="dim" style={{ fontSize: 12 }}>
              Son çağrı: {ai.lastCall.tokens} token
              {ai.lastCall.cost ? ` · toplam yaklaşık ${ai.lastCall.cost}` : ''}
            </Txt>
          ) : null}
        </Card>
      ) : null}

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
            {aiItems
              ? `Okuduğun bölümden ${questions.length} anlama sorusu. Cevapladıktan sonra metindeki kanıt cümlesi görünür.`
              : `Okuduğun bölümden ${questions.length} soru. Bu test hatırlamayı ölçer — metni gerçekten yakalayıp yakalamadığının kaba bir göstergesi.`}
          </Txt>

          <View style={{ gap: theme.space(4) }}>
            {questions.map((question, index) => {
              const chosen = answers[index];
              return (
                <Card key={index} style={{ gap: theme.space(3) }}>
                  <Txt variant="body">
                    {index + 1}. {question.prompt}
                  </Txt>
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
                  {chosen !== undefined && question.evidence ? (
                    <Txt variant="dim" style={{ fontSize: 12 }}>
                      Metinden: “{question.evidence}”
                    </Txt>
                  ) : null}
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

/** AI sorusunu ekranın beklediği ortak biçime çevirir. */
function toQuizItem(question: {
  question: string;
  options: string[];
  answerIndex: number;
  evidence: string;
}): QuizItem {
  return {
    prompt: question.question,
    options: question.options,
    answer: question.options[question.answerIndex],
    evidence: question.evidence,
  };
}
