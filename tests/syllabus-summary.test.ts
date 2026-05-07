// Pure-logic tests for the syllabus summary roll-up.
//
// Synthetic question/flashcard/scenario fixtures keep the math obvious
// regardless of how the live bank evolves. Coverage status thresholds
// live in syllabus-summary.ts (in-range / near ±5 pp / out-of-range).

import { describe, expect, test } from 'vitest';
import type { Question, Flashcard, Scenario } from '../src/lib/schema';
import {
  getSyllabusSummary,
  classifyCoverage,
  coverageDelta,
  formatPercent,
  formatBlueprintRange,
  BLUEPRINT_RANGE
} from '../src/features/syllabus/syllabus-summary';

function q(id: string, domain: Question['domain'], subtopic: string): Question {
  return {
    id,
    type: 'single',
    domain,
    subtopic,
    difficulty: 3,
    prompt: `prompt-${id}`,
    options: [
      { id: 'a', text: 'a' },
      { id: 'b', text: 'b' }
    ],
    correctOptionIds: ['a'],
    explanation: 'because',
    sourceAnchor: { category: 'test', note: 'test' },
    tags: [subtopic]
  };
}

function fc(id: string, deck: Flashcard['deck'], tags: string[]): Flashcard {
  return {
    id,
    deck,
    front: `front-${id}`,
    back: `back-${id}`,
    tags,
    difficulty: 3,
    sourceAnchor: { category: 'test', note: 'test' }
  };
}

function scn(id: string, domain: Scenario['domain'], tags: string[] = []): Scenario {
  return {
    id,
    title: `t-${id}`,
    domain,
    business: 'biz',
    prompt: 'p',
    questionIds: [],
    tags
  };
}

/**
 * Build a 20-Q synthetic bank where the actual share roughly hits the
 * Microsoft blueprint targets (Maintain 25-30%, Prepare 45-50%, Semantic 25-30%).
 *  - 5 maintain (25%)  → in-range
 *  - 10 prepare (50%)  → in-range (top edge)
 *  - 5 semantic (25%)  → in-range
 */
function buildBalancedBank(): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < 5; i++) out.push(q(`m-${i}`, 'maintain', 'governance'));
  for (let i = 0; i < 10; i++) out.push(q(`p-${i}`, 'prepare', i < 6 ? 'kql' : 'lakehouse'));
  for (let i = 0; i < 5; i++) out.push(q(`s-${i}`, 'semantic', 'direct-lake'));
  return out;
}

describe('classifyCoverage', () => {
  test('in-range when actual sits inside blueprint', () => {
    expect(classifyCoverage(0.27, BLUEPRINT_RANGE.maintain)).toBe('in-range');
    expect(classifyCoverage(0.46, BLUEPRINT_RANGE.prepare)).toBe('in-range');
  });

  test('near when within 5 pp of nearest edge', () => {
    expect(classifyCoverage(0.22, BLUEPRINT_RANGE.maintain)).toBe('near');  // 3 pp under 25%
    expect(classifyCoverage(0.34, BLUEPRINT_RANGE.maintain)).toBe('near');  // 4 pp over 30%
  });

  test('out-of-range when more than 5 pp from edge', () => {
    expect(classifyCoverage(0.10, BLUEPRINT_RANGE.maintain)).toBe('out-of-range');
    expect(classifyCoverage(0.80, BLUEPRINT_RANGE.maintain)).toBe('out-of-range');
  });
});

describe('coverageDelta', () => {
  test('returns 0 when in range', () => {
    expect(coverageDelta(0.27, BLUEPRINT_RANGE.maintain)).toBe(0);
  });
  test('returns negative when under', () => {
    expect(coverageDelta(0.20, BLUEPRINT_RANGE.maintain)).toBeCloseTo(-0.05, 6);
  });
  test('returns positive when over', () => {
    expect(coverageDelta(0.40, BLUEPRINT_RANGE.maintain)).toBeCloseTo(0.10, 6);
  });
});

