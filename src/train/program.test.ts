import { describe, expect, it } from 'vitest';
import {
  adaptWpm,
  beginLesson,
  completeLesson,
  lessonById,
  lessonStatus,
  nextLesson,
  PROGRAM_LESSONS,
  programProgress,
  startProgram,
  type LessonEvidence,
} from './program';

const EMPTY: LessonEvidence = { drills: [], sessions: [], assessments: [] };

describe('program verisi', () => {
  it('4 hafta × 5 ders, kimlikler benzersiz', () => {
    expect(PROGRAM_LESSONS).toHaveLength(20);
    expect(new Set(PROGRAM_LESSONS.map((item) => item.id)).size).toBe(20);
  });

  it('her haftanın son dersi ölçüm', () => {
    for (const item of PROGRAM_LESSONS) {
      expect(item.practice.type === 'assess', item.id).toBe(item.day === 5);
    }
  });
});

describe('adaptWpm', () => {
  it('anlama %80 ve üstündeyse en az bir adım artırır', () => {
    expect(adaptWpm(300, 0.8)).toBe(325);
    expect(adaptWpm(200, 1)).toBe(225); // %5'i yuvarlamada kaybolmasın
    expect(adaptWpm(600, 1)).toBe(625);
  });

  it('%60–80 arasında aynı kalır', () => {
    expect(adaptWpm(300, 0.6)).toBe(300);
    expect(adaptWpm(300, 0.79)).toBe(300);
  });

  it('%60’ın altında %10 düşürür', () => {
    expect(adaptWpm(300, 0.4)).toBe(275);
    expect(adaptWpm(500, 0.2)).toBe(450);
  });

  it('sınırlar içinde kalır', () => {
    expect(adaptWpm(100, 0)).toBe(100);
    expect(adaptWpm(1200, 1)).toBe(1200);
  });
});

describe('ilerleyiş', () => {
  it('ilk dersten başlar', () => {
    const state = startProgram(310, 0);
    expect(state.wpm).toBe(300);
    expect(nextLesson(state)?.id).toBe('h1d1');
  });

  it('kaçırılan gün programı sıfırlamaz: sıradaki ders takvime değil sıraya bağlı', () => {
    let state = startProgram(300, 0);
    state = completeLesson(state, 'h1d1', 0.8, 1000);
    // Üç gün sonra bile sıradaki ders ikinci ders
    expect(nextLesson(state)?.id).toBe('h1d2');
    expect(state.wpm).toBe(325);
  });

  it('aynı dersi iki kez tamamlamak sayılmaz', () => {
    let state = startProgram(300, 0);
    state = completeLesson(state, 'h1d1', 1, 1000);
    state = completeLesson(state, 'h1d1', 1, 2000);
    expect(state.completed).toHaveLength(1);
    expect(state.wpm).toBe(325);
  });

  it('anlama kontrolü yoksa tempo değişmez', () => {
    const state = completeLesson(startProgram(300, 0), 'h1d5', null, 1);
    expect(state.wpm).toBe(300);
  });

  it('ilerlemeyi ve bitişi bildirir', () => {
    let state = startProgram(300, 0);
    expect(programProgress(state)).toMatchObject({ done: 0, week: 1, day: 1, finished: false });
    for (const item of PROGRAM_LESSONS) state = completeLesson(state, item.id, null, 1);
    expect(programProgress(state)).toMatchObject({ done: 20, finished: true });
    expect(nextLesson(state)).toBeNull();
  });

  it('dersi başlatmak başlangıç anını korur', () => {
    let state = beginLesson(startProgram(300, 0), 'h1d1', 100);
    state = beginLesson(state, 'h1d1', 500, 'pratik:x');
    expect(state.active).toEqual({ id: 'h1d1', startedAt: 100, docId: 'pratik:x' });
  });
});

describe('lessonStatus', () => {
  const exercise = lessonById('h1d1')!;

  it('başlangıçtan önceki kayıtları saymaz', () => {
    const status = lessonStatus(exercise, 1000, 'd1', {
      ...EMPTY,
      sessions: [{ docId: 'd1', at: 500, ms: 60000, mode: 'rsvp' }],
    });
    expect(status.practiceDone).toBe(false);
  });

  it('egzersiz + anlama kontrolü tamamlanınca bitirilebilir', () => {
    const status = lessonStatus(exercise, 1000, 'd1', {
      drills: [{ drill: 'schulte', at: 1100 }],
      sessions: [{ docId: 'd1', at: 1200, ms: 60000, mode: 'rsvp' }],
      assessments: [{ kind: 'quiz', at: 1300, docId: 'd1', correct: 4, total: 5 }],
    });
    expect(status).toMatchObject({ warmupDone: true, practiceDone: true, checkDone: true, canComplete: true });
    expect(status.comprehension).toBeCloseTo(0.8);
  });

  it('anlama kontrolü olmadan bitirilemez', () => {
    const status = lessonStatus(exercise, 1000, 'd1', {
      ...EMPTY,
      sessions: [{ docId: 'd1', at: 1200, ms: 60000, mode: 'rsvp' }],
    });
    expect(status.canComplete).toBe(false);
  });

  it('beceri dersi egzersiz sonucuyla tamamlanır', () => {
    const status = lessonStatus(lessonById('h2d3')!, 0, undefined, {
      ...EMPTY,
      drills: [{ drill: 'skim', at: 10 }],
    });
    expect(status.canComplete).toBe(true);
  });

  it('odak dersi kendi metninde yeterli okuma ister', () => {
    const focus = lessonById('h4d2')!;
    const short = lessonStatus(focus, 0, undefined, {
      ...EMPTY,
      sessions: [{ docId: 'kitap', at: 10, ms: 5 * 60_000, mode: 'rsvp' }],
    });
    expect(short.canComplete).toBe(false);
    const enough = lessonStatus(focus, 0, undefined, {
      ...EMPTY,
      sessions: [
        { docId: 'kitap', at: 10, ms: 5 * 60_000, mode: 'rsvp' },
        { docId: 'kitap', at: 20, ms: 4 * 60_000, mode: 'bionic' },
      ],
    });
    expect(enough.canComplete).toBe(true);
  });

  it('ölçüm dersi test kaydıyla tamamlanır', () => {
    const status = lessonStatus(lessonById('h1d5')!, 0, undefined, {
      ...EMPTY,
      assessments: [{ kind: 'test', at: 5, correct: 3, total: 5 }],
    });
    expect(status.canComplete).toBe(true);
  });
});
