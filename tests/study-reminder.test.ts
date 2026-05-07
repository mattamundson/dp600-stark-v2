// study-reminder.test.ts — pure-logic tests for the nightly study-reminder
// banner. The banner shell is tested separately in study-reminder-banner.test.tsx.

import { describe, expect, test } from 'vitest';
import {
  ATTEMPT_DEBT_DAYS,
  DISMISS_TTL_MS,
  REMINDER_WINDOW_DAYS,
  SIM_DEBT_DAYS,
  getStudyReminderState,
} from '../src/components/study-reminder';
import type { Attempt, Session } from '../src/lib/schema';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-05-07T15:00:00Z').getTime();

let _seq = 0;
function mkAttempt(ts: number): Attempt {
  _seq += 1;
  return {
    id: `a-${_seq}`,
    questionId: 'q1',
    sessionId: 'sess-1',
    ts,
    selectedOptionIds: ['A'],
    correct: true,
    latencyMs: 30_000,
    confidence: 'unsure',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 2,
  };
}

function mkSim(opts: { startedAt: number; finishedAt?: number }): Session {
  _seq += 1;
  return {
    id: `s-${_seq}`,
    mode: 'simulation',
    startedAt: opts.startedAt,
    finishedAt: opts.finishedAt,
    questionIds: ['q1'],
  };
}

/** Build an ISO date string `daysFromNow` away from NOW, YYYY-MM-DD shape. */
function isoDateDaysFromNow(daysFromNow: number): string {
  const d = new Date(NOW + daysFromNow * DAY_MS);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

describe('getStudyReminderState', () => {
  test('returns null when no exam date is set', () => {
    const r = getStudyReminderState({
      examDateIso: undefined,
      sessions: [],
      attempts: [],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).toBeNull();
  });

  test('returns null when exam date is in the past', () => {
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(-2),
      sessions: [],
      attempts: [],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).toBeNull();
  });

  test('returns null when exam is more than 14 days away', () => {
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(REMINDER_WINDOW_DAYS + 16),
      sessions: [],
      attempts: [],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).toBeNull();
  });

  test('returns null when exam is in window but recent activity exists', () => {
    // Exam 7 days away, sim finished 1d ago, attempt 1d ago → no debt.
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(7),
      sessions: [mkSim({ startedAt: NOW - 2 * DAY_MS, finishedAt: NOW - 1 * DAY_MS })],
      attempts: [mkAttempt(NOW - 1 * DAY_MS)],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).toBeNull();
  });

  test('returns sim CTA when no sim in 5 days but attempts are recent', () => {
    // Exam 7 days away, last sim 5d ago (≥3d debt), attempt 1d ago.
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(7),
      sessions: [
        mkSim({ startedAt: NOW - 6 * DAY_MS, finishedAt: NOW - 5 * DAY_MS }),
      ],
      attempts: [mkAttempt(NOW - 1 * DAY_MS)],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).not.toBeNull();
    expect(r!.ctaLabel).toBe('Start a simulation');
    expect(r!.ctaHref).toBe('/simulation');
    expect(r!.daysUntilExam).toBeGreaterThan(0);
    expect(r!.daysUntilExam).toBeLessThanOrEqual(REMINDER_WINDOW_DAYS);
    expect(r!.message).toMatch(/T-\d+ days?\./);
    expect(r!.message).toMatch(/sim/i);
  });

  test('returns quiz CTA when no attempts in 3 days but sim is recent', () => {
    // Exam 7d away, sim finished 1d ago (no sim debt), but no attempts in 3d.
    // Attempts 3d ago means SIM finished 1d ago could imply attempts existed
    // alongside it — but we test attempts independently from sim sessions.
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(7),
      sessions: [mkSim({ startedAt: NOW - 2 * DAY_MS, finishedAt: NOW - 1 * DAY_MS })],
      attempts: [mkAttempt(NOW - 3 * DAY_MS)],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).not.toBeNull();
    expect(r!.ctaLabel).toBe('Start a 25-question quiz');
    expect(r!.ctaHref).toBe('/quiz?len=25');
    expect(r!.message).toMatch(/practice/i);
  });

  test('null when dismissed within 12 hours', () => {
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(5),
      sessions: [],
      attempts: [],
      now: NOW,
      dismissedAt: NOW - DISMISS_TTL_MS / 2,
    });
    expect(r).toBeNull();
  });

  test('returns reminder again after dismissal expires (>12h)', () => {
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(5),
      sessions: [],
      attempts: [],
      now: NOW,
      dismissedAt: NOW - DISMISS_TTL_MS - 1_000,
    });
    expect(r).not.toBeNull();
    // No prior activity at all → sim debt path, since sim debt > attempt debt
    // when both are infinite.
    expect(r!.ctaLabel).toBe('Start a simulation');
  });

  test('sim debt boundary: exactly SIM_DEBT_DAYS counts as debt', () => {
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(7),
      sessions: [
        mkSim({
          startedAt: NOW - (SIM_DEBT_DAYS + 1) * DAY_MS,
          finishedAt: NOW - SIM_DEBT_DAYS * DAY_MS,
        }),
      ],
      attempts: [mkAttempt(NOW - 1 * DAY_MS)],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).not.toBeNull();
    expect(r!.ctaLabel).toBe('Start a simulation');
  });

  test('attempt debt boundary: exactly ATTEMPT_DEBT_DAYS counts as debt', () => {
    // Sim within 1d (no sim debt), attempts exactly ATTEMPT_DEBT_DAYS old.
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(7),
      sessions: [mkSim({ startedAt: NOW - 2 * DAY_MS, finishedAt: NOW - 1 * DAY_MS })],
      attempts: [mkAttempt(NOW - ATTEMPT_DEBT_DAYS * DAY_MS)],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).not.toBeNull();
    expect(r!.ctaLabel).toBe('Start a 25-question quiz');
  });

  test('unfinished simulation does not count as completed', () => {
    // Exam 7d away. Started a sim 1d ago but never finished, attempts also 5d ago.
    // Should produce sim debt because no finishedAt means no completed sim.
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(7),
      sessions: [
        mkSim({ startedAt: NOW - 1 * DAY_MS /* no finishedAt */ }),
      ],
      attempts: [mkAttempt(NOW - 5 * DAY_MS)],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).not.toBeNull();
    expect(r!.ctaLabel).toBe('Start a simulation');
  });

  test('exam near 14-day boundary still triggers the banner', () => {
    // Use 13 days to avoid local-vs-UTC rounding ambiguity at the boundary.
    const r = getStudyReminderState({
      examDateIso: isoDateDaysFromNow(REMINDER_WINDOW_DAYS - 1),
      sessions: [],
      attempts: [],
      now: NOW,
      dismissedAt: null,
    });
    expect(r).not.toBeNull();
    expect(r!.daysUntilExam).toBeLessThanOrEqual(REMINDER_WINDOW_DAYS);
  });
});
