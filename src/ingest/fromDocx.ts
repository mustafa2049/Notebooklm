import type JSZipType from 'jszip';
import { decodeEntities } from './html2text';
import { normalizeText } from './normalize';
import type { ExtractedChapter, ExtractedDocument } from './types';

/**
 * Word (.docx) dosyasından metin çıkarır.
 *
 * .docx, içinde `word/document.xml` olan bir ZIP arşividir; EPUB gibi jszip
 * ile açılıyor (saf JavaScript: web'de ve telefonda aynı kod). XML regex ile
 * okunuyor — React Native'de DOMParser yok, Word'ün ürettiği XML de düzenli.
 *
 * - Paragraflar korunur; satır sonu (`w:br`) satır, sekme boşluk olur.
 * - Tablolar satır satır: hücreler " · " ile birleşir.
 * - **Başlık stilleri bölüm olur** (EPUB'daki gibi): en üst düzeydeki
 *   başlıklar bölüm başı sayılır. Stil adları `styles.xml`'den okunuyor;
 *   Türkçe Word'de stil kimliği "Balk1" gibi olsa da adı hep "heading 1".
 */

interface Block {
  text: string;
  /** Başlıksa düzeyi (1 en üst), belgenin adıysa (Title stili) -1, değilse 0 */
  heading: number;
}

/** "Title" stili: belgenin adı, bölüm başı değil */
const TITLE = -1;

export async function extractDocx(data: Uint8Array): Promise<ExtractedDocument> {
  const { default: JSZip } = await import('jszip');
  let zip: JSZipType;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error('Word dosyası açılamadı. Eski .doc biçimi desteklenmiyor; Word’de .docx olarak kaydedebilirsin.');
  }
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) throw new Error('Word dosyası bozuk görünüyor: belge içeriği bulunamadı.');

  const headingStyles = parseHeadingStyles((await zip.file('word/styles.xml')?.async('string')) ?? '');
  const blocks = parseBody(documentXml, headingStyles);
  if (!blocks.some((block) => block.text.trim())) throw new Error('Word dosyasında okunabilir metin bulunamadı.');

  const core = (await zip.file('docProps/core.xml')?.async('string')) ?? '';
  const coreTitle = /<dc:title>([^<]*)<\/dc:title>/.exec(core)?.[1];
  const title =
    (coreTitle && decodeEntities(coreTitle).trim()) ||
    blocks.find((block) => block.heading === TITLE && block.text.trim())?.text.trim() ||
    blocks.find((block) => block.heading > 0 && block.text.trim())?.text.trim() ||
    undefined;

  const chapters = splitChapters(blocks);
  return {
    title: title?.slice(0, 120),
    text: normalizeText(blocks.map((block) => block.text).join('\n\n')),
    chapters,
  };
}

/** styles.xml: hangi stil kimliği hangi başlık düzeyi ("Title" → -1, belgenin adı) */
export function parseHeadingStyles(stylesXml: string): Map<string, number> {
  const levels = new Map<string, number>();
  for (const match of stylesXml.matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g)) {
    const id = /w:styleId="([^"]+)"/.exec(match[1])?.[1];
    const name = /<w:name w:val="([^"]+)"/.exec(match[2])?.[1]?.toLowerCase();
    if (!id || !name) continue;
    const heading = /^heading ([1-9])$/.exec(name);
    if (heading) levels.set(id, Number(heading[1]));
    else if (name === 'title') levels.set(id, TITLE);
  }
  return levels;
}

/** Gövdeyi sırayla paragraf ve tablo bloklarına ayırır */
export function parseBody(documentXml: string, headingStyles: Map<string, number>): Block[] {
  const body = /<w:body>([\s\S]*)<\/w:body>/.exec(documentXml)?.[1] ?? documentXml;
  const blocks: Block[] = [];
  for (const match of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
    const xml = match[0];
    if (xml.startsWith('<w:tbl>')) {
      for (const row of xml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)) {
        const cells = [...row[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)]
          .map((cell) =>
            [...cell[1].matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map((p) => runText(p[1])).join(' ').trim()
          )
          .filter(Boolean);
        if (cells.length) blocks.push({ text: cells.join(' · '), heading: 0 });
      }
      continue;
    }
    const text = runText(xml);
    if (!text.trim()) continue;
    blocks.push({ text, heading: headingLevel(xml, headingStyles) });
  }
  return blocks;
}

function headingLevel(paragraphXml: string, headingStyles: Map<string, number>): number {
  const style = /<w:pStyle w:val="([^"]+)"/.exec(paragraphXml)?.[1];
  if (style) {
    const level = headingStyles.get(style) ?? /^(?:Heading|Balk|Başlık)\s?([1-9])$/i.exec(style)?.[1];
    if (level) return Number(level);
    if (/^Title$|^KonuBal/i.test(style)) return TITLE;
  }
  const outline = /<w:outlineLvl w:val="(\d)"/.exec(paragraphXml)?.[1];
  return outline !== undefined && Number(outline) < 9 ? Number(outline) + 1 : 0;
}

/** Paragrafın görünen metni: metin parçaları, sekme, satır sonu */
function runText(paragraphXml: string): string {
  // Paragraf özellikleri (sekme durakları vb.) metin değil
  const xml = paragraphXml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/g, '');
  let out = '';
  for (const match of xml.matchAll(
    /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(tab|br|cr|noBreakHyphen)\b[^>]*\/>|<w:delText\b[^>]*>[^<]*<\/w:delText>/g
  )) {
    if (match[1] !== undefined) out += decodeEntities(match[1]);
    else if (match[2] === 'tab') out += ' ';
    else if (match[2] === 'br' || match[2] === 'cr') out += '\n';
    else if (match[2] === 'noBreakHyphen') out += '-';
    // w:delText: izlenen değişiklikte silinmiş metin — okunmaz
  }
  return out;
}

/**
 * En üst düzeydeki başlıklardan bölümler. İki başlıktan azsa bölüm yok (tek
 * bölümlük kitap içindekiler tablosu gerektirmez). İlk başlıktan önceki metin
 * "Başlangıç" bölümü olur; orada yalnızca belgenin adı varsa ilk bölüme katılır.
 */
export function splitChapters(blocks: Block[]): ExtractedChapter[] | undefined {
  const levels = blocks.filter((block) => block.heading > 0).map((block) => block.heading);
  if (levels.length < 2) return undefined;
  const top = Math.min(...levels);
  if (blocks.filter((block) => block.heading === top).length < 2) return undefined;

  const chapters: ExtractedChapter[] = [];
  let current: { title: string; parts: string[]; onlyTitle: boolean } | null = null;
  for (const block of blocks) {
    if (block.heading === top) {
      const carried: string[] | null = current && current.onlyTitle && chapters.length === 0 ? current.parts : null;
      if (current && !carried) chapters.push({ title: current.title, text: current.parts.join('\n\n') });
      current = {
        title: block.text.replace(/\s+/g, ' ').trim().slice(0, 80),
        parts: [...(carried ?? []), block.text],
        onlyTitle: false,
      };
      continue;
    }
    current ??= { title: 'Başlangıç', parts: [], onlyTitle: true };
    current.parts.push(block.text);
    if (block.heading !== TITLE) current.onlyTitle = false;
  }
  if (current) chapters.push({ title: current.title, text: current.parts.join('\n\n') });
  return chapters;
}
