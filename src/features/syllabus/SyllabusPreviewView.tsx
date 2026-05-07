// Full-page syllabus coverage view at /syllabus.
//
// Goal: a single page where the user can confirm "the bank covers the
// official DP-600 blueprint" before exam day. Shows per-domain weighting
// (actual vs Microsoft published 25–30 / 45–50 / 25–30) plus a subtopic
// table per domain so any gaps are visible.
//
// Print path: relies on the global `@media print` rules in src/styles/
// globals.css which already wash out the dark theme + hide aside / buttons.
// No view-local overrides needed.

import { useMemo } from 'react';
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

const STATUS_BADGE: Record<CoverageStatus, { label: string; className: string }> = {
  'in-range': {
    label: 'In blueprint range',
    className: 'border-green/40 bg-green/15 text-green'
  },
  near: {
    label: 'Within ±5%',
    className: 'border-amber/40 bg-amber/15 text-amber'
  },
  'out-of-range': {
    label: 'Outside ±5%',
    className: 'border-red/40 bg-red/15 text-red'
  }
};

function CoverageBadge({ status }: { status: CoverageStatus }) {
  const meta = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.className}`}
      data-testid={`coverage-badge-${status}`}
    >
      {meta.label}
    </span>
  );
}

function DomainSection({ domain }: { domain: DomainSummary }) {
  const deltaPct = domain.delta * 100;
  const deltaText = domain.status === 'in-range'
    ? '0.0 pp'
    : `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)} pp`;

  return (
    <section
      className="panel"
      aria-labelledby={`syllabus-${domain.domain}-heading`}
      data-testid={`syllabus-domain-${domain.domain}`}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id={`syllabus-${domain.domain}-heading`}
            className="font-display text-lg font-bold"
          >
            {domain.label}
          </h2>
          <p className="text-xs text-muted">
            Blueprint {formatBlueprintRange(domain.blueprint)} · actual {formatPercent(domain.actual)} · drift {deltaText}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CoverageBadge status={domain.status} />
          <div className="text-xs text-faint">
            {domain.qCount} Q · {domain.fcCount} flashcards · {domain.scnCount} scenarios
          </div>
        </div>
      </header>

      {domain.subtopics.length === 0 ? (
        <p className="text-xs text-faint">No subtopics yet — bank empty for this domain.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="border-b border-border px-2 py-1 text-left text-[10px] uppercase tracking-wide text-faint">
                  Subtopic
                </th>
                <th className="border-b border-border px-2 py-1 text-right text-[10px] uppercase tracking-wide text-faint">
                  Q
                </th>
                <th className="border-b border-border px-2 py-1 text-right text-[10px] uppercase tracking-wide text-faint">
                  Flashcards
                </th>
                <th className="border-b border-border px-2 py-1 text-right text-[10px] uppercase tracking-wide text-faint">
                  Scenarios
                </th>
              </tr>
            </thead>
            <tbody>
              {domain.subtopics.map((row) => (
                <tr key={row.subtopic} className="border-b border-border/40">
                  <td className="px-2 py-1 align-top">{row.subtopic}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{row.qCount}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{row.fcCount}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{row.scnCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function SyllabusPreviewView() {
  const summary = useMemo(
    () => getSyllabusSummary(questionBank, flashcards, scenarios),
    []
  );

  return (
    <div className="flex flex-col gap-3">
      <header className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Syllabus coverage</h1>
            <p className="mt-0.5 text-sm text-muted">
              {summary.totalQ} questions · {summary.totalFc} flashcards · {summary.totalScn} scenarios — checked against the official Microsoft DP-600 blueprint.{' '}
              <span className="text-faint">(Ctrl+P to print)</span>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            title="Opens browser print dialog. Choose 'Save as PDF' to capture coverage."
          >
            Save as PDF
          </button>
        </div>
      </header>

      {summary.domains.map((d) => (
        <DomainSection key={d.domain} domain={d} />
      ))}
    </div>
  );
}
