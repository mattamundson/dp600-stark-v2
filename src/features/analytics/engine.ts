// Aggregations + rollups consumed by the Analytics view and Dashboard.

import type { Attempt, Confidence, Domain, Session, SessionMode } from '../../lib/schema';
import { DOMAINS } from '../../lib/schema';

/* ─── Exam-pacing constants ─────────────────────────────────────── */
// DP-600 published format: 100-minute window, 40-60 question count.
// Target band per question = total / max-Q .. total / min-Q.
export const EXAM_TOTAL_MS = 100 * 60_000;
export const EXAM_QUESTIONS_MIN = 40;
export const EXAM_QUESTIONS_MAX = 60;
export const TARGET_PER_Q_MS_LOW = EXAM_TOTAL_MS / EXAM_QUESTIONS_MAX;  // 100,000 ms (1:40)
export const TARGET_PER_Q_MS_HIGH = EXAM_TOTAL_MS / EXAM_QUESTIONS_MIN; // 150,000 ms (2:30)
// Yellow zone = up to 20% over high target before red. Red = projection blows the time budget.
export const PACING_YELLOW_CEILING_MS = TARGET_PER_Q_MS_HIGH * 1.2;     // 180,000 ms (3:00)
// "Q to project against" — 65 is a slightly conservative midpoint of the 40-60 published range.
export const PROJECTION_QUESTIONS = 65;

export interface DomainAccuracy {
  domain: Domain;
  total: number;
  correct: number;
  accuracy: number;
}

export function accuracyByDomain(attempts: Attempt[]): DomainAccuracy[] {
  const out: Record<Domain, DomainAccuracy> = {
    maintain: { domain: 'maintain', total: 0, correct: 0, accuracy: 0 },
    prepare: { domain: 'prepare', total: 0, correct: 0, accuracy: 0 },
    semantic: { domain: 'semantic', total: 0, correct: 0, accuracy: 0 }
  };
  for (const a of attempts) {
    out[a.domain].total += 1;
    if (a.correct) out[a.domain].correct += 1;
  }
  for (const d of DOMAINS) out[d].accuracy = out[d].total === 0 ? 0 : out[d].correct / out[d].total;
  return DOMAINS.map((d) => out[d]);
}

export interface SubtopicAccuracy {
  subtopic: string;
  domain: Domain;
  total: number;
  correct: number;
  accuracy: number;
}

export function accuracyBySubtopic(attempts: Attempt[]): SubtopicAccuracy[] {
  const m = new Map<string, SubtopicAccuracy>();
  for (const a of attempts) {
    const k = a.subtopic;
    let entry = m.get(k);
    if (!entry) {
      entry = { subtopic: k, domain: a.domain, total: 0, correct: 0, accuracy: 0 };
      m.set(k, entry);
    }
    entry.total += 1;
    if (a.correct) entry.correct += 1;
  }
  for (const v of m.values()) v.accuracy = v.correct / v.total;
  return [...m.values()].sort((a, b) => a.accuracy - b.accuracy);
}

export interface CalibrationBucket {
  confidence: Confidence;
  total: number;
  correct: number;
  accuracy: number;
}

export function calibration(attempts: Attempt[]): CalibrationBucket[] {
  const out: Record<Confidence, CalibrationBucket> = {
    sure: { confidence: 'sure', total: 0, correct: 0, accuracy: 0 },
    unsure: { confidence: 'unsure', total: 0, correct: 0, accuracy: 0 },
    guess: { confidence: 'guess', total: 0, correct: 0, accuracy: 0 }
  };
  for (const a of attempts) {
    out[a.confidence].total += 1;
    if (a.correct) out[a.confidence].correct += 1;
  }
  for (const k of Object.keys(out) as Confidence[]) {
    out[k].accuracy = out[k].total === 0 ? 0 : out[k].correct / out[k].total;
  }
  return [out.sure, out.unsure, out.guess];
}

export function recentWindow(attempts: Attempt[], days: number, now = Date.now()): Attempt[] {
  const cutoff = now - days * 86_400_000;
  return attempts.filter((a) => a.ts >= cutoff);
}

export interface TimePerTopic {
  subtopic: string;
  avgMs: number;
  total: number;
}

