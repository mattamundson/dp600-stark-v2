// Sprint 4 — DAX Iterators + RLS-DAX patterns (26 Q).
//
// Heavy on code-reading. DP-600 explicitly tests iterator semantics
// (SUMX, AVERAGEX, FILTER, RANKX), context transition, and dynamic
// RLS DAX patterns. The dax-iterators subtopic is NEW (currently rolled
// into dax-context) so analytics surfaces it separately for remediation.
//
// IDs:
//   dxi-001..dxi-018  DAX iterators (semantic, dax-iterators)
//   rdx-001..rdx-008  RLS-DAX patterns (semantic, security-rls)
//
// Source: learn.microsoft.com/en-us/dax/* + SQLBI iterator deep-dives,
// reviewed against current Microsoft samples.

import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

export const daxIterators: Question[] = [
  // ── Iterator basics + context transition (6 Q) ────────────────
  single({
    id: 'dxi-001', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 3,
    prompt: 'Which DAX expression returns the total of (Quantity × UnitPrice) per row in the Sales table?',
    options: [
      'SUMX(Sales, Sales[Quantity] * Sales[UnitPrice])',
      'SUM(Sales[Quantity] * Sales[UnitPrice])',
      'CALCULATE(SUM(Sales[Quantity]) * SUM(Sales[UnitPrice]))',
      'SUMX(Sales, [Quantity]) * SUMX(Sales, [UnitPrice])'
    ],
    correct: 0,
    explanation: 'SUMX iterates the table and creates a row context for the inner expression — `Quantity * UnitPrice` is evaluated per row, then summed. SUM cannot accept a row-multiplied expression directly. CALCULATE pattern multiplies SUMs (very different result). Multiplying two SUMX results is also wrong arithmetically.',
    whyWrong: {
      1: 'SUM expects a single column. `Quantity * UnitPrice` is an expression, not a column — this errors at parse time.',
      2: '`SUM(Quantity) * SUM(UnitPrice)` multiplies the totals — gives a much larger number than the per-row product sum.',
      3: 'Multiplying two iterator totals does not produce per-row arithmetic.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'sumx', 'row-context', 'foundation']
  }),

  single({
    id: 'dxi-002', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 4,
    prompt: 'A measure `Total Sales := SUM(Sales[Amount])`. What does `SUMX(Customer, [Total Sales])` return?',
    options: [
      'SUM(Sales[Amount]) for ALL customers — same as just `[Total Sales]`',
      'SUM(Sales[Amount]) for each Customer row, summed — context transition kicks in inside SUMX',
      'An error — measures cannot be used inside SUMX',
      'NULL for every row because [Total Sales] requires a filter context that the iterator does not provide'
    ],
    correct: 1,
    explanation: 'When a MEASURE is referenced inside an iterator (SUMX, AVERAGEX, etc.), DAX performs CONTEXT TRANSITION — the row context becomes a filter context for the measure. So `[Total Sales]` is computed PER CUSTOMER, then summed across customers. This is one of the most critical DAX exam concepts.',
    whyWrong: {
      0: 'Without context transition the answer would be the same as [Total Sales] at the totals level — but transition is automatic for measures inside iterators.',
      2: 'Measures absolutely work inside SUMX — that is the canonical pattern.',
      3: 'Context transition provides the filter context. NULL is incorrect.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'sumx', 'context-transition', 'measure-reference', 'exam-trap'],
    relatedIds: ['dxi-003', 'dxi-004']
  }),

  single({
    id: 'dxi-003', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 4,
    prompt: 'Reading the following expression: `AVERAGEX(FILTER(Sales, Sales[Country] = "US"), Sales[Profit])` — what does it return?',
    options: [
      'The average Profit across ALL Sales rows, regardless of country',
      'The average Profit across Sales rows where Country is "US"',
      'A sum of Profit for US sales',
      'The average of distinct Country values for "US"'
    ],
    correct: 1,
    explanation: 'FILTER restricts the table iterated by AVERAGEX to US rows, and AVERAGEX averages the Profit column expression across those rows. This is the canonical "average over a filtered set" pattern.',
    whyWrong: {
      0: 'FILTER is doing real filtering work — only US rows are in the iteration.',
      2: 'AVERAGEX is the function — it averages, not sums. SUMX would be the sum equivalent.',
      3: 'Country is filtered (single value "US"), not aggregated.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'averagex', 'filter', 'code-reading']
  }),

  multi({
    id: 'dxi-004', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 4,
    prompt: 'Which DAX iterators create a ROW CONTEXT on the inner expression? Select all that apply.',
    options: [
      'SUMX',
      'AVERAGEX',
      'FILTER',
      'CALCULATE',
      'COUNTROWS',
      'RANKX'
    ],
    correct: [0, 1, 2, 5],
    explanation: 'The classic iterators (SUMX, AVERAGEX, FILTER, RANKX) all create a row context for the inner expression. CALCULATE creates a FILTER context, NOT a row context — and is famously confusing for that reason. COUNTROWS does not iterate an inner expression at all (just counts rows in a table).',
    whyWrong: {
      3: 'CALCULATE creates filter context, not row context. (It does perform context transition on outer row contexts, but that is a different mechanism.)',
      4: 'COUNTROWS does not have an inner expression — it counts the rows of its argument table.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'row-context', 'calculate-vs-iterator', 'foundation']
  }),

  single({
    id: 'dxi-005', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Reading: `EVALUATE ADDCOLUMNS(Customer, "TotalSales", CALCULATE(SUM(Sales[Amount])))`. What is the role of CALCULATE here, and what does each row of the output show?',
    options: [
      'CALCULATE is unnecessary — without it the result would be the same',
      'CALCULATE performs CONTEXT TRANSITION — converting the row context (per Customer) into a filter context. Each row shows that customer\'s total sales.',
      'CALCULATE produces a single scalar; the result has only one row',
      'CALCULATE is a syntax error inside ADDCOLUMNS'
    ],
    correct: 1,
    explanation: 'This is the canonical context-transition pattern. ADDCOLUMNS provides a row context per customer; CALCULATE converts that to filter context for the SUM. Without CALCULATE, SUM(Sales[Amount]) would NOT see the customer filter and would return the same total for every row.',
    whyWrong: {
      0: 'Without CALCULATE, the row context does NOT propagate to SUM — every row would show the grand total.',
      2: 'ADDCOLUMNS preserves the table shape; CALCULATE evaluated per row gives one scalar PER row.',
      3: 'CALCULATE inside ADDCOLUMNS is the canonical pattern.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'context-transition', 'calculate', 'addcolumns', 'code-reading', 'exam-trap'],
    relatedIds: ['dxi-002']
  }),

  single({
    id: 'dxi-006', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 4,
    prompt: 'Reading: `EVALUATE TOPN(5, Customer, [Total Sales], DESC)`. What does TOPN return when ties exist in [Total Sales] at the 5th position?',
    options: [
      'Exactly 5 rows; ties at the boundary are broken arbitrarily',
      'Exactly 5 rows; ties at the boundary are broken by primary key',
      'MORE than 5 rows — TOPN returns ALL tied rows at the boundary',
      'Fewer than 5 rows if ties cause boundary collapse'
    ],
    correct: 2,
    explanation: 'TOPN returns ALL tied rows at the boundary. If two customers tie at position 5, TOPN returns 6 rows. To force exactly N, add a tiebreaker order column: `TOPN(5, Customer, [Total Sales], DESC, Customer[CustomerKey], ASC)`.',
    whyWrong: {
      0: 'TOPN does not silently truncate — it returns all ties.',
      1: 'There is no implicit primary-key tiebreak.',
      3: 'Ties expand the result, not collapse it.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'topn', 'ties', 'code-reading', 'exam-trap'],
    relatedIds: ['dxi-007']
  }),

  // ── RANKX + ordering iterators (4 Q) ──────────────────────────
  single({
    id: 'dxi-007', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 4,
    prompt: 'Reading: `RANKX(ALL(Customer), [Total Sales], , DESC, Dense)`. What does the Dense argument change?',
    options: [
      'It changes nothing — Dense is the default',
      'Dense gives ties consecutive ranks (1, 2, 2, 3) instead of skipping (1, 2, 2, 4)',
      'Dense forces unique ranks even on ties',
      'Dense changes the sort to alphabetical'
    ],
    correct: 1,
    explanation: 'Dense ranking does NOT skip rank values after ties. With ties, you get 1, 2, 2, 3 (Dense) vs 1, 2, 2, 4 (Skip). Default is Skip. RANKX has no built-in mechanism for breaking ties beyond the function arguments.',
    whyWrong: {
      0: 'Skip is the default, not Dense.',
      2: 'Dense allows ties; it does not force uniqueness.',
      3: 'The ordering direction is the previous argument (DESC), not the rank-style argument.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'rankx', 'dense-rank', 'code-reading']
  }),

  single({
    id: 'dxi-008', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 5,
    prompt: 'Why does `RANKX(Customer, [Total Sales])` return 1 for EVERY customer in a matrix visual, but `RANKX(ALL(Customer), [Total Sales])` ranks them correctly?',
    options: [
      'Without ALL, the row context filters Customer to a single row at evaluation time — ranking 1 row always returns rank 1',
      'RANKX requires ALL by syntax',
      'Customer table has duplicates that confuse RANKX',
      'The visual itself caches ranks incorrectly'
    ],
    correct: 0,
    explanation: 'A matrix visual creates an implicit filter context per cell — Customer is filtered to one row when computing each cell. RANKX evaluating against a 1-row table always returns 1. Wrapping with ALL(Customer) removes that filter and lets the function see all customers. This is the single most common RANKX exam trap.',
    whyWrong: {
      1: 'RANKX does not REQUIRE ALL by syntax — but in this matrix-visual context it is needed semantically.',
      2: 'No duplicates issue.',
      3: 'No visual caching issue.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'rankx', 'all', 'filter-context', 'matrix-visual', 'exam-trap'],
    relatedIds: ['dxi-007']
  }),

  multi({
    id: 'dxi-009', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 4,
    prompt: 'Which iterators produce a SCALAR result vs which produce a TABLE? Select the SCALAR-producing ones.',
    options: [
      'SUMX',
      'AVERAGEX',
      'FILTER',
      'RANKX',
      'CONCATENATEX',
      'TOPN'
    ],
    correct: [0, 1, 3, 4],
    explanation: 'Scalar-producing iterators: SUMX, AVERAGEX, RANKX, CONCATENATEX. Table-producing: FILTER, TOPN. The category matters — scalars feed scalar functions; tables feed table functions. Mixing them produces type-mismatch errors.',
    whyWrong: {
      2: 'FILTER returns a TABLE, not a scalar.',
      5: 'TOPN returns a TABLE, not a scalar.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'scalar-vs-table', 'foundation']
  }),

  single({
    id: 'dxi-010', domain: 'semantic', subtopic: 'dax-iterators', difficulty: 4,
    prompt: 'Reading: `CONCATENATEX(Top5Customers, [CustomerName], ", ", [Total Sales], DESC)`. What does the 5th argument do?',
    options: [
      'It adds a separator after the last element',
      'It is the ORDER BY column for the iteration; rows are concatenated in descending order of Total Sales',
      'It is a filter argument',
      'It caches the result'
    ],
    correct: 1,
    explanation: 'CONCATENATEX has an optional ORDER BY argument: `CONCATENATEX(table, expression, separator, OrderBy_Expression, [Order_direction])`. So `[Total Sales]` here is the order-by, with DESC direction.',
    whyWrong: {
      0: 'Trailing-separator is not how CONCATENATEX argument order works.',
      2: 'No filter argument exists at this position.',
      3: 'No caching mechanism.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-iterators', 'concatenatex', 'order-by', 'code-reading']
  }),

  // ── Performance traps (4 Q) ────────────────────────────────
  multi({
    id: 'dxi-011', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: 'Which patterns are PERFORMANCE TRAPS in DAX iterators? Select all that apply.',
    options: [
      'Calling a measure inside a high-cardinality iterator without thinking about context transition cost',
      'Using `FILTER(table, [measure] > 0)` when a column-level predicate would work',
      'Wrapping every CALCULATE in additional CALCULATEs "to be safe"',
      'Using SUMX over a 50-row table',
      'Iterating over a fact table when the math could be done at the dimension grain'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Four real performance traps: (1) context transition cost on every row scaling with measure complexity, (2) measure-based filters are non-sargable and slow, (3) nested CALCULATEs add overhead per evaluation, (4) iterating over the wrong grain. Iterating over a small 50-row table is FINE — overhead is the same regardless of size for small N.',
    whyWrong: {
      3: 'Small-table iteration is fine. The 50-row case is the no-op end of the spectrum.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'iterators', 'context-transition', 'sargability', 'grain'],
    relatedIds: ['dxi-002', 'dxi-012']
  }),

  single({
    id: 'dxi-012', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: 'A measure `Slow Avg := AVERAGEX(Sales, Sales[Amount])` is slow on a 200M-row Sales fact table. The desired result is identical to `AVERAGE(Sales[Amount])`. Why is the AVERAGEX form slow, and what is the fix?',
    options: [
      'AVERAGEX inherently iterates row-by-row in formula engine; AVERAGE pushes down to storage engine. Use AVERAGE.',
      'AVERAGEX requires a CALCULATE wrapper to be fast',
      'AVERAGEX uses Direct Lake, AVERAGE does not',
      'No fix — DAX cannot average 200M rows quickly'
    ],
    correct: 0,
    explanation: 'AVERAGEX iterates a column expression in the formula engine. AVERAGE pushes the aggregation to the storage engine (VertiPaq), which can scan a 200M-row column in milliseconds. Whenever you can use a simple aggregator (AVERAGE, SUM, MIN, MAX), do so — only reach for X-iterators when the inner expression genuinely requires per-row evaluation (multiple columns, conditional logic, etc.).',
    whyWrong: {
      1: 'CALCULATE adds context transition, not speed.',
      2: 'Both functions read from the same storage; mode is unrelated.',
      3: 'VertiPaq aggregates 200M rows fast.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'averagex-vs-average', 'storage-engine', 'formula-engine', 'exam-trap'],
    relatedIds: ['dxi-011']
  }),

  multi({
    id: 'dxi-013', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: 'Performance Analyzer in Power BI Desktop shows a measure with 8s formula-engine time and 0.2s storage-engine time. Which interpretations and fixes are valid? Select all that apply.',
    options: [
      'The bottleneck is in the formula engine (FE), not the data — column compression/V-Order changes will not help',
      'Replacing iterator-based logic with simple aggregators where possible reduces FE time',
      'Materializing intermediate results via VAR avoids re-evaluation',
      'Adding more CPU to the capacity (SKU upgrade) eliminates FE time',
      'The storage engine is too slow — refresh the model to clear cache'
    ],
    correct: [0, 1, 2],
    explanation: '8s FE / 0.2s SE means the bottleneck is in single-threaded formula-engine evaluation. Compression (4) is a storage-side win and would not help. SKU upgrade gives more total CPU but the FE work is single-threaded per query — more CPUs do not split a single FE eval. Refresh (5) does not address the FE issue.',
    whyWrong: {
      3: 'FE work is single-threaded per query. More CPUs do not parallelize FE.',
      4: 'SE is fast (0.2s); it is not the bottleneck. Refresh is the wrong tool.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'fe-vs-se', 'performance-analyzer', 'optimization']
  }),

  // ── Window iterators + variables (5 Q) ─────────────────────
  single({
    id: 'dxi-014', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Reading: `OFFSET(-1, ORDERBY(Date[Date]), PARTITIONBY(Customer[CustomerKey]))`. What does this expression return per row?',
    options: [
      'The current row\'s value',
      'The previous row\'s value (ordered by Date) within the same Customer',
      'The previous row across the entire table, ignoring Customer',
      'The first row of the partition'
    ],
    correct: 1,
    explanation: 'OFFSET with -1 returns the value from one row PRIOR within the partition, ordered by Date. PARTITIONBY scopes the offset to within each customer\'s history. This is one of the new window functions for time-series patterns in DAX.',
    whyWrong: {
      0: 'Offset 0 would be the current row; -1 is one prior.',
      2: 'PARTITIONBY restricts the offset within each customer.',
      3: 'INDEX(1) would be the first row; OFFSET(-1) is relative to current.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'offset', 'window-functions', 'partitionby', 'orderby', 'code-reading']
  }),

  multi({
    id: 'dxi-015', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'Which DAX VAR usages improve performance OR readability? Select all that apply.',
    options: [
      'VAR caches a value that would otherwise be recomputed multiple times',
      'VAR makes complex expressions easier to read by naming intermediate steps',
      'VAR forces context transition automatically',
      'VAR is required for any expression with more than 50 characters',
      'VAR results are scoped to the calling expression and do not leak'
    ],
    correct: [0, 1, 4],
    explanation: 'VAR caches values (1), improves readability (2), and is scoped (5). VAR does NOT force context transition (3 — it captures the value at the row context that EXISTED at VAR declaration, which can be confusing). There is no length requirement (4).',
    whyWrong: {
      2: 'VAR captures the value at its declaration row context. It does NOT perform context transition automatically.',
      3: 'No 50-character rule.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'variables', 'performance', 'readability', 'scoping']
  }),

  single({
    id: 'dxi-016', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Reading: `VAR _curSales = [Total Sales] RETURN SUMX(Customer, IF([Total Sales] > _curSales, 1, 0))`. What does this measure return?',
    options: [
      'The total sales for the current customer',
      'For the current filter context\'s [Total Sales], counts how many customers have higher [Total Sales]',
      'Always returns 0 because _curSales is constant',
      'A syntax error — VAR cannot reference a measure'
    ],
    correct: 1,
    explanation: '_curSales captures the current filter context\'s [Total Sales] (called once at VAR declaration). SUMX iterates Customer (context transition makes [Total Sales] per-customer), and IF compares each customer\'s value to the captured _curSales. Result: count of customers strictly above the current context. Classic ranking/comparison pattern.',
    whyWrong: {
      0: 'It compares against, not just returns, the current context value.',
      2: '_curSales is captured once but USED on every iteration of the SUMX — the comparison varies.',
      3: 'VAR can reference measures; the syntax is valid.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'var', 'measure-comparison', 'context-transition', 'code-reading'],
    relatedIds: ['dxi-002', 'dxi-008']
  }),

  multi({
    id: 'dxi-017', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Iterator interactions with CALCULATE: which statements are TRUE? Select all that apply.',
    options: [
      'CALCULATE inside an iterator performs context transition: row context becomes filter context',
      'A measure inside an iterator is implicitly wrapped in CALCULATE (auto-transition)',
      'CALCULATE outside an iterator does NOT transition row context (because there is no outer row context)',
      'Calling SUMX with a measure inside is functionally equivalent to SUMX with CALCULATE around the same scalar expression',
      'Context transition is FREE — no performance cost'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Context transition basics: CALCULATE inside iterator transitions (1), measures auto-wrap in CALCULATE (2), CALCULATE without an outer row context has nothing to transition (3), measure-call ≡ CALCULATE-around-its-definition (4). (5) is wrong — context transition has a real cost: every row evaluates as if it were a separate query.',
    whyWrong: {
      4: 'Context transition is NOT free. Each row triggers a measure evaluation as a separate filter context — the dominant cost in many slow measures.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'calculate', 'context-transition', 'iterator-interaction', 'cost'],
    relatedIds: ['dxi-002', 'dxi-005', 'dxi-011']
  }),

  single({
    id: 'dxi-018', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Reading: `CALCULATE([Total Sales], REMOVEFILTERS(Date), Date[Year] = 2026)`. The RESULT in a 2025-Q1 visual is:',
    options: [
      '2025-Q1 Total Sales (no change)',
      '2026 Total Sales for the entire year (Date filters are removed first, then Year=2026 reapplied)',
      'NULL',
      'An error'
    ],
    correct: 1,
    explanation: 'CALCULATE filter modifiers evaluate in this order: REMOVEFILTERS clears Date filters, then `Date[Year] = 2026` is applied. The 2025-Q1 visual context is overridden — the result is full-year 2026 Total Sales. This is the canonical "ignore current context, override with new" pattern.',
    whyWrong: {
      0: 'CALCULATE filter args MUTATE the filter context; the visual\'s Date filter is replaced.',
      2: 'Date filter is reapplied as Year=2026; data exists.',
      3: 'Valid DAX, no error.'
    },
    source: SRC.daxFunctions,
    tags: ['dax-context', 'calculate', 'removefilters', 'filter-override', 'code-reading'],
    relatedIds: ['dxi-017']
  }),

  // ── RLS-DAX patterns (8 Q) ─────────────────────────────────
  single({
    id: 'rdx-001', domain: 'semantic', subtopic: 'security-rls', difficulty: 3,
    prompt: 'Code-reading: `[Region] = "Midwest"` as an RLS role expression. Which statement is TRUE?',
    options: [
      'It is a static filter — every member of the role sees only Midwest rows',
      'It is dynamic — different users see different regions',
      'It is invalid — RLS expressions cannot use string literals',
      'It throws an error if [Region] has any NULLs'
    ],
    correct: 0,
    explanation: 'Static filter: the predicate is the same for every role member. Static filters are the cheapest pattern (compile to a simple CALCULATETABLE). Use when the audience for the filter is fixed (e.g., "Midwest team" role).',
    whyWrong: {
      1: 'Static — value is hardcoded, not user-derived.',
      2: 'String literals are valid in RLS.',
      3: 'NULLs are skipped, not errors.'
    },
    source: SRC.rls,
    tags: ['rls', 'static-filter', 'code-reading', 'foundation']
  }),

  single({
    id: 'rdx-002', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'Code-reading RLS expression: `[UserEmail] = USERPRINCIPALNAME() && [Status] = "Active"`. What does this filter?',
    options: [
      'Rows where the row\'s UserEmail matches the calling user AND status is "Active"',
      'Rows for "Active" users only — the email check is ignored',
      'A logical OR (the && is not a real DAX operator)',
      'An error — RLS does not support compound boolean expressions'
    ],
    correct: 0,
    explanation: 'Compound boolean predicates are valid in RLS. && is the AND operator in DAX. The user sees rows where BOTH their email matches AND the row is Active.',
    whyWrong: {
      1: 'Both predicates apply (AND).',
      2: '&& is the DAX AND operator (not OR — that is ||).',
      3: 'Compound predicates are valid.'
    },
    source: SRC.rls,
    tags: ['rls', 'compound-predicate', 'code-reading', 'userprincipalname']
  }),

  single({
    id: 'rdx-003', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'Code-reading: `LOOKUPVALUE(Users[Region], Users[Email], USERPRINCIPALNAME()) = [Region]` as an RLS expression. What does it filter?',
    options: [
      'Rows where the calling user\'s region (looked up from a Users table) matches the row\'s Region column',
      'Rows where Region equals the user\'s email',
      'It always returns BLANK because LOOKUPVALUE is non-deterministic',
      'A single user — but only the user themselves'
    ],
    correct: 0,
    explanation: 'LOOKUPVALUE finds the calling user\'s [Region] from a Users table (matched by email), then RLS filters rows where that lookup\'s value equals the current row\'s [Region]. Common pattern for "users see their region" without exposing region in URL/UPN.',
    whyWrong: {
      1: 'LOOKUPVALUE returns Users[Region], not the email itself.',
      2: 'LOOKUPVALUE is deterministic for unique-email tables.',
      3: 'Region-level filter, not user-row level.'
    },
    source: SRC.rls,
    tags: ['rls', 'lookupvalue', 'indirect-mapping', 'code-reading']
  }),

  multi({
    id: 'rdx-004', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'Code-reading: `PATHCONTAINS([ManagerHierarchyPath], LOOKUPVALUE(Users[Email], Users[UPN], USERPRINCIPALNAME()))`. Which statements are TRUE about this expression? Select all that apply.',
    options: [
      'It maps the calling user\'s UPN to an email via the Users table, then tests path containment',
      'It supports the case where USERPRINCIPALNAME() returns the UPN but the path uses a different identifier (email)',
      'It will silently return BLANK if the user is not in the Users table — and the predicate becomes "FALSE" for every row',
      'It is faster than direct PATHCONTAINS([Path], USERPRINCIPALNAME()) because LOOKUPVALUE is cached',
      'It requires Users to have a unique UPN per row (LOOKUPVALUE breaks on duplicates)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Indirection via LOOKUPVALUE handles the UPN-vs-email mismatch (1, 2). Missing user → LOOKUPVALUE returns BLANK → predicate becomes "BLANK in path" which is FALSE → user sees nothing (3 — important security default!). LOOKUPVALUE requires unique key (5). It is NOT faster (4 wrong) — adds a join cost.',
    whyWrong: {
      3: 'LOOKUPVALUE is not cached at the row level; it adds cost vs direct USERPRINCIPALNAME match.'
    },
    source: SRC.rls,
    tags: ['rls', 'pathcontains', 'lookupvalue', 'indirection', 'code-reading', 'edge-cases']
  }),

  single({
    id: 'rdx-005', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'Code-reading: `VAR _user = USERPRINCIPALNAME() RETURN [UserEmail] = _user || RELATED(Manager[Email]) = _user`. Why might this fail or produce surprising results?',
    options: [
      'VAR-captured USERPRINCIPALNAME() works correctly here',
      'RELATED requires a relationship from current table to Manager — if not configured, it returns BLANK',
      'VAR captures the value once but the OR predicate evaluates per-row, which is the expected behavior',
      'Both B and C — the trap is RELATED depending on a relationship that may not exist'
    ],
    correct: 3,
    explanation: 'Two real concerns: (B) RELATED requires the relationship from the iterated table to Manager. (C) VAR caching here is correct (single-evaluation per row context). The surprise is RELATED returning BLANK (and predicate evaluating FALSE) when no relationship is configured — common when tables are added later.',
    whyWrong: {
      0: 'Correct in isolation but option D is more complete.',
      1: 'Correct in isolation but option D is more complete.',
      2: 'Correct in isolation but option D is more complete.'
    },
    source: SRC.rls,
    tags: ['rls', 'related', 'var', 'relationship-dependency', 'code-reading']
  }),

  multi({
    id: 'rdx-006', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'Which RLS DAX patterns produce a security GAP (user sees rows they should NOT)? Select all that apply.',
    options: [
      'Forgetting to set the role to bidirectional cross-filter when the dim-to-fact direction is "single" → rows leak from the other side',
      'Using a measure-based predicate that returns BLANK for some users due to LOOKUPVALUE failure → BLANK becomes "no filter" not "no rows"',
      'Defining a role with NO predicate at all (empty filter) → role is "see everything"',
      'Using `[Region] = USERPRINCIPALNAME()` (regions named like emails) → no rows match for any user',
      'Using IF(condition, TRUE, FALSE) instead of just `condition` → no security difference'
    ],
    correct: [0, 1, 2],
    explanation: 'Three real security gaps: (1) cross-filter direction misconfig leaks rows on the unfiltered side, (2) BLANK predicate fails open in some contexts, (3) empty role IS the see-everything role. (4) is a no-data symptom (no rows match), not a security gap. (5) is a non-issue — semantically equivalent.',
    whyWrong: {
      3: 'Type mismatch (region vs email) returns no rows, not extra rows. That is data-quality, not a security gap.',
      4: '`IF(c, TRUE, FALSE)` is the same as `c` — no semantic difference.'
    },
    source: SRC.rls,
    tags: ['rls', 'security-gaps', 'cross-filter', 'blank-predicate', 'audit'],
    relatedIds: ['rdx-005']
  }),

  single({
    id: 'rdx-007', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A model has a Sales fact, a Customer dim, and a Users bridge. The relationship Customer → Sales is single-direction. The RLS role on Customer filters customers by USERPRINCIPALNAME(). Why might Sales rows still show ALL customers?',
    options: [
      'Sales rows show only the filtered customers — RLS works correctly',
      'Single-direction filter (Customer → Sales) means Customer\'s row context PROPAGATES to Sales — the description is wrong',
      'If the relationship is from Sales → Customer (fact-to-dim), single-direction means Customer filters do NOT reach Sales — set CrossFilterDirection = Both for the role to honor',
      'It is a known bug; SKU upgrade fixes it'
    ],
    correct: 2,
    explanation: 'Power BI relationships are typically dim-to-fact (single direction means dim filters fact). If wired the OTHER way (or if cross-filter is the wrong direction for the role), the dim filter does not propagate to the fact. The fix is enabling bi-directional cross-filter on the role definition (separate from the relationship setting).',
    whyWrong: {
      0: 'The premise is the symptom — RLS is NOT working correctly here.',
      1: 'Direction interpretation is wrong; depends on which side is which.',
      3: 'No such bug.'
    },
    source: SRC.rls,
    tags: ['rls', 'cross-filter-direction', 'relationship-direction', 'troubleshooting', 'exam-trap'],
    relatedIds: ['rdx-006']
  }),

  multi({
    id: 'rdx-008', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'Code-review of an RLS role: `VAR _u = USERPRINCIPALNAME() VAR _row = LOOKUPVALUE(Users[CustomerKey], Users[Email], _u) RETURN [CustomerKey] = _row`. Which statements are TRUE? Select all that apply.',
    options: [
      'Captures USERPRINCIPALNAME() once and looks up the customer key — efficient',
      'Returns BLANK customer key for users not in Users → predicate becomes `[CustomerKey] = BLANK` → matches NULL CustomerKey rows (security risk if such rows exist)',
      'Works correctly even if Users has duplicate emails',
      'Should be paired with an explicit guard: `[CustomerKey] = _row && NOT(ISBLANK(_row))`',
      'Performance is per-row; LOOKUPVALUE is repeated for each evaluated row'
    ],
    correct: [0, 1, 3, 4],
    explanation: 'VAR-captured UPN is efficient (1). LOOKUPVALUE returning BLANK + `[CustomerKey] = BLANK` matching NULL rows is a real security risk (2) — fix with a guard (4). LOOKUPVALUE is per-row evaluated (5). Duplicates would error or produce non-deterministic results, NOT work silently (3 wrong).',
    whyWrong: {
      2: 'Duplicates in Users[Email] cause LOOKUPVALUE to error or return ambiguous results — not "work correctly".'
    },
    source: SRC.rls,
    tags: ['rls', 'code-review', 'lookupvalue', 'blank-handling', 'security-guard', 'exam-trap']
  })
];
