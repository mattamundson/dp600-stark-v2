// Pure function: compares the most recent finished simulation against the
// previous one to surface short-term improvement / regression on Dashboard.

import type { Attempt, Session } from '../../lib/schema';

export interface SimDelta {
  prev: { sessionId: string; finishedAt: number; scaledScore: number; accuracy: number };
  curr: { sessionId: string; finishedAt: number; scaledScore: number; accuracy: number };
  scoreDelta: number;
  accuracyDelta: number;
  /** attempts logged after prev.finishedAt and through curr.finishedAt (or now) */
  attemptsBetween: number;
}

/**
 * Returns the comparison of the two most recent finished simulation
 * sessions (mode === 'simulation'), or null when fewer than 2 exist.
 */
export function sinceLastSim(sessions: Session[], attempts: Attempt[]): SimDelta | null {
  const sims = sessions
    .filter((s) => s.mode === 'simulation' && s.finishedAt && s.resultSummary)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  if (sims.length < 2) return null;
  const [curr, prev] = sims;
  const between = attempts.filter(
    (a) => a.ts > (prev.finishedAt ?? 0) && a.ts <= (curr.finishedAt ?? Date.now())
  ).length;
  return {
    prev: {
      sessionId: prev.id,
      finishedAt: prev.finishedAt!,
      scaledScore: prev.resultSummary!.scaledScore,
      accuracy: prev.resultSummary!.accuracy
    },
    curr: {
      sessionId: curr.id,
      finishedAt: curr.finishedAt!,
      scaledScore: curr.resultSummary!.scaledScore,
      accuracy: curr.resultSummary!.accuracy
    },
    scoreDelta: curr.resultSummary!.scaledScore - prev.resultSummary!.scaledScore,
    accuracyDelta: curr.resultSummary!.accuracy - prev.resultSummary!.accuracy,
    attemptsBetween: between
  };
}
