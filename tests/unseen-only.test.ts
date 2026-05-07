import { describe, expect, test } from 'vitest';
import { getUnseenQuestionIds, selectUnseenQuiz } from '../src/features/quiz/unseen-only';
import type { Attempt, Domain, Question } from '../src/lib/schema';

let _seq = 0;
function mkQ(domain: Domain, idSuffix?: string): Question {
  _seq += 1;
  return {
    id: `${domain}-q-${idSuffix ?? _seq}`,
    type: 'single',
    domain,
    subtopic: `${domain}-sub`,
    difficulty: 3,
    prompt: 'p',
    options: [
      { id: 'A', text: 'a' },
      { id: 'B', text: 'b' }
    ],
    correctOptionIds: ['A'],
    explanation: 'e',
    sourceAnchor: { category: 'x', note: 'y' },
    tags: []
  };
}

let _aSeq = 0;
function mkAttempt(questionId: string): Attempt {
  _aSeq += 1;
  return {
    id: `a${_aSeq}`,
    questionId,
    sessionId: 's1',
    ts: Date.now() - _aSeq * 1000,
    selectedOptionIds: ['A'],
    correct: true,
    latencyMs: 30_000,
    confidence: 'sure',
    domain: 'prepare',
    subtopic: 'sub',
    difficulty: 3
  };
}

function mkBank(prepare = 10, maintain = 10, semantic = 10): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < prepare; i++) out.push(mkQ('prepare', `p${i}`));
  for (let i = 0; i < maintain; i++) out.push(mkQ('maintain', `m${i}`));
  for (let i = 0; i < semantic; i++) out.push(mkQ('semantic', `s${i}`));
  return out;
}

describe('getUnseenQuestionIds', () => {
  test('returns every id when attempts is empty', () => {
    const bank = mkBank(3, 2, 2);
    const ids = getUnseenQuestionIds(bank, []);
    expect(ids).toHaveLength(7);
    expect(new Set(ids)).toEqual(new Set(bank.map((q) => q.id)));
  });

  test('returns only unattempted ids when some attempts exist', () => {
    const bank = mkBank(3, 2, 2);
    const seenIds = [bank[0].id, bank[1].id, bank[5].id];
    const attempts = seenIds.map(mkAttempt);
    const ids = getUnseenQuestionIds(bank, attempts);
    expect(ids).toHaveLength(4);
    for (const sid of seenIds) expect(ids).not.toContain(sid);
  });

  test('returns empty array when every question has been attempted', () => {
    const bank = mkBank(2, 2, 2);
    const attempts = bank.map((q) => mkAttempt(q.id));
    expect(getUnseenQuestionIds(bank, attempts)).toEqual([]);
  });

  test('multiple attempts on the same question are deduplicated', () => {
    const bank = mkBank(2, 0, 0);
    const attempts = [mkAttempt(bank[0].id), mkAttempt(bank[0].id), mkAttempt(bank[0].id)];
    const ids = getUnseenQuestionIds(bank, attempts);
    expect(ids).toEqual([bank[1].id]);
  });
});

describe('selectUnseenQuiz', () => {
  test('returns empty when no unseen questions remain', () => {
    const bank = mkBank(2, 2, 2);
    const attempts = bank.map((q) => mkAttempt(q.id));
    const picked = selectUnseenQuiz(bank, attempts, 25);
    expect(picked).toEqual([]);
  });

  test('returns count when bank has enough unseen', () => {
    const bank = mkBank(15, 15, 15); // 45 unseen
    const picked = selectUnseenQuiz(bank, [], 25);
    expect(picked).toHaveLength(25);
    // Every picked question must be from the bank
    const bankIds = new Set(bank.map((q) => q.id));
    for (const q of picked) expect(bankIds.has(q.id)).toBe(true);
  });

  test('returns at most as many as exist when supply is short', () => {
    const bank = mkBank(5, 5, 5); // 15 unseen
    const picked = selectUnseenQuiz(bank, [], 25);
    expect(picked).toHaveLength(15);
  });

  test('biases distribution toward even split across domains when supply allows', () => {
    // With 30 prepare / 10 maintain / 10 semantic and a target of 24,
    // an even split would be 8/8/8. The function should pick close to that
    // rather than 24/0/0 (which a naive random sample would tend toward).
    const bank = mkBank(30, 10, 10);
    const picked = selectUnseenQuiz(bank, [], 24);
    expect(picked).toHaveLength(24);
    const counts: Record<Domain, number> = { prepare: 0, maintain: 0, semantic: 0 };
    for (const q of picked) counts[q.domain]++;
    // Each domain should get exactly its share (8) when bank supply allows.
    expect(counts.prepare).toBe(8);
    expect(counts.maintain).toBe(8);
    expect(counts.semantic).toBe(8);
  });

  test('overflows from larger pools when one domain is short', () => {
    // 20 prepare / 2 maintain / 20 semantic, target 24.
    // Even target would want 8/8/8 — maintain only has 2, so 6 overflow
    // to other domains. We check we still hit the count and the pickable
    // domains all contribute.
    const bank = mkBank(20, 2, 20);
    const picked = selectUnseenQuiz(bank, [], 24);
    expect(picked).toHaveLength(24);
    const counts: Record<Domain, number> = { prepare: 0, maintain: 0, semantic: 0 };
    for (const q of picked) counts[q.domain]++;
    expect(counts.maintain).toBe(2); // took everything available
    expect(counts.prepare + counts.semantic).toBe(22);
  });

  test('skips already-seen questions even when bank has plenty', () => {
    const bank = mkBank(10, 10, 10);
    // Mark all 10 prepare as seen.
    const attempts = bank.filter((q) => q.domain === 'prepare').map((q) => mkAttempt(q.id));
    const picked = selectUnseenQuiz(bank, attempts, 18);
    expect(picked).toHaveLength(18);
    for (const q of picked) expect(q.domain).not.toBe('prepare');
  });

  test('honours count=0 by returning empty', () => {
    const bank = mkBank(10, 10, 10);
    expect(selectUnseenQuiz(bank, [], 0)).toEqual([]);
  });

  test('default count is 25', () => {
    const bank = mkBank(15, 15, 15);
    const picked = selectUnseenQuiz(bank, []);
    expect(picked).toHaveLength(25);
  });
});
