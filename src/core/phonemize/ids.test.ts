import { describe, expect, it } from 'vitest';
import { missingPhonemes, phonemeIds, speechChunks } from './ids';

const MAP = { _: [0], '^': [1], $: [2], ' ': [3], a: [14], b: [15] };

describe('phonemeIds', () => {
  it('başlangıç, dolgu, bitiş; bilinmeyen sembol atlanır', () => {
    expect(phonemeIds(['a', ' ', 'b', 'x'], MAP)).toEqual([1, 0, 14, 0, 3, 0, 15, 0, 2]);
    expect(phonemeIds([], MAP)).toEqual([1, 0, 2]);
  });

  it('haritada olmayanlar', () => {
    expect(missingPhonemes(['a', 'x', 'x', 'ɯ'], MAP)).toEqual(['x', 'ɯ']);
  });
});

describe('speechChunks', () => {
  it('kısa metin tek parça', () => {
    expect(speechChunks('Kısa bir cümle.')).toEqual(['Kısa bir cümle.']);
  });

  it('uzun cümle virgülden bölünür, kısa parçalar birleşir', () => {
    expect(speechChunks('bir iki üç, dört beş, altı yedi sekiz dokuz on', 5)).toEqual([
      'bir iki üç, dört beş,',
      'altı yedi sekiz dokuz on',
    ]);
  });

  it('noktalamasız çok uzun parça kelime sınırından', () => {
    const words = Array.from({ length: 12 }, (_, i) => `k${i}`).join(' ');
    expect(speechChunks(words, 5).map((c) => c.split(' ').length)).toEqual([5, 5, 2]);
  });
});
