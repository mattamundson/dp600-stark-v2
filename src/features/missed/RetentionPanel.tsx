// RetentionPanel — surfaces resolved subtopics that have aged past N days
// without any re-attempts, and offers a curated 3-question retention drill.
//
// Designed to drop in at the top of MissedPatternsView. See the integration
// note at the bottom of this file for the one-liner host change.
//
// Storage shape: reads `Settings.resolvedMissedPatterns: Record<string, number>`
// (subtopic → resolvedAt epoch ms). Already a slug→timestamp map; no migration
// needed. On a passing retention drill (≥ 80% on ≥ 3 post-resolve attempts in
// the subtopic), bumps `resolvedAt` forward to the latest attempt ts so the
// user is not re-tested the next day.

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Attempt, Settings } from '../../lib/schema';
import {
  DEFAULT_DRILL_SIZE,
  DEFAULT_RETENTION_DAYS,
  evaluateRetentionDrill,
  getRetentionDue,
  type RetentionItem,
} from './retention-loop';

interface RetentionPanelProps {
  attempts: Attempt[];
  resolvedSubtopics: Record<string, number>;
  /** Patch helper from useSettings(); receives a partial Settings to merge. */
  onPatch: (patch: Partial<Settings>) => void | Promise<void>;
  /** Optional injection points — default to the production constants. */
  now?: number;
  daysAfterResolve?: number;
  drillSize?: number;
}

/**
 * Drop-in panel for /missed.
 *
 * Behavior:
 *   - On render, computes which resolved subtopics are due for retention.
 *   - Auto-bumps `resolvedAt` for any subtopic whose post-resolve attempts
 *     already meet the pass threshold (so the user isn't re-prompted on
 *     the next session).
 *   - Renders one row per due subtopic with a "Retest 3 questions" CTA
 *     that links to /remediation?subtopic=…&size=10. The remediation
 *     engine prefers the subtopic's weakest items, which matches the
 *     retention-drill intent.
 *   - When the panel has no due items, it renders nothing.
 */
export function RetentionPanel(props: RetentionPanelProps) {
  const {
    attempts,
    resolvedSubtopics,
    onPatch,
    now = Date.now(),
    daysAfterResolve = DEFAULT_RETENTION_DAYS,
    drillSize = DEFAULT_DRILL_SIZE,
  } = props;

  const due: RetentionItem[] = useMemo(
    () => getRetentionDue(resolvedSubtopics, attempts, now, daysAfterResolve),
    [resolvedSubtopics, attempts, now, daysAfterResolve]
  );

  // Auto-bump: if the user has *already* completed a passing retention drill
  // since the last resolve (e.g. they did a quiz that covered this subtopic
  // before opening /missed), advance the resolution timestamp without
  // re-prompting.
  useEffect(() => {
    if (Object.keys(resolvedSubtopics).length === 0) return;
    let next: Record<string, number> | null = null;
    for (const [subtopic, resolvedAt] of Object.entries(resolvedSubtopics)) {
      const passTs = evaluateRetentionDrill(subtopic, attempts, resolvedAt);
      if (passTs && passTs > resolvedAt) {
        if (!next) next = { ...resolvedSubtopics };
        next[subtopic] = passTs;
      }
    }
    if (next) void onPatch({ resolvedMissedPatterns: next });
    // Only run when attempts or resolvedSubtopics change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, resolvedSubtopics]);

  if (due.length === 0) return null;

  return (
    <section className="panel border-warn">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Retention check due</h2>
          <p className="mt-1 text-sm text-muted">
            {due.length} resolved subtopic{due.length === 1 ? '' : 's'} aged past{' '}
            {daysAfterResolve} day{daysAfterResolve === 1 ? '' : 's'} without a
            re-attempt. Re-test {drillSize} questions to confirm retention.
          </p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {due.map((item) => (
          <li
            key={item.subtopic}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface2 p-3 text-sm"
            data-testid={`retention-row-${item.subtopic}`}
          >
            <div>
              <div className="font-semibold">{item.subtopic}</div>
              <div className="text-xs text-muted">
                Resolved {item.daysSinceResolved} day
                {item.daysSinceResolved === 1 ? '' : 's'} ago · {item.totalAttemptsInSubtopic}{' '}
                lifetime attempts
              </div>
            </div>
            <Link
              to={`/remediation?subtopic=${encodeURIComponent(item.subtopic)}&size=10`}
              className="btn btn-primary"
              aria-label={`Retest ${drillSize} questions on ${item.subtopic}`}
            >
              Retest {drillSize} questions
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * INTEGRATION NOTE — for the host (src/features/analytics/MissedPatternsView)
 *
 * To wire this panel into /missed, add the import and one element near the
 * top of the rendered output:
 *
 *   import { RetentionPanel } from '../missed/RetentionPanel';
 *
 *   …inside MissedPatternsView, after the <header className="panel"> block:
 *
 *   <RetentionPanel
 *     attempts={attempts}
 *     resolvedSubtopics={resolvedMap}
 *     onPatch={patch}
 *   />
 *
 * No other changes are required — RetentionPanel reads the existing
 * `Record<string, number>` shape and renders nothing when there are no
 * due items.
 * ────────────────────────────────────────────────────────────────────────── */
