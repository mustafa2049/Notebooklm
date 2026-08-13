import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildChunks } from '@/core/chunker';
import { chunkDuration, estimateRemainingMs, rampMultiplier } from '@/core/pacing';
import {
  indexFromCharOffset,
  indexFromRatio,
  nextParagraphIndex,
  nextSentenceIndex,
  previousParagraphIndex,
  previousSentenceIndex,
  progressRatio,
  wordsUpTo,
} from '@/core/progress';
import {
  createPlayback,
  pause as pausePlayback,
  play as playPlayback,
  seek as seekPlayback,
  tick,
  type PlaybackState,
} from '@/core/scheduler';
import { tokenize } from '@/core/tokenizer';
import type { Chunk, ChunkOptions, PacingOptions, Token } from '@/core/types';
import { useSettings } from '@/store/SettingsContext';

/** Yüksek çözünürlüklü saat; olmayan ortamlarda Date.now'a düşer. */
function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export interface ReaderEngineOptions {
  text: string;
  /** Kaldığı yer (karakter offseti) */
  initialCharOffset?: number;
  /** Antrenman modu geçici olarak hızı ezebilir */
  wpmOverride?: number;
  /** Antrenman modu geçici olarak kelime grubunu ezebilir */
  chunkSizeOverride?: number;
  /** İlerleme kaydı (kısılmış olarak çağrılır) */
  onProgress?: (charOffset: number, ratio: number) => void;
  /** Metin bittiğinde */
  onFinish?: () => void;
}

export interface ReaderEngine {
  tokens: Token[];
  chunks: Chunk[];
  chunk: Chunk | undefined;
  index: number;
  playing: boolean;
  finished: boolean;
  ratio: number;
  wordsRead: number;
  /** Kalan tahmini süre (ms) */
  remainingMs: number;
  /** Yalnızca oynatma sürerken biriken süre (istatistik için) */
  activeMs: () => number;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  nextChunk: () => void;
  previousChunk: () => void;
  nextSentence: () => void;
  previousSentence: () => void;
  nextParagraph: () => void;
  previousParagraph: () => void;
  restart: () => void;
  seekRatio: (ratio: number) => void;
  /** Karakter konumuna atla (AI bölüm listesi, kaldığın yer) */
  seekCharOffset: (offset: number) => void;
  /** Metin bittikten sonra baştan başlamadan devam etmek için */
  jumpToIndex: (index: number) => void;
}

/** İlerleme kaydı bu aralıkla yazılır — her kelimede diske yazmak gereksiz. */
const PROGRESS_SAVE_MS = 2000;

