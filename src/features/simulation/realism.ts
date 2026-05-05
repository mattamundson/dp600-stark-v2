// Exam Realism v2 — configuration, sampling, pacing, and end-of-sim summary.
//
// This module is pure (no I/O, no React). It owns:
//   • SimRealismConfig: the shape that drives the exam runner
//   • DP600_REALISM / DP600_QUICK: ready-made presets
//   • buildSimSet: weighted stratified sample from the question bank
//   • pacingTargetMs: per-question target derived from type + total time
//   • summarizeSim: full end-of-sim summary including readiness rating

import type { Attempt, Domain, Question } from '../../lib/schema';
import { DOMAINS } from '../../lib/schema';
import { seededShuffle } from '../../lib/utils/arr';
import type { ReadinessRating } from '../analytics/readiness';
import { rateReadiness } from '../analytics/readiness';

/* ─── Config shape ────────────────────────────────────────────────── */

export interface SimRealismConfig {
  totalQuestions: number;
  timeMinutes: number;
  blueprint: {
    maintain: number; // e.g. 0.275
    prepare: number;  // e.g. 0.475
    semantic: number; // e.g. 0.250
  };
  allowReview: boolean;
  showFeedbackPerQuestion: boolean;
}

/* ─── Presets ─────────────────────────────────────────────────────── */

/** Full DP-600 exam realism: 65 Q, 100 min, official blueprint weights. */
export const DP600_REALISM: SimRealismConfig = {
  totalQuestions: 65,
  timeMinutes: 100,
  blueprint: { maintain: 0.275, prepare: 0.475, semantic: 0.250 },
  allowReview: true,
  showFeedbackPerQuestion: false
};

/** Daily-rep quick sim: 25 Q, 35 min, same blueprint — for pacing habits without full commitment. */
export const DP600_QUICK: SimRealismConfig = {
  totalQuestions: 25,
  timeMinutes: 35,
  blueprint: { maintain: 0.275, prepare: 0.475, semantic: 0.250 },
  allowReview: true,
  showFeedbackPerQuestion: false
};

/* ─── buildSimSet ─────────────────────────────────────────────────── */

/** Mulberry32 PRNG — produces deterministic floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates using a supplied rng. */
function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Compute per-domain target counts from a config's blueprint.
 * Distributes any rounding residual to the largest domain (prepare).
 */
function domainTargets(config: SimRealismConfig): Record<Domain, number> {
  const n = config.totalQuestions;
  const { maintain, semantic } = config.blueprint;
  const tMaintain = Math.round(n * maintain);
  const tSemantic = Math.round(n * semantic);
  const tPrepare = n - tMaintain - tSemantic; // absorb rounding into the largest bucket
  return { maintain: tMaintain, prepare: tPrepare, semantic: tSemantic };
}

export interface BuildSimSetOpts {
  seed?: number;
  excludeIds?: string[];
}

/**
 * Build an exam set from the question bank using weighted stratified sampling.
 * Returns exactly `config.totalQuestions` questions, with domain mix within ±1 of target counts.
 * Seeded when `opts.seed` is supplied; otherwise uses Date.now().
 */
export function buildSimSet(
  bank: Question[],
  config: SimRealismConfig,
  opts: BuildSimSetOpts = {}
): Question[] {
  const seed = opts.seed ?? (Date.now() & 0xffffffff);
  const excluded = new Set(opts.excludeIds ?? []);
  const targets = domainTargets(config);

  // Pool without excluded ids and without scenario-only questions
  const pool = bank.filter((q) => !excluded.has(q.id) && !q.scenarioId);

  const rng = mulberry32(seed);
  const result: Question[] = [];
  const used = new Set<string>();

  // First pass: fill each domain exactly to target
  for (const domain of DOMAINS as readonly Domain[]) {
    const want = targets[domain];
    const candidates = shuffleWithRng(
      pool.filter((q) => q.domain === domain),
      rng
    );
    let added = 0;
    for (const q of candidates) {
      if (added >= want) break;
      if (!used.has(q.id)) {
        result.push(q);
        used.add(q.id);
        added++;
      }
    }
  }

  // Overflow: if any domain was short, fill from any remaining candidate
  if (result.length < config.totalQuestions) {
    const remaining = shuffleWithRng(
      pool.filter((q) => !used.has(q.id)),
      rng
    );
    for (const q of remaining) {
      if (result.length >= config.totalQuestions) break;
      result.push(q);
      used.add(q.id);
    }
  }

  // Final shuffle so domain blocks aren't obvious, then trim to exact count
  return seededShuffle(result, seed + 13).slice(0, config.totalQuestions);
}

