import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAiConfigured } from '@/ai';
import { countWords } from '@/core/chunker';
import { readingLayout, stepFontScale } from '@/appearance/typography';
import { pageIndexFor, pageParagraphs } from '@/core/pages';
import { indexFromCharOffset, progressRatio, wordsUpTo } from '@/core/progress';
import { excerptAt } from '@/core/search';
import { sentenceSpans, spanIndexForChunk } from '@/core/sentences';
import { stripPunctuation } from '@/core/turkish';
import type { ReaderMode } from '@/core/types';
import { ToolSheet, type AiTab, type JumpReason, type SentenceChoice } from '@/reader/ToolSheet';
import { FlowView } from '@/reader/FlowView';
import { ReaderControls } from '@/reader/ReaderControls';
import { MODE_LABEL } from '@/reader/modes';
import { PageControls } from '@/reader/PageControls';
import { PageView } from '@/reader/PageView';
import { RecallCard } from '@/reader/RecallCard';
import { RsvpView } from '@/reader/RsvpView';
import { useReaderEngine } from '@/reader/useReaderEngine';
import { useEyeBreak } from '@/reader/useEyeBreak';
import { useFocusSession, type ReadingClock } from '@/reader/useFocusSession';
import { usePageClock } from '@/reader/usePageClock';
import { usePagination } from '@/reader/usePagination';
import { useSessionRecorder } from '@/reader/useSessionRecorder';
import { useScreenAwake } from '@/reader/useScreenAwake';
import { useSpeech, type VoiceStatus } from '@/reader/useSpeech';
import { shouldPromptRecall, type RecallTrigger } from '@/habit/recall';
import { ReadingThemeProvider, useSettings } from '@/store/SettingsContext';
import { listAssessments } from '@/storage/assessments';
import { addBookmark, bookmarksForDoc, removeBookmarks, type Bookmark } from '@/storage/bookmarks';
import {
  getDocument,
  getDocumentText,
  loadProgress,
  saveProgress,
  type DocumentChapter,
  type DocumentMeta,
} from '@/storage/documents';
import { highlightsForDoc } from '@/storage/highlights';
import { AVERAGE_ADULT_WPM, reliableTests } from '@/train/assessment';
import { AppearancePanel } from '@/ui/AppearancePanel';
import { haptics } from '@/ui/haptics';
import { Button, Card, IconButton, Txt } from '@/ui/primitives';

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

/** Sayfa modunda temel yazı boyutu (yazı boyutu çarpanıyla büyür) */
const PAGE_FONT_SIZE = 19;

/** Okuyucu okuma görünümüyle (renk, yazı tipi) çizilir. */
export default function ReaderRoute() {
  return (
    <ReadingThemeProvider>
      <ReaderScreen />
    </ReadingThemeProvider>
  );
}

