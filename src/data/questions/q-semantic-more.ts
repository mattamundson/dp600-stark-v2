import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const semanticMore: Question[] = [
  // ── DAX context (5) ─────────────────────────────────────────────
  single({
    id: 'sx-001', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'A measure uses `CALCULATE([Sales], Product[Color] = "Red")` and a slicer on the page already filters Product[Color] to "Blue". What value does the measure return?',
    options: [
      'Sales for Blue products only — the slicer wins',
      'Sales for Red products only — the CALCULATE filter overrides the slicer on the same column',
      'Sales for the intersection (no rows) — both filters apply with AND',
      'A DAX error because the filter contexts conflict'
    ],
    correct: 1,
    explanation: 'CALCULATE replaces filters on the same column unless KEEPFILTERS is used. The "Color = Red" filter argument completely overrides the slicer\'s "Color = Blue" filter for the inner expression, returning Red sales regardless of slicer state.',
    whyWrong: {
      0: 'The slicer does NOT win — CALCULATE filter args replace same-column outer filters by default.',
      2: 'For an AND/intersection, you must wrap the filter argument in KEEPFILTERS — the default is replace, not add.',
      3: 'No error occurs; the override behavior is by design and silent.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'calculate', 'override', 'exam-trap']
  }),
  single({
    id: 'sx-002', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'You want a measure that shows Red Sales but ALSO respects an outer slicer on Product[Color]. Which expression achieves this?',
    options: [
      'CALCULATE([Sales], Product[Color] = "Red")',
      'CALCULATE([Sales], KEEPFILTERS(Product[Color] = "Red"))',
      'CALCULATE([Sales], ALL(Product[Color]), Product[Color] = "Red")',
      'CALCULATE([Sales], REMOVEFILTERS(Product), Product[Color] = "Red")'
    ],
    correct: 1,
    explanation: 'KEEPFILTERS turns the override into an intersection: the existing slicer filter and the "Red" filter both apply via AND. So if the slicer selects Blue+Red, you get Red; if the slicer selects only Blue, you get nothing.',
    whyWrong: {
      0: 'Plain CALCULATE replaces the slicer\'s color filter — it does not respect it.',
      2: 'ALL clears the column first, then re-applies "Red" — equivalent to ignoring the slicer entirely.',
      3: 'REMOVEFILTERS on the whole table also clears the slicer\'s effect; the result ignores the slicer.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'keepfilters', 'intersection']
  }),
  single({
    id: 'sx-003', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Conceptually, what is the difference between `FILTER(Sales, Sales[Qty] > 10)` and `CALCULATETABLE(Sales, Sales[Qty] > 10)` when used inside a measure?',
    options: [
      'They are identical; the engine rewrites one to the other',
      'FILTER iterates row-by-row in row context; CALCULATETABLE applies the predicate as a filter in filter context, typically faster on large tables',
      'CALCULATETABLE only works on dimension tables; FILTER works on facts',
      'FILTER is deprecated; CALCULATETABLE is the supported replacement'
    ],
    correct: 1,
    explanation: 'FILTER is a row-context iterator and evaluates the predicate per row, which can be expensive on large tables. CALCULATETABLE applies the predicate in filter context — pushing it into VertiPaq scan operators where possible — and is generally faster. For simple boolean column predicates, prefer CALCULATETABLE.',
    whyWrong: {
      0: 'They are not equivalent. The contexts in which the predicate evaluates differ, and so does performance.',
      2: 'Both work on any table; there is no dim-vs-fact restriction.',
      3: 'FILTER is fully supported; it is the right tool when you need row-context evaluation, e.g., comparing two columns from the same row.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'filter', 'calculatetable']
  }),
  single({
    id: 'sx-004', domain: 'semantic', subtopic: 'dax-context', difficulty: 3,
    prompt: 'What is the practical difference between ALL(Table) and REMOVEFILTERS(Table) inside CALCULATE?',
    options: [
      'They behave identically inside CALCULATE; REMOVEFILTERS is the newer, semantically clearer name',
      'ALL returns a table and clears filters; REMOVEFILTERS only clears filters and cannot be used as a table function',
      'REMOVEFILTERS preserves filters from outside the visual; ALL clears everything',
      'ALL is for columns only; REMOVEFILTERS is for tables only'
    ],
    correct: 0,
    explanation: 'When used as a CALCULATE filter modifier, ALL and REMOVEFILTERS are functionally equivalent — both clear filters from the specified table or columns. REMOVEFILTERS exists primarily for readability: ALL\'s table-function role can confuse readers when it appears as a filter modifier.',
    whyWrong: {
      1: 'REMOVEFILTERS is only valid as a CALCULATE filter modifier (cannot be used as a table function), but the clearing semantics inside CALCULATE are identical to ALL.',
      2: 'Neither preserves outer filters — that is ALLSELECTED behavior.',
      3: 'Both functions accept a table or one or more columns; the column/table distinction is not what separates them.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'all', 'removefilters']
  }),
  single({
    id: 'sx-005', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'A model has a Date table that is NOT marked as a date table. A measure `[Sales YTD] = TOTALYTD([Sales], Date[Date])` returns blank or wrong values at year boundaries. What is the most likely root cause?',
    options: [
      'TOTALYTD requires a marked date table to correctly identify the year and contiguous date range; otherwise it cannot reason about year boundaries',
      'TOTALYTD is deprecated; you must use DATESYTD instead',
      'The Date column is not the primary key of the Date table',
      'The model is in Direct Lake mode, which does not support time intelligence'
    ],
    correct: 0,
    explanation: 'Time-intelligence functions rely on the date table being explicitly marked (Mark as date table) so the engine knows the column is contiguous and unique. Without it, year/quarter/month boundary logic can produce blanks or incorrect totals — even when the column looks fine at a glance.',
    whyWrong: {
      1: 'TOTALYTD is fully supported; DATESYTD is a different (table-returning) function used inside CALCULATE, not a replacement.',
      2: 'Primary-key concept does not exist as such in tabular; the issue is "marked as date table", not "is the key".',
      3: 'Direct Lake supports time intelligence — same DAX, same requirements as Import.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'time-intel', 'mark-date-table', 'exam-trap']
  }),

  // ── DAX performance (4) ─────────────────────────────────────────
  multi({
    id: 'sx-006', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: 'Which uses of variables (VAR) in DAX measures generally improve performance? Select all that apply.',
    options: [
      'Storing the result of an expensive sub-expression that is referenced multiple times',
      'Capturing a row-context value before entering a CALCULATE (avoiding context transition surprises)',
      'Wrapping every column reference in a VAR for "consistency"',
      'Holding a table expression that is then iterated by SUMX downstream'
    ],
    correct: [0, 1, 3],
    explanation: 'VARs evaluate once and cache the result, so repeated references are free; capturing row-context values before CALCULATE is a standard pattern; storing a table once for repeated iteration also wins. Wrapping single column references gains nothing and can hurt readability.',
    whyWrong: {
      2: 'Wrapping every single column reference in a VAR adds noise without performance benefit — the engine already handles single column references efficiently.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'variables', 'performance']
  }),
  single({
    id: 'sx-007', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: 'Why are nested iterators (e.g., SUMX over SUMX over a large fact table) a common DAX performance trap?',
    options: [
      'They cannot use VertiPaq storage and always fall back to the formula engine row-by-row',
      'The cost multiplies — outer iterations × inner iterations — and the storage engine often cannot pre-aggregate the inner expression',
      'Iterators always force a full table scan whereas aggregations do not',
      'Nested iterators are blocked by Direct Lake'
    ],
    correct: 1,
    explanation: 'Nested iterators multiply work: an outer SUMX of N rows running an inner SUMX of M rows is O(N*M) in the formula engine. Worse, the storage engine often cannot pre-aggregate the inner expression because it depends on the outer row context, defeating VertiPaq\'s columnar advantage.',
    whyWrong: {
      0: 'Iterators do use VertiPaq for inner scans where possible; the issue is multiplication of iterations, not storage choice.',
      2: 'Aggregations also scan, but the storage engine handles them in bulk; the multiplication is the killer for nested iterators.',
      3: 'Direct Lake does not block nested iterators; perf characteristics are similar to Import.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'iterators', 'performance']
  }),
  multi({
    id: 'sx-008', domain: 'semantic', subtopic: 'dax-perf', difficulty: 3,
    prompt: 'When should you choose a calculated COLUMN over a MEASURE? Select all that apply.',
    options: [
      'When the value depends only on the row and never on the visual\'s filter context',
      'When you need to slice or group by the result (use it on rows/columns/slicer)',
      'When the value must change as the user clicks a slicer',
      'When the column has very high cardinality (millions of distinct values)'
    ],
    correct: [0, 1],
    explanation: 'Calculated columns materialize at refresh and act like any other column — they can be slicers, axes, and joins. They are right when the value is row-determined. They are wrong for context-dependent results (use a measure) and dangerous when the result has very high cardinality, because VertiPaq compression collapses with cardinality.',
    whyWrong: {
      2: 'Calculated columns do NOT change with slicers — they are computed at refresh. For dynamic per-context values, use a measure.',
      3: 'High cardinality is the WORST case for calculated columns — VertiPaq dictionary blows up and compression suffers.'
    },
    source: SRC.daxPerf,
    tags: ['calc-columns', 'measures', 'when-to-use']
  }),
  single({
    id: 'sx-009', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: 'You write `SUMMARIZE(Sales, Customer[Country], "Total", SUMX(Sales, Sales[Amount]))` and notice the totals are wrong because of AUTO_EXISTS. What is the safer, recommended alternative?',
    options: [
      'Use SUMMARIZECOLUMNS, which avoids the AUTO_EXISTS quirk and correctly preserves filter context',
      'Disable AUTO_EXISTS in the model properties',
      'Wrap the SUMMARIZE in CALCULATETABLE',
      'Replace SUMX with SUM and remove the iterator'
    ],
    correct: 0,
    explanation: 'SUMMARIZE\'s AUTO_EXISTS behavior — combined with adding measures inside SUMMARIZE — produces hard-to-debug context bugs. SUMMARIZECOLUMNS is the modern replacement: it handles filter context correctly, supports filter and rollup arguments cleanly, and is what query optimizers like DAX Studio prefer.',
    whyWrong: {
      1: 'There is no setting to disable AUTO_EXISTS; it is intrinsic to SUMMARIZE.',
      2: 'Wrapping in CALCULATETABLE does not fix the AUTO_EXISTS combinatorial issue.',
      3: 'Replacing SUMX with SUM may change semantics and does not solve the SUMMARIZE bug.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'summarize', 'summarizecolumns', 'auto-exists']
  }),

  // ── Calculation groups (3) ──────────────────────────────────────
  single({
    id: 'sx-010', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'A model has TWO calculation groups: "Time Intel" and "Currency Conversion". A user puts both on a visual. What property determines which group\'s expression wraps the other?',
    options: [
      'The Precedence property on each calculation group — the higher-precedence group is applied LAST (outermost)',
      'Alphabetical order of the group names',
      'The order in which the groups were created',
      'They cannot be used together; one will be ignored'
    ],
    correct: 0,
    explanation: 'When multiple calculation groups apply to the same expression, the engine nests them by Precedence: lower-precedence groups are applied first (innermost), higher-precedence groups wrap the result (outermost). For Time Intel + Currency, you typically want Currency outermost, so Time Intel runs in the source currency and Currency converts the result.',
    whyWrong: {
      1: 'Alphabetical order does not control nesting.',
      2: 'Creation order is irrelevant; Precedence is explicit and editable.',
      3: 'Multiple calc groups CAN be used together; that is exactly why Precedence exists.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'precedence']
  }),
  multi({
    id: 'sx-011', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'What can a calculation group item override on the base measure? Select all that apply.',
    options: [
      'The format string of the result (e.g., percentages for "YoY %")',
      'The DAX expression that wraps the base measure',
      'The base measure\'s name on the visual',
      'The model\'s relationship topology'
    ],
    correct: [0, 1],
    explanation: 'Calculation items can override BOTH the wrapping DAX expression and the format string of the result — that\'s how a single "YoY %" item shows percentages while "Sales" itself shows currency. They cannot rename measures or change relationships.',
    whyWrong: {
      2: 'The base measure\'s name is unchanged; the calc item\'s name appears as an additional column on the visual.',
      3: 'Calc groups cannot alter relationships; they only modify expression evaluation.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'format-strings']
  }),
  single({
    id: 'sx-012', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'Users complain that the "Total" row of a matrix using a calculation group shows a value that doesn\'t equal the sum of the rows. What is the most likely cause?',
    options: [
      'Calculation groups apply at each cell — including the total — so the total row is the calc-group expression evaluated under the total\'s filter context, not a sum of rows',
      'A bug in Power BI Desktop; reload the file',
      'The base measure is non-additive (e.g., distinct count) and calc groups always corrupt totals',
      'The calculation group is missing a "Total" item'
    ],
    correct: 0,
    explanation: 'Each cell — including the grand total — independently evaluates the calc-group expression under that cell\'s filter context. For non-additive items (like YoY% or running totals), the grand total is the expression at the total level, NOT a sum of row results. This is correct behavior, not a bug.',
    whyWrong: {
      1: 'It is not a bug — it is the documented evaluation model.',
      2: 'Distinct count behaves the same way regardless of calc groups; the issue is per-cell evaluation, not the base measure type.',
      3: 'Calc groups do not require a "Total" item; the total cell uses the same calc item as the rest of the column.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'totals', 'exam-trap']
  }),

  // ── Field parameters (3) ────────────────────────────────────────
  single({
    id: 'sx-013', domain: 'semantic', subtopic: 'field-parameters', difficulty: 3,
    prompt: 'Compared to a SWITCH-based "selected measure" pattern, what is the primary advantage of field parameters?',
    options: [
      'Field parameters work in DirectQuery models; SWITCH does not',
      'Field parameters preserve the chosen field\'s native format string and column-level metadata; SWITCH returns a single computed scalar that loses formatting variation',
      'SWITCH cannot reference measures',
      'Field parameters automatically create a slicer that cannot be customized'
    ],
    correct: 1,
    explanation: 'A SWITCH-based "picker" measure flattens every choice into a single scalar with one format string — currency loses its symbol when "Quantity" is picked, percentages lose their %, etc. Field parameters retain the original measure\'s metadata (format, name, drill-through), giving a much cleaner UX.',
    whyWrong: {
      0: 'Both work in DirectQuery; this is not the differentiator.',
      2: 'SWITCH can reference measures; the issue is loss of native formatting in the result.',
      3: 'The auto-generated slicer is fully customizable like any other slicer.'
    },
    source: SRC.semanticModel,
    tags: ['field-parameters', 'switch', 'formatting']
  }),
  order({
    id: 'sx-014', domain: 'semantic', subtopic: 'field-parameters', difficulty: 4,
    prompt: 'Place the steps of creating a field parameter (in Power BI Desktop, Modeling tab) in correct order.',
    options: [
      'Open the Modeling ribbon and choose "New parameter > Fields"',
      'Provide a name and select the columns/measures to include in the parameter',
      'Power BI generates a small calculated table containing the picker values',
      'Add the field parameter to a slicer and to the visual\'s axis/value well'
    ],
    explanation: 'Field parameters are a Modeling-tab feature: name + chosen fields → generated picker table → drop on a slicer + the target visual. The slicer choice dynamically swaps which underlying field the visual uses.',
    source: SRC.semanticModel,
    tags: ['field-parameters', 'workflow']
  }),
  single({
    id: 'sx-015', domain: 'semantic', subtopic: 'field-parameters', difficulty: 4,
    prompt: 'Can a field parameter be combined with a calculation group on the same visual?',
    options: [
      'Yes — the field parameter swaps the BASE measure, the calc group wraps the chosen measure with its expression (e.g., YTD)',
      'No — they are mutually exclusive; the visual will error',
      'Only if the field parameter contains columns, not measures',
      'Only in Direct Lake mode'
    ],
    correct: 0,
    explanation: 'They compose nicely: the field parameter selects WHICH measure to display, the calc group decides HOW to wrap it (YoY, YTD, prior year). One slicer for measure choice + one slicer for time variant gives 12 measures × 4 variants from a small amount of metadata.',
    whyWrong: {
      1: 'They are explicitly designed to compose; no error occurs.',
      2: 'The combination works for measure-based field parameters too; that is in fact the most common use.',
      3: 'Storage mode does not affect this; the pattern works in Import, DirectQuery, and Direct Lake.'
    },
    source: SRC.semanticModel,
    tags: ['field-parameters', 'calc-groups', 'composition']
  }),

  // ── Optimization (4) ────────────────────────────────────────────
  single({
    id: 'sx-016', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'A model uses 3 GB of memory; VertiPaq Analyzer shows a single high-cardinality "TransactionID" column consumes 1.2 GB. The column is not needed for analysis but is kept "for traceability". What is the best optimization?',
    options: [
      'Remove the column from the model and store it only in the source (Lakehouse / Warehouse) for drill-through-via-DirectQuery if needed',
      'Set the column\'s encoding hint to "Hash"',
      'Convert the column from Int64 to Decimal to improve compression',
      'Add a calculated column that hashes TransactionID to fewer distinct values'
    ],
    correct: 0,
    explanation: 'High-cardinality columns destroy VertiPaq compression — dictionary size grows linearly with cardinality. If the column is not analytical, the right fix is to drop it from the model and rely on source-side traceability. Splitting (e.g., TxnYearPart + TxnSeqPart) is another technique when the column must stay.',
    whyWrong: {
      1: 'Hash encoding is what high-cardinality columns already get; it does not shrink the dictionary itself.',
      2: 'Decimal would make compression WORSE — float-style types compress less well than tight integers.',
      3: 'Hashing introduces a different problem (collisions) and does not save memory once both columns exist.'
    },
    source: SRC.daxPerf,
    tags: ['optimization', 'cardinality', 'vertipaq']
  }),
  multi({
    id: 'sx-017', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'Which strategies meaningfully reduce VertiPaq memory footprint? Select all that apply.',
    options: [
      'Drop unused columns rather than just hiding them',
      'Reduce decimal precision when the precision is not needed (e.g., 2 decimals instead of 6)',
      'Split a high-cardinality "DateTime" column into separate Date and Time columns',
      'Add bidirectional relationships between dimensions to "share" indexes'
    ],
    correct: [0, 1, 2],
    explanation: 'Hiding does not reclaim memory — the column still loads and consumes RAM. Reducing precision and splitting DateTime into Date+Time both directly reduce dictionary size. Bidirectional relationships do not save memory and instead add filter-path complexity.',
    whyWrong: {
      3: 'Bidirectional relationships do not share indexes or save memory; they expand filter propagation paths and can introduce ambiguity.'
    },
    source: SRC.daxPerf,
    tags: ['optimization', 'memory']
  }),
  single({
    id: 'sx-018', domain: 'semantic', subtopic: 'optimization', difficulty: 3,
    prompt: 'For a 50 GB Import-mode fact table refreshed nightly, which refresh strategy minimizes capacity load and refresh window?',
    options: [
      'Full refresh of the entire table every night',
      'Incremental refresh with hot/cold partitions — only the recent partition is refreshed; older partitions persist',
      'Switch to DirectQuery so no refresh is required',
      'Disable refresh and rely on manual reloads'
    ],
    correct: 1,
    explanation: 'Incremental refresh is the standard tool: define hot/cold ranges (e.g., last 7 days hot, older cold) so only the hot partition refreshes nightly. Cold partitions are immutable, dramatically reducing refresh time, capacity load, and source query cost.',
    whyWrong: {
      0: 'A full nightly refresh of 50 GB is exactly what incremental refresh exists to avoid.',
      2: 'DirectQuery removes the refresh but typically degrades query latency; not a free win.',
      3: 'Manual reloads do not solve the underlying problem; the size still gets reloaded each time.'
    },
    source: SRC.semanticModel,
    tags: ['optimization', 'incremental-refresh']
  }),
  single({
    id: 'sx-019', domain: 'semantic', subtopic: 'optimization', difficulty: 3,
    prompt: 'A model exposes 5 fact tables and 12 dimension tables. Several intermediate tables (bridge, configuration, mapping) should be invisible to report authors. What is the right approach?',
    options: [
      'Hide the tables (and their columns) from Report view; they remain in the model and are usable by DAX',
      'Delete the tables entirely',
      'Move the tables to a separate workspace',
      'Use object-level security (OLS) on every report-author role to remove visibility'
    ],
    correct: 0,
    explanation: 'Hiding from Report view (right-click table > Hide) is the standard pattern for bridge/config/mapping tables. They remain part of the model and can be referenced in DAX, but report authors don\'t see them in the Fields pane. OLS is for security boundaries, not UI cleanup.',
    whyWrong: {
      1: 'Deleting them would break the relationships and DAX they support; that\'s not the goal.',
      2: 'Tables in another workspace are no longer in this model; cross-workspace modeling is not the right tool here.',
      3: 'OLS is for true security/compliance hiding (different roles see different things). For UI cleanup, plain hide is correct and lighter.'
    },
    source: SRC.semanticModel,
    tags: ['optimization', 'hidden-tables', 'ols']
  }),

  // ── USERELATIONSHIP / inactive relationships (3) ────────────────
  single({
    id: 'sx-020', domain: 'semantic', subtopic: 'relationships', difficulty: 3,
    prompt: 'A Sales table has BOTH OrderDate and ShipDate, each related to the Date dimension. Only one relationship can be active. What is the standard pattern for `[Sales by Ship Date]`?',
    options: [
      'Create a calculated column that copies ShipDate so the active relationship moves to it',
      'CALCULATE([Sales], USERELATIONSHIP(Sales[ShipDate], Date[Date]))',
      'Create a second Date table and connect ShipDate to it via active relationship',
      'Use TREATAS to map ShipDate values onto Date[Date]'
    ],
    correct: 1,
    explanation: 'USERELATIONSHIP activates the inactive relationship for the duration of CALCULATE\'s evaluation. The active relationship (typically OrderDate) is left intact for other measures; you switch on the relationship per measure as needed.',
    whyWrong: {
      0: 'Calculated columns don\'t change which relationship is active and bloat the model.',
      2: 'A second Date table (role-playing dim duplicate) works in some patterns but adds modeling overhead; USERELATIONSHIP is the canonical and lighter answer.',
      3: 'TREATAS works but is overkill when a real (inactive) relationship already exists.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'userelationship', 'inactive']
  }),
  single({
    id: 'sx-021', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'You have an inactive relationship and want USERELATIONSHIP to activate it. Which CALCULATE construct is INVALID?',
    options: [
      'CALCULATE([Sales], USERELATIONSHIP(Sales[ShipDate], Date[Date]))',
      'CALCULATE([Sales], USERELATIONSHIP(Sales[ShipDate], Date[Date]), Customer[Country] = "US")',
      'CALCULATE([Sales], FILTER(Date, Date[Year] = 2025), USERELATIONSHIP(Sales[ShipDate], Date[Date]))',
      'CALCULATE([Sales], USERELATIONSHIP(Sales[OrderDate], Date[Date]))  /* where the OrderDate relationship is already ACTIVE */'
    ],
    correct: 3,
    explanation: 'USERELATIONSHIP fails when invoked on a relationship that is ALREADY active — it is intended specifically to activate an inactive one. The other forms (combining with simple boolean filters, FILTER expressions, or used alone) are all valid.',
    whyWrong: {
      0: 'Standard, valid use.',
      1: 'Combining USERELATIONSHIP with same-CALCULATE filters is allowed.',
      2: 'A FILTER table argument alongside USERELATIONSHIP is allowed.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'userelationship', 'exam-trap']
  }),
  multi({
    id: 'sx-022', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'When is USERELATIONSHIP the right tool versus creating a separate role-playing date dimension? Select all that apply for USERELATIONSHIP.',
    options: [
      'When you have a small number of measures that need the alternate relationship and report authors don\'t need to slice by it independently',
      'When report users need to filter both OrderDate AND ShipDate independently on the same visual',
      'When you want to keep the model schema simple and don\'t want a duplicate Date table',
      'When dozens of measures all need to switch relationship dynamically based on user choice'
    ],
    correct: [0, 2],
    explanation: 'USERELATIONSHIP is best when only a handful of measures need the alternate join and the alternate date doesn\'t need to appear as a separate slicer dimension. When users must filter both Order and Ship independently — or when many measures need the swap — a duplicate (role-playing) Date table is cleaner.',
    whyWrong: {
      1: 'Independent filtering on both dates needs TWO date tables, since a single date table can only be filtered one way at a time.',
      3: 'For "many measures need the alternate join," authoring USERELATIONSHIP everywhere is brittle; a role-playing dim is more maintainable.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'userelationship', 'role-playing']
  }),

  // ── Advanced relationships (3) ──────────────────────────────────
  single({
    id: 'sx-023', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'A composite model joins an Import dimension to a DirectQuery fact, producing a "limited" relationship. What constraint does this impose compared to a regular relationship?',
    options: [
      'It can only be 1:1 cardinality',
      'It does not propagate filters from the dimension to the fact',
      'It does not enforce referential integrity at query time and certain DAX operations (e.g., RELATED, USERELATIONSHIP, strong cross-source joins) behave differently or are unavailable',
      'It requires both tables to be in the same Lakehouse'
    ],
    correct: 2,
    explanation: 'Limited (weak) relationships span storage modes / data sources and don\'t enforce referential integrity at query time. Some DAX patterns (RELATED, USERELATIONSHIP via the limited relationship, certain bidirectional flows) are restricted, and the engine may produce different filter behavior than a regular relationship.',
    whyWrong: {
      0: 'Limited relationships support various cardinalities; the limitation is in DAX/RI behavior, not cardinality.',
      1: 'Limited relationships still propagate filters; that is the whole point. The differences are in DAX features and RI.',
      3: 'They do not require co-location in a single Lakehouse; in fact they exist precisely because tables span sources.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'limited', 'composite']
  }),
  multi({
    id: 'sx-024', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'Which patterns are valid implementations of a many-to-many (M:M) relationship in a tabular model? Select all that apply.',
    options: [
      'A bridge table containing the unique pairs, with single-direction filters from each side to the bridge',
      'A bridge table with bidirectional filters between bridge and at least one side',
      'Native many-to-many cardinality on the relationship line (introduced in modern Power BI)',
      'Setting both sides of the fact-to-dim relationship to "Many" without a bridge table'
    ],
    correct: [0, 1, 2],
    explanation: 'All three are real M:M patterns: the classic bridge with single-direction filters (requires DAX like CROSSFILTER to traverse), the bridge with bidirectional filtering for transparent slicing, and native M:M cardinality on a single relationship line. The fourth option is not a pattern — "many on both sides without a bridge" is exactly the M:M cardinality option (3) when chosen explicitly.',
    whyWrong: {
      3: 'This is just option (3) re-described from the dialog\'s perspective; without choosing the explicit M:M cardinality option, the model rejects the relationship.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'many-to-many', 'bridge']
  }),
  single({
    id: 'sx-025', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'For a role-playing dimension (e.g., Date used as both Order Date and Ship Date), what is the cleanest pattern when report users must slice on BOTH roles independently?',
    options: [
      'A single Date table with two relationships (one active, one inactive) and USERELATIONSHIP per measure',
      'Two separate Date tables (e.g., DateOrder and DateShip), each with its own active relationship',
      'A composite key combining order and ship dates into a single column',
      'TREATAS to virtually map ShipDate onto Date[Date] for each measure'
    ],
    correct: 1,
    explanation: 'When users need to slice and filter both roles independently on the same visual or page, a single Date table cannot carry two simultaneous filter contexts on the same column. Duplicating the Date table (role-playing dim) — typically with calculated tables and synced slicers as needed — is the standard solution.',
    whyWrong: {
      0: 'USERELATIONSHIP is per-measure; it does not let a SLICER independently filter the inactive role on the same visual.',
      2: 'A composite key conflates the two dates into one and breaks any independent slicing.',
      3: 'TREATAS is a measure-time pattern, not a slicer-time pattern; it cannot solve the dual-slicer problem.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'role-playing', 'date-dimension']
  })
];
