// Pure engine for grouping missed attempts by subtopic.
// No IndexedDB, no React — safe to import in both browser and test environments.

import type { Attempt, Confidence, Domain, Question } from '../../lib/schema';

// Re-export for convenience so callers don't need to re-derive the domain.
export interface RecentMiss {
  questionId: string;
  question: Question;
  confidence: Confidence;
  timestamp: number;
  /** true when the user answered 'sure' but was wrong */
  isConfidentMiss: boolean;
}

export interface MissedGroup {
  subtopic: string;
  domain: Domain;
  missCount: number;
  totalCount: number;
  accuracy: number;
  recentMisses: RecentMiss[];  // most recent 5 per subtopic
}

const MAX_GROUPS = 15;
const MAX_RECENT_MISSES = 5;

/**
 * Groups all incorrect attempts by subtopic and enriches each miss with its
 * Question record. Sorted by missCount desc, then accuracy asc. Capped at
 * the top MAX_GROUPS (15) subtopics.
 *
 * Pure function — no side effects, no async, no IndexedDB.
 */
export function groupMissedAttempts(
  attempts: Attempt[],
  questions: Question[]
): MissedGroup[] {
  if (attempts.length === 0) return [];

  // Build a fast lookup map for questions.
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  // Aggregate per-subtopic counts and collect miss records.
  const subtopicTotals = new Map<string, { total: number; misses: Attempt[]; domain: Domain }>();

  for (const a of attempts) {
    const entry = subtopicTotals.get(a.subtopic);
    if (!entry) {
      subtopicTotals.set(a.subtopic, {
        total: 1,
        misses: a.correct ? [] : [a],
        domain: a.domain
      });
    } else {
      entry.total += 1;
      if (!a.correct) entry.misses.push(a);
    }
  }

  const groups: MissedGroup[] = [];

  for (const [subtopic, { total, misses, domain }] of subtopicTotals) {
    if (misses.length === 0) continue;

    // Sort misses by ts descending so we take the 5 most recent.
    const sortedMisses = misses.slice().sort((a, b) => b.ts - a.ts);

    const recentMisses: RecentMiss[] = [];
    for (const a of sortedMisses.slice(0, MAX_RECENT_MISSES)) {
      const question = questionMap.get(a.questionId);
      // Skip misses whose question no longer exists in the bank (safe degradation).
      if (!question) continue;
      recentMisses.push({
        questionId: a.questionId,
        question,
        confidence: a.confidence,
        timestamp: a.ts,
        isConfidentMiss: a.confidence === 'sure'
      });
    }

    // Accuracy = correct / total (correct = total - misses.length).
    const accuracy = (total - misses.length) / total;

    groups.push({
      subtopic,
      domain,
      missCount: misses.length,
      totalCount: total,
      accuracy,
      recentMisses
    });
  }

  // Sort: missCount desc, then accuracy asc (worst accuracy breaks ties).
  groups.sort((a, b) => {
    if (b.missCount !== a.missCount) return b.missCount - a.missCount;
    return a.accuracy - b.accuracy;
  });

  return groups.slice(0, MAX_GROUPS);
}
