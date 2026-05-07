// Pure engine for the resolved-subtopic retention loop.
//
// Marking a missed-pattern subtopic "resolved" on /missed is aspirational.
// Without retesting, "resolved" status is unreliable — the user may have
// forgotten the trap by the next session.
//
// This module identifies subtopics whose resolution has aged past N days
// without any re-attempts, and curates a 3-question "retention drill"
// from that subtopic, preferring questions the user previously got wrong.
//
// Storage: the existing `Settings.resolvedMissedPatterns: Record<string,
// number>` shape (subtopic slug → resolvedAt epoch ms) is already a map
// of slug→timestamp, so no migration is needed. This module reads that
// shape directly.
//
// No IndexedDB, no React — safe to import in both browser and test code.

import type { Attempt, Question } from '../../lib/schema';

export const DEFAULT_RETENTION_DAYS = 3;
export const DEFAULT_DRILL_SIZE = 3;
export const DAY_MS = 24 * 60 * 60 * 1000;
/** Minimum correct ratio for a retention drill to count as "passed" and
 *  bump the resolution timestamp forward. */
export const RETENTION_PASS_THRESHOLD = 0.8;

export interface RetentionItem {
  subtopic: string;
  /** Epoch ms when the user originally marked this subtopic resolved. */
  resolvedAt: number;
  /** Days elapsed since `resolvedAt` (rounded down). */
  daysSinceResolved: number;
  /** Total attempts the user has logged in this subtopic ever. */
  totalAttemptsInSubtopic: number;
}

/**
 * Returns subtopics whose resolution is "due for a retention check":
 *   - resolved at least `daysAfterResolve` days ago, AND
 *   - the user hasn't re-attempted any question in that subtopic since
 *     resolving it.
 *
 * Output is sorted by oldest-resolved first (highest priority).
 *
 * Pure function — no side effects.
 */
export function getRetentionDue(
  resolvedSubtopics: Record<string, number>,
  attempts: Attempt[],
  now: number,
  daysAfterResolve: number = DEFAULT_RETENTION_DAYS
): RetentionItem[] {
  const items: RetentionItem[] = [];
  const cutoffMs = daysAfterResolve * DAY_MS;

  // Bucket attempts by subtopic for O(1) "any attempt since X" checks.
  const attemptsBySubtopic = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const arr = attemptsBySubtopic.get(a.subtopic);
    if (arr) arr.push(a);
    else attemptsBySubtopic.set(a.subtopic, [a]);
  }

  for (const [subtopic, resolvedAt] of Object.entries(resolvedSubtopics)) {
    if (typeof resolvedAt !== 'number' || resolvedAt <= 0) continue;

    const elapsed = now - resolvedAt;
    if (elapsed < cutoffMs) continue; // not yet due

    const subtopicAttempts = attemptsBySubtopic.get(subtopic) ?? [];
    const reattemptedSinceResolve = subtopicAttempts.some((a) => a.ts > resolvedAt);
    if (reattemptedSinceResolve) continue; // user already revisited; not stale

    items.push({
      subtopic,
      resolvedAt,
      daysSinceResolved: Math.floor(elapsed / DAY_MS),
      totalAttemptsInSubtopic: subtopicAttempts.length,
    });
  }

  // Oldest resolution first — that's the most-decayed memory.
  items.sort((a, b) => a.resolvedAt - b.resolvedAt);
  return items;
}

/**
 * Curate a retention drill of `count` questions from `subtopic`.
 *
 * Selection priority:
 *   1. Questions the user previously got wrong (most recent miss first)
 *   2. Then any other questions in the subtopic the user attempted
 *   3. Then any remaining unseen questions in the subtopic
 *
 * Returns at most `count` questions; fewer if the subtopic pool is small.
 * Pure function — deterministic given the input ordering.
 */
export function selectRetentionDrill(
  subtopic: string,
  allQuestions: Question[],
  attempts: Attempt[],
  count: number = DEFAULT_DRILL_SIZE
): Question[] {
  if (count <= 0) return [];

  const subtopicQs = allQuestions.filter((q) => q.subtopic === subtopic);
  if (subtopicQs.length === 0) return [];

  // For each question id, track: most-recent miss timestamp (if any) and
  // whether the user has attempted it at all.
  const lastMissTs = new Map<string, number>();
  const anyAttemptTs = new Map<string, number>();
  for (const a of attempts) {
    if (a.subtopic !== subtopic) continue;
    const prevAttempt = anyAttemptTs.get(a.questionId) ?? 0;
    if (a.ts > prevAttempt) anyAttemptTs.set(a.questionId, a.ts);
    if (!a.correct) {
      const prevMiss = lastMissTs.get(a.questionId) ?? 0;
      if (a.ts > prevMiss) lastMissTs.set(a.questionId, a.ts);
    }
  }

  const previouslyWrong: Question[] = [];
  const seenButCorrect: Question[] = [];
  const unseen: Question[] = [];

  for (const q of subtopicQs) {
    if (lastMissTs.has(q.id)) previouslyWrong.push(q);
    else if (anyAttemptTs.has(q.id)) seenButCorrect.push(q);
    else unseen.push(q);
  }

  // Sort previously-wrong by most-recent miss first (freshest trap first).
  previouslyWrong.sort((a, b) => (lastMissTs.get(b.id) ?? 0) - (lastMissTs.get(a.id) ?? 0));
  // Sort seen-correct by most-recent attempt first (recently practiced).
  seenButCorrect.sort((a, b) => (anyAttemptTs.get(b.id) ?? 0) - (anyAttemptTs.get(a.id) ?? 0));
  // Unseen falls back to natural bank order — already deterministic.

  const ordered = [...previouslyWrong, ...seenButCorrect, ...unseen];
  return ordered.slice(0, count);
}

/**
 * Inspect attempts after `resolvedAt` for `subtopic` and decide whether
 * the user's retention drill counts as a pass (≥ `threshold` correct
 * ratio over at least `minAttempts` attempts).
 *
 * Returns the latest attempt timestamp on pass (so the caller can bump
 * `resolvedAt` forward to that ts), or null on no-pass.
 *
 * Pure — caller decides whether to persist.
 */
export function evaluateRetentionDrill(
  subtopic: string,
  attempts: Attempt[],
  resolvedAt: number,
  threshold: number = RETENTION_PASS_THRESHOLD,
  minAttempts: number = DEFAULT_DRILL_SIZE
): number | null {
  const since = attempts.filter((a) => a.subtopic === subtopic && a.ts > resolvedAt);
  if (since.length < minAttempts) return null;
  const correct = since.filter((a) => a.correct).length;
  const ratio = correct / since.length;
  if (ratio < threshold) return null;
  // Bump to latest ts so we don't re-evaluate the same drill.
  return since.reduce((m, a) => (a.ts > m ? a.ts : m), 0);
}
