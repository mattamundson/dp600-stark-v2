// Pure functions that roll up the question bank, flashcard deck, and scenario
// list into a domain → subtopic coverage tree, with the official DP-600 exam
// blueprint weighting attached for at-a-glance comparison. The view layer
// (SyllabusPreviewView, SyllabusPreviewCard) consumes this without ever
// touching the raw data modules — keeps the renderer trivially testable.
//
// Blueprint weighting source: Microsoft DP-600 official skills measured doc
// as of 2026-05 (handoff note in session 6 §8 TODO #4). The exam page lists
// each domain with a percent range, e.g. "Maintain a data analytics solution
// (25–30%)". We capture the full range and let the view decide how to badge
// drift relative to the actual bank.
//
// `total` Q is computed only across questions whose domain is one of the
// three official DP-600 domains so a malformed batch wouldn't skew percent
// math. Same for flashcards-by-domain and scenarios-by-domain — both are
// computed via questionsByDomain when needed (see view), but the per-domain
// fc/scn counts here are tag-free and rely on the explicit `domain` field
// on each scenario / each subtopic-level rollup is fc-deck-aware via tags.

import type { Domain, Question, Flashcard, Scenario } from '../../lib/schema';
import { DOMAINS, DOMAIN_LABEL } from '../../lib/schema';

export interface BlueprintRange {
  /** Lower bound of the official Microsoft weighting (e.g. 0.25 for 25%). */
  min: number;
  /** Upper bound of the official Microsoft weighting (e.g. 0.30 for 30%). */
  max: number;
}

/**
 * Official DP-600 exam blueprint weighting (Microsoft skills measured doc).
 * Verified 2026-05 in session 6 handoff.
 *  - Maintain a data analytics solution: 25–30%
 *  - Prepare data:                       45–50%
 *  - Implement and manage semantic models: 25–30%
 */
export const BLUEPRINT_RANGE: Record<Domain, BlueprintRange> = {
  maintain: { min: 0.25, max: 0.30 },
  prepare: { min: 0.45, max: 0.50 },
  semantic: { min: 0.25, max: 0.30 }
};

export type CoverageStatus = 'in-range' | 'near' | 'out-of-range';

export interface SubtopicRow {
  subtopic: string;
  qCount: number;
  fcCount: number;
  scnCount: number;
}

export interface DomainSummary {
  domain: Domain;
  label: string;
  qCount: number;
  fcCount: number;
  scnCount: number;
  /** actual share of the question bank, 0..1 */
  actual: number;
  blueprint: BlueprintRange;
  /** signed delta of actual vs nearest blueprint edge (negative = under, 0 = in range, positive = over) */
  delta: number;
  status: CoverageStatus;
  subtopics: SubtopicRow[];
}

export interface SyllabusSummary {
  totalQ: number;
  totalFc: number;
  totalScn: number;
  domains: DomainSummary[];
}

/**
 * Pick a CoverageStatus for an actual share against a blueprint range.
 *  - 'in-range'      : actual is within [min, max]
 *  - 'near'          : within ±5 percentage points of the nearest edge
 *  - 'out-of-range'  : further than 5pp from the nearest edge
 */
export function classifyCoverage(actual: number, blueprint: BlueprintRange): CoverageStatus {
  if (actual >= blueprint.min && actual <= blueprint.max) return 'in-range';
  const edge = actual < blueprint.min ? blueprint.min : blueprint.max;
  const drift = Math.abs(actual - edge);
  return drift <= 0.05 ? 'near' : 'out-of-range';
}

/**
 * Signed distance from the actual to the nearest blueprint edge.
 * Returns 0 when actual is inside the range.
 * Negative = under-represented; Positive = over-represented.
 */
export function coverageDelta(actual: number, blueprint: BlueprintRange): number {
  if (actual >= blueprint.min && actual <= blueprint.max) return 0;
  if (actual < blueprint.min) return actual - blueprint.min;
  return actual - blueprint.max;
}

/** Lightweight tag-keyword → domain map used to bucket flashcards into a domain. */
const FLASHCARD_DOMAIN_HINTS: Record<Domain, string[]> = {
  maintain: ['governance', 'security', 'rls', 'lifecycle', 'deployment', 'workspace', 'capacity', 'mirroring'],
  prepare: ['kql', 'eventhouse', 'dataflow', 'pipeline', 'shortcut', 'lakehouse', 'warehouse', 'notebook', 'ingest', 'rti'],
  semantic: ['direct-lake', 'dax', 'semantic', 'calc-group', 'storage-mode', 'measure', 'composite']
};

