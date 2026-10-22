/**
 * Kendi sesin eğitim derlemini yazar: voice-training/corpus.tsv
 *
 * Kaynaklar: uygulamayla gelen klasikler (Vikikaynak, kamu malı) ve
 * uygulamanın kendi gömülü metinleri. Çözümleyici değişirse (bkz.
 * `PHONEMIZER_VERSION`) yeniden çalıştırılır; eğitilmiş sesler eski sürümle
 * uyumlu kalır (sürüm, sesin yapılandırmasına yazılır).
 *
 * Kullanım: npx tsx scripts/voice/build-corpus.ts [cümle sayısı]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PASSAGES } from '../../src/content/passages';
import { PHONEMIZER_VERSION } from '../../src/core/phonemize/g2p';
import { htmlToText } from '../../src/ingest/html2text';
import { normalizeText } from '../../src/ingest/normalize';
import { candidateSentences, corpusLine, coverageUnits, selectCorpus, type Candidate } from './corpus';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const count = Number(process.argv[2] ?? 1300);

const candidates: Candidate[] = [];
const classicsDir = resolve(root, 'assets/classics');
for (const file of readdirSync(classicsDir).filter((name) => name.endsWith('.txt')).sort()) {
  const text = normalizeText(htmlToText(readFileSync(resolve(classicsDir, file), 'utf8')));
  candidates.push(...candidateSentences(text, `klasik:${file.replace(/\.txt$/, '')}`));
}
for (const passage of PASSAGES) candidates.push(...candidateSentences(passage.text, `metin:${passage.id}`));

const corpus = selectCorpus(candidates, count);
const allUnits = new Set(candidates.flatMap((candidate) => [...coverageUnits(candidate.phonemes)]));
const coveredUnits = new Set(corpus.flatMap((candidate) => [...coverageUnits(candidate.phonemes)]));
const words = corpus.reduce((sum, candidate) => sum + candidate.text.split(/\s+/).length, 0);

const header = [
  `# Hızlı Okuma — kendi sesin eğitim derlemi (phonemizer=${PHONEMIZER_VERSION})`,
  '# Üreten: npx tsx scripts/voice/build-corpus.ts — elle düzenleme',
  '# kimlik\tmetin (söylendiği gibi)\tfonemler (her karakter bir fonem)',
];
writeFileSync(
  resolve(root, 'voice-training/corpus.tsv'),
  [...header, ...corpus.map((candidate, i) => corpusLine(i, candidate))].join('\n') + '\n'
);
const questions = corpus.filter((candidate) => /[?!]$/.test(candidate.text)).length;
console.log(
  `${corpus.length} cümle (${candidates.length} adaydan), ${words} kelime; fonem ikilisi kapsaması ` +
    `${coveredUnits.size}/${allUnits.size}; soru/ünlem ${questions}; kaynak: ` +
    `${corpus.filter((c) => c.source.startsWith('klasik')).length} klasik, ${corpus.filter((c) => c.source.startsWith('metin')).length} gömülü metin`
);
