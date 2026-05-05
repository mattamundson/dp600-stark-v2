import { useMemo } from 'react';
import { refSectionsExtras } from '../reference/content-extras';
import type { RefSection } from '../reference/content';

// ─── Inline time-management rules (not in content-extras) ───────────────────
const TIME_MANAGEMENT_BULLETS: string[] = [
  'Flag and skip anything you cannot resolve in 90 seconds — come back on second pass.',
  'Read case-study stems once, answer all questions tied to that block, then move on.',
  'Reserve 10 min at the end for flagged-question review.',
  'Never leave a question blank — there is no wrong-answer penalty; guessing is +EV.',
  'When two answers both satisfy the requirement, pick the one with least operational overhead.',
  'Lab simulations are unscored beta items — do enough to show intent, do not over-invest time.',
];

// ─── Slug-to-section lookup ──────────────────────────────────────────────────
const SECTION_SLUGS = [
  'top-10-rls-traps',
  'direct-lake-decision-tree',
  'dax-perf-cheat-sheet',
  'fabric-item-quick-pick',
  'day-of-exam-checklist',
] as const;

type SectionSlug = (typeof SECTION_SLUGS)[number];

function findSection(slug: SectionSlug): RefSection | undefined {
  return refSectionsExtras.find((s) => s.slug === slug);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTable({ section }: { section: RefSection }) {
  if (!section.table) return null;
  const { headers, rows } = section.table;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-border px-2 py-1 text-left text-[10px] uppercase tracking-wide text-faint"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/40">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 align-top text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBullets({ bullets }: { bullets: string[] }) {
  return (
    <ul className="ml-4 list-disc space-y-0.5 text-xs">
      {bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

function SectionWarning({ warning }: { warning: string }) {
  return (
    <div className="mt-2 rounded-lg border border-warn/40 bg-warn/10 px-2 py-1.5 text-xs text-warn">
      <strong>Trap: </strong>
      {warning}
    </div>
  );
}

interface CheatSectionProps {
  title: string;
  slug?: string;
  children: React.ReactNode;
}

function CheatSection({ title, slug, children }: CheatSectionProps) {
  return (
    <section className="panel" id={slug}>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-primary">{title}</h2>
      {children}
    </section>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function CheatSheetView() {
  const rlsSection = useMemo(() => findSection('top-10-rls-traps'), []);
  const dlSection = useMemo(() => findSection('direct-lake-decision-tree'), []);
  const daxSection = useMemo(() => findSection('dax-perf-cheat-sheet'), []);
  const fabricSection = useMemo(() => findSection('fabric-item-quick-pick'), []);
  const examDaySection = useMemo(() => findSection('day-of-exam-checklist'), []);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Page header ── */}
      <header className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">DP-600 Exam Day Cheat Sheet</h1>
            <p className="mt-0.5 text-sm text-muted">
              Highest-frequency traps, decision trees, and quick-pick tables — optimised for one-page print.{' '}
              <span className="text-faint">(Ctrl+P to print)</span>
            </p>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => window.print()}
            title="Print or save as PDF (Ctrl+P)"
          >
            Print / PDF
          </button>
        </div>
      </header>

      {/* ── Content grid: 2-col on lg, 1-col on mobile, single-col on print ── */}
      <div className="grid gap-3 lg:grid-cols-2">

        {/* Column 1, slot A — Top 10 RLS Traps */}
        {rlsSection && (
          <CheatSection title={rlsSection.title} slug={rlsSection.slug}>
            {rlsSection.paragraphs?.map((p, i) => (
              <p key={i} className="mb-1 text-xs text-muted">{p}</p>
            ))}
            <SectionTable section={rlsSection} />
            {rlsSection.warning && <SectionWarning warning={rlsSection.warning} />}
          </CheatSection>
        )}

        {/* Column 1, slot B — Direct Lake decision tree */}
        {dlSection && (
          <CheatSection title={dlSection.title} slug={dlSection.slug}>
            {dlSection.paragraphs?.map((p, i) => (
              <p key={i} className="mb-1 text-xs text-muted">{p}</p>
            ))}
            <SectionTable section={dlSection} />
          </CheatSection>
        )}

        {/* Column 2, slot A — DAX perf cheat sheet */}
        {daxSection && (
          <CheatSection title={daxSection.title} slug={daxSection.slug}>
            {daxSection.paragraphs?.map((p, i) => (
              <p key={i} className="mb-1 text-xs text-muted">{p}</p>
            ))}
            <SectionTable section={daxSection} />
            {daxSection.warning && <SectionWarning warning={daxSection.warning} />}
          </CheatSection>
        )}

        {/* Column 2, slot B — Fabric item quick-pick */}
        {fabricSection && (
          <CheatSection title={fabricSection.title} slug={fabricSection.slug}>
            {fabricSection.paragraphs?.map((p, i) => (
              <p key={i} className="mb-1 text-xs text-muted">{p}</p>
            ))}
            <SectionTable section={fabricSection} />
            {fabricSection.bullets && (
              <div className="mt-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
                  Meta-rules
                </p>
                <SectionBullets bullets={fabricSection.bullets} />
              </div>
            )}
          </CheatSection>
        )}

        {/* Span-full — Day-of-exam checklist */}
        {examDaySection && (
          <div className="lg:col-span-2">
            <CheatSection title={examDaySection.title} slug={examDaySection.slug}>
              {examDaySection.paragraphs?.map((p, i) => (
                <p key={i} className="mb-1 text-xs text-muted">{p}</p>
              ))}
              {examDaySection.bullets && (
                <SectionBullets bullets={examDaySection.bullets} />
              )}
              {examDaySection.warning && (
                <SectionWarning warning={examDaySection.warning} />
              )}
            </CheatSection>
          </div>
        )}

        {/* Span-full — Time management rules (inline content) */}
        <div className="lg:col-span-2">
          <CheatSection title="Time management rules">
            <SectionBullets bullets={TIME_MANAGEMENT_BULLETS} />
          </CheatSection>
        </div>

      </div>
    </div>
  );
}
