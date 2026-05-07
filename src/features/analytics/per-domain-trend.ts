// per-domain-trend.ts
//
// Pure logic for per-domain accuracy trend sparklines on the analytics view.
//
// Question being answered: "Is my Prepare-domain accuracy trending up
// week-over-week vs Maintain or Semantic?"
//
// Daily granularity (one bucket per ISO local-date), windowed to the last
// `days` days. Days with zero attempts in a given domain are skipped — the
// spark only plots dates with actual signal so a streak of skipped days
// doesn't drag the slope toward a meaningless zero.

import type { Attempt, Domain } from '../../lib/schema';

export interface DomainTrendPoint {
  /** ISO date (YYYY-MM-DD) in local time of the bucket */
  date: string;
  /** epoch ms of bucket start (local midnight) — used for slope regression */
  ts: number;
  /** 0..1 accuracy for this date+domain */
  accuracy: number;
  /** number of attempts on this date for this domain */
  n: number;
}

const DAY_MS = 86_400_000;

/** YYYY-MM-DD in the local timezone (matches what a user perceives as "today"). */
function isoLocalDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** epoch ms of local midnight for the day containing `ts`. */
function localMidnight(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Bucket attempts by their local-day ISO date.
 * Exported for testability and reuse.
 */
export function bucketAttemptsByDay(attempts: Attempt[]): Map<string, Attempt[]> {
  const out = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const k = isoLocalDate(a.ts);
    const cur = out.get(k);
    if (cur) cur.push(a);
    else out.set(k, [a]);
  }
  return out;
}

/**
 * Per-domain accuracy trend over the trailing `days` window.
 * Skips dates with zero attempts in `domain` so sparse domains don't get
 * dragged to 0% on idle days.
 *
 * @param attempts all attempts (any domain — we filter)
 * @param domain  the domain to plot
 * @param days    window length, default 14
 * @param now     anchor for the window's right edge (default Date.now())
 */
export function domainAccuracyTrend(
  attempts: Attempt[],
  domain: Domain,
  days = 14,
  now: number = Date.now()
): DomainTrendPoint[] {
  if (!attempts.length) return [];
  const cutoff = localMidnight(now) - (days - 1) * DAY_MS;
  const buckets = new Map<string, { ts: number; total: number; correct: number }>();
  for (const a of attempts) {
    if (a.domain !== domain) continue;
    const ts = localMidnight(a.ts);
    if (ts < cutoff) continue;
    if (ts > localMidnight(now)) continue;
    const key = isoLocalDate(a.ts);
    const cur = buckets.get(key) ?? { ts, total: 0, correct: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    buckets.set(key, cur);
  }
  const points: DomainTrendPoint[] = [];
  for (const [date, v] of buckets.entries()) {
    if (v.total === 0) continue;
    points.push({ date, ts: v.ts, accuracy: v.correct / v.total, n: v.total });
  }
  points.sort((a, b) => a.ts - b.ts);
  return points;
}

/**
 * Simple linear-regression slope over the trend, expressed as
 * accuracy-points per day (positive = improving).
 *
 * Mathematically: ordinary least squares regression of accuracy (0..1) on
 * day-index (days since the trend's first point), then converted to
 * percentage points per day by multiplying the slope by 100.
 *
 * Returns 0 if there are <2 points (no slope is definable).
 */
export function domainAccuracySlope(trend: DomainTrendPoint[]): number {
  if (trend.length < 2) return 0;
  const t0 = trend[0].ts;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of trend) {
    xs.push((p.ts - t0) / DAY_MS);
    ys.push(p.accuracy);
  }
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }
  if (den === 0) return 0;
  // slope is in accuracy-fraction per day; convert to percentage points
  return (num / den) * 100;
}
