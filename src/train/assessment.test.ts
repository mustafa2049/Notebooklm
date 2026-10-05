import { describe, expect, it } from 'vitest';
import {
  baselineWpm,
  improvement,
  nextTestPassageId,
  reliability,
  scoreAssessment,
  suggestLevel,
  suggestTargetWpm,
  testDue,
  TEST_INTERVAL_MS,
  type AssessmentRecord,
} from './assessment';

const DAY = 24 * 60 * 60 * 1000;

function test(at: number, wpm: number, correct: number, passageId = 'a', reliable = true): AssessmentRecord {
  return {
    id: `${at}`,
    kind: 'test',
    at,
    passageId,
    ms: 60000,
    words: wpm,
    wpm,
    correct,
    total: 5,
    reliable,
  };
}

describe('scoreAssessment', () => {
  it('doğal hızı, anlamayı ve efektif hızı hesaplar', () => {
    // 300 kelime 90 saniyede → 200 kel/dk; 4/5 doğru → efektif 160
    const score = scoreAssessment(90_000, 300, 4, 5);
    expect(score.wpm).toBeCloseTo(200, 6);
    expect(score.comprehension).toBeCloseTo(0.8, 6);
    expect(score.effectiveWpm).toBeCloseTo(160, 6);
  });

  it('sıfır süre ve sıfır soru durumlarında patlamaz', () => {
    expect(Number.isFinite(scoreAssessment(0, 100, 0, 5).wpm)).toBe(true);
    expect(scoreAssessment(60000, 100, 0, 0).comprehension).toBe(0);
  });
});

describe('reliability', () => {
  it('gerçekçi bir ölçümü kabul eder', () => {
    expect(reliability(scoreAssessment(90_000, 300, 4, 5)).reliable).toBe(true);
  });

  it('okunmadan geçilmiş metni işaretler', () => {
    // 300 kelime 5 saniyede = 3600 kel/dk
    const result = reliability(scoreAssessment(5_000, 300, 3, 5));
    expect(result.reliable).toBe(false);
    expect(result.note).toMatch(/gerçekçi değil/);
  });

  it('çok uzun süren okumayı işaretler', () => {
    expect(reliability(scoreAssessment(10 * 60_000, 300, 4, 5)).reliable).toBe(false);
  });

  it('çok düşük anlamayı işaretler', () => {
    expect(reliability(scoreAssessment(60_000, 300, 1, 5)).reliable).toBe(false);
  });
});

describe('nextTestPassageId', () => {
  const ids = ['a', 'b', 'c'];

  it('önce kullanılmamış metni verir', () => {
    expect(nextTestPassageId(ids, [])).toBe('a');
    expect(nextTestPassageId(ids, [test(1, 200, 4, 'a')])).toBe('b');
  });

  it('hepsi kullanıldıysa en uzun süredir okunmayanı verir', () => {
    const history = [test(3, 200, 4, 'a'), test(1, 200, 4, 'b'), test(2, 200, 4, 'c')];
    expect(nextTestPassageId(ids, history)).toBe('b');
  });

  it('quiz kayıtlarını hesaba katmaz', () => {
    const quiz: AssessmentRecord = { ...test(1, 300, 4, 'a'), kind: 'quiz' };
    expect(nextTestPassageId(ids, [quiz])).toBe('a');
  });
});

describe('testDue', () => {
  it('hiç test yoksa zamanı gelmiştir', () => {
    expect(testDue([], 0)).toBe(true);
  });

  it('bir hafta dolunca zamanı gelir', () => {
    const history = [test(0, 200, 4)];
    expect(testDue(history, TEST_INTERVAL_MS - 1)).toBe(false);
    expect(testDue(history, TEST_INTERVAL_MS)).toBe(true);
  });
});

