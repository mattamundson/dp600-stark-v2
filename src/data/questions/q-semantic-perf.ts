// Semantic Model Performance Optimization — 30 questions.
// IDs: smpf-001..smpf-030
// Domain: semantic
// Subtopics: optimization, aggregations, composite-models, query-folding,
//            vertipaq, dax-perf, storage-modes, incremental-refresh
// Type mix: 10 multi, 2 ordering, 18 single
// Code-reading DAX questions: smpf-016..smpf-020, smpf-028 (6 total)

import type { Question } from '../../lib/schema';
import { single, multi, order } from './_helpers';

const SRC_PERF = {
  vertipaq:    { category: 'vertipaq-engine',          note: 'VertiPaq compression, sort order, V-Order' },
  aggs:        { category: 'aggregations',              note: 'User-defined aggs, managed aggs, DQ aggs, matching rules' },
  incRefresh:  { category: 'incremental-refresh',       note: 'RangeStart/RangeEnd, partition policy, hybrid tables' },
  directLakeP: { category: 'direct-lake-performance',   note: 'V-Order, framing, Direct Lake fallback' },
  storageModeP:{ category: 'storage-modes-perf',        note: 'Import/DQ/Dual/Direct Lake performance characteristics' },
  qFold:       { category: 'query-folding',             note: 'M function compatibility, fold verification, broken folds' },
  daxStudio:   { category: 'dax-studio-analyzer',       note: 'DAX Studio, Performance Analyzer, VertiPaq Analyzer, SE/FE' },
  calcCols:    { category: 'calculated-columns-tables',  note: 'Calc col vs measure cost, calculated tables justification' },
};

