import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ttsRate, type SentenceSpan } from '@/core/sentences';
import { recordSession } from '@/storage/stats';

/**
 * Dinleyerek okuma: metni cümle cümle seslendirir, okunan cümleyi bildirir.
 *
 * Birim **cümle**: bir cümle bitince sıradaki seslendirilir. Ses kelime
 * sınırlarını bildiriyorsa (`onBoundary`; her platformda ve her seste gelmiyor,
 * ör. Chrome'un ağ sesleri göndermiyor) okunan kelime de bildirilir.
 * Dinleme süresi ayrı bir oturum olarak (`mode: 'listen'`) kaydedilir: günlük
 * dakikaya sayılır ama okuma temposu istatistiğine girmez.
 */

export type VoiceStatus = 'checking' | 'turkish' | 'fallback' | 'none';

export interface SpeechControls {
  voice: VoiceStatus;
  playing: boolean;
  /** Seslendirilen (ya da duraklatılan) cümlenin `spans` içindeki sırası */
  current: number;
  /** Ses kelime sınırı bildirdiyse o an okunan kelimenin metindeki konumu */
  wordOffset: number | null;
  /** Bu seste kelime takibi çalışıyor mu (bir kez sınır geldiyse) */
  wordTracking: boolean;
  /** Verilen cümleden başlayarak seslendirir */
  play: (spanIndex: number) => void;
  /** Durdurur; kaldığı cümle `current` olarak kalır */
  stop: () => void;
}

interface Options {
  docId: string;
  text: string;
  spans: SentenceSpan[];
  wpm: number;
  /** Yeni bir cümleye geçildiğinde (ilerleme kaydı için) */
  onSentence: (span: SentenceSpan) => void;
  /**
   * Sıradaki cümleye kendiliğinden geçmeden sorulur; `false` dönerse ses
   * burada durur (uyku zamanlayıcısı). Kullanıcının başlattığı oynatmada sorulmaz.
   */
  shouldContinue?: (next: SentenceSpan) => boolean;
  /** `shouldContinue` yüzünden durulduğunda */
  onAutoStop?: () => void;
}

const MIN_SESSION_MS = 3000;

export function useSpeech({
  docId,
  text,
  spans,
  wpm,
  onSentence,
  shouldContinue,
  onAutoStop,
}: Options): SpeechControls {
  const [voice, setVoice] = useState<VoiceStatus>('checking');
  const voiceId = useRef<string | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [wordOffset, setWordOffset] = useState<number | null>(null);
  const [wordTracking, setWordTracking] = useState(false);

  // Her başlatmada artar: durdurulan bir seslendirmenin geç gelen `onDone`'u
  // yeni seslendirmeyi ilerletmesin
  const generation = useRef(0);
  const session = useRef<{ startedAt: number; words: number } | null>(null);

  const latest = useRef({ docId, text, spans, wpm, onSentence, shouldContinue, onAutoStop });
  latest.current = { docId, text, spans, wpm, onSentence, shouldContinue, onAutoStop };

  useEffect(() => {
    let cancelled = false;
    const find = async (attempt: number) => {
      try {
        // Ses listesi hiç gelmeyebiliyor (tarayıcı olayı tetiklemezse): beklemeyi sınırla
        const voices = await Promise.race([
          Speech.getAvailableVoicesAsync(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (cancelled) return;
        if (voices === null) {
          setVoice('none');
          return;
        }
        // Tarayıcılar ses listesini geç doldurabiliyor; kısa bir süre tekrar dene
        if (voices.length === 0 && attempt < 2) {
          setTimeout(() => void find(attempt + 1), 700);
          return;
        }
        const turkish = voices.find((item) => item.language?.toLowerCase().startsWith('tr'));
        voiceId.current = turkish?.identifier;
        setVoice(turkish ? 'turkish' : voices.length ? 'fallback' : 'none');
      } catch {
        if (!cancelled) setVoice('none');
      }
    };
    void find(0);
    return () => {
      cancelled = true;
    };
  }, []);

  /** Biriken dinleme süresini oturum olarak yazar. */
  const flushSession = useCallback(() => {
    const open = session.current;
    session.current = null;
    if (!open) return;
    const ms = Date.now() - open.startedAt;
    if (ms < MIN_SESSION_MS || open.words <= 0) return;
    void recordSession({
      docId: latest.current.docId,
      mode: 'listen',
      at: Date.now(),
      ms,
      words: open.words,
      targetWpm: latest.current.wpm,
    });
  }, []);

  const speakFrom = useCallback(
    (index: number, run: number) => {
      const { spans: list, text: source, wpm: rate } = latest.current;
      if (run !== generation.current) return;
      if (index >= list.length) {
        setPlaying(false);
        flushSession();
        return;
      }
      const span = list[index];
      setCurrent(index);
      setWordOffset(null);
      latest.current.onSentence(span);
      const sentence = source.slice(span.charStart, span.charEnd).slice(0, Speech.maxSpeechInputLength);
      Speech.speak(sentence, {
        language: 'tr-TR',
        voice: voiceId.current,
        rate: ttsRate(rate),
        // Telefonda {charIndex, charLength}, tarayıcıda SpeechSynthesisEvent
        // (cümle sınırları da gelebiliyor: yalnızca "word" alınır)
        onBoundary: (event: unknown) => {
          if (run !== generation.current) return;
          const boundary = event as { charIndex?: number; name?: string };
          if (typeof boundary.charIndex !== 'number') return;
          if (boundary.name !== undefined && boundary.name !== 'word') return;
          setWordTracking(true);
          setWordOffset(span.charStart + boundary.charIndex);
        },
        onDone: () => {
          if (run !== generation.current) return;
          if (session.current) session.current.words += span.words;
          const next = latest.current.spans[index + 1];
          if (next && latest.current.shouldContinue && !latest.current.shouldContinue(next)) {
            // Uyku zamanlayıcısı: cümle bitti, burada dur; devam edilince
            // dinlenmiş cümle tekrar okunmasın diye konum sıradakine geçer
            setPlaying(false);
            setWordOffset(null);
            setCurrent(index + 1);
            latest.current.onSentence(next);
            flushSession();
            latest.current.onAutoStop?.();
            return;
          }
          speakFrom(index + 1, run);
        },
        onError: () => {
          if (run !== generation.current) return;
          setPlaying(false);
          flushSession();
        },
      });
    },
    [flushSession]
  );

  const stop = useCallback(() => {
    generation.current += 1;
    void Speech.stop();
    setPlaying(false);
    setWordOffset(null);
    flushSession();
  }, [flushSession]);

  const play = useCallback(
    (spanIndex: number) => {
      generation.current += 1;
      void Speech.stop();
      flushSession();
      session.current = { startedAt: Date.now(), words: 0 };
      setPlaying(true);
      speakFrom(Math.max(0, Math.min(spanIndex, latest.current.spans.length - 1)), generation.current);
    },
    [flushSession, speakFrom]
  );

  // Ekrandan çıkınca ses kesilsin ve süre yazılsın
  useEffect(
    () => () => {
      generation.current += 1;
      void Speech.stop();
      flushSession();
    },
    [flushSession]
  );

  return { voice, playing, current, wordOffset, wordTracking, play, stop };
}
