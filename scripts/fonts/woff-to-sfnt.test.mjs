import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { woffToSfnt } from './woff-to-sfnt.mjs';

/** Testlik WOFF: verilen tabloları (biri sıkıştırılmış) sarar */
function makeWoff(tables) {
  const entries = tables.map(({ tag, data, compress }) => ({
    tag,
    data,
    stored: compress ? zlib.deflateSync(data) : data,
  }));
  const header = Buffer.alloc(44 + entries.length * 20);
  header.write('wOFF', 0, 'latin1');
  header.writeUInt32BE(0x4f54544f, 4); // 'OTTO'
  header.writeUInt16BE(entries.length, 12);
  let offset = header.length;
  const bodies = [];
  entries.forEach((entry, index) => {
    const at = 44 + index * 20;
    header.write(entry.tag, at, 'latin1');
    header.writeUInt32BE(offset, at + 4);
    header.writeUInt32BE(entry.stored.length, at + 8);
    header.writeUInt32BE(entry.data.length, at + 12);
    header.writeUInt32BE(0x12345678, at + 16);
    const padded = Buffer.alloc(Math.ceil(entry.stored.length / 4) * 4);
    entry.stored.copy(padded);
    bodies.push(padded);
    offset += padded.length;
  });
  return Buffer.concat([header, ...bodies]);
}

describe('woffToSfnt', () => {
  const head = Buffer.alloc(54, 7);
  const name = Buffer.from('OpenDyslexic '.repeat(20), 'latin1');
  const font = woffToSfnt(makeWoff([{ tag: 'head', data: head }, { tag: 'name', data: name, compress: true }]));

  it('tablolar açılıp aynen yazılır; başlık tutarlı', () => {
    expect(font.toString('latin1', 0, 4)).toBe('OTTO');
    expect(font.readUInt16BE(4)).toBe(2);
    const tables = {};
    for (let i = 0; i < 2; i++) {
      const record = 12 + i * 16;
      tables[font.toString('latin1', record, record + 4)] = {
        offset: font.readUInt32BE(record + 8),
        length: font.readUInt32BE(record + 12),
      };
    }
    const nameTable = font.subarray(tables.name.offset, tables.name.offset + tables.name.length);
    expect(nameTable.equals(name)).toBe(true);
    // head'in sağlama düzeltmesi dışındaki baytları aynı
    const headTable = font.subarray(tables.head.offset, tables.head.offset + 54);
    expect(headTable.subarray(0, 8).equals(head.subarray(0, 8))).toBe(true);
    expect(headTable.subarray(12).equals(head.subarray(12))).toBe(true);
  });

  it('WOFF olmayan dosyayı reddeder', () => {
    expect(() => woffToSfnt(Buffer.from('OTTO0000'))).toThrow(/WOFF/);
  });
});
