import { describe, expect, it } from 'vitest';
import { csvField, exportFileName, notesMarkdown, vocabCsv } from './exportNotes';

const NOW = Date.UTC(2026, 9, 21, 12);
const day = 24 * 60 * 60 * 1000;

describe('notesMarkdown', () => {
  const markdown = notesMarkdown({
    now: NOW,
    highlights: [
      { docId: 'b', docTitle: 'Kaşağı', charOffset: 900, sentence: 'İkinci alıntı', createdAt: NOW - day },
      { docId: 'b', docTitle: 'Kaşağı', charOffset: 100, sentence: 'İlk alıntı\nikinci satır', note: 'Önemli', createdAt: NOW - day },
      { docId: 'a', docTitle: 'Arıların Dansı', charOffset: 5, sentence: 'Arılar dans eder.', createdAt: NOW - 3 * day },
    ],
    recalls: [
      {
        docId: 'b',
        docTitle: 'Kaşağı',
        at: NOW - day,
        text: 'Çocuk yalan söyledi.',
        feedback: { feedback: 'Ana fikri yakaladın.', missed: ['ölüm'] },
      },
    ],
    vocab: [
      { word: 'kovana', lemma: 'kovan', note: 'Vikisözlük — kovan\n1. (isim) Arıların barınağı\n2. (isim) Fişek yuvası', sentence: 'Arı kovana döner.' },
      { word: 'dans', sentence: 'Dans ederler.' },
    ],
  });

  it('başlık, tarih ve sayılar', () => {
    expect(markdown.startsWith('# Hızlı Okuma — notlarım\n\n21 Ekim 2026 · 3 alıntı · 1 özet · 2 kelime\n')).toBe(true);
  });

  it('kitaplar eski olandan; alıntılar metindeki sırayla, çok satırlı alıntı blokta', () => {
    expect(markdown.indexOf('## Arıların Dansı')).toBeLessThan(markdown.indexOf('## Kaşağı'));
    expect(markdown).toContain('> İlk alıntı\n> ikinci satır\n>\n> — Notum: Önemli');
    expect(markdown.indexOf('İlk alıntı')).toBeLessThan(markdown.indexOf('İkinci alıntı'));
    expect(markdown).toContain('**Kendi cümlelerimle** (20 Ekim 2026): Çocuk yalan söyledi.');
    expect(markdown).toContain('Gözden kaçanlar: ölüm');
  });

  it('kelime defteri: kök, anlamlar (sözlük başlığı olmadan), cümle', () => {
    expect(markdown).toContain(
      '- **dans**\n  > Dans ederler.\n- **kovana** (kovan) — 1. (isim) Arıların barınağı\n  2. (isim) Fişek yuvası\n  > Arı kovana döner.'
    );
    expect(markdown).not.toContain('Vikisözlük —');
  });
});

describe('vocabCsv', () => {
  it("Anki başlıkları ve tırnaklı alanlar", () => {
    const csv = vocabCsv([
      { word: 'kovana', lemma: 'kovan', note: 'TDK — kovan\n1. (isim) Arıların "evi", barınak', sentence: 'Arı, kovana döner.', docTitle: 'Arılar' },
    ]);
    expect(csv).toBe(
      '#separator:Comma\n#html:false\n#columns:Kelime,Anlam,Cümle,Kitap\n' +
        '"kovana (kovan)","1. (isim) Arıların ""evi"", barınak","Arı, kovana döner.","Arılar"\n'
    );
  });

  it('alan kaçışı', () => {
    expect(csvField('a"b')).toBe('"a""b"');
    expect(csvField('satır\nsonu')).toBe('"satır\nsonu"');
  });
});

describe('exportFileName', () => {
  it('tür ve gün', () => {
    expect(exportFileName('notlar', NOW)).toBe('hizli-okuma-notlar-2026-10-21.md');
    expect(exportFileName('anki', NOW)).toBe('hizli-okuma-kelimeler-anki-2026-10-21.csv');
  });
});