describe('improvement', () => {
  it('tek ölçümle gelişim hesaplamaz', () => {
    expect(improvement([test(0, 200, 4)])).toBeNull();
  });

  it('ilk ve son güvenilir ölçümü karşılaştırır', () => {
    const result = improvement([test(0, 200, 4), test(7 * DAY, 250, 4)]);
    // 160 → 200 efektif = %25
    expect(result?.change).toBeCloseTo(0.25, 6);
    expect(result?.tests).toBe(2);
  });

  it('güvenilmez ölçümü dışarıda bırakır', () => {
    const result = improvement([
      test(0, 200, 4),
      test(DAY, 1400, 1, 'b', false),
      test(2 * DAY, 220, 4, 'c'),
    ]);
    expect(result?.latest).toBeCloseTo(176, 6);
  });

  it('hız artıp anlama düştüyse gelişim göstermez', () => {
    // 200×0,8 = 160 → 300×0,4 = 120 → efektif düşüş
    const result = improvement([test(0, 200, 4), test(DAY, 300, 2)]);
    expect(result?.change).toBeLessThan(0);
  });
});

describe('suggestTargetWpm', () => {
  it('anlama iyiyse doğal hızın biraz üstünü önerir', () => {
    expect(suggestTargetWpm(scoreAssessment(60_000, 240, 4, 5))).toBe(300);
  });

  it('anlama zayıfsa doğal hızda kalmayı önerir', () => {
    expect(suggestTargetWpm(scoreAssessment(60_000, 240, 3, 5))).toBe(250);
  });

  it('sınırların dışına çıkmaz', () => {
    expect(suggestTargetWpm(scoreAssessment(60_000, 40, 5, 5))).toBe(100);
    expect(suggestTargetWpm(scoreAssessment(60_000, 1400, 5, 5))).toBe(1200);
  });
});

describe('baselineWpm', () => {
  it('ölçüm yoksa ortalama yetişkin hızını kullanır', () => {
    expect(baselineWpm([])).toEqual({ wpm: 230, measured: false });
  });

  it('ilk güvenilir ölçümün doğal hızını kullanır', () => {
    expect(baselineWpm([test(5, 300, 4), test(1, 210, 4)])).toEqual({ wpm: 210, measured: true });
  });
});

function leveled(at: number, wpm: number, correct: number, level: 'kolay' | 'orta' | 'zor'): AssessmentRecord {
  return { ...test(at, wpm, correct), level };
}

describe('suggestLevel', () => {
  it('ölçüm yoksa ortadan başlar', () => {
    expect(suggestLevel([])).toBe('orta');
  });

  it('eski (seviyesiz) kayıtları orta sayar', () => {
    expect(suggestLevel([test(0, 200, 3)])).toBe('orta');
  });

  it('iki ölçümde anlama %80 ve üstündeyse bir üst seviye', () => {
    expect(suggestLevel([leveled(0, 200, 4, 'orta'), leveled(DAY, 210, 5, 'orta')])).toBe('zor');
  });

  it('tek iyi ölçüm seviye atlatmaz', () => {
    expect(suggestLevel([leveled(0, 200, 3, 'orta'), leveled(DAY, 210, 5, 'orta')])).toBe('orta');
  });

  it('iki ölçümde anlama %60’ın altındaysa bir alt seviye', () => {
    expect(suggestLevel([leveled(0, 200, 2, 'zor'), leveled(DAY, 210, 2, 'zor')])).toBe('orta');
  });

  it('en üst ve en alt seviyede kalır', () => {
    expect(suggestLevel([leveled(0, 200, 5, 'zor'), leveled(DAY, 210, 5, 'zor')])).toBe('zor');
    expect(suggestLevel([leveled(0, 200, 2, 'kolay'), leveled(DAY, 210, 2, 'kolay')])).toBe('kolay');
  });

  it('güvenilmez ölçümleri saymaz', () => {
    const unreliable = { ...leveled(DAY, 2000, 5, 'orta'), reliable: false };
    expect(suggestLevel([leveled(0, 200, 5, 'orta'), unreliable])).toBe('orta');
  });
});

describe('improvement — seviyeler', () => {
  it('yalnızca son ölçümün seviyesindeki testleri karşılaştırır', () => {
    const history = [
      leveled(0, 150, 4, 'orta'),
      leveled(DAY, 300, 5, 'kolay'),
      leveled(2 * DAY, 180, 4, 'orta'),
    ];
    const result = improvement(history);
    expect(result?.level).toBe('orta');
    expect(result?.tests).toBe(2);
    expect(result?.change).toBeCloseTo(0.2);
  });

  it('yeni seviyede tek ölçüm varken gelişim göstermez', () => {
    expect(improvement([leveled(0, 150, 4, 'orta'), leveled(DAY, 140, 4, 'zor')])).toBeNull();
  });
});
