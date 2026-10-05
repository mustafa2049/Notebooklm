import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAiConfigured } from '@/ai';
import { countWords } from '@/core/chunker';
import { indexFromCharOffset, progressRatio, wordsUpTo } from '@/core/progress';
import { sentenceSpans, spanIndexForChunk } from '@/core/sentences';
import { stripPunctuation } from '@/core/turkish';
import type { ReaderMode } from '@/core/types';
import { ToolSheet, type AiTab } from '@/reader/ToolSheet';
import { FlowView } from '@/reader/FlowView';
import { ReaderControls } from '@/reader/ReaderControls';
import { RecallCard } from '@/reader/RecallCard';
import { RsvpView } from '@/reader/RsvpView';
import { useReaderEngine } from '@/reader/useReaderEngine';
import { useFocusSession } from '@/reader/useFocusSession';
import { useSessionRecorder } from '@/reader/useSessionRecorder';
import { useSpeech, type VoiceStatus } from '@/reader/useSpeech';
import { shouldPromptRecall, type RecallTrigger } from '@/habit/recall';
import { useSettings } from '@/store/SettingsContext';
import {
  getDocument,
  getDocumentText,
  loadProgress,
  saveProgress,
  type DocumentChapter,
  type DocumentMeta,
} from '@/storage/documents';
import { highlightsForDoc } from '@/storage/highlights';
import { haptics } from '@/ui/haptics';
import { Button, Card, Chip, IconButton, Txt } from '@/ui/primitives';

/**
 * Web'de tıklanan düğme odakta kalıyor; ardından basılan boşluk tuşu hem
 * okuyucuyu duraklatıyor hem de o düğmeye yeniden basıyordu.
 */
function releaseFocus(): void {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement as HTMLElement | null;
  active?.blur?.();
}

