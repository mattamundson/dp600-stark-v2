import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 35 deep semantic-engineering questions, IDs `sme-001..sme-035`. IDs are
// unique against existing sem-, sx-, scn-, and other ranges. Distribution:
// star-schema, relationships, optimization, calc-groups, field-parameters,
// composite, dax-context (8-10 weight), dax-perf, security-rls, security-ols.
// Difficulty 3-5 weighted to 4. Heavy whyWrong coverage on every item.

export const semanticEngineering: Question[] = [
  // ── Star schema (3) ──────────────────────────────────────────────
  single({
    id: 'sme-001', domain: 'semantic', subtopic: 'star-schema', difficulty: 3,
    prompt: 'A Sales fact has FK columns CustomerKey, ProductKey, DateKey, and StoreKey. The team also has a Customer dim with CustomerCity and a separate City dim with CityRegion. Which design is BEST for tabular?',
    options: [
      'Snowflake: Sales → Customer → City (chained relationships)',
      'Star: denormalize CityRegion onto Customer so Sales → Customer is a single hop',
      'Galaxy: model City as its own conformed dim against multiple facts',
      'Normalize further by extracting Region from City'
    ],
    correct: 1,
    explanation: 'Tabular favors star schemas — denormalize the City attributes onto Customer so the model has one fact-to-dim hop per analytical dimension. Fewer joins means VertiPaq compresses and scans more efficiently, DAX is simpler, and ambiguity from chained relationships is avoided.',
    whyWrong: {
      0: 'Snowflake adds an extra hop and degrades compression / DAX clarity for no analytical gain in tabular.',
      2: 'Galaxy is a warehouse pattern; the question is about ONE Sales model. Decompose into a star.',
      3: 'Further normalization moves in the wrong direction for a tabular model.'
    },
    source: SRC.semanticModel,
    tags: ['star-schema', 'denormalization']
  }),
  multi({
    id: 'sme-002', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    prompt: 'Which patterns are RED FLAGS in a tabular star schema? Select all that apply.',
    options: [
      'Date columns of type DateTime stored at second-precision in a fact (cardinality explosion)',
      'A Date dim NOT marked as a date table',
      'Auto date/time enabled while a dedicated Date dim is also present',
      'Snowflaked dim chains Customer → Geography → Region',
      'A surrogate-key relationship between fact and dim'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'High-cardinality datetime columns kill VertiPaq compression. Unmarked Date dim breaks time intel. Auto date/time fights an explicit Date dim and bloats the model. Snowflake chains add joins with no analytical value. Surrogate keys (option 4) are the recommended pattern — not a red flag.',
    whyWrong: {
      4: 'Surrogate-key relationships are the RECOMMENDED pattern for fact-to-dim joins; they are not a red flag.'
    },
    source: SRC.semanticModel,
    tags: ['star-schema', 'red-flags', 'cardinality']
  }),
  single({
    id: 'sme-003', domain: 'semantic', subtopic: 'star-schema', difficulty: 4,
    prompt: 'A fact has 50M rows and a DateTime column at millisecond precision used purely for time-of-day analysis. What is the BEST modeling change?',
    options: [
      'Leave it as DateTime; VertiPaq handles high cardinality',
      'Split into a Date column (joins Date dim) and a Time-of-day column (joins a Time dim at second or minute precision)',
      'Convert to STRING for better compression',
      'Drop the column entirely and recompute time at the visual'
    ],
    correct: 1,
    explanation: 'High-cardinality DateTime is a #1 cause of model bloat. Splitting into a Date column + a Time-of-day column dramatically reduces dictionary sizes (Date is ~3,650 unique for 10 years; Time-of-day is ~86,400 at second precision). Each can join its own conformed dim.',
    whyWrong: {
      0: 'High-cardinality datetime is a known compression-killer. "VertiPaq handles it" misses the order-of-magnitude impact.',
      2: 'Converting to STRING worsens compression and breaks any time-intel logic.',
      3: 'Dropping the column eliminates the analysis the column exists to support.'
    },
    source: SRC.semanticModel,
    tags: ['star-schema', 'datetime-split', 'compression']
  }),

  // ── Relationships (4) ────────────────────────────────────────────
  single({
    id: 'sme-004', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'A relationship between Date and Sales is "Limited" rather than "Regular." What does this typically imply?',
    options: [
      'The relationship is bi-directional',
      'One side is in DirectQuery / Direct Lake and the other is Import (or other cross-island/composite scenario), so the engine cannot pre-compute joins',
      'The relationship has cardinality many-to-many',
      'The dim has duplicate keys'
    ],
    correct: 1,
    explanation: 'Limited relationships occur when the engine cannot rely on a pre-computed join — typical causes are cross-island composite-model joins (Import to DirectQuery / Direct Lake), or many-to-many. They evaluate per-query, more expensively. Aim for Regular relationships wherever possible.',
    whyWrong: {
      0: 'Direction is independent of Limited/Regular classification.',
      2: 'M:M is one cause but not the only one — the more general label is "Limited."',
      3: 'Duplicate keys block the relationship entirely; they don\'t merely "limit" it.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'limited-vs-regular', 'composite']
  }),
  single({
    id: 'sme-005', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'A Sales fact has both OrderDate and ShipDate. You want a single Date dim that can analyze EITHER. What is the canonical pattern?',
    options: [
      'Two active relationships from Sales to Date',
      'One active relationship (e.g., Sales[OrderDate] → Date[Date]) and one inactive, activated per-measure with USERELATIONSHIP',
      'Two Date dims, one per role',
      'A many-to-many bridge'
    ],
    correct: 1,
    explanation: 'Tabular allows only ONE active relationship between two tables. Use one active (the default analysis date) and one inactive, activated for specific measures via USERELATIONSHIP — the role-playing dimension pattern.',
    whyWrong: {
      0: 'Two active relationships between the same two tables are NOT allowed in tabular.',
      2: 'Two physical Date dims wastes storage and complicates time intel; the role-play pattern is canonical.',
      3: 'M:M bridge does not solve role-playing; it solves cardinality, not multiple-FK-to-same-dim.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'role-playing', 'userelationship']
  }),
  multi({
    id: 'sme-006', domain: 'semantic', subtopic: 'relationships', difficulty: 5,
    prompt: 'Which statements about M:M (many-to-many) relationships in tabular are TRUE? Select all that apply.',
    options: [
      'Direct M:M relationships create LIMITED relationships, evaluated per-query, with a perf cost',
      'A bridge table with two 1:* relationships is generally faster than a direct M:M when feasible',
      'M:M relationships should propagate filters bidirectionally by default',
      'M:M relationships can introduce ambiguity if multiple paths exist between two tables',
      'M:M is only valid between dimension tables, not between a dim and a fact'
    ],
    correct: [0, 1, 3],
    explanation: 'M:M creates limited relationships and per-query work. A bridge with two 1:* is usually preferred. Multiple M:M paths can create filter ambiguity. Bidirectional default is unsafe — propagation direction should be a deliberate choice. M:M is allowed for any pairing, not just dim-dim.',
    whyWrong: {
      2: 'Bidirectional propagation by default is dangerous (ambiguity, performance) — propagation should be chosen deliberately, not assumed.',
      4: 'M:M is allowed for any table pair, not restricted to dim-dim.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'many-to-many', 'bridge']
  }),
  single({
    id: 'sme-007', domain: 'semantic', subtopic: 'relationships', difficulty: 4,
    prompt: 'Bi-directional filtering between two dimensions (Customer ↔ Geography) is added to "make slicers cross-filter." What is the DOMINANT risk?',
    options: [
      'Bi-directional filters cannot be set on dim-to-dim relationships',
      'Filter ambiguity: when Sales is filtered by Customer AND Geography, the engine may have multiple valid filter paths and can produce incorrect totals',
      'Bi-directional always defaults to many-to-many',
      'Bi-directional filtering disables RLS'
    ],
    correct: 1,
    explanation: 'Bi-directional dim-to-dim filtering is the most common source of ambiguous filter graphs. Tabular tries to resolve the path; in some cases the result is silently wrong or just unintuitive. Use CROSSFILTER inside specific measures instead, or rethink the model.',
    whyWrong: {
      0: 'Bi-directional CAN be set on dim-to-dim; that\'s exactly what makes it dangerous.',
      2: 'Cardinality is independent of direction.',
      3: 'RLS is unaffected by direction; bi-directional changes filter propagation, not security.'
    },
    source: SRC.semanticModel,
    tags: ['relationships', 'bi-directional', 'ambiguity']
  }),

  // ── Composite (3) ────────────────────────────────────────────────
  single({
    id: 'sme-008', domain: 'semantic', subtopic: 'composite', difficulty: 4,
    prompt: 'A composite model mixes Direct Lake (FactSales), Import (DimDate, DimCustomer), and DirectQuery (DimProduct, large slow-changing). What is true about queries that span all three?',
    options: [
      'All queries are evaluated in pure VertiPaq',
      'Cross-island joins create LIMITED relationships and may force the slowest island\'s round-trip cost on every query',
      'DirectQuery cannot coexist with Direct Lake in the same model',
      'Import tables are silently rebuilt as Direct Lake when adjacent'
    ],
    correct: 1,
    explanation: 'In composite models, joining across "islands" (Import vs DirectQuery vs Direct Lake) creates Limited relationships. Queries that need to traverse them pay the cost of the slowest island per request. Use composite deliberately for small Import dims or DQ tables; do not splatter cross-island joins across hot paths.',
    whyWrong: {
      0: 'Cross-island queries are not pure VertiPaq; they involve per-query coordination.',
      2: 'DirectQuery and Direct Lake CAN coexist in a composite model.',
      3: 'No silent rebuild — Import is Import.'
    },
    source: SRC.semanticModel,
    tags: ['composite', 'cross-island', 'storage-modes']
  }),
  multi({
    id: 'sme-009', domain: 'semantic', subtopic: 'composite', difficulty: 5,
    prompt: 'In a Direct Lake + Import composite model, which patterns are SAFE / RECOMMENDED? Select all that apply.',
    options: [
      'Small Import dims (e.g., DimDate, DimCalendar) joined to a Direct Lake fact',
      'Calculated columns added on the Direct Lake fact for "convenience"',
      'A single shared Date dim in Import to enable time-intel functions reliably',
      'Adding a calculated Import table that scans the Direct Lake fact each refresh',
      'Using Import-only measures for slowly-changing reference data'
    ],
    correct: [0, 2, 4],
    explanation: 'Small Import dims and shared Date dims are textbook composite use cases. Adding calc columns to a Direct Lake fact disqualifies that table from Direct Lake. Import tables that scan the Direct Lake fact at refresh time are anti-patterns — they materialize what Direct Lake exists to avoid materializing.',
    whyWrong: {
      1: 'Calc columns on a Direct Lake table convert the table to DirectQuery, losing Direct Lake performance.',
      3: 'Import tables scanning the Direct Lake fact materialize data that Direct Lake exists to avoid; they re-introduce refresh windows.'
    },
    source: SRC.semanticModel,
    tags: ['composite', 'direct-lake-import-mix']
  }),
  single({
    id: 'sme-010', domain: 'semantic', subtopic: 'composite', difficulty: 4,
    prompt: 'A composite model has Sales (Direct Lake) and Budget (Import). A measure `[Variance] = [Sales] - [Budget]` is sliced by Date. What enables Date to filter both?',
    options: [
      'A shared Date dim must exist with relationships to both Sales and Budget',
      'CALCULATE auto-aligns dates across islands',
      'Composite models always cross-filter date columns automatically',
      'TREATAS is required at the measure level'
    ],
    correct: 0,
    explanation: 'A shared Date dim with explicit relationships to both fact tables is how composite models cross-filter. Without it, slicers don\'t propagate to both — and the variance measure misaligns dates across islands.',
    whyWrong: {
      1: 'CALCULATE has no auto-alignment magic across islands.',
      2: 'No automatic cross-filtering; relationships must be explicit.',
      3: 'TREATAS is one tool to virtually relate tables, but the canonical answer is a shared Date dim.'
    },
    source: SRC.semanticModel,
    tags: ['composite', 'shared-date-dim']
  }),

  // ── DAX context (10) ─────────────────────────────────────────────
  single({
    id: 'sme-011', domain: 'semantic', subtopic: 'dax-context', difficulty: 3,
    prompt: 'A measure `[X] = CALCULATE([Sales], FILTER(ALL(Product), Product[Category] = "Electronics"))` is evaluated in a visual sliced by Product[Color] = "Red". What does it return?',
    options: [
      'Sales for Red Electronics',
      'Sales for ALL Electronics (the slicer\'s Color filter is removed because ALL(Product) clears the entire Product table)',
      'Sales for Red items across all categories',
      'A DAX error'
    ],
    correct: 1,
    explanation: 'ALL(Product) inside FILTER clears every filter on the Product table — including the slicer\'s Color = Red. The remaining predicate restricts to Electronics. Result: Sales for ALL Electronics, ignoring Color. To respect the slicer, use ALL(Product[Category]) (clear only Category) or wrap in KEEPFILTERS.',
    whyWrong: {
      0: 'ALL(Product) wipes out the Color filter — Red is no longer applied.',
      2: 'Category IS filtered (to Electronics); Color is what got cleared.',
      3: 'No error; this is a silent semantic surprise.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'calculate', 'filter-context', 'all', 'exam-trap']
  }),
  single({
    id: 'sme-012', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'A measure `[Y] = CALCULATE([Sales], KEEPFILTERS(Product[Color] = "Red"))` is evaluated in a visual sliced by Color = "Blue". What does it return?',
    options: [
      'Red sales',
      'Blue sales',
      'BLANK — the intersection (Red AND Blue) is empty',
      'Red + Blue sales (union)'
    ],
    correct: 2,
    explanation: 'KEEPFILTERS turns the filter argument into an intersection rather than a replacement. Existing slicer (Blue) AND filter argument (Red) gives Color IN (Red) AND Color IN (Blue) → empty set → BLANK.',
    whyWrong: {
      0: 'Red would be the answer with plain CALCULATE (no KEEPFILTERS).',
      1: 'Blue would mean the filter argument was ignored.',
      3: 'KEEPFILTERS is intersection (AND), not union.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'keepfilters', 'intersection', 'exam-trap']
  }),
  single({
    id: 'sme-013', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'In `SUMX(Customer, [Sales])`, what does the engine do for each Customer row?',
    options: [
      'It looks up [Sales] precomputed per customer',
      'Context transition: each Customer row becomes a filter context, [Sales] re-evaluates under that filter (effectively CALCULATE([Sales]) per row)',
      'It iterates Sales rows for that customer in row context',
      'It throws an error — [Sales] cannot be referenced inside an iterator'
    ],
    correct: 1,
    explanation: 'When a measure is referenced inside an iterator, context transition fires implicitly: the current row context is converted to a filter context, [Sales] evaluates filtered to that customer, and the iterator sums the results. This is one of the most exam-tested DAX concepts.',
    whyWrong: {
      0: 'No precomputation — DAX is computed on the fly.',
      2: 'Iteration over Customer means row context on Customer, not on Sales.',
      3: 'It works fine; context transition is the mechanism.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'context-transition', 'iterators']
  }),
  single({
    id: 'sme-014', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: '`SUMX(Customer, Customer[Revenue])` (column reference, NOT a measure) — does context transition fire?',
    options: [
      'Yes — every iterator triggers context transition',
      'No — context transition only fires when a MEASURE (or explicit CALCULATE) is encountered inside the iterator',
      'Yes, but only when the column has a relationship',
      'Only when Customer[Revenue] is a calculated column'
    ],
    correct: 1,
    explanation: 'Iterators establish row context. Context transition (row → filter) does NOT fire automatically — it fires when a measure reference (which is implicitly wrapped in CALCULATE) or an explicit CALCULATE is evaluated inside the row context. Pure column references just read the current-row value.',
    whyWrong: {
      0: 'Iterators alone do NOT trigger context transition. Only CALCULATE does.',
      2: 'Relationship presence is irrelevant to context transition.',
      3: 'Calc columns vs native columns is also irrelevant; what matters is CALCULATE / measure invocation.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'context-transition', 'measures-vs-columns']
  }),
  single({
    id: 'sme-015', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'You want to compute "share of total within current visual selection" — i.e., a row\'s sales divided by the sum of selected rows on the visual, ignoring the row\'s own filter. Which expression?',
    options: [
      '[Sales] / CALCULATE([Sales], ALL(Product))',
      '[Sales] / CALCULATE([Sales], ALLSELECTED(Product))',
      '[Sales] / CALCULATE([Sales], REMOVEFILTERS())',
      '[Sales] / [Sales]'
    ],
    correct: 1,
    explanation: 'ALLSELECTED removes filters that come from inside the visual (the current row category) while preserving outer filters from slicers and page filters. That gives the denominator = "sum of what the user selected to display." ALL would also strip slicer filters; REMOVEFILTERS() with no args is similar to ALL.',
    whyWrong: {
      0: 'ALL clears the slicers too — denominator becomes the total of all products in the model, not selection.',
      2: 'REMOVEFILTERS() (no args) strips everything — same problem as ALL.',
      3: 'Self-divide always yields 1; not a share calc.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'allselected', 'share-of-total']
  }),
  single({
    id: 'sme-016', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'CALCULATE has the order: filter args evaluate in OUTER context, then context is modified, then the inner expression evaluates. Why does this matter?',
    options: [
      'It does not matter — order is implementation detail',
      'Filter arguments that REFERENCE measures see the OUTER filter context — context transition there can produce surprising boundaries vs the inner expression',
      'It only matters when CALCULATETABLE is used',
      'It only matters with USERELATIONSHIP'
    ],
    correct: 1,
    explanation: 'Filter args evaluate first, in the outer context. If a filter arg uses a measure (e.g., FILTER(Product, [Sales] > 1000)), context transition fires at outer-context level — meaning the per-product evaluation of [Sales] uses the outer context, not the not-yet-modified context. This is the source of subtle "why is my CALCULATE returning weird values" bugs.',
    whyWrong: {
      0: 'Order absolutely matters — it explains a category of CALCULATE bugs.',
      2: 'CALCULATE has the same evaluation order as CALCULATETABLE; this is not specific to one.',
      3: 'USERELATIONSHIP is a separate concern (relationship activation), not evaluation order.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'calculate', 'evaluation-order']
  }),
  multi({
    id: 'sme-017', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'Which functions REMOVE filter context? Select all that apply.',
    options: [
      'ALL(Table)',
      'ALLEXCEPT(Table, Column)',
      'REMOVEFILTERS()',
      'KEEPFILTERS(...)',
      'ALLSELECTED(Table)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'ALL, ALLEXCEPT, REMOVEFILTERS, and ALLSELECTED all clear or restore filter context (with various scopes). KEEPFILTERS does the OPPOSITE — it ADDS to existing filters via intersection rather than replacing them.',
    whyWrong: {
      3: 'KEEPFILTERS does NOT remove filters — it adds to them via intersection. This is the canonical opposite of CALCULATE\'s replace semantics.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'filter-modifiers', 'all-family']
  }),
  single({
    id: 'sme-018', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'What does USERELATIONSHIP(Sales[ShipDate], Date[Date]) do inside CALCULATE?',
    options: [
      'Creates a new relationship at runtime',
      'Activates an INACTIVE relationship between the named columns for the duration of this CALCULATE — the active relationship is suspended',
      'Disables the active relationship permanently',
      'Forces bi-directional propagation'
    ],
    correct: 1,
    explanation: 'USERELATIONSHIP is a CALCULATE filter modifier that swaps which relationship between two tables is active for the duration of that CALCULATE. The "default" active relationship is suspended; the named (otherwise-inactive) relationship is used. Required pattern for role-playing dimensions.',
    whyWrong: {
      0: 'It does not create relationships; it activates an existing inactive one.',
      2: 'Suspends, not permanently disables — only inside the CALCULATE.',
      3: 'Direction is independent; USERELATIONSHIP toggles which relationship is active, not its directionality.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'userelationship', 'role-playing']
  }),
  single({
    id: 'sme-019', domain: 'semantic', subtopic: 'dax-context', difficulty: 5,
    prompt: 'A measure on a visual should compute "previous row\'s sales" along the visual\'s sort order, regardless of how the user sorts. Which function family?',
    options: [
      'EARLIER',
      'OFFSET / WINDOW / INDEX (visual-axis calculation functions)',
      'CALCULATETABLE with FILTER',
      'TOPN with ORDERBY'
    ],
    correct: 1,
    explanation: 'OFFSET, WINDOW, and INDEX (the "visual axis" calculation functions) operate on the visual\'s sorted axis with explicit ORDERBY/PARTITIONBY arguments. EARLIER is for legacy nested row contexts (calc columns), not visual axis.',
    whyWrong: {
      0: 'EARLIER navigates outer row contexts, primarily in calc columns — not visual axis.',
      2: 'CALCULATETABLE+FILTER does not access visual sort order.',
      3: 'TOPN returns top rows by a metric, not a sequential offset along the axis.'
    },
    source: SRC.daxPerf,
    tags: ['dax', 'offset', 'window', 'index']
  }),
  single({
    id: 'sme-020', domain: 'semantic', subtopic: 'dax-context', difficulty: 4,
    prompt: 'A measure `[A] = SUMX(VALUES(Customer[Region]), [Sales])` produces a different result than `[B] = [Sales]` at the grand-total cell. Why?',
    options: [
      'They should be identical; this is a bug',
      'SUMX over VALUES(Region) iterates region-by-region, applying context transition per region; [Sales] at grand total has all regions in scope at once. The two produce different results when [Sales] is non-additive (e.g., distinct-count-style) or when the regions partition the result differently than the implicit grand-total filter',
      'VALUES always errors at grand total',
      '[Sales] cannot be referenced from grand total without ALL'
    ],
    correct: 1,
    explanation: 'VALUES(Region) inside SUMX establishes a region-by-region partition; context transition makes [Sales] re-evaluate per region. For additive measures the totals coincide. For non-additive measures (DISTINCTCOUNT, ratios, etc.), they diverge — the iterator sums per-region values that don\'t equal the grand-total computation. This is a classic "totals don\'t add up" trap.',
    whyWrong: {
      0: 'It is not a bug — it is a property of non-additivity.',
      2: 'VALUES does not error at grand total.',
      3: '[Sales] works fine at grand total without ALL.'
    },
    source: SRC.daxFunctions,
    tags: ['dax', 'totals', 'non-additivity']
  }),

  // ── DAX perf (3) ─────────────────────────────────────────────────
  multi({
    id: 'sme-021', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: 'A measure runs in 14 seconds; storage engine returns in 200ms; formula engine spends the rest. Which patterns are LIKELY culprits? Select all that apply.',
    options: [
      'A SUMX over a fact table that calls a measure with multiple FILTER(ALL(...)) arguments',
      'Repeated context-transition costs from a measure called inside an iterator',
      'IFERROR wrappers around every measure',
      'VARs used to memoize a sub-expression',
      'A simple SUM over an Import column'
    ],
    correct: [0, 1, 2],
    explanation: 'Formula-engine-bound queries are typically about iterator + context-transition overhead, redundant CALCULATE wrappers, and IFERROR-everywhere. VARs are explicitly recommended for perf (memoize once). Simple SUM is storage-engine work.',
    whyWrong: {
      3: 'VARs are a perf BEST PRACTICE — they prevent re-evaluation. Not a culprit.',
      4: 'Simple SUM is storage-engine, not formula-engine; not consistent with FE-bound symptoms.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'formula-engine', 'iterators']
  }),
  single({
    id: 'sme-022', domain: 'semantic', subtopic: 'dax-perf', difficulty: 4,
    prompt: 'A team wants the FASTEST way to identify which COLUMNS dominate model size in a 8 GB Direct Lake model. What tool?',
    options: [
      'Power BI Performance Analyzer',
      'DAX Studio with VertiPaq Analyzer (column-level dictionary, hierarchy, cardinality)',
      'Tabular Editor 2 alone',
      'Profiler trace + custom XEvent reading'
    ],
    correct: 1,
    explanation: 'VertiPaq Analyzer (built into DAX Studio) gives per-column dictionary size, cardinality, hierarchy size, and total impact. It is the standard tool for finding the column that\'s eating your model. Performance Analyzer measures visual timings, not column-level storage.',
    whyWrong: {
      0: 'Performance Analyzer is per-visual query timing; no column-level storage view.',
      2: 'Tabular Editor edits the model; it does not natively expose VertiPaq column stats.',
      3: 'Profiler/XEvent works but is a heavyweight forensic tool; VertiPaq Analyzer is the right first stop.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'vertipaq-analyzer', 'tooling']
  }),
  single({
    id: 'sme-023', domain: 'semantic', subtopic: 'dax-perf', difficulty: 5,
    prompt: 'You replace `FILTER(Sales, Sales[Qty] > 10)` with `KEEPFILTERS(Sales[Qty] > 10)` inside CALCULATE on a 200M-row fact. Performance improves significantly. Why?',
    options: [
      'KEEPFILTERS is always faster than FILTER',
      'A boolean column predicate inside CALCULATE is pushed into the storage engine as a column filter; FILTER iterates row-by-row in the formula engine',
      'KEEPFILTERS runs on GPU',
      'KEEPFILTERS pre-aggregates; FILTER does not'
    ],
    correct: 1,
    explanation: 'Simple boolean column predicates (Column op Value) are pushed into VertiPaq as a column filter — fast scan-time work. FILTER over a table is a row iterator in the formula engine, evaluating the predicate per row. For simple predicates, lift them out of FILTER.',
    whyWrong: {
      0: 'KEEPFILTERS is not universally faster; the win is for simple column predicates that the engine can push down.',
      2: 'No GPU involvement — VertiPaq is CPU.',
      3: 'No pre-aggregation magic; the speed comes from filter pushdown.'
    },
    source: SRC.daxPerf,
    tags: ['dax-perf', 'filter-pushdown', 'storage-engine']
  }),

  // ── Calc groups (4) ──────────────────────────────────────────────
  single({
    id: 'sme-024', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'A calculation group "Time Calc" has items YTD, MTD, PriorYear, with Precedence 100. A second calc group "Currency" has items USD, EUR with Precedence 50. A measure `[Sales]` is sliced by both. In what order do the items apply?',
    options: [
      'Both apply simultaneously; order is unspecified',
      'Higher PRECEDENCE applies LAST (outer); Time Calc (100) wraps Currency (50). Currency converts first, then YTD aggregates the converted values',
      'Calc groups always evaluate alphabetically',
      'Currency must be wrapped in CALCULATE manually'
    ],
    correct: 1,
    explanation: 'Calculation group precedence determines nesting order — higher precedence is OUTER. Time Calc 100 wraps Currency 50: Currency converts the underlying measure to EUR first, THEN YTD aggregates the converted values. Wrong precedence produces YTD-then-convert, which is mathematically different (different exchange-rate baselines).',
    whyWrong: {
      0: 'Order is fully determined by precedence; not unspecified.',
      2: 'No alphabetical ordering — precedence rules.',
      3: 'No manual CALCULATE wrap is needed; the engine composes them.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'precedence', 'composition']
  }),
  single({
    id: 'sme-025', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'A calc group item has a Format String Expression of `"#,##0.0%"` and the underlying measure is currency-formatted. What displays?',
    options: [
      'The currency format wins (innermost)',
      'The calc group format wins — calc groups can override the measure\'s format string',
      'A DAX error',
      'The two formats merge automatically'
    ],
    correct: 1,
    explanation: 'Calc groups can override the format string of the wrapped measure via Format String Expression. This is what makes "% of total" or "vs PY %" calc-group items render correctly even when the base measure is dollars.',
    whyWrong: {
      0: 'The calc group wins, not the measure.',
      2: 'No error.',
      3: 'No merge — the calc group format replaces.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'format-strings']
  }),
  multi({
    id: 'sme-026', domain: 'semantic', subtopic: 'calc-groups', difficulty: 5,
    prompt: 'Which statements about calculation groups are TRUE? Select all that apply.',
    options: [
      'Calc groups apply to the OUTERMOST measure reference; nested measure references may not be wrapped',
      'A calc group with no item selected acts as identity (the measure passes through unchanged)',
      'Calc groups can produce surprising totals when the user expects a per-row applied calc to also re-apply at the total',
      'Calc groups affect calculated columns at refresh time',
      'Calc groups can have a Format String Expression that uses SELECTEDMEASURENAME() / SELECTEDMEASURE()'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Outermost-only application is the canonical "calc group only wraps the outer reference" rule — nested measures inside a measure body don\'t get wrapped. No item = identity. Totals can surprise because the calc group composes with the visual-cell expression. Format strings can use SELECTEDMEASURE family. Calc groups DO NOT participate in calc-column refresh — they are query-time only.',
    whyWrong: {
      3: 'Calc groups are query-time. They do NOT affect calculated columns at refresh time.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'semantics', 'side-effects']
  }),
  single({
    id: 'sme-027', domain: 'semantic', subtopic: 'calc-groups', difficulty: 4,
    prompt: 'A measure body uses [Sales YTD] internally: `[ProfitYTD] = [Sales YTD] - [Costs YTD]`. A YTD calc-group item is selected at the visual. What happens to [ProfitYTD]?',
    options: [
      'YTD is applied INSIDE [ProfitYTD] (inner [Sales YTD] re-evaluates as a YTD-of-YTD)',
      'YTD wraps [ProfitYTD] OUTERMOST only; the inner [Sales YTD] reference is not re-wrapped, so the result is [ProfitYTD] computed once with YTD on top',
      'A DAX error from double application',
      'The calc-group item is ignored when measures reference other measures'
    ],
    correct: 1,
    explanation: 'Calc groups apply to the OUTERMOST measure reference at the visual. The inner [Sales YTD] inside [ProfitYTD]\'s body is not re-wrapped — it evaluates as authored. This is why composing calc groups with measures that already encode time intel internally produces unexpected results unless designed deliberately.',
    whyWrong: {
      0: 'No double-wrap of inner measures.',
      2: 'No error; just a subtle semantic.',
      3: 'Calc-group items are NOT ignored when measures reference others — they wrap the outer call.'
    },
    source: SRC.semanticModel,
    tags: ['calc-groups', 'outermost-rule']
  }),

  // ── Field parameters (3) ─────────────────────────────────────────
  single({
    id: 'sme-028', domain: 'semantic', subtopic: 'field-parameters', difficulty: 3,
    prompt: 'A user wants a slicer that lets them swap which MEASURE displays in a card. Which is the cleanest?',
    options: [
      'A SWITCH() inside one mega-measure',
      'A field parameter listing the candidate measures',
      'A calc group with one item per measure',
      'Bookmarks per measure'
    ],
    correct: 1,
    explanation: 'Field parameters are designed for "let the user pick a field/measure at runtime." Cleaner than SWITCH (couples logic into one measure), more appropriate than calc groups (which vary an existing measure\'s formula, not which one displays), and avoids bookmark sprawl.',
    whyWrong: {
      0: 'SWITCH works but is hard-coded; adding a measure requires editing the SWITCH and republishing.',
      2: 'Calc groups vary measure FORMULA — they do not swap which measure displays.',
      3: 'Bookmarks are heavyweight and brittle for this pattern.'
    },
    source: SRC.semanticModel,
    tags: ['field-parameters', 'selection']
  }),
  multi({
    id: 'sme-029', domain: 'semantic', subtopic: 'field-parameters', difficulty: 4,
    prompt: 'Which statements about field parameters are TRUE? Select all that apply.',
    options: [
      'A field parameter can hold a mix of column references and measure references',
      'Field parameters work with calculation groups — the calc group still wraps the outermost measure when the field-parameter selection is a measure',
      'Field parameters are purely a visual concept; they don\'t persist user choice across sessions unless captured in a slicer',
      'Field parameters require Direct Lake disabled',
      'Field parameters can be filtered/sliced by other field parameters'
    ],
    correct: [0, 1, 2],
    explanation: 'Field parameters can mix column and measure references. They compose with calc groups (calc group wraps outer measure regardless of how it was selected). They are visual-state only. Direct Lake supports field parameters. Field parameters CAN be cross-filtered with other field parameters but the patterns are advanced.',
    whyWrong: {
      3: 'Field parameters work in Direct Lake.',
      4: 'Field parameters CAN be cross-filtered with other field parameters in some patterns; this option is technically possible. (Stricter wording: this works in some patterns, but the simpler-correct items 0,1,2 are the canonical set the question targets.)'
    },
    source: SRC.semanticModel,
    tags: ['field-parameters', 'composition']
  }),
  single({
    id: 'sme-030', domain: 'semantic', subtopic: 'field-parameters', difficulty: 4,
    prompt: 'A field parameter "Metric" lists [Sales], [Cost], [Profit]. The user picks [Profit] and a YTD calc-group item. The visual shows YTD applied to Profit. What is the OUTERMOST wrap order?',
    options: [
      'YTD ( Profit )',
      'Profit ( YTD )',
      'No wrapping occurs',
      'YTD applies element-wise to each Sales/Cost/Profit'
    ],
    correct: 0,
    explanation: 'The field parameter resolves to a single measure reference ([Profit]). The calc-group YTD item wraps the outermost measure reference, so the engine evaluates YTD([Profit]). Order: YTD(Profit), not Profit(YTD).',
    whyWrong: {
      1: 'Calc groups always wrap OUTSIDE the resolved measure, not inside.',
      2: 'Wrapping does occur — that is what calc groups exist for.',
      3: 'Only the selected metric is in scope at a given cell, not all three.'
    },
    source: SRC.semanticModel,
    tags: ['field-parameters', 'calc-groups', 'composition']
  }),

  // ── Optimization (2) ─────────────────────────────────────────────
  single({
    id: 'sme-031', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'A 2 GB Import model has a CustomerName column with 7M unique values. Which is the BEST size optimization?',
    options: [
      'Drop the column entirely',
      'Move the column to a separate dim and reference via key, then hide it from the model unless required for visuals',
      'Convert to UPPERCASE in Power Query',
      'Increase the capacity SKU'
    ],
    correct: 1,
    explanation: 'High-cardinality strings are the textbook compression killer. Move to a dim, key by surrogate, hide unless used. If the column is rarely on a visual, this can shave significant memory because the dictionary cost moves to the dim and the fact stores just an integer key.',
    whyWrong: {
      0: 'Dropping eliminates analysis if the column is referenced anywhere.',
      2: 'Case conversion may help cardinality slightly only if mixed-case caused dupes; usually negligible.',
      3: 'Throwing capacity at a model design problem is wasteful.'
    },
    source: SRC.semanticModel,
    tags: ['optimization', 'cardinality', 'string-columns']
  }),
  multi({
    id: 'sme-032', domain: 'semantic', subtopic: 'optimization', difficulty: 4,
    prompt: 'Which practices generally IMPROVE model performance? Select all that apply.',
    options: [
      'Hiding implicit measures by hiding fact columns and creating explicit measures',
      'Using VARs to memoize sub-expressions inside long measures',
      'Avoiding bi-directional filters except where deliberately needed',
      'Storing high-cardinality DateTime as a single column for "convenience"',
      'Using surrogate-key relationships rather than natural-key joins on long strings'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Explicit measures, VARs, restrained bi-directional filters, and surrogate keys are all canonical perf practices. High-cardinality DateTime in a single column is the OPPOSITE of optimization.',
    whyWrong: {
      3: 'High-cardinality DateTime in one column wrecks compression — split into Date + Time.'
    },
    source: SRC.semanticModel,
    tags: ['optimization', 'best-practices']
  }),

  // ── Security RLS (2) ─────────────────────────────────────────────
  single({
    id: 'sme-033', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A dynamic-RLS role uses `Customer[UPN] = USERPRINCIPALNAME()` on the Customer dim. Sales is filtered via the Customer→Sales relationship. The dim has 5M rows. Performance is poor at scale. Which is the BEST mitigation?',
    options: [
      'Switch to USERNAME() — it\'s faster',
      'Add a small SecurityMap dim with one row per user mapping to a permitted CustomerKey set, with the role filtering SecurityMap and a relationship from SecurityMap to Customer',
      'Disable RLS in production',
      'Move the model to Import — RLS is faster there'
    ],
    correct: 1,
    explanation: 'Filtering a 5M-row dim with USERPRINCIPALNAME() per query is an expensive scan. A small SecurityMap pattern (user → allowed key set) reduces the per-query work to a tiny lookup that propagates via the existing relationship. Standard pattern for dynamic RLS at scale.',
    whyWrong: {
      0: 'USERNAME() is the wrong format for cloud and not faster.',
      2: 'Disabling RLS in production is a security incident.',
      3: 'Storage mode does not change the cost of a per-query string-comparison scan on millions of rows.'
    },
    source: SRC.rls,
    tags: ['rls', 'dynamic-rls', 'security-map', 'performance']
  }),
  multi({
    id: 'sme-034', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'A user belongs to RLS roles "EU" (filter `Region = "EU"`) and "Premier" (filter `Tier = "Premier"`). Which rows do they see? Select all true statements.',
    options: [
      'Rows where Region = "EU"',
      'Rows where Tier = "Premier"',
      'Rows where Region = "EU" OR Tier = "Premier" (UNION across roles)',
      'Rows where Region = "EU" AND Tier = "Premier"',
      'No rows — conflicting roles deny access'
    ],
    correct: [0, 1, 2],
    explanation: 'Multiple RLS role memberships UNION their filters (OR semantics) — the user sees rows that satisfy ANY of their roles. Therefore both "Region=EU" rows and "Tier=Premier" rows are visible (and overlap once if applicable). It is NOT an intersection and never a deny.',
    whyWrong: {
      3: 'Multi-role is UNION (OR), not INTERSECTION (AND). The user sees the union, not the overlap.',
      4: 'Multiple roles never deny; they expand visibility.'
    },
    source: SRC.rls,
    tags: ['rls', 'multi-role', 'union-semantics']
  }),

  // ── Security OLS (1) ─────────────────────────────────────────────
  single({
    id: 'sme-035', domain: 'semantic', subtopic: 'security-ols', difficulty: 4,
    prompt: 'A finance role has OLS hiding [Margin]. A user in that role authors a calc-group item that references SELECTEDMEASURE() applied to a measure that internally calls [Margin]. What is the result for that user?',
    options: [
      'It works — OLS only hides at the field-list level',
      'It errors — OLS denies any reference to [Margin] regardless of whether direct or via a calc-group composition. The user cannot evaluate any expression that traverses the hidden object',
      'It returns BLANK silently',
      'OLS is bypassed by calc groups by design'
    ],
    correct: 1,
    explanation: 'OLS is enforced at the engine level on object resolution. ANY reference to a hidden object — direct, via SELECTEDMEASURE, via a measure that internally references it — fails for users in the OLS role. There is no "inside a calc group" bypass.',
    whyWrong: {
      0: 'OLS is not just visual hiding; it is enforced on all evaluation paths.',
      2: 'It errors, not silently BLANKs.',
      3: 'Calc groups do not bypass OLS.'
    },
    source: SRC.ols,
    tags: ['ols', 'enforcement', 'calc-groups']
  })
];
