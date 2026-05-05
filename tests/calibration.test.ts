import { describe, expect, test } from 'vitest';
import { calibrate, dangerouslyConfident, CONFIDENCE_EXPECTED } from '../src/features/analytics/calibration';
import type { Attempt, Confidence } from '../src/lib/schema';

/* ─── Helpers ───────────────────────────────────────────────────────── */

let idCounter = 0;

function mkAttempt(
  confidence: Confidence,
  correct: boolean,
  overrides: Partial<Attempt> = {}
): Attempt {
  idCounter += 1;
  return {
    id: `a-${idCounter}`,
    questionId: overrides.questionId ?? `q-${idCounter}`,
    sessionId: 's1',
    ts: Date.now(),
    selectedOptionIds: ['A'],
    correct,
    latencyMs: 60_000,
    confidence,
    domain: 'prepare',
    subtopic: overrides.subtopic ?? 'kql',
    difficulty: 3,
    ...overrides
  };
}

function mkN(
  n: number,
  confidence: Confidence,
  correct: boolean,
  overrides: Partial<Attempt> = {}
): Attempt[] {
  return Array.from({ length: n }, () => mkAttempt(confidence, correct, overrides));
}

/* ─── calibrate ─────────────────────────────────────────────────────── */

describe('calibrate', () => {
  test('empty input returns zero-n report with no bins flagged insufficient on data', () => {
    const report = calibrate([]);
    expect(report.n).toBe(0);
    expect(report.overconfidenceScore).toBe(0);
    expect(report.brierLike).toBe(0);
    // all bins have n=0 → all insufficient
    for (const bin of report.bins) {
      expect(bin.n).toBe(0);
      expect(bin.insufficient).toBe(true);
      expect(bin.accuracy).toBeNaN();
      expect(bin.gap).toBeNaN();
    }
  });

  test('perfect calibration: sure=95%, guess=50%, unsure=25% → gaps ≈ 0', () => {
    // 20 sure → 19 correct (95%)
    const sureAttempts = [
      ...mkN(19, 'sure', true),
      mkAttempt('sure', false)
    ];
    // 20 guess → 10 correct (50%)
    const guessAttempts = [
      ...mkN(10, 'guess', true),
      ...mkN(10, 'guess', false)
    ];
    // 20 unsure → 5 correct (25%)
    const unsureAttempts = [
      ...mkN(5, 'unsure', true),
      ...mkN(15, 'unsure', false)
    ];
    const report = calibrate([...sureAttempts, ...guessAttempts, ...unsureAttempts]);
    const sureBin = report.bins.find((b) => b.confidence === 'sure')!;
    const guessBin = report.bins.find((b) => b.confidence === 'guess')!;
    const unsureBin = report.bins.find((b) => b.confidence === 'unsure')!;

    expect(sureBin.accuracy).toBeCloseTo(0.95, 5);
    expect(guessBin.accuracy).toBeCloseTo(0.50, 5);
    expect(unsureBin.accuracy).toBeCloseTo(0.25, 5);

    expect(sureBin.gap).toBeCloseTo(0, 5);
    expect(guessBin.gap).toBeCloseTo(0, 5);
    expect(unsureBin.gap).toBeCloseTo(0, 5);

    // Perfect calibration → overconfidenceScore ≈ 0
    expect(report.overconfidenceScore).toBeCloseTo(0, 5);
  });

  test('all overconfident: sure but only 50% correct → negative gap', () => {
    const attempts = [
      ...mkN(10, 'sure', true),
      ...mkN(10, 'sure', false)
    ];
    const report = calibrate(attempts);
    const sureBin = report.bins.find((b) => b.confidence === 'sure')!;
    expect(sureBin.accuracy).toBeCloseTo(0.50, 5);
    expect(sureBin.gap).toBeCloseTo(0.50 - CONFIDENCE_EXPECTED.sure, 5); // 0.50 - 0.95 = -0.45
    expect(sureBin.gap).toBeLessThan(0);
    expect(report.overconfidenceScore).toBeGreaterThan(0);
  });

  test('mixed bins: sure overconfident, guess/unsure not flagged', () => {
    const sureAttempts = mkN(10, 'sure', false); // 0% accuracy → -0.95 gap
    const guessAttempts = mkN(10, 'guess', true);  // 100% accuracy → +0.50 gap
    const report = calibrate([...sureAttempts, ...guessAttempts]);

    const sureBin = report.bins.find((b) => b.confidence === 'sure')!;
    const guessBin = report.bins.find((b) => b.confidence === 'guess')!;

    expect(sureBin.gap).toBeLessThan(0);   // overconfident
    expect(guessBin.gap).toBeGreaterThan(0); // underconfident (not penalized)

    // overconfidenceScore should count the sure bin but NOT the guess bin
    expect(report.overconfidenceScore).toBeGreaterThan(0);
    // The score should be n-weighted: 10 sure * 0.95 / 20 total = 0.475
    expect(report.overconfidenceScore).toBeCloseTo(0.475, 3);
  });

  test('minPerBin guard: bins below threshold report NaN and insufficient=true', () => {
    // Only 3 'sure' attempts — below default minPerBin=5
    const attempts = mkN(3, 'sure', true);
    const report = calibrate(attempts);
    const sureBin = report.bins.find((b) => b.confidence === 'sure')!;
    expect(sureBin.insufficient).toBe(true);
    expect(sureBin.accuracy).toBeNaN();
    expect(sureBin.gap).toBeNaN();
  });

  test('minPerBin=1 treats even single attempts as sufficient', () => {
    const attempts = [mkAttempt('sure', true)];
    const report = calibrate(attempts, { minPerBin: 1 });
    const sureBin = report.bins.find((b) => b.confidence === 'sure')!;
    expect(sureBin.insufficient).toBe(false);
    expect(sureBin.accuracy).toBeCloseTo(1.0, 5);
    expect(sureBin.gap).toBeCloseTo(1.0 - 0.95, 5);
  });

  test('brierLike: all correct sure → low score; all wrong sure → high score', () => {
    // All correct sure: (0.95 - 1)^2 = 0.0025 per attempt
    const allCorrect = mkN(10, 'sure', true);
    const reportCorrect = calibrate(allCorrect);
    expect(reportCorrect.brierLike).toBeCloseTo(0.0025, 5);

    // All wrong sure: (0.95 - 0)^2 = 0.9025 per attempt
    const allWrong = mkN(10, 'sure', false);
    const reportWrong = calibrate(allWrong);
    expect(reportWrong.brierLike).toBeCloseTo(0.9025, 5);

    expect(reportCorrect.brierLike).toBeLessThan(reportWrong.brierLike);
  });

  test('total n reflects all attempts across bins', () => {
    const attempts = [
      ...mkN(7, 'sure', true),
      ...mkN(8, 'guess', false),
      ...mkN(5, 'unsure', true)
    ];
    const report = calibrate(attempts);
    expect(report.n).toBe(20);
    expect(report.bins.find((b) => b.confidence === 'sure')!.n).toBe(7);
    expect(report.bins.find((b) => b.confidence === 'guess')!.n).toBe(8);
    expect(report.bins.find((b) => b.confidence === 'unsure')!.n).toBe(5);
  });
});

