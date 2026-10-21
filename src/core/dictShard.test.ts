import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lookupIn, parseShard, shardOf } from './dictShard';

const SHARD = [
  'kitap\tisim\tBasılı yapraklar\u001f[din] Kutsal kitap',
  'kovan\tisim\t[silahlar] fişeğin yuvası\u001f[arıcılık] arıların barınağı',
  'kalem\tisim\tYazı aracı',
  'kale\tisim\tSur',
  'gelmek\tfiil\tUlaşmak, varmak',
  'yüz\tisim\tSurat',
  'yüz\tsayı\tDoksan dokuzdan sonra gelen sayı',
].join('\n');

describe('parseShard', () => {
  it('tür ilk etiket; köşeli parantezdeki etiketler sonra', () => {
    const words = parseShard(SHARD);
    expect(words.get('kitap')?.[0].meanings).toEqual([
      { text: 'Basılı yapraklar', tags: ['isim'] },
      { text: 'Kutsal kitap', tags: ['isim', 'din'] },
    ]);
    // aynı yazılışlı iki madde ayrı girdi
    expect(words.get('yüz')?.map((entry) => entry.meanings[0].tags[0])).toEqual(['isim', 'sayı']);
  });
});

describe('lookupIn', () => {
  const words = parseShard(SHARD);
  const load = async (id: string) => (id === 'k' || id === 'g' || id === 'y' ? words : null);

  it('kelimenin kendisi, çekimliyse kökü; kaynak Vikisözlük', async () => {
    expect((await lookupIn(load, 'Kitap'))?.entries[0].word).toBe('kitap');
    const result = await lookupIn(load, 'kitaplarımızdan');
    expect(result?.entries[0].word).toBe('kitap');
    expect(result?.query).toBe('kitaplarımızdan');
    expect(result?.source).toBe('wiktionary');
    expect((await lookupIn(load, 'geliyorum'))?.entries[0].word).toBe('gelmek');
  });

  it('en az soyulmuş kök seçilir, öbürleri seçenek', async () => {
    const result = await lookupIn(load, 'kalemler');
    expect(result?.entries[0].word).toBe('kalem');
    expect(result?.alternatives).toContain('kale');
  });

  it('bulunamazsa null', async () => {
    expect(await lookupIn(load, 'zzz')).toBeNull();
    expect(await lookupIn(load, '')).toBeNull();
  });

  it('dilim adı betikteki ile aynı', () => {
    expect(shardOf('çiçek')).toBe('c2');
    expect(shardOf('ılık')).toBe('i2');
    expect(shardOf('1923')).toBe('diger');
  });

  it('gerçek veri: her dilim okunur, bilinen kelimeler bulunur', async () => {
    const dir = path.resolve(import.meta.dirname, '../../assets/dict');
    const real = async (id: string) => {
      const file = path.join(dir, `${id}.txt`);
      return fs.existsSync(file) ? parseShard(fs.readFileSync(file, 'utf8')) : null;
    };
    for (const [word, lemma] of [
      ['kovanın', 'kovan'],
      ['tahayyül', 'tahayyül'],
      ['çiçekler', 'çiçek'],
      ['ılık', 'ılık'],
      ['şehirde', 'şehir'],
    ]) {
      expect((await lookupIn(real, word))?.entries[0].word, word).toBe(lemma);
    }
  });
});
