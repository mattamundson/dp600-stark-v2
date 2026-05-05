import { describe, expect, test } from 'vitest';
import {
  pacingSummary,
  TARGET_PER_Q_MS_HIGH,
  PACING_YELLOW_CEILING_MS,
  PROJECTION_QUESTIONS
} from '../src/features/analytics/engine';
import type { Attempt, Session } from '../src/lib/schema';

function mkAttempt(sessionId: string, latencyMs: number, opts: Partial<Attempt> = {}): Attempt {
  return {
    id: `a-${Math.random()}`,
    questionId: 'q',
    sessionId,
    ts: Date.now(),
    selectedOptionIds: ['A'],
    correct: true,
    latencyMs,
    confidence: 'unsure',
    domain: 'prepare',
    subtopic: 'kql',
    difficulty: 3,
    ...opts
  };
}

function mkSession(id: string, mode: Session['mode']): Session {
  return {
    id,
    mode,
    startedAt: Date.now(),
    questionIds: []
  };
}

describe('pacingSummary', () => {
  test('returns insufficient when not enough data', () => {
    const sessions = [mkSession('s1', 'quiz-25')];
    const attempts: Attempt[] = [
      mkAttempt('s1', 90_000),
      mkAttempt('s1', 95_000)
    ];
    const out = pacingSummary(attempts, sessions);
    expect(out.adaptive.status).toBe('insufficient');
    expect(out.overall.status).toBe('insufficient');
  });

  test('classifies green when avg < TARGET_PER_Q_MS_HIGH', () => {
    const sessions = [mkSession('s1', 'quiz-25')];
    const attempts = Array.from({ length: 10 }, (_, i) =>
      mkAttempt('s1', 100_000 + i * 1000)
    );
    const out = pacingSummary(attempts, sessions);
    expect(out.adaptive.status).toBe('green');
    expect(out.adaptive.avgMs).toBeLessThan(TARGET_PER_Q_MS_HIGH);
  });

  test('classifies yellow when avg between high target and yellow ceiling', () => {
    const sessions = [mkSession('s1', 'quiz-25')];
    const yellowAvg = (TARGET_PER_Q_MS_HIGH + PACING_YELLOW_CEILING_MS) / 2;
    const attempts = Array.from({ length: 10 }, () => mkAttempt('s1', yellowAvg));
    const out = pacingSummary(attempts, sessions);
    expect(out.adaptive.status).toBe('yellow');
  });

  test('classifies red when projection blows the budget', () => {
    const sessions = [mkSession('s1', 'quiz-25')];
    const redAvg = PACING_YELLOW_CEILING_MS + 10_000; // > 3:00 per Q
    const attempts = Array.from({ length: 10 }, () => mkAttempt('s1', redAvg));
    const out = pacingSummary(attempts, sessions);
    expect(out.adaptive.status).toBe('red');
    // 65 Q × 3:10 ≈ 205 minutes
    expect(out.adaptive.projectionMinutes).toBeGreaterThan(100);
  });

  test('simulation source falls back to overall when sim latency=0', () => {
    // Simulation engine writes latencyMs=0 by design (engine.ts:97). Make sure
    // we don't surface a 0:00 avg/Q for users who only run simulations.
    const sessions = [mkSession('sim1', 'simulation')];
    const attempts = Array.from({ length: 10 }, () =>
      mkAttempt('sim1', 0, { sessionId: 'sim1' })
    );
    const adaptiveSession = mkSession('q1', 'quiz-25');
    sessions.push(adaptiveSession);
    const adaptiveAttempts = Array.from({ length: 10 }, () =>
      mkAttempt('q1', 105_000)
    );
    const out = pacingSummary([...attempts, ...adaptiveAttempts], sessions);
    expect(out.simulationOrAll.source).toBe('simulation');
    // Should NOT be 0 — should fall back to overall (adaptive) avg
    expect(out.simulationOrAll.avgMs).toBeGreaterThan(0);
  });

  test('byDomain captures per-domain avg', () => {
    const sessions = [mkSession('s1', 'quiz-25')];
    const attempts = [
      ...Array.from({ length: 5 }, () => mkAttempt('s1', 90_000, { domain: 'prepare', subtopic: 'kql' })),
      ...Array.from({ length: 5 }, () => mkAttempt('s1', 150_000, { domain: 'maintain', subtopic: 'deployment-pipelines' })),
      ...Array.from({ length: 5 }, () => mkAttempt('s1', 60_000, { domain: 'semantic', subtopic: 'direct-lake' }))
    ];
    const out = pacingSummary(attempts, sessions);
    const prep = out.byDomain.find((d) => d.domain === 'prepare')!;
    const maint = out.byDomain.find((d) => d.domain === 'maintain')!;
    const sem = out.byDomain.find((d) => d.domain === 'semantic')!;
    expect(prep.avgMs).toBe(90_000);
    expect(maint.avgMs).toBe(150_000);
    expect(sem.avgMs).toBe(60_000);
  });

  test('projection uses PROJECTION_QUESTIONS constant', () => {
    const sessions = [mkSession('s1', 'quiz-25')];
    const attempts = Array.from({ length: 10 }, () => mkAttempt('s1', 120_000));
    const out = pacingSummary(attempts, sessions);
    // 120s × 65 = 7800s = 130 min
    expect(Math.round(out.adaptive.projectionMinutes)).toBe(Math.round((120_000 * PROJECTION_QUESTIONS) / 60_000));
  });
});