export function timePerTopic(attempts: Attempt[]): TimePerTopic[] {
  const m = new Map<string, { sum: number; total: number }>();
  for (const a of attempts) {
    if (a.latencyMs <= 0) continue;
    const cur = m.get(a.subtopic) ?? { sum: 0, total: 0 };
    cur.sum += a.latencyMs;
    cur.total += 1;
    m.set(a.subtopic, cur);
  }
  return [...m.entries()]
    .map(([subtopic, v]) => ({ subtopic, avgMs: v.sum / v.total, total: v.total }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

export interface TrendPoint {
  bucketStart: number;
  total: number;
  correct: number;
  accuracy: number;
}

/** Bucket attempts into N-day buckets (default 1 day = daily trend). */
export function trend(attempts: Attempt[], bucketDays = 1, now = Date.now()): TrendPoint[] {
  if (!attempts.length) return [];
  const sorted = [...attempts].sort((a, b) => a.ts - b.ts);
  const start = sorted[0].ts;
  const bucketMs = bucketDays * 86_400_000;
  const buckets = new Map<number, TrendPoint>();
  for (const a of sorted) {
    const idx = Math.floor((a.ts - start) / bucketMs);
    const b0 = start + idx * bucketMs;
    const cur = buckets.get(b0) ?? { bucketStart: b0, total: 0, correct: 0, accuracy: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    buckets.set(b0, cur);
  }
  // fill gaps so charts render contiguous
  const points: TrendPoint[] = [];
  for (let t = start; t <= now; t += bucketMs) {
    const cur = buckets.get(t) ?? { bucketStart: t, total: 0, correct: 0, accuracy: 0 };
    cur.accuracy = cur.total === 0 ? 0 : cur.correct / cur.total;
    points.push(cur);
  }
  return points;
}

export function finishedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => Boolean(s.finishedAt && s.resultSummary)).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
}

/* ─── Pacing summary ────────────────────────────────────────────── */

export type PacingStatus = 'green' | 'yellow' | 'red' | 'insufficient';

export interface PacingBucket {
  source: 'all' | 'simulation' | 'adaptive';
  attempts: number;
  avgMs: number;
  /** projected total minutes if EVERY exam question took this long */
  projectionMinutes: number;
  status: PacingStatus;
}

export interface PacingByDomain {
  domain: Domain;
  attempts: number;
  avgMs: number;
}

export interface PacingSummary {
  /** all attempts in the window with measured latency */
  overall: PacingBucket;
  /** simulation attempts only (skipped if simulation latency==0; falls back to all) */
  simulationOrAll: PacingBucket;
  /** non-simulation timed attempts (adaptive quiz / remediation) */
  adaptive: PacingBucket;
  /** per-domain avg ms across the window */
  byDomain: PacingByDomain[];
}

const SIMULATION_MODES: SessionMode[] = ['simulation'];
const ADAPTIVE_MODES: SessionMode[] = ['quiz-10', 'quiz-25', 'quiz-50', 'remediation-10', 'remediation-15', 'remediation-20'];

function classify(avgMs: number, attempts: number): PacingStatus {
  if (attempts < 5 || avgMs <= 0) return 'insufficient';
  if (avgMs <= TARGET_PER_Q_MS_HIGH) return 'green';
  if (avgMs <= PACING_YELLOW_CEILING_MS) return 'yellow';
  return 'red';
}

function bucket(source: PacingBucket['source'], attempts: Attempt[]): PacingBucket {
  const timed = attempts.filter((a) => a.latencyMs > 0);
  const total = timed.length;
  const avgMs = total === 0 ? 0 : timed.reduce((acc, a) => acc + a.latencyMs, 0) / total;
  return {
    source,
    attempts: total,
    avgMs,
    projectionMinutes: total === 0 ? 0 : (avgMs * PROJECTION_QUESTIONS) / 60_000,
    status: classify(avgMs, total)
  };
}

/**
 * Pacing summary over the supplied attempts. Pass attempts already filtered
 * to a window (e.g. last 7 days via `recentWindow`). Sessions are needed to
 * tag attempts as simulation vs adaptive — the Attempt itself doesn't carry
 * mode, so we look up sessionId.
 */
export function pacingSummary(attempts: Attempt[], sessions: Session[]): PacingSummary {
  const simSet = new Set(sessions.filter((s) => SIMULATION_MODES.includes(s.mode)).map((s) => s.id));
  const adaptiveSet = new Set(sessions.filter((s) => ADAPTIVE_MODES.includes(s.mode)).map((s) => s.id));

  const simAttempts = attempts.filter((a) => simSet.has(a.sessionId));
  const adaptiveAttempts = attempts.filter((a) => adaptiveSet.has(a.sessionId));

  const overall = bucket('all', attempts);
  const simulationBucket = bucket('simulation', simAttempts);
  // Simulation currently writes latencyMs=0 (engine.ts:97). Fall back to all-attempts when sim has no measurable latency.
  const simulationOrAll: PacingBucket = simulationBucket.attempts > 0 && simulationBucket.avgMs > 0
    ? simulationBucket
    : { ...overall, source: 'simulation' };
  const adaptive = bucket('adaptive', adaptiveAttempts);

  const byDomainMap = new Map<Domain, { sum: number; total: number }>();
  for (const a of attempts) {
    if (a.latencyMs <= 0) continue;
    const cur = byDomainMap.get(a.domain) ?? { sum: 0, total: 0 };
    cur.sum += a.latencyMs;
    cur.total += 1;
    byDomainMap.set(a.domain, cur);
  }
  const byDomain: PacingByDomain[] = DOMAINS.map((d) => {
    const v = byDomainMap.get(d) ?? { sum: 0, total: 0 };
    return { domain: d, attempts: v.total, avgMs: v.total === 0 ? 0 : v.sum / v.total };
  });

  return { overall, simulationOrAll, adaptive, byDomain };
}
