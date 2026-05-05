// Three-bucket "dangerous weak spots" panel.
//
// Surfaces the failure modes that matter most for an exam-prep app:
//   1. Low accuracy   — subtopics where the user is straight-up wrong a lot.
//   2. Confidently wrong — subtopics where the user is *sure* and still wrong
//      (the truly dangerous failure mode — see remediation/engine.ts dangerScore).
//   3. Slow answers   — subtopics where average latency exceeds the
//      per-difficulty target by ≥50% (likely a comprehension gap, not a fluency gap).
//
// Each bucket links straight into a remediation drill of 10 / 15 / 20 questions,
// pre-seeded by subtopic via querystring (RemediationView reads ?subtopic= & ?size=).
//
// All thresholds are local to this component — the engine deliberately stays
// agnostic; this is a UI surfacing concern, not a scoring concern.

import { Link } from 'react-router-dom';
import type { Attempt, WeakSpot } from '../lib/schema';
import { DOMAIN_LABEL } from '../lib/schema';
import { weakSpots, TARGET_LATENCY_MS } from '../features/remediation/engine';
import { formatHumanDuration } from '../lib/utils/time';

export interface DangerousWeakSpotsPanelProps {
  attempts: Attempt[];
}

interface SlowSpot extends WeakSpot {
  targetLatencyMs: number;
}

const MIN_ATTEMPTS_LOW_ACC = 3;
const MIN_WRONG_CONFIDENT = 2;
const DANGER_THRESHOLD = 0.5;
const SLOW_OVERRUN_RATIO = 1.5; // > target * 1.5
const TOP_N = 5;

export function DangerousWeakSpotsPanel(props: DangerousWeakSpotsPanelProps) {
  const { attempts } = props;
  const spots = weakSpots(attempts);

  const lowAccuracy = spots
    .filter((s) => s.attempts >= MIN_ATTEMPTS_LOW_ACC)
    .slice()
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, TOP_N);

  // wrong-count per subtopic — needed for the "≥2 wrong attempts" gate
  const wrongCounts: Record<string, number> = {};
  for (const a of attempts) {
    if (!a.correct) wrongCounts[a.subtopic] = (wrongCounts[a.subtopic] ?? 0) + 1;
  }

  const confidentlyWrong = spots
    .filter((s) => s.dangerScore >= DANGER_THRESHOLD && (wrongCounts[s.subtopic] ?? 0) >= MIN_WRONG_CONFIDENT)
    .slice()
    .sort((a, b) => b.dangerScore - a.dangerScore)
    .slice(0, TOP_N);

  // Slow: avg latency > target * 1.5. Recompute per-subtopic target (mean across attempts).
  const slowAnswers: SlowSpot[] = [];
  const bySubtopic: Record<string, Attempt[]> = {};
  for (const a of attempts) {
    bySubtopic[a.subtopic] ||= [];
    bySubtopic[a.subtopic].push(a);
  }
  for (const s of spots) {
    const items = bySubtopic[s.subtopic] ?? [];
    if (!items.length) continue;
    const target = items.reduce((sum, a) => sum + (TARGET_LATENCY_MS[a.difficulty] ?? 60_000), 0) / items.length;
    if (s.avgLatencyMs > target * SLOW_OVERRUN_RATIO) {
      slowAnswers.push({ ...s, targetLatencyMs: target });
    }
  }
  slowAnswers.sort((a, b) => b.avgLatencyMs / b.targetLatencyMs - a.avgLatencyMs / a.targetLatencyMs);
  const slowTop = slowAnswers.slice(0, TOP_N);

  return (
    <section className="panel">
      <div className="mb-3">
        <h2 className="text-lg font-bold">Dangerous weak spots</h2>
        <p className="text-xs text-muted">Three failure modes worth fixing first. Each row drills into a targeted remediation set.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Bucket
          title="Low accuracy"
          description="Worst overall hit-rate (≥3 attempts)."
          items={lowAccuracy}
          emptyHint="Not enough data yet"
          renderMetric={(w) => `${Math.round(w.accuracy * 100)}% acc`}
          metricTone={(w) => (w.accuracy < 0.5 ? 'text-bad' : 'text-warn')}
        />
        <Bucket
          title="Confidently wrong"
          description="Sure about the answer — and wrong. The exam-killer pattern."
          items={confidentlyWrong}
          emptyHint="Not enough data yet"
          renderMetric={(w) => `${Math.round(w.dangerScore * 100)}% danger`}
          metricTone={() => 'text-bad'}
        />
        <Bucket
          title="Slow answers"
          description="Avg time per question >50% over the difficulty-adjusted target."
          items={slowTop}
          emptyHint="Not enough data yet"
          renderMetric={(w) => formatHumanDuration(w.avgLatencyMs)}
          metricTone={() => 'text-warn'}
        />
      </div>
    </section>
  );
}

interface BucketProps<T extends WeakSpot> {
  title: string;
  description: string;
  items: T[];
  emptyHint: string;
  renderMetric: (w: T) => string;
  metricTone: (w: T) => string;
}

function Bucket<T extends WeakSpot>(props: BucketProps<T>) {
  const { title, description, items, emptyHint, renderMetric, metricTone } = props;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs text-faint">{description}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{emptyHint}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((w) => (
            <li key={w.subtopic} className="rounded-lg border border-border bg-surface2 px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{w.subtopic}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="badge">{DOMAIN_LABEL[w.domain]}</span>
                    <span className={metricTone(w)}>{renderMetric(w)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {([10, 15, 20] as const).map((n) => (
                  <Link
                    key={n}
                    to={`/remediation?subtopic=${encodeURIComponent(w.subtopic)}&size=${n}`}
                    className="btn btn-ghost px-2 py-1 text-xs"
                  >
                    Drill {n}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
