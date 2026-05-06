import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

// 25 deep-dive DP-600 questions on Fabric Lakehouse + Delta operations.
// IDs: lkd-001..lkd-025.
// Domain: prepare (all 25).
// Subtopics: lakehouse-files, lakehouse-tables, delta-optimize,
//   delta-vacuum, delta-time-travel, delta-schema-evolution, v-order.
// Type mix: 7 multi, 2 ordering, 16 single.
// Difficulty mix: D3/D4/D5 only.
// Code-reading questions: lkd-005, lkd-009, lkd-014, lkd-021.
// Coordinated with q-spark-notebooks-deep.ts to avoid duplicating Files/Tables
// basics, V-Order overview, and append schema-enforcement questions.

const SRC_LKD: Record<string, SourceAnchor> = {
  files: { category: 'fabric-lakehouse-delta', note: 'Lakehouse /Files/ unmanaged area: raw drops, non-Delta formats, no metastore registration' },
  tables: { category: 'fabric-lakehouse-delta', note: 'Lakehouse /Tables/ managed Delta area: SQL endpoint, Direct Lake exposure, metastore-registered' },
  optimize: { category: 'fabric-lakehouse-delta', note: 'OPTIMIZE: bin-packing, ZORDER BY, target file size, when to run' },
  vacuum: { category: 'fabric-lakehouse-delta', note: 'VACUUM: file retention, default 7-day floor, deletedFileRetentionDuration override' },
  timeTravel: { category: 'fabric-lakehouse-delta', note: 'Delta time travel: VERSION AS OF / TIMESTAMP AS OF, DESCRIBE HISTORY, retention bounds' },
  schemaEvolution: { category: 'fabric-lakehouse-delta', note: 'Schema evolution: mergeSchema, overwriteSchema, ADD COLUMN, type widening' },
  vorder: { category: 'fabric-lakehouse-delta', note: 'V-Order: Vertipaq-friendly Parquet ordering for Direct Lake, write conf vs option' },
  protocol: { category: 'fabric-lakehouse-delta', note: 'Delta protocol versions: minReaderVersion / minWriterVersion, feature gating, Iceberg interop' },
  dml: { category: 'fabric-lakehouse-delta', note: 'Delta DML: DELETE / UPDATE / MERGE, file fragmentation, idempotency patterns' },
  streaming: { category: 'fabric-lakehouse-delta', note: 'Streaming sinks to Delta: foreachBatch, exactly-once via txnVersion/txnAppId' }
} satisfies Record<string, SourceAnchor>;

