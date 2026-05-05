// Confidence Calibration Engine — pure functions, no side effects.
//
// "Calibration" measures whether the user's stated confidence actually
// predicts their probability of being correct. A perfectly calibrated
// user who says "sure" is right ~95% of the time; one who says "guess"
// is right ~50% of the time.
//
// Key outputs:
//   - CalibrationBin per confidence level, with accuracy vs expected
//   - overconfidenceScore: n-weighted mean of negative gaps (higher = worse)
//   - brierLike: simplified Brier score (lower = better)
//   - dangerouslyConfident: questions/subtopics where the user is sure but wrong

import type { Attempt, Confidence } from '../../lib/schema';

/* ─── Heuristic expected accuracy per confidence level ─────────────── */

export const CONFIDENCE_EXPECTED: Record<Confidence, number> = {
  sure: 0.95,
  guess: 0.50,
  unsure: 0.25
};

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface CalibrationBin {
  confidence: Confidence;
  /** total attempts in this bin */
  n: number;
  /** number correct */
  correct: number;
  /**
   * Observed accuracy. NaN when n < minPerBin (insufficient data).
   */
  accuracy: number;
  /** Heuristic expected accuracy for this confidence level */
  expected: number;
  /**
   * gap = accuracy - expected. Negative ⇒ overconfident.
   * NaN when accuracy is NaN (insufficient data).
   */
  gap: number;
  /** True when n < minPerBin — consumer should flag this bin as unreliable */
  insufficient: boolean;
}

export interface CalibrationReport {
  bins: CalibrationBin[];
  /**
   * n-weighted average of negative gaps clamped at 0 (higher = more overconfident).
   * Range [0, 1].
   */
  overconfidenceScore: number;
  /**
   * Simplified Brier score: mean of (confidenceValue - outcome)^2 over all attempts,
   * where confidenceValue = CONFIDENCE_EXPECTED[confidence] and outcome ∈ {0, 1}.
   * Lower is better; 0 = perfect; maximum = 1.
   */
  brierLike: number;
  /** Total attempts across all bins */
  n: number;
}

/* ─── calibrate ─────────────────────────────────────────────────────── */

/**
 * Compute per-confidence-level calibration statistics.
 *
 * @param attempts - Flat array of Attempt records (no filtering required)
 * @param opts.minPerBin - Minimum attempts per bin before reporting accuracy.
 *   Bins below this threshold have accuracy=NaN, gap=NaN, insufficient=true.
 *   Defaults to 5.
 */
export function calibrate(
  attempts: Attempt[],
  opts?: { minPerBin?: number }
): CalibrationReport {
  const minPerBin = opts?.minPerBin ?? 5;

  // Accumulate per-confidence bucket
  const acc: Record<Confidence, { n: number; correct: number }> = {
    sure: { n: 0, correct: 0 },
    guess: { n: 0, correct: 0 },
    unsure: { n: 0, correct: 0 }
  };

  let brierSum = 0;

  for (const a of attempts) {
    acc[a.confidence].n += 1;
    if (a.correct) acc[a.confidence].correct += 1;
    // Brier: squared difference between expected confidence value and actual outcome
    const expected = CONFIDENCE_EXPECTED[a.confidence];
    const outcome = a.correct ? 1 : 0;
    brierSum += (expected - outcome) ** 2;
  }

  const totalN = attempts.length;

  // Build bins in canonical order
  const confidences: Confidence[] = ['sure', 'unsure', 'guess'];
  const bins: CalibrationBin[] = confidences.map((c) => {
    const { n, correct } = acc[c];
    const expected = CONFIDENCE_EXPECTED[c];
    const insufficient = n < minPerBin;
    const accuracy = insufficient ? NaN : correct / n;
    const gap = insufficient ? NaN : accuracy - expected;
    return { confidence: c, n, correct, accuracy, expected, gap, insufficient };
  });

  // overconfidenceScore: n-weighted mean of max(0, -gap) across sufficient bins
  let weightedNegGapSum = 0;
  let weightedN = 0;
  for (const bin of bins) {
    if (!bin.insufficient) {
      const negGap = Math.max(0, -bin.gap);
      weightedNegGapSum += negGap * bin.n;
      weightedN += bin.n;
    }
  }
  const overconfidenceScore = weightedN === 0 ? 0 : weightedNegGapSum / weightedN;

  const brierLike = totalN === 0 ? 0 : brierSum / totalN;

  return { bins, overconfidenceScore, brierLike, n: totalN };
}

/* ─── dangerouslyConfident ───────────────────────────────────────────── */

export interface DangerouslyConfidentResult {
  /** Question IDs where the user has been 'sure' but wrong ≥ threshold fraction */
  questionIds: string[];
  /** Subtopics ranked by rate of confident-but-wrong attempts */
  subtopics: Array<{
    subtopic: string;
    /** total 'sure' attempts in this subtopic */
    n: number;
    /** count of 'sure' + wrong attempts */
    wrongConfident: number;
  }>;
}

/**
 * Surface questions and subtopics where the user is confidently wrong.
 *
 * @param attempts - All Attempt records
 * @param opts.minN - Minimum 'sure' attempts required before a question is flagged.
 *   Defaults to 1 (any confident-wrong miss counts).
 * @param opts.threshold - Fraction of 'sure' attempts that must be wrong for a
 *   *question* to be included. Defaults to 0.30.
 */
export function dangerouslyConfident(
  attempts: Attempt[],
  opts?: { minN?: number; threshold?: number }
): DangerouslyConfidentResult {
  const minN = opts?.minN ?? 1;
  const threshold = opts?.threshold ?? 0.30;

  // Accumulate per-question stats for 'sure' attempts
  const qMap = new Map<string, { sureTotal: number; sureWrong: number }>();
  // Accumulate per-subtopic stats for 'sure' attempts
  const sMap = new Map<string, { n: number; wrongConfident: number; subtopic: string }>();

  for (const a of attempts) {
    if (a.confidence !== 'sure') continue;

    // Per-question
    const qEntry = qMap.get(a.questionId) ?? { sureTotal: 0, sureWrong: 0 };
    qEntry.sureTotal += 1;
    if (!a.correct) qEntry.sureWrong += 1;
    qMap.set(a.questionId, qEntry);

    // Per-subtopic
    const sEntry = sMap.get(a.subtopic) ?? { n: 0, wrongConfident: 0, subtopic: a.subtopic };
    sEntry.n += 1;
    if (!a.correct) sEntry.wrongConfident += 1;
    sMap.set(a.subtopic, sEntry);
  }

  // Filter questions that meet minN + threshold criteria
  const questionIds: string[] = [];
  for (const [qId, { sureTotal, sureWrong }] of qMap) {
    if (sureTotal >= minN && sureTotal > 0 && sureWrong / sureTotal >= threshold) {
      questionIds.push(qId);
    }
  }

  // Sort subtopics by wrongConfident / n descending, include all with any confident-wrong
  const subtopics = [...sMap.values()]
    .filter((s) => s.wrongConfident > 0)
    .sort((a, b) => b.wrongConfident / b.n - a.wrongConfident / a.n)
    .map(({ subtopic, n, wrongConfident }) => ({ subtopic, n, wrongConfident }));

  return { questionIds, subtopics };
}
