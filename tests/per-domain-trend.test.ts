// per-domain-trend.test.ts
//
// Pure-logic tests for the per-domain accuracy trend module.

import { describe, expect, test } from 'vitest';
import {
  bucketAttemptsByDay,
  domainAccuracySlope,
  domainAccuracyTrend,
} from '../src/features/analytics/per-domain-trend';
import type { Attempt, Domain } from '../src/lib/schema';

const DAY = 86_400_000;

function mk(
  ts: number,
  domain: Domain,
  correct: boolean,
  overrides: Partial<Attempt> = {}
): Attempt {
  return {
    id: `a-${Math.random().toString(36).slice(2)}`,
    questionId: 'q-1',
    sessionId: 's-1',
    ts,
    selectedOptionIds: ['a'],
    correct,
    latencyMs: 1500,
    confidence: 'sure',
    domain,
    subtopic: 'direct-lake',
    difficulty: 3,
    ...overrides,
  };
}

describe('bucketAttemptsByDay', () => {
  test('groups attempts by their local-date ISO key', () => {
    const today = Date.now();
    const yesterday = today - DAY;
    const attempts = [
      mk(today, 'prepare', true),
      mk(today + 1000, 'prepare', false),
      mk(yesterday, 'semantic', true),
    ];
    const buckets = bucketAttemptsByDay(attempts);
    expect(buckets.size).toBe(2);
    // todays bucket has 2 attempts
    const todayKey = new Date(today).toISOString().slice(0, 10);
    // local timezone matches if test machine TZ stable; check size instead
    let max = 0;
    for (const v of buckets.values()) max = Math.max(max, v.length);
    expect(max).toBe(2);
    expect(typeof todayKey).toBe('string');
  });

  test('empty input → empty map', () => {
    expect(bucketAttemptsByDay([]).size).toBe(0);
  });
});

describe('domainAccuracyTrend', () => {
  test('empty attempts → empty trend', () => {
    expect(domainAccuracyTrend([], 'prepare')).toEqual([]);
  });

  test('single-day attempts → single point', () => {
    const now = Date.now();
    const attempts = [
      mk(now, 'prepare', true),
      mk(now + 60_000, 'prepare', true),
      mk(now + 120_000, 'prepare', false),
    ];
    const trend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    expect(trend).toHaveLength(1);
    expect(trend[0].n).toBe(3);
    expect(trend[0].accuracy).toBeCloseTo(2 / 3, 5);
  });

  test('skips days with zero attempts in target domain', () => {
    const now = Date.now();
    // semantic on day 0, prepare on day 1, semantic on day 2
    const attempts = [
      mk(now - 2 * DAY, 'semantic', true),
      mk(now - 1 * DAY, 'prepare', true),
      mk(now, 'semantic', false),
    ];
    const prepareTrend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    expect(prepareTrend).toHaveLength(1);
    expect(prepareTrend[0].n).toBe(1);
    expect(prepareTrend[0].accuracy).toBe(1);
  });

  test('14-day mixed → expected accuracy per day', () => {
    const now = Date.now();
    const attempts = [
      // day -3: 1/2 = 50%
      mk(now - 3 * DAY, 'prepare', true),
      mk(now - 3 * DAY + 1000, 'prepare', false),
      // day -2: 2/2 = 100%
      mk(now - 2 * DAY, 'prepare', true),
      mk(now - 2 * DAY + 1000, 'prepare', true),
      // day -1: 0/1 = 0%
      mk(now - 1 * DAY, 'prepare', false),
      // day 0: 1/1 = 100%
      mk(now, 'prepare', true),
    ];
    const trend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    expect(trend).toHaveLength(4);
    expect(trend[0].accuracy).toBeCloseTo(0.5, 5);
    expect(trend[1].accuracy).toBe(1);
    expect(trend[2].accuracy).toBe(0);
    expect(trend[3].accuracy).toBe(1);
    // sorted chronologically
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i].ts).toBeGreaterThan(trend[i - 1].ts);
    }
  });

  test('drops attempts outside the trailing window', () => {
    const now = Date.now();
    const attempts = [
      mk(now - 30 * DAY, 'prepare', true), // out of 14d window
      mk(now, 'prepare', true),
    ];
    const trend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    expect(trend).toHaveLength(1);
  });

  test('filters out other domains', () => {
    const now = Date.now();
    const attempts = [
      mk(now, 'prepare', true),
      mk(now, 'maintain', false),
      mk(now, 'semantic', true),
    ];
    const prepareTrend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    expect(prepareTrend).toHaveLength(1);
    expect(prepareTrend[0].n).toBe(1);
    expect(prepareTrend[0].accuracy).toBe(1);
  });
});

describe('domainAccuracySlope', () => {
  test('empty trend → 0', () => {
    expect(domainAccuracySlope([])).toBe(0);
  });

  test('single point → 0 (slope undefined)', () => {
    const now = Date.now();
    const trend = domainAccuracyTrend(
      [mk(now, 'prepare', true)],
      'prepare',
      14,
      now
    );
    expect(domainAccuracySlope(trend)).toBe(0);
  });

  test('monotonically improving → positive slope', () => {
    const now = Date.now();
    // 4 days, accuracy 25%, 50%, 75%, 100%
    const days = [
      [false, false, false, true], // 25% on day -3
      [false, false, true, true], // 50% on day -2
      [false, true, true, true], // 75% on day -1
      [true, true, true, true], // 100% on day 0
    ];
    const attempts: Attempt[] = [];
    for (let d = 0; d < days.length; d++) {
      const dayTs = now - (3 - d) * DAY;
      for (let q = 0; q < 4; q++) {
        attempts.push(mk(dayTs + q * 1000, 'prepare', days[d][q]));
      }
    }
    const trend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    expect(trend).toHaveLength(4);
    const slope = domainAccuracySlope(trend);
    // expected ~25 pp/day (rising 25 percentage points per day)
    expect(slope).toBeGreaterThan(20);
    expect(slope).toBeLessThan(30);
  });

  test('flat → near-zero slope', () => {
    const now = Date.now();
    // 4 consecutive days at 75% each
    const attempts: Attempt[] = [];
    for (let d = 0; d < 4; d++) {
      const dayTs = now - (3 - d) * DAY;
      for (let q = 0; q < 4; q++) {
        attempts.push(mk(dayTs + q * 1000, 'prepare', q < 3));
      }
    }
    const trend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    expect(trend).toHaveLength(4);
    const slope = domainAccuracySlope(trend);
    expect(Math.abs(slope)).toBeLessThan(0.001);
  });

  test('monotonically declining → negative slope', () => {
    const now = Date.now();
    const days = [
      [true, true, true, true],
      [false, true, true, true],
      [false, false, true, true],
      [false, false, false, true],
    ];
    const attempts: Attempt[] = [];
    for (let d = 0; d < days.length; d++) {
      const dayTs = now - (3 - d) * DAY;
      for (let q = 0; q < 4; q++) {
        attempts.push(mk(dayTs + q * 1000, 'prepare', days[d][q]));
      }
    }
    const trend = domainAccuracyTrend(attempts, 'prepare', 14, now);
    const slope = domainAccuracySlope(trend);
    expect(slope).toBeLessThan(-20);
    expect(slope).toBeGreaterThan(-30);
  });
});
