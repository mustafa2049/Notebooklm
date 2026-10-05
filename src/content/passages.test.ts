import { describe, expect, it } from 'vitest';
import { readability } from '@/core/readability';
import { countWordsInText } from '@/ingest/normalize';
import { PASSAGE_LEVELS, PASSAGES, practicePassages, testPassagesFor, TEST_PASSAGES, type PassageLevel } from './passages';

/**
 * Gömülü metinler elle yazıldı; bu testler yazım hatalarını yakalayan güvence.
 * Bir kanıt cümlesi metinde birebir yoksa soru "metne dayalı" değildir.
 */

describe('gömülü metinler', () => {
  it('kimlikler benzersiz', () => {
    const ids = PASSAGES.map((passage) => passage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('her seviyede en az 8 test metni var (haftalık ölçümler tekrarsız dönebilsin)', () => {
    for (const level of PASSAGE_LEVELS) {
      expect(testPassagesFor(level).length, level).toBeGreaterThanOrEqual(8);
    }
    expect(TEST_PASSAGES.length).toBeGreaterThanOrEqual(26);
  });

  for (const passage of PASSAGES) {
    describe(passage.title, () => {
      // Türkçe eklemeli olduğu için kelime sayısı düşük kalır: 270 kelime, normal
      // hızda bir buçuk dakikalık okumadır — ölçüm için yeterli, yorucu değil
      it('uzunluğu ölçüm için uygun (200–450 kelime)', () => {
        const words = countWordsInText(passage.text);
        expect(words).toBeGreaterThanOrEqual(200);
        expect(words).toBeLessThanOrEqual(450);
      });

      it('beş soru var ve her türden en az biri bulunuyor', () => {
        expect(passage.questions).toHaveLength(5);
        const kinds = new Set(passage.questions.map((question) => question.kind));
        expect(kinds).toEqual(new Set(['ayrıntı', 'çıkarım', 'anaFikir', 'kelime']));
      });

      it('her kanıt metinde birebir geçiyor', () => {
        for (const question of passage.questions) {
          expect(passage.text, question.prompt).toContain(question.evidence);
        }
      });

      it('şıklar birbirinden farklı', () => {
        for (const question of passage.questions) {
          const options = [question.correct, ...question.wrong];
          expect(new Set(options).size, question.prompt).toBe(4);
        }
      });

      it('tarama cevapları metinde geçiyor', () => {
        expect(passage.scan.length).toBeGreaterThanOrEqual(2);
        for (const task of passage.scan) {
          expect(passage.text, task.prompt).toContain(task.answer);
        }
      });
    });
  }
});

/** Ateşman bantları: kolay 70–89, orta 50–69, zor 30–49 */
const BANDS: Record<PassageLevel, [number, number]> = {
  kolay: [70, 89],
  orta: [50, 70],
  zor: [30, 49],
};

for (const level of PASSAGE_LEVELS) {
  describe(`${level} test metinlerinin zorluğu denk`, () => {
    const scores = testPassagesFor(level).map((passage) => ({
      title: passage.title,
      score: readability(passage.text).score,
    }));

    it(`hepsi Ateşman ölçeğinde kendi bandında (${BANDS[level].join('–')})`, () => {
      for (const { title, score } of scores) {
        expect(score, title).toBeGreaterThanOrEqual(BANDS[level][0]);
        expect(score, title).toBeLessThanOrEqual(BANDS[level][1]);
      }
    });

    it('en kolay ile en zor arasındaki fark 15 puanı geçmiyor', () => {
      const values = scores.map((entry) => entry.score);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(15);
    });
  });
}

describe('practicePassages', () => {
  it('test edilmemiş test metnini egzersize koymaz', () => {
    const ids = practicePassages([]).map((passage) => passage.id);
    expect(ids.every((id) => PASSAGES.find((p) => p.id === id)?.use === 'drill')).toBe(true);
  });

  it('test edilmiş metni egzersiz havuzuna ekler', () => {
    expect(practicePassages(['arilar']).map((passage) => passage.id)).toContain('arilar');
  });
});
