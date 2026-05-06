// 15 KQL "trap" flashcards — confidently-wrong patterns that fail in production.
// Each card teaches WHY the trap exists, not just the rule. Deck slug 'kql'.

import type { Flashcard } from '../../lib/schema';

export const kqlTraps: Flashcard[] = [
  { id: 'fc-kqt-001', deck: 'kql', difficulty: 5,
    front: 'TRAP: You use `join` without specifying a `kind`. You expect all left-side rows to appear in the result. Several are silently missing.',
    back: 'The DEFAULT join kind in KQL is `kind=innerunique`, NOT `kind=inner`. `innerunique` deduplicates the LEFT table before joining — only the first matching row per key survives. If multiple left rows share a join key, all but the first are dropped without any error or warning. Use `kind=inner` to retain all left rows (with cross-product on match), `kind=leftouter` to keep unmatched left rows, or `kind=leftanti` to return only left rows with NO right match.',
    tags: ['kql', 'trap', 'join', 'innerunique', 'dedup'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'join kind=innerunique is the silent-dedup default' } },

  { id: 'fc-kqt-002', deck: 'kql', difficulty: 4,
    front: 'TRAP: You use `mv-expand` on a column of arrays and add a filter inside the same pipe stage. The filter runs on exploded rows but you actually needed it to apply per-source-row before expansion.',
    back: '`mv-expand` explodes each array element into its own row, then pipeline operators downstream see individual elements — not the original array context. If your filter logic depends on aggregate context of the whole array (e.g. "rows where ANY element matches X"), you need `mv-apply` instead. `mv-apply` applies a subquery to each row\'s array IN SCOPE, so you can filter, summarize, or top-N within the array and return one output row per source row. Use `mv-expand` when you want a flat exploded table; use `mv-apply` when you want to run subquery logic per-row against the array.',
    tags: ['kql', 'trap', 'mv-expand', 'mv-apply', 'arrays'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'mv-apply vs mv-expand: subquery vs explode' } },

  { id: 'fc-kqt-003', deck: 'kql', difficulty: 4,
    front: 'TRAP: You use `parse` on a log column where some rows have a slightly different format. You notice those rows vanish from the output.',
    back: '`parse` is STRICT by default: rows whose value does NOT match the pattern are DROPPED from the result. This is by design — parse is not a regex extractor, it is a typed projector. To keep non-matching rows (with null in extracted columns), use `parse-where` (returns only matching rows but without dropping — actually equivalent to `parse` + `where`), or use `parse kind=relaxed` to keep all rows and emit null for failed extractions. `extract()` is the single-value regex extractor that always returns null on no match and never drops rows. Know which strictness you need before choosing.',
    tags: ['kql', 'trap', 'parse', 'parse-where', 'extract', 'row-dropping'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'parse strict mode drops non-matching rows' } },

  { id: 'fc-kqt-004', deck: 'kql', difficulty: 4,
    front: 'TRAP: A `summarize` query on a high-cardinality column (millions of distinct keys) is extremely slow. You add more CPU but it does not help.',
    back: '`summarize` by default uses a hash-partition strategy that puts all data through a single aggregation coordinator. On high-cardinality keys the coordinator becomes a bottleneck regardless of CPU. The fix is `summarize hint.shufflekey=<column>` which distributes the aggregation work across cluster nodes by hash of the key — each node handles its own partition of the key space. The hint is a performance directive, not a semantic change; results are identical. Use it whenever the group-by column has >1M distinct values or query profiling shows aggregation as the hot path.',
    tags: ['kql', 'trap', 'summarize', 'hint-shufflekey', 'performance', 'high-cardinality'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'hint.shufflekey distributes high-cardinality aggregation' } },

  { id: 'fc-kqt-005', deck: 'kql', difficulty: 4,
    front: 'TRAP: You reference the same expensive subquery twice in a query (two `let` bindings calling the same long scan). The cluster scans the source table twice.',
    back: 'KQL `let` with a tabular expression is LAZY — each reference re-executes the full subquery. If you reference the same tabular let twice, the underlying scan runs twice. The fix is `materialize(<tabular-expr>)` which evaluates the expression ONCE and caches the result in memory for the query lifetime. Only use `materialize` when: (1) the subquery is referenced 2+ times, AND (2) the subquery result fits in cluster memory. Materializing a 10B-row intermediate table wastes memory and can crash the query. Profile first.',
    tags: ['kql', 'trap', 'materialize', 'let', 'performance', 'caching'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'materialize() caches tabular let for reuse' } },

  { id: 'fc-kqt-006', deck: 'kql', difficulty: 3,
    front: 'TRAP: You use `join` with a small dimension table on the right side. The query is slow because Kusto ships the large left table to the right table\'s nodes.',
    back: '`join` by default uses a hash-broadcast strategy but only when Kusto\'s optimizer detects the right side is small enough — it does NOT always auto-broadcast. For a guaranteed broadcast of a small right table, use `lookup` instead of `join`. `lookup` is semantically a `kind=leftouter` join but adds an explicit broadcast hint for the right (lookup) table: it ships the right table to all left-side nodes, avoiding a full shuffle. Use `lookup` when: right table is small (<~100MB), you only need left-outer semantics, and you want predictable broadcast behavior. For symmetric joins or inner cross-product semantics, `join kind=inner hint.strategy=broadcast` is the equivalent.',
    tags: ['kql', 'trap', 'lookup', 'join', 'broadcast', 'performance'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'lookup forces broadcast for small right-side tables' } },

  { id: 'fc-kqt-007', deck: 'kql', difficulty: 3,
    front: 'TRAP: You use `project` to reorder columns and accidentally lose columns you did not list. You use `project-away` expecting the result to have a stable column order.',
    back: '`project` REPLACES the column set — only the columns you list survive, in the order listed. Any unlisted column is dropped. `project-away` REMOVES only the named columns and preserves all others, but the OUTPUT ORDER is NOT guaranteed — Kusto may reorder remaining columns. `project-keep` preserves column order of the named columns while passing through others, but named columns move to the front. Know the contract: use `project` when you need exact column selection and order; use `project-away` when you want "everything except X" and don\'t care about downstream column order.',
    tags: ['kql', 'trap', 'project', 'project-away', 'project-keep', 'column-order'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'project drops; project-away keeps; order guarantees differ' } },

  { id: 'fc-kqt-008', deck: 'kql', difficulty: 4,
    front: 'TRAP: You filter a string column with `contains` expecting case-insensitive substring match, and it is slow on large tables. You switch to `==` expecting an exact match but it becomes case-sensitive.',
    back: 'KQL string operators have a SPEED CONTRACT: `has` > `contains` > `==` for full-text scenarios, but they differ in semantics. `has` matches on whole word boundaries (token-based, uses term index — fastest). `contains` is substring search with NO index use — it forces a full column scan. `==` is exact case-SENSITIVE equality (also fast via hash index). `=~` is case-insensitive equality (slower than `==`). `in` is case-sensitive multi-value membership. `in~` is case-insensitive. For exam questions: `has` is the performant token match; `contains` looks right but is slow; `==` is fast but case-sensitive.',
    tags: ['kql', 'trap', 'has', 'contains', 'string-operators', 'performance', 'case-sensitivity'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'has uses term index; contains forces full scan' } },

  { id: 'fc-kqt-009', deck: 'kql', difficulty: 3,
    front: 'TRAP: You bucket timestamps with `floor(timestamp / 1h) * 1h` instead of `bin(timestamp, 1h)`. The math is equivalent but one is idiomatic and one breaks on timespan arithmetic.',
    back: '`bin(timestamp, 1h)` is the idiomatic KQL time-bucketing function. It rounds datetime DOWN to the nearest multiple of the bin width and returns a datetime. `floor(x/1h)*1h` performs the same arithmetic but requires explicit timespan division/multiplication — fragile against type coercion and harder to read. More importantly, `bin()` integrates with `make-series` and `summarize` operators that expect a bin-aligned datetime column. Downstream series operators (`series_decompose_anomalies`, `series_fill_linear`) depend on `bin()`-aligned output. Always use `bin()` for time bucketing in KQL.',
    tags: ['kql', 'trap', 'bin', 'floor', 'time-bucketing', 'datetime'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'bin() is idiomatic; floor/div math is fragile' } },

  { id: 'fc-kqt-010', deck: 'kql', difficulty: 4,
    front: 'TRAP: You use `summarize count() by bin(timestamp, 1h)` and notice some hours have no row in the output. A chart downstream shows gaps instead of zeros.',
    back: '`summarize` only emits rows for bins that EXIST IN THE DATA. Hours with zero events produce no row — there is no implicit gap-filling. This is the key difference from `make-series`: `make-series` fills missing bins with a default value (0 for count, null for avg) across the specified time range. If you need a continuous time series with zero-filled gaps (required for series operators like `series_decompose_anomalies`), use `make-series count() default=0 on timestamp from T1 to T2 step 1h`. Use `summarize by bin()` when gaps are acceptable; use `make-series` when gaps must be filled.',
    tags: ['kql', 'trap', 'summarize', 'bin', 'make-series', 'gap-filling', 'time-series'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'summarize by bin drops empty bins; make-series fills them' } },

  { id: 'fc-kqt-011', deck: 'kql', difficulty: 4,
    front: 'TRAP: You define a tabular `let` and reference it three times in one query. You assume KQL caches the result automatically.',
    back: 'A tabular `let` is a LAZY expression alias — every reference triggers a fresh evaluation. Referencing it three times executes the underlying scan three times. This is by design: KQL\'s execution model is functional, not imperative. To force single evaluation and share the result, wrap the let body in `materialize()`. The distinction from scalar let is important: scalar lets (e.g. `let threshold = 0.95`) are evaluated once and inlined. Only tabular lets need explicit `materialize()` for reuse. On the exam, if you see a tabular let referenced 2+ times in an answer option, "materialize for efficiency" is likely correct.',
    tags: ['kql', 'trap', 'let', 'materialize', 'tabular', 'scalar', 'lazy-evaluation'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'tabular let is lazy; wrap in materialize() to cache' } },

  { id: 'fc-kqt-012', deck: 'kql', difficulty: 4,
    front: 'TRAP: You need to pivot a narrow table to wide format. You write a manual `summarize + extend` chain. The query works but is 40 lines long.',
    back: 'KQL has plugin functions via `evaluate` that solve common reshaping tasks idiomatically. `evaluate pivot(pivotColumn, aggregateExpr, groupByColumns)` pivots rows to columns — exact equivalent of SQL PIVOT. `evaluate bag_unpack(column)` expands a dynamic (JSON bag) column into typed first-class columns — far cleaner than repeated `column.field` access. `evaluate narrow(col1, col2, ...)` converts wide to narrow (unpivot). These are NOT built-in operators — they require `evaluate`. Exam trap: candidates forget `evaluate` prefix and write the plugin name as if it were an operator.',
    tags: ['kql', 'trap', 'evaluate', 'pivot', 'bag-unpack', 'narrow', 'plugins'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'evaluate pivot/bag_unpack/narrow for reshaping' } },

  { id: 'fc-kqt-013', deck: 'kql', difficulty: 3,
    front: 'TRAP: You sort a column that contains nulls and assume nulls appear at the end with `sort by col asc`.',
    back: 'KQL `sort by` default null handling is `nulls last` for ASCENDING and `nulls first` for DESCENDING — the OPPOSITE of what many SQL developers expect. In SQL, nulls typically sort as the highest value (last in ASC, first in DESC). In KQL, nulls are treated as the "smallest" value: they appear LAST in ASC (correct intuition) but FIRST in DESC (counterintuitive). To be explicit and portable, always write `sort by col asc nulls last` or `sort by col desc nulls last`. On the exam, questions about null sort position are designed to catch candidates who assume SQL behavior.',
    tags: ['kql', 'trap', 'sort', 'nulls', 'ordering', 'null-handling'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'KQL nulls last=ASC, nulls first=DESC — opposite of SQL intuition' } },

  { id: 'fc-kqt-014', deck: 'kql', difficulty: 3,
    front: 'TRAP: You use `union T1, T2` to combine two tables and need to trace which row came from which source. After the union you cannot tell the tables apart.',
    back: '`union T1, T2` without `withsource=` adds NO provenance column — rows from both tables are indistinguishable unless a distinguishing column happens to exist in both tables. Use `union withsource=SourceTable T1, T2` to automatically add a string column named `SourceTable` (or whatever alias you choose) containing the originating table name for each row. This is especially critical when T1 and T2 have identical schemas (e.g. sharded logs). Exam trap: answer options that union tables and then filter by a source field require `withsource=` to be present — if it is missing, the filter on that field fails silently or throws an error.',
    tags: ['kql', 'trap', 'union', 'withsource', 'provenance', 'multi-table'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'union withsource= adds provenance column; omitting it loses source identity' } },

  { id: 'fc-kqt-015', deck: 'kql', difficulty: 5,
    front: 'TRAP: You use `summarize count() by bin(timestamp, 1h)` as input to `series_decompose_anomalies()`. The function throws an error or returns empty.',
    back: '`series_decompose_anomalies()` (and all KQL series operators: `series_outliers`, `series_fill_linear`, `series_decompose`, `series_fit_line`) REQUIRE input from `make-series`, NOT from `summarize`. The reason: series operators expect a column of type `dynamic` containing an array of values and a parallel array of timestamps — exactly what `make-series` produces. `summarize by bin()` produces a flat row-per-bin table with scalar values, which is the wrong shape. Additionally, `make-series` gap-fills missing bins (outputting a uniform-length array), which series operators depend on for index-aligned math. The fix: replace `summarize count()...by bin(...)` with `make-series count() default=0 on timestamp...step 1h` then pipe into the series operator.',
    tags: ['kql', 'trap', 'make-series', 'summarize', 'series-operators', 'anomaly-detection', 'time-series'],
    sourceAnchor: { category: 'kql-cheatsheet', note: 'series operators require make-series dynamic array output, not summarize flat rows' } },
];
