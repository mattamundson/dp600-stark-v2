import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const semantic: Question[] = [
  // ── Star schema / relationships ─────────────────────────────────
  single({
    id: 'sem-001', domain: 'semantic', subtopic: 'star-schema', difficulty: 2,
    prompt: 'Which model design is recommended for analytical reporting in a tabular semantic model?',
    options: ['Snowflake schema with normalized dimensions', 'Star schema with denormalized dimensions', 'Single fact table with no dimensions', 'Galaxy schema with conformed facts and dimensions'],
    correct: 1,
    explanation: 'Star schema (one fact table surrounded by denormalized dimension tables) is the recommended pattern for tabular models. It minimizes joins, plays well with VertiPaq compression, and produces predictable DAX performance.',
    whyWrong: {
      0: 'Snowflake (normalized dims) introduces extra joins that hurt VertiPaq performance.',
      2: 'Without dimensions, slicing and filtering becomes painful.',
      3: 'Galaxy schemas have value in enterprise warehousing but are usually decomposed into multiple star models for tabular consumption.'
    },
    source: SRC.semanticModel,
    tags: ['star-schema', 'modeling']
  }),
  single({
    id: 'sem-002', domain: 'semantic', subtopic: 'relationships', difficulty: 3,
    prompt: 'Two tables share a key but the relationship cannot be set as 1:* because the dimension key is not unique. What is the correct response?',
    options: [
      'Set the relationship to many-to-many cardinality',
      'Fix the dimension to deduplicate the key, then create 1:*',
      'Use a calculated table to merge the two',
      'Use bi-directional filtering to compensate'
    ],
    correct: 1,
    explanation: 'Many-to-many is a smell; it usually indicates a missing or improperly modeled bridge table or duplicates in what should be a true dimension. Deduplicate the dim and restore 1:* — the model will be faster and DAX simpler.',
    whyWrong: {
      0: 'M:M relationships work but degrade performance and complicate DAX. Use only when truly inherent.',
      2: 'Calculated tables can fix this in some cases but the root cause is data quality, not modeling pattern.',
      3: 'Bi-directional filtering creates ambiguity and does not address the cardinality problem.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'cardinality']
  }),
  multi({
    id: 'sem-003', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'Which patterns are RED FLAGS in a tabular model and warrant review? Select all that apply.',
    options: [
      'Bi-directional relationship between two dimensions',
      'Inactive relationship enabled with USERELATIONSHIP for time-intel',
      'Auto date/time enabled in a Date dimension already in the model',
      'A measure that uses ALL() to override slicers globally'
    ],
    correct: [0, 2],
    explanation: 'Bi-directional between two dims often creates ambiguous filter paths. Auto date/time creates hidden tables that bloat the model and conflict with an explicit Date dim.',
    whyWrong: {
      1: 'Inactive relationships activated by USERELATIONSHIP are a standard time-intel pattern, not a red flag.',
      3: 'ALL() to clear slicer filters is a legitimate measure pattern (e.g., for "share of total"); not inherently bad.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'auto-date', 'red-flags']
  }),
  // ── DAX context ─────────────────────────────────────────────────
  single({
    id: 'sem-004', domain: 'semantic', subtopic: 'dax-context', difficulty: 3,
    prompt: 'What does CALCULATE do to filter context BEFORE evaluating its expression?',
    options: [
      'Adds the new filters to existing filter context',
      'Replaces filters on the same column unless KEEPFILTERS is used',
      'Always clears existing filter context completely',
      'Evaluates the expression first, then applies filters'
    ],
    correct: 1,
    explanation: 'CALCULATE\'s filter arguments REPLACE filters on the same column unless wrapped in KEEPFILTERS. This is the #1 source of DAX surprises.',
    whyWrong: {
      0: 'It replaces; it does not add. Use KEEPFILTERS to add.',
      2: 'It does not clear context — that\'s ALL().',
      3: 'Filters apply BEFORE the expression evaluates, not after.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'calculate', 'filter-context']
  }),
  single({
    id: 'sem-005', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'In a measure `Total = SUMX(Sales, Sales[Qty] * RELATED(Product[Price]))`, what process turns the row context (current Sales row) into something usable by RELATED?',
    options: [
      'Implicit context transition inside CALCULATE',
      'RELATED uses the existing row context to traverse the relationship',
      'The engine implicitly applies CROSSFILTER',
      'Row context cannot be used by RELATED — this measure errors'
    ],
    correct: 1,
    explanation: 'RELATED traverses the active 1:* relationship using the current row context. Context transition is NOT involved here — that happens when a measure (not RELATED) is invoked inside an iterator.',
    whyWrong: {
      0: 'No CALCULATE is invoked here; no context transition happens.',
      2: 'CROSSFILTER is a different function and is not implicit.',
      3: 'RELATED works exactly here; this measure is correct.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'related', 'row-context']
  }),
  single({
    id: 'sem-006', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'A measure `[Avg Sales] = SUMX(Customer, [Sales])` returns surprising values per customer. What is the most likely cause?',
    options: [
      'Context transition: the row context for each Customer becomes a filter context, evaluating [Sales] per-customer in their own filter scope',
      'SUMX cannot iterate over a dimension table',
      'The measure should use AVERAGEX, not SUMX',
      'RELATED is required to access the Customer table'
    ],
    correct: 0,
    explanation: 'When a MEASURE is referenced inside an iterator, context transition fires: each row context (Customer) becomes a filter context, evaluating [Sales] for that customer. The total aggregates per-customer Sales — which is exactly what the analyst usually wants but the magnitude can surprise.',
    whyWrong: {
      1: 'SUMX can iterate any table.',
      2: 'AVERAGEX would change the math, not the context behavior.',
      3: 'RELATED is unnecessary — the measure already triggers context transition.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'context-transition']
  }),
  single({
    id: 'sem-007', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'A "share of total" measure should ignore the visual\'s current row but respect outer slicers (e.g., Year). Which function is the right tool?',
    options: ['ALL()', 'ALLSELECTED()', 'REMOVEFILTERS()', 'KEEPFILTERS()'],
    correct: 1,
    explanation: 'ALLSELECTED removes filters that come from inside the visual (the current row category) while preserving filters from outside (slicers, page filters). That is exactly the "share within selection" pattern.',
    whyWrong: {
      0: 'ALL() would remove the outer slicer filters too — ignoring Year, not respecting it.',
      2: 'REMOVEFILTERS is similar to ALL — too aggressive for this case.',
      3: 'KEEPFILTERS is the opposite — it adds filters; it does not remove them.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'allselected', 'share']
  }),
  multi({
    id: 'sem-008', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: 'Which DAX patterns commonly cause performance regressions in large models?',
    options: [
      'Many small CALCULATE wrappers inside iterators (context-transition cost)',
      'IFERROR around every measure for "safety"',
      'Calculated columns that materialize at refresh time and compress well',
      'Use of variables (VAR) to avoid recomputation within a measure'
    ],
    correct: [0, 1],
    explanation: 'Repeated context transitions are expensive. IFERROR around every measure forces the engine to compute the protected expression even when not needed. Calculated columns and VARs are GOOD practices, not perf traps.',
    whyWrong: {
      2: 'Calculated columns materialize at refresh and are NOT a perf trap (in import mode); they often help.',
      3: 'VARs prevent re-evaluation and are explicitly recommended for perf.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'performance']
  }),
  single({
    id: 'sem-009', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: 'Which DAX function operates on the visual\'s axis (not on the underlying table) and requires ORDERBY/PARTITIONBY arguments?',
    options: ['EARLIER()', 'INDEX()', 'CALCULATETABLE()', 'TREATAS()'],
    correct: 1,
    explanation: 'INDEX (along with WINDOW and OFFSET, the new "calculation context" functions) operates on the visual axis to position-index rows. They require ORDERBY and may require PARTITIONBY.',
    whyWrong: {
      0: 'EARLIER navigates outer row contexts in legacy DAX — different concept.',
      2: 'CALCULATETABLE returns a table under modified filter context; it does not work on visual axis.',
      3: 'TREATAS applies a virtual relationship between unrelated tables.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'window-functions']
  }),
  // ── Calc groups & field parameters ──────────────────────────────
  single({
    id: 'sem-010', domain: 'semantic', subtopic: 'calc-groups', difficulty: 3,
    prompt: 'A model has 12 measures (Sales, Cost, Profit, …) and you want each to support YTD, MTD, QTD, and Prior Year variants without writing 48 measures. What is the best tool?',
    options: ['Field parameters', 'Calculation groups', 'USERELATIONSHIP for each variant', 'A separate "time" dimension'],
    correct: 1,
    explanation: 'Calculation groups let you define time-intel variants ONCE and apply them to any base measure. The 4 variants × 12 measures problem becomes 1 calc group with 4 items.',
    whyWrong: {
      0: 'Field parameters swap the field referenced by a visual — they are not a measure-variant tool.',
      2: 'USERELATIONSHIP is one technique within a measure; it does not solve the multiplication problem.',
      3: 'A time dimension already exists; this is about MEASURE proliferation, not dim modeling.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'time-intel']
  }),
  single({
    id: 'sem-011', domain: 'semantic', subtopic: 'field-parameters', difficulty: 3,
    prompt: 'A user wants a slicer that lets them pick which measure displays in a card visual at runtime. What is the simplest implementation?',
    options: [
      'Field parameters',
      'Calculation groups',
      'A SWITCH() expression inside one measure',
      'Multiple cards with bookmarks'
    ],
    correct: 0,
    explanation: 'Field parameters are designed for exactly this: let the user pick a field (column or measure) at runtime, and the visual uses whichever they choose. Cleaner than SWITCH and avoids the bookmark sprawl.',
    whyWrong: {
      1: 'Calculation groups vary measure formulas, not which measure displays.',
      2: 'SWITCH works but couples the choice to the measure rather than to a visual control.',
      3: 'Bookmarks are heavyweight and brittle for this pattern.'
    },
    source: SRC.semanticModel,
    tags: ['field-parameters', 'visuals']
  }),
  single({
    id: 'sem-012', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'A model uses 30 implicit measures auto-generated from a fact column. Which best-practice change should you make?',
    options: [
      'Hide the columns and create explicit measures for each metric',
      'Replace VertiPaq with DirectQuery to reduce model size',
      'Disable column-level encoding hints',
      'Convert all relationships to bi-directional'
    ],
    correct: 0,
    explanation: 'Explicit measures are best practice: they live in a measure table, support tooling like Tabular Editor, work with calc groups, and let you write proper DAX. Implicit measures are slow, opaque, and limit calc-group/perspective usage.',
    whyWrong: {
      1: 'Switching to DirectQuery is unrelated to measure quality.',
      2: 'Encoding hints are an internal VertiPaq tuning concept, not relevant.',
      3: 'Bi-directional relationships add ambiguity and don\'t address measure quality.'
    },
    source: SRC.semanticModel,
    tags: ['optimization', 'explicit-measures']
  }),
  single({
    id: 'sem-013', domain: 'semantic', subtopic: 'optimization', difficulty: 3,
    prompt: 'Which tool exposes the VertiPaq engine\'s table/column statistics so you can identify high-cardinality columns to prune or split?',
    options: ['Power Query', 'DAX Studio (VertiPaq Analyzer)', 'Tabular Editor 2', 'Performance Analyzer'],
    correct: 1,
    explanation: 'DAX Studio\'s VertiPaq Analyzer shows per-column dictionary sizes, cardinalities, and compression — the classic place to find the column that\'s eating your model.',
    whyWrong: {
      0: 'Power Query is for transformation; not a model-internal profiler.',
      2: 'Tabular Editor is a model authoring tool; it does not expose VertiPaq stats by itself.',
      3: 'Performance Analyzer captures per-visual query timings, not column-level VertiPaq stats.'
    },
    source: SRC.daxPerf,
    tags: ['optimization', 'dax-studio', 'vertipaq']
  }),
  order({
    id: 'sem-014', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Place the following DAX evaluation steps in correct order for `CALCULATE([Sales Amount], Customer[Region] = "EU")` evaluated in a single visual cell.',
    options: [
      'Capture outer filter and row contexts',
      'Apply CALCULATE filter arguments (replacing same-column filters)',
      'Evaluate inner measure [Sales Amount] under modified context',
      'Return the scalar result to the visual'
    ],
    explanation: 'CALCULATE evaluates filter args first (under the OUTER context where filter args are themselves expressions), modifies context, then evaluates the inner expression. Filter modification ALWAYS precedes inner evaluation.',
    source: SRC.daxFunctions,
    tags: ['dax', 'calculate', 'evaluation-order']
  })
];
