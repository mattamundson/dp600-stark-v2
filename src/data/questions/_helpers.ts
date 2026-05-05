// Authoring helpers — keep question files concise and force whyWrong coverage.

import type { Question, QuestionOption, SourceAnchor, Difficulty, Domain, QuestionType } from '../../lib/schema';

interface SingleInput {
  id: string;
  domain: Domain;
  subtopic: string;
  difficulty?: Difficulty;
  prompt: string;
  options: string[];
  correct: number; // index into options
  explanation: string;
  whyWrong: Record<number, string>;
  source: SourceAnchor;
  tags?: string[];
  scenarioId?: string;
  scenarioTitle?: string;
  type?: Extract<QuestionType, 'single' | 'scenario-single'>;
}

interface MultiInput {
  id: string;
  domain: Domain;
  subtopic: string;
  difficulty?: Difficulty;
  prompt: string;
  options: string[];
  correct: number[]; // indices
  explanation: string;
  whyWrong: Record<number, string>;
  source: SourceAnchor;
  tags?: string[];
  scenarioId?: string;
  scenarioTitle?: string;
  type?: Extract<QuestionType, 'multi' | 'scenario-multi'>;
}

interface OrderInput {
  id: string;
  domain: Domain;
  subtopic: string;
  difficulty?: Difficulty;
  prompt: string;
  options: string[];     // in correct order
  shuffled?: string[];   // optional alternate display order
  explanation: string;
  whyWrong?: Record<number, string>;
  source: SourceAnchor;
  tags?: string[];
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

function asOptions(texts: string[]): QuestionOption[] {
  return texts.map((text, i) => ({ id: LETTERS[i], text }));
}

function whyWrongByIndex(
  options: QuestionOption[],
  correctIndices: number[],
  why: Record<number, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  options.forEach((o, i) => {
    if (correctIndices.includes(i)) return;
    if (why[i]) out[o.id] = why[i];
  });
  return out;
}

export function single(q: SingleInput): Question {
  const options = asOptions(q.options);
  return {
    id: q.id,
    type: q.type ?? 'single',
    domain: q.domain,
    subtopic: q.subtopic,
    difficulty: (q.difficulty ?? 2) as Difficulty,
    prompt: q.prompt,
    options,
    correctOptionIds: [LETTERS[q.correct]],
    explanation: q.explanation,
    whyWrong: whyWrongByIndex(options, [q.correct], q.whyWrong),
    sourceAnchor: q.source,
    tags: q.tags ?? [],
    ...(q.scenarioId ? { scenarioId: q.scenarioId } : {}),
    ...(q.scenarioTitle ? { scenarioTitle: q.scenarioTitle } : {})
  };
}

export function multi(q: MultiInput): Question {
  const options = asOptions(q.options);
  const correctIds = q.correct.map((i) => LETTERS[i]);
  return {
    id: q.id,
    type: q.type ?? 'multi',
    domain: q.domain,
    subtopic: q.subtopic,
    difficulty: (q.difficulty ?? 3) as Difficulty,
    prompt: q.prompt,
    options,
    correctOptionIds: correctIds,
    explanation: q.explanation,
    whyWrong: whyWrongByIndex(options, q.correct, q.whyWrong),
    sourceAnchor: q.source,
    tags: q.tags ?? [],
    ...(q.scenarioId ? { scenarioId: q.scenarioId } : {}),
    ...(q.scenarioTitle ? { scenarioTitle: q.scenarioTitle } : {})
  };
}

export function order(q: OrderInput): Question {
  const display = q.shuffled ?? q.options.slice().reverse();
  const options = asOptions(display);
  // map display id back to original index → letter; correctOrder is in the canonical order
  const correctOrder: string[] = q.options.map((text) => {
    const idx = display.indexOf(text);
    return LETTERS[idx];
  });
  return {
    id: q.id,
    type: 'ordering',
    domain: q.domain,
    subtopic: q.subtopic,
    difficulty: (q.difficulty ?? 3) as Difficulty,
    prompt: q.prompt,
    options,
    correctOrder,
    explanation: q.explanation,
    whyWrong: q.whyWrong ? whyWrongByIndex(options, [], q.whyWrong) : {},
    sourceAnchor: q.source,
    tags: q.tags ?? []
  };
}

/* Common source anchors — DRY for the bank */
export const SRC = {
  directLake: { category: 'direct-lake-overview', note: 'Direct Lake: framing, fallback, V-Order requirements' },
  directLakeFallback: { category: 'direct-lake-fallback', note: 'When Direct Lake degrades to DirectQuery' },
  storageModes: { category: 'storage-modes', note: 'Import / DirectQuery / Direct Lake / Composite' },
  semanticModel: { category: 'semantic-model-design', note: 'Star schema, relationships, calc groups' },
  daxFunctions: { category: 'dax-functions', note: 'Filter context, CALCULATE, ALL family' },
  daxPerf: { category: 'dax-performance', note: 'Common DAX performance traps' },
  rls: { category: 'row-level-security', note: 'RLS modeling and roles' },
  ols: { category: 'object-level-security', note: 'Hide tables/columns from roles' },
  sensitivity: { category: 'sensitivity-labels', note: 'Microsoft Purview / MIP labels in Fabric' },
  deployment: { category: 'deployment-pipelines', note: 'Stages, rules, permissions' },
  workspace: { category: 'workspace-roles', note: 'Admin / Member / Contributor / Viewer' },
  xmla: { category: 'xmla-endpoint', note: 'Tabular protocol management' },
  fabricArch: { category: 'fabric-architecture', note: 'Lakehouse / Warehouse / Eventhouse / Notebook' },
  onelakeShortcuts: { category: 'onelake-shortcuts', note: 'Shortcuts, mirroring, ingestion choices' },
  mirroring: { category: 'mirroring', note: 'Mirrored Databases (Azure SQL DB, Cosmos, Snowflake)' },
  dataflow: { category: 'dataflow-gen2', note: 'Power Query / Dataflow Gen2 ingestion' },
  notebooks: { category: 'notebooks', note: 'Spark notebooks for transformation' },
  pipelines: { category: 'data-pipelines', note: 'Data Factory pipelines orchestrating items' },
  tsql: { category: 'fabric-warehouse-tsql', note: 'Fabric Warehouse T-SQL surface' },
  kql: { category: 'kusto-query-language', note: 'KQL operators and patterns' },
  eventhouse: { category: 'eventhouse', note: 'Real-time eventhouse + KQL DB' },
  pbip: { category: 'pbip-format', note: 'Project file format for source control' },
  governance: { category: 'fabric-governance', note: 'Monitoring, capacity, governance' }
} satisfies Record<string, SourceAnchor>;