function ReaderScreen() {
  const { id, seans, konum } = useLocalSearchParams<{ id: string; seans?: string; konum?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, settings, setFocusMode } = useSettings();

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
  focusSeconds,
}: ReaderProps) {
  const { theme, settings, update, focusMode, setFocusMode } = useSettings();
  const [showAppearance, setShowAppearance] = useState(false);
  const [aiTab, setAiTab] = useState<AiTab | null>(null);
  const [recall, setRecall] = useState<RecallTrigger | null>(null);
  const [listening, setListening] = useState(false);

  const engine = useReaderEngine({
    text,
    initialCharOffset: startOffset,
    onProgress,
  });

  const totalWords = React.useMemo(() => countWords(engine.chunks), [engine.chunks]);

  // ---- Sayfa modu: kitap gibi, tempo yok; sayfayı kullanıcı çevirir.
  // Konum yine motorun indeksi (sayfanın ilk chunk'ı): ilerleme kaydı,
  // alıntıya atlama ve dinleme sonrası konum değişmeden çalışıyor.
  const pageMode = mode === 'page' && !listening;
  const pageFontSize = PAGE_FONT_SIZE * settings.fontScale;
  const pageLineHeight = pageFontSize * settings.lineSpacing;
  const pageParagraphGap = pageLineHeight * 0.45;
  // Kenar boşluğu, hizalama, harf/kelime aralığı, heceleme (Aa → Sayfa düzeni)
  const { pageMargin, justify, letterSpacing, wordSpacing, hyphenate } = settings;
  const layout = useMemo(
    () => readingLayout({ pageMargin, justify, letterSpacing, wordSpacing, hyphenate }),
    [pageMargin, justify, letterSpacing, wordSpacing, hyphenate]
  );
  const pagination = usePagination(
    engine.chunks,
    {
      fontSize: pageFontSize,
      lineHeight: pageLineHeight,
      charEm: theme.readingFont.charEm,
      paragraphGap: pageParagraphGap,
      variant: layout.key,
    },
    pageMode
  );
  const pages = pagination.pages;
  const pageIndex = pages.length ? pageIndexFor(pages, engine.index) : 0;
  const page = pages[pageIndex];
  const pageWords = useMemo(
    () => (page ? countWords(engine.chunks.slice(page.start, page.end)) : 0),
    [engine.chunks, page]
  );
  /** Kullanıcının son sayfa çevirmesi: animasyonun yönü ve tetikleyicisi */
  const [turn, setTurn] = useState<{ id: number; direction: 1 | -1 }>({ id: 0, direction: 1 });
  /** Son sayfadan ileri gidildi: metin bitti */
  const [endReached, setEndReached] = useState(false);

  const pageClock = usePageClock({
    enabled: pageMode && !endReached,
    blocked: aiTab !== null || recall !== null || showAppearance,
    pageKey: endReached ? -2 : (page?.start ?? -1),
    pageWords,
  });

  /**
   * Ortak okuma saati: tempolu modlarda motorun oynatma süresi, Sayfa modunda
   * sayfa saati. Odak seansı, göz molası ve özet kartı bunu kullanıyor.
   */
  const clock: ReadingClock = {
    activeMs: () => engine.activeMs() + pageClock.activeMs(),
    pause: () => {
      engine.pause();
      pageClock.pause();
    },
    wordsRead: engine.wordsRead,
  };

  const focus = useFocusSession(clock, focusSeconds);
  const eyeBreak = useEyeBreak(clock, settings.eyeBreakMinutes);

  // "Kendi cümlenle anlat": bu açılışta okunan aralık için, en fazla bir kez
  const recallAsked = useRef(false);
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const promptRecall = useCallback(
    (trigger: RecallTrigger) => {
      if (
        !shouldPromptRecall({
          trigger,
          activeMs: clockRef.current.activeMs(),
          alreadyAsked: recallAsked.current,
          enabled: settings.recallPrompt,
        })
      ) {
        return false;
      }
      recallAsked.current = true;
      clockRef.current.pause();
      setRecall(trigger);
      return true;
    },
    [settings.recallPrompt]
  );
  useEffect(() => {
    if (focus.done) promptRecall('focusDone');
  }, [focus.done, promptRecall]);
  useEffect(() => {
    if (engine.finished || endReached) promptRecall('finished');
  }, [engine.finished, endReached, promptRecall]);
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

  // ---- Yer imleri
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const loadBookmarks = useCallback(() => {
    void bookmarksForDoc(docId).then(setBookmarks);
  }, [docId]);
  useEffect(loadBookmarks, [loadBookmarks]);

  /** Aramadan gelinince bulunan cümle sayfada belirgin olsun (sayfa çevrilene kadar) */
  const [flashSentence, setFlashSentence] = useState<number | null>(null);

  // Motorun oturumu en son tempolu modla yazılır: Sayfa moduna geçince o ana
  // kadarki RSVP okuması "sayfa" sayılmasın
  const pacedMode = useRef<ReaderMode>(mode === 'page' ? 'rsvp' : mode);
  if (mode !== 'page') pacedMode.current = mode;
  const recorder = useSessionRecorder({
    docId,
    mode: pacedMode.current,
    targetWpm: settings.wpm,
    words: engine.wordsRead,
    activeMs: engine.activeMs,
  });
  // Sayfa modunun okuması ayrı oturum: süre sayfa saatinden, tempo istatistiğine girmez
  useSessionRecorder({
    docId,
    mode: 'page',
    targetWpm: settings.wpm,
    words: pageClock.words,
    activeMs: pageClock.activeMs,
  });

  /** Okumadan konum değiştirmek (sayfa çevirmek, atlamak) okunan kelime sayılmasın. */
  const jumpTo = useCallback(
    (index: number) => {
      engine.jumpToIndex(index);
      recorder.rebase(wordsUpTo(engine.chunks, index));
    },
    [engine, recorder]
  );

  const turnPage = useCallback(
    (delta: 1 | -1) => {
      if (!pages.length) return;
      const target = pageIndex + delta;
      if (target < 0) return;
      haptics.step(settings.haptics);
      if (target >= pages.length) {
        if (endReached) return;
        // Son sayfa da okundu: metin bitmiş sayılsın (ilerleme %100)
        pageClock.markForward();
        setEndReached(true);
        jumpTo(engine.chunks.length - 1);
        haptics.success(settings.haptics);
        return;
      }
      if (delta > 0 && !endReached) pageClock.markForward();
      setEndReached(false);
      setFlashSentence(null);
      setTurn((current) => ({ id: current.id + 1, direction: delta }));
      jumpTo(pages[target].start);
    },
    [pages, pageIndex, settings.haptics, endReached, pageClock, jumpTo, engine.chunks.length]
  );

  const seekPage = useCallback(
    (target: number) => {
      const next = pages[Math.max(0, Math.min(pages.length - 1, target))];
      if (!next) return;
      setEndReached(false);
      setFlashSentence(null);
      setTurn((current) => ({ id: current.id + 1, direction: target >= pageIndex ? 1 : -1 }));
      jumpTo(next.start);
    },
    [pages, pageIndex, jumpTo]
  );

  /** Sayfa modunda araç paneli "hangi cümle?" diye sayfanın cümlelerini sunar. */
  const pageChoices = useMemo<SentenceChoice[] | undefined>(
    () =>
      pageMode && page
        ? pageParagraphs(engine.chunks, page).flatMap((paragraph) =>
            paragraph.sentences.map((sentence) => ({
              text: sentence.text,
              offset: sentence.charStart,
              words: sentence.words,
            }))
          )
        : undefined,
    [pageMode, page, engine.chunks]
  );

  // Kalan süre tahmini: son güvenilir ölçümdeki doğal hız (yoksa ortalama yetişkin)
  const [naturalWpm, setNaturalWpm] = useState(AVERAGE_ADULT_WPM);
  useEffect(() => {
    listAssessments().then((history) => {
      const last = reliableTests(history).pop();
      if (last) setNaturalWpm(last.wpm);
    });
  }, []);
  const pageRemainingMs = page
    ? (Math.max(0, totalWords - wordsUpTo(engine.chunks, page.start)) / Math.max(60, naturalWpm)) * 60000
    : 0;

  // ---- Dinleyerek okuma: motor yerinde durur, ses cümle cümle ilerler
  const spans = React.useMemo(() => sentenceSpans(engine.chunks), [engine.chunks]);
  const speech = useSpeech({
    docId,
    text,
    spans,
    wpm: settings.wpm,
    onSentence: (span) => onProgress(span.charStart, progressRatio(engine.chunks, span.startChunk)),
  });
  const listenSpan = spans[Math.min(speech.current, spans.length - 1)];

  /**
   * Yer iminin "bulunulan yer"i: Sayfa modunda görünen sayfa, diğer modlarda
   * okunan (dinlenen) cümle. Bu aralıkta yer imi varsa düğme dolu görünür.
   */
  const here = useMemo(() => {
    if (pageMode && page) {
      return {
        start: engine.chunks[page.start]?.charStart ?? 0,
        end: engine.chunks[page.end - 1]?.charEnd ?? 0,
      };
    }
    const span = listening ? listenSpan : spans[spanIndexForChunk(spans, engine.index)];
    return span ? { start: span.charStart, end: span.charEnd } : null;
  }, [pageMode, page, engine.chunks, engine.index, listening, listenSpan, spans]);
  const bookmarksHere = useMemo(
    () => (here ? bookmarks.filter((item) => item.charOffset >= here.start && item.charOffset < here.end) : []),
    [bookmarks, here]
  );

  const toggleBookmark = useCallback(async () => {
    if (!here) return;
    haptics.step(settings.haptics);
    if (bookmarksHere.length) {
      await removeBookmarks(bookmarksHere.map((item) => item.id));
    } else {
      await addBookmark({ docId, charOffset: here.start, excerpt: excerptAt(text, here.start) });
    }
    loadBookmarks();
  }, [here, bookmarksHere, docId, text, settings.haptics, loadBookmarks]);

  const jumpToOffset = useCallback(
    (offset: number, reason: JumpReason) => {
      const index = indexFromCharOffset(engine.chunks, offset);
      setEndReached(false);
      setFlashSentence(reason === 'search' ? (engine.chunks[index]?.sentenceIndex ?? null) : null);
      jumpTo(index);
    },
    [engine.chunks, jumpTo]
  );

  /** Listelerde konum: Sayfa modunda sayfa numarası, diğerlerinde yüzde */
  const positionLabel = useCallback(
    (offset: number) => {
      const index = indexFromCharOffset(engine.chunks, offset);
      if (pageMode && pages.length) return `Sayfa ${pageIndexFor(pages, index) + 1}`;
      return `%${Math.round(progressRatio(engine.chunks, index) * 100)}`;
    },
    [engine.chunks, pageMode, pages]
  );

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
    jumpTo(listenSpan.startChunk);
  }, [speech, listenSpan, jumpTo]);

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
      if (recall !== null || showAppearance) return;
      // Tarayıcının kendi araması Sayfa modunda yalnızca görünen sayfayı
      // görür: Ctrl+F (ve /) metnin tamamında arayan paneli açar
      if ((event.key === 'f' || event.key === 'F') && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        engine.pause();
        setAiTab('search');
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === '/') {
        event.preventDefault();
        engine.pause();
        setAiTab('search');
        return;
      }
      if (event.key === 'b' || event.key === 'B') {
        void toggleBookmark();
        return;
      }
      // Yazı boyutu her modda
      if (event.key === '+' || event.key === '=') {
        update({ fontScale: stepFontScale(settings.fontScale, 1) });
        return;
      }
      if (event.key === '-') {
        update({ fontScale: stepFontScale(settings.fontScale, -1) });
        return;
      }
      if (pageMode) {
        switch (event.key) {
          case ' ':
          case 'ArrowRight':
          case 'PageDown':
            event.preventDefault();
            turnPage(1);
            return;
          case 'ArrowLeft':
          case 'PageUp':
            event.preventDefault();
            turnPage(-1);
            return;
        }
      }
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
          if (pageMode) break;
          event.preventDefault();
          update({ wpm: Math.min(1200, settings.wpm + 25) });
          break;
        case 'ArrowDown':
          if (pageMode) break;
          event.preventDefault();
          update({ wpm: Math.max(100, settings.wpm - 25) });
          break;
        case 'r':
        case 'R':
          setEndReached(false);
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
  }, [
    engine,
    update,
    settings.wpm,
    settings.fontScale,
    focusMode,
    setFocusMode,
    leave,
    recall,
    showAppearance,
    pageMode,
    turnPage,
    toggle,
    previousSentence,
    nextSentence,
    toggleBookmark,
  ]);

  // Okurken ekran kararmasın; 10 dakika hiçbir şey olmazsa bırakılır
  useScreenAwake(settings.keepAwake, listening ? `dinle:${speech.current}` : engine.index);

  // Dinlerken metin her modda akış görünümünde: göz sesi takip edebilsin
  const flowMode = listening || mode === 'bionic' || mode === 'highlight';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insetTop }}>
      {/* Durum çubuğu okuma temasına uysun (sepya zeminde açık renk yazı kaybolur) */}
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
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
        <Pressable
          onPress={() => {
            releaseFocus();
            engine.pause();
            setShowAppearance(true);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Okuma görünümü ve mod"
        >
          <Txt variant="dim" style={{ fontSize: 13, color: theme.colors.accent }}>
            Aa · {MODE_LABEL[mode]}
          </Txt>
        </Pressable>
        <IconButton
          name={bookmarksHere.length ? 'bookmarkFilled' : 'bookmark'}
          onPress={() => {
            releaseFocus();
            void toggleBookmark();
          }}
          accessibilityLabel={bookmarksHere.length ? 'Yer imini kaldır' : 'Buraya yer imi koy'}
          emphasis={bookmarksHere.length ? 'strong' : 'faint'}
          size={20}
        />
        <IconButton
          name={aiReady ? 'sparkle' : 'search'}
          onPress={() => {
            releaseFocus();
            engine.pause();
            setAiTab(aiReady ? 'summary' : 'search');
          }}
          accessibilityLabel={aiReady ? 'Araçlar ve yapay zekâ' : 'Ara, yer imleri ve araçlar'}
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
      </View>

      {/*
        Okuma alanı. Dokunma bölgeleri mutlak konumlu katman olarak duruyor:
        yerleşimde yer kaplasalardı akış modlarındaki metin ekranın yalnızca
        yarısını kullanır, satırlar gereksiz yerden kırılırdı.
      */}
      {pageMode ? (
        <View style={{ flex: 1, paddingHorizontal: layout.marginPx, paddingTop: theme.space(3) }}>
          <PageView
            chunks={engine.chunks}
            page={page}
            direction={turn.direction}
            turnId={turn.id}
            fontSize={pageFontSize}
            lineHeight={pageLineHeight}
            paragraphGap={pageParagraphGap}
            layout={layout}
            markedSentences={markedSentences}
            flashSentence={flashSentence}
            onAreaLayout={pagination.onAreaLayout}
            onContentHeight={pagination.onContentHeight}
            onSampleHeight={pagination.onSampleHeight}
            layoutKey={pagination.layoutKey}
            onTurn={turnPage}
            onLongPress={() => {
              haptics.step(settings.haptics);
              setAiTab('quote');
            }}
          />
        </View>
      ) : (
      <View style={{ flex: 1 }}>
        {flowMode ? (
          <View style={{ flex: 1, paddingHorizontal: layout.marginPx }}>
            <FlowView
              chunks={engine.chunks}
              index={listening && listenSpan ? listenSpan.startChunk : engine.index}
              variant={!listening && mode === 'bionic' ? 'bionic' : 'highlight'}
              layout={layout}
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
      )}

      {listening ? <ListenStatus voice={speech.voice} playing={speech.playing} onExit={stopListening} /> : null}

      {eyeBreak.active ? (
        <View style={{ paddingHorizontal: theme.space(4), paddingBottom: theme.space(3) }}>
          <Card style={{ gap: theme.space(2), borderColor: theme.colors.accent }}>
            <Txt variant="heading">Göz molası</Txt>
            <Txt variant="dim">
              {settings.eyeBreakMinutes} dakikadır okuyorsun. Ekrandan başını kaldır ve 20 saniye
              boyunca uzaktaki bir şeye (yaklaşık 6 metre) bak.
            </Txt>
            <Txt variant="title" style={{ fontSize: 34, color: theme.colors.accent, textAlign: 'center' }}>
              {eyeBreak.remaining > 0 ? eyeBreak.remaining : 'Tamam'}
            </Txt>
            <Button
              label={eyeBreak.remaining > 0 ? 'Atla' : 'Okumaya devam'}
              variant={eyeBreak.remaining > 0 ? 'ghost' : 'primary'}
              onPress={() => {
                const resume = eyeBreak.remaining === 0;
                eyeBreak.finish();
                if (pageMode) pageClock.resume();
                else if (resume) engine.toggle();
              }}
            />
          </Card>
        </View>
      ) : null}

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
                onPress={() => {
                  focus.dismiss();
                  pageClock.resume();
                }}
              />
            </View>
          </Card>
        </View>
      ) : null}

      {engine.finished && !pageMode ? (
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
        {pageMode ? (
          <PageControls
            pageIndex={pageIndex}
            pageCount={pages.length}
            remainingMs={pageRemainingMs}
            finished={endReached}
            onTurn={turnPage}
            onSeekPage={seekPage}
          />
        ) : (
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
        )}
      </View>

      <RecallCard
        visible={recall !== null}
        docId={docId}
        docTitle={title}
        text={text}
        fromChar={startOffset}
        toChar={
          pageMode && page
            ? (engine.chunks[page.end - 1]?.charEnd ?? startOffset)
            : (engine.chunk?.charEnd ?? startOffset)
        }
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
        charOffset={pageMode && page ? (engine.chunks[page.start]?.charStart ?? 0) : (engine.chunk?.charStart ?? 0)}
        words={context.words}
        sentence={context.sentence}
        sentenceOffset={context.sentenceOffset}
        sentenceChoices={pageChoices}
        onHighlightSaved={loadQuotes}
        onJumpTo={jumpToOffset}
        bookmarks={bookmarks}
        onRemoveBookmark={(bookmarkId) => void removeBookmarks([bookmarkId]).then(loadBookmarks)}
        positionLabel={positionLabel}
      />

      <AppearanceSheet visible={showAppearance} onClose={() => setShowAppearance(false)} />
    </View>
  );
}

/** Okuyucunun "Aa" sayfası: mod, yazı boyutu, satır aralığı, yazı tipi, renkler. */
function AppearanceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useSettings();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000066' }} onPress={onClose} />
      <View
        style={{
          maxHeight: '78%',
          backgroundColor: theme.colors.bg,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          borderTopWidth: 1,
          borderColor: theme.colors.border,
          paddingTop: theme.space(4),
          paddingHorizontal: theme.space(4),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.space(2) }}>
          <Txt variant="heading" style={{ flex: 1, fontSize: 18 }}>
            Okuma görünümü
          </Txt>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Txt variant="dim">kapat</Txt>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: theme.space(8) }}>
          <AppearancePanel showModes />
        </ScrollView>
      </View>
    </Modal>
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
