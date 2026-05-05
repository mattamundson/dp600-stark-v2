// Readiness Rating Engine — pure functions, no side effects.
//
// Produces a composite 0-1000 score from four subscores:
//   - coverage (0.20):   % of subtopics with ≥3 attempts
//   - accuracy (0.40):   domain-weighted accuracy mapped onto 0-1000
//   - calibration (0.20): 1000 - 1000 * overconfidenceScore
//   - pacing (0.20):     % of attempts within per-type time targets
//
// Score bands mirror Microsoft's published pass cutoff of 700:
//   red    < 600
//   yellow  600-749
//   green  ≥ 750  (we set green start at 750 to give a margin above 700)

import type { Attempt, Domain, Question, QuestionType } from '../../lib/schema';
import { DOMAIN_WEIGHT, DOMAINS } from '../../lib/schema';
import { calibrate } from './calibration';

/* ─── Per-type time targets (seconds) ──────────────────────────────── */

const TARGET_LATENCY_MS: Record<QuestionType, number> = {
  single: 92_000,
  'scenario-single': 92_000,
  multi: 105_000,
  'scenario-multi': 105_000,
  ordering: 120_000
};

/* ─── Accuracy subscore mapping ────────────────────────────────────── */
// 0-1000, linear:
//   accuracy ≥ 0.90  → 1000
//   accuracy = 0.70  → 600
//   accuracy ≤ 0.50  → 0
// Two linear segments: [0.50-0.70] → [0-600]  and  [0.70-0.90] → [600-1000]

function accuracyToScore(accuracy: number): number {
  if (accuracy >= 0.90) return 1000;
  if (accuracy <= 0.50) return 0;
  if (accuracy >= 0.70) {
    // linear from 600 at 0.70 to 1000 at 0.90
    return 600 + ((accuracy - 0.70) / 0.20) * 400;
  }
  // linear from 0 at 0.50 to 600 at 0.70
  return ((accuracy - 0.50) / 0.20) * 600;
}

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface ReadinessRating {
  /** Composite score ∈ [0, 1000] */
  score: number;
  band: 'red' | 'yellow' | 'green';
  subscores: {
    /** % of subtopics with ≥3 attempts, mapped to 0-1000 */
    coverage: number;
    /** Domain-weighted accuracy, mapped to 0-1000 */
    accuracy: number;
    /** 1000 - 1000 * overconfidenceScore */
    calibration: number;
    /** % of attempts within type-specific time target, mapped to 0-1000 */
    pacing: number;
  };
  recommendation: string;
  /** Total attempts used to compute the rating */
  n: number;
  /** Epoch ms when the rating was computed */
  updatedAt: number;
}

/* ─── Score → band ──────────────────────────────────────────────────── */

function toBand(score: number): ReadinessRating['band'] {
  if (score >= 750) return 'green';
  if (score >= 600) return 'yellow';
  return 'red';
}

/* ─── Subscore helpers ──────────────────────────────────────────────── */

function coverageScore(attempts: Attempt[], questions: Question[]): number {
  if (!questions.length) return 0;
  // Count unique subtopics in the bank
  const bankSubtopics = new Set(questions.map((q) => q.subtopic));
  // Count attempts per subtopic
  const attemptCounts = new Map<string, number>();
  for (const a of attempts) {
    attemptCounts.set(a.subtopic, (attemptCounts.get(a.subtopic) ?? 0) + 1);
  }
  let covered = 0;
  for (const sub of bankSubtopics) {
    if ((attemptCounts.get(sub) ?? 0) >= 3) covered += 1;
  }
  return (covered / bankSubtopics.size) * 1000;
}

function accuracyScore(attempts: Attempt[]): number {
  if (!attempts.length) return 0;
  // Compute per-domain accuracy, then domain-weight it
  const domainAcc: Record<Domain, { total: number; correct: number }> = {
    maintain: { total: 0, correct: 0 },
    prepare: { total: 0, correct: 0 },
    semantic: { total: 0, correct: 0 }
  };
  for (const a of attempts) {
    domainAcc[a.domain].total += 1;
    if (a.correct) domainAcc[a.domain].correct += 1;
  }
  let weightedAccSum = 0;
  let weightSum = 0;
  for (const d of DOMAINS) {
    const { total, correct } = domainAcc[d];
    if (total === 0) continue;
    const acc = correct / total;
    const w = DOMAIN_WEIGHT[d];
    weightedAccSum += acc * w;
    weightSum += w;
  }
  if (weightSum === 0) return 0;
  const weightedAccuracy = weightedAccSum / weightSum;
  return accuracyToScore(weightedAccuracy);
}

function calibrationScore(attempts: Attempt[]): number {
  if (!attempts.length) return 1000; // no data → neutral, don't penalize
  const report = calibrate(attempts);
  return Math.max(0, 1000 - 1000 * report.overconfidenceScore);
}

function pacingScore(attempts: Attempt[], questions: Question[]): number {
  // Build a lookup for question type by question ID
  const qTypeMap = new Map<string, QuestionType>();
  for (const q of questions) qTypeMap.set(q.id, q.type);

  let timed = 0;
  let withinTarget = 0;
  for (const a of attempts) {
    if (a.latencyMs <= 0) continue;
    const qType = qTypeMap.get(a.questionId);
    if (!qType) continue; // can't evaluate without knowing type
    const target = TARGET_LATENCY_MS[qType];
    timed += 1;
    if (a.latencyMs <= target) withinTarget += 1;
  }
  if (timed === 0) return 500; // insufficient data → neutral
  return (withinTarget / timed) * 1000;
}

