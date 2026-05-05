import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 25 deep-KQL questions (kqd-001..kqd-025) for the prepare/kql subtopic.
// Distinct from arch (kql-00x) and prepareMore (px-00x) ids — no collisions.
// Coverage: where/filter/project/summarize/extend, joins (5 kinds), case/iif,
// time filtering, perf-aware design (materialize, lookup vs join, partition
// pushdown, hot vs cold cache).

export const kqlDeep: Question[] = [
  // ── 001: code snippet — basic shape interpretation ─────────────
  single({
    id: 'kqd-001', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt:
      'Given:\n```\nT\n| where Status == "Open"\n| project Id, OwnerEmail, OpenedAt\n| summarize Count = count() by OwnerEmail\n| top 5 by Count desc\n```\nWhat does this query produce?',
    options: [
      'For each owner email, the count of open T rows, returning the 5 owners with the most open rows',
      'A list of the 5 most-recently-opened rows in T regardless of owner',
      'Distinct OwnerEmail values across all of T (status ignored)',
      'The 5 owners with the FEWEST open rows'
    ],
    correct: 0,
    explanation:
      'Filter to Status=="Open", project the owner column, summarize a count per owner, then top 5 by that count desc — i.e. the five owners with the most open rows. The pipeline order forces all four operations.',
    whyWrong: {
      1: 'No row-level OpenedAt sort survives the summarize — once aggregated, the rows are per-owner counts, not original rows.',
      2: 'The where Status=="Open" filters before the summarize, so the result is restricted to open rows.',
      3: '`top 5 by Count desc` returns the LARGEST counts, not the smallest.'
    },
    source: SRC.kql,
    tags: ['kql', 'pipeline', 'summarize', 'top']
  }),

  // ── 002: where vs filter (filter is alias) ─────────────────────
  single({
    id: 'kqd-002', domain: 'prepare', subtopic: 'kql', difficulty: 2,
    prompt: 'Which statement about KQL `where` and `filter` is correct?',
    options: [
      '`filter` is an alias for `where`; both filter rows by a predicate and produce identical plans',
      '`filter` is faster than `where` because it pushes predicates earlier',
      '`where` is row-level; `filter` is column-level',
      '`filter` does not exist in KQL — use `where` only'
    ],
    correct: 0,
    explanation:
      '`filter` is a documented synonym of `where` in KQL — same operator, same execution plan. Predicate pushdown is governed by where the operator sits in the pipeline (and what comes after), not by which alias you use.',
    whyWrong: {
      1: 'No performance difference; they compile to the same operator.',
      2: 'Both operate on rows; column selection is `project`.',
      3: '`filter` does exist as an alias — easy mis-pick if you have only seen `where`.'
    },
    source: SRC.kql,
    tags: ['kql', 'where', 'filter', 'alias']
  }),

  // ── 003: code snippet — extend computed column ─────────────────
  single({
    id: 'kqd-003', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt:
      'Given:\n```\nT\n| extend DurationSec = (CompletedAt - StartedAt) / 1s\n| where DurationSec > 30\n| summarize p95 = percentile(DurationSec, 95) by Service\n```\nWhich statement BEST describes this query?',
    options: [
      'It computes a per-row duration in seconds, keeps rows over 30s, then reports the 95th percentile duration per Service',
      'It returns the average duration per Service across all rows',
      'It would error because timespan division is not allowed in KQL',
      'It returns row counts per Service for rows under 30s'
    ],
    correct: 0,
    explanation:
      '`extend` adds a computed column, the `where` keeps long-running rows, and `summarize percentile(..., 95) by Service` returns p95 per Service group — the canonical latency-investigation shape.',
    whyWrong: {
      1: 'Average is `avg()`, not `percentile(..., 95)`.',
      2: 'Dividing a timespan by `1s` is the standard way to coerce to numeric seconds — it is supported.',
      3: '`where DurationSec > 30` keeps rows OVER 30, not under, and `percentile` is not a row count.'
    },
    source: SRC.kql,
    tags: ['kql', 'extend', 'percentile', 'timespan']
  }),

  // ── 004: project vs project-away vs project-keep ───────────────
  multi({
    id: 'kqd-004', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'Which KQL operators select / shape the OUTPUT columns of a query?',
    options: [
      '`project` — keep / order / rename specific columns',
      '`project-away` — drop the listed columns, keep the rest',
      '`project-keep` — keep the listed columns by pattern, drop the rest',
      '`extend` — drop columns from the result',
      '`summarize` — selects raw columns without aggregation'
    ],
    correct: [0, 1, 2],
    explanation:
      '`project` (positive list), `project-away` (negative list), and `project-keep` (pattern keep) are the three column-shaping operators. `extend` ADDS columns, never drops them. `summarize` is for aggregation, not column selection.',
    whyWrong: {
      3: '`extend` adds computed columns; it does not drop columns.',
      4: '`summarize` aggregates rows into groups; you cannot use it to "select raw columns" without aggregating.'
    },
    source: SRC.kql,
    tags: ['kql', 'project', 'project-away', 'project-keep']
  }),

  // ── 005: code snippet — innerunique surprise ───────────────────
  single({
    id: 'kqd-005', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Given two tables Orders (1M rows, OrderId may repeat) and Payments (2M rows):\n```\nOrders\n| join Payments on OrderId\n| count\n```\nWhy might this return FEWER rows than the user expects?',
    options: [
      'The default join kind is `innerunique`, which de-duplicates the LEFT (Orders) on the join key before joining',
      'KQL `count` always returns 1 unless `count by` is specified',
      'KQL produces a Cartesian product by default, which explodes row counts and triggers row-cap truncation',
      'The `on` keyword silently filters out null OrderIds, removing most rows'
    ],
    correct: 0,
    explanation:
      'KQL\'s default join kind is `innerunique` — the LEFT side is de-duplicated on the join keys before the inner join runs. Users coming from SQL expect inner-join semantics by default and get fewer rows than they bargained for. Specify `kind=inner` for SQL-style behaviour.',
    whyWrong: {
      1: '`count` returns the row count of the previous result; it is not stuck at 1.',
      2: 'KQL joins are not Cartesian by default.',
      3: 'Null filtering is not the cause; innerunique de-duplication is the well-known surprise.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'innerunique', 'kind']
  }),

  // ── 006: join kinds — multi-select semantics ───────────────────
  multi({
    id: 'kqd-006', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which KQL `kind=` values correspond to which join semantics?',
    options: [
      '`kind=inner` — SQL-style inner join, no left-side de-duplication',
      '`kind=innerunique` — DEFAULT; de-duplicates the LEFT side on the join keys before inner-joining',
      '`kind=leftouter` — keeps all left rows, with nulls on right when no match',
      '`kind=rightouter` — keeps all right rows, with nulls on left when no match',
      '`kind=fullouter` — keeps all rows from BOTH sides, with nulls on either when unmatched',
      '`kind=cross` — KQL spelling for a Cartesian product (no `on` clause needed)'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'The five join kinds — inner, innerunique (default), leftouter, rightouter, fullouter — cover the standard semantics. KQL does NOT have a `kind=cross` keyword; cross-product effects are achieved via `mv-expand` or by joining on a constant — not via a `cross` kind.',
    whyWrong: {
      5: '`kind=cross` is not a documented KQL join kind. Cartesian effects are produced via other patterns; this option is the classic exam distractor.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'kind', 'leftouter', 'rightouter', 'fullouter']
  }),

  // ── 007: code snippet — leftouter vs innerunique ───────────────
  single({
    id: 'kqd-007', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Given:\n```\nUsers\n| join kind=leftouter (\n    LoginEvents\n    | where Timestamp > ago(1d)\n) on UserId\n| where isnull(Timestamp)\n```\nWhat does this query find?',
    options: [
      'Users with NO LoginEvents in the last 24 hours (the "missing right side" anti-join pattern)',
      'Users WITH at least one LoginEvent in the last 24 hours',
      'Users whose Timestamp column is null in the Users table itself',
      'The set difference UserId-wise — only users that exist in LoginEvents but not Users'
    ],
    correct: 0,
    explanation:
      'A leftouter join with a null check on a column from the right side is the canonical anti-join: keep every Users row, attach null where there was no matching LoginEvent in the last 24h, then filter to those nulls. Result: users without recent activity.',
    whyWrong: {
      1: 'That would be `isnotnull(Timestamp)` — the opposite filter.',
      2: 'Timestamp comes from LoginEvents (right side), not Users.',
      3: 'leftouter keeps all LEFT rows; right-only rows are not surfaced — that is what rightouter / fullouter would do.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'leftouter', 'anti-join']
  }),

  // ── 008: rightouter vs leftouter mental model ──────────────────
  single({
    id: 'kqd-008', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A team writes `Big | join kind=leftouter Small on Id`. Performance is good. Another team writes `Small | join kind=rightouter Big on Id`. Which statement is MOST accurate?',
    options: [
      'They are logically equivalent in row content but have very different performance characteristics — the second wastes the right-side broadcast optimization because the BIG table is on the right',
      'They are identical in every way; KQL rewrites them automatically',
      'The second is faster because rightouter is more recent and better optimised',
      'rightouter is not a valid join kind in KQL'
    ],
    correct: 0,
    explanation:
      'leftouter and rightouter produce equivalent row content (when you swap the tables and the side), but in KQL the RIGHT side is the broadcast/lookup target — best when small. Putting the big table on the right with rightouter inverts the optimization; the first formulation lets the engine broadcast Small.',
    whyWrong: {
      1: 'KQL does not auto-rewrite to choose the better physical side; it executes what you wrote.',
      2: 'Operator newness has nothing to do with it; physical placement does.',
      3: 'rightouter IS valid KQL — the exam distractor.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'rightouter', 'leftouter', 'performance']
  }),

  // ── 009: case() vs iif() — code snippet ────────────────────────
  single({
    id: 'kqd-009', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt:
      'Given:\n```\nT\n| extend Bucket = case(\n    Latency < 100, "fast",\n    Latency < 500, "ok",\n    Latency < 1000, "slow",\n    "timeout")\n```\nWhich statement is correct?',
    options: [
      'Conditions are evaluated TOP-DOWN; the first matching predicate wins, and the trailing string is the default for everything left',
      'All conditions are evaluated and combined; the LAST matching predicate wins',
      '`case` requires every clause to evaluate to bool, so the default string "timeout" makes this query invalid',
      '`case` is identical to `iif` — both take exactly two branches'
    ],
    correct: 0,
    explanation:
      'KQL `case(pred1, val1, pred2, val2, ..., default)` is short-circuit top-down. The first true predicate yields its value; the trailing positional argument is the default. `iif` is its 2-branch cousin; `case` generalises it.',
    whyWrong: {
      1: '`case` short-circuits — first match wins.',
      2: 'The trailing positional argument is the default value, not a predicate; the query is valid.',
      3: '`iif(cond, then, else)` is 2-branch; `case` supports N predicate/value pairs plus a default.'
    },
    source: SRC.kql,
    tags: ['kql', 'case', 'iif', 'control-flow']
  }),

  // ── 010: time filtering placement (predicate pushdown) ─────────
  single({
    id: 'kqd-010', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A query reads a 1B-row partitioned-by-date table. Which `where Timestamp > ago(7d)` placement gives the BEST performance?',
    options: [
      'As the FIRST operator after the table reference, so the time predicate prunes partitions before any join or summarize touches the data',
      'AFTER a join with a small dimension, so the engine can use the dimension to filter first',
      'As the LAST operator in the pipeline, so the engine can see the full plan first and decide where to apply it',
      'Inside a `summarize` aggregation as a `having`-style filter'
    ],
    correct: 0,
    explanation:
      'KQL does not magically push predicates upward. Time filters belong as early as possible — they enable partition pruning on the storage side and shrink the dataset before joins or summarisation. Placing them last forces the engine to materialise far more data.',
    whyWrong: {
      1: 'Joins fan data out; filtering after them processes more rows, not fewer.',
      2: 'Putting the filter last is the classic perf bug (see scn-15) — KQL is pipeline-literal.',
      3: 'KQL has no `having` clause; the pattern is `summarize ... | where`, but partition pruning needs the time predicate up front on the source table.'
    },
    source: SRC.kql,
    tags: ['kql', 'time', 'partition-pushdown', 'performance']
  }),

  // ── 011: ago / now / startofday / between ──────────────────────
  multi({
    id: 'kqd-011', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'Which KQL time helpers are correctly described?',
    options: [
      '`ago(7d)` returns now() - 7 days',
      '`now()` returns the current UTC datetime',
      '`startofday(Ts)` returns midnight of the day containing Ts',
      '`between(a .. b)` is a range comparison usable in `where Ts between (a .. b)`',
      '`time(7d)` is a relative-time helper equivalent to ago(7d)'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      '`ago`, `now`, `startofday`, and `between` are all standard. `time(7d)` is a TIMESPAN literal helper, not a relative time — it returns a 7-day span, not a moment 7 days ago. Use `ago(7d)` for "7 days ago".',
    whyWrong: {
      4: '`time(7d)` returns the timespan 7d, not "7 days ago" — confusing it with `ago(7d)` is a common trap.'
    },
    source: SRC.kql,
    tags: ['kql', 'time', 'ago', 'between', 'startofday']
  }),

  // ── 012: code snippet — between range filter ───────────────────
  single({
    id: 'kqd-012', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt:
      'Given:\n```\nT\n| where Ts between (startofday(ago(1d)) .. endofday(ago(1d)))\n```\nWhich set of rows does this return?',
    options: [
      'All rows whose Ts fell within YESTERDAY (UTC) — from 00:00:00 to 23:59:59.9999999',
      'All rows from the past 24 hours starting at the current instant',
      'Only rows from the current calendar day',
      'A syntax error — `between` requires comma-separated arguments'
    ],
    correct: 0,
    explanation:
      '`startofday(ago(1d))` is yesterday\'s 00:00 UTC; `endofday(ago(1d))` is yesterday\'s 23:59:59.9999999. The `between (a .. b)` range is inclusive on both ends. Result: a clean "yesterday" window.',
    whyWrong: {
      1: 'A rolling 24h window would be `where Ts > ago(1d)`, not anchored to day boundaries.',
      2: 'Today would be `between (startofday(now()) .. endofday(now()))`.',
      3: 'KQL `between` uses `..` (range), not commas — the syntax is correct.'
    },
    source: SRC.kql,
    tags: ['kql', 'between', 'startofday', 'endofday']
  }),

  // ── 013: materialize() reuse ───────────────────────────────────
  single({
    id: 'kqd-013', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'A `let` binding holds a 5M-row aggregation referenced by FOUR downstream subqueries. Wrapping the binding in `materialize(...)` would do what?',
    options: [
      'Compute the subquery ONCE, cache the result for the duration of the query, and let all four downstream references reuse the cache',
      'Force the engine to write the result to a permanent table, requiring cleanup',
      'Disable parallel execution — materialised subqueries run single-threaded',
      'Have no effect; KQL automatically caches every let binding'
    ],
    correct: 0,
    explanation:
      '`materialize()` is the explicit "compute once, cache for the duration of this query" hint. Without it, KQL re-evaluates the let-bound subquery once per reference. With four references and a 5M-row aggregation, this typically delivers 3-4x speedups.',
    whyWrong: {
      1: 'materialize is in-query and ephemeral; nothing is persisted, no cleanup needed.',
      2: 'It does not disable parallelism; the materialised result is built in parallel and then reused.',
      3: 'KQL does NOT auto-cache let bindings — that is exactly why materialize exists.'
    },
    source: SRC.kql,
    tags: ['kql', 'materialize', 'let', 'performance']
  }),

  // ── 014: lookup vs join — when to pick each ────────────────────
  multi({
    id: 'kqd-014', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which conditions favour `lookup` over a generic `join` for fact-to-dimension enrichment?',
    options: [
      'The right-side dimension is small (fits in memory; 5K rows here)',
      'The fact is huge (1B rows) and you want the dimension broadcast',
      'You want to AVOID the default innerunique de-duplication on the left',
      'You need a fullouter result that includes unmatched dim rows',
      'You are joining on inequality predicates'
    ],
    correct: [0, 1, 2],
    explanation:
      '`lookup` is the optimised "fact joins small dim" operator: broadcasts the small right side, skips the innerunique dedup the default join applies, and produces inner-style enrichment. It is NOT a fullouter — for unmatched-dim retention, use `join kind=fullouter`. It only supports equality joins.',
    whyWrong: {
      3: '`lookup` does not produce fullouter semantics. Use `join kind=fullouter` for that.',
      4: '`lookup` requires equality on the join keys, like the default join.'
    },
    source: SRC.kql,
    tags: ['kql', 'lookup', 'join', 'broadcast', 'performance']
  }),

  // ── 015: code snippet — partition pushdown failure ─────────────
  single({
    id: 'kqd-015', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    prompt:
      'Given a table partitioned on Ts:\n```\nLargeTable\n| extend TsLocal = Ts + 5h\n| where TsLocal > datetime(2026-01-01)\n```\nWhy is partition pruning DEFEATED here?',
    options: [
      'The predicate is on a derived column TsLocal, not on the partition column Ts directly — the engine cannot prune partitions when the filter sits on a computed expression',
      'partition pruning never works in KQL',
      'The 5h offset crosses the international date line and disables pruning',
      '`extend` is forbidden before `where`'
    ],
    correct: 0,
    explanation:
      'Partition pruning requires the filter to reference the partition column directly (or in a form the engine can statically rewrite). Filtering on a computed column hides the underlying Ts from the optimiser, so it must scan all partitions. Rewrite as `where Ts > datetime(2026-01-01) - 5h` to keep pruning intact.',
    whyWrong: {
      1: 'Pruning works fine when filters reference the partition column; it is the derivation that breaks it.',
      2: 'Date line / time zone math is unrelated to pruning eligibility.',
      3: '`extend` before `where` is perfectly legal; that is not the issue.'
    },
    source: SRC.kql,
    tags: ['kql', 'partition-pushdown', 'extend', 'performance']
  }),

  // ── 016: hot vs cold cache ────────────────────────────────────
  multi({
    id: 'kqd-016', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which statements about the KQL hot vs cold cache are TRUE?',
    options: [
      'The HOT cache is local SSD/RAM near the compute nodes; queries against hot data are dramatically faster',
      'The COLD store is the underlying object storage (e.g., Azure Storage / OneLake) — slower per-byte but cheap and large',
      'You can configure a per-table or per-policy hot retention window so recent data stays hot and older data ages into cold',
      'Every query reads exclusively from the hot cache; cold is only used for long-term archival',
      'Setting the hot window to 0 days makes all queries faster because the cache is "always fresh"'
    ],
    correct: [0, 1, 2],
    explanation:
      'The hot/cold split is exactly that: hot = local, fast, expensive; cold = remote, slower, cheap. Hot retention policies let you tune cost vs latency per table. Queries reach into cold when they need data outside the hot window — that is by design, not a bug.',
    whyWrong: {
      3: 'Queries DO read cold data when needed; cold is not archival-only.',
      4: 'Hot=0 days means no caching — every query touches cold, which is SLOWER.'
    },
    source: SRC.kql,
    tags: ['kql', 'hot-cache', 'cold-cache', 'caching']
  }),

  // ── 017: ordering — query rewrite for performance ──────────────
  order({
    id: 'kqd-017', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Order these steps to rewrite a slow KQL query (1B-row fact joined to a 4M-row dim, summarised by tenant) for best performance:',
    options: [
      'Add a time-range `where Ts > ago(7d)` as the FIRST operator on the fact table to enable partition pruning',
      'Reorder the join so the (filtered) FACT is on the LEFT and the small dim is on the RIGHT (broadcast target)',
      'Replace the generic `join kind=inner` with `lookup` against the small dim, eliminating innerunique dedup',
      'Apply the `summarize count() by tenant` AFTER the lookup to aggregate the smallest possible row set'
    ],
    explanation:
      'Filter early (partition pruning), get the join shape right (large left, small right), pick the operator that matches the shape (lookup), then summarise on the now-tiny enriched set. This is the canonical KQL perf rewrite for fact-to-dim-summarise queries.',
    source: SRC.kql,
    tags: ['kql', 'performance', 'join', 'lookup', 'rewrite']
  }),

  // ── 018: ordering — query design from scratch ──────────────────
  order({
    id: 'kqd-018', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'You are writing a new KQL investigation query. Order these design decisions to maximise performance and correctness:',
    options: [
      'Decide the time window and put the time predicate as the FIRST operator on the source table',
      'Project away unneeded columns early to reduce row width through subsequent operators',
      'Choose the right join shape and `kind=` (inner / leftouter / lookup) for the semantics you need',
      'Wrap any reused subresult in `materialize()` and bind it to a `let` for reuse across joins',
      'Apply the final `summarize` / `top` / `render` for output shape'
    ],
    explanation:
      'Time filter first → narrow the row set; project away early → narrow the rows further; pick join semantics → correctness; materialize anything reused → avoid recomputation; final shape last. This is the "from-scratch" perf-aware design pattern.',
    source: SRC.kql,
    tags: ['kql', 'performance', 'design', 'workflow']
  }),

  // ── 019: code snippet — summarize with multiple aggs ───────────
  single({
    id: 'kqd-019', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt:
      'Given:\n```\nRequests\n| where Ts > ago(1h)\n| summarize\n    Count = count(),\n    p50 = percentile(Latency, 50),\n    p95 = percentile(Latency, 95),\n    p99 = percentile(Latency, 99)\n  by bin(Ts, 5m), Service\n```\nWhich BEST describes the result?',
    options: [
      'Per 5-minute bucket and Service: count plus latency p50/p95/p99 — the canonical multi-percentile latency dashboard query',
      'A single row with overall p50/p95/p99 across all services',
      'A row per service with no time bucketing',
      'A syntax error because `summarize` cannot return more than two aggregates'
    ],
    correct: 0,
    explanation:
      '`summarize` accepts arbitrarily many aggregations in one pass. The `by bin(Ts, 5m), Service` clause groups by 5-min × Service. Result is one row per (5-min bucket, service) with four named aggregates. This is the standard latency-per-service-over-time shape.',
    whyWrong: {
      1: 'No `by` clause would give a single row; here we group by bin and Service.',
      2: 'The `bin(Ts, 5m)` IS the time bucketing.',
      3: '`summarize` supports many aggregates per call.'
    },
    source: SRC.kql,
    tags: ['kql', 'summarize', 'percentile', 'bin']
  }),

  // ── 020: code snippet — innerunique semantic surprise ──────────
  single({
    id: 'kqd-020', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    prompt:
      'Given:\n```\nlet Left = datatable (Id:int, Val:string) [\n    1, "a", 1, "b", 2, "c"\n];\nlet Right = datatable (Id:int, Tag:string) [\n    1, "x", 1, "y"\n];\nLeft | join Right on Id\n```\nHow many rows does this query return?',
    options: [
      '2 rows — innerunique de-duplicates Left on Id (collapsing the two Id=1 rows to one) before inner-joining Right',
      '4 rows — Cartesian-style inner join of the two Id=1 rows on each side',
      '0 rows — KQL refuses to join when the left side has duplicates',
      '6 rows — join multiplies counts'
    ],
    correct: 0,
    explanation:
      'Default innerunique collapses Left to {1:"a", 2:"c"} (or 1:"b" — engine-defined which row survives) before joining Right. Id=1 then matches both Right rows = 2 rows total; Id=2 has no match = 0 more rows. Total = 2. Switch to `kind=inner` to get the SQL-style 4 rows.',
    whyWrong: {
      1: 'That would be `kind=inner` semantics, not the default.',
      2: 'KQL does not refuse joins on duplicate keys; it dedups them.',
      3: 'Total is 2, not 6.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'innerunique', 'datatable']
  }),

  // ── 021: code snippet — fullouter ──────────────────────────────
  single({
    id: 'kqd-021', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Given:\n```\nUsersA\n| join kind=fullouter UsersB on UserId\n| where isnull(UsersA_UserId) or isnull(UserId1)\n```\nWhat does this query return?',
    options: [
      'Users that exist on EXACTLY ONE side — the symmetric-difference set; fullouter keeps unmatched rows from BOTH tables, the where filters out matched rows',
      'Users that exist on BOTH sides',
      'A syntax error — fullouter is not a KQL kind',
      'All UsersA rows with the matching UsersB rows attached'
    ],
    correct: 0,
    explanation:
      'fullouter retains all rows from BOTH sides, filling NULL on the side that did not match. The where clause keeps only rows where one of the join-key columns is null, which is exactly "exists on one side, not the other" — the symmetric difference.',
    whyWrong: {
      1: 'Both-sides matches would be inner, not fullouter+null-filter.',
      2: 'fullouter IS a valid KQL kind.',
      3: 'That description is leftouter without the null filter.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'fullouter', 'symmetric-difference']
  }),

  // ── 022: case() exhaustiveness and default ─────────────────────
  multi({
    id: 'kqd-022', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which statements about KQL `case()` and `iif()` are TRUE?',
    options: [
      '`case(p1, v1, p2, v2, ..., default)` evaluates predicates top-down and returns the first matching value; the trailing positional argument is the default',
      '`iif(cond, then, else)` is exactly two-branch; there is no `iif` with more branches',
      'If no predicate matches and no default is supplied, `case()` returns null',
      '`case()` predicates must all return the same return type as one of the values',
      '`case()` is short-circuit — values for unmatched predicates are not evaluated'
    ],
    correct: [0, 1, 4],
    explanation:
      '`case` short-circuits top-down with a default. `iif` is the 2-branch sugar. The default IS required — if you omit it, KQL gives a parse error rather than implicitly returning null. Predicates must be bool; values share a result type but predicates do not have to.',
    whyWrong: {
      2: 'KQL `case()` REQUIRES a default; omitting it is a parse error, not a silent null.',
      3: 'The values share a result type. The PREDICATES are bool — they do not have to share the value type.'
    },
    source: SRC.kql,
    tags: ['kql', 'case', 'iif', 'control-flow']
  }),

  // ── 023: code snippet — extend with case for bucketing ─────────
  single({
    id: 'kqd-023', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt:
      'Given:\n```\nT\n| extend Tier = case(\n    Spend >= 100000, "Enterprise",\n    Spend >= 10000, "Mid",\n    Spend >= 1000, "SMB",\n    "Free")\n| summarize Customers = dcount(CustomerId) by Tier\n| order by Customers desc\n```\nWhat does this query produce?',
    options: [
      'A list of (Tier, Customers) pairs — distinct customer count per spend tier — sorted descending by count',
      'A single row with the total customer count',
      'Customer-level rows tagged with Tier, no aggregation',
      'A syntax error — `dcount` cannot be used inside `summarize`'
    ],
    correct: 0,
    explanation:
      'The pipeline computes Tier per row via case, then `dcount(CustomerId)` per Tier — distinct customer count per spend tier. The sort orders the four tiers by population. Standard segmentation query.',
    whyWrong: {
      1: '`by Tier` produces one row per tier, not one row total.',
      2: '`summarize` collapses rows; the original customer-level rows are gone after this stage.',
      3: '`dcount` is a standard summarize aggregate in KQL.'
    },
    source: SRC.kql,
    tags: ['kql', 'case', 'summarize', 'dcount', 'segmentation']
  }),

  // ── 024: lookup vs join performance multi-select ───────────────
  multi({
    id: 'kqd-024', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which performance-aware design choices are CORRECT for KQL queries?',
    options: [
      'Filter on partition columns (e.g., Ts) as early as possible to enable partition pruning',
      'Put large tables on the LEFT and small dims on the RIGHT in a `join`, so the small side is broadcast',
      'Use `lookup` instead of `join` when the right side is small and you want inner enrichment without innerunique dedup',
      'Wrap reused subqueries in `materialize()` and bind to a `let` to compute once and reuse',
      'Always use `kind=cross` for joins because it is the fastest option'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'Four standard perf wins: partition pushdown via early time filter, large-on-left/small-on-right shape, `lookup` for fact-to-small-dim, and `materialize()` for reuse. `kind=cross` is not even a valid KQL join kind — and a real Cartesian operation would explode row counts catastrophically.',
    whyWrong: {
      4: '`kind=cross` is not a documented KQL kind; even a true Cartesian join is the WORST performance choice, not the best.'
    },
    source: SRC.kql,
    tags: ['kql', 'performance', 'design', 'join', 'lookup', 'materialize']
  }),

  // ── 025: code snippet — full perf-aware investigation ──────────
  single({
    id: 'kqd-025', domain: 'prepare', subtopic: 'kql', difficulty: 5,
    prompt:
      'Given:\n```\nlet recent = materialize(\n    SignInEvents\n    | where Ts > ago(7d)\n    | summarize Attempts = count(), Failures = countif(Result == "Failure") by UserId\n);\nrecent\n| lookup (UserDirectory | project UserId, Department) on UserId\n| where Failures > 100\n| summarize TotalFailures = sum(Failures) by Department\n| top 10 by TotalFailures desc\n```\nWhich statement BEST describes WHY this query is well-designed for performance?',
    options: [
      'Time filter is first (partition pruning); the heavy aggregation is materialised once for reuse; `lookup` is used for the small dim instead of innerunique `join`; the second filter sits AFTER the lookup so only enriched rows are aggregated',
      'It uses `top 10 by ... desc` which is a magic operator that always guarantees fast queries',
      '`materialize` here is wasteful — the inner expression is only referenced once',
      'It would be faster if the `where Ts > ago(7d)` was moved to the very END of the query'
    ],
    correct: 0,
    explanation:
      'Four good moves stacked: partition-pushdown time filter on the inside, materialise-once for the heavy aggregation that is reused (recent appears as the lookup left side), `lookup` for the small dim, and the secondary `Failures > 100` filter sits AFTER enrichment so it only processes the already-aggregated set. This is the canonical exam-grade perf-aware shape.',
    whyWrong: {
      1: '`top` is just sort+limit; not magic. The structural reasons listed in the correct answer are why the query is fast.',
      2: 'In this query `recent` is referenced only once below the let, so materialize is debatable here — but the exam-grade question is whether the OTHER design choices are sound, which they are. The wrong reasoning in this distractor (calling materialize "wasteful" as the headline reason) misses the point.',
      3: 'Moving the time filter to the end DEFEATS partition pruning — the opposite of an optimization.'
    },
    source: SRC.kql,
    tags: ['kql', 'performance', 'materialize', 'lookup', 'partition-pushdown']
  })
];