/* ─── pacingTargetMs ──────────────────────────────────────────────── */

/** Type-based weighting: scenario and multi-select get extra time; ordering gets slightly more. */
const TYPE_TIME_FACTOR: Record<string, number> = {
  'single': 1.0,
  'scenario-single': 1.35,
  'multi': 1.15,
  'scenario-multi': 1.45,
  'ordering': 1.10
};

/**
 * Target milliseconds for a single question given the overall config.
 * Weights question type against the pool's average time-per-question.
 */
export function pacingTargetMs(question: Question, config: SimRealismConfig): number {
  const avgMs = (config.timeMinutes * 60_000) / config.totalQuestions;
  const factor = TYPE_TIME_FACTOR[question.type] ?? 1.0;
  return Math.round(avgMs * factor);
}

/* ─── SimSummary ──────────────────────────────────────────────────── */

export interface SimSummary {
  score: number;                        // raw correct count
  total: number;                        // totalQuestions in set
  correctById: Record<string, boolean>; // qid → was correct
  domainBreakdown: Record<Domain, { correct: number; total: number }>;
  /** Subtopics sorted descending by miss count; only entries with ≥1 miss. */
  subtopicMisses: Array<{ subtopic: string; missed: number; total: number }>;
  flagged: string[];                    // qids that were flagged
  readinessReport: ReadinessRating;
}

/* ─── summarizeSim ────────────────────────────────────────────────── */

/**
 * Compute the end-of-simulation summary from attempts + the question set.
 * `attempts` may be sparse (unanswered questions produce no attempt).
 * Unanswered questions are treated as incorrect for scoring.
 */
export function summarizeSim(
  attempts: Attempt[],
  questions: Question[],
  flagged: string[] = []
): SimSummary {
  const attemptByQid = new Map<string, Attempt>();
  for (const a of attempts) attemptByQid.set(a.questionId, a);

  const correctById: Record<string, boolean> = {};
  const domainBreakdown: Record<Domain, { correct: number; total: number }> = {
    maintain: { correct: 0, total: 0 },
    prepare: { correct: 0, total: 0 },
    semantic: { correct: 0, total: 0 }
  };
  const subtopicMap = new Map<string, { missed: number; total: number }>();

  let score = 0;

  for (const q of questions) {
    const attempt = attemptByQid.get(q.id);
    const isCorrect = attempt?.correct ?? false;
    correctById[q.id] = isCorrect;
    if (isCorrect) score++;

    const dom = q.domain;
    domainBreakdown[dom].total++;
    if (isCorrect) domainBreakdown[dom].correct++;

    const sub = q.subtopic;
    const entry = subtopicMap.get(sub) ?? { missed: 0, total: 0 };
    entry.total++;
    if (!isCorrect) entry.missed++;
    subtopicMap.set(sub, entry);
  }

  // Subtopic misses sorted descending by missed count, filtered to ≥1 miss
  const subtopicMisses = [...subtopicMap.entries()]
    .filter(([, v]) => v.missed > 0)
    .map(([subtopic, v]) => ({ subtopic, missed: v.missed, total: v.total }))
    .sort((a, b) => b.missed - a.missed || b.total - a.total);

  // Delegate to analytics/readiness for the composite rating
  const readinessReport = rateReadiness(attempts, questions);

  return {
    score,
    total: questions.length,
    correctById,
    domainBreakdown,
    subtopicMisses,
    flagged: flagged.filter((id) => questions.some((q) => q.id === id)),
    readinessReport
  };
}