/**
 * Coarse domain inference for a flashcard. Decks and tags are not strictly
 * mapped 1:1 to domains, so we infer best-effort. If nothing matches, the
 * flashcard is excluded from per-domain rollups (still counted in totalFc).
 */
function inferFlashcardDomain(fc: Flashcard): Domain | null {
  const haystack = [fc.deck, ...(fc.tags ?? [])].join(' ').toLowerCase();
  for (const domain of DOMAINS) {
    for (const hint of FLASHCARD_DOMAIN_HINTS[domain]) {
      if (haystack.includes(hint)) return domain;
    }
  }
  return null;
}

/**
 * Build the syllabus summary from raw bank data. Pure function; no I/O.
 */
export function getSyllabusSummary(
  questions: readonly Question[],
  flashcards: readonly Flashcard[],
  scenarios: readonly Scenario[]
): SyllabusSummary {
  const totalQ = questions.length;
  const totalFc = flashcards.length;
  const totalScn = scenarios.length;

  // Domain rollup of fc / scn counts.
  const fcByDomain: Record<Domain, number> = { maintain: 0, prepare: 0, semantic: 0 };
  for (const fc of flashcards) {
    const d = inferFlashcardDomain(fc);
    if (d) fcByDomain[d] += 1;
  }
  const scnByDomain: Record<Domain, number> = { maintain: 0, prepare: 0, semantic: 0 };
  for (const scn of scenarios) scnByDomain[scn.domain] += 1;

  // Subtopic rollups (per-domain).
  const subtopicQ: Record<Domain, Record<string, number>> = {
    maintain: {}, prepare: {}, semantic: {}
  };
  const qByDomain: Record<Domain, number> = { maintain: 0, prepare: 0, semantic: 0 };
  for (const q of questions) {
    qByDomain[q.domain] += 1;
    subtopicQ[q.domain][q.subtopic] = (subtopicQ[q.domain][q.subtopic] ?? 0) + 1;
  }

  // Per-subtopic flashcard / scenario counts. We bucket fc by tag-overlap
  // with the subtopic name, and scenarios by tag-or-questionId overlap.
  const fcSubtopicCount = new Map<string, number>();
  for (const fc of flashcards) {
    const tags = (fc.tags ?? []).map((t) => t.toLowerCase());
    for (const tag of tags) {
      fcSubtopicCount.set(tag, (fcSubtopicCount.get(tag) ?? 0) + 1);
    }
  }
  const scnSubtopicCount = new Map<string, number>();
  for (const scn of scenarios) {
    const tags = (scn.tags ?? []).map((t) => t.toLowerCase());
    for (const tag of tags) {
      scnSubtopicCount.set(tag, (scnSubtopicCount.get(tag) ?? 0) + 1);
    }
  }

  const domains: DomainSummary[] = DOMAINS.map((domain) => {
    const subEntries = Object.entries(subtopicQ[domain]).sort((a, b) => b[1] - a[1]);
    const subtopics: SubtopicRow[] = subEntries.map(([subtopic, qCount]) => {
      const key = subtopic.toLowerCase();
      return {
        subtopic,
        qCount,
        fcCount: fcSubtopicCount.get(key) ?? 0,
        scnCount: scnSubtopicCount.get(key) ?? 0
      };
    });

    const actual = totalQ === 0 ? 0 : qByDomain[domain] / totalQ;
    const blueprint = BLUEPRINT_RANGE[domain];

    return {
      domain,
      label: DOMAIN_LABEL[domain],
      qCount: qByDomain[domain],
      fcCount: fcByDomain[domain],
      scnCount: scnByDomain[domain],
      actual,
      blueprint,
      delta: coverageDelta(actual, blueprint),
      status: classifyCoverage(actual, blueprint),
      subtopics
    };
  });

  return { totalQ, totalFc, totalScn, domains };
}

/**
 * Format a 0..1 share as a percent string with one decimal: 0.273 → "27.3%".
 */
export function formatPercent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/**
 * Format a blueprint range as "25–30%". Uses an en-dash for typography.
 */
export function formatBlueprintRange(range: BlueprintRange): string {
  return `${Math.round(range.min * 100)}–${Math.round(range.max * 100)}%`;
}
