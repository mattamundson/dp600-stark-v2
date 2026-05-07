import { describe, expect, test } from 'vitest';
import {
  DAY_MS,
  evaluateRetentionDrill,
  getRetentionDue,
  selectRetentionDrill,
} from '../src/features/missed/retention-loop';
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
      { id: 'B', text: 'option B' },
    ],
    correctOptionIds: ['A'],
    explanation: `Explanation for ${id}`,
    sourceAnchor: { category: 'test', note: 'n/a' },
    tags: [],
  };
}

let _seq = 0;
function mkAttempt(
  questionId: string,
  subtopic: string,
  correct: boolean,
  ts: number,
  opts: Partial<Attempt> = {}
): Attempt {
  _seq += 1;
  return {
    id: `a-${_seq}`,
    questionId,
    sessionId: 'sess-1',
    ts,
    selectedOptionIds: correct ? ['A'] : ['B'],
    correct,
    latencyMs: 30_000,
    confidence: 'unsure',
    domain: 'semantic',
    subtopic,
    difficulty: 2,
    ...opts,
  };
}

const NOW = 1_700_000_000_000; // arbitrary fixed "now" for deterministic tests

/* ─── getRetentionDue ─────────────────────────────────────────────── */

describe('getRetentionDue', () => {
  test('empty resolved map → empty due list', () => {
    expect(getRetentionDue({}, [], NOW)).toEqual([]);
  });

  test('resolved 5 days ago, no attempts since → due', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const resolved = { 'direct-lake': resolvedAt };
    const result = getRetentionDue(resolved, [], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].subtopic).toBe('direct-lake');
    expect(result[0].resolvedAt).toBe(resolvedAt);
    expect(result[0].daysSinceResolved).toBe(5);
  });

  test('resolved 5 days ago, user re-attempted since → not due', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const resolved = { 'direct-lake': resolvedAt };
    const attempts = [
      // attempt 1 day ago — well after resolution
      mkAttempt('q1', 'direct-lake', true, NOW - 1 * DAY_MS),
    ];
    const result = getRetentionDue(resolved, attempts, NOW);
    expect(result).toEqual([]);
  });

  test('resolved 1 day ago (under threshold) → not due', () => {
    const resolved = { 'direct-lake': NOW - 1 * DAY_MS };
    const result = getRetentionDue(resolved, [], NOW);
    expect(result).toEqual([]);
  });

  test('attempts in OTHER subtopics do not block due-ness', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const resolved = { 'direct-lake': resolvedAt };
    const attempts = [
      // user has been studying KQL since resolving direct-lake
      mkAttempt('q1', 'kql', true, NOW - 1 * DAY_MS),
    ];
    const result = getRetentionDue(resolved, attempts, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].subtopic).toBe('direct-lake');
  });

  test('multiple due subtopics sorted oldest-resolution first', () => {
    const resolved = {
      'direct-lake': NOW - 4 * DAY_MS,
      kql: NOW - 9 * DAY_MS,
      'storage-modes': NOW - 6 * DAY_MS,
    };
    const result = getRetentionDue(resolved, [], NOW);
    expect(result.map((r) => r.subtopic)).toEqual(['kql', 'storage-modes', 'direct-lake']);
  });

  test('custom daysAfterResolve threshold honored', () => {
    const resolved = { 'direct-lake': NOW - 2 * DAY_MS };
    expect(getRetentionDue(resolved, [], NOW, 5)).toEqual([]); // 2 < 5
    expect(getRetentionDue(resolved, [], NOW, 1)).toHaveLength(1); // 2 >= 1
  });

  test('non-numeric / zero resolvedAt entries are skipped defensively', () => {
    // Cast through unknown — exercises runtime guard against malformed persisted state.
    const resolved = {
      'direct-lake': 0,
      kql: 'oops',
      'storage-modes': NOW - 5 * DAY_MS,
    } as unknown as Record<string, number>;
    const result = getRetentionDue(resolved, [], NOW);
    expect(result.map((r) => r.subtopic)).toEqual(['storage-modes']);
  });
});

/* ─── selectRetentionDrill ────────────────────────────────────────── */