export const semanticPerf: Question[] = [

  // ── VertiPaq (4) ─────────────────────────────────────────────────

  single({
    id: 'smpf-001', domain: 'semantic', subtopic: 'vertipaq', difficulty: 3,
    prompt: 'A 50M-row fact table has a `CustomerName` column (8M distinct strings) stored directly on the fact. A design review flags it. What is the PRIMARY compression concern?',
    options: [
      'VertiPaq uses row-level encoding by default, which is efficient for high-cardinality strings',
      'High column cardinality forces VertiPaq to use value encoding instead of dictionary/RLE encoding, producing a large dictionary and poor Run-Length Encoding ratios',
      'Strings are stored uncompressed in VertiPaq regardless of cardinality',
      'The issue is only with INTEGER columns — strings compress equally at any cardinality'
    ],
    correct: 1,
    explanation: 'VertiPaq achieves its best compression through (a) a compact value dictionary when few distinct values exist, and (b) Run-Length Encoding (RLE) on the encoded column. High-cardinality string columns (8M distinct names on a 50M-row fact) shatter both: the dictionary is huge and RLE repeats rarely. Moving high-cardinality strings to a dim and joining via integer key is the canonical fix.',
    whyWrong: {
      0: 'High cardinality forces value encoding (a fallback), which is less efficient than dictionary+RLE.',
      2: 'Strings are compressed — but compression ratio degrades badly at high cardinality.',
      3: 'Strings suffer MORE than integers under high cardinality because string dictionary entries are wider.'
    },
    source: SRC_PERF.vertipaq,
    tags: ['vertipaq', 'cardinality', 'compression', 'dictionary', 'rle']
  }),

  single({
    id: 'smpf-002', domain: 'semantic', subtopic: 'vertipaq', difficulty: 4,
    prompt: 'A team wants to maximise VertiPaq compression on a `Status` column that has values "Active", "Inactive", "Pending", distributed 90% / 8% / 2%. Which sort order on the column achieves the best Run-Length Encoding?',
    options: [
      'Alphabetical (Active, Inactive, Pending)',
      'Sort by value frequency descending (Active first) so the most common value creates the longest runs',
      'Random — VertiPaq re-sorts internally and the physical order doesn\'t matter',
      'Sort by the primary key of the table, not by Status'
    ],
    correct: 1,
    explanation: 'VertiPaq\'s RLE encodes consecutive identical values as a single (value, count) pair. Sorting the data so the most frequent value appears in long contiguous blocks maximises run length. With 90% "Active", sorting by Status descending by frequency groups ~45M identical values together — near-optimal compression. V-Order in Microsoft Fabric applies this optimization automatically at Parquet write time.',
    whyWrong: {
      0: 'Alphabetical sorting incidentally groups values but is not optimal for non-uniform distributions.',
      2: 'Physical sort order absolutely matters for RLE — VertiPaq encodes the column in segment order.',
      3: 'Primary-key sort scatters Status values and eliminates runs entirely.'
    },
    source: SRC_PERF.vertipaq,
    tags: ['vertipaq', 'sort-order', 'rle', 'compression', 'v-order']
  }),

  multi({
    id: 'smpf-003', domain: 'semantic', subtopic: 'vertipaq', difficulty: 4,
    prompt: 'Which of the following design patterns DIRECTLY reduce VertiPaq model size? Select all that apply.',
    options: [
      'Replace a wide denormalised fact (30 columns, many high-cardinality strings) with a star schema (integer FK to dims)',
      'Split a millisecond-precision DateTime column into a Date column and a Time-of-day integer',
      'Add more calculated columns to reduce DAX measure complexity at query time',
      'Remove unused columns (columns never referenced in any measure, relationship, or visual)',
      'Increase the workspace capacity SKU'
    ],
    correct: [0, 1, 3],
    explanation: 'Star schema with integer FKs removes high-cardinality string columns from the fact — large per-column dictionary savings. DateTime split reduces cardinality from millions to ~3,650 Date values + ~86,400 Time values. Removing unused columns eliminates their dictionary entirely. Calculated columns ADD to model size (materialised at refresh). SKU upgrade gives more capacity but does not reduce model size.',
    whyWrong: {
      2: 'Calculated columns are materialised at refresh time — they INCREASE model size and refresh cost.',
      4: 'SKU increase adds memory headroom; it does not reduce the size of the model itself.'
    },
    source: SRC_PERF.vertipaq,
    tags: ['vertipaq', 'compression', 'star-schema', 'datetime-split', 'unused-columns']
  }),

  single({
    id: 'smpf-004', domain: 'semantic', subtopic: 'vertipaq', difficulty: 4,
    prompt: 'V-Order is described as "a write-time optimization applied to Parquet files in Microsoft Fabric." What is its specific effect on a Direct Lake semantic model?',
    options: [
      'V-Order encrypts the Parquet file so only Direct Lake can read it',
      'V-Order applies Microsoft-specific sorting, dictionary ordering, and encoding hints that allow Direct Lake to load column segments into memory faster and with better compression ratios',
      'V-Order is required to enable incremental refresh on a lakehouse table',
      'V-Order converts columnar Parquet to row-store format so Power BI can scan rows more efficiently'
    ],
    correct: 1,
    explanation: 'V-Order is a proprietary extension to the Parquet writer that (a) sorts data within row groups to maximise RLE, (b) orders dictionary entries by frequency, and (c) adds encoding hints. For Direct Lake, this means column segments can be loaded into VertiPaq memory faster and achieve near-Import-mode query performance. A Parquet file WITHOUT V-Order still works in Direct Lake but typically shows worse performance. V-Order has nothing to do with encryption, incremental refresh requirements, or row-store conversion.',
    whyWrong: {
      0: 'V-Order is a performance optimisation, not encryption.',
      2: 'Incremental refresh is independent of V-Order.',
      3: 'VertiPaq is a columnar engine; V-Order improves columnar encoding, not row-store conversion.'
    },
    source: SRC_PERF.directLakeP,
    tags: ['v-order', 'direct-lake', 'parquet', 'compression', 'vertipaq']
  }),

  // ── Aggregations (4) ──────────────────────────────────────────────

  single({
    id: 'smpf-005', domain: 'semantic', subtopic: 'aggregations', difficulty: 4,
    prompt: 'A team creates a user-defined aggregation table `Sales_Agg` summarising a 50M-row `FactSales` (DirectQuery) at the Date/Product grain. They add an aggregation entry mapping `SUM(FactSales[Revenue])` → `SUM(Sales_Agg[Revenue])`. A report visual groups by `Date[Month]` and `Product[Category]`. Will the aggregation be used?',
    options: [
      'Yes — the agg matches the grouping columns and the measure, so the query hits the agg table',
      'No — aggregation matching requires the exact same grain as the agg table; Month is coarser than Date, so the query falls through to DirectQuery',
      'No — user-defined aggregations do not support SUM; only COUNT is supported',
      'Yes, but only when the visual uses a matrix, not a bar chart'
    ],
    correct: 0,
    explanation: 'Aggregation matching is "coarser-grain wins": if the query groups by Month (coarser than Date) and Category (coarser than Product), the engine checks whether the agg table can answer at that grain. Because Sales_Agg holds data at Date/Product, it contains all the data needed to answer Month/Category — the engine can apply a further GROUP BY on the already-aggregated values. The agg is used. Visual type is irrelevant.',
    whyWrong: {
      1: 'Coarser-grain queries CAN use a finer-grain agg — the engine re-aggregates. Only finer-grain queries fall through.',
      2: 'User-defined aggs support SUM, AVERAGE, COUNT, MIN, MAX.',
      3: 'Visual type has no effect on aggregation matching.'
    },
    source: SRC_PERF.aggs,
    tags: ['aggregations', 'user-defined-aggs', 'grain', 'matching', 'directquery']
  }),

  multi({
    id: 'smpf-006', domain: 'semantic', subtopic: 'aggregations', difficulty: 5,
    prompt: 'Which conditions must be satisfied for a query to use a user-defined aggregation table instead of falling through to DirectQuery? Select all that apply.',
    options: [
      'All groupBy columns in the query must be at the agg grain or coarser, with a relationship chain back to the agg',
      'The measure aggregation type must match (e.g., SUM maps to SUM, DISTINCTCOUNT maps to DISTINCTCOUNT)',
      'The agg table itself must be in Import storage mode',
      'The agg table must be hidden from report authors',
      'DirectQuery model must use a single data source (no cross-source composites)'
    ],
    correct: [0, 1, 2],
    explanation: 'Three hard requirements: (1) all groupBy columns resolve to the agg grain via relationships, (2) the aggregation type matches exactly, (3) the agg table is in Import (otherwise you would just be querying DQ through a different table). Hiding the agg is a UX best practice but not technically required for matching. Cross-source composites are allowed — aggs work across sources.',
    whyWrong: {
      3: 'Hiding is recommended (to prevent users querying agg directly) but is not a matching prerequisite.',
      4: 'User-defined aggs work in cross-source composite models.'
    },
    source: SRC_PERF.aggs,
    tags: ['aggregations', 'matching-rules', 'storage-modes', 'directquery', 'composite-models']
  }),

  single({
    id: 'smpf-007', domain: 'semantic', subtopic: 'aggregations', difficulty: 4,
    prompt: 'A Power BI Premium model has a user-defined aggregation table. An analyst uses DISTINCTCOUNT in a measure. The aggregation table maps the column to DISTINCTCOUNT. Why does the query STILL fall through to DirectQuery?',
    options: [
      'DISTINCTCOUNT is not supported in user-defined aggregation mappings',
      'DISTINCTCOUNT falls through because distinct counts are NOT additive — a DISTINCTCOUNT at Day grain cannot be re-aggregated to Month grain by simply summing the day-level distinct counts',
      'The aggregation table is stored in DirectQuery mode',
      'DISTINCTCOUNT requires the column to be a primary key in the agg table'
    ],
    correct: 1,
    explanation: 'Distinct counts are non-additive: you cannot sum per-day distinct customer counts to get the per-month distinct customer count (a customer counted on Day 1 and Day 2 is still one distinct customer for the month). The engine cannot re-aggregate a DISTINCTCOUNT agg to a coarser grain — it falls through to the source. If you need it in an agg, materialise the answer at the exact target grain.',
    whyWrong: {
      0: 'DISTINCTCOUNT CAN be mapped in user-defined aggs, but only for queries at the EXACT grain — coarser queries still fall through.',
      2: 'Agg tables must be Import; this is a separate failure mode, not the one described.',
      3: 'No primary-key requirement on the agg column for DISTINCTCOUNT.'
    },
    source: SRC_PERF.aggs,
    tags: ['aggregations', 'distinctcount', 'non-additive', 'fallthrough', 'directquery']
  }),

  single({
    id: 'smpf-008', domain: 'semantic', subtopic: 'aggregations', difficulty: 5,
    prompt: 'A composite model has FactSales (DirectQuery) and Sales_Agg (Import). FactSales has a relationship to DimProduct (Import). An analyst queries `SUM(FactSales[Revenue]) BY DimProduct[SubcategoryKey]`. The agg is defined at `ProductKey` grain. DimProduct has a relationship `SubcategoryKey → CategoryKey`. What happens?',
    options: [
      'The query uses the agg because SubcategoryKey is coarser than ProductKey and the dim relationship chain resolves it',
      'The query falls through to DirectQuery because SubcategoryKey is not directly in the agg grain column list',
      'The query errors because the dim relationship is many-to-many',
      'The query is blocked by Power BI because cross-island joins are not allowed with aggs'
    ],
    correct: 0,
    explanation: 'Aggregation matching traverses relationship chains through Import dimensions. SubcategoryKey is coarser than ProductKey and is reachable via the DimProduct relationship. The engine satisfies the query from the agg + dim join, which is Import-only work — no DirectQuery round-trip needed. This is the key performance win of agg + dim star: queries at any coarser dim grain are served from Import.',
    whyWrong: {
      1: 'The engine DOES traverse relationship chains — the grain of SubcategoryKey is coarser and resolvable.',
      2: 'No M:M is described; DimProduct is a standard dim.',
      3: 'Cross-island joins with aggs are the intended design pattern; they are not blocked.'
    },
    source: SRC_PERF.aggs,
    tags: ['aggregations', 'composite-models', 'relationship-chain', 'grain', 'import-dim']
  }),

  // ── Composite models / storage modes (4) ─────────────────────────

  multi({
    id: 'smpf-009', domain: 'semantic', subtopic: 'composite-models', difficulty: 4,
    prompt: 'A model architect is assigning storage modes. Which table-to-storage-mode assignments follow Microsoft best practice for a hybrid model? Select all that apply.',
    options: [
      'DimDate (small, rarely changes) → Import',
      'FactSales (10B rows, near-real-time source) → DirectQuery',
      'DimProduct (500K rows, refreshed nightly) → Dual',
      'FactReturns (1M rows, mostly static reference) → DirectQuery',
      'DimCurrency (50 rows, exchange rates) → DirectQuery'
    ],
    correct: [0, 1, 2],
    explanation: 'Small, stable dims → Import (DimDate). Enormous near-real-time facts → DirectQuery. Medium dims used both as filter targets and join partners → Dual (served from cache for filters, from DQ source when needed in cross-island joins). Large mostly-static facts should be Import (or incremental refresh), not DQ (option D). Tiny reference tables should be Import, not DQ — DQ overhead for 50 rows is pure waste (option E).',
    whyWrong: {
      3: 'A 1M-row mostly-static fact is a candidate for Import or incremental refresh — DirectQuery adds round-trip latency for no real-time benefit.',
      4: 'A 50-row reference dim in DirectQuery pays per-query source round-trip cost for negligible data — Import is clearly better.'
    },
    source: SRC_PERF.storageModeP,
    tags: ['storage-modes', 'composite-models', 'dual', 'directquery', 'import', 'best-practices']
  }),

  single({
    id: 'smpf-010', domain: 'semantic', subtopic: 'storage-modes', difficulty: 4,
    prompt: 'A dim table is set to Dual storage mode. Under what condition does Power BI use the CACHED (Import) copy versus issuing a DirectQuery to the source?',
    options: [
      'Dual always uses the cache; the DirectQuery path is a fallback only used during refresh',
      'Dual uses the cache when the query can be fully served from Import-side tables; it uses DirectQuery when the query involves a cross-island join with a DirectQuery fact and the engine cannot materialise from cache alone',
      'The user can manually choose which path is used via a model setting',
      'Dual always uses DirectQuery — the cache is only for Power BI Desktop previews'
    ],
    correct: 1,
    explanation: 'Dual is a "best of both" mode. When a query resolves entirely within the Import island (e.g., a slicer selection against a Dual dim), the cache is used. When the Dual table is joined to a DirectQuery fact in a cross-island query, the engine uses the DirectQuery path for that table — ensuring data freshness and consistency with the DQ source. The automatic selection is why Dual dims are recommended for tables that serve both roles.',
    whyWrong: {
      0: 'Dual does NOT always use the cache; DQ path activates for cross-island queries.',
      2: 'No user-level control over which path is used.',
      3: 'The cache is used in production queries, not just Desktop previews.'
    },
    source: SRC_PERF.storageModeP,
    tags: ['storage-modes', 'dual', 'composite-models', 'cross-island', 'cache']
  }),

  single({
    id: 'smpf-011', domain: 'semantic', subtopic: 'composite-models', difficulty: 5,
    prompt: 'A composite model with a DirectQuery fact and Import dims shows slow query performance. DAX Studio reveals the formula engine generates many short DirectQuery SQL statements in parallel rather than one batched query. What is the most likely cause?',
    options: [
      'Too many Import dims cause the formula engine to generate per-dim SQL',
      'The agg table is missing — without an agg, the engine must materialise each filter context into a separate DQ call',
      'Limited relationships (cross-island joins) force the formula engine to materialise and loop rather than push the entire join to the source',
      'The DirectQuery source is using a live connection, not a gateway connection'
    ],
    correct: 2,
    explanation: 'When there are Limited relationships (typical of cross-island joins in composites), the formula engine cannot push the entire join to the source. Instead it materialises one side, passes values as an IN-list filter to the other, and loops — producing many small SQL round-trips (the "chatty DQ" pattern). The fix is to eliminate Limited relationships where possible (use Dual mode on dims, or restructure the composite), or add agg tables to intercept hot query paths.',
    whyWrong: {
      0: 'Import dims with Regular relationships are joined efficiently via IN-list pushdown — not the root cause.',
      1: 'Agg absence would cause more DQ work but not necessarily the "many short statements" pattern; that is specifically the Limited-relationship materialise-and-loop behaviour.',
      3: 'Connection type (gateway vs live) does not change the FM-generated SQL structure.'
    },
    source: SRC_PERF.storageModeP,
    tags: ['composite-models', 'limited-relationships', 'directquery', 'formula-engine', 'chatty-dq']
  }),

  multi({
    id: 'smpf-012', domain: 'semantic', subtopic: 'composite-models', difficulty: 5,
    prompt: 'A Direct Lake model on a Fabric lakehouse falls back to DirectQuery for some queries. Which conditions TRIGGER Direct Lake fallback? Select all that apply.',
    options: [
      'The semantic model contains calculated columns on a Direct Lake table',
      'The Parquet files backing the table were NOT written with V-Order',
      'The query requires a feature unsupported in Direct Lake mode (e.g., CALCULATE with certain time-intelligence functions on non-date-table columns)',
      'The lakehouse table contains more than 1.5B rows',
      'A user-defined aggregation table is in Import mode in the same model'
    ],
    correct: [0, 2],
    explanation: 'Calculated columns on a Direct Lake table convert that table to DirectQuery (option A). Certain unsupported features at query time force a per-query fallback (option C). Non-V-Order Parquet slows loading but does NOT force fallback — it still uses Direct Lake, just slower. Row count alone does not force fallback (there are size limits but they involve framing state, not a simple row threshold). Import agg tables coexist fine with Direct Lake and do not trigger fallback.',
    whyWrong: {
      1: 'Missing V-Order degrades performance but does NOT trigger a DQ fallback.',
      3: 'There is no published simple "1.5B row" fallback threshold; framing limits relate to delta state, not raw row count.',
      4: 'Import agg tables in the same model are a valid composite pattern and do not cause Direct Lake fallback.'
    },
    source: SRC_PERF.directLakeP,
    tags: ['direct-lake', 'fallback', 'directquery', 'calculated-columns', 'v-order', 'composite-models']
  }),

  // ── Query folding (3) ─────────────────────────────────────────────

  single({
    id: 'smpf-013', domain: 'semantic', subtopic: 'query-folding', difficulty: 3,
    prompt: 'During Power Query authoring in Power BI Desktop, a developer applies `Table.AddColumn` followed by `Table.SelectRows`. After the `Table.AddColumn` step, the "View Native Query" option is greyed out. What does this indicate?',
    options: [
      'The query is folding correctly — greyed out means it ran successfully',
      'Query folding has broken at that step: subsequent transformations cannot be pushed to the source and will execute in-memory in the Power Query engine',
      'The connector does not support native query view but folding continues',
      'The developer must enable folding manually via a Power Query option'
    ],
    correct: 1,
    explanation: '"View Native Query" greyed out is the visual signal that query folding has broken — the engine can no longer translate the M expression into a SQL/OData/other native query. All downstream steps run in the Power Query Mashup engine (in-memory, on the gateway or desktop), not on the source. This dramatically increases data transfer and memory use. The fix is to restructure transforms to keep foldable steps together and push non-foldable steps to the end.',
    whyWrong: {
      0: 'Greyed out is the negative indicator — folding has BROKEN, not succeeded.',
      2: 'Some connectors hide the native query menu even when folding, but the standard interpretation in Power BI Desktop is fold-broken.',
      3: 'No manual folding toggle exists in Power Query options.'
    },
    source: SRC_PERF.qFold,
    tags: ['query-folding', 'power-query', 'native-query', 'fold-break', 'refresh-perf']
  }),

  multi({
    id: 'smpf-014', domain: 'semantic', subtopic: 'query-folding', difficulty: 4,
    prompt: 'Which M transformations are KNOWN to break query folding on most relational connectors? Select all that apply.',
    options: [
      'Table.Sort applied to the result of Table.SelectRows',
      'Table.AddColumn using a custom function (non-native M function)',
      'Table.Buffer applied to a table mid-query',
      'Table.SelectRows with a simple column = literal predicate',
      'Table.RenameColumns'
    ],
    correct: [1, 2],
    explanation: 'Custom functions in AddColumn are opaque to the query planner — they cannot be translated to SQL. Table.Buffer explicitly forces materialisation to memory, ending fold by design. Table.Sort, simple SelectRows predicates, and RenameColumns are typically foldable on SQL-based connectors.',
    whyWrong: {
      0: 'Table.Sort is foldable on most connectors (translates to ORDER BY).',
      3: 'Simple equality predicates translate to SQL WHERE clauses — foldable.',
      4: 'Column renames translate to aliased column expressions in SQL — foldable.'
    },
    source: SRC_PERF.qFold,
    tags: ['query-folding', 'fold-break', 'table-buffer', 'custom-function', 'm-functions']
  }),

  single({
    id: 'smpf-015', domain: 'semantic', subtopic: 'query-folding', difficulty: 4,
    prompt: 'A dataflow pulls from an Azure SQL Database. The developer adds a `Table.Buffer` step early in the pipeline "to improve reliability." What is the performance consequence for a 200M-row table?',
    options: [
      'Table.Buffer has no effect on query folding or performance for remote sources',
      'Table.Buffer forces all 200M rows to be materialised in the Power Query engine memory before any further filtering — all subsequent steps run in-engine, not on the source',
      'Table.Buffer causes incremental refresh to fail',
      'Table.Buffer is equivalent to Table.Cache and speeds up repeated references'
    ],
    correct: 1,
    explanation: 'Table.Buffer explicitly breaks query folding by materialising the entire table. For a 200M-row source, this means pulling every row across the network into the Power Query engine before any WHERE clauses can run — a catastrophic anti-pattern for large sources. Table.Buffer is appropriate for small reference tables that are referenced multiple times in the same query, not for pre-filtering large remote tables.',
    whyWrong: {
      0: 'Table.Buffer has a very concrete effect: it breaks folding.',
      2: 'Incremental refresh depends on fold being intact for the date partition predicates, but "causes IR to fail" is too narrow — it causes severe performance degradation first.',
      3: 'Table.Buffer and Table.Cache are distinct: Buffer materialises immediately; Cache defers until first reference. Neither speeds up remote-source large-table queries.'
    },
    source: SRC_PERF.qFold,
    tags: ['query-folding', 'table-buffer', 'materialisation', 'anti-pattern', 'fold-break']
  }),

  // ── DAX performance — code-reading (6) ───────────────────────────

  single({
    id: 'smpf-016', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: `Code-reading — which version is FASTER on a 100M-row FactSales table, and why?

**Version A**
\`\`\`dax
[Expensive] :=
SUMX(
    FactSales,
    IF( FactSales[Channel] = "Online",
        FactSales[Revenue] * 0.9,
        FactSales[Revenue]
    )
)
\`\`\`

**Version B**
\`\`\`dax
[Efficient] :=
CALCULATE(
    SUM(FactSales[Revenue]),
    FactSales[Channel] = "Online"
) * 0.9
+
CALCULATE(
    SUM(FactSales[Revenue]),
    FactSales[Channel] <> "Online"
)
\`\`\``,
    options: [
      'Version A — SUMX scans the table once; Version B scans it twice',
      'Version B — both CALCULATEs are storage-engine scans; Version A iterates 100M rows in the formula engine with an IF per row',
      'Both are identical in performance',
      'Version A only if FactSales is in DirectQuery mode'
    ],
    correct: 1,
    explanation: 'Version A runs in the formula engine: SUMX creates a row context for every one of 100M rows and evaluates an IF per row — serial, FE-bound. Version B pushes both SUMs to the storage engine as column-filter scans (Channel = "Online" and Channel <> "Online"). Two fast SE scans vastly outperform 100M FE iterations. This is the canonical "lift IF out of an iterator" DAX optimisation.',
    whyWrong: {
      0: 'One scan is better than two only when the work per iteration is negligible. Here the FE iteration cost dwarfs the extra SE scan in Version B.',
      2: 'They produce the same numeric result but have very different execution profiles.',
      3: 'Storage-mode is irrelevant — SUMX is always FE-bound for row-level expressions.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'sumx', 'storage-engine', 'formula-engine', 'code-reading', 'if-in-iterator']
  }),

  single({
    id: 'smpf-017', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: `Code-reading — identify the performance trap:

\`\`\`dax
[SlowRank] :=
RANKX(
    ALL(FactSales[ProductKey]),
    CALCULATE(
        SUMX(
            FILTER(FactSales, FactSales[ProductKey] = EARLIER(FactSales[ProductKey])),
            FactSales[Revenue]
        )
    ),
    ,
    DESC
)
\`\`\``,
    options: [
      'EARLIER is deprecated and causes a runtime error',
      'The expression iterates ALL ProductKeys and, for EACH one, runs FILTER over the entire FactSales table using EARLIER — O(n²) complexity over 100M rows',
      'RANKX requires ALL() and this expression is correct as-is',
      'The only issue is that DESC should be ASC'
    ],
    correct: 1,
    explanation: 'This is a classic O(n²) DAX anti-pattern. RANKX iterates every ProductKey; for each, FILTER scans all 100M rows of FactSales looking for matching ProductKey via EARLIER. If there are 200K products × 100M rows = 20 trillion comparisons. The correct approach: pre-summarise with SUMMARIZECOLUMNS or ADDCOLUMNS at the product grain, then RANKX over the summary.',
    whyWrong: {
      0: 'EARLIER still works in this nested-row-context usage, though window functions are the modern replacement.',
      2: 'RANKX with ALL() is needed but the FILTER(FactSales, EARLIER) pattern inside is the performance killer.',
      3: 'Sort direction is a functional choice, not a performance issue.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'rankx', 'earlier', 'o-n-squared', 'code-reading', 'filter-scan', 'exam-trap']
  }),

  single({
    id: 'smpf-018', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: `Code-reading — two measures that should return the same result. Which is faster?

\`\`\`dax
-- Measure A
[SalesYTD_A] :=
CALCULATE(
    [Total Sales],
    DATESYTD(Date[Date])
)

-- Measure B
[SalesYTD_B] :=
CALCULATE(
    [Total Sales],
    FILTER(
        ALL(Date),
        Date[Date] <= MAX(Date[Date])
        && Date[Year] = MAX(Date[Year])
    )
)
\`\`\``,
    options: [
      'Measure B — FILTER is always faster than time-intelligence functions',
      'Measure A — DATESYTD returns a pre-optimised date table subset; time-intelligence functions generate optimised storage-engine date range requests rather than row-by-row FILTER',
      'Both are identical in execution plan',
      'Measure A only when the Date table is marked as a Date Table'
    ],
    correct: 1,
    explanation: 'DATESYTD (and the broader time-intelligence family) produces an optimised date interval that the engine can translate into a high-level SE date-range predicate — processed in the storage engine without iterating every Date row. The manual FILTER(ALL(Date), ...) pattern runs row-by-row in the formula engine over the entire Date table. Always prefer the built-in time-intelligence functions over manual date-table FILTER loops. (Note: Measure A does require a marked Date table to function correctly.)',
    whyWrong: {
      0: 'FILTER over a date table is formula-engine work; time-intelligence is SE-optimised.',
      2: 'The execution plans differ materially — time-intel generates a date-interval request, FILTER generates row iterations.',
      3: 'The marked Date table is required for correctness of A, but the question asks which is faster — and A is faster when both are correct.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'time-intelligence', 'datesytd', 'filter-date-table', 'storage-engine', 'code-reading']
  }),

  single({
    id: 'smpf-019', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: `Code-reading — what is wrong with this measure, and how should it be fixed?

\`\`\`dax
[AvgOrderValue] :=
AVERAGEX(
    Sales,
    CALCULATE(
        SUM(Sales[LineAmount]),
        ALLEXCEPT(Sales, Sales[OrderID])
    )
)
\`\`\``,
    options: [
      'Nothing is wrong — AVERAGEX + ALLEXCEPT is the canonical order-level average pattern',
      'The measure computes correctly but is extremely slow: for every Sales row it runs CALCULATE(SUM(...), ALLEXCEPT(...)), materialising the entire order group in the FE per row; use SUMMARIZECOLUMNS + AVERAGEX at order grain instead',
      'ALLEXCEPT inside CALCULATE is not allowed; use KEEPFILTERS instead',
      'AVERAGEX cannot reference SUM — use DIVIDE(SUM(...), COUNTROWS(...))'
    ],
    correct: 1,
    explanation: 'This pattern produces a context-transition + ALLEXCEPT materialisation per Sales row — O(n) measure evaluations, each rebuilding a filtered Sales view. For a fact with 10M rows and 1M orders this is catastrophic. The correct approach: AVERAGEX(SUMMARIZECOLUMNS(Sales[OrderID], "OrderTotal", SUM(Sales[LineAmount])), [OrderTotal]) — pre-summarise to order grain, then average the summary. ALLEXCEPT is legal here but the design is the problem.',
    whyWrong: {
      0: 'The pattern is functional but is a severe performance anti-pattern at scale.',
      2: 'ALLEXCEPT inside CALCULATE is valid DAX syntax.',
      3: 'SUM inside AVERAGEX is legal and is not the issue.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'averagex', 'allexcept', 'summarizecolumns', 'code-reading', 'anti-pattern']
  }),

  single({
    id: 'smpf-020', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: `Code-reading — which rewrite is faster and why?

\`\`\`dax
-- Original
[SalesAboveAvg] :=
CALCULATE(
    COUNTROWS(Sales),
    FILTER(
        Sales,
        Sales[Amount] > AVERAGE(Sales[Amount])
    )
)

-- Rewrite
[SalesAboveAvg_Fast] :=
VAR _avg = AVERAGE(Sales[Amount])
RETURN
CALCULATE(
    COUNTROWS(Sales),
    Sales[Amount] > _avg
)
\`\`\``,
    options: [
      'Original — the FILTER inside CALCULATE is always faster than VAR',
      'Rewrite — VAR materialises AVERAGE once; the Original re-evaluates AVERAGE(Sales[Amount]) for EVERY row inside the FILTER iterator (context transition per row)',
      'Both are identical — DAX automatically hoists constants out of iterators',
      'Rewrite fails because VAR cannot be used inside CALCULATE'
    ],
    correct: 1,
    explanation: 'Inside FILTER(Sales, Sales[Amount] > AVERAGE(...)), AVERAGE is a measure — context transition fires per row, recalculating average for each row\'s filter context. On 10M rows that is 10M measure evaluations of AVERAGE. VAR captures the average ONCE in the outer context (no iteration), then the scalar comparison `Sales[Amount] > _avg` is a simple column predicate pushed to the storage engine. This is exactly what VAR is for.',
    whyWrong: {
      0: 'FILTER with a measure predicate is formula-engine-bound per row — not faster.',
      2: 'DAX does NOT automatically hoist measure references out of iterators — that is the developer\'s job via VAR.',
      3: 'VAR is fully supported before and outside CALCULATE.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'var', 'filter', 'context-transition', 'code-reading', 'hoisting', 'exam-trap']
  }),

  // ── SE/FE ratio + tooling (2) ─────────────────────────────────────

  multi({
    id: 'smpf-021', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: 'DAX Studio shows a query with: SE duration 50ms, FE duration 4,200ms, SE calls 3. Which actions are likely to improve performance? Select all that apply.',
    options: [
      'Rewrite iterators to push predicates into the storage engine (use column predicates instead of measure predicates)',
      'Increase the model refresh frequency to populate more SE cache',
      'Replace FILTER(table, measure > value) patterns with VAR + column predicate',
      'Add V-Order to the Parquet files',
      'Materialise intermediate calculations using VAR to prevent re-evaluation'
    ],
    correct: [0, 2, 4],
    explanation: 'FE-bound queries (50ms SE / 4.2s FE) are caused by formula-engine work: iterators, context transitions, redundant measure evaluations. Fixes: push predicates to SE (A), replace measure-predicates in FILTER with VAR-captured scalars (C), use VAR to avoid re-evaluation (E). SE cache warmth (B) does not help FE time. V-Order (D) helps SE load time, not FE computation.',
    whyWrong: {
      1: 'SE is already fast (50ms); cache warmth is irrelevant to FE-bound queries.',
      3: 'V-Order improves storage engine load performance, not formula engine computation time.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'se-fe-ratio', 'dax-studio', 'formula-engine', 'storage-engine', 'tooling']
  }),

  single({
    id: 'smpf-022', domain: 'semantic', subtopic: 'dax-perf', difficulty: 3,
    prompt: 'A developer runs Performance Analyzer in Power BI Desktop and sees a visual with: DAX query 120ms, Visual display 80ms, Other 5ms. The visual is slow at 12 seconds in production (Premium capacity). What is the most likely cause of the discrepancy?',
    options: [
      'Performance Analyzer is inaccurate — the 120ms reading should be multiplied by 100',
      'Performance Analyzer runs against a warm local VertiPaq cache in Desktop; production queries hit a shared capacity under concurrent load with a cold or partial cache',
      'The DAX query is fine — the 12 seconds is caused by the visual renderer, not DAX',
      'Performance Analyzer only measures Import mode; the production model is DirectQuery'
    ],
    correct: 1,
    explanation: 'Performance Analyzer measures queries against the local Desktop model (fully cached, no concurrency). Production Premium capacity serves many users concurrently, may have cold cache between refreshes, and has CPU/memory shared across workloads. A measure that takes 120ms on a warm Desktop cache can take 10–50× longer under contention with cold storage. Always validate in the target environment, not just Desktop.',
    whyWrong: {
      0: 'No multiplier rule exists; the discrepancy is explained by environment differences.',
      2: 'Visual display 80ms is negligible vs 12 seconds — the bottleneck is the query, not the renderer.',
      3: 'Performance Analyzer works with both Import and DirectQuery models.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'performance-analyzer', 'cache', 'concurrency', 'production-vs-desktop', 'tooling']
  }),

  // ── Incremental refresh (4) ───────────────────────────────────────

  order({
    id: 'smpf-023', domain: 'semantic', subtopic: 'incremental-refresh', difficulty: 3,
    prompt: 'Order these steps to correctly configure incremental refresh on a Power BI semantic model connected to an Azure SQL Database.',
    options: [
      'Define RangeStart and RangeEnd parameters (type Date/Time) in Power Query',
      'Apply the RangeStart/RangeEnd filter to the date column in the Power Query query',
      'Configure the incremental refresh policy (store rows from N years, refresh rows from M days) in the semantic model settings',
      'Publish the model to a Premium / Fabric workspace',
      'Trigger a full refresh to partition the table and validate the policy'
    ],
    shuffled: [
      'Configure the incremental refresh policy (store rows from N years, refresh rows from M days) in the semantic model settings',
      'Apply the RangeStart/RangeEnd filter to the date column in the Power Query query',
      'Trigger a full refresh to partition the table and validate the policy',
      'Define RangeStart and RangeEnd parameters (type Date/Time) in Power Query',
      'Publish the model to a Premium / Fabric workspace'
    ],
    explanation: 'Incremental refresh setup sequence: (1) Create RangeStart/RangeEnd parameters — these are how Power Query knows which rows to load. (2) Filter the date column using those parameters — this ensures the query folds to the source. (3) Set the policy (store/refresh windows) — depends on the parameters already existing. (4) Publish to Premium/Fabric — IR is a Premium feature. (5) Full refresh — partitions the table based on the policy. Reversing 1 and 2 means the filter cannot reference the not-yet-created parameters.',
    source: SRC_PERF.incRefresh,
    tags: ['incremental-refresh', 'rangestart', 'rangeend', 'ordering', 'configuration']
  }),

  multi({
    id: 'smpf-024', domain: 'semantic', subtopic: 'incremental-refresh', difficulty: 5,
    prompt: 'Which conditions are REQUIRED for incremental refresh to fold the date partition predicate to the source? Select all that apply.',
    options: [
      'RangeStart and RangeEnd must be named exactly "RangeStart" and "RangeEnd" (case-sensitive)',
      'The parameters must be of type Date/Time (not Date or Text)',
      'The Power Query step that filters on the date column using RangeStart/RangeEnd must fold — non-foldable transforms added BEFORE the filter break this',
      'The source connector must support query folding (e.g., SQL-based sources)',
      'The semantic model must be in Import mode (incremental refresh does not work with DirectQuery tables)'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'All four are requirements: (A) The parameter names are hard-coded in the Power BI engine — any other names are not recognised as IR sentinels. (B) Date/Time type is required; Date alone may not fold correctly. (C) Non-foldable transforms before the date filter break the entire chain — all subsequent steps including the partition predicate run in-engine. (D) If the connector does not fold, the partition predicate cannot be pushed and IR degrades to a full table pull. DirectQuery tables (E) do not use IR — but the question is about what is REQUIRED for folding, and IR works only on Import.',
    whyWrong: {
      4: 'Incremental refresh applies to Import-mode tables only, but the option wording says "does not work with DQ" which is true — it is not a fold requirement per se, it is a mode requirement. The four folding requirements are A–D.'
    },
    source: SRC_PERF.incRefresh,
    tags: ['incremental-refresh', 'query-folding', 'rangestart', 'rangeend', 'requirements', 'exam-trap']
  }),

  single({
    id: 'smpf-025', domain: 'semantic', subtopic: 'incremental-refresh', difficulty: 4,
    prompt: 'A hybrid table uses incremental refresh (3-year historical, 1-day refresh window) PLUS the "Get the latest data in real time with DirectQuery" option. A user queries data from 2 hours ago. Where does the data come from?',
    options: [
      'The Import partitions — all data older than the refresh window',
      'The DirectQuery partition — the real-time tail covers the period since the last refresh, so 2-hour-old data is in the DQ partition',
      'Both — the engine merges Import and DQ results for any query that spans both partitions',
      'Neither — hybrid tables only support queries aligned to partition boundaries'
    ],
    correct: 1,
    explanation: 'A hybrid table has N Import partitions (historical) plus one live DirectQuery partition that covers "now to the last refresh boundary." Data from 2 hours ago is within the DQ tail (assuming the last refresh was earlier today), so it is served from the DQ partition. Historical data older than the refresh window comes from Import. The engine merges seamlessly across partitions for queries that span both — option C describes the cross-partition case correctly but the specific "2 hours ago" scenario lands in the DQ tail.',
    whyWrong: {
      0: 'Import partitions hold data up to the last refresh boundary; 2-hour-old data is more recent than that.',
      2: 'Technically true for cross-partition queries, but the question asks about 2-hour-old data specifically — which falls entirely in the DQ partition.',
      3: 'Hybrid tables do not require partition-aligned queries.'
    },
    source: SRC_PERF.incRefresh,
    tags: ['incremental-refresh', 'hybrid-table', 'directquery', 'real-time', 'partitions']
  }),

  single({
    id: 'smpf-026', domain: 'semantic', subtopic: 'incremental-refresh', difficulty: 5,
    prompt: 'A model uses incremental refresh: store 5 years, refresh last 10 days. The team triggers a deployment that changes the M query in a way that is "query-folding incompatible." What happens on the next refresh?',
    options: [
      'Only the 10-day refresh window re-fetches — the change has no broader impact',
      'The engine detects the M query change, marks all partitions as invalid, and performs a full historical reload of 5 years of data',
      'The deployment fails with a validation error before refresh',
      'Partitions older than 10 days are automatically archived and the 5-year window shrinks to 10 days'
    ],
    correct: 1,
    explanation: 'When the M query definition changes in a way that is incompatible with the existing partitioned data (different columns, different filter logic), Power BI considers all existing partitions stale and will attempt a full reload on next refresh — potentially pulling 5 years of data from the source. This is a critical operational risk: M query changes on incrementally-refreshed tables require careful review. Use the XMLA endpoint to manage partitions manually if you need surgical reloads.',
    whyWrong: {
      0: 'A M query change invalidates ALL partitions, not just the rolling window.',
      2: 'The deployment succeeds; the pain comes at refresh time.',
      3: 'No automatic archive or window-shrink behaviour exists.'
    },
    source: SRC_PERF.incRefresh,
    tags: ['incremental-refresh', 'full-reload', 'm-query-change', 'partition-invalidation', 'exam-trap']
  }),

  // ── Direct Lake performance (2) ───────────────────────────────────

  single({
    id: 'smpf-027', domain: 'semantic', subtopic: 'storage-modes', difficulty: 4,
    prompt: 'A Direct Lake semantic model is pointing to a Fabric lakehouse delta table. The lakehouse table was updated 30 minutes ago, but the semantic model still returns old data. No manual refresh was triggered. What is the most likely explanation?',
    options: [
      'Direct Lake models cache data permanently until a scheduled refresh runs',
      'The model is "framed" to an older delta snapshot — Direct Lake reads the delta log state at frame time, and the model will not see newer delta table versions until it re-frames (automatic or via explicit refresh)',
      'Direct Lake only supports append operations; update/delete operations are not reflected until the next workspace refresh',
      'The Fabric capacity is throttled and delaying data propagation'
    ],
    correct: 1,
    explanation: 'Direct Lake uses the concept of "framing": at model load (or refresh), the engine records the delta table\'s current version (a pointer into the delta log). Queries read that snapshot. When the delta table is updated (new parquet files, delta log entries), the model\'s frame is stale until it re-frames. Re-framing happens automatically on a schedule or can be triggered via a semantic model refresh. This is a fundamental design trade-off: no refresh window, but data is not instantaneous.',
    whyWrong: {
      0: 'Direct Lake does not cache permanently — it re-frames, which is lighter than full Import refresh but is still a required step.',
      2: 'Direct Lake supports all delta operations (insert/update/delete/merge) via the delta log; it is not append-only.',
      3: 'Capacity throttling affects query performance, not data visibility lag due to framing.'
    },
    source: SRC_PERF.directLakeP,
    tags: ['direct-lake', 'framing', 'delta-table', 'data-freshness', 'snapshot']
  }),

  // ── Calculated columns vs measures (2) ───────────────────────────

  multi({
    id: 'smpf-028', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: `Code-reading — a developer writes:

\`\`\`dax
-- In the Sales table (100M rows), a calculated column:
Sales[ProfitMargin] = DIVIDE(Sales[Profit], Sales[Revenue])
\`\`\`

And separately a measure:

\`\`\`dax
[Avg Profit Margin] := AVERAGEX(Sales, Sales[ProfitMargin])
\`\`\`

Which statements are TRUE about this design? Select all that apply.`,
    options: [
      'Sales[ProfitMargin] is materialised at refresh time — 100M values are stored in VertiPaq, increasing model size',
      'The measure [Avg Profit Margin] would produce the same result if written as AVERAGEX(Sales, DIVIDE(Sales[Profit], Sales[Revenue])) without the calculated column',
      'The calculated column allows the value to be used in slicers and as a groupBy axis, which a measure alone cannot do',
      'Calculated columns participate in V-Order compression because they are stored in VertiPaq',
      'The calculated column refreshes in real time with Direct Lake, even without a semantic model refresh'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'A: Calc columns are materialised — 100M DIVIDE results stored = significant size increase. B: AVERAGEX with inline DIVIDE is equivalent — the calc column is not needed for the measure. C: True — calc columns are stored per-row and can be axes/slicers; measures cannot. D: Calc columns live in VertiPaq and benefit from all VertiPaq optimisations including V-Order compression of the output column. E is false — calc columns are computed at refresh and do NOT update in real time with Direct Lake (they would require model refresh).',
    whyWrong: {
      4: 'Calculated columns are computed at semantic model refresh time. They do NOT update live with changes to the underlying Direct Lake table — that is a key reason to prefer measures over calc columns in Direct Lake scenarios.'
    },
    source: SRC_PERF.calcCols,
    tags: ['calculated-columns', 'measures', 'vertipaq', 'direct-lake', 'code-reading', 'model-size']
  }),

  single({
    id: 'smpf-029', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'When is a CALCULATED TABLE justified in a semantic model, rather than using a measure or a Power Query transformation?',
    options: [
      'Never — calculated tables should always be replaced by Power Query tables for performance',
      'When the calculation requires DAX semantics (e.g., SUMMARIZECOLUMNS, CROSSJOIN, UNION of model tables) that cannot be expressed in M, and the result needs to be a permanent table for use in relationships or as an axis',
      'When you want real-time data updates — calculated tables refresh faster than Power Query tables',
      'When the table has more than 1M rows — calculated tables compress better than Power Query tables'
    ],
    correct: 1,
    explanation: 'Calculated tables are justified when (a) the logic requires DAX operations on existing model tables (cross-table UNION, role-playing date tables, disconnected parameter tables, bridge tables derived from model relationships) and (b) the result needs to be a persisted table for relationships, axes, or slicers. They are NOT faster than Power Query — they still materialise at refresh. For pure ETL logic, Power Query (closer to the source, potentially foldable) is preferred.',
    whyWrong: {
      0: 'Calculated tables have legitimate use cases — the all-or-nothing rejection is wrong.',
      2: 'Calculated tables refresh at the SAME time as the model, not faster. Real-time updates require Direct Lake or DQ.',
      3: 'Row count does not determine whether a calc table compresses better — the compression properties are the same as Import.'
    },
    source: SRC_PERF.calcCols,
    tags: ['calculated-tables', 'optimization', 'power-query', 'justified-use', 'relationships']
  }),

  // ── SUMMARIZECOLUMNS vs SUMMARIZE (1) ────────────────────────────

  single({
    id: 'smpf-030', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: `A developer writes:

\`\`\`dax
EVALUATE
SUMMARIZE(
    Sales,
    Sales[ProductKey],
    "Total Revenue", SUM(Sales[Revenue])
)
\`\`\`

A reviewer recommends replacing it with SUMMARIZECOLUMNS. What is the PRIMARY performance reason?`,
    options: [
      'SUMMARIZE is deprecated; SUMMARIZECOLUMNS is its replacement with no performance difference',
      'SUMMARIZE uses the formula engine to compute the extension column ("Total Revenue") inside a row context — context transition fires per group. SUMMARIZECOLUMNS pushes the aggregation to the storage engine and is significantly faster for large tables',
      'SUMMARIZECOLUMNS supports more data types than SUMMARIZE',
      'SUMMARIZE cannot reference measures; only SUMMARIZECOLUMNS can'
    ],
    correct: 1,
    explanation: 'SUMMARIZE computes extension columns (the named column expressions like "Total Revenue") inside a row context — requiring context transition per group, which is formula-engine work. SUMMARIZECOLUMNS was specifically designed to push aggregations into the storage engine, bypassing context transition for simple aggregations. On a 100M-row Sales table grouped to 200K ProductKeys, this difference is orders of magnitude. The Microsoft DAX documentation explicitly advises against using SUMMARIZE with extension columns — use SUMMARIZECOLUMNS or ADDCOLUMNS(SUMMARIZE(...), ...) instead.',
    whyWrong: {
      0: 'SUMMARIZE is not deprecated but has well-known performance and semantic pitfalls for extension columns.',
      2: 'Data-type support is not the differentiator between the two functions.',
      3: 'SUMMARIZE CAN reference measures, but doing so triggers context transition; this is the problem, not a limitation.'
    },
    source: SRC_PERF.daxStudio,
    tags: ['dax-perf', 'summarizecolumns', 'summarize', 'context-transition', 'storage-engine', 'exam-trap']
  }),

];
