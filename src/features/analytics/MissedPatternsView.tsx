import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAttempts } from '../../lib/storage/db';
import { questionBank } from '../../data/questions';
import { groupMissedAttempts, type MissedGroup } from './missed-patterns';
import type { Attempt } from '../../lib/schema';
import { DOMAIN_LABEL } from '../../lib/schema';
import { useSettings } from '../../app/providers/SettingsProvider';
import { RetentionPanel } from '../missed/RetentionPanel';

/** Format a timestamp as a relative string, e.g. "2 hours ago". */
function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export function MissedPatternsView() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const { settings, patch } = useSettings();

  useEffect(() => {
    void listAttempts().then((a) => {
      setAttempts(a);
      setLoaded(true);
    });
  }, []);

  const allGroups = useMemo(() => groupMissedAttempts(attempts, questionBank), [attempts]);

  const resolvedMap = settings?.resolvedMissedPatterns ?? {};
  const { activeGroups, resolvedGroups } = useMemo(() => {
    const active: MissedGroup[] = [];
    const resolved: MissedGroup[] = [];
    for (const g of allGroups) {
      const resolvedAt = resolvedMap[g.subtopic];
      const hasNewMiss = resolvedAt
        ? g.recentMisses.some((m) => m.timestamp > resolvedAt)
        : true;
      if (resolvedAt && !hasNewMiss) resolved.push(g);
      else active.push(g);
    }
    return { activeGroups: active, resolvedGroups: resolved };
  }, [allGroups, resolvedMap]);

  async function markResolved(subtopic: string) {
    await patch({
      resolvedMissedPatterns: { ...resolvedMap, [subtopic]: Date.now() }
    });
  }

  async function unresolve(subtopic: string) {
    const next = { ...resolvedMap };
    delete next[subtopic];
    await patch({ resolvedMissedPatterns: next });
  }

  if (!loaded) {
    return (
      <section className="panel">
        <p className="text-muted">Loading…</p>
      </section>
    );
  }

  if (allGroups.length === 0) {
    return (
      <section className="panel">
        <h1 className="text-xl font-bold">Wrong-answer patterns</h1>
        <p className="mt-2 text-muted">
          No missed questions yet — start a quiz to populate this view.
        </p>
        <Link to="/quiz?len=10" className="btn btn-primary mt-3">
          Start a 10-question quiz
        </Link>
      </section>
    );
  }

  const totalMisses = allGroups.reduce((s, g) => s + g.missCount, 0);
  const sessionSet = new Set(attempts.map((a) => a.sessionId));

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Wrong-answer patterns</h1>
            <p className="mt-1 text-sm text-muted">
              {activeGroups.length} active subtopic{activeGroups.length === 1 ? '' : 's'} ·{' '}
              <strong>{totalMisses}</strong> total miss{totalMisses === 1 ? '' : 'es'} across{' '}
              {sessionSet.size} session{sessionSet.size === 1 ? '' : 's'}
              {resolvedGroups.length > 0 && (
                <> · <span className="text-ok">{resolvedGroups.length} resolved</span></>
              )}
            </p>
          </div>
          {resolvedGroups.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => setShowResolved((v) => !v)}
            >
              {showResolved ? 'Hide resolved' : `Show ${resolvedGroups.length} resolved`}
            </button>
          )}
        </div>
      </header>

      <RetentionPanel
        attempts={attempts}
        resolvedSubtopics={resolvedMap}
        onPatch={patch}
      />

      {activeGroups.map((group) => (
        <GroupPanel
          key={group.subtopic}
          group={group}
          onResolve={() => void markResolved(group.subtopic)}
        />
      ))}

      {showResolved && resolvedGroups.length > 0 && (
        <>
          <h2 className="mt-4 text-sm font-bold uppercase tracking-wide text-faint">
            Resolved
          </h2>
          {resolvedGroups.map((group) => (
            <GroupPanel
              key={`resolved-${group.subtopic}`}
              group={group}
              resolved
              resolvedAt={resolvedMap[group.subtopic]}
              onUnresolve={() => void unresolve(group.subtopic)}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface GroupPanelProps {
  group: MissedGroup;
  resolved?: boolean;
  resolvedAt?: number;
  onResolve?: () => void;
  onUnresolve?: () => void;
}

function GroupPanel({ group, resolved, resolvedAt, onResolve, onUnresolve }: GroupPanelProps) {
  const accuracyPct = Math.round(group.accuracy * 100);
  const accuracyClass =
    group.accuracy < 0.5
      ? 'text-bad'
      : group.accuracy < 0.75
        ? 'text-warn'
        : 'text-ok';

  const badgeClass =
    group.accuracy < 0.5
      ? 'badge-bad'
      : group.accuracy < 0.75
        ? 'badge-warn'
        : 'badge-ok';

  return (
    <section className={`panel flex flex-col gap-3 ${resolved ? 'opacity-70' : ''}`}>
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{group.subtopic}</h2>
          <span className="badge badge-info">{DOMAIN_LABEL[group.domain]}</span>
          {group.recentMisses.some((m) => m.isConfidentMiss) && (
            <span className="badge badge-bad" title="You missed at least one of these while confident">
              Confident miss
            </span>
          )}
          {resolved && (
            <span className="badge badge-ok" title={resolvedAt ? `Marked resolved ${relativeTime(resolvedAt)}` : ''}>
              Resolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">
            {group.missCount} miss{group.missCount === 1 ? '' : 'es'} / {group.totalCount} attempts
          </span>
          <span className={`badge ${badgeClass}`}>
            <span className={accuracyClass}>{accuracyPct}%</span>
          </span>
        </div>
      </div>

      {/* ── Drill / Resolve CTAs ── */}
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/remediation?subtopic=${encodeURIComponent(group.subtopic)}&size=10`}
          className="btn btn-primary"
        >
          Drill these
        </Link>
        {!resolved && onResolve && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onResolve}
            title="Hide this subtopic until a new miss is logged"
          >
            Mark resolved
          </button>
        )}
        {resolved && onUnresolve && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onUnresolve}
            title="Remove the resolved flag and re-surface this subtopic"
          >
            Unresolve
          </button>
        )}
      </div>

      {/* ── Collapsible miss list ── */}
      <details className="group/details">
        <summary className="cursor-pointer select-none text-sm text-muted hover:text-text">
          {group.recentMisses.length === 0
            ? 'No question details available'
            : `Show ${group.recentMisses.length} recent miss${group.recentMisses.length === 1 ? '' : 'es'}`}
        </summary>

        {group.recentMisses.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {group.recentMisses.map((miss) => (
              <li
                key={`${miss.questionId}-${miss.timestamp}`}
                className="rounded-xl border border-border bg-surface2 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {/* Prompt truncated */}
                  <p className="flex-1 text-text">
                    {truncate(miss.question.prompt)}
                  </p>
                  {/* Right-side meta */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <ConfidenceBadge
                        confidence={miss.confidence}
                        isConfidentMiss={miss.isConfidentMiss}
                      />
                    </div>
                    <span className="text-xs text-faint">{relativeTime(miss.timestamp)}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <Link
                    to={`/q/${miss.questionId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Review →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}

function ConfidenceBadge({
  confidence,
  isConfidentMiss
}: {
  confidence: 'sure' | 'unsure' | 'guess';
  isConfidentMiss: boolean;
}) {
  if (isConfidentMiss) {
    return (
      <span className="badge badge-bad" title="You were sure but got it wrong">
        Sure — wrong
      </span>
    );
  }
  if (confidence === 'sure') {
    // Shouldn't reach here since isConfidentMiss covers sure+wrong,
    // but guard for completeness (correct+sure would not be in this list).
    return <span className="badge badge-ok">Sure</span>;
  }
  if (confidence === 'unsure') {
    return <span className="badge badge-warn">Unsure</span>;
  }
  return <span className="badge">Guess</span>;
}
