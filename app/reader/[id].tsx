import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { countWords } from '@/core/chunker';
import type { ReaderMode } from '@/core/types';
import { FlowView } from '@/reader/FlowView';
import { ReaderControls } from '@/reader/ReaderControls';
import { RsvpView } from '@/reader/RsvpView';
import { useReaderEngine } from '@/reader/useReaderEngine';
import { useSessionRecorder } from '@/reader/useSessionRecorder';
import { useSettings } from '@/store/SettingsContext';
import {
  getDocument,
  getDocumentText,
  loadProgress,
  saveProgress,
  type DocumentMeta,
} from '@/storage/documents';
import { Chip, IconButton, Txt } from '@/ui/primitives';

const MODE_LABEL: Record<ReaderMode, string> = {
  rsvp: 'Kelime akışı',
  chunk: 'Parça parça',
  bionic: 'Bionic',
  highlight: 'Yürüyen vurgu',
};

/** "Parça parça", kelime akışının hazır bir profili: aynı çizim, farklı ayar. */
const MODE_CHUNK_SIZE: Partial<Record<ReaderMode, number>> = { rsvp: 1, chunk: 3 };

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, settings, update, setFocusMode } = useSettings();

  const [meta, setMeta] = useState<DocumentMeta | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [startOffset, setStartOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([getDocument(id), getDocumentText(id), loadProgress(id)]).then(
      ([document, content, progress]) => {
        if (cancelled) return;
        setMeta(document);
        setText(content ?? '');
        setStartOffset(progress?.finished ? 0 : (progress?.charOffset ?? 0));
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Okuyucudan çıkınca odak modunu bırak
  useEffect(() => () => setFocusMode(false), [setFocusMode]);

  const onProgress = useCallback(
    (charOffset: number, ratio: number) => {
      if (!id) return;
      void saveProgress(id, {
        charOffset,
        ratio,
        updatedAt: Date.now(),
        finished: ratio >= 0.999,
      });
    },
    [id]
  );

  if (loading || text === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (text.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: theme.colors.bg }}>
        <Txt variant="heading">Metin bulunamadı</Txt>
        <Txt variant="dim" style={{ textAlign: 'center' }}>
          Bu dokümanın içeriği okunamadı. Kütüphaneden silip yeniden ekleyebilirsin.
        </Txt>
        <Txt variant="dim" style={{ color: theme.colors.accent }} onPress={() => router.back()}>
          Geri dön
        </Txt>
      </View>
    );
  }

  return (
    <Reader
      docId={id!}
      title={meta?.title ?? 'Okuma'}
      text={text}
      startOffset={startOffset}
      onProgress={onProgress}
      onBack={() => router.back()}
      insetTop={insets.top}
      insetBottom={insets.bottom}
      mode={settings.mode}
      onModeChange={(mode) => update({ mode, ...(MODE_CHUNK_SIZE[mode] ? { chunkSize: MODE_CHUNK_SIZE[mode]! } : {}) })}
    />
  );
}

interface ReaderProps {
  docId: string;
  title: string;
  text: string;
  startOffset: number;
  onProgress: (charOffset: number, ratio: number) => void;
  onBack: () => void;
  insetTop: number;
  insetBottom: number;
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
}

