/**
 * Okuma ipucu (uygulama niyeti) — "ne zaman, nerede okuyacağım?"
 *
 * Gollwitzer'in "uygulama niyeti" çalışmaları, bir davranışı belirli bir
 * duruma bağlamanın ("kahveden sonra okuyacağım") onu yapma olasılığını
 * belirgin biçimde artırdığını gösteriyor. Sihirbaz bu yüzden önce hedef değil,
 * zaman ve yer soruyor; hatırlatıcı da aynı ipucuyla konuşuyor.
 */

export interface CueOption {
  /** Cümle içinde kullanılan hâli: "sabah kahvesinden sonra" */
  cue: string;
  label: string;
  hour: number;
  minute: number;
}

export const CUE_OPTIONS: CueOption[] = [
  { cue: 'sabah kahvesinden sonra', label: 'Sabah kahvesinden sonra', hour: 8, minute: 0 },
  { cue: 'yolda, toplu taşımada', label: 'Yolda, toplu taşımada', hour: 8, minute: 30 },
  { cue: 'öğle arasında', label: 'Öğle arasında', hour: 12, minute: 30 },
  { cue: 'akşam yemeğinden sonra', label: 'Akşam yemeğinden sonra', hour: 20, minute: 30 },
  { cue: 'yatmadan önce', label: 'Yatmadan önce', hour: 22, minute: 30 },
];

/** Hatırlatıcı metni: ipucu varsa onunla, yoksa hedefle konuşur. */
export function reminderBody(input: {
  cue: string;
  goalUnit: 'minutes' | 'words';
  goalMinutes: number;
  goalWords: number;
}): string {
  const goal =
    input.goalUnit === 'minutes'
      ? input.goalMinutes > 0
        ? `${input.goalMinutes} dakika`
        : ''
      : input.goalWords > 0
        ? `${input.goalWords} kelime`
        : '';
  const cue = input.cue.trim();
  if (cue && goal) return `${capitalize(cue)}: ${goal} okuma zamanı.`;
  if (cue) return `${capitalize(cue)}: biraz okuma zamanı.`;
  if (goal) return `Bugünkü hedefin ${goal}. Kısa bir tur yeter.`;
  return 'Bugün biraz okumaya ne dersin?';
}

function capitalize(text: string): string {
  if (!text) return text;
  const first = text[0] === 'i' ? 'İ' : text[0] === 'ı' ? 'I' : text[0].toUpperCase();
  return first + text.slice(1);
}
