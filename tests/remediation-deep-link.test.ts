// Remediation deep-link integration test — verifies that the engine
// correctly filters the question pool when a subtopic param is given,
// AND that the parent-bucket → children expansion works for Direct Lake.

import { describe, expect, test } from 'vitest';
import { buildRemediation, weakSpots, subtopicChildren, subtopicBucket } from '../src/features/remediation/engine';
import type { Attempt, Question } from '../src/lib/schema';

function mkQ(id: string, subtopic: string, domain: 'maintain' | 'prepare' | 'semantic' = 'semantic'): Question {
  return {
    id, type: 'single', domain, subtopic, difficulty: 3,
    prompt: `q-${id}`,
    options: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }],
    correctOptionIds: ['A'],
    explanation: 'because',
    sourceAnchor: { category: 'x', note: 'y' },
    tags: []
  };
}

function mkAttempt(qid: string, subtopic: string, correct: boolean): Attempt {
  return {
    id: `a-${qid}-${Math.random()}`,
    questionId: qid,
    sessionId: 's1',
    ts: Date.now(),
    selectedOptionIds: ['B'],
    correct,
    latencyMs: 5000,
    confidence: 'sure',
    domain: 'semantic',
    subtopic,
    difficulty: 3
  };
}

describe('remediation deep-link expansion', () => {
  test('subtopicBucket maps direct-lake-* children to direct-lake parent', () => {
    expect(subtopicBucket('direct-lake-fallback')).toBe('direct-lake');
    expect(subtopicBucket('direct-lake-framing')).toBe('direct-lake');
    expect(subtopicBucket('direct-lake-onelake')).toBe('direct-lake');
    expect(subtopicBucket('direct-lake')).toBe('direct-lake');
  });

  test('subtopicBucket leaves unrelated subtopics unchanged', () => {
    expect(subtopicBucket('kql')).toBe('kql');
    expect(subtopicBucket('security-rls')).toBe('security-rls');
  });

  test('subtopicChildren returns parent + children for direct-lake', () => {
    const kids = subtopicChildren('direct-lake');
    expect(kids).toContain('direct-lake');
    expect(kids).toContain('direct-lake-fallback');
    expect(kids).toContain('direct-lake-framing');
  });

  test('subtopicChildren returns single-element array for non-parent subtopics', () => {
    expect(subtopicChildren('kql')).toEqual(['kql']);
    expect(subtopicChildren('security-rls')).toEqual(['security-rls']);
  });

  test('weakSpots aggregates direct-lake-* attempts under the parent bucket', () => {
    const attempts: Attempt[] = [
      mkAttempt('q1', 'direct-lake', false),
      mkAttempt('q2', 'direct-lake-fallback', false),
      mkAttempt('q3', 'direct-lake-framing', false),
      mkAttempt('q4', 'direct-lake-onelake', false)
    ];
    const spots = weakSpots(attempts);
    const dl = spots.find((s) => s.subtopic === 'direct-lake');
    expect(dl).toBeTruthy();
    expect(dl!.attempts).toBe(4);
    expect(spots.find((s) => s.subtopic === 'direct-lake-fallback')).toBeUndefined();
  });

  test('buildRemediation with parent-bucket attempts includes children questions', () => {
    const bank: Question[] = [
      mkQ('p1', 'direct-lake'),
      mkQ('p2', 'direct-lake-fallback'),
      mkQ('p3', 'direct-lake-framing'),
      mkQ('p4', 'direct-lake-onelake'),
      mkQ('p5', 'kql')
    ];
    const attempts: Attempt[] = [
      mkAttempt('p1', 'direct-lake', false),
      mkAttempt('p2', 'direct-lake-fallback', false),
      mkAttempt('p3', 'direct-lake-framing', false),
      mkAttempt('p4', 'direct-lake-onelake', false)
    ];
    const ids = buildRemediation(bank, attempts, { size: 4 });
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain('p5'); // kql should not be picked when DL family is the weak area
    // Should pull from the direct-lake family (p1..p4)
    for (const id of ids) {
      expect(['p1', 'p2', 'p3', 'p4']).toContain(id);
    }
  });

  test('cold-start (no attempts) returns mid-difficulty unseen questions', () => {
    const bank: Question[] = [
      mkQ('q1', 'direct-lake'),
      mkQ('q2', 'kql'),
      mkQ('q3', 'security-rls')
    ];
    const ids = buildRemediation(bank, [], { size: 10 });
    // Without attempts, cold-start path returns up to size from the bank
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(10);
  });
});