/** 125000 → "2:05" */
function formatClockMs(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const MODE_LABEL: Record<ReaderMode, string> = {
  rsvp: 'Kelime akışı',
  chunk: 'Parça parça',
  bionic: 'Bionic',
  highlight: 'Yürüyen vurgu',
};

/** "Parça parça", kelime akışının hazır bir profili: aynı çizim, farklı ayar. */
const MODE_CHUNK_SIZE: Partial<Record<ReaderMode, number>> = { rsvp: 1, chunk: 3 };

export default function ReaderScreen() {
  const { id, seans, konum } = useLocalSearchParams<{ id: string; seans?: string; konum?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, settings, update, setFocusMode } = useSettings();

  const [meta, setMeta] = useState<DocumentMeta | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [startOffset, setStartOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  /** İlk bitirme anı bir kez yazılır (bkz. DocumentProgress.finishedAt) */
  const finishedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([getDocument(id), getDocumentText(id), loadProgress(id)]).then(
      ([document, content, progress]) => {
        if (cancelled) return;
        setMeta(document);
        setText(content ?? '');
        // Alıntı defterinden gelindiyse o cümleden başla
        const jump = Number(konum);
        setStartOffset(
          konum !== undefined && Number.isFinite(jump) && jump >= 0
            ? jump
            : progress?.finished
              ? 0
              : (progress?.charOffset ?? 0)
        );
        finishedAt.current = progress?.finishedAt;
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [id, konum]);

  // Okuyucudan çıkınca odak modunu bırak
  useEffect(() => () => setFocusMode(false), [setFocusMode]);

  const onProgress = useCallback(
    (charOffset: number, ratio: number) => {
      if (!id) return;
      const finished = ratio >= 0.999;
      if (finished && finishedAt.current === undefined) finishedAt.current = Date.now();
      void saveProgress(id, {
        charOffset,
        ratio,
        updatedAt: Date.now(),
        finished,
        finishedAt: finishedAt.current,
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
      chapters={meta?.chapters}
      text={text}
      startOffset={startOffset}
      onProgress={onProgress}
      // Bağlantıyla doğrudan açıldıysa geri gidilecek ekran yok: ana ekrana dön
      onBack={() => (navigation.canGoBack() ? router.back() : router.replace('/'))}
      insetTop={insets.top}
      insetBottom={insets.bottom}
      focusSeconds={Number(seans) > 0 ? Number(seans) : 0}
      mode={settings.mode}
      onModeChange={(mode) => update({ mode, ...(MODE_CHUNK_SIZE[mode] ? { chunkSize: MODE_CHUNK_SIZE[mode]! } : {}) })}
    />
  );
}

interface ReaderProps {
  docId: string;
  title: string;
  /** Kaynağın kendi bölümleri (EPUB) */
  chapters?: DocumentChapter[];
  text: string;
  startOffset: number;
  onProgress: (charOffset: number, ratio: number) => void;
  onBack: () => void;
  insetTop: number;
  insetBottom: number;
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
  /** Odak seansı süresi (saniye); 0 = seans yok */
  focusSeconds: number;
}

function Reader({
  docId,
  title,
  chapters,
  text,
  startOffset,
  onProgress,
  onBack,
  insetTop,
  insetBottom,
  mode,
  onModeChange,
  focusSeconds,
}: ReaderProps) {
  const { theme, settings, update, focusMode, setFocusMode } = useSettings();
  const [showModes, setShowModes] = useState(false);
  const [aiTab, setAiTab] = useState<AiTab | null>(null);

  const engine = useReaderEngine({
    text,
    initialCharOffset: startOffset,
    onProgress,
  });

  const totalWords = React.useMemo(() => countWords(engine.chunks), [engine.chunks]);
  const focus = useFocusSession(engine, focusSeconds);

  // "Kendi cümlenle anlat": bu açılışta okunan aralık için, en fazla bir kez
  const [recall, setRecall] = useState<RecallTrigger | null>(null);
  const recallAsked = useRef(false);
  const promptRecall = useCallback(
    (trigger: RecallTrigger) => {
      if (
        !shouldPromptRecall({
          trigger,
          activeMs: engine.activeMs(),
          alreadyAsked: recallAsked.current,
          enabled: settings.recallPrompt,
        })
      ) {
        return false;
      }
      recallAsked.current = true;
      engine.pause();
      setRecall(trigger);
      return true;
    },
    [engine, settings.recallPrompt]
  );
  useEffect(() => {
    if (focus.done) promptRecall('focusDone');
  }, [focus.done, promptRecall]);
  useEffect(() => {
    if (engine.finished) promptRecall('finished');
  }, [engine.finished, promptRecall]);
  const leave = useCallback(() => {
    if (!promptRecall('leave')) onBack();
  }, [promptRecall, onBack]);

  // AI kapalıyken panel yine açılıyor ama yalnızca kelime defteri sekmesiyle
  const aiReady = isAiConfigured(settings);

  /**
   * Okunan bölümün sırası ("3/12"). Bölümler karakter konumuna göre sıralı
   * olduğu için geçerli konumdan küçük olan son bölüm aranıyor.
   */
  const chapterLabel = React.useMemo(() => {
    if (!chapters?.length) return null;
    const offset = engine.chunk?.charStart ?? 0;
    let index = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].charOffset <= offset) index = i;
      else break;
    }
    return `${index + 1}/${chapters.length}`;
  }, [chapters, engine.chunk]);

  /** Kelime açıklaması için: ekrandaki kelimeler ve içinde geçtiği cümle. */
  const context = React.useMemo(() => {
    const chunk = engine.chunk;
    if (!chunk) return { words: [], sentence: '', sentenceOffset: 0 };
    const words = chunk.tokens.map((token) => stripPunctuation(token.text)).filter(Boolean);
    const sentenceTokens = engine.tokens.filter(
      (token) => token.sentenceIndex === chunk.sentenceIndex
    );
    const sentence = sentenceTokens.map((token) => token.text).join(' ');
    return { words, sentence, sentenceOffset: sentenceTokens[0]?.start ?? chunk.charStart };
  }, [engine.chunk, engine.tokens]);

  // Alıntılanmış cümleler akış modlarında hafif zeminle görünsün
  const [quoteOffsets, setQuoteOffsets] = useState<number[]>([]);
  const loadQuotes = useCallback(() => {
    void highlightsForDoc(docId).then((items) => setQuoteOffsets(items.map((item) => item.charOffset)));
  }, [docId]);
  useEffect(loadQuotes, [loadQuotes]);
  const markedSentences = React.useMemo(() => {
    const marked = new Set<number>();
    if (!engine.chunks.length) return marked;
    for (const offset of quoteOffsets) {
      marked.add(engine.chunks[indexFromCharOffset(engine.chunks, offset)].sentenceIndex);
    }
    return marked;
  }, [quoteOffsets, engine.chunks]);

  const recorder = useSessionRecorder({
    docId,
    mode,
    targetWpm: settings.wpm,
    words: engine.wordsRead,
    activeMs: engine.activeMs,
  });

  // ---- Dinleyerek okuma: motor yerinde durur, ses cümle cümle ilerler
  const [listening, setListening] = useState(false);
  const spans = React.useMemo(() => sentenceSpans(engine.chunks), [engine.chunks]);
  const speech = useSpeech({
    docId,
    text,
    spans,
    wpm: settings.wpm,
    onSentence: (span) => onProgress(span.charStart, progressRatio(engine.chunks, span.startChunk)),
  });
  const listenSpan = spans[Math.min(speech.current, spans.length - 1)];

  const startListening = useCallback(() => {
    engine.pause();
    setListening(true);
    speech.play(spanIndexForChunk(spans, engine.index));
  }, [engine, speech, spans]);

  const stopListening = useCallback(() => {
    speech.stop();
    setListening(false);
    if (!listenSpan) return;
    // Okuyucu, dinlemenin kaldığı cümleden devam etsin; atlanan kelimeler
    // okuma oturumuna "okundu" diye yazılmasın
    engine.jumpToIndex(listenSpan.startChunk);
    recorder.rebase(wordsUpTo(engine.chunks, listenSpan.startChunk));
  }, [speech, listenSpan, engine, recorder]);

  // Titreşim yalnızca kullanıcının başlattığı eylemlerde: her kelimede
  // titretmek pili tüketir ve okumayı dağıtır
  const toggle = useCallback(() => {
    haptics.tap(settings.haptics);
    if (listening) {
      if (speech.playing) speech.stop();
      else speech.play(speech.current);
      return;
    }
    engine.toggle();
  }, [engine, settings.haptics, listening, speech]);

  const previousSentence = useCallback(() => {
    haptics.step(settings.haptics);
    if (listening) speech.play(Math.max(0, speech.current - 1));
    else engine.previousSentence();
  }, [engine, settings.haptics, listening, speech]);

  const nextSentence = useCallback(() => {
    haptics.step(settings.haptics);
    if (listening) speech.play(speech.current + 1);
    else engine.nextSentence();
  }, [engine, settings.haptics, listening, speech]);

  // Metin bitince tek bir başarı titreşimi
  useEffect(() => {
    if (engine.finished) haptics.success(settings.haptics);
  }, [engine.finished, settings.haptics]);

  // Android'de geri tuşu: odak modundaysa önce odaktan çık, sonra ekrandan
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (focusMode) {
        setFocusMode(false);
        return true;
      }
      return promptRecall('leave');
    });
    return () => subscription.remove();
  }, [focusMode, setFocusMode, promptRecall]);

  // Web klavye kısayolları
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      // Not ya da özet yazarken boşluk tuşu okumayı başlatmasın
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (recall !== null) return;
      switch (event.key) {
        case ' ':
          event.preventDefault();
          toggle();
          break;
        case 'ArrowLeft':
          previousSentence();
          break;
        case 'ArrowRight':
          nextSentence();
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
          leave();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, update, settings.wpm, focusMode, setFocusMode, leave, recall, toggle, previousSentence, nextSentence]);

  // Dinlerken metin her modda akış görünümünde: göz sesi takip edebilsin
  const flowMode = listening || mode === 'bionic' || mode === 'highlight';

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
        <IconButton name="chevronLeft" onPress={leave} accessibilityLabel="Geri" emphasis="strong" />
        <Txt variant="dim" numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
          {title}
          {chapterLabel ? ` · ${chapterLabel}` : ''}
        </Txt>
        <Pressable onPress={() => setShowModes((value) => !value)} hitSlop={8}>
          <Txt variant="dim" style={{ fontSize: 13, color: theme.colors.accent }}>
            {MODE_LABEL[mode]}
          </Txt>
        </Pressable>
        <IconButton
          name={aiReady ? 'sparkle' : 'book'}
          onPress={() => {
            engine.pause();
            setAiTab(aiReady ? 'summary' : chapters?.length ? 'sections' : 'word');
          }}
          accessibilityLabel={aiReady ? 'Yapay zekâ paneli' : 'Kelime defteri'}
          emphasis="faint"
          size={20}
        />
        <IconButton
          name="headphones"
          onPress={() => {
            releaseFocus();
            if (listening) stopListening();
            else startListening();
          }}
          accessibilityLabel={listening ? 'Dinlemeyi bitir' : 'Dinleyerek oku'}
          emphasis={listening ? 'strong' : 'faint'}
          size={20}
        />
        <IconButton
          name="focus"
          onPress={() => {
            releaseFocus();
            setFocusMode(!focusMode);
          }}
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
              index={listening && listenSpan ? listenSpan.startChunk : engine.index}
              variant={!listening && mode === 'bionic' ? 'bionic' : 'highlight'}
              markedSentences={markedSentences}
              activeSentence={listening ? listenSpan?.sentenceIndex : undefined}
            />
          </View>
        ) : (
          <RsvpView chunk={engine.chunk} />
        )}

        <Pressable
          onPress={previousSentence}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20%' }}
          accessibilityLabel="Önceki cümle"
        />
        <Pressable
          onPress={toggle}
          // Uzun bas: ekrandaki kelimeyi deftere kaydet ya da açıklat
          onLongPress={() => {
            engine.pause();
            haptics.step(settings.haptics);
            setAiTab('word');
          }}
          style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0 }}
          accessibilityLabel="Oynat veya duraklat"
        />
        <Pressable
          onPress={nextSentence}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20%' }}
          accessibilityLabel="Sonraki cümle"
        />
      </View>

      {listening ? <ListenStatus voice={speech.voice} playing={speech.playing} onExit={stopListening} /> : null}

      {focus.active && !focus.done ? (
        <View style={{ alignItems: 'center', paddingBottom: theme.space(1) }}>
          <Txt variant="mono" style={{ fontSize: 13, color: theme.colors.accent }}>
            Odak seansı · {formatClockMs(focus.remainingMs)} kaldı
          </Txt>
        </View>
      ) : null}

      {focus.active && focus.done ? (
        <View style={{ paddingHorizontal: theme.space(4), paddingBottom: theme.space(3) }}>
          <Card style={{ gap: theme.space(2), borderColor: theme.colors.success }}>
            <Txt variant="heading">Seans tamam</Txt>
            <Txt variant="dim">
              {Math.round(focusSeconds / 60)} dakika okudun · {focus.words} kelime. Günlük hedefine
              sayıldı.
            </Txt>
            <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
              <Button label="Bitir" style={{ flex: 1 }} onPress={leave} />
              <Button
                label="Okumaya devam"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={focus.dismiss}
              />
            </View>
          </Card>
        </View>
      ) : null}

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
          playing={listening ? speech.playing : engine.playing}
          ratio={listening && listenSpan ? progressRatio(engine.chunks, listenSpan.startChunk) : engine.ratio}
          wordsRead={listening && listenSpan ? wordsUpTo(engine.chunks, listenSpan.startChunk) : engine.wordsRead}
          totalWords={totalWords}
          remainingMs={engine.remainingMs}
          onToggle={toggle}
          onRestart={engine.restart}
          onPreviousSentence={previousSentence}
          onNextSentence={nextSentence}
          onSeek={engine.seekRatio}
        />
      </View>

      <RecallCard
        visible={recall !== null}
        docId={docId}
        docTitle={title}
        text={text}
        fromChar={startOffset}
        toChar={engine.chunk?.charEnd ?? startOffset}
        leaving={recall === 'leave'}
        onDone={() => {
          const wasLeaving = recall === 'leave';
          setRecall(null);
          if (wasLeaving) onBack();
        }}
      />

      <ToolSheet
        visible={aiTab !== null}
        initialTab={aiTab ?? 'summary'}
        onClose={() => setAiTab(null)}
        docId={docId}
        docTitle={title}
        fileChapters={chapters}
        text={text}
        charOffset={engine.chunk?.charStart ?? 0}
        words={context.words}
        sentence={context.sentence}
        sentenceOffset={context.sentenceOffset}
        onHighlightSaved={loadQuotes}
        onJumpTo={engine.seekCharOffset}
      />
    </View>
  );
}

