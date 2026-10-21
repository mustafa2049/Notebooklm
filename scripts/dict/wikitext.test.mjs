import { describe, expect, it } from 'vitest';
import { acceptTitle, formatEntry, inline, parseDefinition, parseSection, shardOf, turkishSection } from './wikitext.mjs';

// Gerçek sayfalardan (tr.wiktionary.org, Ekim 2026), kısaltılmış
const KITAP = `==Türkçe==

===Köken===
{{devralınan|tr|ota|كتاب|ç=kitab}}, o da {{köken|dil=tr|ar}} sözcüğünden.

===Ad===
{{tr-ad}}
[[File:Liji 2.jpg|küçükresim|Kitap (1)]]

# {{t|dil=tr|kitap}} Ciltli veya ciltsiz olarak bir araya getirilmiş, basılı veya yazılı kâğıt yaprakların bütünü.
#* {{eş anlamlılar|tr|betik }}
#*    "Ama ben, bir kitap üzerine bir fikir edinmek istedim mi o kitabı kendim okurum." - Nurullah Ataç
# {{t|dil=tr|edebiyat}} Herhangi bir konuda yazılmış eser:
# {{t|dil=tr|din}} Kutsal kitap

====Çekimleme====
{{tr-ad-tablo}}

==Kumanca==

===Ad===
# kitap (Kumanca)`;

const KOVAN = `==Türkçe==

===Ad===
{{tr-ad}}
# {{t|dil=tr|silahlar}} [[fişek|fişeğin]] [[kapsül]], barut ve kurşun taşıyan yuva bölümü, [[kapçık]]
# {{t|arıcılık|dil=tr}} [[arı|arılara]] [[barınak]] [[olmak|olarak]] [[yapılmak|yapılan]], [[türlü]] [[biçim]]deki [[tahta]], [[sepet]] veya [[sandık]]

===Kaynakça===
* {{kaynak-TDK}}`;

const GELMEK = `==Türkçe==

===Eylem===
{{tr-eylem}}.
# Ulaşmak, varmak
#* {{kt|dil=tr|başlık=Huzur|yazar=Ahmet Hamdi TANPINAR|tanıklık=İstanbul'a '''gelmiş'''.}}
# Bir yerden getirmek
#Oturmaya, ziyarete gitmek:
#*Dün akşam amcamlar bize '''geldi'''.`;

describe('turkishSection', () => {
  it('yalnızca Türkçe bölümü; sonraki dil bölümünde durur', () => {
    const section = turkishSection(KITAP);
    expect(section).toContain('Ciltli veya ciltsiz');
    expect(section).not.toContain('Kumanca');
    expect(turkishSection('==Almanca==\n# Buch')).toBeNull();
  });
});

describe('parseSection', () => {
  it('kitap: tür, etiketler, örnek ve köken satırları alınmaz', () => {
    const [entry, ...rest] = parseSection(turkishSection(KITAP));
    expect(rest).toHaveLength(0);
    expect(entry.pos).toBe('isim');
    expect(entry.meanings.map((m) => m.text)).toEqual([
      'Ciltli veya ciltsiz olarak bir araya getirilmiş, basılı veya yazılı kâğıt yaprakların bütünü.',
      'Herhangi bir konuda yazılmış eser:',
      'Kutsal kitap',
    ]);
    // "din" gibi kısa etiketler dil kodu sanılıp atılmıyor
    expect(entry.meanings[2].labels).toEqual(['din']);
  });

  it('kovan: bağlantılar metne, alan etiketleri etikete', () => {
    const [entry] = parseSection(turkishSection(KOVAN));
    expect(entry.meanings[0]).toEqual({
      text: 'fişeğin kapsül, barut ve kurşun taşıyan yuva bölümü, kapçık',
      labels: ['silahlar'],
    });
    expect(entry.meanings[1].text).toBe('arılara barınak olarak yapılan, türlü biçimdeki tahta, sepet veya sandık');
    expect(entry.meanings[1].labels).toEqual(['arıcılık']);
  });

  it('gelmek: boşluksuz "#" satırları da tanım, "#*" örnek değil', () => {
    const [entry] = parseSection(turkishSection(GELMEK));
    expect(entry.pos).toBe('fiil');
    expect(entry.meanings.map((m) => m.text)).toEqual(['Ulaşmak, varmak', 'Bir yerden getirmek', 'Oturmaya, ziyarete gitmek:']);
  });

  it('yalnızca çekim gösteren sayfa sözlüğe girmez', () => {
    expect(parseSection('===Ad===\n# {{tr-ünlü-çekimi}}')).toEqual([]);
    expect(parseSection('===Eylem===\n# {{çekim|dil=tr|gelmek||3ç|pres|ind}}')).toEqual([]);
    expect(parseSection('===Ad===\n# {{mastarı|dil=tr|yazmak}}')).toEqual([]);
  });
});

