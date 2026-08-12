import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlowView } from '@/reader/FlowView';
import { RsvpView } from '@/reader/RsvpView';
import { useReaderEngine } from '@/reader/useReaderEngine';
import { useSettings } from '@/store/SettingsContext';
import { getDocumentText, loadProgress, saveProgress } from '@/storage/documents';
import { recordSession } from '@/storage/stats';
import { exerciseById, nextPhaseInMs, phaseAt } from '@/train/exercises';
import { Button, IconButton, ProgressBar, Txt } from '@/ui/primitives';
import { formatNumber } from '@/ui/format';

/** Evre değişimini yakalamak için yeterli çözünürlük; her karede gerekmiyor. */
const TICK_MS = 200;

export default function TrainingRunScreen() {
  const { exercise: exerciseId, docId } = useLocalSearchParams<{ exercise: string; docId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();

  const exercise = exerciseById(exerciseId);
  const [text, setText] = useState<string | null>(null);
  const [startOffset, setStartOffset] = useState(0);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    Promise.all([getDocumentText(docId), loadProgress(docId)]).then(([content, progress]) => {
      if (cancelled) return;
      setText(content ?? '');
      setStartOffset(progress?.finished ? 0 : (progress?.charOffset ?? 0));
    });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  if (!exercise) {
    return (
      <Centered>
        <Txt variant="heading">Egzersiz bulunamadı</Txt>
        <Button label="Geri dön" variant="secondary" onPress={() => router.back()} />
      </Centered>
    );
  }

  if (text === null) {
    return (
      <Centered>
        <ActivityIndicator color={theme.colors.accent} />
      </Centered>
    );
  }

  if (text.length === 0) {
    return (
      <Centered>
        <Txt variant="heading">Metin okunamadı</Txt>
        <Button label="Geri dön" variant="secondary" onPress={() => router.back()} />
      </Centered>
    );
  }

  return (
    <TrainingSession
      exerciseId={exercise.id}
      docId={docId!}
      text={text}
      startOffset={startOffset}
      insetTop={insets.top}
      insetBottom={insets.bottom}
      onExit={() => router.back()}
      onQuiz={() => router.replace(`/training/quiz?docId=${docId}`)}
    />
  );
}

function TrainingSession({
  exerciseId,
  docId,
  text,
  startOffset,
  insetTop,
  insetBottom,
  onExit,
  onQuiz,
}: {
  exerciseId: string;
  docId: string;
  text: string;
  startOffset: number;
  insetTop: number;
  insetBottom: number;
  onExit: () => void;
  onQuiz: () => void;
}) {
  const { theme, settings } = useSettings();
  const exercise = exerciseById(exerciseId)!;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const done = elapsed >= exercise.durationMs;

  const phase = useMemo(() => phaseAt(exercise, elapsed), [exercise, elapsed]);
  const nextIn = nextPhaseInMs(exercise, elapsed);

  const engine = useReaderEngine({
    text,
    initialCharOffset: startOffset,
    wpmOverride: Math.round(settings.wpm * phase.wpmFactor),
    chunkSizeOverride: phase.chunkSize,
    onProgress: (charOffset, ratio) => {
      void saveProgress(docId, { charOffset, ratio, updatedAt: Date.now(), finished: ratio >= 0.999 });
    },
  });

  // Egzersiz saati
  useEffect(() => {
    if (!running || done) return;
    const timer = setInterval(() => setElapsed((value) => value + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [running, done]);

  // Egzersiz başlar başlamaz oynatmayı aç, bitince duraklat
  const playRef = useRef(engine.play);
  playRef.current = engine.play;
  const pauseRef = useRef(engine.pause);
  pauseRef.current = engine.pause;

  useEffect(() => {
    if (running && !done) playRef.current();
    else pauseRef.current();
  }, [running, done]);

  const startWords = useRef(engine.wordsRead);
  const wordsRef = useRef(engine.wordsRead);
  wordsRef.current = engine.wordsRead;
  const activeMs = useRef(engine.activeMs);
  activeMs.current = engine.activeMs;

  useEffect(() => {
    return () => {
      void recordSession({
        docId,
        mode: settings.mode,
        at: Date.now(),
        ms: activeMs.current(),
        words: Math.max(0, wordsRef.current - startWords.current),
        targetWpm: settings.wpm,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wordsThisSession = Math.max(0, engine.wordsRead - startWords.current);
  const flowMode = settings.mode === 'bionic' || settings.mode === 'highlight';

  if (done) {
    const seconds = exercise.durationMs / 1000;
    return (
      <Centered>
        <Txt variant="label">{exercise.title} tamamlandı</Txt>
        <Txt variant="title" style={{ marginTop: theme.space(2) }}>
          {formatNumber(wordsThisSession)} kelime
        </Txt>
        <Txt variant="dim" style={{ textAlign: 'center' }}>
          {formatNumber((wordsThisSession / seconds) * 60)} kelime/dakika efektif hız
        </Txt>
        <Txt variant="dim" style={{ textAlign: 'center', marginTop: theme.space(3), maxWidth: 300 }}>
          Şimdi ne kadarını tuttuğuna bak — hız, anlama pahasına yükseliyorsa kazanç değil.
        </Txt>
        <View style={{ gap: theme.space(3), marginTop: theme.space(5), alignSelf: 'stretch' }}>
          <Button label="Anlama testini çöz" icon="check" onPress={onQuiz} />
          <Button label="Bitir" variant="secondary" onPress={onExit} />
        </View>
      </Centered>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insetTop }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.space(2),
        }}
      >
        <IconButton name="close" onPress={onExit} accessibilityLabel="Egzersizi bitir" />
        <View style={{ flex: 1 }}>
          <Txt variant="dim" style={{ fontSize: 13 }}>
            {exercise.title}
          </Txt>
        </View>
        <Txt variant="mono" style={{ fontSize: 13, color: theme.colors.accent }}>
          {Math.ceil((exercise.durationMs - elapsed) / 1000)} sn
        </Txt>
      </View>

      <View style={{ paddingHorizontal: theme.space(4), paddingTop: theme.space(2) }}>
        <ProgressBar ratio={elapsed / exercise.durationMs} />
      </View>

      <View style={{ flex: 1 }}>
        {flowMode ? (
          <View style={{ flex: 1, paddingHorizontal: theme.space(5) }}>
            <FlowView
              chunks={engine.chunks}
              index={engine.index}
              variant={settings.mode === 'bionic' ? 'bionic' : 'highlight'}
            />
          </View>
        ) : (
          <RsvpView chunk={engine.chunk} />
        )}
        <Pressable
          onPress={() => setRunning((value) => !value)}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          accessibilityLabel="Egzersizi duraklat veya sürdür"
        />
      </View>

      <View
        style={{
          paddingHorizontal: theme.space(4),
          paddingBottom: insetBottom + theme.space(5),
          gap: theme.space(2),
          alignItems: 'center',
        }}
      >
        <Txt variant="heading" style={{ color: theme.colors.accent, textAlign: 'center' }}>
          {phase.label}
        </Txt>
        <Txt variant="dim" style={{ fontSize: 13 }}>
          {Math.round(settings.wpm * phase.wpmFactor)} kelime/dk
          {phase.chunkSize ? ` · ${phase.chunkSize} kelimelik gruplar` : ''}
          {nextIn !== null ? ` · sonraki evre ${Math.ceil(nextIn / 1000)} sn` : ''}
        </Txt>
        {!running ? (
          <Txt variant="dim" style={{ fontSize: 12, color: theme.colors.warning }}>
            Duraklatıldı — sürdürmek için ekrana dokun
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  const { theme } = useSettings();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(3),
        padding: theme.space(6),
        backgroundColor: theme.colors.bg,
      }}
    >
      {children}
    </View>
  );
}
