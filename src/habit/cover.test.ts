import { describe, expect, it } from 'vitest';
import {
  COVER_PALETTES,
  epubCoverHref,
  generatedCover,
  hashString,
  imageMediaType,
  openLibraryCovers,
  openLibrarySearchUrl,
} from './cover';

describe('generatedCover', () => {
  it('aynı başlık her zaman aynı renk', () => {
    expect(generatedCover('Kürk Mantolu Madonna').palette).toBe(generatedCover('kürk  mantolu madonna').palette);
    expect(COVER_PALETTES).toContain(generatedCover('Sefiller').palette);
  });

  it('farklı başlıklar farklı renklere dağılır', () => {
    const titles = ['Sefiller', 'Suç ve Ceza', 'Çalıkuşu', 'Tutunamayanlar', 'Saatleri Ayarlama Enstitüsü', 'İnce Memed', 'Aylak Adam', 'Yaban', 'Sinekli Bakkal', 'Kuyucaklı Yusuf'];
    expect(new Set(titles.map((title) => generatedCover(title).palette)).size).toBeGreaterThanOrEqual(4);
  });

  it('başlık satırlara bölünür, uzun başlık küçülür', () => {
    expect(generatedCover('Saatleri Ayarlama Enstitüsü').lines).toEqual(['Saatleri', 'Ayarlama', 'Enstitüsü']);
    const long = generatedCover('Bir başlık ki bitmek bilmiyor ve dört satıra da sığmıyor gerçekten çok uzun');
    expect(long.lines.length).toBe(4);
    expect(long.lines[3].endsWith('…')).toBe(true);
    expect(long.scale).toBeLessThan(1);
    expect(generatedCover('  ').lines).toEqual(['Adsız']);
  });

  it('özet kararlı', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('Open Library', () => {
  it('kapak adresleri, tekrarsız ve sınırlı', () => {
    const body = { docs: [{ cover_i: 12 }, { title: 'kapaksız' }, { cover_i: 12 }, { cover_i: 34 }, { cover_i: 'x' }] };
    expect(openLibraryCovers(body)).toEqual([
      'https://covers.openlibrary.org/b/id/12-M.jpg',
      'https://covers.openlibrary.org/b/id/34-M.jpg',
    ]);
    expect(openLibraryCovers(body, 1)).toHaveLength(1);
    expect(openLibraryCovers(null)).toEqual([]);
  });

  it('arama adresi başlığı temizler', () => {
    expect(openLibrarySearchUrl('Sefiller (1. cilt).epub')).toBe(
      'https://openlibrary.org/search.json?title=Sefiller&fields=cover_i,title&limit=10'
    );
  });
});

describe('epubCoverHref', () => {
  it('EPUB 3 cover-image', () => {
    const opf = `<manifest><item id="c" href="images/kapak.jpg" media-type="image/jpeg" properties="cover-image"/></manifest>`;
    expect(epubCoverHref(opf)).toBe('images/kapak.jpg');
  });

  it('EPUB 2 meta name=cover', () => {
    const opf = `<metadata><meta name="cover" content="cov"/></metadata>
      <manifest><item id="x" href="a.xhtml" media-type="application/xhtml+xml"/><item href="img/c.png" id="cov" media-type="image/png"/></manifest>`;
    expect(epubCoverHref(opf)).toBe('img/c.png');
  });

  it('adında cover geçen görsel; hiçbiri yoksa null', () => {
    expect(epubCoverHref(`<item id="i" href="cover.jpeg" media-type="image/jpeg"/>`)).toBe('cover.jpeg');
    expect(epubCoverHref(`<item id="i" href="a.xhtml" media-type="application/xhtml+xml"/>`)).toBeNull();
  });

  it('görsel türü', () => {
    expect(imageMediaType('a/B.PNG')).toBe('image/png');
    expect(imageMediaType('a.jpg')).toBe('image/jpeg');
  });
});
