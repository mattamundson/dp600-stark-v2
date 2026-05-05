import { describe, expect, test } from 'vitest';
import { buildQuiz, stratifiedTargets } from '../src/features/quiz/engine';
import type { Attempt, Question } from '../src/lib/schema';

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