describe('getSyllabusSummary', () => {
  test('totals reflect raw lengths', () => {
    const s = getSyllabusSummary(
      buildBalancedBank(),
      [fc('f1', 'direct-lake', ['direct-lake'])],
      [scn('sc1', 'prepare')]
    );
    expect(s.totalQ).toBe(20);
    expect(s.totalFc).toBe(1);
    expect(s.totalScn).toBe(1);
  });

  test('domain percent math is correct', () => {
    const s = getSyllabusSummary(buildBalancedBank(), [], []);
    const maintain = s.domains.find((d) => d.domain === 'maintain')!;
    const prepare = s.domains.find((d) => d.domain === 'prepare')!;
    const semantic = s.domains.find((d) => d.domain === 'semantic')!;
    expect(maintain.actual).toBeCloseTo(0.25, 6);
    expect(prepare.actual).toBeCloseTo(0.50, 6);
    expect(semantic.actual).toBeCloseTo(0.25, 6);
  });

  test('balanced bank → all three domains classified in-range', () => {
    const s = getSyllabusSummary(buildBalancedBank(), [], []);
    for (const d of s.domains) expect(d.status).toBe('in-range');
  });

  test('skewed bank surfaces out-of-range domain', () => {
    // 10 semantic, 0 of the others → semantic = 100%, prepare 0% (way under).
    const skewed: Question[] = [];
    for (let i = 0; i < 10; i++) skewed.push(q(`s-${i}`, 'semantic', 'direct-lake'));
    const s = getSyllabusSummary(skewed, [], []);
    const prepare = s.domains.find((d) => d.domain === 'prepare')!;
    const semantic = s.domains.find((d) => d.domain === 'semantic')!;
    expect(prepare.status).toBe('out-of-range');
    expect(semantic.status).toBe('out-of-range');
    expect(prepare.delta).toBeLessThan(0);
    expect(semantic.delta).toBeGreaterThan(0);
  });

  test('subtopics are sorted descending by qCount', () => {
    const bank: Question[] = [];
    for (let i = 0; i < 3; i++) bank.push(q(`p-a-${i}`, 'prepare', 'kql'));
    for (let i = 0; i < 7; i++) bank.push(q(`p-b-${i}`, 'prepare', 'lakehouse'));
    const s = getSyllabusSummary(bank, [], []);
    const prepare = s.domains.find((d) => d.domain === 'prepare')!;
    expect(prepare.subtopics.map((r) => r.subtopic)).toEqual(['lakehouse', 'kql']);
    expect(prepare.subtopics[0].qCount).toBe(7);
    expect(prepare.subtopics[1].qCount).toBe(3);
  });

  test('flashcards are bucketed into a domain via tag/deck hints', () => {
    const bank = buildBalancedBank();
    const flashcards: Flashcard[] = [
      fc('f-dl', 'direct-lake', ['direct-lake']),
      fc('f-gov', 'security-governance', ['governance']),
      fc('f-kql', 'kql', ['kql']),
    ];
    const s = getSyllabusSummary(bank, flashcards, []);
    const maintain = s.domains.find((d) => d.domain === 'maintain')!;
    const prepare = s.domains.find((d) => d.domain === 'prepare')!;
    const semantic = s.domains.find((d) => d.domain === 'semantic')!;
    expect(maintain.fcCount).toBe(1);
    expect(prepare.fcCount).toBe(1);
    expect(semantic.fcCount).toBe(1);
  });

  test('scenarios are bucketed by their explicit domain', () => {
    const s = getSyllabusSummary(
      buildBalancedBank(),
      [],
      [scn('a', 'maintain'), scn('b', 'maintain'), scn('c', 'prepare')]
    );
    const maintain = s.domains.find((d) => d.domain === 'maintain')!;
    const prepare = s.domains.find((d) => d.domain === 'prepare')!;
    expect(maintain.scnCount).toBe(2);
    expect(prepare.scnCount).toBe(1);
  });

  test('per-subtopic flashcard count uses tag overlap', () => {
    const bank: Question[] = [q('q1', 'semantic', 'direct-lake')];
    const flashcards = [
      fc('f1', 'direct-lake', ['direct-lake']),
      fc('f2', 'direct-lake-traps', ['direct-lake']),
      fc('f3', 'kql', ['kql'])
    ];
    const s = getSyllabusSummary(bank, flashcards, []);
    const semantic = s.domains.find((d) => d.domain === 'semantic')!;
    const dlRow = semantic.subtopics.find((r) => r.subtopic === 'direct-lake')!;
    expect(dlRow.fcCount).toBe(2);
  });

  test('handles empty bank without divide-by-zero', () => {
    const s = getSyllabusSummary([], [], []);
    expect(s.totalQ).toBe(0);
    for (const d of s.domains) {
      expect(d.actual).toBe(0);
      expect(Number.isFinite(d.actual)).toBe(true);
    }
  });
});

describe('formatters', () => {
  test('formatPercent rounds to 1 decimal', () => {
    expect(formatPercent(0.275)).toBe('27.5%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(1)).toBe('100.0%');
  });

  test('formatBlueprintRange uses en-dash and integer percents', () => {
    expect(formatBlueprintRange(BLUEPRINT_RANGE.maintain)).toBe('25–30%');
    expect(formatBlueprintRange(BLUEPRINT_RANGE.prepare)).toBe('45–50%');
  });
});
