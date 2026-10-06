export type CardState = 'down' | 'up' | 'matched';

export interface Card {
  sym: number;
  state: CardState;
}

/** Seviyeye göre ızgara boyutu [sütun, satır]; kart sayısı her zaman çifttir. */
export function gridForLevel(level: number): [number, number] {
  if (level <= 1) return [4, 3];
  if (level === 2) return [4, 4];
  if (level === 3) return [4, 5];
  return [5, 6];
}

/** Her sembolden iki tane içeren karıştırılmış deste. */
export function makeDeck(pairs: number, rnd: () => number = Math.random): Card[] {
  const syms = Array.from({ length: pairs * 2 }, (_, i) => i % pairs);
  for (let i = syms.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [syms[i], syms[j]] = [syms[j], syms[i]];
  }
  return syms.map((sym) => ({ sym, state: 'down' }));
}

export type FlipResult = 'ignored' | 'first' | 'match' | 'mismatch';

/** Kart eşleştirme tahtası: en fazla iki kart açık olabilir. */
export class MemoryBoard {
  cards: Card[];
  attempts = 0;
  matches = 0;
  private open: number[] = [];

  constructor(cards: Card[]) {
    this.cards = cards;
  }

  /** Eşleşmeyen iki kart açıkken yeni çevirme engellenir; önce `hideMismatch` çağrılmalı. */
  get waiting(): boolean {
    return this.open.length === 2;
  }

  get done(): boolean {
    return this.cards.every((c) => c.state === 'matched');
  }

  flip(i: number): FlipResult {
    const c = this.cards[i];
    if (!c || c.state !== 'down' || this.waiting) return 'ignored';
    c.state = 'up';
    this.open.push(i);
    if (this.open.length === 1) return 'first';
    this.attempts++;
    const [a, b] = this.open;
    if (this.cards[a].sym === this.cards[b].sym) {
      this.cards[a].state = this.cards[b].state = 'matched';
      this.open = [];
      this.matches++;
      return 'match';
    }
    return 'mismatch';
  }

  hideMismatch(): void {
    for (const i of this.open) this.cards[i].state = 'down';
    this.open = [];
  }
}
