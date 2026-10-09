import { useEffect, useRef, useState } from 'react';
import { isCapacitor, isTauri } from './native';
import { parseCommands, type SpokenCommand } from './speechParse';

export type SpeechStatus = 'off' | 'starting' | 'listening' | 'denied' | 'error';

interface WebRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

const webCtor = (): (new () => WebRecognition) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => WebRecognition) | null;
};

/** Bu ortamda sesle cevap verilebilir mi (Android uygulaması ya da Chrome/Edge). Masaüstü uygulamasında yok. */
export function speechSupported(): boolean {
  if (isCapacitor()) return true;
  if (isTauri()) return false;
  return !!webCtor();
}

/** Android'de cihazın konuşma tanıma hizmeti var mı (yoksa seçenek gizlenir). */
export function useSpeechAvailable(): boolean {
  const [ok, setOk] = useState(() => speechSupported() && !isCapacitor());
  useEffect(() => {
    if (!isCapacitor()) return;
    import('@capacitor-community/speech-recognition')
      .then(({ SpeechRecognition }) => SpeechRecognition.available())
      .then((r) => setOk(r.available))
      .catch(() => setOk(false));
  }, []);
  return ok;
}

/**
 * Sürekli dinler; söylenen her yeni yön kelimesi için `onCommand` çağrılır.
 * Ara sonuçlar da kullanılır (cevap konuşma bitmeden algılanır); aynı sonuçta önceden işlenen
 * komutlar tekrar sayılmaz. Ses kaydedilmez, yalnızca metne çevrilen kelimeler kullanılır.
 */
export function useSpeechCommands(enabled: boolean, onCommand: (c: SpokenCommand) => void): { status: SpeechStatus; heard: string } {
  const [status, setStatus] = useState<SpeechStatus>('off');
  const [heard, setHeard] = useState('');
  const cb = useRef(onCommand);
  cb.current = onCommand;

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    let active = true;
    let lastFire = 0;
    // Sonuç (konuşma parçası) başına işlenmiş komut sayısı
    const consumed = new Map<number, number>();
    const handle = (index: number, text: string) => {
      setHeard(text.trim().split(/\s+/).slice(-3).join(' '));
      const cmds = parseCommands(text);
      const done = consumed.get(index) ?? 0;
      for (let i = done; i < cmds.length; i++) {
        const now = performance.now();
        if (now - lastFire < 400) continue; // aynı kelimenin hızlı tekrarı
        lastFire = now;
        cb.current(cmds[i]);
      }
      consumed.set(index, Math.max(done, cmds.length));
    };
    setStatus('starting');

    if (isCapacitor()) {
      let session = 0;
      const removers: (() => void)[] = [];
      (async () => {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const perm = await SpeechRecognition.requestPermissions();
        if (!active) return;
        if (perm.speechRecognition !== 'granted') return setStatus('denied');
        const start = () =>
          SpeechRecognition.start({ language: 'tr-TR', partialResults: true, popup: false, maxResults: 1 }).catch(() => undefined);
        const h1 = await SpeechRecognition.addListener('partialResults', (d) => {
          if (d.matches?.[0]) handle(session, d.matches[0]);
        });
        // Android her cümleden sonra dinlemeyi bırakır; test sürerken yeniden başlatılır.
        const h2 = await SpeechRecognition.addListener('listeningState', (d) => {
          if (d.status === 'started') setStatus('listening');
          else if (active) {
            session++;
            window.setTimeout(() => active && start(), 150);
          }
        });
        removers.push(() => h1.remove(), () => h2.remove());
        if (!active) return removers.forEach((r) => r());
        await start();
      })().catch(() => active && setStatus('error'));
      return () => {
        active = false;
        removers.forEach((r) => r());
        import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) => SpeechRecognition.stop().catch(() => undefined));
      };
    }

    const Ctor = webCtor();
    if (!Ctor) {
      setStatus('error');
      return;
    }
    let rec: WebRecognition | null = null;
    let offset = 0; // her yeniden başlatmada sonuç sırası sıfırlanır
    const startWeb = () => {
      rec = new Ctor();
      rec.lang = 'tr-TR';
      rec.continuous = true;
      rec.interimResults = true;
      const base = offset;
      rec.onresult = (e) => {
        setStatus('listening');
        for (let i = e.resultIndex; i < e.results.length; i++) handle(base + i, e.results[i][0].transcript);
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          active = false;
          setStatus('denied');
        } else if (e.error === 'network' || e.error === 'audio-capture' || e.error === 'language-not-supported') {
          // Yeniden denemek işe yaramaz (internet ya da mikrofon yok); düğmelerle devam edilir.
          active = false;
          setStatus('error');
        }
      };
      rec.onend = () => {
        offset += 1000;
        if (active) window.setTimeout(() => active && startWeb(), 200);
      };
      try {
        rec.start();
        setStatus('listening');
      } catch {
        setStatus('error');
      }
    };
    startWeb();
    return () => {
      active = false;
      rec?.abort();
    };
  }, [enabled]);

  return { status, heard };
}

export function speechStatusText(s: SpeechStatus): string {
  switch (s) {
    case 'starting':
      return 'Mikrofon açılıyor…';
    case 'listening':
      return '🎤 Dinliyorum: “sağ”, “sol”, “yukarı”, “aşağı” ya da “göremiyorum” de.';
    case 'denied':
      return 'Mikrofon izni verilmedi; düğmelerle cevap verebilirsin.';
    case 'error':
      return 'Konuşma tanıma çalışmadı (tarayıcıda internet gerekir). Düğmelerle devam edebilirsin.';
    default:
      return '';
  }
}
