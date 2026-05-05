// Transparent, tunable scoring model.
//
// We score on TWO axes:
//   1. Per-question correctness (used to write Attempts)
//   2. Per-session scaled score 0..1000 (used for "readiness" + history)
//
// Per-question:
//   - 'single' / 'scenario-single' / ordering-single-answer: 1.0 if exact, 0 otherwise.
//   - 'multi' / 'scenario-multi': partial credit using Jaccard against correct set,
//     with a penalty for selecting wrong answers — so guessing all options is not
//     a viable strategy. Formula:
//
//       partial = max(0, |correct ∩ chosen| / |correct ∪ chosen|
//                       - 0.25 * (|chosen \ correct| / |options \ correct|))
//
//     The penalty term is 0 when there is no possible wrong choice (i.e. correct
//     covers every option), and grows linearly with the share of distractors picked.
//     Counts as "correct" only when partial == 1 (i.e. exactly the right set).
//
//   - 'ordering': partial credit equals share of positions in the correct slot,
//     capped — counts as "correct" only when the order matches exactly.
//
// Per-session:
//   scaled = 1000 * weighted_correctness, where weight is exam-blueprint domain weight
//   averaged with raw accuracy. This rewards getting Prepare-data right (45% weight)
//   more than Maintain (27.5%) or Semantic (27.5%).
//
//   raw_accuracy   = correct / total
//   domain_weighted = Σ_d (questions_in_d / total) * (correct_in_d / questions_in_d)
//                     evaluated only over domains the session actually covered;
//                     domain weight applied as a multiplier vs. blueprint weight.
//
//   readiness = 1000 * (0.6 * raw_accuracy + 0.4 * blueprint_aligned_accuracy)
//
// All multipliers above are constants in this file — change them in one place.

import type { Attempt, Domain, Question, SessionResult } from '../schema';
import { DOMAIN_WEIGHT, DOMAINS } from '../schema';
import { setEqual } from '../utils/arr';

export const PENALTY_PER_WRONG_PICK = 0.25;
export const READINESS_RAW_WEIGHT = 0.6;
export const READINESS_BLUEPRINT_WEIGHT = 0.4;

export interface GradeOutcome {
  correct: boolean;
  partial: number;          // 0..1
}

export function gradeAnswer(
  q: Question,
  selectedOptionIds: string[] | undefined,
  selectedOrder: string[] | undefined
): GradeOutcome {
  switch (q.type) {
    case 'ordering':
      return gradeOrdering(q, selectedOrder ?? []);
    case 'single':
    case 'scenario-single':
      return gradeSingle(q, selectedOptionIds ?? []);
    case 'multi':
    case 'scenario-multi':
      return gradeMulti(q, selectedOptionIds ?? []);
  }
}

function gradeSingle(q: Question, chosen: string[]): GradeOutcome {
  const correctSet = q.correctOptionIds ?? [];
  const exact = chosen.length === 1 && correctSet.length === 1 && chosen[0] === correctSet[0];
  return { correct: exact, partial: exact ? 1 : 0 };
}

function gradeMulti(q: Question, chosen: string[]): GradeOutcome {
  const correctSet = new Set(q.correctOptionIds ?? []);
  const allOptions = new Set((q.options ?? []).map((o) => o.id));
  const chosenSet = new Set(chosen);
  if (correctSet.size === 0) return { correct: chosenSet.size === 0, partial: chosenSet.size === 0 ? 1 : 0 };

  const intersection = [...chosenSet].filter((x) => correctSet.has(x)).length;
  const union = new Set([...chosenSet, ...correctSet]).size;
  const distractorPool = [...allOptions].filter((x) => !correctSet.has(x)).length;
  const wrongPicks = [...chosenSet].filter((x) => !correctSet.has(x)).length;

  const jaccard = union === 0 ? 0 : intersection / union;
  const penalty = distractorPool === 0 ? 0 : PENALTY_PER_WRONG_PICK * (wrongPicks / distractorPool);
  const partial = Math.max(0, jaccard - penalty);
  const exact =
    chosenSet.size === correctSet.size &&
    [...chosenSet].every((x) => correctSet.has(x));
  return { correct: exact, partial: exact ? 1 : Number(partial.toFixed(4)) };
}

