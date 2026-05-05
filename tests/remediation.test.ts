import { describe, expect, test } from 'vitest';
import { weakSpots, buildRemediation } from '../src/features/remediation/engine';
import type { Attempt, Question } from '../src/lib/schema';

function mkQ(id: string, sub: string, dom: Question['domain'] = 'semantic'): Question {
  return {
    id, type: 'single', domain: dom, subtopic: sub, difficulty: 2,
    prompt: id, options: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }],
    correctOptionIds: ['A'],
    explanation: '', sourceAnchor: { category: 'x', note: 'y' }, tags: []
  };
}

function mkAttempt(qid: string, sub: string, correct: boolean, conf: Attempt['confidence'] = 'unsure', ts = Date.now()): Attempt {
  return {
    id: `a-${qid}-${ts}`, questionId: qid, sessionId: 's', ts,
    selectedOptionIds: ['A'], correct, latencyMs: 30000, confidence: conf,
    domain: 'semantic', subtopic: sub, difficulty: 2
  };
}

describe('weakSpots', () => {
  test('empty attempts → empty spots', () => {
    expect(weakSpots([])).toEqual([]);
  });

  test('worst subtopic ranked first; danger flag fires on confident wrong', () => {
    const a: Attempt[] = [
      ...Array.from({ length: 5 }, (_, i) => mkAttempt(`q${i}`, 'direct-lake', false, 'sure')),
      ...Array.from({ length: 5 }, (_, i) => mkAttempt(`r${i}`, 'kql', true, 'sure'))
    ];
    const spots = weakSpots(a);
    expect(spots[0].subtopic).toBe('direct-lake');
    expect(spots[0].dangerScore).toBe(1);     // 5/5 wrong-while-sure
    expect(spots[0].weight).toBeGreaterThan(spots[1].weight);
  });
});

describe('buildRemediation', () => {
  const bank: Question[] = [
    mkQ('a1', 'direct-lake'),
    mkQ('a2', 'direct-lake'),
    mkQ('a3', 'direct-lake'),
    mkQ('b1', 'kql'),
    mkQ('b2', 'kql'),
    mkQ('c1', 'deployment')
  ];

  test('cold start picks unseen mid-difficulty', () => {
    const ids = buildRemediation(bank, [], { size: 10 });
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(6);
  });

  test('targets weakest subtopics first', () => {
    const attempts: Attempt[] = [
      ...['a1', 'a2', 'a3'].map((id) => mkAttempt(id, 'direct-lake', false, 'sure')),
      ...['b1', 'b2'].map((id) => mkAttempt(id, 'kql', true))
    ];
    const ids = buildRemediation(bank, attempts, { size: 10 });
    // Should be heavily Direct Lake
    const dl = ids.filter((id) => id.startsWith('a')).length;
    expect(dl).toBeGreaterThan(0);
  });

  test('honours requested size when bank is large enough', () => {
    const big: Question[] = Array.from({ length: 30 }, (_, i) => mkQ(`q${i}`, i % 3 === 0 ? 'direct-lake' : 'kql'));
    const ids = buildRemediation(big, [], { size: 15 });
    expect(ids.length).toBe(15);
    expect(new Set(ids).size).toBe(15);
  });
});
