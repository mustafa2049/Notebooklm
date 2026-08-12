import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlTitle, htmlToText } from './html2text';

describe('htmlToText', () => {
  it('paragrafları alır, menü ve betikleri atar', () => {
    const html = `
      <html><head><style>p{color:red}</style><script>var x=1</script></head>
      <body>
        <nav><a href="/">Ana sayfa</a><a href="/hakkinda">Hakkında</a></nav>
        <article>
          <h1>Hızlı Okuma</h1>
          <p>${'Birinci paragraf yeterince uzun olmalı ki içerik sezgisi devreye girsin. '.repeat(4)}</p>
          <p>${'İkinci paragraf da benzer şekilde uzun tutuluyor burada. '.repeat(4)}</p>
        </article>
        <footer>Telif hakkı 2026</footer>
      </body></html>`;

    const text = htmlToText(html);
    expect(text).toContain('Birinci paragraf');
    expect(text).toContain('İkinci paragraf');
    expect(text).not.toContain('Ana sayfa');
    expect(text).not.toContain('Telif hakkı');
    expect(text).not.toContain('var x=1');
    expect(text).not.toContain('color:red');
  });

  it('paragraf yoksa gövdenin tamamına düşer', () => {
    const html = '<body><div>Kısa bir içerik burada duruyor.</div></body>';
    expect(htmlToText(html)).toBe('Kısa bir içerik burada duruyor.');
  });

  it('dipnot ve düzenleme işaretlerini temizler', () => {
    const html = '<body><div>İstanbul kalabalıktır.[4] Nüfusu artıyor.[12] [değiştir]</div></body>';
    const text = htmlToText(html);
    expect(text).toBe('İstanbul kalabalıktır. Nüfusu artıyor.');
  });

  it('sıradan köşeli parantez kullanımını korur', () => {
    const html = '<body><div>Yazar [Ahmet] ve dizi [a, b] burada kalmalı.</div></body>';
    expect(htmlToText(html)).toContain('[Ahmet]');
  });

  it('blok etiketleri satır sonuna çevirir', () => {
    const html = '<body><div>Birinci</div><div>İkinci</div></body>';
    expect(htmlToText(html)).toBe('Birinci\n\nİkinci');
  });
});

describe('decodeEntities', () => {
  it('adlandırılmış, ondalık ve onaltılık varlıkları çözer', () => {
    expect(decodeEntities('&amp;&lt;&gt;&nbsp;son')).toBe('&<> son');
    expect(decodeEntities('&#304;stanbul')).toBe('İstanbul');
    expect(decodeEntities('&#x15F;eker')).toBe('şeker');
    expect(decodeEntities('&ccedil;ay')).toBe('çay');
  });

  it('bilinmeyen varlığı olduğu gibi bırakır', () => {
    expect(decodeEntities('&bilinmeyen;')).toBe('&bilinmeyen;');
  });
});

describe('htmlTitle', () => {
  it('h1 varsa onu, yoksa title etiketini kullanır', () => {
    expect(htmlTitle('<h1>Başlık &amp; Alt</h1>')).toBe('Başlık & Alt');
    expect(htmlTitle('<head><title>Sayfa Başlığı</title></head>')).toBe('Sayfa Başlığı');
    expect(htmlTitle('<body>başlık yok</body>')).toBeUndefined();
  });
});
