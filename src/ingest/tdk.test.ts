import { beforeEach, describe, expect, it, vi } from 'vitest';

// Ağsız: react-native ve depolama taklit
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => void store.set(key, value),
  },
}));

const { DictOfflineError, entryNote, lookupWord, parseTdk } = await import('./tdk');

/** sozluk.gov.tr/gts?ara=kalem yanıtından kısaltılmış gerçek örnek */
const KALEM = [
  {
    madde: 'kalem',
    lisan: 'Arapça ḳalem',
    anlamlarListe: [
      {
        anlam: 'Yazma, çizme vb. işlerde kullanılan çeşitli biçimlerde araç',
        ozelliklerListe: [{ tam_adi: 'isim' }],
        orneklerListe: [{ ornek: 'Kâğıt, kalem, mürekkep, hepsi masanın üstündedir.' }],
      },
      { anlam: 'Resmî kuruluşlarda yazı işlerinin görüldüğü yer', ozelliklerListe: [], orneklerListe: [{ ornek: 'Kalemindeki odacıya aylığını kırdırırmış.' }] },
      { anlam: 'Yontma işlerinde kullanılan ucu sivri veya keskin araç', ozelliklerListe: [], orneklerListe: [{ ornek: 'Taşçı kalemi.' }] },
      { anlam: 'Bir listede, bir hesapta sıra ile yazılmış maddelerden her biri', ozelliklerListe: [], orneklerListe: [{ ornek: 'Beş kalem ilaç.' }] },
    ],
  },
];
const NOT_FOUND = { error: 'Sonuç bulunamadı' };

describe('parseTdk', () => {
  it('madde, köken, ilk 3 anlam, tür ve örnek', () => {
    const [entry] = parseTdk(KALEM);
    expect(entry.word).toBe('kalem');
    expect(entry.origin).toBe('Arapça ḳalem');
    expect(entry.meanings).toHaveLength(3);
    expect(entry.meanings[0]).toEqual({
      text: 'Yazma, çizme vb. işlerde kullanılan çeşitli biçimlerde araç',
      tags: ['isim'],
      example: 'Kâğıt, kalem, mürekkep, hepsi masanın üstündedir.',
    });
  });

  it('bulunamadı ya da bozuk yanıt → boş', () => {
    expect(parseTdk(NOT_FOUND)).toEqual([]);
    expect(parseTdk(null)).toEqual([]);
    expect(parseTdk([{ madde: 'x', anlamlarListe: null }])).toEqual([]);
  });

  it('deftere not biçimi', () => {
    expect(entryNote(parseTdk(KALEM)[0]).split('\n').slice(0, 2)).toEqual([
      'TDK — kalem',
      '1. (isim) Yazma, çizme vb. işlerde kullanılan çeşitli biçimlerde araç',
    ]);
  });
});

describe('lookupWord', () => {
  const asked: string[] = [];
  beforeEach(() => {
    store.clear();
    asked.length = 0;
  });
  const serve = (known: Record<string, unknown>) =>
    vi.stubGlobal('fetch', async (url: string) => {
      const word = decodeURIComponent(url.split('ara=')[1]);
      asked.push(word);
      return { ok: true, json: async () => known[word] ?? NOT_FOUND } as Response;
    });

  it('çekimli kelimede kök bulunur, en az soyulmuşu seçilir', async () => {
    serve({ kalem: KALEM, kale: [{ madde: 'kale', anlamlarListe: [{ anlam: 'Hisar' }] }] });
    const result = await lookupWord('Kalemlerle');
    expect(result?.query).toBe('kalemlerle');
    expect(result?.entries[0].word).toBe('kalem');
    expect(result?.alternatives).toContain('kale');
  });

  it('bulunan madde önbellekten gelir, yeniden sorulmaz', async () => {
    serve({ kalem: KALEM });
    await lookupWord('kalem');
    await lookupWord('kalem');
    expect(asked.filter((word) => word === 'kalem')).toHaveLength(1);
  });

  it('hiçbiri yoksa null', async () => {
    serve({});
    expect(await lookupWord('zxqwlar')).toBeNull();
  });

  it('ağ yoksa çevrimdışı hatası', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(lookupWord('masalar')).rejects.toBeInstanceOf(DictOfflineError);
  });
});
