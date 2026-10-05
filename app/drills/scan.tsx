import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { practicePassages, type Passage, type ScanTask } from '@/content/passages';
import { listAssessments } from '@/storage/assessments';
import { tokenize } from '@/core/tokenizer';
import { useSettings } from '@/store/SettingsContext';
import { recordDrill } from '@/storage/drills';
import { answerTokenRanges, isScanHit } from '@/train/drills/reading';
import { shuffle } from '@/train/shuffle';
import { DrillHeader } from '@/ui/DrillHeader';
import { Button, Card, Screen, Txt } from '@/ui/primitives';
import { fontStyle } from '@/ui/theme';

/**
 * Tarama: metinde belirli bir bilgiyi bulmak — sözlükte kelime, tarifte
 * malzeme, belgede tarih ararken yapılan şey. Araştırmaların "hızlı okuma"
 * dediği şeylerin içinde gerçekten işe yarayan becerilerden biri: neyi
 * aradığını bilerek okumamak, bakmak.
 *
 * Önce soru gösterilir, sonra metin; cevabın geçtiği kelimeye dokunulur.
 */

const ROUNDS = 3;

interface Round {
  passage: Passage;
  task: ScanTask;
}

function makeRounds(passages: Passage[]): Round[] {
  const all = shuffle(
    passages.flatMap((passage) => passage.scan.map((task) => ({ passage, task }))),
    Math.random
  );
  // Olabildiğince farklı metinlerden; metin azsa aynı metnin diğer görevi
  const picked: Round[] = [];
  for (const round of all) {
    if (picked.some((item) => item.passage.id === round.passage.id)) continue;
    picked.push(round);
    if (picked.length === ROUNDS) return picked;
  }
  for (const round of all) {
    if (picked.includes(round)) continue;
    picked.push(round);
    if (picked.length === ROUNDS) break;
  }
  return picked;
}

type Phase = 'intro' | 'prompt' | 'search' | 'found' | 'done';

export default function ScanScreen() {
  const { theme, settings } = useSettings();
  const [pool, setPool] = useState<Passage[]>(() => practicePassages([]));
  const [rounds, setRounds] = useState<Round[]>(() => makeRounds(practicePassages([])));

  // Test edilmiş metinler de egzersiz havuzuna girer (bkz. practicePassages)
  useEffect(() => {
    listAssessments().then((history) => {
      const tested = history.flatMap((record) => (record.kind === 'test' && record.passageId ? [record.passageId] : []));
      const next = practicePassages(tested);
      setPool(next);
      setRounds(makeRounds(next));
    });
  }, []);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [misses, setMisses] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [wrongToken, setWrongToken] = useState<number | null>(null);
  const startedAt = useRef(0);
  const sessionStart = useRef(0);

  const round = rounds[index];
  const tokens = useMemo(() => (round ? tokenize(round.passage.text) : []), [round]);
  const range = useMemo(
    () => (round ? answerTokenRanges(round.passage.text, tokens, round.task.answer) : []),
    [round, tokens]
  );

  const tap = (tokenIndex: number) => {
    if (phase !== 'search') return;
    if (isScanHit(tokenIndex, range)) {
      const ms = Date.now() - startedAt.current;
      const nextTimes = [...times, ms];
      setTimes(nextTimes);
      setPhase('found');
      if (index + 1 >= rounds.length) {
        void recordDrill({
          drill: 'scan',
          at: Date.now(),
          ms: Date.now() - sessionStart.current,
          correct: rounds.length,
          total: rounds.length + misses,
        });
      }
    } else {
      setMisses((value) => value + 1);
      setWrongToken(tokenIndex);
    }
  };

  const restart = () => {
    setRounds(makeRounds(pool));
    setIndex(0);
    setTimes([]);
    setMisses(0);
    setPhase('prompt');
    sessionStart.current = Date.now();
  };

  const fontSize = 17 * settings.fontScale;

  return (
    <Screen>
      <DrillHeader title="Tarama" />

      {phase === 'intro' ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="dim">
            Önce ne arayacağını göreceksin, sonra metin açılacak. Metni baştan sona okuma:
            gözünü gezdirip cevabı bul ve geçtiği kelimeye dokun. {ROUNDS} tur.
          </Txt>
          <Button
            label="Başla"
            onPress={() => {
              sessionStart.current = Date.now();
              setPhase('prompt');
            }}
          />
        </View>
      ) : null}

      {phase === 'prompt' && round ? (
        <View style={{ gap: theme.space(4) }}>
          <Txt variant="dim">
            Tur {index + 1} / {rounds.length} · “{round.passage.title}”
          </Txt>
          <Card>
            <Txt variant="heading">{round.task.prompt}</Txt>
          </Card>
          <Button
            label="Metni aç"
            icon="search"
            onPress={() => {
              startedAt.current = Date.now();
              setWrongToken(null);
              setPhase('search');
            }}
          />
        </View>
      ) : null}

      {(phase === 'search' || phase === 'found') && round ? (
        <View style={{ gap: theme.space(3) }}>
          <Card style={{ paddingVertical: theme.space(3) }}>
            <Txt variant="body">{round.task.prompt}</Txt>
          </Card>
          <Text style={{ fontSize, lineHeight: fontSize * 1.6, color: theme.colors.text, ...fontStyle(theme) }}>
            {tokens.map((token, tokenIndex) => {
              const gap = round.passage.text.slice(token.end, tokens[tokenIndex + 1]?.start ?? token.end);
              const hit = phase === 'found' && isScanHit(tokenIndex, range);
              return (
                <Text key={tokenIndex}>
                  <Text
                    onPress={() => tap(tokenIndex)}
                    style={{
                      color: hit
                        ? theme.colors.success
                        : wrongToken === tokenIndex
                          ? theme.colors.danger
                          : theme.colors.text,
                      backgroundColor: hit ? theme.colors.accentSoft : 'transparent',
                    }}
                  >
                    {token.text}
                  </Text>
                  {gap.includes('\n') ? '\n\n' : ' '}
                </Text>
              );
            })}
          </Text>
          {phase === 'found' ? (
            <Card style={{ gap: theme.space(2), borderColor: theme.colors.success }}>
              <Txt variant="heading">{(times[times.length - 1] / 1000).toFixed(1)} saniyede buldun</Txt>
              <Button
                label={index + 1 >= rounds.length ? 'Sonuç' : 'Sonraki tur'}
                onPress={() => {
                  if (index + 1 >= rounds.length) setPhase('done');
                  else {
                    setIndex(index + 1);
                    setPhase('prompt');
                  }
                }}
              />
            </Card>
          ) : null}
        </View>
      ) : null}

      {phase === 'done' ? (
        <Card style={{ gap: theme.space(2) }}>
          <Txt variant="heading">
            Ortalama {(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length) / 1000).toFixed(1)} sn
          </Txt>
          <Txt variant="dim">
            {misses === 0 ? 'Hiç yanlış dokunuş yok.' : `${misses} yanlış dokunuş.`} Taramada amaç
            okumak değil, aranan şeyin biçimine (sayı, özel ad, büyük harf) bakmak.
          </Txt>
          <Button label="Yeniden" onPress={restart} />
        </Card>
      ) : null}
    </Screen>
  );
}
