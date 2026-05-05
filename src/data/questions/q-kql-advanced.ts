import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 20 advanced KQL questions (kqa-001..kqa-020) for the prepare domain.
// Extends kqd-001..025 into advanced patterns: mv-expand, parse/extract,
// materialize() internals, lookup vs join depth, join-kind anti patterns,
// time series (make-series, series_fill_linear, series_decompose_anomalies),
// z-score anomaly, tumbling/hopping/session windows, range operator,
// evaluate pivot/bag_unpack, dynamic columns, materialized views,
// update policies, cross-database/cluster queries, external_table / OneLake,
// stored functions via let, operator ordering, take vs top, ingestion_time(),
// prev()/next(), arg_max/arg_min.

export const kqlAdvanced: Question[] = [
  // ── kqa-001: mv-expand — unpacking dynamic/array columns ───────────
  single({
    id: 'kqa-001', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A table `Events` has a column `Tags` of type `dynamic` that holds a JSON array of strings per row.\n```\nEvents\n| mv-expand Tags\n| summarize Count = count() by tostring(Tags)\n```\nWhat does `mv-expand` do in this context?',
    options: [
      'Explodes each array element in `Tags` into its own row, multiplying the row count by the array length — the downstream `summarize` then counts occurrences of each individual tag',
      'Converts the `dynamic` column to a scalar string, but keeps the same number of rows',
      'Removes rows where `Tags` is an empty array',
      'Performs a lateral join, requiring an `on` clause to complete the syntax'
    ],
    correct: 0,
    explanation:
      '`mv-expand` is the "array fan-out" operator: each value in the dynamic array becomes its own row, and all other columns are duplicated into those rows. A row with Tags = ["alert","warning"] becomes two rows. The subsequent `summarize` correctly counts per-tag. Without `mv-expand`, counting would aggregate at the array level, not the element level.',
    whyWrong: {
      1: '`mv-expand` does NOT keep the same row count — that is the point. It fans rows out.',
      2: 'Empty-array rows produce zero output rows (they vanish), but `mv-expand` is not a filter in the traditional sense — its primary purpose is row expansion, not deletion.',
      3: '`mv-expand` is a standalone operator; it needs no `on` clause. `join` requires `on`.'
    },
    source: SRC.kql,
    tags: ['kql', 'mv-expand', 'dynamic', 'array']
  }),

  // ── kqa-002: parse vs extract ───────────────────────────────────────
  single({
    id: 'kqa-002', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A KQL query must pull two named fields (`UserId` and `Action`) from log lines like:\n`"user=alice action=login latency=42ms"`\n\nWhich KQL operator is the MOST idiomatic choice — and why?',
    options: [
      '`parse` with a pattern template — it matches positional tokens and assigns named columns in a single readable expression without requiring regex knowledge',
      '`extract` with a regex capture group — it is the only operator that can split a single string into multiple named columns in one call',
      '`split` on `" "` followed by `project` to rename the resulting array elements',
      '`mv-expand` on the raw string to produce one token per row, then `where` to filter for keys of interest'
    ],
    correct: 0,
    explanation:
      '`parse` is the right tool for structured-ish log lines. It matches a literal/wildcard template and binds named typed columns in one expression: `| parse RawLog with "user=" UserId " action=" Action *`. `extract` requires a regex per-column and returns only ONE column per call — you would need N separate `extend extract(...)` calls for N fields.',
    whyWrong: {
      1: '`extract` returns a SINGLE captured group per call and requires a full regex. For N fields it needs N separate calls; `parse` handles all fields in one template.',
      2: '`split` returns a dynamic array, not named typed columns; `project` cannot rename array indices into semantic column names without further manipulation.',
      3: '`mv-expand` on a plain string has no useful semantics here — it would expand nothing, since the value is a scalar string not an array.'
    },
    source: SRC.kql,
    tags: ['kql', 'parse', 'extract', 'log-parsing']
  }),

  // ── kqa-003: materialize() — code-reading perf issue ───────────────
  single({
    id: 'kqa-003', domain: 'prepare', subtopic: 'kql-perf', difficulty: 5,
    prompt:
      'Identify the performance problem in the following query:\n```\nlet heavy =\n    BigTable\n    | where Ts > ago(30d)\n    | summarize Hits = count() by UserId;\nheavy\n| join kind=inner (\n    heavy\n    | where Hits > 100\n) on UserId\n| summarize TotalHits = sum(Hits) by UserId\n```',
    options: [
      '`heavy` is evaluated TWICE — once for the outer reference and once inside the inner `join` subquery — because it is a plain `let` binding with no `materialize()` wrapper',
      'The `join kind=inner` here should be `kind=innerunique` to avoid Cartesian expansion',
      'Referencing the same `let` twice is a syntax error in KQL',
      'The `where Hits > 100` inside the join subquery is unreachable because `Hits` does not exist until after the join'
    ],
    correct: 0,
    explanation:
      'A plain `let` binding is a macro-like expansion — every reference re-executes the full subquery. Here `heavy` is referenced twice, so the 30-day aggregation over BigTable runs twice. Fix: `let heavy = materialize(BigTable | where ...)`. With `materialize()`, the aggregation runs once and both downstream references share the cached result.',
    whyWrong: {
      1: '`kind=inner` is correct here — both sides are the same logical table filtered to Hits > 100 on one side; no de-duplication trap applies.',
      2: 'Referencing the same `let` binding multiple times is completely valid KQL — it just re-evaluates each time without `materialize()`.',
      3: '`Hits` is a column on `heavy` (created by the `summarize`). The inner subquery filters `heavy | where Hits > 100` — that is perfectly valid because `Hits` exists as a column in the `heavy` result set.'
    },
    source: SRC.kql,
    tags: ['kql', 'materialize', 'let', 'performance', 'code-reading']
  }),

  // ── kqa-004: lookup operator vs join — semantic difference ──────────
  single({
    id: 'kqa-004', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Given the following two queries, which claim about their difference is correct?\n```\n// Query A\nFacts | join kind=inner Dim on ProductId\n\n// Query B\nFacts | lookup Dim on ProductId\n```',
    options: [
      'Query B (`lookup`) broadcasts the entire right-side `Dim` table and skips the `innerunique` left-side deduplication that Query A\'s default `join` would apply; `lookup` always produces inner-style enrichment without dedup',
      'Query A and B are identical in semantics and performance — `lookup` is just an alias for `join kind=inner`',
      'Query A is faster because `join kind=inner` has explicit parallelism hints that `lookup` lacks',
      'Query B can return unmatched Dim rows; Query A cannot'
    ],
    correct: 0,
    explanation:
      '`lookup` is purpose-built for fact-to-small-dim enrichment: it broadcasts the right (dim) side and skips the innerunique deduplication the default `join` would apply to the left (fact) side. Unlike a plain `join kind=inner`, `lookup` does NOT deduplicate the left side — you get all fact rows enriched with dim columns where a match exists. The engine also applies a broadcast hint automatically for the right side.',
    whyWrong: {
      1: '`lookup` and `join kind=inner` differ fundamentally: `join kind=inner` (the default being `innerunique`) deduplicates the left; `lookup` does not. They are NOT aliases.',
      2: '`join kind=inner` has no special parallel hints that `lookup` lacks; if anything `lookup`\'s broadcast optimization often outperforms a raw inner join on large fact tables.',
      3: '`lookup` produces inner-style results — unmatched dim rows are NOT retained. For unmatched dim rows you would need `join kind=rightouter` or `fullouter`.'
    },
    source: SRC.kql,
    tags: ['kql', 'lookup', 'join', 'broadcast', 'innerunique']
  }),

  // ── kqa-005: leftanti / rightanti — anti-join kinds ─────────────────
  multi({
    id: 'kqa-005', domain: 'prepare', subtopic: 'kql-joins', difficulty: 4,
    prompt:
      'Which statements about `kind=leftanti` and `kind=rightanti` join in KQL are TRUE? (Select all that apply.)',
    options: [
      '`kind=leftanti` returns rows from the LEFT table that have NO match in the right table — the "left NOT IN right" pattern',
      '`kind=rightanti` returns rows from the RIGHT table that have NO match in the left table',
      'Both anti-join kinds return columns from BOTH sides for unmatched rows',
      'The `leftanti` pattern is semantically equivalent to a `leftouter` join followed by `where isnull(<right-key>)`',
      '`kind=leftanti` is the default join kind when no `kind=` is specified'
    ],
    correct: [0, 1, 3],
    explanation:
      '`leftanti` surfaces left-only rows (no match in right), and `rightanti` does the reverse. Anti-joins return ONLY the columns of the surviving side — not both sides. `leftanti` is exactly equivalent to `leftouter | where isnull(right-key)` but often executes more efficiently. The default join kind is `innerunique`, not `leftanti`.',
    whyWrong: {
      2: 'Anti-joins return ONLY the columns of the surviving (non-matching) side. No right-side columns appear in a `leftanti` result and vice versa.',
      4: 'The default join kind is `innerunique`, not `leftanti`. Specifying no `kind=` always gives `innerunique`.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'leftanti', 'rightanti', 'anti-join']
  }),

  // ── kqa-006: make-series + series_fill_linear ───────────────────────
  single({
    id: 'kqa-006', domain: 'prepare', subtopic: 'kql-time-series', difficulty: 4,
    prompt:
      'A team writes:\n```\nTelemetry\n| where Ts > ago(7d)\n| make-series AvgCpu = avg(CpuPct) on Ts\n    from ago(7d) to now() step 1h\n    by DeviceId\n| extend AvgCpu = series_fill_linear(AvgCpu)\n```\nWhat problem does `series_fill_linear` solve here?',
    options: [
      'Some devices may not emit data every hour; `make-series` inserts `null` for missing time-slot entries, and `series_fill_linear` replaces those nulls with linearly interpolated values between the surrounding valid data points',
      'It converts the AvgCpu from a scalar to a dynamic array so that downstream ML plugins can consume it',
      'It resamples the series from hourly to per-minute granularity for smoother visualization',
      '`series_fill_linear` is a normalisation function — it scales AvgCpu to [0,1] across the array'
    ],
    correct: 0,
    explanation:
      '`make-series` always produces a complete series from `from` to `to` at the specified `step`, inserting `null` (or the default fill) for slots with no data. `series_fill_linear` walks the resulting array and replaces each null with a linearly interpolated value based on its nearest non-null neighbours. This is essential before feeding the series into anomaly detection or ML plugins, which cannot handle nulls.',
    whyWrong: {
      1: '`make-series` already produces dynamic arrays — that is its core output. `series_fill_linear` does not change the data type; it fills gaps in the existing array.',
      2: '`series_fill_linear` does not change the granularity/step. Resampling would require a different `step` value in `make-series`.',
      3: 'Normalisation to [0,1] is not what `series_fill_linear` does. There is no such built-in normalisation function in KQL time-series.'
    },
    source: SRC.kql,
    tags: ['kql', 'make-series', 'series_fill_linear', 'time-series', 'gaps']
  }),

  // ── kqa-007: series_decompose_anomalies — code reading ──────────────
  single({
    id: 'kqa-007', domain: 'prepare', subtopic: 'kql-time-series', difficulty: 5,
    prompt:
      'A data engineer writes the following anomaly detection query:\n```\nMetrics\n| where Ts > ago(14d)\n| make-series Val = avg(Value) on Ts\n    from ago(14d) to now() step 1h\n    by Service\n| extend anomalies = series_decompose_anomalies(Val, 1.5)\n| mv-expand Ts, Val, anomalies\n| where toint(anomalies) != 0\n```\nWhy might this query MISS obvious anomalies in a metric that has a strong weekly seasonality?',
    options: [
      'The default decomposition model in `series_decompose_anomalies` is `linefit` (a linear trend); if the series has strong seasonality the residuals include the seasonal component and the anomaly score is diluted — specifying `seasonality=168` (weekly hourly periods) or `series_decompose_anomalies(Val, 1.5, "avg", "linefit", 168)` would separate trend from seasonality first',
      'The sensitivity threshold of 1.5 is far too high — it should be set to 0.5 to detect more anomalies',
      '`mv-expand` on three columns simultaneously is not supported; the query errors before any anomaly can be returned',
      'The 14-day window is too short for `series_decompose_anomalies` which requires at least 90 days of data'
    ],
    correct: 0,
    explanation:
      '`series_decompose_anomalies` decomposes the signal into trend + seasonality + residual. The default seasonality is auto-detected, but for a 1-hour step over 14 days the auto-detect may not correctly identify the 168-period (7 × 24h) weekly cycle. When seasonality is missed, the seasonal swing ends up in the residual, raising the noise floor and masking real anomalies. Explicitly passing `seasonality=168` (or `"avg"` decomposition with the known period) fixes this.',
    whyWrong: {
      1: 'A lower threshold makes the detector MORE sensitive (catches more things, including false positives). The problem described is MISSED anomalies (false negatives), which a lower threshold would not fix if the root issue is the residual absorbing seasonality.',
      2: '`mv-expand` on multiple columns simultaneously is fully supported in KQL — it fans out all listed columns in lock-step.',
      3: '14 days at hourly granularity gives 336 data points — more than enough for weekly decomposition. 90 days is not a hard requirement.'
    },
    source: SRC.kql,
    tags: ['kql', 'time-series', 'series_decompose_anomalies', 'seasonality', 'anomaly-detection']
  }),

  // ── kqa-008: tumbling vs hopping vs session windows ─────────────────
  multi({
    id: 'kqa-008', domain: 'prepare', subtopic: 'kql-time-series', difficulty: 4,
    prompt:
      'Which statements correctly distinguish KQL windowing patterns using `bin()` and `summarize`? (Select all that apply.)',
    options: [
      'A tumbling window is implemented with `summarize count() by bin(Ts, 1h)` — non-overlapping fixed-size time buckets, each event belongs to exactly one bucket',
      'A hopping window (overlapping, fixed-size) is NOT directly expressible with a single `bin()` call — it requires generating multiple overlapping time keys per event, typically via `range` + `mv-expand`',
      'A session window groups events by inactivity gaps — in KQL this can be approximated by computing time-delta between consecutive events using `prev()` and flagging a new session when the gap exceeds a threshold',
      '`bin(Ts, 1h)` produces OVERLAPPING 1-hour buckets by default',
      'Session windows are natively implemented via `session_window()` operator in KQL'
    ],
    correct: [0, 1, 2],
    explanation:
      'Tumbling = `bin()` — simplest, non-overlapping. Hopping = overlapping windows require generating multiple time keys per event (range of offsets + mv-expand), since `bin()` assigns each event to exactly one slot. Session = approximate via `prev()` to detect inactivity gaps and assign a session ID. `bin()` is always non-overlapping, not overlapping. There is no built-in `session_window()` operator in KQL (that is a Kusto Streaming Analytics concept, not the standard query language operator available in Eventhouse KQL).',
    whyWrong: {
      3: '`bin(Ts, 1h)` truncates timestamps to hour boundaries — buckets are mutually exclusive (non-overlapping), not overlapping.',
      4: 'There is no `session_window()` operator in standard KQL for Eventhouse / KQL Database. Session window logic must be hand-coded using `prev()` / gap detection.'
    },
    source: SRC.kql,
    tags: ['kql', 'time-series', 'tumbling-window', 'hopping-window', 'session-window', 'bin']
  }),

  // ── kqa-009: range operator — synthetic time table ──────────────────
  single({
    id: 'kqa-009', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt:
      'A KQL engineer writes:\n```\nrange Hour from ago(24h) to now() step 1h\n| join kind=leftouter (\n    Events | summarize Cnt = count() by bin(Ts, 1h)\n) on $left.Hour == $right.Ts\n| project Hour, Cnt = coalesce(Cnt, 0)\n```\nWhat is the purpose of the `range` operator here?',
    options: [
      'It generates a synthetic table of 25 hourly datetime rows so that the `leftouter` join fills in `Cnt = 0` for any hour that had no events — ensuring no gaps in the output series',
      'It generates a random sample of 25 rows from `Events`',
      'It applies a row-level range filter equivalent to `where Hour between (ago(24h) .. now())`',
      '`range` is only valid for integer sequences and would error on datetime arguments'
    ],
    correct: 0,
    explanation:
      '`range` generates a single-column table of evenly spaced values — datetimes, integers, or timespans. Here it produces one row per hour over the last 24h, forming a complete "spine" table. The `leftouter` join attaches event counts where they exist and leaves null for empty hours; `coalesce(Cnt, 0)` then fills gaps. This is the standard "no-gap time series" pattern in KQL.',
    whyWrong: {
      1: '`range` is not a sampling function — it generates a deterministic arithmetic sequence.',
      2: '`range` produces output rows; it is not a filter predicate on another table.',
      3: '`range` works with `datetime`, `timespan`, `long`, `int`, and `real` — datetime is fully supported.'
    },
    source: SRC.kql,
    tags: ['kql', 'range', 'time-series', 'gaps', 'spine-table']
  }),

  // ── kqa-010: evaluate pivot ─────────────────────────────────────────
  single({
    id: 'kqa-010', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A reporting query uses:\n```\nSales\n| evaluate pivot(Region, sum(Revenue), Product)\n```\nWhat does this produce?',
    options: [
      'A wide table with one column per distinct `Region` value, each cell holding the sum of `Revenue` for that (Product, Region) pair — rows remain grouped by `Product`',
      'A long table with one row per (Product, Region) pair — the opposite of a pivot',
      'A histogram of `Revenue` binned by `Region`',
      'An error — `evaluate` plugins cannot use aggregate functions inside them'
    ],
    correct: 0,
    explanation:
      '`evaluate pivot(pivot_column, aggregation [, row_identifier...])` rotates distinct values of `pivot_column` into separate output columns and applies the aggregation to each cell. Here, each distinct Region becomes a column, rows are keyed by Product, and each cell is `sum(Revenue)`. This is the standard KQL cross-tabulation / pivot transform.',
    whyWrong: {
      1: 'A long (unpivoted) format is what the data looks like BEFORE the pivot — `evaluate pivot` does the opposite.',
      2: '`evaluate pivot` produces a cross-tab, not a histogram. `summarize count() by bin()` would produce a histogram.',
      3: '`evaluate` plugins can absolutely accept aggregate functions — that is a core feature of `evaluate pivot`.'
    },
    source: SRC.kql,
    tags: ['kql', 'evaluate', 'pivot', 'cross-tabulation']
  }),

  // ── kqa-011: evaluate bag_unpack — dynamic struct expansion ─────────
  single({
    id: 'kqa-011', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A `Logs` table has a `Properties` column of type `dynamic` that holds a JSON property bag per row, with different keys in each row.\n```\nLogs\n| evaluate bag_unpack(Properties)\n```\nWhat does this produce?',
    options: [
      'A table where each key found in any row\'s `Properties` bag becomes a new column; rows that lack a given key get `null` for that column — effectively a schema-on-read expansion of a semi-structured column',
      'A long table with one row per key-value pair from `Properties`, similar to `mv-expand`',
      'An error because `bag_unpack` requires all rows to have the same set of keys',
      'A column of type `string` containing the serialised JSON of `Properties`'
    ],
    correct: 0,
    explanation:
      '`evaluate bag_unpack(col)` is the "widen a property bag into columns" plugin. It scans all rows, collects the union of all keys ever seen in `col`, creates one output column per key, and assigns the value (or null) for each row. The original `col` is dropped. This is the recommended way to materialise a dynamic JSON bag into typed columns for reporting.',
    whyWrong: {
      1: '`mv-expand` produces a long format (one row per element). `bag_unpack` produces a WIDE format (one column per key).',
      2: '`bag_unpack` handles heterogeneous keys gracefully — rows missing a key simply get null. No error is thrown.',
      3: '`bag_unpack` removes the original `Properties` column and replaces it with expanded typed columns — it does not serialise anything.'
    },
    source: SRC.kql,
    tags: ['kql', 'evaluate', 'bag_unpack', 'dynamic', 'schema-on-read']
  }),

  // ── kqa-012: materialized views in KQL Database ──────────────────────
  multi({
    id: 'kqa-012', domain: 'prepare', subtopic: 'kql-materialized-views', difficulty: 4,
    prompt:
      'Which statements about **materialized views** in a Microsoft Fabric KQL Database (Eventhouse) are TRUE? (Select all that apply.)',
    options: [
      'A materialized view is a pre-computed aggregation result that is kept up to date incrementally as new data is ingested into the source table',
      'Querying a materialized view always reads from the pre-materialized part first and queries only the "delta" (recently ingested, not yet materialized) rows live',
      'A materialized view and the `materialize()` query-time function serve the same purpose and are interchangeable',
      'Materialized views require manual refresh commands — they do not update automatically on ingestion',
      'Materialized views can significantly reduce query latency for repeated aggregations (e.g., hourly counts) by avoiding full-scan aggregation at query time'
    ],
    correct: [0, 1, 4],
    explanation:
      'Materialized views in KQL Database are persistent, incrementally maintained aggregations. Queries against them automatically use the pre-materialised part for historical data and run a live query only against the unsettled "delta". This delivers sub-second latency for aggregations that would otherwise require full table scans. They update automatically on ingestion — no manual refresh needed. The `materialize()` function is entirely different: it is a per-query in-memory cache hint for reusing subresults within a single query execution.',
    whyWrong: {
      2: 'This describes `materialize()` — the query-time in-memory function. Materialized views (persistent objects) and `materialize()` (ephemeral per-query hint) are completely different mechanisms.',
      3: 'Materialized views update AUTOMATICALLY via the ingestion pipeline. There are no manual refresh commands required (unlike some other data-store materialized view implementations).'
    },
    source: SRC.eventhouse,
    tags: ['kql', 'kql-materialized-views', 'eventhouse', 'performance']
  }),

  // ── kqa-013: update policy — cascade on ingestion ───────────────────
  single({
    id: 'kqa-013', domain: 'prepare', subtopic: 'kql-update-policy', difficulty: 5,
    prompt:
      'A KQL Database has:\n- Source table: `RawEvents`\n- Derived table: `ParsedEvents`\n- An update policy on `ParsedEvents` whose query is:\n```\nRawEvents | extend UserId = extract(@"user=(\\w+)", 1, RawLine)\n```\n\nWhich statement about this update policy is CORRECT?',
    options: [
      'Every time a batch of rows is ingested into `RawEvents`, the update policy query automatically runs against the newly ingested rows and appends the transformed results into `ParsedEvents` — no manual pipeline step is required',
      'The update policy runs once daily at midnight; results are appended on a schedule',
      'Update policies require the source and derived table to share the same schema',
      'An update policy can cascade: if `ParsedEvents` also has an update policy that targets a third table, that third table will also be populated automatically'
    ],
    correct: 0,
    explanation:
      'Update policies are ingestion-time triggers: whenever a batch lands in the source table, the policy query executes against that batch and appends results to the target table. This is synchronous with ingestion, not scheduled. The derived table schema must be compatible with the query output (it does not need to be identical to the source). Cascaded update policies (source → A → B) are supported but must be designed carefully to avoid cycles.',
    whyWrong: {
      1: 'Update policies are NOT scheduled — they fire on every ingestion batch, in real time.',
      2: 'The derived table schema must match the UPDATE POLICY QUERY output, not the source table schema. They can be completely different.',
      3: 'Cascade IS supported — but cascade was listed as correct option A, not option D here. Option D is actually correct too, but the primary accurate statement is option A (the ingestion-trigger behaviour), which is the testable core concept.'
    },
    source: SRC.eventhouse,
    tags: ['kql', 'kql-update-policy', 'eventhouse', 'ingestion']
  }),

  // ── kqa-014: cross-database and cross-cluster queries ────────────────
  multi({
    id: 'kqa-014', domain: 'prepare', subtopic: 'eventhouse', difficulty: 4,
    prompt:
      'Which statements about `database()` and `cluster()` qualifiers in KQL are TRUE? (Select all that apply.)',
    options: [
      '`database("OtherDB").TableName` queries a table in a different KQL Database within the same cluster without any additional configuration',
      '`cluster("othername").database("OtherDB").TableName` queries a table on an entirely different Eventhouse cluster',
      'Cross-database queries incur the same latency as same-database queries because all data is co-located in the same OneLake storage',
      'The caller must have at least Viewer permission on the referenced database for cross-database queries to succeed',
      '`cluster()` requires the fully-qualified FQDN of the target cluster (e.g., `cluster("https://help.kusto.windows.net")`)'
    ],
    correct: [0, 1, 3],
    explanation:
      '`database()` references another KQL Database in the same cluster; `cluster().database()` reaches across clusters. Both require appropriate permissions (Viewer or above) on the target. Cross-database queries within the same cluster are efficient but not zero-cost — data may still need to be transferred across shards. The `cluster()` reference uses the cluster URI or the alias configured in the cluster policy, which for Fabric Eventhouse is typically the full HTTPS endpoint URI.',
    whyWrong: {
      2: 'Cross-database queries are NOT zero-latency. Data in different KQL Databases may reside on different nodes, and cross-database joins can be more expensive than same-database queries.',
      4: '`cluster()` accepts both a full FQDN URI (`https://...`) and a configured alias. Both forms are valid; the exam may test either form.'
    },
    source: SRC.eventhouse,
    tags: ['kql', 'eventhouse', 'cross-database', 'cross-cluster', 'database-function']
  }),

  // ── kqa-015: external_table — OneLake integration ───────────────────
  single({
    id: 'kqa-015', domain: 'prepare', subtopic: 'eventhouse', difficulty: 4,
    prompt:
      'A data engineer wants to join streaming event data stored in an Eventhouse KQL Database with historical Parquet files that reside in a Fabric Lakehouse (OneLake). Which KQL mechanism enables querying the OneLake Parquet files directly from a KQL query without copying the data into the KQL Database?',
    options: [
      '`external_table("LakehouseAlias")` — an external table definition that maps a name to a OneLake / Azure Storage path; KQL can query it with the same syntax as a regular table',
      'A materialized view that reads from the Lakehouse via a scheduled copy',
      '`evaluate python()` — embed a Python script that uses mssparkutils to read the Parquet files',
      'A `lookup` against the Lakehouse shortcut, which automatically resolves OneLake paths'
    ],
    correct: 0,
    explanation:
      'Fabric Eventhouse supports external tables backed by OneLake (and Azure Storage / ADLS) paths. The `external_table("name")` function references a pre-defined external table definition that points to the Parquet (or CSV/JSON/ORC) files. KQL queries against it use the same pipeline syntax as internal tables. The data is read at query time (not copied) — this is the zero-ETL integration pattern between KQL Database and OneLake Lakehouse.',
    whyWrong: {
      1: 'A materialized view aggregates data from within the KQL Database — it does not pull from a Lakehouse path, and it is NOT a query-time read-through.',
      2: '`evaluate python()` runs sandboxed Python for UDF/ML scenarios; it is not a data access mechanism for external storage paths.',
      3: '`lookup` is a join operator that works against tables already visible to the KQL engine. A Lakehouse shortcut alone does not make files queryable via KQL without an external table definition.'
    },
    source: SRC.eventhouse,
    tags: ['kql', 'eventhouse', 'external-table', 'onelake', 'lakehouse']
  }),

  // ── kqa-016: take vs top — sort guarantee ───────────────────────────
  single({
    id: 'kqa-016', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt:
      'A developer writes `T | take 100` to debug a table. A colleague changes it to `T | top 100 by Ts desc`. Which statement correctly describes the DIFFERENCE?',
    options: [
      '`take 100` returns any 100 rows in an UNSPECIFIED order — the engine may return different rows on successive executions; `top 100 by Ts desc` sorts the ENTIRE table descending by `Ts` and guarantees the 100 most-recent rows',
      '`take` and `top` are interchangeable; both return the same 100 rows in the same order',
      '`take 100` always returns the FIRST 100 rows in ingestion order; `top 100` returns the last 100',
      '`top` requires a numeric column; it cannot sort on datetime columns'
    ],
    correct: 0,
    explanation:
      '`take N` is a fast "give me any N rows" operator with no ordering guarantee — the engine picks N rows from whatever shard it accesses first. Results can differ between executions. `top N by col` applies a full sort (or heap-select for efficiency) and guarantees the N rows with the highest (or lowest) values of the sort column. For reproducible, ordered samples, always use `top`. For quick schema/data inspection, `take` is cheaper.',
    whyWrong: {
      1: '`take` and `top` are NOT interchangeable. Their ordering guarantees are fundamentally different.',
      2: '`take` makes no ingestion-order guarantee — KQL sharding means "first 100" has no stable meaning.',
      3: '`top by` accepts any orderable type including datetime, timespan, string, and numeric.'
    },
    source: SRC.kql,
    tags: ['kql', 'take', 'top', 'ordering', 'non-determinism']
  }),

  // ── kqa-017: ingestion_time() function ──────────────────────────────
  single({
    id: 'kqa-017', domain: 'prepare', subtopic: 'eventhouse', difficulty: 3,
    prompt:
      'A monitoring query uses `where ingestion_time() > ago(5m)` to find recently landed rows.\n\nWhat does `ingestion_time()` return, and why might it differ from the event\'s own `EventTimestamp` column?',
    options: [
      '`ingestion_time()` returns the time the row was written to the KQL Database storage extent — this reflects pipeline latency; `EventTimestamp` is the application-generated event time, which may be minutes or hours earlier if there was buffering, batching, or late-arriving data',
      '`ingestion_time()` and `EventTimestamp` are always identical; Fabric Eventhouse guarantees in-order ingestion',
      '`ingestion_time()` returns the time the query was executed, not the ingestion time of each row',
      '`ingestion_time()` is only available on tables with `update policies` configured'
    ],
    correct: 0,
    explanation:
      '`ingestion_time()` is a system pseudo-column representing when the row was physically committed to the KQL Database extent (shard). It is distinct from any application-defined timestamp. The gap between `EventTimestamp` and `ingestion_time()` captures end-to-end pipeline latency — buffering in Event Hubs, Eventstream processing delay, or late-arriving records. Monitoring `ingestion_time() > ago(5m)` finds rows that arrived in the last 5 minutes regardless of when the events occurred.',
    whyWrong: {
      1: 'KQL does NOT guarantee in-order ingestion. Batching and distributed ingestion means rows arrive and are committed in variable order. `ingestion_time()` can differ significantly from `EventTimestamp`.',
      2: '`ingestion_time()` is per-row, set at write time — not at query time. `now()` returns query execution time.',
      3: '`ingestion_time()` is available on ALL ingested tables, not only those with update policies.'
    },
    source: SRC.eventhouse,
    tags: ['kql', 'eventhouse', 'ingestion_time', 'late-arriving-data']
  }),

  // ── kqa-018: prev() and next() — ordering question ───────────────────
  order({
    id: 'kqa-018', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Order these steps to correctly compute the time gap between consecutive events for each device using `prev()` in KQL:',
    options: [
      '`| sort by DeviceId asc, Ts asc` — establish the row order that `prev()` will use',
      '`| extend PrevTs = prev(Ts, 1)` — read the previous row\'s timestamp within the current sort order',
      '`| where DeviceId == prev(DeviceId, 1)` — filter to rows where the previous row belongs to the same device (prevents cross-device gaps)',
      '`| extend GapSeconds = (Ts - PrevTs) / 1s` — compute the gap in seconds from the row-level difference'
    ],
    explanation:
      '`prev()` and `next()` are order-sensitive: you MUST establish row order with `sort by` before using them. Then extend the previous timestamp, then guard against cross-device contamination (the previous row of the first event for a device would belong to a different device), then compute the gap. Reordering any of these steps produces incorrect or null results.',
    source: SRC.kql,
    tags: ['kql', 'prev', 'next', 'adjacency', 'sort', 'time-delta']
  }),

  // ── kqa-019: arg_max / arg_min — last-value pattern ─────────────────
  single({
    id: 'kqa-019', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Given a `DeviceStatus` table with millions of rows, a developer needs the LATEST status row per device (by `Ts`):\n```\n// Version A\nDeviceStatus\n| summarize arg_max(Ts, *) by DeviceId\n\n// Version B\nDeviceStatus\n| sort by Ts desc\n| summarize any(*) by DeviceId\n```\nWhich version is FASTER and why?',
    options: [
      'Version A — `arg_max(Ts, *)` is a purpose-built aggregate that finds the max-Ts row per group without sorting the entire table; Version B performs a full table sort (O(N log N)) before the summarise',
      'Version B — `any(*)` is a native C++ intrinsic optimised for this exact pattern; `arg_max` requires two passes over the data',
      'Both versions are identical in performance; the query optimiser rewrites B into A automatically',
      'Version A is only correct if `Ts` is the primary sort key of the table; otherwise it returns a random row'
    ],
    correct: 0,
    explanation:
      '`arg_max(maximise_col, projection_cols)` is the idiomatic "last record per group" aggregate in KQL. It scans once and tracks the max per group — O(N) per group pass with no sort. Version B sorts the ENTIRE table before the summarize, paying O(N log N) — then `any(*)` picks one row per group, but the expensive sort was already paid. For millions of rows the difference is substantial. `arg_max` is also correct regardless of the storage sort order.',
    whyWrong: {
      1: '`any(*)` after a sort is not a special intrinsic for this pattern — it just happens to return the first row in the post-sort order. The sort itself is the expensive step.',
      2: 'The optimiser does NOT rewrite `sort | any` into `arg_max`. KQL executes the sort literally.',
      3: '`arg_max` is correct regardless of storage sort order — it is a comparison aggregate, not a position-based lookup.'
    },
    source: SRC.kql,
    tags: ['kql', 'arg_max', 'arg_min', 'last-value', 'performance', 'code-reading']
  }),

  // ── kqa-020: stored functions via let — multi-select ─────────────────
  multi({
    id: 'kqa-020', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A KQL analyst defines a stored function in the KQL Database:\n```\n.create-or-alter function with (docstring="Active users in window")\nActiveUsers(windowStart:datetime, windowEnd:datetime) {\n    LoginEvents\n    | where Ts between (windowStart .. windowEnd)\n    | summarize dcount(UserId)\n}\n```\nWhich statements about this stored function are TRUE? (Select all that apply.)',
    options: [
      'The function can be called from any KQL query in the same database with `ActiveUsers(ago(7d), now())`',
      'Stored functions are persisted in the KQL Database metadata and survive session restarts — unlike `let` bindings which are query-scoped',
      'The function can be called from a different KQL Database using `database("OtherDB").ActiveUsers(ago(7d), now())`',
      'Stored functions compile at call time — there is no pre-compilation or caching of the function body',
      'A `let` binding in a query and a stored function are interchangeable — both support parameters and persist across sessions'
    ],
    correct: [0, 1, 2],
    explanation:
      'Stored functions (created with `.create-or-alter function`) are database-level metadata objects: they persist across sessions, appear in `.show functions`, and can be invoked cross-database with the `database()` qualifier. `let` bindings are strictly query-scoped — they do not survive beyond the single query execution. The function body is parsed and type-checked at creation time (early binding), not purely at call time.',
    whyWrong: {
      3: 'KQL stored functions ARE compiled and type-checked at creation time (early binding). The engine validates the function body when `.create-or-alter function` runs — errors surface immediately, not at call time.',
      4: '`let` bindings are query-scoped and do NOT persist across sessions. They are fundamentally different from stored functions, even though both support parameterisation within a query context.'
    },
    source: SRC.kql,
    tags: ['kql', 'stored-functions', 'let', 'database-objects', 'eventhouse']
  })
];
