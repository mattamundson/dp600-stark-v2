import { describe, expect, test } from 'vitest';
import { buildQuiz, stratifiedTargets } from '../src/features/quiz/engine';
import { emphasisDecrementPatch } from '../src/features/quiz/session';
import type { Attempt, Question, Settings } from '../src/lib/schema';

function mkSettings(em?: Settings['emphasisMode']): Settings {
  return {
    theme: 'dark',
    startedAtIso: '2026-05-01T00:00:00Z',
    reduceMotion: false,
    showTimer: true,
    beepOnFinalMinute: true,
    emphasisMode: em
  };
}

function mk(n: number, dom: Question['domain'], sub: string): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${dom}-${sub}-${i}`,
    type: 'single' as const,
    domain: dom,
    subtopic: sub,
    difficulty: 3 as const,
    prompt: `q${i}`,
    options: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }],
    correctOptionIds: ['A'],
    explanation: '',
    sourceAnchor: { category: 'x', note: 'y' },
    tags: []
  }));
}

const bank: Question[] = [
  ...mk(20, 'prepare', 'architecture'),
  ...mk(20, 'prepare', 'kql'),
  ...mk(15, 'maintain', 'deployment'),
  ...mk(15, 'semantic', 'storage-modes')
];

describe('quiz engine', () => {
  test('stratifiedTargets sums to size', () => {
    for (const n of [10, 12, 25, 28, 50, 65]) {
      const t = stratifiedTargets(n);
      expect(t.maintain + t.prepare + t.semantic).toBe(n);
    }
  });

  test('produces exactly the requested count', () => {
    const ids = buildQuiz(bank, [], { size: 12, seed: 1 });
    expect(ids.length).toBe(12);
    expect(new Set(ids).size).toBe(12);
  });

  test('roughly hits blueprint distribution at size 65', () => {
    const ids = buildQuiz(bank, [], { size: 65, seed: 7, mode: 'simulation' });
    const lookup = new Map(bank.map((q) => [q.id, q.domain]));
    const counts = { maintain: 0, prepare: 0, semantic: 0 };
    for (const id of ids) counts[lookup.get(id) as keyof typeof counts] += 1;
    // prepare ≈ 47.5% of 65 = 31, allow ±3
    expect(Math.abs(counts.prepare - 31)).toBeLessThanOrEqual(3);
  });

  test('emphasisMode skews stratified targets toward chosen domain', () => {
    const baseline = stratifiedTargets(28);
    const emphasized = stratifiedTargets(28, mkSettings({
      domain: 'prepare',
      expiresAt: Date.now() + 7 * 86_400_000,
      sessionsRemaining: 5
    }));
    expect(emphasized.maintain + emphasized.prepare + emphasized.semantic).toBe(28);
    expect(emphasized.prepare).toBeGreaterThan(baseline.prepare);
    expect(emphasized.maintain).toBeLessThanOrEqual(baseline.maintain);
    expect(emphasized.semantic).toBeLessThanOrEqual(baseline.semantic);
    // +0.15 to prepare on a 0.475 base → prepare share ≈ 0.625 → ~17-18 of 28
    expect(emphasized.prepare).toBeGreaterThanOrEqual(16);
  });

  test('emphasisMode ignored when simulation mode', () => {
    const settings = mkSettings({
      domain: 'prepare',
      expiresAt: Date.now() + 7 * 86_400_000,
      sessionsRemaining: 5
    });
    const ids = buildQuiz(bank, [], { size: 65, seed: 7, mode: 'simulation', settings });
    const lookup = new Map(bank.map((q) => [q.id, q.domain]));
    const counts = { maintain: 0, prepare: 0, semantic: 0 };
    for (const id of ids) counts[lookup.get(id) as keyof typeof counts] += 1;
    // Simulation must keep blueprint mix; emphasis must NOT skew it
    expect(Math.abs(counts.prepare - 31)).toBeLessThanOrEqual(3);
  });

  test('emphasisMode ignored when expired', () => {
    const expired = stratifiedTargets(28, mkSettings({
      domain: 'prepare',
      expiresAt: Date.now() - 1, // already expired
      sessionsRemaining: 5
    }));
    const baseline = stratifiedTargets(28);
    expect(expired).toEqual(baseline);
  });

  test('emphasisMode ignored when sessionsRemaining=0', () => {
    const used = stratifiedTargets(28, mkSettings({
      domain: 'prepare',
      expiresAt: Date.now() + 7 * 86_400_000,
      sessionsRemaining: 0
    }));
    const baseline = stratifiedTargets(28);
    expect(used).toEqual(baseline);
  });

  test('weakness biases adaptive selection', () => {
    const wrongDirectLake: Attempt[] = Array.from({ length: 8 }, (_, i) => ({
      id: `a${i}`,
      questionId: `prepare-architecture-${i}`,
      sessionId: 's',
      ts: Date.now(),
      selectedOptionIds: ['B'],
      correct: false,
      latencyMs: 30000,
      confidence: 'sure',
      domain: 'prepare',
      subtopic: 'architecture',
      difficulty: 3
    }));
    const ids = buildQuiz(bank, wrongDirectLake, { size: 28, seed: 1, mode: 'adaptive' });
    const archCount = ids.filter((id) => id.startsWith('prepare-architecture')).length;
    const kqlCount = ids.filter((id) => id.startsWith('prepare-kql')).length;
    expect(archCount).toBeGreaterThan(0); // weak topic surfaces
    expect(archCount + kqlCount).toBeGreaterThan(0);
  });
});

describe('emphasisDecrementPatch', () => {
  test('returns null when no emphasisMode', () => {
    expect(emphasisDecrementPatch(mkSettings(undefined))).toBeNull();
    expect(emphasisDecrementPatch(null)).toBeNull();
  });

  test('clears emphasisMode when expired', () => {
    const patch = emphasisDecrementPatch(mkSettings({
      domain: 'prepare',
      expiresAt: Date.now() - 1,
      sessionsRemaining: 3
    }));
    expect(patch).toEqual({ emphasisMode: undefined });
  });

  test('clears emphasisMode when sessionsRemaining is 1 (last use)', () => {
    const patch = emphasisDecrementPatch(mkSettings({
      domain: 'maintain',
      expiresAt: Date.now() + 86_400_000,
      sessionsRemaining: 1
    }));
    expect(patch).toEqual({ emphasisMode: undefined });
  });

  test('decrements sessionsRemaining when above 1', () => {
    const em = {
      domain: 'semantic' as const,
      expiresAt: Date.now() + 7 * 86_400_000,
      sessionsRemaining: 5
    };
    const patch = emphasisDecrementPatch(mkSettings(em));
    expect(patch).toEqual({
      emphasisMode: { ...em, sessionsRemaining: 4 }
    });
  });
});