describe('parseDefinition', () => {
  it('yönlendirmeler ve açıklamalar', () => {
    expect(parseDefinition('# {{yanlış yazım|tr|mütevazı}}').text).toBe('doğrusu: mütevazı');
    expect(parseDefinition('# {{mânâ|doğrusu}} [[zaman aşımı]]').text).toBe('doğrusu: zaman aşımı');
    expect(parseDefinition('# {{t|dil=tr|püristik}} {{eş anlamlı|dil=tr|ahlak}}.').text).toBe('eş anlamlısı: ahlak.');
    const zebra = parseDefinition('# {{t|atgiller|dil=tr}} Derisi çizgili hayvan; {{belirtici|Equus zebra}}.');
    expect(zebra).toEqual({ text: 'Derisi çizgili hayvan; (Equus zebra).', labels: ['atgiller'] });
  });

  it('ağız ve mecaz etiketleri, kaynaklar atılır', () => {
    const sako = parseDefinition("# {{t|dil=tr|halk ağzı}} {{ağız|Havza}} [[ceket|Ceket]]. <ref>Derleme Sözlüğü</ref>");
    expect(sako).toEqual({ text: 'Ceket.', labels: ['halk ağzı', 'Havza ağzı'] });
    expect(parseDefinition('# {{mecaz|dil=tr}} [[kabadayı]] [[erkek]]')).toEqual({ text: 'kabadayı erkek', labels: ['mecaz'] });
  });

  it('yalnızca köken ya da boş kalan satır alınmaz', () => {
    expect(parseDefinition('# {{k|dil=tr|fr}} {{ç|fr|béryllium}}')).toBeNull();
    expect(parseDefinition('#')).toBeNull();
  });
});

describe('yardımcılar', () => {
  it('inline: bağlantı, kalın/italik, HTML', () => {
    expect(inline("[[arı|arılara]] '''barınak''' <sup>1</sup> [[Dosya:x.jpg|küçük]]  olarak")).toBe('arılara barınak 1 olarak');
  });

  it('madde başı: tek kelime, küçük harf', () => {
    expect(acceptTitle('kitap')).toBe(true);
    expect(acceptTitle('kâğıt')).toBe(true);
    expect(acceptTitle('Kaplan')).toBe(false);
    expect(acceptTitle('kara kuvvetleri')).toBe(false);
    expect(acceptTitle('-mak')).toBe(false);
  });

  it('satır biçimi: madde başını tekrarlayan etiket yazılmaz', () => {
    const row = formatEntry('kitap', {
      pos: 'isim',
      meanings: [
        { text: 'Basılı yapraklar', labels: ['kitap'] },
        { text: 'Kutsal kitap', labels: ['din'] },
      ],
    });
    expect(row).toBe('kitap\tisim\tBasılı yapraklar\u001f[din] Kutsal kitap');
  });

  it('dilim: ASCII dosya adı', () => {
    expect(shardOf('kitap')).toBe('k');
    expect(shardOf('çiçek')).toBe('c2');
    expect(shardOf('ılık')).toBe('i2');
    expect(shardOf('işte')).toBe('i');
    expect(shardOf('âlem')).toBe('a');
  });
});