/* ─── Subscore weights ──────────────────────────────────────────────── */

const WEIGHTS = {
  coverage: 0.20,
  accuracy: 0.40,
  calibration: 0.20,
  pacing: 0.20
} as const;

/* ─── rateReadiness ─────────────────────────────────────────────────── */

/**
 * Compute a composite readiness rating from attempt history.
 *
 * @param attempts - All Attempt records for the user
 * @param questions - Full question bank (needed for coverage + pacing lookups)
 */
export function rateReadiness(attempts: Attempt[], questions: Question[]): ReadinessRating {
  const coverage = coverageScore(attempts, questions);
  const accuracy = accuracyScore(attempts);
  const calibration = calibrationScore(attempts);
  const pacing = pacingScore(attempts, questions);

  const score = Math.round(
    coverage * WEIGHTS.coverage +
    accuracy * WEIGHTS.accuracy +
    calibration * WEIGHTS.calibration +
    pacing * WEIGHTS.pacing
  );

  const band = toBand(score);

  const recommendation = buildRecommendationText(band, { coverage, accuracy, calibration, pacing });

  return {
    score,
    band,
    subscores: { coverage, accuracy, calibration, pacing },
    recommendation,
    n: attempts.length,
    updatedAt: Date.now()
  };
}

function buildRecommendationText(
  band: ReadinessRating['band'],
  subscores: ReadinessRating['subscores']
): string {
  if (band === 'green') {
    return 'Strong across all areas. Run a full simulation to confirm exam readiness and tighten any remaining gaps.';
  }
  // Find worst subscore to give a targeted message
  const worst = (Object.keys(subscores) as Array<keyof typeof subscores>).reduce(
    (a, b) => (subscores[a] < subscores[b] ? a : b)
  );
  if (band === 'yellow') {
    const focusMap: Record<keyof typeof subscores, string> = {
      coverage: 'Expand topic coverage — work through unseen subtopics before drilling depth.',
      accuracy: 'Focus on accuracy in your weakest domains before simulations.',
      calibration: 'You are overconfident on some topics. Review your sure-but-wrong questions.',
      pacing: 'Work on speed — practice timed 10-question sprints to get within target pacing.'
    };
    return focusMap[worst];
  }
  // red
  const focusMap: Record<keyof typeof subscores, string> = {
    coverage: 'Critical gap: many subtopics untouched. Start broad coverage before any simulation work.',
    accuracy: 'Accuracy is too low for exam readiness. Return to fundamentals and remediation drills.',
    calibration: 'Dangerous overconfidence detected. Study your sure-but-wrong questions immediately.',
    pacing: 'Pacing is well outside target. Focus on speed drills — the exam clock will be a problem.'
  };
  return focusMap[worst];
}

/* ─── recommendNextBlock ────────────────────────────────────────────── */

export type NextBlockFocus = 'remediation' | 'coverage' | 'simulation' | 'pacing';

export interface NextBlockRecommendation {
  focus: NextBlockFocus;
  rationale: string;
}

/**
 * Deterministic next-action recommendation based on the readiness rating.
 * Priority order: pacing (if severely slow) > coverage (if <50%) > remediation (accuracy) > simulation.
 */
export function recommendNextBlock(
  rating: ReadinessRating,
  _attempts: Attempt[],
  _questions: Question[]
): NextBlockRecommendation {
  const { subscores, band } = rating;

  // Pacing gate: if pacing < 400 (less than 40% of answers on-time), fix it first
  if (subscores.pacing < 400) {
    return {
      focus: 'pacing',
      rationale: 'Less than 40% of your answers are within target time. Timed sprints now before any other work.'
    };
  }

  // Coverage gate: if <50% of subtopics have been touched, breadth first
  if (subscores.coverage < 500) {
    return {
      focus: 'coverage',
      rationale: 'More than half the exam subtopics have fewer than 3 attempts. Broad coverage unlocks meaningful accuracy signals.'
    };
  }

  // Green band with decent coverage → simulation
  if (band === 'green') {
    return {
      focus: 'simulation',
      rationale: 'You are above the pass threshold. Simulate exam conditions to validate readiness under time pressure.'
    };
  }

  // Calibration danger: strongly overconfident on a red/yellow band
  if (subscores.calibration < 400) {
    return {
      focus: 'remediation',
      rationale: 'High overconfidence score. Targeted remediation on your sure-but-wrong topics will have the highest impact.'
    };
  }

  // Yellow with reasonable coverage: remediation on accuracy gaps
  if (band === 'yellow') {
    if (subscores.accuracy < subscores.pacing) {
      return {
        focus: 'remediation',
        rationale: 'Accuracy is the primary drag on your score. Remediation drills targeting weak domains are the fastest path forward.'
      };
    }
    return {
      focus: 'simulation',
      rationale: 'Coverage and accuracy are solid. Simulate exam conditions to close the remaining gap to green.'
    };
  }

  // Red band, coverage ok: remediation
  return {
    focus: 'remediation',
    rationale: 'Score is below passing threshold. Focused remediation on weak subtopics before attempting simulations.'
  };
}
