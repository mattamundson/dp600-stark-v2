import { describe, expect, test } from 'vitest';
import { groupMissedAttempts } from '../src/features/analytics/missed-patterns';
import type { Attempt, Question } from '../src/lib/schema';

/* ─── Helpers ─────────────────────────────────────────────────────── */

function mkQ(id: string, subtopic: string, domain: Question['domain'] = 'semantic'): Question {
  return {
    id,
    type: 'single',
    domain,
    subtopic,
    difficulty: 2,
    prompt: `Prompt for ${id}`,
    options: [
      { id: 'A', text: 'option A' },
      { id: 'B', text: 'option B' }
    ],
    correctOptionIds: ['A'],
    explanation: `Explanation for ${id}`,
    sourceAnchor: { category: 'test', note: 'n/a' },
    tags: []
  };
}

let _seq = 0;
function mkAttempt(
  questionId: string,
  subtopic: string,
  correct: boolean,
  confidence: Attempt['confidence'] = 'unsure',
  opts: Partial<Attempt> = {}
): Attempt {
  _seq += 1;
  return {
    id: `a-${_seq}`,
    questionId,
    sessionId: 'sess-1',
    ts: Date.now() - _seq * 1000,
    selectedOptionIds: correct ? ['A'] : ['B'],
    correct,
    latencyMs: 30_000,
    confidence,
    domain: 'semantic',
    subtopic,
    difficulty: 2,
    ...opts
  };
}

/* ─── Tests ─────────────────────────────────────────────────────────  */

