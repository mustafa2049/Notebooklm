import { exportFileName, notesMarkdown, vocabCsv } from '@/habit/exportNotes';
import { shareFile } from '@/ui/shareFile';
import { listHighlights } from './highlights';
import { listRecalls } from './recalls';
import { listVocab } from './vocab';

/**
 * Notları dosya olarak verir (bkz. `habit/exportNotes`): `notlar` alıntılar,
 * özetler ve kelime defteri (Markdown); `anki` kelime defteri (CSV).
 */
export async function exportNotes(kind: 'notlar' | 'anki'): Promise<{ fileName: string; bytes: number }> {
  const now = Date.now();
  if (kind === 'anki') {
    return shareFile({
      fileName: exportFileName('anki', now),
      content: vocabCsv(await listVocab()),
      mimeType: 'text/csv',
      dialogTitle: 'Kelimeleri Anki için kaydet',
    });
  }
  const [highlights, recalls, vocab] = await Promise.all([listHighlights(), listRecalls(), listVocab()]);
  return shareFile({
    fileName: exportFileName('notlar', now),
    content: notesMarkdown({ highlights, recalls, vocab, now }),
    mimeType: 'text/markdown',
    dialogTitle: 'Notları kaydet',
  });
}
