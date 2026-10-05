import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { practicePassages } from '@/content/passages';
import { useSettings } from '@/store/SettingsContext';
import { listAssessments } from '@/storage/assessments';
import { listDocumentsWithProgress, type DocumentMeta } from '@/storage/documents';
import { listDrillResults } from '@/storage/drills';
import { loadProgram, saveProgram } from '@/storage/program';
import { listSessions } from '@/storage/stats';
import { exerciseById } from '@/train/exercises';
import {
  beginLesson,
  completeLesson,
  lessonStatus,
  nextLesson,
  type Lesson,
  type LessonEvidence,
  type LessonStatus,
  type ProgramState,
} from '@/train/program';
import { Icon } from '@/ui/Icon';
import { Button, Card, Chip, IconButton, Screen, Txt } from '@/ui/primitives';

/**
 * Programın bir dersi: ipucu → ısınma → uygulama → anlama kontrolü.
 *
 * Her adım uygulamanın mevcut ekranını açar (Schulte, antrenman, anlama testi,
 * ölçüm). Ders başladıktan sonra kaydedilen sonuçlara bakılarak adımlar
 * işaretlenir; ekrandan çıkıp dönmek ilerlemeyi kaybettirmez.
 */

const WARMUP_LABEL = { schulte: 'Schulte tablosu', flash: 'Flaş kelime' } as const;
const SKILL_LABEL = { scan: 'Tarama', skim: 'Göz gezdirme' } as const;

interface Choice {
  id: string;
  title: string;
}

export default function LessonScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const [state, setState] = useState<ProgramState | null>(null);
  const [evidence, setEvidence] = useState<LessonEvidence | null>(null);
  const [library, setLibrary] = useState<DocumentMeta[]>([]);
  const [practice, setPractice] = useState<Choice[]>([]);
  const [finished, setFinished] = useState<{ before: number; after: number; comprehension: number | null } | null>(
    null
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        loadProgram(),
        listDrillResults(),
        listSessions(),
        listAssessments(),
        listDocumentsWithProgress(),
      ]).then(async ([program, drills, sessions, assessments, documents]) => {
        if (cancelled || !program) return;
        const tested = assessments
          .filter((record) => record.kind === 'test' && record.passageId)
          .map((record) => record.passageId!);
        const unfinished = documents.filter((item) => !item.progress?.finished);
        // Varsayılan metin: kütüphanede yarım kalan ilk metin, yoksa pratik metni.
        // Derse yazılır ki ekranlar arası gidip gelince değişmesin.
        const fallbackDoc = unfinished[0]?.meta.id ?? `pratik:${practicePassages(tested)[0]?.id}`;
        const lesson = nextLesson(program);
        let current = program;
        if (lesson && (program.active?.id !== lesson.id || !program.active.docId)) {
          current = beginLesson(program, lesson.id, Date.now(), program.active?.docId ?? fallbackDoc);
          await saveProgram(current);
        }
        setState(current);
        setEvidence({ drills, sessions, assessments });
        setLibrary(unfinished.map((item) => item.meta));
        setPractice(practicePassages(tested).map((item) => ({ id: `pratik:${item.id}`, title: item.title })));
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.space(3),
      }}
    >
      <Txt variant="title">Ders</Txt>
      <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Kapat" />
    </View>
  );

  if (finished) {
    return (
      <Screen>
        {header}
        <Card style={{ gap: theme.space(3), borderColor: theme.colors.success }}>
          <Txt variant="heading">Ders tamam</Txt>
          {finished.comprehension !== null ? (
            <Txt variant="dim">
              Anlama %{Math.round(finished.comprehension * 100)}.{' '}
              {finished.after > finished.before
                ? `Program temposu ${finished.before} → ${finished.after} kelime/dk.`
                : finished.after < finished.before
                  ? `Anlamayı korumak için program temposu ${finished.before} → ${finished.after} kelime/dk.`
                  : `Program temposu ${finished.after} kelime/dk'da kalıyor.`}
            </Txt>
          ) : (
            <Txt variant="dim">Yarın bir sonraki derste görüşürüz.</Txt>
          )}
          <Button label="Programa dön" onPress={() => router.replace('/program')} />
        </Card>
      </Screen>
    );
  }

  if (!state || !evidence) return <Screen>{header}</Screen>;

  const lesson = nextLesson(state);
  if (!lesson || !state.active) {
    return (
      <Screen>
        {header}
        <Txt variant="dim">Programın bütün dersleri tamamlandı.</Txt>
        <Button label="Programa dön" variant="secondary" onPress={() => router.replace('/program')} />
      </Screen>
    );
  }

  const docId = state.active.docId;
  const status = lessonStatus(lesson, state.active.startedAt, docId, evidence);

  const chooseDoc = async (id: string) => {
    const updated = beginLesson(state, lesson.id, Date.now(), id);
    setState(updated);
    await saveProgram(updated);
  };

  const complete = async () => {
    // Tempo yalnızca hız egzersizinin anlama kontrolüyle ayarlanır; ölçüm doğal
    // hızda okunduğu için program temposunu değiştirmez
    const comprehension = lesson.practice.type === 'exercise' ? status.comprehension : null;
    const updated = completeLesson(state, lesson.id, comprehension, Date.now());
    await saveProgram(updated);
    setFinished({ before: state.wpm, after: updated.wpm, comprehension });
  };

  return (
    <Screen>
      {header}
      <Txt variant="dim">
        {lesson.week}. hafta · {lesson.day}. ders · tempo {state.wpm} kelime/dk
      </Txt>
      <Txt variant="heading" style={{ marginTop: theme.space(1), marginBottom: theme.space(3) }}>
        {lesson.title}
      </Txt>
      <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.accent, marginBottom: theme.space(4) }}>
        <Txt variant="body" style={{ fontSize: 15 }}>
          {lesson.tip}
        </Txt>
      </Card>

      <View style={{ gap: theme.space(3) }}>
        {lesson.warmup ? (
          <Step
            done={status.warmupDone}
            title={`Isınma · ${WARMUP_LABEL[lesson.warmup]}`}
            detail="Bir tur yeterli. Önerilir ama zorunlu değil."
            action="Isın"
            onPress={() => router.push(`/drills/${lesson.warmup}`)}
          />
        ) : null}

        <PracticeStep
          lesson={lesson}
          status={status}
          docId={docId}
          wpm={state.wpm}
          library={library}
          practice={practice}
          onChoose={chooseDoc}
        />

        {status.checkNeeded ? (
          <Step
            done={status.checkDone}
            title="Anlama kontrolü"
            detail={
              status.comprehension !== null
                ? `Anlama %${Math.round(status.comprehension * 100)}`
                : 'Uygulamadan sonra beş soru: tempo bu sonuca göre ayarlanır.'
            }
            action="Soruları çöz"
            disabled={!status.practiceDone}
            onPress={() => router.push(`/training/quiz?docId=${docId}&wpm=${state.wpm}&program=1`)}
          />
        ) : null}
      </View>

      <Button
        label="Dersi tamamla"
        icon="check"
        disabled={!status.canComplete}
        onPress={() => void complete()}
        style={{ marginTop: theme.space(5) }}
      />
      {!status.canComplete ? (
        <Txt variant="dim" style={{ fontSize: 12, marginTop: theme.space(2), textAlign: 'center' }}>
          Adımları bitirince ders tamamlanır. İstediğin zaman çıkıp dönebilirsin.
        </Txt>
      ) : null}
    </Screen>
  );
}

