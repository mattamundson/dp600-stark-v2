import { describe, expect, test } from 'vitest';
import {
  DEFAULT_STREAK_MIN_ATTEMPTS,
  getStreakMinAttempts,
  studyStreak,
  todayStats
} from '../src/features/dashboard/streak';
import type { Attempt, Settings } from '../src/lib/schema';

function attempt(overrides: Partial<Attempt>): Attempt {
  return {
    id: 'a-' + Math.random().toString(36).slice(2),
    questionId: 'q-001',
    sessionId: 'sess',
    ts: Date.now(),
    selectedOptionIds: ['a'],
    correct: true,
    latencyMs: 1000,
    confidence: 'sure',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 3,
    ...overrides
  };
}

const NOW = new Date('2026-05-06T15:00:00').getTime();
const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const todayMs = startOfDay(NOW);
const dayMs = (offsetDays: number) => todayMs - offsetDays * 86_400_000;

describe('todayStats', () => {
  test('returns zeroed stats when no attempts', () => {
    const s = todayStats([], NOW);
    expect(s.attemptsToday).toBe(0);
    expect(s.correctToday).toBe(0);
    expect(s.accuracyToday).toBe(0);
  });

  test('counts only today\'s attempts and computes accuracy', () => {
    const attempts: Attempt[] = [
      attempt({ ts: dayMs(0) + 1000, correct: true }),
      attempt({ ts: dayMs(0) + 2000, correct: true }),
      attempt({ ts: dayMs(0) + 3000, correct: false }),
      attempt({ ts: dayMs(1), correct: true }), // yesterday — excluded
      attempt({ ts: dayMs(7), correct: false }) // last week — excluded
    ];
    const s = todayStats(attempts, NOW);
    expect(s.attemptsToday).toBe(3);
    expect(s.correctToday).toBe(2);
    expect(s.accuracyToday).toBeCloseTo(2 / 3);
  });
});

describe('studyStreak', () => {
  test('returns 0 when no attempts', () => {
    expect(studyStreak([], NOW)).toBe(0);
  });

  test('returns 0 when neither today nor yesterday qualifies', () => {
    const attempts: Attempt[] = Array.from({ length: 20 }, (_, i) =>
      attempt({ ts: dayMs(5) + i * 1000 })
    );
    expect(studyStreak(attempts, NOW, 10)).toBe(0);
  });

  test('counts a 3-day streak ending today', () => {
    const make = (offset: number) =>
      Array.from({ length: 12 }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    const attempts: Attempt[] = [...make(0), ...make(1), ...make(2)];
    expect(studyStreak(attempts, NOW, 10)).toBe(3);
  });

  test('anchors at yesterday if today is partial', () => {
    const make = (offset: number, n = 12) =>
      Array.from({ length: n }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    const attempts: Attempt[] = [
      ...make(0, 5), // today only 5 attempts — does not qualify
      ...make(1),
      ...make(2)
    ];
    expect(studyStreak(attempts, NOW, 10)).toBe(2);
  });

  test('breaks streak at the first non-qualifying day', () => {
    const make = (offset: number, n = 12) =>
      Array.from({ length: n }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    const attempts: Attempt[] = [
      ...make(0),
      ...make(1),
      ...make(2, 3), // gap (only 3 attempts)
      ...make(3),
      ...make(4)
    ];
    expect(studyStreak(attempts, NOW, 10)).toBe(2);
  });

  test('respects custom minAttempts threshold', () => {
    const make = (offset: number, n: number) =>
      Array.from({ length: n }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    const attempts: Attempt[] = [...make(0, 5), ...make(1, 5), ...make(2, 5)];
    expect(studyStreak(attempts, NOW, 5)).toBe(3);
    expect(studyStreak(attempts, NOW, 10)).toBe(0);
  });

  test('low threshold (5) qualifies sparser days as streak days', () => {
    const make = (offset: number, n: number) =>
      Array.from({ length: n }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    // 4 consecutive days each with 6 attempts. Threshold 5 => streak of 4.
    const attempts: Attempt[] = [
      ...make(0, 6),
      ...make(1, 6),
      ...make(2, 6),
      ...make(3, 6)
    ];
    expect(studyStreak(attempts, NOW, 5)).toBe(4);
  });

  test('high threshold (15) only counts days at or above 15 attempts', () => {
    const make = (offset: number, n: number) =>
      Array.from({ length: n }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    // 3 consecutive days, sizes 16, 14, 20. Threshold 15 breaks at day 1
    // (size 14 < 15), so streak anchored at today is 1.
    const attempts: Attempt[] = [...make(0, 16), ...make(1, 14), ...make(2, 20)];
    expect(studyStreak(attempts, NOW, 15)).toBe(1);
  });

  test('extreme threshold (100) returns 0 for normal volume', () => {
    const make = (offset: number, n: number) =>
      Array.from({ length: n }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    const attempts: Attempt[] = [...make(0, 50), ...make(1, 50), ...make(2, 50)];
    expect(studyStreak(attempts, NOW, 100)).toBe(0);
  });

  test('threshold 100 with 100+ attempts each day counts the streak', () => {
    const make = (offset: number, n: number) =>
      Array.from({ length: n }, (_, i) => attempt({ ts: dayMs(offset) + i * 1000 }));
    const attempts: Attempt[] = [...make(0, 100), ...make(1, 105), ...make(2, 200)];
    expect(studyStreak(attempts, NOW, 100)).toBe(3);
  });
});

describe('getStreakMinAttempts', () => {
  const baseSettings: Settings = {
    theme: 'dark',
    startedAtIso: '2026-01-01T00:00:00.000Z',
    reduceMotion: false,
    showTimer: true,
    beepOnFinalMinute: false
  };

  test('returns default (10) when settings is null', () => {
    expect(getStreakMinAttempts(null)).toBe(DEFAULT_STREAK_MIN_ATTEMPTS);
    expect(getStreakMinAttempts(null)).toBe(10);
  });

  test('returns default (10) when settings is undefined', () => {
    expect(getStreakMinAttempts(undefined)).toBe(10);
  });

  test('returns default (10) when streakMinAttempts is unset', () => {
    expect(getStreakMinAttempts(baseSettings)).toBe(10);
  });

  test('returns the configured value when valid', () => {
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: 5 })).toBe(5);
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: 25 })).toBe(25);
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: 1 })).toBe(1);
  });

  test('floors fractional values', () => {
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: 7.9 })).toBe(7);
  });

  test('falls back to default when value < 1', () => {
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: 0 })).toBe(10);
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: -3 })).toBe(10);
  });

  test('falls back to default when value is NaN or Infinity', () => {
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: Number.NaN })).toBe(10);
    expect(getStreakMinAttempts({ ...baseSettings, streakMinAttempts: Number.POSITIVE_INFINITY })).toBe(10);
  });
});
