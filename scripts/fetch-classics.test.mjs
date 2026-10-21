import { describe, expect, it } from 'vitest';
import { classicPages, renderMap, slimHtml, slugOf } from './fetch-classics.mjs';

describe('fetch-classics', () => {
  it('classics.ts biçimindeki bağlantıları okur', () => {
    const source = "url: `${BASE}Kaşağı`,\n  x\n    url: `${BASE}Pembe_İncili_Kaftan`,";
    expect(classicPages(source)).toEqual(['Kaşağı', 'Pembe_İncili_Kaftan']);
  });

  it('dosya adı ASCII', () => {
    expect(slugOf('Kaşağı')).toBe('kasagi');
    expect(slugOf('Pembe_İncili_Kaftan')).toBe('pembe-incili-kaftan');
    expect(slugOf('Başını_Vermeyen_Şehit')).toBe('basini-vermeyen-sehit');
    expect(slugOf('Kerâmet')).toBe('keramet');
    expect(slugOf('İstiklâl_Marşı')).toBe('istiklal-marsi');
  });

  it('yorumlar ve yedek kimlikler atılır, metin kalır', () => {
    const html = '<h2><span id="x" typeof="mw:FallbackId"></span>Başlık</h2>\n\n\n\n<p>Metin</p><!-- rapor -->';
    expect(slimHtml(html)).toBe('<h2>Başlık</h2>\n\n<p>Metin</p>');
  });

  it('Vikikaynak çerçevesi atılır: başlık kutusu, gizli künye, dipnotlar, telif kutusu', () => {
    const html = [
      '<div class="headerContainer"><div class="navigationHeader"><div>Kaşağı</div><div>Ömer Seyfettin</div></div></div>',
      '<div id="ws-data" class="ws-noexport" style="display:none"><span>4340Kaşağı</span></div>',
      '<p>Ahırın avlusunda oynardık.<sup class="mw-ref reference"><a>[1]</a></sup> Sonra</p>',
      '<p>— Ben de yapacağım!</p>',
      '<div class="mw-heading mw-heading2"><h2 id="Kaynakça">Kaynakça</h2></div>',
      '<div class="reflist"><ol class="mw-references references"><li>↑ toplam</li></ol></div>',
      '<div class="notheme" data-mw=\'{"href":"./Şablon:Eser_son"}\'><p>Telif durumu:</p><div class="licenseContainer"><div>Kamu malı</div></div></div>',
    ].join('\n');
    expect(slimHtml(html)).toBe('<p>Ahırın avlusunda oynardık. Sonra</p>\n<p>— Ben de yapacağım!</p>');
  });

  it('iç içe aynı etiketli öğe bütünüyle silinir; tekrar uygulamak değiştirmez', () => {
    const html = '<p>önce</p><div class="headerContainer"><div><div>x</div></div><img src="a"/></div><p>sonra</p>';
    const once = slimHtml(html);
    expect(once).toBe('<p>önce</p><p>sonra</p>');
    expect(slimHtml(once)).toBe(once);
  });

  it('harita statik require satırları üretir', () => {
    const map = renderMap([{ page: 'Kaşağı', file: 'kasagi.txt' }]);
    expect(map).toContain("[`${BASE}Kaşağı`]: require('../../assets/classics/kasagi.txt'),");
    expect(map).toContain('export const CLASSIC_ASSETS: Record<string, number>');
  });
});
