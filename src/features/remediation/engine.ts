// Weak-area remediation engine.
//
// Computes per-subtopic weights from attempt history, surfaces "dangerous
// confident wrong" items, and builds remediation question sets.
//
// Weight formula (transparent, all knobs at the top of the file):
//
//   accuracy_signal      = 1 - accuracy             // higher when worse
//   sample_confidence    = 1 - exp(-attempts / 5)   // 0 with no data, ~0.86 at 10 attempts
//   confidence_pressure  = mean(confidence_when_wrong)  // 1.0 when always sure-but-wrong
//   recency_pressure     = exp(-days_since_last / 14)   // older mistakes fade
//
//   weight = 0.45*accuracy_signal*sample_confidence
//          + 0.30*confidence_pressure*sample_confidence
//          + 0.15*recency_pressure
//          + 0.10*latency_overrun     // average answer latency above per-difficulty target
//
// dangerScore (1.0 = highest) flags subtopics where the user is *confidently wrong*
// — the truly dangerous failure mode for an exam:
//
//   dangerScore = sure_wrong_count / max(1, wrong_count)
//
// Selection: build sorted-by-weight list, then take top N subtopics' weakest questions
// (favoring questions the user got wrong recently OR has never seen).

import type { Attempt, Question, WeakSpot } from '../../lib/schema';
import { clamp } from '../../lib/utils/arr';

/**
 * Subtopic-to-parent rollup. Wave 2 introduced finer Direct Lake slugs
 * (`direct-lake-fallback`, `direct-lake-framing`, etc.) but historical
 * attempts on `'direct-lake'` would otherwise live in their own bucket
 * away from the new finer-grained mistakes. Rollup means analytics see
 * one "direct-lake" weak spot, but drill remediation can still target
 * the parent (which expands to all children at filter time).
 *
 * Slugs absent from this map roll up to themselves (no-op).
 */
export const SUBTOPIC_GROUPS: Record<string, string> = {
  'direct-lake-fallback': 'direct-lake',
  'direct-lake-framing': 'direct-lake',
  'direct-lake-onelake': 'direct-lake',
  'direct-lake-cache': 'direct-lake'
};

export function subtopicBucket(s: string): string {
  return SUBTOPIC_GROUPS[s] ?? s;
}

/** Subtopic union helper: when `s` is a parent bucket, return all child slugs that roll up to it (plus the parent itself). */
export function subtopicChildren(s: string): string[] {
  const children = Object.entries(SUBTOPIC_GROUPS)
    .filter(([, parent]) => parent === s)
    .map(([child]) => child);
  return children.length ? [s, ...children] : [s];
}

export const REM_WEIGHTS = {
  accuracy: 0.45,
  confidence: 0.30,
  recency: 0.15,
  latency: 0.10
};

export const TARGET_LATENCY_MS: Record<number, number> = {
  1: 30_000,
  2: 45_000,
  3: 60_000,
  4: 80_000,
  5: 100_000
};

const CONFIDENCE_VALUE: Record<Attempt['confidence'], number> = {
  guess: 0.0,
  unsure: 0.5,
  sure: 1.0
};

