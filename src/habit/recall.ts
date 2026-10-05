/**
 * "Kendi cümlenle anlat" kartının ne zaman gösterileceği — saf, testli.
 *
 * Okuduğunu hatırlamaya çalışmak (hatırlama pratiği, "retrieval practice")
 * yeniden okumaktan daha kalıcı öğrenme sağlıyor (Roediger ve Karpicke, 2006).
 * Ama her kapanışta soru sormak bezdirir: kart yalnızca anlamlı bir okumadan
 * sonra, oturum başına bir kez çıkar ve her zaman atlanabilir.
 */

export type RecallTrigger = 'focusDone' | 'finished' | 'leave';

/** Okuyucudan çıkarken kart için gereken en az okuma süresi */
export const RECALL_MIN_LEAVE_MS = 3 * 60 * 1000;
/** Metin bittiğinde: çok kısa metinlerde (birkaç saniyelik) sorma */
export const RECALL_MIN_FINISH_MS = 60 * 1000;

export function shouldPromptRecall(input: {
  trigger: RecallTrigger;
  /** Bu okuyucu açılışında oynatmayla geçen süre */
  activeMs: number;
  /** Bu açılışta kart zaten gösterildi mi */
  alreadyAsked: boolean;
  enabled: boolean;
}): boolean {
  if (!input.enabled || input.alreadyAsked) return false;
  switch (input.trigger) {
    case 'focusDone':
      return true;
    case 'finished':
      return input.activeMs >= RECALL_MIN_FINISH_MS;
    case 'leave':
      return input.activeMs >= RECALL_MIN_LEAVE_MS;
  }
}
