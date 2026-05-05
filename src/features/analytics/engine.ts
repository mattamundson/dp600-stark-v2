// Aggregations + rollups consumed by the Analytics view and Dashboard.

import type { Attempt, Confidence, Domain, Session } from '../../lib/schema';
import { DOMAINS } from '../../lib/schema';

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
