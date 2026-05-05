// sim-realism.test.ts
// ≥10 tests covering buildSimSet, pacingTargetMs, config sanity, and summarizeSim.

import { describe, expect, test } from 'vitest';
import {
  buildSimSet,
  DP600_QUICK,
  DP600_REALISM,
  pacingTargetMs,
  summarizeSim
} from '../src/features/simulation/realism';
import type { Attempt, Domain, Question, QuestionType } from '../src/lib/schema';

/* ─── Test helpers ────────────────────────────────────────────────── */

/** Build a synthetic question bank of size n. Domains cycle: maintain / prepare / semantic. */
function mkBank(n: number, typeOverride?: QuestionType): Question[] {
  const domains: Domain[] = ['maintain', 'prepare', 'semantic'];
  return Array.from({ length: n }, (_, i) => ({
    id: `q-${String(i).padStart(4, '0')}`,
    type: typeOverride ?? 'single',
    domain: domains[i % 3],
    subtopic: `subtopic-${i % 5}`,
    difficulty: (((i % 5) + 1) as 1 | 2 | 3 | 4 | 5),
    prompt: `Question ${i}`,
    options: [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' }
    ],
    correctOptionIds: ['A'],
    explanation: `Explanation ${i}`,
    sourceAnchor: { category: 'test', note: 'test' },
    tags: []
  }));
}

/** Build a minimal Attempt for a question (correct or not). */
function mkAttempt(q: Question, correct: boolean, confidence: 'sure' | 'unsure' | 'guess' = 'unsure', latencyMs = 80_000): Attempt {
  return {
    id: `a-${q.id}`,
    questionId: q.id,
    sessionId: 'test-session',
    ts: Date.now(),
    selectedOptionIds: correct ? (q.correctOptionIds ?? ['A']) : ['B'],
    correct,
    latencyMs,
    confidence,
    domain: q.domain,
    subtopic: q.subtopic,
    difficulty: q.difficulty
  };
}

/* ─── buildSimSet tests ───────────────────────────────────────────── */