/* ─── dangerouslyConfident ───────────────────────────────────────────── */

describe('dangerouslyConfident', () => {
  test('empty input returns empty results', () => {
    const result = dangerouslyConfident([]);
    expect(result.questionIds).toHaveLength(0);
    expect(result.subtopics).toHaveLength(0);
  });

  test('question at exactly threshold (0.30) is included', () => {
    // 3 sure attempts: 1 wrong, 2 correct → 1/3 = 0.333 > 0.30
    const attempts = [
      mkAttempt('sure', false, { questionId: 'q-target' }),
      mkAttempt('sure', true, { questionId: 'q-target' }),
      mkAttempt('sure', true, { questionId: 'q-target' })
    ];
    const result = dangerouslyConfident(attempts, { threshold: 0.30 });
    expect(result.questionIds).toContain('q-target');
  });

  test('question below threshold (0.30) is excluded', () => {
    // 10 sure attempts: 2 wrong → 0.20 < 0.30
    const attempts = [
      ...mkN(2, 'sure', false).map((a) => ({ ...a, questionId: 'q-safe' })),
      ...mkN(8, 'sure', true).map((a) => ({ ...a, questionId: 'q-safe' }))
    ];
    const result = dangerouslyConfident(attempts, { threshold: 0.30 });
    expect(result.questionIds).not.toContain('q-safe');
  });

  test('non-sure attempts are ignored entirely', () => {
    // Only 'guess' and 'unsure' wrong — should not appear
    const attempts = [
      ...mkN(5, 'guess', false),
      ...mkN(5, 'unsure', false)
    ];
    const result = dangerouslyConfident(attempts);
    expect(result.questionIds).toHaveLength(0);
    expect(result.subtopics).toHaveLength(0);
  });

  test('subtopics ranked by wrongConfident rate descending', () => {
    // subtopic-A: 5 sure, 4 wrong → 80% wrong-confident
    const subA = Array.from({ length: 5 }, (_, i) =>
      mkAttempt('sure', i === 0, { subtopic: 'subtopic-A', questionId: `qa-${i}` })
    );
    // subtopic-B: 10 sure, 2 wrong → 20% wrong-confident
    const subB = Array.from({ length: 10 }, (_, i) =>
      mkAttempt('sure', i >= 2, { subtopic: 'subtopic-B', questionId: `qb-${i}` })
    );
    const result = dangerouslyConfident([...subA, ...subB]);
    expect(result.subtopics[0].subtopic).toBe('subtopic-A');
    expect(result.subtopics[1].subtopic).toBe('subtopic-B');
  });

  test('minN=2 excludes questions with only 1 sure attempt', () => {
    // 1 sure + wrong — should be excluded with minN=2
    const attempts = [mkAttempt('sure', false, { questionId: 'q-single' })];
    const result = dangerouslyConfident(attempts, { minN: 2 });
    expect(result.questionIds).not.toContain('q-single');
  });

  test('threshold=1.0 only flags questions wrong on every confident attempt', () => {
    // q-always-wrong: 3 sure, 3 wrong → 100% → included at threshold=1.0
    const alwaysWrong = mkN(3, 'sure', false).map((a) => ({ ...a, questionId: 'q-always-wrong' }));
    // q-sometimes-wrong: 3 sure, 2 wrong → 67% → excluded at threshold=1.0
    const sometimesWrong = [
      mkAttempt('sure', false, { questionId: 'q-sometimes-wrong' }),
      mkAttempt('sure', false, { questionId: 'q-sometimes-wrong' }),
      mkAttempt('sure', true, { questionId: 'q-sometimes-wrong' })
    ];
    const result = dangerouslyConfident([...alwaysWrong, ...sometimesWrong], { threshold: 1.0 });
    expect(result.questionIds).toContain('q-always-wrong');
    expect(result.questionIds).not.toContain('q-sometimes-wrong');
  });

  test('subtopics with zero confident-wrong are excluded from subtopics list', () => {
    // All sure + correct → no wrongConfident
    const attempts = mkN(10, 'sure', true, { subtopic: 'safe-topic' });
    const result = dangerouslyConfident(attempts);
    expect(result.subtopics.find((s) => s.subtopic === 'safe-topic')).toBeUndefined();
  });

  test('subtopic wrongConfident count is accurate', () => {
    const attempts = [
      mkAttempt('sure', false, { subtopic: 'data-factory', questionId: 'q1' }),
      mkAttempt('sure', false, { subtopic: 'data-factory', questionId: 'q2' }),
      mkAttempt('sure', true, { subtopic: 'data-factory', questionId: 'q3' }),
      mkAttempt('sure', true, { subtopic: 'data-factory', questionId: 'q4' })
    ];
    const result = dangerouslyConfident(attempts);
    const sub = result.subtopics.find((s) => s.subtopic === 'data-factory')!;
    expect(sub).toBeDefined();
    expect(sub.n).toBe(4);
    expect(sub.wrongConfident).toBe(2);
  });
});
