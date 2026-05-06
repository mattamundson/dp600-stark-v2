import { describe, expect, test } from 'vitest';
import { pacingTrend } from '../src/features/analytics/engine';
import type { Attempt, Session } from '../src/lib/schema';

function mkSession(id: string, mode: Session['mode'], startedAt: number, finishedAt: number | undefined = startedAt + 60_000): Session {
  return { id, mode, startedAt, finishedAt, questionIds: [] };
}

function mkAttempt(sessionId: string, latencyMs: number, ts = Date.now()): Attempt {
  return {
    id: `a-${Math.random()}`,
    questionId: 'q1',
    sessionId,
    ts,
    selectedOptionIds: ['a'],
    correct: true,
    latencyMs,
    confidence: 'sure',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 2
  };
}

describe('pacingTrend', () => {
  test('returns empty for no sessions', () => {
    expect(pacingTrend([], [])).toEqual([]);
  });

  test('skips sessions with zero-latency attempts', () => {
    const sessions = [mkSession('s1', 'simulation', 1000)];
    const attempts = [mkAttempt('s1', 0), mkAttempt('s1', 0)];
    expect(pacingTrend(attempts, sessions)).toEqual([]);
  });

  test('computes median per session and sorts chronologically', () => {
    const sessions = [
      mkSession('s2', 'quiz-25', 2000),
      mkSession('s1', 'quiz-25', 1000)
    ];
    const attempts = [
      mkAttempt('s1', 30_000),
      mkAttempt('s1', 60_000),
      mkAttempt('s1', 90_000),
      mkAttempt('s2', 40_000),
      mkAttempt('s2', 80_000)
    ];
    const trend = pacingTrend(attempts, sessions);
    expect(trend).toHaveLength(2);
    expect(trend[0].sessionId).toBe('s1');
    expect(trend[0].medianMs).toBe(60_000);
    expect(trend[0].attempts).toBe(3);
    expect(trend[1].sessionId).toBe('s2');
    expect(trend[1].medianMs).toBe(60_000);
    expect(trend[1].attempts).toBe(2);
  });

  test('caps results at n most recent finished sessions', () => {
    const sessions = Array.from({ length: 15 }, (_, i) =>
      mkSession(`s${i}`, 'quiz-25', i * 1000, i * 1000 + 500)
    );
    const attempts = sessions.flatMap((s) => [mkAttempt(s.id, 50_000), mkAttempt(s.id, 70_000)]);
    const trend = pacingTrend(attempts, sessions, 5);
    expect(trend).toHaveLength(5);
    expect(trend[0].sessionId).toBe('s10');
    expect(trend[4].sessionId).toBe('s14');
  });

  test('skips unfinished sessions', () => {
    const sessions: Session[] = [
      mkSession('s1', 'simulation', 1000, 2000),
      { id: 's2', mode: 'simulation', startedAt: 3000, questionIds: [] }
    ];
    const attempts = [mkAttempt('s1', 60_000), mkAttempt('s2', 60_000)];
    const trend = pacingTrend(attempts, sessions);
    expect(trend).toHaveLength(1);
    expect(trend[0].sessionId).toBe('s1');
  });

  test('handles even-count median via two-element average', () => {
    const sessions = [mkSession('s1', 'quiz-25', 1000)];
    const attempts = [
      mkAttempt('s1', 40_000),
      mkAttempt('s1', 60_000),
      mkAttempt('s1', 80_000),
      mkAttempt('s1', 100_000)
    ];
    const trend = pacingTrend(attempts, sessions);
    expect(trend[0].medianMs).toBe(70_000);
  });
});