function Reader({
  docId,
  title,
  text,
  startOffset,
  onProgress,
  onBack,
  insetTop,
  insetBottom,
  mode,
  onModeChange,
}: ReaderProps) {
  const { theme, settings, update, focusMode, setFocusMode } = useSettings();
  const [showModes, setShowModes] = useState(false);

  const engine = useReaderEngine({
    text,
    initialCharOffset: startOffset,
    onProgress,
  });

  const totalWords = React.useMemo(() => countWords(engine.chunks), [engine.chunks]);

  useSessionRecorder({
    docId,
    mode,
    targetWpm: settings.wpm,
    words: engine.wordsRead,
    activeMs: engine.activeMs,
  });

  // Web klavye kısayolları
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case ' ':
          event.preventDefault();
          engine.toggle();
          break;
        case 'ArrowLeft':
          engine.previousSentence();
          break;
        case 'ArrowRight':
          engine.nextSentence();
          break;
        case 'ArrowUp':
          event.preventDefault();
          update({ wpm: Math.min(1200, settings.wpm + 25) });
          break;
        case 'ArrowDown':
          event.preventDefault();
          update({ wpm: Math.max(100, settings.wpm - 25) });
          break;
        case 'r':
        case 'R':
          engine.restart();
          break;
        case 'f':
        case 'F':
          setFocusMode(!focusMode);
          break;
        case 'Escape':
          onBack();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, update, settings.wpm, focusMode, setFocusMode, onBack]);

  const flowMode = mode === 'bionic' || mode === 'highlight';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insetTop }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.space(2),
          gap: theme.space(1),
        }}
      >
        <IconButton name="chevronLeft" onPress={onBack} accessibilityLabel="Geri" emphasis="strong" />
        <Txt variant="dim" numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
          {title}
        </Txt>
        <Pressable onPress={() => setShowModes((value) => !value)} hitSlop={8}>
          <Txt variant="dim" style={{ fontSize: 13, color: theme.colors.accent }}>
            {MODE_LABEL[mode]}
          </Txt>
        </Pressable>
        <IconButton
          name="focus"
          onPress={() => setFocusMode(!focusMode)}
          accessibilityLabel="Odak modu"
          emphasis={focusMode ? 'strong' : 'faint'}
          size={20}
        />
      </View>

      {showModes ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.space(2),
            paddingHorizontal: theme.space(4),
            paddingVertical: theme.space(3),
          }}
        >
          {(Object.keys(MODE_LABEL) as ReaderMode[]).map((option) => (
            <Chip
              key={option}
              label={MODE_LABEL[option]}
              active={option === mode}
              onPress={() => {
                onModeChange(option);
                setShowModes(false);
              }}
            />
          ))}
        </View>
      ) : null}

      {/*
        Okuma alanı. Dokunma bölgeleri mutlak konumlu katman olarak duruyor:
        yerleşimde yer kaplasalardı akış modlarındaki metin ekranın yalnızca
        yarısını kullanır, satırlar gereksiz yerden kırılırdı.
      */}
      <View style={{ flex: 1 }}>
        {flowMode ? (
          <View style={{ flex: 1, paddingHorizontal: theme.space(5) }}>
            <FlowView
              chunks={engine.chunks}
              index={engine.index}
              variant={mode === 'bionic' ? 'bionic' : 'highlight'}
            />
          </View>
        ) : (
          <RsvpView chunk={engine.chunk} />
        )}

        <Pressable
          onPress={engine.previousSentence}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20%' }}
          accessibilityLabel="Önceki cümle"
        />
        <Pressable
          onPress={engine.toggle}
          style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0 }}
          accessibilityLabel="Oynat veya duraklat"
        />
        <Pressable
          onPress={engine.nextSentence}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20%' }}
          accessibilityLabel="Sonraki cümle"
        />
      </View>

      {engine.finished ? (
        <View style={{ alignItems: 'center', paddingBottom: theme.space(2) }}>
          <Txt variant="dim" style={{ color: theme.colors.success }}>
            Metin bitti · {totalWords} kelime
          </Txt>
        </View>
      ) : null}

      <View
        style={{
          paddingHorizontal: theme.space(4),
          paddingBottom: insetBottom + theme.space(3),
        }}
      >
        <ReaderControls
          playing={engine.playing}
          ratio={engine.ratio}
          wordsRead={engine.wordsRead}
          totalWords={totalWords}
          remainingMs={engine.remainingMs}
          onToggle={engine.toggle}
          onRestart={engine.restart}
          onPreviousSentence={engine.previousSentence}
          onNextSentence={engine.nextSentence}
          onSeek={engine.seekRatio}
        />
      </View>
    </View>
  );
}
