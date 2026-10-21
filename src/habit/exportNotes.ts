/**
 * Notları dışa aktarma — saf, testli.
 *
 * - **Markdown**: kitap kitap alıntılar (metindeki sırayla) ve notları,
 *   "Aklında ne kaldı" özetleri; sonda kelime defteri. Not uygulamasına,
 *   e-postaya ya da belgeye yapıştırılabilir.
 * - **Anki CSV**: kelime defteri, kart başına kelime → anlam + cümle. Başlık
 *   satırları (`#separator`, `#columns`) Anki'nin içe aktarma ayarlarını
 *   kendiliğinden doldurur; her alan tırnaklı (virgül, tırnak, satır sonu
 *   bozmasın).
 */

export interface ExportHighlight {
  docId: string;
  docTitle: string;
  charOffset: number;
  sentence: string;
  note?: string;
  createdAt: number;
}

export interface ExportRecall {
  docId: string;
  docTitle: string;
  at: number;
  text: string;
  feedback?: { feedback: string; missed: string[] };
}

export interface ExportVocab {
  word: string;
  lemma?: string;
  note?: string;
  sentence: string;
  docTitle?: string;
}

const dateOf = (ms: number) =>
  new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Satırları alıntı bloğuna çevirir (çok satırlı metin de blokta kalsın) */
function quote(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line}`.trimEnd())
    .join('\n');
}

/** Sözlük notunun başlık satırı ("TDK — kalem") Markdown'da tekrar olur; anlamlar kalır */
function meaningLines(note: string): string[] {
  return note
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(TDK|Vikisözlük) — /.test(line));
}

export function notesMarkdown({
  highlights,
  recalls,
  vocab,
  now,
}: {
  highlights: ExportHighlight[];
  recalls: ExportRecall[];
  vocab: ExportVocab[];
  now: number;
}): string {
  const out: string[] = ['# Hızlı Okuma — notlarım', ''];
  const counts = [
    `${highlights.length} alıntı`,
    recalls.length ? `${recalls.length} özet` : '',
    vocab.length ? `${vocab.length} kelime` : '',
  ].filter(Boolean);
  out.push(`${dateOf(now)} · ${counts.join(' · ')}`, '');

  // Kitap kitap: önce ilk alıntısı/özeti en eski olan kitap
  const books = new Map<string, { title: string; first: number; items: ExportHighlight[]; recalls: ExportRecall[] }>();
  const book = (docId: string, title: string, at: number) => {
    const entry = books.get(docId) ?? { title: title || 'Adsız metin', first: at, items: [], recalls: [] };
    entry.first = Math.min(entry.first, at);
    books.set(docId, entry);
    return entry;
  };
  for (const item of highlights) book(item.docId, item.docTitle, item.createdAt).items.push(item);
  for (const recall of recalls) book(recall.docId, recall.docTitle, recall.at).recalls.push(recall);

  for (const entry of [...books.values()].sort((a, b) => a.first - b.first)) {
    out.push(`## ${entry.title}`, '');
    for (const item of [...entry.items].sort((a, b) => a.charOffset - b.charOffset)) {
      out.push(quote(item.sentence));
      if (item.note?.trim()) out.push('>', quote(`— Notum: ${item.note.trim()}`));
      out.push('');
    }
    for (const recall of [...entry.recalls].sort((a, b) => a.at - b.at)) {
      out.push(`**Kendi cümlelerimle** (${dateOf(recall.at)}): ${recall.text.trim()}`);
      if (recall.feedback?.feedback) out.push('', `Geri bildirim: ${recall.feedback.feedback}`);
      if (recall.feedback?.missed.length) out.push('', `Gözden kaçanlar: ${recall.feedback.missed.join(' · ')}`);
      out.push('');
    }
  }

  if (vocab.length) {
    out.push('## Kelime defteri', '');
    const sorted = [...vocab].sort((a, b) => a.word.localeCompare(b.word, 'tr'));
    for (const entry of sorted) {
      const lemma = entry.lemma && entry.lemma !== entry.word ? ` (${entry.lemma})` : '';
      const meanings = entry.note ? meaningLines(entry.note) : [];
      out.push(`- **${entry.word}**${lemma}${meanings.length ? ` — ${meanings[0]}` : ''}`);
      for (const extra of meanings.slice(1)) out.push(`  ${extra}`);
      if (entry.sentence.trim()) out.push(`  > ${entry.sentence.trim().replace(/\s*\n\s*/g, ' ')}`);
    }
    out.push('');
  }
  return `${out.join('\n').trimEnd()}\n`;
}

/** CSV alanı: her zaman tırnaklı, içteki tırnak ikilenir */
export function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function vocabCsv(vocab: ExportVocab[]): string {
  const rows = [...vocab]
    .sort((a, b) => a.word.localeCompare(b.word, 'tr'))
    .map((entry) => {
      const meaning = entry.note ? meaningLines(entry.note).join('; ') : '';
      return [entry.lemma && entry.lemma !== entry.word ? `${entry.word} (${entry.lemma})` : entry.word, meaning, entry.sentence.trim(), entry.docTitle ?? '']
        .map(csvField)
        .join(',');
    });
  return ['#separator:Comma', '#html:false', '#columns:Kelime,Anlam,Cümle,Kitap', ...rows].join('\n') + '\n';
}

/** Dosya adı: tür ve gün ("hizli-okuma-notlar-2026-10-21.md") */
export function exportFileName(kind: 'notlar' | 'anki', now: number): string {
  const day = new Date(now).toISOString().slice(0, 10);
  return kind === 'notlar' ? `hizli-okuma-notlar-${day}.md` : `hizli-okuma-kelimeler-anki-${day}.csv`;
}