describe('selectRetentionDrill', () => {
  test('empty bank for subtopic → empty drill', () => {
    expect(selectRetentionDrill('ghost', [], [])).toEqual([]);
  });

  test('count <= 0 → empty', () => {
    const qs = [mkQ('q1', 'direct-lake')];
    expect(selectRetentionDrill('direct-lake', qs, [], 0)).toEqual([]);
  });

  test('prefers previously-wrong questions over correct/unseen', () => {
    const qs = [
      mkQ('q-correct', 'direct-lake'),
      mkQ('q-wrong-old', 'direct-lake'),
      mkQ('q-unseen', 'direct-lake'),
      mkQ('q-wrong-recent', 'direct-lake'),
    ];
    const attempts = [
      mkAttempt('q-correct', 'direct-lake', true, NOW - 10 * DAY_MS),
      mkAttempt('q-wrong-old', 'direct-lake', false, NOW - 9 * DAY_MS),
      mkAttempt('q-wrong-recent', 'direct-lake', false, NOW - 1 * DAY_MS),
    ];
    const drill = selectRetentionDrill('direct-lake', qs, attempts, 3);
    expect(drill.map((q) => q.id)).toEqual([
      'q-wrong-recent', // freshest miss first
      'q-wrong-old',
      'q-correct', // seen-but-correct beats unseen
    ]);
  });

  test('falls back to seen-correct then unseen when no misses', () => {
    const qs = [
      mkQ('q-unseen', 'direct-lake'),
      mkQ('q-seen', 'direct-lake'),
    ];
    const attempts = [mkAttempt('q-seen', 'direct-lake', true, NOW - 1 * DAY_MS)];
    const drill = selectRetentionDrill('direct-lake', qs, attempts, 2);
    expect(drill.map((q) => q.id)).toEqual(['q-seen', 'q-unseen']);
  });

  test('respects count cap when pool exceeds count', () => {
    const qs = Array.from({ length: 6 }, (_, i) => mkQ(`q${i}`, 'direct-lake'));
    const drill = selectRetentionDrill('direct-lake', qs, [], 3);
    expect(drill).toHaveLength(3);
  });

  test('returns fewer than count when subtopic pool is small', () => {
    const qs = [mkQ('q1', 'direct-lake')];
    const drill = selectRetentionDrill('direct-lake', qs, [], 3);
    expect(drill).toHaveLength(1);
  });

  test('ignores attempts on questions in other subtopics', () => {
    const qs = [mkQ('q1', 'direct-lake')];
    const attempts = [mkAttempt('q1', 'kql', false, NOW - 1 * DAY_MS)];
    const drill = selectRetentionDrill('direct-lake', qs, attempts, 3);
    // q1 should not be considered "previously wrong" since the recorded miss
    // was in a different subtopic.
    expect(drill).toHaveLength(1);
    expect(drill[0].id).toBe('q1');
  });

  test('most-recent miss wins when same q has both correct + wrong attempts', () => {
    const qs = [
      mkQ('q-flip', 'direct-lake'),
      mkQ('q-other-correct', 'direct-lake'),
    ];
    const attempts = [
      mkAttempt('q-flip', 'direct-lake', false, NOW - 5 * DAY_MS),
      mkAttempt('q-flip', 'direct-lake', true, NOW - 1 * DAY_MS),
      mkAttempt('q-other-correct', 'direct-lake', true, NOW - 10 * DAY_MS),
    ];
    const drill = selectRetentionDrill('direct-lake', qs, attempts, 2);
    // q-flip still appears in previously-wrong because it has any miss in history.
    expect(drill[0].id).toBe('q-flip');
    expect(drill[1].id).toBe('q-other-correct');
  });
});

/* ─── evaluateRetentionDrill ──────────────────────────────────────── */

describe('evaluateRetentionDrill', () => {
  test('no post-resolve attempts → null', () => {
    expect(evaluateRetentionDrill('direct-lake', [], NOW - 5 * DAY_MS)).toBeNull();
  });

  test('fewer than minAttempts post-resolve → null', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const attempts = [
      mkAttempt('q1', 'direct-lake', true, NOW - 1 * DAY_MS),
      mkAttempt('q2', 'direct-lake', true, NOW - 1 * DAY_MS),
    ];
    expect(evaluateRetentionDrill('direct-lake', attempts, resolvedAt)).toBeNull();
  });

  test('3 post-resolve attempts all correct → returns latest ts', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const tsLatest = NOW - 1 * DAY_MS;
    const attempts = [
      mkAttempt('q1', 'direct-lake', true, NOW - 3 * DAY_MS),
      mkAttempt('q2', 'direct-lake', true, NOW - 2 * DAY_MS),
      mkAttempt('q3', 'direct-lake', true, tsLatest),
    ];
    expect(evaluateRetentionDrill('direct-lake', attempts, resolvedAt)).toBe(tsLatest);
  });

  test('3 post-resolve attempts, 2 of 3 correct (66%) → null (under 80% threshold)', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const attempts = [
      mkAttempt('q1', 'direct-lake', true, NOW - 3 * DAY_MS),
      mkAttempt('q2', 'direct-lake', true, NOW - 2 * DAY_MS),
      mkAttempt('q3', 'direct-lake', false, NOW - 1 * DAY_MS),
    ];
    expect(evaluateRetentionDrill('direct-lake', attempts, resolvedAt)).toBeNull();
  });

  test('attempts before resolvedAt are ignored', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const attempts = [
      // before resolve — should not count
      mkAttempt('q1', 'direct-lake', true, NOW - 9 * DAY_MS),
      mkAttempt('q2', 'direct-lake', true, NOW - 8 * DAY_MS),
      // after resolve — only one
      mkAttempt('q3', 'direct-lake', true, NOW - 1 * DAY_MS),
    ];
    expect(evaluateRetentionDrill('direct-lake', attempts, resolvedAt)).toBeNull();
  });

  test('ignores other subtopics', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const attempts = [
      mkAttempt('q1', 'kql', true, NOW - 3 * DAY_MS),
      mkAttempt('q2', 'kql', true, NOW - 2 * DAY_MS),
      mkAttempt('q3', 'kql', true, NOW - 1 * DAY_MS),
    ];
    expect(evaluateRetentionDrill('direct-lake', attempts, resolvedAt)).toBeNull();
  });
});
