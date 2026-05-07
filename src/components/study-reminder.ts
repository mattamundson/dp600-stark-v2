// Pure logic for the nightly study-reminder banner.
//
// As the exam approaches (T-14 days or less), we want to surface a passive
// nudge if the user has accumulated study debt — either no completed
// simulation in 3+ days, or no logged practice attempts in 2+ days.
//
// The banner is dismissible; the dismissal lives in localStorage and
// auto-clears after 12h so the reminder returns the next morning.
//
// This module is 100% pure — no React, no IndexedDB, no Date.now() —
// so it's trivial to unit-test against synthetic clocks.

import type { Attempt, Session } from '../lib/schema';

export const REMINDER_WINDOW_DAYS = 14;
export const SIM_DEBT_DAYS = 3;
export const ATTEMPT_DEBT_DAYS = 2;
export const DISMISS_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StudyReminderState {
  /** Days remaining until exam (rounded up; today + tomorrow exam = 1). */
  daysUntilExam: number;
  /** Human-readable banner message. */
  message: string;
  /** Label for the CTA link. */
  ctaLabel: string;
  /** Hash-route href the CTA should link to. */
  ctaHref: string;
}

export interface StudyReminderInput {
  examDateIso?: string;
  sessions: Session[];
  attempts: Attempt[];
  now: number;
  /** Epoch ms of the last user dismissal, or null if never dismissed. */
  dismissedAt: number | null;
}

/**
 * Decide whether to render the study-reminder banner.
 *
 * Returns null when the banner should be hidden, or a populated
 * StudyReminderState describing what to show.
 *
 * Hide rules (any one is sufficient):
 *   1. No exam date set
 *   2. Exam date in the past
 *   3. Exam more than `REMINDER_WINDOW_DAYS` (14) days away
 *   4. User dismissed within `DISMISS_TTL_MS` (12h)
 *   5. User has logged a completed simulation in the last `SIM_DEBT_DAYS` AND
 *      logged an attempt in the last `ATTEMPT_DEBT_DAYS` (no debt — silent)
 *
 * Show rules:
 *   - If sim debt ≥ 3d → CTA = "Start a simulation"
 *   - Else if attempt debt ≥ 2d → CTA = "Start a 25-question quiz"
 */
export function getStudyReminderState(input: StudyReminderInput): StudyReminderState | null {
  const { examDateIso, sessions, attempts, now, dismissedAt } = input;

  if (!examDateIso) return null;
  const examMs = parseExamDate(examDateIso);
  if (examMs === null) return null;

  const msToExam = examMs - now;
  if (msToExam <= 0) return null;

  const daysUntilExam = Math.max(1, Math.ceil(msToExam / DAY_MS));
  if (daysUntilExam > REMINDER_WINDOW_DAYS) return null;

  // Dismissal window — silent until TTL elapses.
  if (dismissedAt !== null && now - dismissedAt < DISMISS_TTL_MS) return null;

  const lastSimMs = lastFinishedSimMs(sessions);
  const lastAttemptMs = lastAttemptTs(attempts);

  const simDebtDays = lastSimMs === null
    ? Infinity
    : Math.floor((now - lastSimMs) / DAY_MS);
  const attemptDebtDays = lastAttemptMs === null
    ? Infinity
    : Math.floor((now - lastAttemptMs) / DAY_MS);

  const hasSimDebt = simDebtDays >= SIM_DEBT_DAYS;
  const hasAttemptDebt = attemptDebtDays >= ATTEMPT_DEBT_DAYS;

  if (!hasSimDebt && !hasAttemptDebt) return null;

  // Sim debt takes priority — practicing under timer is the highest-leverage
  // action this close to the exam.
  if (hasSimDebt) {
    const debtPhrase = lastSimMs === null
      ? "You haven't taken a simulation yet"
      : `You haven't taken a sim in ${formatDays(simDebtDays)}`;
    return {
      daysUntilExam,
      message: `T-${daysUntilExam} day${daysUntilExam === 1 ? '' : 's'}. ${debtPhrase}.`,
      ctaLabel: 'Start a simulation',
      ctaHref: '/simulation',
    };
  }

  // Attempt debt only.
  const debtPhrase = lastAttemptMs === null
    ? "You haven't logged any practice yet"
    : `You haven't logged any practice in ${formatDays(attemptDebtDays)}`;
  return {
    daysUntilExam,
    message: `T-${daysUntilExam} day${daysUntilExam === 1 ? '' : 's'}. ${debtPhrase}.`,
    ctaLabel: 'Start a 25-question quiz',
    ctaHref: '/quiz?len=25',
  };
}

/**
 * Parse YYYY-MM-DD or full ISO into the epoch ms of end-of-exam-day-local.
 * Returns null on malformed input. Treats the exam as "expires at end of
 * the local calendar day" so a user with examDateIso='2026-05-17' on
 * 2026-05-17 morning still sees T-1.
 */
function parseExamDate(iso: string): number | null {
  // Accept full ISO; otherwise treat as YYYY-MM-DD and pin to end-of-day local.
  if (iso.includes('T')) {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  // End of local day so "today" still shows T-1, not T-0.
  const ts = new Date(y, mo, d, 23, 59, 59, 999).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function lastFinishedSimMs(sessions: Session[]): number | null {
  let max: number | null = null;
  for (const s of sessions) {
    if (s.mode !== 'simulation') continue;
    if (!s.finishedAt) continue;
    if (max === null || s.finishedAt > max) max = s.finishedAt;
  }
  return max;
}

function lastAttemptTs(attempts: Attempt[]): number | null {
  let max: number | null = null;
  for (const a of attempts) {
    if (max === null || a.ts > max) max = a.ts;
  }
  return max;
}

function formatDays(n: number): string {
  if (!Number.isFinite(n)) return 'a while';
  return `${n} day${n === 1 ? '' : 's'}`;
}