function gradeOrdering(q: Question, chosen: string[]): GradeOutcome {
  const correct = q.correctOrder ?? [];
  if (!chosen.length || chosen.length !== correct.length) {
    return { correct: false, partial: 0 };
  }
  const exact = chosen.every((id, i) => id === correct[i]);
  if (exact) return { correct: true, partial: 1 };
  let positionsRight = 0;
  for (let i = 0; i < correct.length; i++) if (chosen[i] === correct[i]) positionsRight++;
  return { correct: false, partial: Number((positionsRight / correct.length).toFixed(4)) };
}

/* ─── session-level summary ───────────────────────────────────── */

export function summarizeSession(attempts: Attempt[], questionIds: string[], durationMs: number): SessionResult {
  const total = questionIds.length;
  const answered = attempts.filter((a) => questionIds.includes(a.questionId));
  const correctCount = answered.filter((a) => a.correct).length;
  const incorrect = answered.length - correctCount;
  const unanswered = total - answered.length;

  const byDomain: Record<Domain, { total: number; correct: number; accuracy: number }> = {
    maintain: { total: 0, correct: 0, accuracy: 0 },
    prepare: { total: 0, correct: 0, accuracy: 0 },
    semantic: { total: 0, correct: 0, accuracy: 0 }
  };
  const bySubtopic: Record<string, { total: number; correct: number; accuracy: number }> = {};

  for (const a of answered) {
    byDomain[a.domain].total += 1;
    if (a.correct) byDomain[a.domain].correct += 1;
    const k = a.subtopic;
    bySubtopic[k] ||= { total: 0, correct: 0, accuracy: 0 };
    bySubtopic[k].total += 1;
    if (a.correct) bySubtopic[k].correct += 1;
  }
  for (const d of DOMAINS) {
    byDomain[d].accuracy = byDomain[d].total === 0 ? 0 : byDomain[d].correct / byDomain[d].total;
  }
  for (const k of Object.keys(bySubtopic)) {
    const s = bySubtopic[k];
    s.accuracy = s.total === 0 ? 0 : s.correct / s.total;
  }

  const accuracy = total === 0 ? 0 : correctCount / total;
  const blueprintAligned = blueprintAccuracy(byDomain);
  const scaled = Math.round(
    1000 * (READINESS_RAW_WEIGHT * accuracy + READINESS_BLUEPRINT_WEIGHT * blueprintAligned)
  );

  return {
    total,
    correct: correctCount,
    incorrect,
    unanswered,
    accuracy,
    scaledScore: scaled,
    byDomain,
    bySubtopic,
    durationMs
  };
}

export function blueprintAccuracy(byDomain: SessionResult['byDomain']): number {
  let weightSum = 0;
  let scoreSum = 0;
  for (const d of DOMAINS) {
    if (byDomain[d].total === 0) continue;
    const w = DOMAIN_WEIGHT[d];
    weightSum += w;
    scoreSum += w * byDomain[d].accuracy;
  }
  return weightSum === 0 ? 0 : scoreSum / weightSum;
}

/** Used by /analytics dashboard to translate aggregate attempts into a global readiness 0..1000. */
export function readinessFromAttempts(all: Attempt[]): number {
  if (!all.length) return 500; // calibration midpoint when we have no signal
  const byDomain: SessionResult['byDomain'] = {
    maintain: { total: 0, correct: 0, accuracy: 0 },
    prepare: { total: 0, correct: 0, accuracy: 0 },
    semantic: { total: 0, correct: 0, accuracy: 0 }
  };
  for (const a of all) {
    byDomain[a.domain].total += 1;
    if (a.correct) byDomain[a.domain].correct += 1;
  }
  for (const d of DOMAINS) byDomain[d].accuracy = byDomain[d].total === 0 ? 0 : byDomain[d].correct / byDomain[d].total;

  const accuracy = all.filter((a) => a.correct).length / all.length;
  const blueprint = blueprintAccuracy(byDomain);
  return Math.round(1000 * (READINESS_RAW_WEIGHT * accuracy + READINESS_BLUEPRINT_WEIGHT * blueprint));
}

/** Helper for confidence calibration plots */
export function compareSelectionToCorrect(q: Question, selected: string[]): boolean {
  const correct = q.correctOptionIds ?? [];
  return setEqual(selected, correct);
}
