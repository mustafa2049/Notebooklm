import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { extractDocx } from './fromDocx';
import { joinChapters } from './normalize';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

const p = (text: string, style?: string) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

async function docx(body: string, options: { styles?: string; core?: string } = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document ${W}><w:body>${body}<w:sectPr/></w:body></w:document>`);
  if (options.styles) zip.file('word/styles.xml', `<?xml version="1.0"?><w:styles ${W}>${options.styles}</w:styles>`);
  if (options.core) zip.file('docProps/core.xml', options.core);
  return zip.generateAsync({ type: 'uint8array' });
}

// Türkçe Word: stil kimliği "Balk1", adı yine "heading 1"
const STYLES = `
  <w:style w:type="paragraph" w:styleId="Balk1"><w:name w:val="heading 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Balk2"><w:name w:val="heading 2"/></w:style>
  <w:style w:type="paragraph" w:styleId="KonuBal"><w:name w:val="Title"/></w:style>`;

describe('extractDocx', () => {
  it('paragrafları, satır sonlarını ve özel karakterleri koruyor', async () => {
    const data = await docx(
      `${p('Birinci paragraf &amp; devamı.')}<w:p><w:r><w:t>İkinci</w:t><w:br/><w:t>satır</w:t><w:tab/><w:t>sekme</w:t></w:r></w:p>${p('Üçüncü: “tırnak”.')}`
    );
    const result = await extractDocx(data);
    expect(result.text).toBe('Birinci paragraf & devamı.\n\nİkinci\nsatır sekme\n\nÜçüncü: “tırnak”.');
    expect(result.chapters).toBeUndefined();
  });

  it('başlıkları bölüm yapıyor; başlıktan önceki metin "Başlangıç"', async () => {
    const body = [
      p('Önsöz cümlesi.'),
      p('Birinci Bölüm', 'Balk1'),
      p('Bölümün metni.'),
      p('Alt başlık', 'Balk2'),
      p('Alt metin.'),
      p('İkinci Bölüm', 'Balk1'),
      p('Son metin.'),
    ].join('');
    const result = await extractDocx(await docx(body, { styles: STYLES }));
    expect(result.chapters?.map((chapter) => chapter.title)).toEqual(['Başlangıç', 'Birinci Bölüm', 'İkinci Bölüm']);
    expect(result.chapters?.[1].text).toContain('Alt metin.');
    // Bölümler birleşince metin aynı, konumlar doğru
    const joined = joinChapters(result.chapters!);
    expect(joined.text).toBe(result.text);
    expect(joined.text.slice(joined.chapters[2].charOffset).startsWith('İkinci Bölüm')).toBe(true);
  });

  it('belgenin adı (Title) bölüm sayılmıyor, ilk bölüme katılıyor', async () => {
    const body = [p('Kitabın Adı', 'KonuBal'), p('Bir', 'Balk1'), p('a.'), p('İki', 'Balk1'), p('b.')].join('');
    const result = await extractDocx(await docx(body, { styles: STYLES }));
    expect(result.title).toBe('Kitabın Adı');
    expect(result.chapters?.map((chapter) => chapter.title)).toEqual(['Bir', 'İki']);
    expect(result.chapters?.[0].text.startsWith('Kitabın Adı')).toBe(true);
    expect(joinChapters(result.chapters!).text).toBe(result.text);
  });

  it('tek başlık varsa bölüm yok; başlığı kitap adı yapıyor', async () => {
    const result = await extractDocx(await docx(`${p('Kitabın Adı', 'KonuBal')}${p('Metin.')}`, { styles: STYLES }));
    expect(result.chapters).toBeUndefined();
    expect(result.title).toBe('Kitabın Adı');
  });

  it('künyedeki başlığı tercih ediyor', async () => {
    const core = '<cp:coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Künye &amp; Başlık</dc:title></cp:coreProperties>';
    const result = await extractDocx(await docx(p('Metin.'), { core }));
    expect(result.title).toBe('Künye & Başlık');
  });

  it('tabloları satır satır okuyor, silinmiş (izlenen) metni almıyor', async () => {
    const cell = (text: string) => `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
    const table = `<w:tbl><w:tr>${cell('Ad')}${cell('Yıl')}</w:tr><w:tr>${cell('Kaşağı')}${cell('1917')}</w:tr></w:tbl>`;
    const deleted = '<w:p><w:r><w:t>Kalan</w:t></w:r><w:del><w:r><w:delText>silinen</w:delText></w:r></w:del></w:p>';
    const result = await extractDocx(await docx(`${p('Önce.')}${table}${deleted}`));
    expect(result.text).toBe('Önce.\n\nAd · Yıl\n\nKaşağı · 1917\n\nKalan');
  });

  it('bozuk ya da boş dosyada anlaşılır hata', async () => {
    await expect(extractDocx(new Uint8Array([1, 2, 3]))).rejects.toThrow(/\.docx/);
    const empty = new JSZip();
    empty.file('x.txt', 'x');
    await expect(extractDocx(await empty.generateAsync({ type: 'uint8array' }))).rejects.toThrow(/bozuk/);
    await expect(extractDocx(await docx('<w:p/>'))).rejects.toThrow(/okunabilir metin/);
  });
});
