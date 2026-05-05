// Simulation engine tests — high-stakes path because exam-day correctness
// depends on it. Covers session creation, answer recording, flag toggling,
// auto-submit at time-up, and grading round-trip.

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  newSimulationSession,
  recordAnswer,
  setCursor,
  toggleFlag,
  submitSimulation,
  SIMULATION_QUESTIONS,
  SIMULATION_MS
} from '../src/features/simulation/engine';
import type { Question } from '../src/lib/schema';
import { wipeAll } from '../src/lib/storage/db';

function mkBank(n: number): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `bq-${String(i).padStart(3, '0')}`,
    type: 'single' as const,
    domain: (['maintain', 'prepare', 'semantic'] as const)[i % 3],
    subtopic: 'storage-modes',
    difficulty: 3 as const,
    prompt: `Question ${i}`,
    options: [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' }
    ],
    correctOptionIds: ['A'],
    explanation: `Because ${i}`,
    sourceAnchor: { category: 'x', note: 'y' },
    tags: []
  }));
}

describe('simulation engine', () => {
  beforeEach(async () => {
    await wipeAll();
  });
  afterEach(async () => {
    await wipeAll();
  });

  test('newSimulationSession creates a session with the right shape', () => {
    const bank = mkBank(80);
    const s = newSimulationSession(bank);
    expect(s.mode).toBe('simulation');
    expect(s.questionIds.length).toBeLessThanOrEqual(SIMULATION_QUESTIONS);
    expect(s.snapshot?.timeRemainingMs).toBe(SIMULATION_MS);
    expect(s.snapshot?.submitted).toBe(false);
    expect(s.snapshot?.answers).toEqual({});
  });

  test('recordAnswer accumulates without overwriting confidence', () => {
    const bank = mkBank(80);
    const s0 = newSimulationSession(bank);
    const qid = s0.questionIds[0];
    const s1 = recordAnswer(s0, qid, { selectedOptionIds: ['A'] }, SIMULATION_MS - 1000);
    const s2 = recordAnswer(s1, qid, { confidence: 'sure' }, SIMULATION_MS - 2000);
    expect(s2.snapshot?.answers[qid]).toEqual({
      selectedOptionIds: ['A'],
      confidence: 'sure'
    });
    expect(s2.snapshot?.timeRemainingMs).toBe(SIMULATION_MS - 2000);
  });

  test('toggleFlag adds and removes', () => {
    const bank = mkBank(80);
    const s0 = newSimulationSession(bank);
    const qid = s0.questionIds[0];
    const s1 = toggleFlag(s0, qid);
    expect(s1.snapshot?.flagged).toContain(qid);
    const s2 = toggleFlag(s1, qid);
    expect(s2.snapshot?.flagged).not.toContain(qid);
  });

  test('setCursor updates the cursor', () => {
    const bank = mkBank(80);
    const s0 = newSimulationSession(bank);
    const s1 = setCursor(s0, 7);
    expect(s1.snapshot?.cursor).toBe(7);
  });

  test('submitSimulation grades answered questions and skips unanswered', async () => {
    const bank = mkBank(80);
    const s0 = newSimulationSession(bank);
    // Answer the first 3 with mixed correctness
    let s = recordAnswer(s0, s0.questionIds[0], { selectedOptionIds: ['A'], confidence: 'sure' }, SIMULATION_MS - 1000);
    s = recordAnswer(s, s0.questionIds[1], { selectedOptionIds: ['B'], confidence: 'guess' }, SIMULATION_MS - 2000);
    s = recordAnswer(s, s0.questionIds[2], { selectedOptionIds: ['A'], confidence: 'unsure' }, SIMULATION_MS - 3000);

    const out = await submitSimulation(s, bank);
    expect(out.attempts).toHaveLength(3);
    expect(out.attempts[0].correct).toBe(true);   // chose A, correct is A
    expect(out.attempts[1].correct).toBe(false);  // chose B, correct is A
    expect(out.attempts[2].correct).toBe(true);
    expect(out.session.snapshot?.submitted).toBe(true);
    expect(out.session.finishedAt).toBeDefined();
    // unanswered count = total - answered
    expect(out.result.unanswered).toBe(s.questionIds.length - 3);
  });

  test('auto-submit at time-up: records timeRemainingMs=0 and submits with whatever was answered', async () => {
    const bank = mkBank(80);
    const s0 = newSimulationSession(bank);
    let s = recordAnswer(s0, s0.questionIds[0], { selectedOptionIds: ['A'], confidence: 'sure' }, 60_000);
    // Time hits 0 — record one more answer at the wire, then submit.
    s = recordAnswer(s, s0.questionIds[1], { selectedOptionIds: ['B'] }, 0);
    expect(s.snapshot?.timeRemainingMs).toBe(0);
    const out = await submitSimulation(s, bank);
    // 2 answered → 2 attempts logged
    expect(out.attempts).toHaveLength(2);
    expect(out.result.durationMs).toBe(SIMULATION_MS);
  });

  test('submitSimulation throws if snapshot is missing', async () => {
    const bank = mkBank(80);
    const broken = { id: 'x', mode: 'simulation' as const, startedAt: Date.now(), questionIds: [] };
    await expect(submitSimulation(broken, bank)).rejects.toThrow('No snapshot');
  });
});