describe('buildSimSet', () => {
  test('returns exactly totalQuestions questions', () => {
    const bank = mkBank(200);
    const set = buildSimSet(bank, DP600_REALISM, { seed: 42 });
    expect(set).toHaveLength(DP600_REALISM.totalQuestions);
  });

  test('returns exactly totalQuestions for DP600_QUICK', () => {
    const bank = mkBank(100);
    const set = buildSimSet(bank, DP600_QUICK, { seed: 99 });
    expect(set).toHaveLength(DP600_QUICK.totalQuestions);
  });

  test('domain mix matches blueprint within ±1 for DP600_REALISM', () => {
    const bank = mkBank(300);
    const set = buildSimSet(bank, DP600_REALISM, { seed: 7 });
    const n = DP600_REALISM.totalQuestions;

    const maintainCount = set.filter((q) => q.domain === 'maintain').length;
    const prepareCount  = set.filter((q) => q.domain === 'prepare').length;
    const semanticCount = set.filter((q) => q.domain === 'semantic').length;

    const targetMaintain = Math.round(n * DP600_REALISM.blueprint.maintain);
    const targetSemantic = Math.round(n * DP600_REALISM.blueprint.semantic);
    const targetPrepare  = n - targetMaintain - targetSemantic;

    expect(maintainCount).toBeGreaterThanOrEqual(targetMaintain - 1);
    expect(maintainCount).toBeLessThanOrEqual(targetMaintain + 1);
    expect(prepareCount).toBeGreaterThanOrEqual(targetPrepare - 1);
    expect(prepareCount).toBeLessThanOrEqual(targetPrepare + 1);
    expect(semanticCount).toBeGreaterThanOrEqual(targetSemantic - 1);
    expect(semanticCount).toBeLessThanOrEqual(targetSemantic + 1);
  });

  test('seeded calls produce identical results (determinism)', () => {
    const bank = mkBank(200);
    const set1 = buildSimSet(bank, DP600_REALISM, { seed: 12345 });
    const set2 = buildSimSet(bank, DP600_REALISM, { seed: 12345 });
    expect(set1.map((q) => q.id)).toEqual(set2.map((q) => q.id));
  });

  test('different seeds produce different orderings', () => {
    const bank = mkBank(200);
    const set1 = buildSimSet(bank, DP600_REALISM, { seed: 1 });
    const set2 = buildSimSet(bank, DP600_REALISM, { seed: 2 });
    // It's extremely unlikely all 65 ids are identical with different seeds
    const sameOrder = set1.map((q) => q.id).join() === set2.map((q) => q.id).join();
    expect(sameOrder).toBe(false);
  });

  test('excludeIds are not included in the result', () => {
    const bank = mkBank(200);
    const excludeIds = bank.slice(0, 30).map((q) => q.id);
    const set = buildSimSet(bank, DP600_REALISM, { seed: 55, excludeIds });
    const resultIds = new Set(set.map((q) => q.id));
    for (const id of excludeIds) {
      expect(resultIds.has(id)).toBe(false);
    }
  });

  test('result contains no duplicate question ids', () => {
    const bank = mkBank(200);
    const set = buildSimSet(bank, DP600_REALISM, { seed: 99 });
    const ids = set.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ─── pacingTargetMs tests ────────────────────────────────────────── */

describe('pacingTargetMs', () => {
  const avgMs = (DP600_REALISM.timeMinutes * 60_000) / DP600_REALISM.totalQuestions;

  test('single question gets the baseline avg per question', () => {
    const q = mkBank(1)[0];
    const target = pacingTargetMs(q, DP600_REALISM);
    expect(target).toBe(Math.round(avgMs * 1.0));
  });

  test('scenario-multi gets more time than single', () => {
    const single = mkBank(1, 'single')[0];
    const scenarioMulti = mkBank(1, 'scenario-multi')[0];
    expect(pacingTargetMs(scenarioMulti, DP600_REALISM)).toBeGreaterThan(
      pacingTargetMs(single, DP600_REALISM)
    );
  });

  test('multi gets more time than single', () => {
    const single = mkBank(1, 'single')[0];
    const multi = mkBank(1, 'multi')[0];
    expect(pacingTargetMs(multi, DP600_REALISM)).toBeGreaterThan(
      pacingTargetMs(single, DP600_REALISM)
    );
  });

  test('ordering gets more time than single', () => {
    const single = mkBank(1, 'single')[0];
    const ordering = mkBank(1, 'ordering')[0];
    expect(pacingTargetMs(ordering, DP600_REALISM)).toBeGreaterThan(
      pacingTargetMs(single, DP600_REALISM)
    );
  });

  test('pacingTargetMs scales with timeMinutes — DP600_QUICK targets shorter per-Q time', () => {
    const q = mkBank(1, 'single')[0];
    const fullTarget  = pacingTargetMs(q, DP600_REALISM);
    const quickTarget = pacingTargetMs(q, DP600_QUICK);
    // Quick has fewer total minutes relative to question count (35/25 = 84s vs 100/65 ≈ 92s)
    expect(quickTarget).toBeLessThan(fullTarget);
  });
});

/* ─── Config sanity tests ─────────────────────────────────────────── */

describe('config presets', () => {
  test('DP600_REALISM has correct question count and duration', () => {
    expect(DP600_REALISM.totalQuestions).toBe(65);
    expect(DP600_REALISM.timeMinutes).toBe(100);
  });

  test('DP600_REALISM blueprint sums to 1.0 (within floating-point)', () => {
    const sum =
      DP600_REALISM.blueprint.maintain +
      DP600_REALISM.blueprint.prepare +
      DP600_REALISM.blueprint.semantic;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  test('DP600_REALISM has showFeedbackPerQuestion=false', () => {
    expect(DP600_REALISM.showFeedbackPerQuestion).toBe(false);
  });

  test('DP600_QUICK has smaller question count', () => {
    expect(DP600_QUICK.totalQuestions).toBeLessThan(DP600_REALISM.totalQuestions);
    expect(DP600_QUICK.totalQuestions).toBe(25);
    expect(DP600_QUICK.timeMinutes).toBe(35);
  });

  test('DP600_QUICK blueprint sums to 1.0', () => {
    const sum =
      DP600_QUICK.blueprint.maintain +
      DP600_QUICK.blueprint.prepare +
      DP600_QUICK.blueprint.semantic;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

/* ─── summarizeSim tests ──────────────────────────────────────────── */

describe('summarizeSim', () => {
  test('all-correct attempts: score === total, all correctById true', () => {
    const questions = mkBank(20);
    const attempts = questions.map((q) => mkAttempt(q, true));
    const summary = summarizeSim(attempts, questions);

    expect(summary.score).toBe(20);
    expect(summary.total).toBe(20);
    expect(Object.values(summary.correctById).every(Boolean)).toBe(true);
    expect(summary.subtopicMisses).toHaveLength(0);
  });

  test('mixed attempts: score reflects correct count only', () => {
    const questions = mkBank(10);
    // First 6 correct, last 4 wrong
    const attempts = questions.map((q, i) => mkAttempt(q, i < 6));
    const summary = summarizeSim(attempts, questions);

    expect(summary.score).toBe(6);
    expect(summary.total).toBe(10);
    expect(Object.values(summary.correctById).filter(Boolean)).toHaveLength(6);
    expect(Object.values(summary.correctById).filter((v) => !v)).toHaveLength(4);
  });

  test('unanswered questions counted as incorrect', () => {
    const questions = mkBank(10);
    // Only answer 5 of them
    const attempts = questions.slice(0, 5).map((q) => mkAttempt(q, true));
    const summary = summarizeSim(attempts, questions);

    // 5 answered correct, 5 unanswered (treated as wrong)
    expect(summary.score).toBe(5);
    expect(summary.total).toBe(10);
    expect(summary.correctById[questions[9].id]).toBe(false);
  });

  test('flagged questions are surfaced correctly', () => {
    const questions = mkBank(10);
    const attempts = questions.map((q) => mkAttempt(q, true));
    const flagged = [questions[2].id, questions[7].id];
    const summary = summarizeSim(attempts, questions, flagged);

    expect(summary.flagged).toContain(questions[2].id);
    expect(summary.flagged).toContain(questions[7].id);
    expect(summary.flagged).toHaveLength(2);
  });

  test('flagged ids not in question set are filtered out', () => {
    const questions = mkBank(10);
    const attempts = questions.map((q) => mkAttempt(q, true));
    const summary = summarizeSim(attempts, questions, ['not-a-real-id']);
    expect(summary.flagged).toHaveLength(0);
  });

  test('subtopic misses sorted descending by missed count', () => {
    const questions = mkBank(30); // subtopics cycle 0..4
    // Miss all of subtopic-0 (indices 0, 5, 10, 15, 20, 25) — 6 questions
    // Miss some of subtopic-1 (indices 1, 6) — 2 questions
    const attempts = questions.map((q, i) => {
      const subIdx = i % 5;
      const correct = subIdx !== 0 && !(subIdx === 1 && i <= 6);
      return mkAttempt(q, correct);
    });
    const summary = summarizeSim(attempts, questions);

    // subtopicMisses should exist and be sorted desc
    expect(summary.subtopicMisses.length).toBeGreaterThan(0);
    for (let i = 1; i < summary.subtopicMisses.length; i++) {
      expect(summary.subtopicMisses[i - 1].missed).toBeGreaterThanOrEqual(
        summary.subtopicMisses[i].missed
      );
    }
  });

  test('subtopicMisses only contains subtopics with ≥1 miss', () => {
    const questions = mkBank(15);
    // Only miss the last 3 questions
    const attempts = questions.map((q, i) => mkAttempt(q, i < 12));
    const summary = summarizeSim(attempts, questions);

    for (const { missed } of summary.subtopicMisses) {
      expect(missed).toBeGreaterThanOrEqual(1);
    }
  });

  test('domainBreakdown totals sum to question count', () => {
    const questions = mkBank(30);
    const attempts = questions.map((q) => mkAttempt(q, true));
    const summary = summarizeSim(attempts, questions);

    const total =
      summary.domainBreakdown.maintain.total +
      summary.domainBreakdown.prepare.total +
      summary.domainBreakdown.semantic.total;
    expect(total).toBe(30);
  });

  test('readinessReport is present with expected shape', () => {
    const questions = mkBank(65);
    const attempts = questions.map((q) => mkAttempt(q, true, 'sure', 80_000));
    const summary = summarizeSim(attempts, questions);

    expect(summary.readinessReport).toBeDefined();
    expect(typeof summary.readinessReport.score).toBe('number');
    expect(['red', 'yellow', 'green']).toContain(summary.readinessReport.band);
    expect(summary.readinessReport.score).toBeGreaterThanOrEqual(0);
    expect(summary.readinessReport.score).toBeLessThanOrEqual(1000);
  });
});
