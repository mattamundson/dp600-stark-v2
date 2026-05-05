import { describe, expect, test } from 'vitest';
import { gradeAnswer, summarizeSession, blueprintAccuracy } from '../src/lib/scoring/score';
import type { Attempt, Question } from '../src/lib/schema';

const single: Question = {
  id: 'q1',
  type: 'single',
  domain: 'semantic',
  subtopic: 'storage-modes',
  difficulty: 2,
  prompt: 'p',
  options: [
    { id: 'A', text: 'a' },
    { id: 'B', text: 'b' },
    { id: 'C', text: 'c' }
  ],
  correctOptionIds: ['B'],
  explanation: 'e',
  sourceAnchor: { category: 'x', note: 'y' },
  tags: []
};

const multi: Question = {
  id: 'q2',
  type: 'multi',
  domain: 'prepare',
  subtopic: 'architecture',
  difficulty: 3,
  prompt: 'p',
  options: [
    { id: 'A', text: 'a' },
    { id: 'B', text: 'b' },
    { id: 'C', text: 'c' },
    { id: 'D', text: 'd' }
  ],
  correctOptionIds: ['A', 'C'],
  explanation: 'e',
  sourceAnchor: { category: 'x', note: 'y' },
  tags: []
};

const ordering: Question = {
  id: 'q3',
  type: 'ordering',
  domain: 'maintain',
  subtopic: 'deployment',
  difficulty: 3,
  prompt: 'p',
  options: [
    { id: 'A', text: 'first' },
    { id: 'B', text: 'second' },
    { id: 'C', text: 'third' }
  ],
  correctOrder: ['A', 'B', 'C'],
  explanation: 'e',
  sourceAnchor: { category: 'x', note: 'y' },
  tags: []
};

describe('gradeAnswer', () => {
  test('single correct', () => {
    expect(gradeAnswer(single, ['B'], undefined)).toEqual({ correct: true, partial: 1 });
  });
  test('single wrong', () => {
    expect(gradeAnswer(single, ['A'], undefined)).toEqual({ correct: false, partial: 0 });
  });
  test('multi exact', () => {
    expect(gradeAnswer(multi, ['A', 'C'], undefined)).toEqual({ correct: true, partial: 1 });
  });
  test('multi partial: one of two correct, no wrong', () => {
    const g = gradeAnswer(multi, ['A'], undefined);
    expect(g.correct).toBe(false);
    expect(g.partial).toBeCloseTo(0.5, 4); // 1/2 jaccard, no penalty
  });
  test('multi penalised when wrong picks added', () => {
    const g = gradeAnswer(multi, ['A', 'C', 'B'], undefined);
    // jaccard = 2/3, penalty = 0.25 * 1/2 = 0.125 → 0.5417
    expect(g.correct).toBe(false);
    expect(g.partial).toBeGreaterThan(0.5);
    expect(g.partial).toBeLessThan(0.7);
  });
  test('multi guess-all heavily penalised', () => {
    const g = gradeAnswer(multi, ['A', 'B', 'C', 'D'], undefined);
    // jaccard = 2/4 = 0.5, penalty = 0.25 * 2/2 = 0.25 → 0.25
    expect(g.partial).toBeCloseTo(0.25, 3);
    expect(g.correct).toBe(false);
  });
  test('ordering exact', () => {
    expect(gradeAnswer(ordering, undefined, ['A', 'B', 'C'])).toEqual({ correct: true, partial: 1 });
  });
  test('ordering partial by position', () => {
    const g = gradeAnswer(ordering, undefined, ['A', 'C', 'B']);
    expect(g.correct).toBe(false);
    expect(g.partial).toBeCloseTo(1 / 3, 3);
  });
  test('ordering wrong length scores zero', () => {
    expect(gradeAnswer(ordering, undefined, ['A', 'B'])).toEqual({ correct: false, partial: 0 });
  });
});

const baseAttempt = {
  id: 'x',
  ts: 0,
  selectedOptionIds: [],
  correct: true,
  latencyMs: 10000,
  confidence: 'sure' as const,
  difficulty: 2 as const
};

describe('summarizeSession', () => {
  test('blueprint-aligned scoring upweights Prepare-data accuracy', () => {
    const attempts: Attempt[] = [
      // Prepare: 5/5 correct
      ...Array.from({ length: 5 }, (_, i) => ({
        ...baseAttempt, id: `p${i}`, sessionId: 'x', questionId: `qp${i}`, domain: 'prepare' as const, subtopic: 'architecture'
      })),
      // Maintain: 0/5 correct
      ...Array.from({ length: 5 }, (_, i) => ({
        ...baseAttempt, id: `m${i}`, sessionId: 'x', questionId: `qm${i}`, correct: false, domain: 'maintain' as const, subtopic: 'deployment'
      }))
    ];
    const s = summarizeSession(attempts, attempts.map((a) => a.questionId), 0);
    expect(s.byDomain.prepare.accuracy).toBe(1);
    expect(s.byDomain.maintain.accuracy).toBe(0);
    // blueprint-weighted: prepare 0.475/(0.475+0.275)*1 + maintain weight*0 ~ 0.633
    expect(blueprintAccuracy(s.byDomain)).toBeCloseTo(0.633, 2);
    // raw accuracy is 0.5; score = 1000 * (0.6*0.5 + 0.4*0.633) ≈ 553
    expect(s.scaledScore).toBeGreaterThanOrEqual(550);
    expect(s.scaledScore).toBeLessThanOrEqual(560);
  });
});
