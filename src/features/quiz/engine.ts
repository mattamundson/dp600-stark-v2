// Adaptive quiz selector.
//
// Inputs: full question bank + historical attempts + target session length.
// Output: an ordered list of question ids the engine wants to ask next.
//
// Selection strategy (transparent and tunable):
//   1. Compute weak-area weights (see remediation/engine.ts: weakSpots).
//   2. Compute per-question priority:
//        priority = subtopic_weakness  * 0.55
//                 + domain_weakness    * 0.20
//                 + recency_bonus      * 0.10   // questions not asked in the last 14 days
//                 + difficulty_match   * 0.10   // matches user's current ability band
//                 + freshness_bonus    * 0.05   // unseen questions float up over very-old ones
//   3. Pull domain-stratified to keep the exam blueprint roughly intact:
//        ~ blueprint% per domain, plus 1 round of overflow if a domain is short.
//   4. Within domain, sample by priority rank with mild jitter (deterministic seed
//      for the session id).
//
// Configurable via the constants below.

import type { Attempt, Domain, Question, Settings } from '../../lib/schema';
import { DOMAIN_WEIGHT, DOMAINS } from '../../lib/schema';
import { weakSpots } from '../remediation/engine';
import { seededShuffle } from '../../lib/utils/arr';

export const PRIORITY_WEIGHTS = {
  subtopicWeakness: 0.55,
  domainWeakness: 0.2,
  recency: 0.1,
  difficultyMatch: 0.1,
  freshness: 0.05
};

export interface BuildOpts {
  size: number;
  seed: number;
  /** if 'simulation', enforce strict blueprint stratification and ignore weak weighting */
  mode?: 'adaptive' | 'simulation';
  /** restrict to scenario? */
  scenarioId?: string;
  /** user settings — read for emphasisMode skew. Simulation ignores emphasis (real exam mix). */
  settings?: Settings;
}

export function buildQuiz(bank: Question[], attempts: Attempt[], opts: BuildOpts): string[] {
  const pool = opts.scenarioId ? bank.filter((q) => q.scenarioId === opts.scenarioId) : bank.filter((q) => !q.scenarioId || opts.mode === 'simulation');
  if (!pool.length) return [];

  const targets = stratifiedTargets(opts.size, opts.mode === 'simulation' ? undefined : opts.settings);
  const weak = weakSpots(attempts);
  const lastSeen = lastSeenMap(attempts);
  const seenCount = seenCountMap(attempts);
  const userBand = abilityBand(attempts);

  // domain → priority-sorted candidate ids
  const byDomain: Record<string, string[]> = {};
  for (const d of DOMAINS) {
    const candidates = pool.filter((q) => q.domain === d);
    const scored = candidates.map((q) => ({ id: q.id, p: priority(q, weak, lastSeen, seenCount, userBand) }));
    scored.sort((a, b) => b.p - a.p);
    byDomain[d] = scored.map((s) => s.id);
  }

  if (opts.mode === 'simulation') {
    // For simulation: sample seeded but evenly from priority ranks
    const out: string[] = [];
    for (const d of DOMAINS) {
      const want = targets[d];
      const slice = byDomain[d].slice(0, Math.max(want * 2, want + 5));
      out.push(...seededShuffle(slice, opts.seed + d.length).slice(0, want));
    }
    return seededShuffle(out, opts.seed + 7).slice(0, opts.size);
  }

  // Adaptive: prefer top-priority, but include a freshness cap so users don't see only their weakest questions
  const out: string[] = [];
  const used = new Set<string>();
  for (const d of DOMAINS) {
    const want = targets[d];
    let i = 0;
    let added = 0;
    while (added < want && i < byDomain[d].length) {
      const id = byDomain[d][i++];
      if (used.has(id)) continue;
      used.add(id);
      out.push(id);
      added += 1;
    }
  }
  // overflow if any domain had fewer questions than target
  if (out.length < opts.size) {
    for (const d of DOMAINS) {
      for (const id of byDomain[d]) {
        if (out.length >= opts.size) break;
        if (!used.has(id)) {
          used.add(id);
          out.push(id);
        }
      }
      if (out.length >= opts.size) break;
    }
  }
  return seededShuffle(out, opts.seed).slice(0, opts.size);
}