const VOICE_NOTE: Record<VoiceStatus, string> = {
  checking: 'Sesler yükleniyor…',
  turkish: 'Türkçe ses',
  fallback: 'Bu cihazda Türkçe ses bulunamadı; varsayılan ses kullanılıyor, telaffuz bozuk olabilir.',
  none: 'Bu cihazda seslendirme sesi bulunamadı. Sistem ayarlarından bir Türkçe ses yükleyebilirsin.',
};

/** Dinleme modunun durum satırı: hangi sesle okunduğu ve çıkış. */
function ListenStatus({
  voice,
  playing,
  onExit,
}: {
  voice: VoiceStatus;
  playing: boolean;
  onExit: () => void;
}) {
  const { theme } = useSettings();
  const warn = voice === 'fallback' || voice === 'none';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(2),
        paddingHorizontal: theme.space(4),
        paddingBottom: theme.space(1),
      }}
    >
      <Txt
        variant="dim"
        style={{ flex: 1, fontSize: 12, color: warn ? theme.colors.warning : theme.colors.textDim }}
      >
        {playing ? 'Dinleniyor' : 'Dinleme duraklatıldı'} · {VOICE_NOTE[voice]} · cümle cümle vurgulanır
      </Txt>
      <Pressable onPress={onExit} hitSlop={8}>
        <Txt variant="dim" style={{ fontSize: 12, color: theme.colors.accent }}>
          Okumaya dön
        </Txt>
      </Pressable>
    </View>
  );
}
