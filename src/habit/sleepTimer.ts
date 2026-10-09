/**
 * Dinlerken uyku zamanlayıcısı — saf, testli.
 *
 * Yatakta dinlerken uyuyakalan kullanıcının kitabı sabaha kadar okunmasın:
 * süre dolunca (ya da bölüm bitince) ses **cümlenin sonunda** durur, cümle
 * ortasında kesilmez. Karar her cümleye geçmeden önce verilir.
 */

export type SleepChoice = 'off' | 10 | 20 | 30 | 'chapter';

export type SleepTimer =
  | { kind: 'off' }
  | { kind: 'time'; minutes: number; endsAt: number }
  /** `endOffset`: sıradaki bölümün başladığı karakter; oraya gelmeden durulur */
  | { kind: 'chapter'; endOffset: number };

export const SLEEP_OFF: SleepTimer = { kind: 'off' };

/** Dokundukça sırayla: kapalı → 10 → 20 → 30 dk → bölüm sonu → kapalı */
export function sleepChoices(hasChapters: boolean): SleepChoice[] {
  return hasChapters ? ['off', 10, 20, 30, 'chapter'] : ['off', 10, 20, 30];
}

export function choiceOf(timer: SleepTimer): SleepChoice {
  if (timer.kind === 'off') return 'off';
  if (timer.kind === 'chapter') return 'chapter';
  return timer.minutes as SleepChoice;
}

export function nextChoice(current: SleepChoice, hasChapters: boolean): SleepChoice {
  const choices = sleepChoices(hasChapters);
  const index = choices.indexOf(current);
  return choices[(index + 1) % choices.length];
}

/**
 * Bulunulan konumdan sonra başlayan ilk bölümün başı; bölüm yoksa ya da son
 * bölümdeyse metnin sonu.
 */
export function chapterEndAfter(
  chapters: { charOffset: number }[],
  offset: number,
  textLength: number
): number {
  let end = textLength;
  for (const chapter of chapters) {
    if (chapter.charOffset > offset && chapter.charOffset < end) end = chapter.charOffset;
  }
  return end;
}

export function startTimer(
  choice: SleepChoice,
  context: { now: number; offset: number; chapters: { charOffset: number }[]; textLength: number }
): SleepTimer {
  if (choice === 'off') return SLEEP_OFF;
  if (choice === 'chapter') {
    return { kind: 'chapter', endOffset: chapterEndAfter(context.chapters, context.offset, context.textLength) };
  }
  return { kind: 'time', minutes: choice, endsAt: context.now + choice * 60_000 };
}

/** Sıradaki cümleye geçmeden: dinleme burada dursun mu? */
export function shouldStopBefore(timer: SleepTimer, next: { now: number; charStart: number }): boolean {
  switch (timer.kind) {
    case 'off':
      return false;
    case 'time':
      return next.now >= timer.endsAt;
    case 'chapter':
      return next.charStart >= timer.endOffset;
  }
}

/**
 * Dinleme yeniden başlatılırken: süresi dolmuş zamanlayıcı kapanır (yoksa
 * kullanıcı "oynat"a basar basmaz yine dururdu).
 */
export function onResume(timer: SleepTimer, context: { now: number; offset: number }): SleepTimer {
  if (timer.kind === 'time' && context.now >= timer.endsAt) return SLEEP_OFF;
  if (timer.kind === 'chapter' && context.offset >= timer.endOffset) return SLEEP_OFF;
  return timer;
}

/** Kısa etiket: "kapalı", "12:05", "bölüm sonu" */
export function sleepLabel(timer: SleepTimer, now: number): string {
  if (timer.kind === 'off') return 'kapalı';
  if (timer.kind === 'chapter') return 'bölüm sonu';
  const seconds = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