export function stratifiedTargets(size: number, settings?: Settings): Record<string, number> {
  // Start with blueprint weights, optionally skewed by user emphasis.
  const weights: Record<Domain, number> = {
    maintain: DOMAIN_WEIGHT.maintain,
    prepare: DOMAIN_WEIGHT.prepare,
    semantic: DOMAIN_WEIGHT.semantic
  };
  const em = settings?.emphasisMode;
  const live = !!em && em.expiresAt > Date.now() && em.sessionsRemaining > 0;
  if (live && em) {
    const BUMP = 0.15;
    const others = (Object.keys(weights) as Domain[]).filter((d) => d !== em.domain);
    const otherSum = others.reduce((acc, d) => acc + weights[d], 0);
    weights[em.domain] = weights[em.domain] + BUMP;
    for (const d of others) {
      weights[d] = Math.max(0.05, weights[d] - BUMP * (weights[d] / otherSum));
    }
    const sum = weights.maintain + weights.prepare + weights.semantic;
    weights.maintain /= sum; weights.prepare /= sum; weights.semantic /= sum;
  }
  const out: Record<string, number> = {
    maintain: Math.round(size * weights.maintain),
    prepare: Math.round(size * weights.prepare),
    semantic: Math.round(size * weights.semantic)
  };
  // round-fix to land on `size`
  let total = out.maintain + out.prepare + out.semantic;
  while (total > size) { out.semantic > 0 ? out.semantic-- : out.maintain > 0 ? out.maintain-- : out.prepare--; total--; }
  while (total < size) { out.prepare++; total++; }
  return out;
}

function priority(
  q: Question,
  weak: ReturnType<typeof weakSpots>,
  lastSeen: Map<string, number>,
  seenCount: Map<string, number>,
  userBand: number
): number {
  const sub = weak.find((w) => w.subtopic === q.subtopic);
  const subWeak = sub ? sub.weight : 0.5; // unknown topic gets median weight
  const domWeak = weakDomainScore(q.domain, weak);
  const last = lastSeen.get(q.id) ?? 0;
  const recencyDays = last === 0 ? 999 : (Date.now() - last) / 86_400_000;
  const recency = recencyDays >= 14 ? 1 : recencyDays / 14;
  const diffMatch = 1 - Math.min(1, Math.abs(q.difficulty - userBand) / 4);
  const freshness = (seenCount.get(q.id) ?? 0) === 0 ? 1 : 0.5;
  return (
    PRIORITY_WEIGHTS.subtopicWeakness * subWeak +
    PRIORITY_WEIGHTS.domainWeakness * domWeak +
    PRIORITY_WEIGHTS.recency * recency +
    PRIORITY_WEIGHTS.difficultyMatch * diffMatch +
    PRIORITY_WEIGHTS.freshness * freshness
  );
}

function weakDomainScore(d: Question['domain'], weak: ReturnType<typeof weakSpots>): number {
  const inDomain = weak.filter((w) => w.domain === d);
  if (!inDomain.length) return 0.5;
  return inDomain.reduce((acc, w) => acc + w.weight, 0) / inDomain.length;
}

function lastSeenMap(attempts: Attempt[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of attempts) {
    const cur = m.get(a.questionId) ?? 0;
    if (a.ts > cur) m.set(a.questionId, a.ts);
  }
  return m;
}

function seenCountMap(attempts: Attempt[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of attempts) m.set(a.questionId, (m.get(a.questionId) ?? 0) + 1);
  return m;
}

/** crude ability estimator: weighted accuracy on difficulty bands (1..5). Returns 1..5. */
export function abilityBand(attempts: Attempt[]): number {
  if (!attempts.length) return 3;
  const buckets: Record<number, { c: number; t: number }> = {};
  for (const a of attempts) {
    buckets[a.difficulty] ||= { c: 0, t: 0 };
    buckets[a.difficulty].t += 1;
    if (a.correct) buckets[a.difficulty].c += 1;
  }
  // ability ≈ highest difficulty where accuracy ≥ 0.6
  let best = 1;
  for (let d = 1; d <= 5; d++) {
    const b = buckets[d];
    if (b && b.t >= 3 && b.c / b.t >= 0.6) best = d;
  }
  return best;
}
