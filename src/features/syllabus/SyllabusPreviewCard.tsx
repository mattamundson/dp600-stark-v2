// Compact dashboard card summarising syllabus coverage. Shows three pill
// chips — one per official DP-600 domain — comparing the bank's actual
// share to the Microsoft blueprint range, plus a CTA into /syllabus for
// the full breakdown.
//
// Imported by DashboardView (agent 2). Export name is load-bearing.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { questionBank } from '../../data/questions';
import { flashcards } from '../../data/flashcards';
import { scenarios } from '../../data/scenarios';
import {
  getSyllabusSummary,
  formatPercent,
  formatBlueprintRange,
  type CoverageStatus,
  type DomainSummary
} from './syllabus-summary';

const PILL_TONE: Record<CoverageStatus, string> = {
  'in-range': 'border-green/40 bg-green/15 text-green',
  near: 'border-amber/40 bg-amber/15 text-amber',
  'out-of-range': 'border-red/40 bg-red/15 text-red'
};

function DomainPill({ domain }: { domain: DomainSummary }) {
  return (
    <span
      className={`inline-flex flex-col gap-0.5 rounded-xl border px-3 py-2 text-[11px] ${PILL_TONE[domain.status]}`}
      data-testid={`syllabus-pill-${domain.domain}`}
    >
      <span className="font-semibold uppercase tracking-wide">{domain.label}</span>
      <span className="font-mono text-xs">
        {formatPercent(domain.actual)} <span className="opacity-60">vs {formatBlueprintRange(domain.blueprint)}</span>
      </span>
    </span>
  );
}

export function SyllabusPreviewCard() {
  const summary = useMemo(
    () => getSyllabusSummary(questionBank, flashcards, scenarios),
    []
  );

  return (
    <section
      className="panel border-cyan/40 bg-cyan/10"
      aria-labelledby="syllabus-card-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-faint">Blueprint coverage</div>
          <h2 id="syllabus-card-heading" className="text-lg font-bold">
            {summary.totalQ}-question bank vs official DP-600 weighting
          </h2>
          <p className="text-sm text-muted">
            Quick check that the bank mirrors the published exam blueprint before exam day.
          </p>
        </div>
        <Link to="/syllabus" className="btn btn-primary" aria-label="Open syllabus coverage page">
          Open syllabus →
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {summary.domains.map((d) => (
          <DomainPill key={d.domain} domain={d} />
        ))}
      </div>
    </section>
  );
}