export function useReaderEngine(options: ReaderEngineOptions): ReaderEngine {
  const { text, initialCharOffset = 0, wpmOverride, chunkSizeOverride, onProgress, onFinish } = options;
  const { settings } = useSettings();

  const chunkOptions: ChunkOptions = useMemo(
    () => ({
      chunkSize: chunkSizeOverride ?? settings.chunkSize,
      breakOnSentence: true,
      breakOnPunctuation: false,
      // Grup büyüdükçe ekrana sığması için karakter sınırı da büyür
      maxChars: 14 + (chunkSizeOverride ?? settings.chunkSize) * 10,
      splitLongWords: settings.splitLongWords ? 14 : 0,
    }),
    [chunkSizeOverride, settings.chunkSize, settings.splitLongWords]
  );

  const pacing: PacingOptions = useMemo(
    () => ({
      wpm: wpmOverride ?? settings.wpm,
      useMultipliers: settings.useMultipliers,
      rampUp: settings.rampUp,
    }),
    [wpmOverride, settings.wpm, settings.useMultipliers, settings.rampUp]
  );

  const tokens = useMemo(() => tokenize(text), [text]);
  const chunks = useMemo(() => buildChunks(tokens, chunkOptions), [tokens, chunkOptions]);

  // `chunks` bu satırdan önce hesaplandığı için tekrar tokenize etmeye gerek yok
  const [playback, setPlayback] = useState<PlaybackState>(() =>
    createPlayback(indexFromCharOffset(chunks, initialCharOffset))
  );

  // Döngü içinden okunacak güncel değerler
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const chunksRef = useRef(chunks);
  chunksRef.current = chunks;
  const pacingRef = useRef(pacing);
  pacingRef.current = pacing;

  const activeMsRef = useRef(0);
  const charOffsetRef = useRef(initialCharOffset);

  const durationOf = useCallback((index: number, framesSinceResume: number) => {
    const chunk = chunksRef.current[index];
    if (!chunk) return 200;
    const options = pacingRef.current;
    return chunkDuration(chunk, options) * rampMultiplier(framesSinceResume, options.rampUp);
  }, []);

  /**
   * Chunk listesi yeniden kurulduğunda (kelime grubu veya uzun kelime ayarı
   * değişti) indeks kayar. Karakter offseti sabit olduğu için oradan yeni
   * indeksi buluyoruz — kullanıcı ayarı değiştirince metnin başına dönmesin.
   */
  useEffect(() => {
    setPlayback((current) => {
      const nextIndex = indexFromCharOffset(chunks, charOffsetRef.current);
      if (nextIndex === current.index) return current;
      return { ...current, index: nextIndex, nextDueAt: now() + durationOf(nextIndex, 0), framesSinceResume: 0 };
    });
  }, [chunks, durationOf]);

  // Hız değişince saati hemen yeniden kur: değişiklik bir sonraki kelimede hissedilsin
  useEffect(() => {
    setPlayback((current) => {
      if (!current.playing) return current;
      return { ...current, nextDueAt: now() + durationOf(current.index, current.framesSinceResume) };
    });
  }, [pacing, durationOf]);

  // Oynatma döngüsü. rAF kullanıyoruz; süre hesabı scheduler'da.
  useEffect(() => {
    if (!playback.playing) return;
    let frame = 0;
    let last = now();

    const loop = () => {
      const current = now();
      activeMsRef.current += current - last;
      last = current;

      const next = tick(playbackRef.current, current, chunksRef.current.length, durationOf);
      if (next !== playbackRef.current) {
        playbackRef.current = next;
        setPlayback(next);
      }
      if (next.playing) frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playback.playing, durationOf]);

  // Metin bitti bildirimi
  const finishedRef = useRef(false);
  useEffect(() => {
    if (playback.finished && !finishedRef.current) {
      finishedRef.current = true;
      onFinish?.();
    } else if (!playback.finished) {
      finishedRef.current = false;
    }
  }, [playback.finished, onFinish]);

  // İlerleme kaydı: kısılmış, ayrıca ekrandan ayrılırken son hâli yazılır
  const chunk = chunks[playback.index];
  useEffect(() => {
    if (chunk) charOffsetRef.current = chunk.charStart;
  }, [chunk]);

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!chunk) return;
    const timer = setTimeout(() => {
      onProgressRef.current?.(chunk.charStart, progressRatio(chunks, playback.index));
    }, PROGRESS_SAVE_MS);
    return () => clearTimeout(timer);
  }, [chunk, chunks, playback.index]);

  useEffect(() => {
    return () => {
      const list = chunksRef.current;
      const last = list[playbackRef.current.index];
      if (last) onProgressRef.current?.(last.charStart, progressRatio(list, playbackRef.current.index));
    };
  }, []);

  const move = useCallback(
    (compute: (chunks: Chunk[], index: number) => number) => {
      setPlayback((current) =>
        seekPlayback(current, compute(chunksRef.current, current.index), now(), durationOf)
      );
    },
    [durationOf]
  );

  const play = useCallback(() => {
    setPlayback((current) => {
      // Sondaysa baştan başlatmak yerine son kelimede kal: kullanıcı geri sarabilir
      if (current.finished) return current;
      return playPlayback(current, now(), durationOf);
    });
  }, [durationOf]);

  const pause = useCallback(() => setPlayback((current) => pausePlayback(current)), []);

  const toggle = useCallback(() => {
    setPlayback((current) =>
      current.playing ? pausePlayback(current) : playPlayback({ ...current, finished: false }, now(), durationOf)
    );
  }, [durationOf]);

  // Gezinme fonksiyonları sabit kimlikli: okuyucu her kelimede yeniden render
  // olduğu için kontrol çubuğunun boşuna render olmasını istemiyoruz
  const nextChunk = useCallback(() => move((_list, index) => index + 1), [move]);
  const previousChunk = useCallback(() => move((_list, index) => Math.max(0, index - 1)), [move]);
  const nextSentence = useCallback(() => move(nextSentenceIndex), [move]);
  const previousSentence = useCallback(() => move(previousSentenceIndex), [move]);
  const nextParagraph = useCallback(() => move(nextParagraphIndex), [move]);
  const previousParagraph = useCallback(() => move(previousParagraphIndex), [move]);
  const restart = useCallback(() => move(() => 0), [move]);
  const seekRatio = useCallback((ratio: number) => move((list) => indexFromRatio(list, ratio)), [move]);
  const seekCharOffset = useCallback(
    (offset: number) => move((list) => indexFromCharOffset(list, offset)),
    [move]
  );
  const jumpToIndex = useCallback((index: number) => move(() => index), [move]);
  const activeMs = useCallback(() => activeMsRef.current, []);

  return {
    tokens,
    chunks,
    chunk,
    index: playback.index,
    playing: playback.playing,
    finished: playback.finished,
    ratio: progressRatio(chunks, playback.index),
    wordsRead: wordsUpTo(chunks, playback.index),
    remainingMs: estimateRemainingMs(chunks, pacing, playback.index),
    activeMs,
    toggle,
    play,
    pause,
    nextChunk,
    previousChunk,
    nextSentence,
    previousSentence,
    nextParagraph,
    previousParagraph,
    restart,
    seekRatio,
    seekCharOffset,
    jumpToIndex,
  };
}
