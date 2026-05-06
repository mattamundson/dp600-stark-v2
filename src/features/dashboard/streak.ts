// Pure-function engines for the Dashboard "Today's progress" panel.
// All time arithmetic operates on a caller-provided `now` so behavior
// is deterministic and trivially testable without time mocks.

import type { Attempt } from '../../lib/schema';

export interface TodayStats {
  attemptsToday: number;
  correctToday: number;
  /** 0..1; 0 when no attempts today */
  accuracyToday: number;
}

/**
 * Counts attempts whose timestamp falls inside the local-clock day of `now`.
 */
export function todayStats(attempts: Attempt[], now: number): TodayStats {
  const startOfToday = startOfDay(now);
  const todays = attempts.filter((a) => a.ts >= startOfToday);
  const correct = todays.filter((a) => a.correct).length;
  return {
    attemptsToday: todays.length,
    correctToday: correct,
    accuracyToday: todays.length > 0 ? correct / todays.length : 0
  };
}

/**
 * Current daily streak in days. A "study day" requires at least
 * `minAttempts` attempts on that local-clock day.
 *
 * Streak anchors at today if it qualifies; otherwise at yesterday so
 * a partial today doesn't penalize a fresh log. Counts back day by day
 * until a non-qualifying day is hit.
 *
 * Returns 0 if neither today nor yesterday qualifies.
 */
export function studyStreak(attempts: Attempt[], now: number, minAttempts = 10): number {
  if (attempts.length === 0) return 0;
  const counts = bucketByDay(attempts);
  const todayMs = startOfDay(now);
  const yesterdayMs = todayMs - 86_400_000;
  const todayQualifies = (counts.get(dayKey(todayMs)) ?? 0) >= minAttempts;
  const yesterdayQualifies = (counts.get(dayKey(yesterdayMs)) ?? 0) >= minAttempts;
  if (!todayQualifies && !yesterdayQualifies) return 0;
  let cursorMs = todayQualifies ? todayMs : yesterdayMs;
  let count = 0;
  while ((counts.get(dayKey(cursorMs)) ?? 0) >= minAttempts) {
    count++;
    cursorMs -= 86_400_000;
  }
  return count;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  // Local-date key (YYYY-MM-DD) — independent of UTC offset so day boundaries
  // line up with the user's calendar day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bucketByDay(attempts: Attempt[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of attempts) {
    const k = dayKey(a.ts);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export interface DailyCount {
  /** YYYY-MM-DD local-date key */
  date: string;
  /** Day-of-month (1-31) for compact rendering */
  dayOfMonth: number;
  count: number;
}

/**
 * Returns the last `days` days of attempt counts, oldest first. Days with
 * zero attempts are present with count=0 (so the renderer can produce a
 * fixed-width heatmap regardless of activity).
 */
export function dailyAttemptCounts(attempts: Attempt[], now: number, days = 14): DailyCount[] {
  const counts = bucketByDay(attempts);
  const out: DailyCount[] = [];
  const startMs = startOfDay(now) - (days - 1) * 86_400_000;
  for (let i = 0; i < days; i++) {
    const ms = startMs + i * 86_400_000;
    const k = dayKey(ms);
    out.push({
      date: k,
      dayOfMonth: new Date(ms).getDate(),
      count: counts.get(k) ?? 0
    });
  }
  return out;
}
