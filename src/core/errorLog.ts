/**
 * Hata günlüğü — saf, testli.
 *
 * Telefonda olan bir hatayı geliştirici göremiyor: uygulama hataları cihazda
 * saklıyor, kullanıcı Ayarlar'dan tek dokunuşla paylaşıyor. Burada yalnızca
 * girdinin biçimi, sınırı ve paylaşılacak metin var; depolama ve yakalama
 * `storage/errorLog`'da.
 */

export type ErrorSource = 'js' | 'promise' | 'render';

export interface ErrorEntry {
  at: number;
  source: ErrorSource;
  /** Uygulamayı kapatan hata mı (telefonda yakalanmamış hata) */
  fatal: boolean;
  message: string;
  /** Kısaltılmış yığın */
  stack?: string;
  /** Hatanın olduğu ekran ("/reader/abc") */
  route?: string;
}

/** Saklanan en çok girdi */
export const MAX_ENTRIES = 50;
/** Aynı ileti bu kadar süre içinde tekrar yazılmaz (döngüde patlayan hata günlüğü doldurmasın) */
export const REPEAT_MS = 2000;
const MAX_MESSAGE = 500;
const MAX_STACK = 1500;

/** Her türlü atılan değerden ileti ve kısaltılmış yığın */
export function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    const message = `${error.name && error.name !== 'Error' ? `${error.name}: ` : ''}${error.message || 'Bilinmeyen hata'}`;
    return {
      message: message.slice(0, MAX_MESSAGE),
      ...(error.stack ? { stack: error.stack.slice(0, MAX_STACK) } : {}),
    };
  }
  if (typeof error === 'string') return { message: error.slice(0, MAX_MESSAGE) || 'Bilinmeyen hata' };
  try {
    const json = JSON.stringify(error);
    return { message: (json && json !== '{}' ? json : String(error)).slice(0, MAX_MESSAGE) };
  } catch {
    return { message: String(error).slice(0, MAX_MESSAGE) };
  }
}

/** Girdiyi başa ekler; aynı ileti hemen tekrar ediyorsa eklemez; sınırı korur */
export function appendEntry(list: ErrorEntry[], entry: ErrorEntry): ErrorEntry[] {
  const last = list[0];
  if (last && last.message === entry.message && entry.at - last.at < REPEAT_MS) return list;
  return [entry, ...list].slice(0, MAX_ENTRIES);
}

const SOURCE_LABEL: Record<ErrorSource, string> = {
  js: 'hata',
  promise: 'yakalanmamış işlem',
  render: 'ekran çizimi',
};

function stamp(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Paylaşılacak metin: cihaz bilgisi + her hata (en yeni önce) */
export function formatErrorLog(
  entries: ErrorEntry[],
  device: { app: string; platform: string; os?: string }
): string {
  const header = [
    'Hızlı Okuma — hata günlüğü',
    `Uygulama: ${device.app} · ${device.platform}${device.os ? ` ${device.os}` : ''}`,
    `${entries.length} kayıt`,
  ];
  const body = entries.map((entry, index) =>
    [
      `#${index + 1} ${stamp(entry.at)} · ${SOURCE_LABEL[entry.source]}${entry.fatal ? ' · uygulamayı kapattı' : ''}${entry.route ? ` · ${entry.route}` : ''}`,
      entry.message,
      ...(entry.stack ? [entry.stack] : []),
    ].join('\n')
  );
  return `${header.join('\n')}\n\n${body.join('\n\n')}`.trimEnd() + '\n';
}