export function weakSpots(attempts: Attempt[]): WeakSpot[] {
  if (!attempts.length) return [];
  const buckets: Record<string, Attempt[]> = {};
  for (const a of attempts) {
    const k = subtopicBucket(a.subtopic);
    buckets[k] ||= [];
    buckets[k].push(a);
  }
  const now = Date.now();
  const spots: WeakSpot[] = [];
  for (const [subtopic, items] of Object.entries(buckets)) {
    const total = items.length;
    const correct = items.filter((a) => a.correct).length;
    const accuracy = correct / total;
    const wrong = items.filter((a) => !a.correct);
    const sureWrong = wrong.filter((a) => a.confidence === 'sure').length;
    const dangerScore = wrong.length === 0 ? 0 : sureWrong / wrong.length;

    const confidenceWhenWrong = wrong.length === 0 ? 0 : wrong.reduce((s, a) => s + CONFIDENCE_VALUE[a.confidence], 0) / wrong.length;
    const lastTs = items.reduce((m, a) => Math.max(m, a.ts), 0);
    const recencyDays = (now - lastTs) / 86_400_000;
    const sampleConfidence = 1 - Math.exp(-total / 5);
    const recencyPressure = Math.exp(-recencyDays / 14);

    const avgLatency = items.reduce((s, a) => s + a.latencyMs, 0) / total;
    const targetLatency = items.reduce((s, a) => s + (TARGET_LATENCY_MS[a.difficulty] ?? 60_000), 0) / total;
    const latencyOverrun = clamp((avgLatency - targetLatency) / targetLatency, 0, 1);

    const accuracySignal = 1 - accuracy;
    const weight =
      REM_WEIGHTS.accuracy * accuracySignal * sampleConfidence +
      REM_WEIGHTS.confidence * confidenceWhenWrong * sampleConfidence +
      REM_WEIGHTS.recency * recencyPressure +
      REM_WEIGHTS.latency * latencyOverrun;

    spots.push({
      subtopic,
      domain: items[0].domain,
      attempts: total,
      accuracy,
      avgLatencyMs: avgLatency,
      dangerScore: Number(dangerScore.toFixed(3)),
      weight: Number(weight.toFixed(4))
    });
  }
  spots.sort((a, b) => b.weight - a.weight);
  return spots;
}

export interface RemediationOpts {
  size: 10 | 15 | 20;
}

export function buildRemediation(bank: Question[], attempts: Attempt[], opts: RemediationOpts): string[] {
  const spots = weakSpots(attempts);
  if (!spots.length) {
    // cold start — pick a balanced sample of mid-difficulty unseen questions
    const seen = new Set(attempts.map((a) => a.questionId));
    const candidates = bank.filter((q) => !seen.has(q.id) && q.difficulty <= 3 && !q.scenarioId);
    return candidates.slice(0, opts.size).map((q) => q.id);
  }

  const lastSeen = new Map<string, number>();
  const wrongIds = new Set<string>();
  for (const a of attempts) {
    const cur = lastSeen.get(a.questionId) ?? 0;
    if (a.ts > cur) lastSeen.set(a.questionId, a.ts);
    if (!a.correct) wrongIds.add(a.questionId);
  }

  const out: string[] = [];
  const used = new Set<string>();
  // Round-robin across top weak subtopics, biased by weight
  const ranked = spots.slice(0, Math.max(5, Math.ceil(opts.size / 2)));
  let pass = 0;
  while (out.length < opts.size && pass < 10) {
    let added = 0;
    for (const w of ranked) {
      if (out.length >= opts.size) break;
      const candidate = pickCandidate(bank, w.subtopic, wrongIds, used, lastSeen, pass);
      if (candidate) {
        out.push(candidate);
        used.add(candidate);
        added += 1;
      }
    }
    if (added === 0) break;
    pass += 1;
  }

  // backfill from any pool if still short
  if (out.length < opts.size) {
    for (const q of bank) {
      if (out.length >= opts.size) break;
      if (q.scenarioId) continue;
      if (!used.has(q.id)) {
        used.add(q.id);
        out.push(q.id);
      }
    }
  }
  return out;
}

function pickCandidate(
  bank: Question[],
  subtopic: string,
  wrongIds: Set<string>,
  used: Set<string>,
  lastSeen: Map<string, number>,
  pass: number
): string | null {
  const expanded = new Set(subtopicChildren(subtopic));
  const subPool = bank.filter((q) => expanded.has(q.subtopic) && !q.scenarioId && !used.has(q.id));
  if (!subPool.length) return null;

  // pass 0: prefer recently-wrong; pass 1: prefer unseen; pass 2+: any
  const wrong = subPool.filter((q) => wrongIds.has(q.id));
  const unseen = subPool.filter((q) => !lastSeen.has(q.id));

  if (pass === 0 && wrong.length) return wrong[0].id;
  if (pass === 1 && unseen.length) return unseen[0].id;
  return subPool[0].id;
}
