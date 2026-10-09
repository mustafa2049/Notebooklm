export type SpokenDirection = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
export type SpokenCommand = SpokenDirection | 'skip';

/** Küçük harfe çevirir, Türkçe karakterleri sadeleştirir (sağ → sag, aşağı → asagi). */
export function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ');
}

const WORDS: [RegExp, SpokenCommand][] = [
  [/^(sag|saga|sagda|sagdan|sagi|saa)$/, 'ArrowRight'],
  [/^(sol|sola|solda|soldan|solu)$/, 'ArrowLeft'],
  [/^(yukari|yukariya|yukarida|yukarda|yukardan|ust|uste|ustte|yukar)$/, 'ArrowUp'],
  [/^(asagi|asagiya|asagida|asagda|asa|alt|alta|altta|asag)$/, 'ArrowDown'],
  [/^(goremiyorum|goremedim|gormuyorum|bilmiyorum|bilemedim|gec|pas|yok)$/, 'skip'],
];

const commandOf = (w: string): SpokenCommand | null => {
  for (const [re, cmd] of WORDS) if (re.test(w)) return cmd;
  return null;
};

/** Metindeki tüm komutlar, sırasıyla (sürekli dinlemede yeni söylenenleri ayırmak için). */
export function parseCommands(text: string): SpokenCommand[] {
  return normalizeTr(text)
    .split(/\s+/)
    .map(commandOf)
    .filter((c): c is SpokenCommand => c !== null);
}

/** Konuşma metnindeki son yön ya da "göremiyorum" komutu (yoksa null). */
export function parseDirection(text: string): SpokenCommand | null {
  const all = parseCommands(text);
  return all.length ? all[all.length - 1] : null;
}
