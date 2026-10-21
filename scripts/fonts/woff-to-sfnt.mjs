#!/usr/bin/env node
/**
 * WOFF (1.0) yazı tipini OTF/TTF'ye çevirir — kayıpsız: WOFF, yazı tipi
 * tablolarının zlib ile sıkıştırılmış hâli; tablolar açılıp aynen yazılır.
 *
 *   node scripts/fonts/woff-to-sfnt.mjs giriş.woff çıkış.otf
 *
 * Neden: OpenDyslexic'in OFL lisanslı güncel sürümü npm'de (Fontsource)
 * yalnızca web biçimlerinde; telefonda yazı tipi OTF/TTF olmalı.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

function checksum(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 4) {
    const word =
      ((buffer[i] ?? 0) << 24) | ((buffer[i + 1] ?? 0) << 16) | ((buffer[i + 2] ?? 0) << 8) | (buffer[i + 3] ?? 0);
    sum = (sum + (word >>> 0)) >>> 0;
  }
  return sum;
}

export function woffToSfnt(woff) {
  if (woff.toString('latin1', 0, 4) !== 'wOFF') throw new Error('WOFF 1.0 dosyası değil');
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const at = 44 + i * 20;
    const tag = woff.toString('latin1', at, at + 4);
    const offset = woff.readUInt32BE(at + 4);
    const compLength = woff.readUInt32BE(at + 8);
    const origLength = woff.readUInt32BE(at + 12);
    const origChecksum = woff.readUInt32BE(at + 16);
    const raw = woff.subarray(offset, offset + compLength);
    const data = compLength < origLength ? zlib.inflateSync(raw) : Buffer.from(raw);
    if (data.length !== origLength) throw new Error(`${tag}: uzunluk tutmuyor`);
    tables.push({ tag, data, origChecksum });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

  const power = 2 ** Math.floor(Math.log2(numTables));
  const header = Buffer.alloc(12 + numTables * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(numTables, 4);
  header.writeUInt16BE(power * 16, 6);
  header.writeUInt16BE(Math.log2(power), 8);
  header.writeUInt16BE(numTables * 16 - power * 16, 10);

  const chunks = [header];
  let offset = header.length;
  let headOffset = -1;
  tables.forEach(({ tag, data, origChecksum }, index) => {
    const record = 12 + index * 16;
    header.write(tag, record, 'latin1');
    header.writeUInt32BE(origChecksum, record + 4);
    header.writeUInt32BE(offset, record + 8);
    header.writeUInt32BE(data.length, record + 12);
    if (tag === 'head') headOffset = offset;
    const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4);
    data.copy(padded);
    chunks.push(padded);
    offset += padded.length;
  });
  const font = Buffer.concat(chunks);
  // Tablo yerleri değişebildiği için bütün dosyanın sağlama değeri yeniden yazılır
  if (headOffset >= 0) {
    font.writeUInt32BE(0, headOffset + 8);
    font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headOffset + 8);
  }
  return font;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Kullanım: node scripts/fonts/woff-to-sfnt.mjs giriş.woff çıkış.otf');
    process.exit(2);
  }
  const font = woffToSfnt(fs.readFileSync(input));
  fs.writeFileSync(output, font);
  console.log(`${output}: ${font.length} bayt`);
}
