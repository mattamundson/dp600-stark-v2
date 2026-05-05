import { describe, expect, test } from 'vitest';
import { initialSrs, review, MIN_EASE, INITIAL_EASE } from '../src/lib/scoring/srs';

const now0 = 1_700_000_000_000;

describe('SRS', () => {
  test('initial state is due now', () => {
    const s = initialSrs('c1', now0);
    expect(s.due).toBe(now0);
    expect(s.ease).toBe(INITIAL_EASE);
    expect(s.reps).toBe(0);
  });
  test('first good review schedules 1 day out', () => {
    const s = review(initialSrs('c1', now0), 4, now0);
    expect(s.reps).toBe(1);
    expect(s.interval).toBe(1);
    expect(s.due).toBe(now0 + 86_400_000);
  });
  test('second good review jumps to 6 days', () => {
    const s1 = review(initialSrs('c1', now0), 4, now0);
    const s2 = review(s1, 4, s1.due);
    expect(s2.reps).toBe(2);
    expect(s2.interval).toBe(6);
  });
  test('forgot resets and shortens', () => {
    const s1 = review(initialSrs('c1', now0), 4, now0);
    const s2 = review(s1, 0, s1.due);
    expect(s2.reps).toBe(0);
    expect(s2.interval).toBe(0);
    expect(s2.lapses).toBe(1);
    expect(s2.due).toBe(s1.due + 10 * 60_000);
  });
  test('ease floor honored', () => {
    let s = initialSrs('c1', now0);
    for (let i = 0; i < 30; i++) s = review(s, 0, s.due);
    expect(s.ease).toBe(MIN_EASE);
  });
});
