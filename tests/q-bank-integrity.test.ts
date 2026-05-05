// Bank integrity unit tests — fast assertions on the question bank and
// scenario list shape. Catches dev-mode breakage before the QA report runs.
//
// These overlap with `pnpm qa` semantically but run in milliseconds during
// `pnpm test`, so test-suite failure surfaces bank corruption immediately.

import { describe, expect, test } from 'vitest';
import { questionBank } from '../src/data/questions';
import { scenarios } from '../src/data/scenarios';

describe('question bank integrity', () => {
  test('all question ids are unique', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const q of questionBank) {
      if (seen.has(q.id)) dupes.push(q.id);
      seen.add(q.id);
    }
    expect(dupes).toEqual([]);
  });

  test('every relatedIds reference points to a real question', () => {
    const ids = new Set(questionBank.map((q) => q.id));
    const dangling: { from: string; to: string }[] = [];
    for (const q of questionBank) {
      if (!q.relatedIds) continue;
      for (const rid of q.relatedIds) {
        if (!ids.has(rid)) dangling.push({ from: q.id, to: rid });
      }
    }
    expect(dangling).toEqual([]);
  });

  test('no relatedIds points at itself', () => {
    const selfLoops = questionBank
      .filter((q) => q.relatedIds?.includes(q.id))
      .map((q) => q.id);
    expect(selfLoops).toEqual([]);
  });

  test('every choice question has correctOptionIds AND options', () => {
    const broken: string[] = [];
    for (const q of questionBank) {
      if (q.type === 'ordering') continue;
      if (!q.options || q.options.length === 0) broken.push(`${q.id}: no options`);
      if (!q.correctOptionIds || q.correctOptionIds.length === 0) broken.push(`${q.id}: no correctOptionIds`);
    }
    expect(broken).toEqual([]);
  });

  test('every ordering question has correctOrder matching options length', () => {
    const broken: string[] = [];
    for (const q of questionBank) {
      if (q.type !== 'ordering') continue;
      if (!q.options || !q.correctOrder || q.correctOrder.length !== q.options.length) {
        broken.push(q.id);
      }
    }
    expect(broken).toEqual([]);
  });

  test('every scenario has at least 2 questions referencing it', () => {
    const counts: Record<string, number> = {};
    for (const q of questionBank) {
      if (q.scenarioId) counts[q.scenarioId] = (counts[q.scenarioId] ?? 0) + 1;
    }
    const thin = scenarios.filter((s) => (counts[s.id] ?? 0) < 2).map((s) => s.id);
    expect(thin).toEqual([]);
  });

  test('every scenario.questionIds entry resolves to a real question', () => {
    const ids = new Set(questionBank.map((q) => q.id));
    const missing: string[] = [];
    for (const s of scenarios) {
      for (const qid of s.questionIds) {
        if (!ids.has(qid)) missing.push(`${s.id} → ${qid}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('every scenario-typed question has scenarioId set', () => {
    const broken = questionBank
      .filter((q) => (q.type === 'scenario-single' || q.type === 'scenario-multi') && !q.scenarioId)
      .map((q) => q.id);
    expect(broken).toEqual([]);
  });

  test('domain blueprint guard rails — Maintain at least 25%', () => {
    const total = questionBank.length;
    const maint = questionBank.filter((q) => q.domain === 'maintain').length;
    const pct = (maint / total) * 100;
    expect(pct).toBeGreaterThanOrEqual(25);
  });
});