function PracticeStep({
  lesson,
  status,
  docId,
  wpm,
  library,
  practice,
  onChoose,
}: {
  lesson: Lesson;
  status: LessonStatus;
  docId: string | undefined;
  wpm: number;
  library: DocumentMeta[];
  practice: Choice[];
  onChoose: (id: string) => void;
}) {
  const router = useRouter();
  const { theme } = useSettings();
  const step = lesson.practice;

  if (step.type === 'assess') {
    return (
      <Step
        done={status.practiceDone}
        title="Haftalık ölçüm"
        detail={
          status.comprehension !== null
            ? `Ölçüm yapıldı · anlama %${Math.round(status.comprehension * 100)}`
            : 'Kendi hızında oku, beş soruyu cevapla.'
        }
        action="Ölçüme başla"
        onPress={() => router.push('/assess')}
      />
    );
  }

  if (step.type === 'skill') {
    return (
      <Step
        done={status.practiceDone}
        title={`Uygulama · ${SKILL_LABEL[step.drill]}`}
        detail="Egzersizi bir kez tamamla."
        action="Başla"
        onPress={() => router.push(`/drills/${step.drill}`)}
      />
    );
  }

  if (step.type === 'focus') {
    const own = library[0];
    return (
      <Step
        done={status.practiceDone}
        title={`Uygulama · ${step.minutes} dakika kendi metninde`}
        detail={own ? own.title : 'Önce kütüphaneye bir kitap ya da makale ekle.'}
        action={own ? 'Odak seansını başlat' : 'Metin ekle'}
        onPress={() =>
          router.push(own ? `/reader/${own.id}?seans=${step.minutes * 60}` : '/import')
        }
      />
    );
  }

  const exercise = exerciseById(step.exercise);
  const choices: Choice[] = [...library.map((item) => ({ id: item.id, title: item.title })), ...practice];
  return (
    <Card style={{ gap: theme.space(2) }}>
      <StepTitle done={status.practiceDone} title={`Uygulama · ${exercise?.title ?? ''}`} />
      <Txt variant="dim" style={{ fontSize: 13 }}>
        {exercise?.purpose}
      </Txt>
      <Txt variant="label">Metin</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {choices.slice(0, 6).map((choice) => (
          <Chip
            key={choice.id}
            label={choice.title.length > 28 ? `${choice.title.slice(0, 27)}…` : choice.title}
            active={choice.id === docId}
            onPress={() => onChoose(choice.id)}
          />
        ))}
      </View>
      <Button
        label={status.practiceDone ? 'Yeniden yap' : 'Başla'}
        variant={status.practiceDone ? 'secondary' : 'primary'}
        disabled={!docId}
        onPress={() => router.push(`/training/run?exercise=${step.exercise}&docId=${docId}&wpm=${wpm}&program=1`)}
      />
    </Card>
  );
}

function StepTitle({ done, title }: { done: boolean; title: string }) {
  const { theme } = useSettings();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
      <Icon
        name={done ? 'check' : 'chevronRight'}
        size={18}
        color={done ? theme.colors.success : theme.colors.textFaint}
      />
      <Txt variant="body" style={{ flex: 1 }}>
        {title}
      </Txt>
    </View>
  );
}

function Step({
  done,
  title,
  detail,
  action,
  onPress,
  disabled,
}: {
  done: boolean;
  title: string;
  detail: string;
  action: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme } = useSettings();
  return (
    <Card style={{ gap: theme.space(2) }}>
      <StepTitle done={done} title={title} />
      <Txt variant="dim" style={{ fontSize: 13 }}>
        {detail}
      </Txt>
      <Button
        label={done ? 'Tamamlandı · yeniden yap' : action}
        variant={done ? 'ghost' : 'secondary'}
        disabled={disabled}
        onPress={onPress}
      />
    </Card>
  );
}