describe('groupMissedAttempts', () => {
  test('empty input → empty array', () => {
    const result = groupMissedAttempts([], []);
    expect(result).toEqual([]);
  });

  test('empty attempts with questions → empty array', () => {
    const questions = [mkQ('q1', 'direct-lake')];
    expect(groupMissedAttempts([], questions)).toEqual([]);
  });

  test('single subtopic with 3 misses + 7 correct → 1 group, 70% accuracy', () => {
    const questions = [
      mkQ('q1', 'direct-lake'),
      mkQ('q2', 'direct-lake'),
      mkQ('q3', 'direct-lake')
    ];
    const attempts: Attempt[] = [
      // 3 incorrect
      mkAttempt('q1', 'direct-lake', false),
      mkAttempt('q2', 'direct-lake', false),
      mkAttempt('q3', 'direct-lake', false),
      // 7 correct — same questions re-answered correctly
      ...Array.from({ length: 7 }, (_, i) =>
        mkAttempt(`q${(i % 3) + 1}`, 'direct-lake', true)
      )
    ];
    const result = groupMissedAttempts(attempts, questions);
    expect(result).toHaveLength(1);
    expect(result[0].subtopic).toBe('direct-lake');
    expect(result[0].missCount).toBe(3);
    expect(result[0].totalCount).toBe(10);
    expect(result[0].accuracy).toBeCloseTo(0.7);
  });

  test('multiple subtopics → sorted by missCount desc', () => {
    const questions = [
      mkQ('q1', 'kql'),
      mkQ('q2', 'kql'),
      mkQ('q3', 'kql'),
      mkQ('q4', 'direct-lake'),
      mkQ('q5', 'deployment-pipelines')
    ];
    const attempts: Attempt[] = [
      // kql: 1 miss
      mkAttempt('q1', 'kql', false),
      mkAttempt('q2', 'kql', true),
      mkAttempt('q3', 'kql', true),
      // direct-lake: 3 misses
      mkAttempt('q4', 'direct-lake', false),
      mkAttempt('q4', 'direct-lake', false),
      mkAttempt('q4', 'direct-lake', false),
      // deployment-pipelines: 2 misses
      mkAttempt('q5', 'deployment-pipelines', false),
      mkAttempt('q5', 'deployment-pipelines', false),
      mkAttempt('q5', 'deployment-pipelines', true)
    ];
    const result = groupMissedAttempts(attempts, questions);
    expect(result).toHaveLength(3);
    expect(result[0].subtopic).toBe('direct-lake');     // 3 misses
    expect(result[1].subtopic).toBe('deployment-pipelines'); // 2 misses
    expect(result[2].subtopic).toBe('kql');             // 1 miss
  });

  test('tie in missCount → lower accuracy comes first', () => {
    const questions = [
      mkQ('q1', 'topic-a'),
      mkQ('q2', 'topic-b')
    ];
    const attempts: Attempt[] = [
      // topic-a: 2 misses out of 2 (0% accuracy) — should rank first
      mkAttempt('q1', 'topic-a', false),
      mkAttempt('q1', 'topic-a', false),
      // topic-b: 2 misses out of 4 (50% accuracy)
      mkAttempt('q2', 'topic-b', false),
      mkAttempt('q2', 'topic-b', false),
      mkAttempt('q2', 'topic-b', true),
      mkAttempt('q2', 'topic-b', true)
    ];
    const result = groupMissedAttempts(attempts, questions);
    expect(result).toHaveLength(2);
    expect(result[0].subtopic).toBe('topic-a');
    expect(result[0].accuracy).toBeCloseTo(0);
    expect(result[1].subtopic).toBe('topic-b');
    expect(result[1].accuracy).toBeCloseTo(0.5);
  });

  test('confident-miss flag set correctly', () => {
    const questions = [mkQ('q1', 'dax'), mkQ('q2', 'dax')];
    const attempts: Attempt[] = [
      mkAttempt('q1', 'dax', false, 'sure'),    // confident miss → isConfidentMiss = true
      mkAttempt('q2', 'dax', false, 'unsure'),  // not confident miss
      mkAttempt('q1', 'dax', false, 'guess')    // guess miss → not confident
    ];
    const result = groupMissedAttempts(attempts, questions);
    expect(result).toHaveLength(1);
    const misses = result[0].recentMisses;

    const confidentMiss = misses.find((m) => m.questionId === 'q1' && m.confidence === 'sure');
    const unsureMiss = misses.find((m) => m.questionId === 'q2');
    const guessMiss = misses.find((m) => m.questionId === 'q1' && m.confidence === 'guess');

    expect(confidentMiss?.isConfidentMiss).toBe(true);
    expect(unsureMiss?.isConfidentMiss).toBe(false);
    expect(guessMiss?.isConfidentMiss).toBe(false);
  });

  test('cap at top 15 subtopics', () => {
    // Create 20 unique subtopics each with 1 miss.
    const questions = Array.from({ length: 20 }, (_, i) => mkQ(`q${i}`, `subtopic-${i}`));
    const attempts: Attempt[] = questions.map((q) =>
      mkAttempt(q.id, q.subtopic, false)
    );
    const result = groupMissedAttempts(attempts, questions);
    expect(result.length).toBeLessThanOrEqual(15);
  });

  test('recentMisses capped at 5 per subtopic', () => {
    const questions = [mkQ('q1', 'storage-modes')];
    const attempts: Attempt[] = Array.from({ length: 8 }, () =>
      mkAttempt('q1', 'storage-modes', false)
    );
    const result = groupMissedAttempts(attempts, questions);
    expect(result).toHaveLength(1);
    expect(result[0].recentMisses.length).toBeLessThanOrEqual(5);
  });

  test('misses for unknown question ids are excluded from recentMisses', () => {
    const questions = [mkQ('q-known', 'direct-lake')];
    const attempts: Attempt[] = [
      mkAttempt('q-known', 'direct-lake', false),
      mkAttempt('q-ghost', 'direct-lake', false) // no matching question in bank
    ];
    const result = groupMissedAttempts(attempts, questions);
    expect(result).toHaveLength(1);
    expect(result[0].missCount).toBe(2);  // both count toward stats
    // But only the known question appears in recentMisses
    expect(result[0].recentMisses.every((m) => m.questionId === 'q-known')).toBe(true);
  });

  test('subtopics with zero misses are excluded from output', () => {
    const questions = [mkQ('q1', 'fabric-arch'), mkQ('q2', 'kql')];
    const attempts: Attempt[] = [
      mkAttempt('q1', 'fabric-arch', true),  // correct only
      mkAttempt('q2', 'kql', false)           // has a miss
    ];
    const result = groupMissedAttempts(attempts, questions);
    expect(result).toHaveLength(1);
    expect(result[0].subtopic).toBe('kql');
  });
});