export const lakehouseDelta: Question[] = [

  // ── V-Order: mechanics & enabling ────────────────────────────

  single({
    id: 'lkd-001', domain: 'prepare', subtopic: 'v-order', difficulty: 4,
    prompt:
      'A team writes a 200 GB Delta table from a nightly Spark job. Direct Lake query latency in the downstream semantic model has degraded since they disabled V-Order to speed up the write. WHICH specific gain is lost on the READ side when V-Order is off?',
    options: [
      'Delta transaction-log compaction is skipped, so reads must replay more JSON commits',
      'The Parquet row groups are no longer sorted in a Vertipaq-friendly order, so Direct Lake column-segment loads scan more pages and compress less',
      'The Lakehouse SQL endpoint refuses to serve the table until V-Order is re-enabled',
      'Delta automatically falls back to DirectQuery for any query that touches the table'
    ],
    correct: 1,
    explanation:
      'V-Order rewrites Parquet row groups using a sort + dictionary-encoding scheme aligned with how the VertiPaq engine loads column segments for Direct Lake. Disabling it produces standard Parquet — the table is still readable and queryable, but Direct Lake column-segment loads scan more pages and compress less efficiently, which is exactly the latency degradation described.',
    whyWrong: {
      0: 'V-Order is a Parquet write-time optimization; it has no effect on transaction-log JSON compaction (that is a separate Delta concern handled by checkpoints).',
      2: 'The SQL endpoint serves any valid Delta table whether V-Order is on or off.',
      3: 'V-Order off does not flip Direct Lake to DirectQuery — Direct Lake still loads, just less efficiently. Fallback is triggered by other conditions (unsupported features, guardrails).'
    },
    source: SRC_LKD.vorder,
    tags: ['v-order', 'direct-lake', 'parquet'],
    relatedIds: ['lkd-002', 'lkd-003']
  }),

  multi({
    id: 'lkd-002', domain: 'prepare', subtopic: 'v-order', difficulty: 4,
    prompt:
      'Which methods are valid for ENABLING V-Order on a specific Delta write in Fabric Spark?',
    options: [
      '`spark.conf.set("spark.sql.parquet.vorder.enabled", "true")` for the session',
      '`df.write.option("parquet.vorder.enabled", "true").format("delta").save(...)` for one write',
      '`TBLPROPERTIES (delta.parquet.vorder.enabled = true)` on `CREATE TABLE` / `ALTER TABLE` so future writes inherit it',
      '`OPTIMIZE <table> VORDER` to apply V-Order during a compaction pass on existing files',
      '`mssparkutils.lakehouse.enableVOrder("<table>")` to mark a Lakehouse-wide default'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'V-Order can be controlled at three layers: (1) session conf `spark.sql.parquet.vorder.enabled`, (2) per-write option `parquet.vorder.enabled`, (3) table property `delta.parquet.vorder.enabled` so any future write inherits the setting. `OPTIMIZE ... VORDER` applies V-Order during compaction so existing non-V-Ordered files are rewritten in V-Order. There is no `mssparkutils.lakehouse.enableVOrder` API.',
    whyWrong: {
      4: 'mssparkutils does not expose a Lakehouse-level V-Order toggle. Use the conf, write option, or table property.'
    },
    source: SRC_LKD.vorder,
    tags: ['v-order', 'tblproperties', 'optimize']
  }),

  single({
    id: 'lkd-003', domain: 'prepare', subtopic: 'v-order', difficulty: 3,
    prompt:
      'A streaming pipeline writes micro-batches to a Delta table every 30 seconds. Latency-sensitive downstream consumers query via Direct Lake. The team wants to MINIMIZE per-write CPU cost while keeping Direct Lake reads efficient. What is the best pattern?',
    options: [
      'Disable V-Order for the streaming writes and run a daily `OPTIMIZE <table> VORDER` to V-Order the accumulated files',
      'Enable V-Order on every micro-batch write to keep files Direct-Lake-optimal at all times',
      'Disable V-Order permanently — Direct Lake works fine without it',
      'Write to Files/ instead of Tables/ so V-Order does not apply'
    ],
    correct: 0,
    explanation:
      'V-Order adds CPU overhead per write. For streaming, write small files quickly without V-Order, then run a daily compaction job (`OPTIMIZE ... VORDER`) that bin-packs and re-encodes them in V-Order. Direct Lake gets the read benefit on the compacted files; the streaming hot path stays cheap. This is the standard Fabric streaming-to-Direct-Lake pattern.',
    whyWrong: {
      1: 'V-Order on every micro-batch wastes CPU and produces many small V-Ordered files — defeats the purpose.',
      2: 'Disabling permanently sacrifices the Direct Lake read win; the question explicitly wants efficient reads.',
      3: 'Files/ is unmanaged and unavailable to Direct Lake — semantic models cannot consume it.'
    },
    source: SRC_LKD.vorder,
    tags: ['v-order', 'streaming', 'optimize', 'pattern']
  }),

  // ── OPTIMIZE: compaction & ZORDER ────────────────────────────

  single({
    id: 'lkd-004', domain: 'prepare', subtopic: 'delta-optimize', difficulty: 4,
    prompt:
      'A Delta table receives ~5,000 small append files per day from a CDC stream. Analysts complain that ad-hoc Spark SQL queries take 3-5 minutes to scan the table. WHICH single command provides the most direct relief?',
    options: [
      'VACUUM <table> RETAIN 168 HOURS',
      'OPTIMIZE <table>',
      'REFRESH TABLE <table>',
      'ANALYZE TABLE <table> COMPUTE STATISTICS'
    ],
    correct: 1,
    explanation:
      '`OPTIMIZE` bin-packs many small Parquet files into fewer, larger files (target ~1 GB by default in Fabric). Small-file overhead (file open + footer read per file) is typically the dominant cost on tables fed by streaming CDC, so compaction directly reduces scan time.',
    whyWrong: {
      0: 'VACUUM removes obsolete (already-tombstoned) files past retention. It does not compact small ACTIVE files — those stay in the manifest until OPTIMIZE rewrites them.',
      2: 'REFRESH TABLE invalidates Spark\'s cached metadata. Helpful when external writers changed the table, not for small-file scan cost.',
      3: 'ANALYZE collects column statistics for the optimizer. It improves planning, not scan throughput on a small-file-heavy table.'
    },
    source: SRC_LKD.optimize,
    tags: ['delta-optimize', 'compaction', 'small-files'],
    relatedIds: ['lkd-005', 'lkd-008']
  }),

  single({
    id: 'lkd-005', domain: 'prepare', subtopic: 'delta-optimize', difficulty: 4,
    prompt:
      'Given this SQL run against a 4 TB Delta sales table, what does the `ZORDER BY` clause do?\n\n```sql\nOPTIMIZE sales\nWHERE event_date >= "2026-04-01"\nZORDER BY (customer_id, product_sku);\n```',
    options: [
      'Sorts the entire table by (customer_id, product_sku) and rewrites every file',
      'Bin-packs files within the WHERE-matched partitions and co-locates rows by (customer_id, product_sku) so per-file min/max stats enable better data skipping on those columns',
      'Creates a clustered index on (customer_id, product_sku) that is consulted at query time',
      'Adds (customer_id, product_sku) to the table\'s partition columns'
    ],
    correct: 1,
    explanation:
      'OPTIMIZE\'s WHERE clause restricts the operation to matching partitions/files (here, recent dates). ZORDER BY uses Z-ordering (multi-dimensional locality) to co-locate rows that share customer_id / product_sku values into the same Parquet files. Subsequent queries that filter on those columns get tighter per-file min/max stats, so Spark skips far more files. ZORDER does NOT create an index — Delta has no clustered indexes.',
    whyWrong: {
      0: 'The WHERE clause limits OPTIMIZE to a subset; it does not rewrite the entire table.',
      2: 'Delta does not support clustered indexes. ZORDER is a write-time data layout operation, not a runtime index.',
      3: 'Partition columns are declared at table creation. ZORDER is independent of partitioning and does not change the partition scheme.'
    },
    source: SRC_LKD.optimize,
    tags: ['delta-optimize', 'zorder', 'data-skipping', 'code-reading']
  }),

  multi({
    id: 'lkd-006', domain: 'prepare', subtopic: 'delta-optimize', difficulty: 4,
    prompt:
      'Which scenarios are GOOD candidates for running OPTIMIZE on a Fabric Lakehouse Delta table?',
    options: [
      'Right after a large nightly append job that produced thousands of small files',
      'Before the first Direct Lake framing of a newly populated 100 GB fact table',
      'After a wide MERGE that touched 60% of the table\'s files (creating many rewritten partial files)',
      'On every cell execution of an interactive notebook to keep file counts low',
      'On a tiny dimension table (5 MB total) that is rewritten daily via overwrite'
    ],
    correct: [0, 1, 2],
    explanation:
      'OPTIMIZE pays off when the table has accumulated many small files (post-stream, post-append) or when MERGE/UPDATE has fragmented files. Running it before Direct Lake framing on a large fact ensures the framing reads V-Ordered, well-sized files. It is wasteful on tiny tables (no small-file problem) and absolutely wrong to run per-cell — OPTIMIZE is an expensive bulk operation.',
    whyWrong: {
      3: 'Per-cell OPTIMIZE wastes capacity. Run it as a scheduled job, not interactively per cell.',
      4: 'A 5 MB overwrite-mode table replaces all files cleanly each run — there is no fragmentation to compact.'
    },
    source: SRC_LKD.optimize,
    tags: ['delta-optimize', 'when-to-run']
  }),

  // ── VACUUM ───────────────────────────────────────────────────

  single({
    id: 'lkd-007', domain: 'prepare', subtopic: 'delta-vacuum', difficulty: 4,
    prompt:
      'A team runs `VACUUM sales RETAIN 24 HOURS` and gets an error: `IllegalArgumentException: requirement failed: Are you sure you would like to vacuum files with such a low retention period?`. What is the cause and the safe fix?',
    options: [
      'The table is locked by an active Spark job — wait for it to finish and retry',
      'Delta enforces a minimum retention of `delta.deletedFileRetentionDuration` (default 7 days / 168 hours) to protect concurrent readers and time-travel; bypass requires `SET spark.databricks.delta.retentionDurationCheck.enabled = false`',
      'VACUUM only accepts retention in DAYS, not HOURS — convert to `RETAIN 1 DAYS`',
      'The table\'s protocol version does not support VACUUM — upgrade with `UPGRADE TABLE`'
    ],
    correct: 1,
    explanation:
      'Delta refuses retention shorter than `delta.deletedFileRetentionDuration` (default 7 days) because deleting files younger than the retention window can break (a) concurrent readers still holding open snapshots and (b) time-travel queries against recent versions. To override (only when you have verified no concurrent readers and accept loss of recent time-travel), set `spark.databricks.delta.retentionDurationCheck.enabled = false` for the session.',
    whyWrong: {
      0: 'The error message explicitly cites retention, not a lock. Spark concurrency is handled via Delta\'s optimistic concurrency control.',
      2: 'VACUUM accepts both HOURS and DAYS; the unit is not the issue.',
      3: 'VACUUM has been part of Delta since v1 and does not require a protocol upgrade.'
    },
    source: SRC_LKD.vacuum,
    tags: ['delta-vacuum', 'retention', 'safety'],
    relatedIds: ['lkd-008']
  }),

  multi({
    id: 'lkd-008', domain: 'prepare', subtopic: 'delta-vacuum', difficulty: 4,
    prompt:
      'Which statements about VACUUM on a Fabric Delta table are TRUE?',
    options: [
      'VACUUM only deletes files that are no longer referenced by ANY version of the table within the retention window',
      'Running VACUUM with the default retention deletes files older than 7 days that have been tombstoned by overwrite/delete/merge operations',
      'VACUUM compacts small active files into larger ones',
      'After VACUUM, time travel can no longer reach versions whose files have been removed',
      'VACUUM requires the table to be quiesced (no active writes) for the duration of the run'
    ],
    correct: [0, 1, 3],
    explanation:
      'VACUUM removes files that are (a) NOT referenced by any current snapshot AND (b) older than the retention threshold. Default retention is 7 days; that is what protects time-travel within the window. Once files are vacuumed, time-travel queries that need them fail. VACUUM does NOT compact (that is OPTIMIZE) and does NOT require write quiescing — it uses Delta\'s standard concurrency model.',
    whyWrong: {
      2: 'VACUUM is for stale-file cleanup, not compaction. Use OPTIMIZE for compaction.',
      4: 'VACUUM coexists with active writers via Delta\'s optimistic concurrency control. Quiescing is not required.'
    },
    source: SRC_LKD.vacuum,
    tags: ['delta-vacuum', 'retention', 'time-travel']
  }),

  // ── Time travel ───────────────────────────────────────────────

  single({
    id: 'lkd-009', domain: 'prepare', subtopic: 'delta-time-travel', difficulty: 4,
    prompt:
      'A bug report claims yesterday\'s 14:00 UTC sales numbers in a downstream report do not match what the Lakehouse Delta table currently returns. To inspect the table EXACTLY as it was at that moment, which Spark SQL query is correct?\n\n```sql\nSELECT region, SUM(amount)\nFROM sales\n  -- ??? --\nWHERE event_date = "2026-05-04"\nGROUP BY region;\n```',
    options: [
      'TIMESTAMP AS OF "2026-05-04 14:00:00"',
      'AS OF TIMESTAMP "2026-05-04 14:00:00"',
      'WITH SNAPSHOT ("2026-05-04 14:00:00")',
      'OPTION (TIMESTAMP "2026-05-04 14:00:00")'
    ],
    correct: 0,
    explanation:
      'Delta SQL syntax for time travel is `<table> TIMESTAMP AS OF "<ts>"` (or `VERSION AS OF <n>`). The clause goes immediately after the table name. The PySpark equivalent is `.option("timestampAsOf", ...)` or `.option("versionAsOf", n)` on the reader.',
    whyWrong: {
      1: 'The keyword order is `TIMESTAMP AS OF`, not `AS OF TIMESTAMP`.',
      2: 'There is no `WITH SNAPSHOT` clause in Delta SQL.',
      3: 'OPTION hints are SQL Server / T-SQL syntax, not Spark SQL Delta syntax.'
    },
    source: SRC_LKD.timeTravel,
    tags: ['delta-time-travel', 'sql', 'code-reading']
  }),

  multi({
    id: 'lkd-010', domain: 'prepare', subtopic: 'delta-time-travel', difficulty: 4,
    prompt:
      'Which statements about Delta time travel in Fabric are TRUE?',
    options: [
      '`DESCRIBE HISTORY <table>` returns one row per commit with the operation, user, timestamp, and operation parameters',
      'Time travel via `VERSION AS OF` is bound by file retention — versions whose files were vacuumed cannot be read',
      'Time travel works through the Lakehouse SQL Endpoint using T-SQL `FOR TIMESTAMP AS OF` syntax',
      'Time travel can read versions older than the table\'s `delta.logRetentionDuration` if the underlying Parquet files still exist',
      'Time travel snapshot reads cannot be combined with predicate pushdown — they always full-scan the historical files'
    ],
    correct: [0, 1],
    explanation:
      'DESCRIBE HISTORY is the standard transaction-log inspector. Time travel is bound by file retention — once VACUUM removes the files for a version, that version is unreadable even if the log still references it. The Lakehouse SQL endpoint does NOT currently support time travel via T-SQL — that is a Spark/Delta SQL feature. Time-travel reads still benefit from predicate pushdown and partition pruning. And reads also need the LOG entries (not just files), so logRetentionDuration is also a gate.',
    whyWrong: {
      2: 'The Lakehouse SQL Endpoint (T-SQL surface) does not currently expose Delta time-travel syntax. Use Spark SQL or the Spark DataFrame API for time travel.',
      3: 'Time travel requires both the log entries AND the data files. If `delta.logRetentionDuration` (default 30 days) has dropped the commit, the version is unreadable even with files present.',
      4: 'Time travel reads use the standard Spark planner and benefit from predicate pushdown and partition pruning normally.'
    },
    source: SRC_LKD.timeTravel,
    tags: ['delta-time-travel', 'describe-history', 'retention']
  }),

  single({
    id: 'lkd-011', domain: 'prepare', subtopic: 'delta-time-travel', difficulty: 4,
    prompt:
      'A bad MERGE landed at version 47 of a Delta table and corrupted 12,000 rows. The team needs to ROLL THE TABLE BACK to version 46 in place. Which command does this in Spark SQL?',
    options: [
      'SELECT * FROM <table> VERSION AS OF 46',
      'RESTORE TABLE <table> TO VERSION AS OF 46',
      'ALTER TABLE <table> ROLLBACK TO 46',
      'DELETE FROM <table>@v47'
    ],
    correct: 1,
    explanation:
      '`RESTORE TABLE ... TO VERSION AS OF <n>` (or `TO TIMESTAMP AS OF "<ts>"`) creates a new commit that makes the table state identical to that historical version. The DataFrame API equivalent is `DeltaTable.forName(...).restoreToVersion(46)`. Importantly, this is itself a new commit (e.g. v48) — it does not delete history, so you can roll forward again if needed.',
    whyWrong: {
      0: 'A SELECT with VERSION AS OF reads the historical snapshot but does not modify the table.',
      2: 'There is no `ALTER TABLE ... ROLLBACK TO` syntax in Delta SQL.',
      3: '`@v47` is the Delta version-suffix syntax for path/table reads; it does not delete a commit.'
    },
    source: SRC_LKD.timeTravel,
    tags: ['delta-time-travel', 'restore', 'rollback']
  }),

  // ── Schema evolution ─────────────────────────────────────────

  single({
    id: 'lkd-012', domain: 'prepare', subtopic: 'delta-schema-evolution', difficulty: 4,
    prompt:
      'A nightly load appends a DataFrame to a Delta table. The DataFrame has a NEW column `loyalty_tier` that does not exist in the target table; all existing columns match exactly. Which option allows the append to succeed AND adds `loyalty_tier` to the table schema?',
    options: [
      '.option("mergeSchema", "true").mode("append")',
      '.option("overwriteSchema", "true").mode("append")',
      '.option("autoMerge.enabled", "true").mode("append")',
      'No option — Delta auto-evolves additive schema changes by default'
    ],
    correct: 0,
    explanation:
      '`mergeSchema = true` allows additive changes (new columns, optional fields) to be merged into the target schema during an append. The new column appears in subsequent reads with NULL for older rows. `overwriteSchema` is for replacing the schema entirely (with overwrite mode). `autoMerge.enabled` is the session conf alias (`spark.databricks.delta.schema.autoMerge.enabled`) that makes mergeSchema implicit — but the explicit per-write option is the standard answer here.',
    whyWrong: {
      1: 'overwriteSchema is for `mode("overwrite")` workflows where you intentionally replace the entire schema. Used in append, it is misleading and wrong.',
      2: '`autoMerge.enabled` is a session conf, not a write option. Setting `.option("autoMerge.enabled", ...)` does nothing.',
      3: 'Delta enforces schema by default — additive changes are NOT auto-evolved without an explicit signal.'
    },
    source: SRC_LKD.schemaEvolution,
    tags: ['delta-schema-evolution', 'mergeSchema', 'append']
  }),

  multi({
    id: 'lkd-013', domain: 'prepare', subtopic: 'delta-schema-evolution', difficulty: 5,
    prompt:
      'Which Delta schema-evolution behaviors are TRUE for a write with `mergeSchema = true` (append mode)?',
    options: [
      'Adding a new column at the end of the schema is allowed',
      'Adding a new nested field inside an existing struct column is allowed',
      'Changing an existing column from INT to STRING is allowed (Delta auto-widens)',
      'Reordering existing columns relative to the target schema is NOT a problem — Delta matches columns by NAME, not position',
      'Dropping a column from the incoming DataFrame implicitly drops it from the table'
    ],
    correct: [0, 1, 3],
    explanation:
      'mergeSchema is purely ADDITIVE: new top-level columns and new nested struct fields are accepted. Column matching is by NAME, so reordering does not matter. mergeSchema does NOT change existing column types (you would need a separate `ALTER TABLE ... ALTER COLUMN ... TYPE` with an explicit type-widening protocol feature) and does NOT drop columns (DROP requires `ALTER TABLE ... DROP COLUMN` and a column-mapping-enabled table).',
    whyWrong: {
      2: 'mergeSchema does not change existing column types. INT→STRING type evolution requires either an explicit ALTER TABLE or the type-widening table feature, which is opt-in via TBLPROPERTIES.',
      4: 'Omitting a column from the source DataFrame does NOT drop it from the table — it just writes NULL for that column on the new rows.'
    },
    source: SRC_LKD.schemaEvolution,
    tags: ['delta-schema-evolution', 'mergeSchema', 'type-widening']
  }),

  single({
    id: 'lkd-014', domain: 'prepare', subtopic: 'delta-schema-evolution', difficulty: 4,
    prompt:
      'Examine this PySpark snippet meant to overwrite a Delta table with a NEW schema (different column types):\n\n```python\n(new_df.write\n    .format("delta")\n    .mode("overwrite")\n    .option("overwriteSchema", "true")\n    .saveAsTable("dim_product"))\n```\n\nWhat happens when this runs against an existing `dim_product` table?',
    options: [
      'The table is rejected because mode("overwrite") cannot change schema, regardless of options',
      'The table\'s data AND schema are replaced with `new_df`\'s contents and schema',
      'Only the rows are replaced; the original schema is preserved and the new_df is implicitly cast to it',
      'A new version is appended; the old data and schema remain available via time travel'
    ],
    correct: 1,
    explanation:
      '`mode("overwrite") + overwriteSchema=true` replaces both the data and the schema. The previous version is still reachable via time travel (until VACUUM removes the files), but the current snapshot of `dim_product` reflects the new schema. Without `overwriteSchema=true`, the same write would fail on a schema mismatch (overwrite mode keeps the existing schema by default).',
    whyWrong: {
      0: 'Overwrite + overwriteSchema is the canonical way to change a table\'s schema entirely. It is fully supported.',
      2: 'Without `overwriteSchema=true`, schema is preserved and a mismatched write fails. With it, the schema IS replaced.',
      3: 'Time travel preserves history; the CURRENT version is the new schema and data.'
    },
    source: SRC_LKD.schemaEvolution,
    tags: ['delta-schema-evolution', 'overwriteSchema', 'code-reading']
  }),

  // ── DESCRIBE HISTORY & protocol ──────────────────────────────

  single({
    id: 'lkd-015', domain: 'prepare', subtopic: 'lakehouse-tables', difficulty: 3,
    prompt:
      'A data engineer wants to know WHO ran the last MERGE against a Delta table, WHEN, and HOW MANY rows it touched. Which command surfaces all of that?',
    options: [
      'SHOW TBLPROPERTIES <table>',
      'DESCRIBE HISTORY <table>',
      'DESCRIBE EXTENDED <table>',
      'EXPLAIN MERGE INTO <table> ...'
    ],
    correct: 1,
    explanation:
      'DESCRIBE HISTORY returns one row per commit with: version, timestamp, userId/userName, operation (e.g. MERGE), operationParameters, operationMetrics (numTargetRowsUpdated, numTargetRowsInserted, numTargetRowsDeleted, etc.), readVersion, isolationLevel, and engineInfo.',
    whyWrong: {
      0: 'SHOW TBLPROPERTIES lists configured table properties (delta.minReaderVersion, etc.), not commit history.',
      2: 'DESCRIBE EXTENDED shows current schema and table location — not commit history.',
      3: 'EXPLAIN shows a query plan, not historical commits.'
    },
    source: SRC_LKD.dml,
    tags: ['lakehouse-tables', 'describe-history', 'audit']
  }),

  multi({
    id: 'lkd-016', domain: 'prepare', subtopic: 'lakehouse-tables', difficulty: 5,
    prompt:
      'Which statements about Delta protocol versions and Iceberg interop in Fabric are TRUE?',
    options: [
      'Each Delta table has a `minReaderVersion` and `minWriterVersion` recorded in its protocol',
      'Enabling a feature like deletion vectors or column mapping bumps the writer (and possibly reader) protocol version, and OLDER clients can no longer write to or read from the table',
      'Fabric supports surfacing OneLake Delta tables to Iceberg readers via metadata virtualization (no data copy)',
      'Downgrading a Delta table\'s protocol version is a built-in single-command operation',
      'Iceberg-on-OneLake virtualization writes a parallel Iceberg metadata directory alongside the Delta `_delta_log`'
    ],
    correct: [0, 1, 2, 4],
    explanation:
      'Delta protocol versions gate which features a client must support. Enabling features like deletion vectors, column mapping, or type widening raises the required protocol version, and clients below that version are locked out. Fabric\'s Iceberg interop surfaces Delta tables to Iceberg-only readers by writing parallel Iceberg metadata against the same Parquet files (no data duplication). Downgrading is NOT a single-command operation — it requires deliberately rewriting the table without the feature.',
    whyWrong: {
      3: 'Delta protocol versions can only be UPGRADED via `ALTER TABLE ... SET TBLPROPERTIES (...)` or implicit feature enablement. There is no built-in single-command DOWNGRADE — you must rewrite the table without the offending feature.'
    },
    source: SRC_LKD.protocol,
    tags: ['delta-protocol', 'iceberg', 'interop']
  }),

  // ── DML: append vs overwrite vs merge ────────────────────────

  single({
    id: 'lkd-017', domain: 'prepare', subtopic: 'delta-schema-evolution', difficulty: 4,
    prompt:
      'A daily ETL needs to UPSERT yesterday\'s deltas into a 500 GB customer dimension table by `customer_id`. Which write pattern is correct?',
    options: [
      'mode("append") — Delta deduplicates by primary key automatically',
      'mode("overwrite") with the new + old data unioned',
      'A `MERGE INTO target USING source ON target.customer_id = source.customer_id WHEN MATCHED THEN UPDATE SET * WHEN NOT MATCHED THEN INSERT *` statement',
      'mode("ignore") — Delta routes existing keys to UPDATE and new keys to INSERT'
    ],
    correct: 2,
    explanation:
      'MERGE INTO is the Delta upsert primitive. It atomically updates matched rows and inserts new ones in a single transaction. Append blindly inserts duplicates. Overwrite-with-union rewrites the entire 500 GB table for a daily delta — wasteful. mode("ignore") only skips the write if the table already exists; it does not branch on row keys.',
    whyWrong: {
      0: 'append does not deduplicate. Delta has no implicit primary keys.',
      1: 'Overwriting the entire table for a daily delta wastes capacity and breaks Direct Lake framing on the table.',
      3: 'mode("ignore") means "skip the write entirely if the table exists" — it has nothing to do with row-level branching.'
    },
    source: SRC_LKD.dml,
    tags: ['delta', 'merge', 'upsert']
  }),

  multi({
    id: 'lkd-018', domain: 'prepare', subtopic: 'delta-schema-evolution', difficulty: 4,
    prompt:
      'Which patterns make a Delta MERGE pipeline IDEMPOTENT (safe to re-run on the same source batch without double-applying)?',
    options: [
      'Use `txnAppId` and `txnVersion` options on the writer so Delta records the transaction id and skips repeated commits with the same id',
      'Stage the source batch in a temp Delta table tagged with a `batch_id`, and have the MERGE include `AND target.last_batch_id < source.batch_id` in the match condition',
      'Wrap the MERGE in a `BEGIN TRANSACTION ... COMMIT` block — Delta\'s ACID will deduplicate',
      'Hash the source batch and store the hash in `_delta_log/_processed_batches.json`',
      'Set the MERGE\'s `isolationLevel` to `SERIALIZABLE` — duplicates are filtered automatically'
    ],
    correct: [0, 1],
    explanation:
      'txnAppId + txnVersion is the official Delta Streaming idempotency mechanism — Delta refuses commits whose (appId, version) pair has already been recorded. Tagging source rows with a monotonic batch_id and including a `last_batch_id < source.batch_id` predicate in the MERGE condition prevents re-applying older or already-applied batches. There is no `BEGIN TRANSACTION` syntax in Spark SQL — every MERGE is its own atomic commit. There is no `_processed_batches.json` convention. Isolation level controls concurrency semantics, not deduplication.',
    whyWrong: {
      2: 'Spark SQL has no BEGIN/COMMIT block. Each Delta operation is its own atomic commit. ACID does not deduplicate logically equivalent operations.',
      3: 'Delta does not look at any `_processed_batches.json`. Custom hash files are not tracked by the engine.',
      4: 'Isolation level controls visibility of concurrent commits, not deduplication of repeated operations.'
    },
    source: SRC_LKD.dml,
    tags: ['delta', 'merge', 'idempotency', 'streaming']
  }),

  single({
    id: 'lkd-019', domain: 'prepare', subtopic: 'delta-optimize', difficulty: 4,
    prompt:
      'A team runs frequent UPDATE and DELETE statements on a Delta table. Over 3 months the table\'s file count has grown from 200 to 18,000 with no net data growth. WHY?',
    options: [
      'Delta UPDATE/DELETE are in-place edits that fragment the underlying Parquet files',
      'Delta UPDATE/DELETE rewrite each affected file: the unchanged rows are written to a new file and the original is tombstoned, accumulating many small files when changes are scattered',
      'A bug in the runtime — file count should decrease automatically after every DML operation',
      'The transaction log creates one new Parquet file per commit regardless of data changes'
    ],
    correct: 1,
    explanation:
      'Parquet is immutable. Delta UPDATE/DELETE work by reading each touched file, writing a NEW file with the surviving (or modified) rows, and tombstoning the original in the log. When changes are scattered across many files, you produce many partial replacement files and tombstone many originals — file count balloons even if net rows do not change. The cure is OPTIMIZE (compaction) plus VACUUM (to physically delete tombstoned files past retention).',
    whyWrong: {
      0: 'There are no in-place edits in Parquet — that is the whole reason for file rewriting.',
      2: 'There is no auto-shrink. Compaction is explicit via OPTIMIZE.',
      3: 'The log files (JSON / checkpoint Parquet) are tiny and live in `_delta_log/`. They are not the data file count.'
    },
    source: SRC_LKD.dml,
    tags: ['delta', 'update', 'delete', 'fragmentation']
  }),

  // ── Streaming sinks ──────────────────────────────────────────

  multi({
    id: 'lkd-020', domain: 'prepare', subtopic: 'lakehouse-tables', difficulty: 5,
    prompt:
      'A Spark Structured Streaming job writes to a Delta sink in Fabric. Which design choices help achieve EXACTLY-ONCE semantics end-to-end?',
    options: [
      'Use the built-in Delta sink: `df.writeStream.format("delta").option("checkpointLocation", ...)` — it handles exactly-once for plain appends',
      'For MERGE-based sinks, wrap the write in `foreachBatch` and pass `txnAppId` + `txnVersion` to the inner write so Delta deduplicates on retry',
      'Set `spark.databricks.delta.write.idempotency` to `auto` — Delta auto-dedups any sink',
      'Persist the source offsets to the checkpoint location so the stream can resume from the exact last-committed offset',
      'Disable Delta\'s transaction log for streaming sinks to reduce overhead'
    ],
    correct: [0, 1, 3],
    explanation:
      'Plain-append streaming to Delta is exactly-once via the built-in sink + checkpoint location. For non-trivial sinks (MERGE, custom writes), foreachBatch + Delta\'s idempotent-write options (txnAppId/txnVersion) give exactly-once on retries. Source offsets in the checkpoint enable correct resume. There is no `auto-dedup` conf; you must opt into idempotency mechanisms. And disabling the transaction log breaks Delta entirely.',
    whyWrong: {
      2: 'There is no `spark.databricks.delta.write.idempotency = auto` setting. Use `txnAppId` + `txnVersion` explicitly.',
      4: 'The Delta transaction log is what makes Delta Delta. You cannot disable it for a sink — it is mandatory.'
    },
    source: SRC_LKD.streaming,
    tags: ['streaming', 'foreachBatch', 'exactly-once', 'delta']
  }),

  single({
    id: 'lkd-021', domain: 'prepare', subtopic: 'lakehouse-tables', difficulty: 5,
    prompt:
      'Examine this PySpark Structured Streaming MERGE pattern. What is the role of `batchId` here?\n\n```python\ndef upsert_to_delta(microBatchDF, batchId):\n    target = DeltaTable.forName(spark, "silver.orders")\n    (target.alias("t")\n        .merge(microBatchDF.alias("s"), "t.order_id = s.order_id")\n        .whenMatchedUpdateAll()\n        .whenNotMatchedInsertAll()\n        .execute())\n\n(stream_df.writeStream\n    .foreachBatch(upsert_to_delta)\n    .option("checkpointLocation", "Files/checkpoints/orders")\n    .start())\n```',
    options: [
      'batchId is the Delta version number that will be assigned to the resulting commit',
      'batchId is a monotonically increasing micro-batch identifier from Structured Streaming, useful for idempotency keys when combined with txnAppId/txnVersion on the inner Delta write',
      'batchId is the Spark job id (sparkContext.applicationId) for the streaming application',
      'batchId is the offset of the source Kafka topic\'s latest message in the batch'
    ],
    correct: 1,
    explanation:
      '`foreachBatch(fn)` invokes `fn(microBatchDF, batchId)` once per micro-batch, where batchId is a monotonically increasing long. Combined with `txnAppId` (a stable application id) and `txnVersion = batchId` on the inner Delta write, you get exactly-once on retry: Delta refuses to re-commit a (appId, version) pair it has already seen. The function as shown is NOT yet idempotent — to make it so, the merge would need to chain `.option("txnAppId", "orders-stream").option("txnVersion", batchId)` on a writer.',
    whyWrong: {
      0: 'The Delta version is assigned by Delta on commit, independent of batchId.',
      2: 'batchId is a micro-batch counter, not the Spark application id.',
      3: 'batchId is generic to Structured Streaming and not tied to any specific source like Kafka offsets.'
    },
    source: SRC_LKD.streaming,
    tags: ['streaming', 'foreachBatch', 'merge', 'code-reading']
  }),

  // ── Files vs Tables ───────────────────────────────────────────

  single({
    id: 'lkd-022', domain: 'prepare', subtopic: 'lakehouse-files', difficulty: 4,
    prompt:
      'A data scientist drops a 4 GB CSV into a Lakehouse\'s `/Files/landing/` area. They expect to immediately query it via the Lakehouse SQL Endpoint. Why does the table NOT appear in the SQL Endpoint?',
    options: [
      'The CSV is too large; the SQL Endpoint has a 1 GB upload limit',
      'Files in `/Files/` are unmanaged and NOT registered in the Lakehouse metastore. The SQL Endpoint only exposes Delta tables under `/Tables/`',
      'The SQL Endpoint requires a manual "Refresh metastore" click in the workspace',
      'The CSV needs a `.delta` extension to be auto-discovered'
    ],
    correct: 1,
    explanation:
      '`/Files/` is the unmanaged area: drop any format, but it is invisible to the SQL Endpoint and to Direct Lake because nothing is registered with the metastore. To make the data queryable via SQL, load it into a Delta table under `/Tables/` (e.g., via `spark.read.csv(...).write.format("delta").saveAsTable(...)` or the Lakehouse UI "Load to Tables").',
    whyWrong: {
      0: 'There is no 1 GB upload limit on the SQL Endpoint — the issue is registration, not size.',
      2: 'No manual refresh click registers /Files/ content. You must convert to a Delta table.',
      3: 'Delta tables are folders containing Parquet + a `_delta_log/` directory, not `.delta` files. CSVs do not become Delta by extension.'
    },
    source: SRC_LKD.files,
    tags: ['lakehouse-files', 'lakehouse-tables', 'sql-endpoint']
  }),

  // ── Ordering: end-to-end maintenance pass ────────────────────

  order({
    id: 'lkd-023', domain: 'prepare', subtopic: 'delta-optimize', difficulty: 4,
    prompt:
      'A team operates a 1 TB Delta fact table with daily appends, weekly UPDATE/DELETE for late-arriving corrections, and Direct Lake exposure. Order the WEEKLY maintenance steps from FIRST to LAST.',
    options: [
      'Run the corrective UPDATE / DELETE / MERGE operations against the table',
      'Run `OPTIMIZE <table> ZORDER BY (<hot_filter_columns>) VORDER` to compact and re-V-Order the affected files',
      'Run `DESCRIBE HISTORY <table>` to confirm the OPTIMIZE commit succeeded and inspect operationMetrics',
      'Run `VACUUM <table>` (default 7-day retention) to reclaim storage from the now-tombstoned pre-OPTIMIZE files',
      'Trigger a Direct Lake reframe (manual or via a refresh) so the semantic model picks up the compacted, V-Ordered files'
    ],
    explanation:
      'Apply DML first (the operations that fragment the table), then OPTIMIZE to compact and re-V-Order, then verify via DESCRIBE HISTORY, then VACUUM to physically delete tombstoned files (must be AFTER OPTIMIZE so the right files are tombstoned, and after the retention window has been considered). Finally reframe Direct Lake so the semantic model sees the new file layout.',
    whyWrong: {},
    source: SRC_LKD.optimize,
    tags: ['ordering', 'delta-optimize', 'vacuum', 'direct-lake']
  }),

  // ── Ordering: rolling back a bad commit ──────────────────────

  order({
    id: 'lkd-024', domain: 'prepare', subtopic: 'delta-time-travel', difficulty: 4,
    prompt:
      'A bad MERGE corrupted a Delta table at version 152. Order the steps to safely roll the table back to version 151 and verify.',
    options: [
      'Run `DESCRIBE HISTORY <table> LIMIT 5` and confirm version 152 is the bad commit and 151 is the last known-good version',
      'Run `SELECT COUNT(*), SUM(<key_metric>) FROM <table> VERSION AS OF 151` to validate that v151 returns the expected business numbers',
      'Run `RESTORE TABLE <table> TO VERSION AS OF 151` to create a new commit (v153) that matches v151',
      'Re-run `DESCRIBE HISTORY <table> LIMIT 5` and confirm a new RESTORE commit exists at v153',
      'Trigger a Direct Lake reframe so any downstream semantic model picks up the restored state'
    ],
    explanation:
      'Identify the bad version, validate that the target rollback version is actually correct (don\'t blindly trust v151), execute RESTORE, verify a new RESTORE commit landed, and reframe Direct Lake. Always validate the target version before restoring — a MERGE may have been silently wrong for several commits.',
    whyWrong: {},
    source: SRC_LKD.timeTravel,
    tags: ['ordering', 'delta-time-travel', 'restore', 'rollback']
  }),

  // ── Convert to Delta + governance ────────────────────────────

  single({
    id: 'lkd-025', domain: 'prepare', subtopic: 'lakehouse-tables', difficulty: 4,
    prompt:
      'A team has 12 large Parquet datasets in `/Files/legacy/` that they want to expose to the SQL Endpoint and Direct Lake without rewriting the underlying data. Which approach is the MOST EFFICIENT?',
    options: [
      'Use `spark.read.parquet(...).write.format("delta").saveAsTable(...)` for each — full rewrite',
      'Use `CONVERT TO DELTA parquet.\\`Files/legacy/<dataset>\\`` to create a Delta table in place by writing only a `_delta_log/` (existing Parquet files are reused)',
      'Create a OneLake Shortcut from `/Tables/` to `/Files/legacy/` — Delta wraps it automatically',
      'Rename each `/Files/legacy/<dataset>` to `/Tables/<dataset>` — the Lakehouse auto-promotes it to Delta'
    ],
    correct: 1,
    explanation:
      '`CONVERT TO DELTA parquet.\\`<path>\\`` writes a `_delta_log/` directory next to the existing Parquet files, registering them as a Delta table without rewriting the data. After conversion, the path can be moved/registered under `/Tables/` so the SQL Endpoint and Direct Lake see it. Full rewrite is wasteful when CONVERT works. Shortcuts surface external data but do not turn raw Parquet into a managed Delta table. Renaming a folder does not auto-create a `_delta_log/`.',
    whyWrong: {
      0: 'A full rewrite copies every byte of 12 large datasets — wasteful when CONVERT TO DELTA produces the same end state by writing only metadata.',
      2: 'Shortcuts route to existing data; they do not synthesize a `_delta_log/` for raw Parquet. The data still must be Delta to be queryable as a Delta table.',
      3: 'Folder renames have no effect on table-ness. The `_delta_log/` directory is what makes a folder a Delta table.'
    },
    source: SRC_LKD.tables,
    tags: ['lakehouse-tables', 'convert-to-delta', 'parquet']
  })

];
