import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const prepareMore: Question[] = [
  // ── KQL deeper patterns (6) ──────────────────────────────────
  single({
    id: 'px-001', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'A telemetry table `Events` has a dynamic column `Tags` containing arrays like `["error","retry","auth"]`. Which KQL operator EXPANDS each array element into its own row so you can `summarize` per tag?',
    options: ['mv-expand Tags', 'parse Tags', 'extend Tag = Tags', 'project Tags'],
    correct: 0,
    explanation: '`mv-expand` (multi-value expand) takes a dynamic array column and emits one row per element, the canonical way to unnest arrays before grouping or filtering by element values.',
    whyWrong: {
      1: '`parse` extracts values from a string using a pattern; it does not unnest arrays.',
      2: '`extend` adds a column but does not multiply rows; the array stays an array.',
      3: '`project` only selects columns, no expansion.'
    },
    source: SRC.kql,
    tags: ['kql', 'mv-expand', 'dynamic']
  }),
  single({
    id: 'px-002', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'Logs arrive with a single string column `Message` like `"2026-05-01 ERR user=alice code=503"`. Which KQL operator extracts `User` and `Code` into typed columns using a pattern match?',
    options: ['extract', 'parse Message with * "user=" User " code=" Code:int', 'project-rename', 'mv-apply'],
    correct: 1,
    explanation: '`parse` is purpose-built to pull substrings out of a free-form string column using literal markers and wildcards, optionally typing extracted columns (e.g., `:int`).',
    whyWrong: {
      0: '`extract()` is a scalar regex helper, useful for one value at a time but awkward for multi-field parsing.',
      2: '`project-rename` renames existing columns; it does not parse content.',
      3: '`mv-apply` runs a subquery per array element; not a string parser.'
    },
    source: SRC.kql,
    tags: ['kql', 'parse', 'string']
  }),
  multi({
    id: 'px-003', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which KQL `summarize` patterns correctly compute MULTIPLE aggregations grouped by a 5-minute time bucket?',
    options: [
      'T | summarize Count = count(), AvgLatency = avg(Latency), p95 = percentile(Latency, 95) by bin(Timestamp, 5m)',
      'T | summarize count(), avg(Latency), percentile(Latency, 95) by bin(Timestamp, 5m)',
      'T | aggregate Count, Avg, P95 over 5m',
      'T | summarize by bin(Timestamp, 5m) | count'
    ],
    correct: [0, 1],
    explanation: '`summarize` accepts multiple aggregation expressions in one pass with optional aliases. Both A (with aliases) and B (auto-named) are valid; A is preferred for readability and downstream column references.',
    whyWrong: {
      2: '`aggregate ... over` is not KQL syntax.',
      3: 'This summarizes by bucket then counts buckets — wrong shape; loses per-row metrics.'
    },
    source: SRC.kql,
    tags: ['kql', 'summarize', 'percentile']
  }),
  single({
    id: 'px-004', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'A KQL query computes a 10M-row aggregation and then performs FOUR separate joins against that aggregation. The query is slow. Which single change MOST helps?',
    options: [
      'Wrap the aggregation in `materialize()` and bind it to a `let` variable, then reference it in each join',
      'Add `hint.strategy=broadcast` to each join',
      'Replace `summarize` with `count()`',
      'Add `take 1000` after the aggregation'
    ],
    correct: 0,
    explanation: '`materialize()` instructs the engine to compute the subquery ONCE and cache it for reuse across all four joins, eliminating redundant scans of the 10M source rows. Without it, each join re-evaluates the upstream aggregation.',
    whyWrong: {
      1: 'Broadcast hints help small-table joins but do not address the 4x recomputation problem.',
      2: 'Replacing the aggregation with a count breaks the query semantics.',
      3: '`take 1000` truncates results — wrong answer, not an optimization.'
    },
    source: SRC.kql,
    tags: ['kql', 'materialize', 'performance']
  }),
  single({
    id: 'px-005', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'Which KQL clause renders a per-minute event count as a line chart inside the query result?',
    options: [
      '| summarize count() by bin(Timestamp, 1m) | render timechart',
      '| summarize count() by bin(Timestamp, 1m) | chart line',
      '| summarize count() by bin(Timestamp, 1m) | visualize timechart',
      '| project count() by bin(Timestamp, 1m) | render line'
    ],
    correct: 0,
    explanation: '`render timechart` is the KQL operator that hints the client (KQL queryset, ADX dashboards, Real-Time dashboards) to display the result as a time series line chart, with the time bin column as the x-axis.',
    whyWrong: {
      1: '`chart line` is not valid KQL syntax.',
      2: '`visualize` is not a KQL operator.',
      3: '`project` does not aggregate; the syntax is wrong.'
    },
    source: SRC.kql,
    tags: ['kql', 'render', 'timechart']
  }),
  single({
    id: 'px-006', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which statement about `lookup` vs `join` in KQL is MOST accurate when joining a 1B-row fact table to a 5K-row dimension on `DimId`?',
    options: [
      '`lookup` is optimized for small right-side dimensions and can be significantly faster than `join` for this shape',
      '`lookup` and `join` are identical; the engine rewrites one into the other',
      '`join` is always faster because it parallelizes; `lookup` runs single-threaded',
      '`lookup` requires both tables be the same size; otherwise it errors'
    ],
    correct: 0,
    explanation: '`lookup` is a specialized join optimized for "fact joins to small dimension" — it broadcasts the right side and avoids the de-duplication of `innerunique`. For 1B-row facts joining a 5K dimension, `lookup` typically beats a generic `join`.',
    whyWrong: {
      1: 'They have different semantics and execution paths; not interchangeable.',
      2: 'False — `lookup` parallelizes and is generally faster for this shape.',
      3: 'No size requirement; `lookup` is meant for asymmetric sizes.'
    },
    source: SRC.kql,
    tags: ['kql', 'lookup', 'join', 'performance']
  }),
  // ── Eventhouse / real-time (4) ──────────────────────────────
  single({
    id: 'px-007', domain: 'prepare', subtopic: 'eventhouse', difficulty: 3,
    prompt: 'Which Fabric mechanism enables CONTINUOUS, low-latency ingestion of streaming events directly into a KQL Database without scheduled pipelines?',
    options: [
      'Eventstream sourced from Event Hubs / Kafka / IoT Hub flowing into a KQL Database destination',
      'A Data Pipeline scheduled every 1 minute calling Copy Data',
      'A Spark notebook polling on a 30s loop',
      'A Dataflow Gen2 with auto-refresh enabled'
    ],
    correct: 0,
    explanation: 'Eventstream is the Fabric Real-Time Intelligence streaming ingestion service. It connects to Event Hubs, Kafka, IoT Hub, CDC sources, etc., and writes into a KQL Database (or Lakehouse) destination with sub-second latency, no scheduling required.',
    whyWrong: {
      1: 'Pipelines are micro-batch at best; not true continuous streaming.',
      2: 'A polling notebook is fragile and not the supported pattern.',
      3: 'Dataflow Gen2 refreshes are batch-oriented, not streaming.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'eventstream', 'streaming']
  }),
  single({
    id: 'px-008', domain: 'prepare', subtopic: 'eventhouse', difficulty: 4,
    prompt: 'In a KQL Database, you want raw events landing in `RawEvents` to be automatically enriched and written to `EnrichedEvents` on every ingest. Which feature implements this?',
    options: [
      'Update policy with a transformation function on the source table',
      'A Data Pipeline scheduled every minute',
      'A KQL `materialize()` view',
      'A Reflex (Activator) trigger'
    ],
    correct: 0,
    explanation: 'Update policies execute a KQL transformation function on each ingest into a source table and write the result to a target table — exactly the "ingest-time ETL" pattern for KQL Databases.',
    whyWrong: {
      1: 'Pipelines are external orchestration, not ingest-time transforms inside the engine.',
      2: '`materialize()` is a query-time hint, not an ingest-time hook.',
      3: 'Reflex reacts to data conditions for downstream actions; it does not transform on ingest.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'update-policy']
  }),
  multi({
    id: 'px-009', domain: 'prepare', subtopic: 'eventhouse', difficulty: 3,
    prompt: 'Which sources can flow into an Eventstream as the streaming origin?',
    options: [
      'Azure Event Hubs',
      'Apache Kafka',
      'Azure IoT Hub',
      'A Power BI semantic model'
    ],
    correct: [0, 1, 2],
    explanation: 'Eventstream supports Event Hubs, Kafka, IoT Hub, CDC connectors (Azure SQL DB, Cosmos DB, PostgreSQL), Google Pub/Sub, Amazon Kinesis, and custom apps. Semantic models are consumption-side, not streaming sources.',
    whyWrong: {
      3: 'Semantic models consume data; they do not produce a stream feed into Eventstream.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'eventstream', 'sources']
  }),
  single({
    id: 'px-010', domain: 'prepare', subtopic: 'eventhouse', difficulty: 4,
    prompt: 'You must store 18 months of high-cardinality IoT telemetry (~50K events/sec) for sub-second slice-and-dice queries. Which Fabric store is the BEST fit and why?',
    options: [
      'KQL Database (Eventhouse) — column-store with row-stores, time-series indexing, high-volume ingest, KQL is purpose-built for telemetry',
      'Lakehouse Delta tables — Spark-only access fits IoT',
      'Warehouse — T-SQL is faster than KQL',
      'A semantic model in Direct Lake mode'
    ],
    correct: 0,
    explanation: 'KQL Databases are designed for time-series and telemetry workloads — high-volume continuous ingest, columnstore + rowstore for fast range scans, and KQL operators tuned for time-bucketed aggregations. Lakehouse/Warehouse are batch/BI-shaped.',
    whyWrong: {
      1: 'Lakehouse is batch and lacks the streaming-ingest + sub-second query characteristics.',
      2: 'Warehouse T-SQL is BI-shaped, not optimized for high-cardinality time-series sweeps.',
      3: 'A semantic model is a consumption layer, not a primary store; Direct Lake reads Delta, not KQL.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'time-series', 'design']
  }),
  // ── OneLake shortcuts (4) ────────────────────────────────────
  single({
    id: 'px-011', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'Which OneLake shortcut target lets you query Parquet data sitting in an Amazon S3 bucket without copying it into Fabric?',
    options: ['S3 shortcut', 'Mirroring', 'Pipeline Copy Activity', 'Dataflow Gen2 with S3 connector'],
    correct: 0,
    explanation: 'S3 shortcuts virtually project an S3 path into a Lakehouse so Spark and the SQL endpoint can query the data in place. No bytes are copied into OneLake; reads stream from S3.',
    whyWrong: {
      1: 'Mirroring is for relational databases (Azure SQL DB, Cosmos, Snowflake), not S3 object storage.',
      2: 'Copy Activity duplicates the data into OneLake — exactly what was disallowed.',
      3: 'Dataflow Gen2 also copies data into a destination; not zero-copy.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 's3']
  }),
  single({
    id: 'px-012', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'Which Fabric capability creates a Dataverse shortcut that exposes Dynamics 365 / Power Platform tables in a Lakehouse for analytics?',
    options: [
      'Link to Microsoft Fabric (Dataverse-side) creating an automatic OneLake shortcut',
      'A pipeline Copy Activity from Dataverse to Lakehouse',
      'Dataflow Gen2 importing Dataverse entities',
      'A Power BI dataflow'
    ],
    correct: 0,
    explanation: 'The "Link to Microsoft Fabric" feature in Dataverse exposes selected tables as Delta in OneLake via shortcut. Reads in Fabric reflect Dataverse data without ETL or copy.',
    whyWrong: {
      1: 'Copy Activity duplicates data and runs on schedule; not a shortcut.',
      2: 'Dataflow Gen2 also copies and is on a refresh schedule.',
      3: 'Power BI dataflows are unrelated to Dataverse-to-OneLake shortcuts.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'dataverse']
  }),
  single({
    id: 'px-013', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A Lakehouse needs to expose a Warehouse table for Spark notebook reads. Which approach is the recommended Fabric pattern?',
    options: [
      'Create a OneLake shortcut in the Lakehouse pointing to the Warehouse table\'s OneLake path',
      'Export the Warehouse table to CSV and re-ingest with Copy Activity',
      'Create a Dataflow Gen2 referencing the Warehouse',
      'Use linked server / OPENQUERY from Spark'
    ],
    correct: 0,
    explanation: 'Both Warehouse and Lakehouse store data as Delta in OneLake. A Lakehouse shortcut to the Warehouse table\'s OneLake path lets Spark read the same Delta with no duplication and no refresh lag.',
    whyWrong: {
      1: 'CSV export-and-reingest is wasteful and loses fidelity (types, nullability).',
      2: 'Dataflow copies and adds refresh lag.',
      3: 'OPENQUERY / linked server are SQL Server concepts that do not apply.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'warehouse', 'lakehouse']
  }),
  multi({
    id: 'px-014', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'Which statements about OneLake shortcut PERMISSIONS are TRUE?',
    options: [
      'For shortcuts to ADLS Gen2 / S3, the querying user / workspace identity needs source-side access; the shortcut does not grant it',
      'Shortcuts to other Fabric items honor the source workspace\'s permissions on the target item',
      'Creating a shortcut automatically grants all workspace members access to the underlying source storage',
      'Shortcuts can be created without read access to the source; only the data shows up'
    ],
    correct: [0, 1],
    explanation: 'Shortcuts are virtual references; they do NOT elevate permissions. ADLS/S3 shortcuts require the consumer to also have source-side ACL. Internal Fabric shortcuts respect the source item\'s workspace roles. Misunderstanding this is the most common shortcut footgun.',
    whyWrong: {
      2: 'Shortcuts never auto-grant source-side ACLs — this would be a security vulnerability.',
      3: 'You cannot create a shortcut to data you cannot read; the create-time check enforces it.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'permissions', 'security']
  }),
  // ── Mirroring (3) ────────────────────────────────────────────
  single({
    id: 'px-015', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'Which databases are SUPPORTED as mirroring sources in Fabric (GA or in preview at the time of writing)?',
    options: [
      'Azure SQL Database, Azure Cosmos DB, Snowflake (and Azure SQL Managed Instance, Azure Database for PostgreSQL — expanding list)',
      'On-premises Oracle and DB2 (Db2/AS/400)',
      'MongoDB Atlas and Couchbase only',
      'Any ODBC source via gateway'
    ],
    correct: 0,
    explanation: 'Fabric Mirroring supports Azure SQL DB, Cosmos DB, Snowflake as the headline sources, with Azure SQL MI, PostgreSQL, and others rolling out. The ecosystem is expanding but on-prem Oracle and arbitrary ODBC are NOT mirroring sources today.',
    whyWrong: {
      1: 'On-prem Oracle / DB2 are not mirroring targets; use pipelines or third-party CDC.',
      2: 'MongoDB Atlas / Couchbase are not Fabric mirroring sources.',
      3: 'Mirroring is connector-specific, not generic ODBC.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'sources']
  }),
  single({
    id: 'px-016', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'A Mirrored Database from Snowflake shows ~90 seconds of replication lag during heavy source load. Which response is MOST accurate?',
    options: [
      'Replication lag is expected and visible in the Mirroring monitoring page; Mirroring is near-real-time, not synchronous',
      'Lag indicates a broken mirror and the database must be re-initialized',
      'Lag means Direct Lake fallback is active and queries will fail',
      'Lag can be eliminated by increasing the Fabric capacity SKU'
    ],
    correct: 0,
    explanation: 'Mirroring is near-real-time, asynchronous replication — some lag during heavy write bursts is normal and visible in the monitoring view. It does not mean the mirror is broken or that queries will fail; reads may be slightly stale.',
    whyWrong: {
      1: 'Lag does not require re-initialization unless the mirror has actually failed (separate signal).',
      2: 'Lag does not trigger Direct Lake fallback or query failures.',
      3: 'SKU does not eliminate source-driven asynchronous lag; it can help throughput but lag is intrinsic.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'lag']
  }),
  single({
    id: 'px-017', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'A column is added to a mirrored Azure SQL DB table. How does Fabric Mirroring handle the schema change?',
    options: [
      'The new column is automatically picked up; downstream readers see it on next refresh of metadata',
      'The mirror stops until manually re-initialized to accept the schema change',
      'Schema changes are not supported; the table must be dropped and re-mirrored',
      'Only NULLable columns can be added; everything else breaks the mirror'
    ],
    correct: 0,
    explanation: 'Fabric Mirroring handles ADD COLUMN and similar additive schema changes automatically — the new column propagates and becomes queryable in the mirrored copy. Destructive changes (DROP COLUMN, type narrowing) require more care.',
    whyWrong: {
      1: 'Additive schema changes do not stop the mirror.',
      2: 'Schema changes ARE supported; the table does not need to be re-mirrored for additive changes.',
      3: 'Both NULLable and non-NULLable columns can be added.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'schema-drift']
  }),
  // ── Dataflow Gen2 (3) ───────────────────────────────────────
  single({
    id: 'px-018', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'Which Dataflow Gen2 capability uses a Lakehouse / Warehouse as a transient staging area to enable query folding and improve refresh performance for large transformations?',
    options: ['Staging (enabled per-query)', 'Diagnostics tracing', 'Query Diagnostics', 'Native query passthrough'],
    correct: 0,
    explanation: 'Dataflow Gen2 staging persists query output to a hidden Lakehouse/Warehouse so subsequent transformations fold against SQL — turning M chains into engine-native SQL execution and dramatically improving large-refresh performance.',
    whyWrong: {
      1: 'Diagnostics tracing is for troubleshooting, not performance.',
      2: 'Query Diagnostics is the same — observability, not staging.',
      3: 'Native query passthrough is a separate concept (executing source-native SQL); not the staging mechanism.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'staging']
  }),
  single({
    id: 'px-019', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'Which Dataflow Gen2 feature accelerates copy from a fully-foldable cloud source (e.g., ADLS Gen2 Parquet, Azure SQL DB) to a Lakehouse / Warehouse destination by bypassing the M engine for bulk movement?',
    options: ['Fast copy', 'Query Folding hint', 'Incremental refresh', 'Skip transform'],
    correct: 0,
    explanation: 'Fast copy delegates the bulk data movement to the underlying engine (similar to a pipeline Copy Activity) when the source/sink and shape allow, skipping the row-by-row M engine path. It is the headline performance feature for high-volume Gen2 jobs.',
    whyWrong: {
      1: 'Query folding is implicit; not a named "feature" toggle for fast copy.',
      2: 'Incremental refresh limits how much data is processed, not how fast each row moves.',
      3: '"Skip transform" is not a Dataflow Gen2 feature.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'fast-copy', 'performance']
  }),
  multi({
    id: 'px-020', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 4,
    prompt: 'Which factors are PREREQUISITES or strong enablers for Dataflow Gen2 fast copy to engage?',
    options: [
      'Source connector supports fast copy (e.g., ADLS Gen2, Azure SQL DB, Lakehouse, Warehouse)',
      'No M-side row-level transformations that break folding (filter pushdown only)',
      'Destination is Lakehouse, Warehouse, or another fast-copy-capable sink',
      'Power BI Premium per User license on every consumer'
    ],
    correct: [0, 1, 2],
    explanation: 'Fast copy requires connector support on both ends and a folding-friendly transformation chain. PPU licensing is unrelated — Dataflow Gen2 runs on Fabric capacity.',
    whyWrong: {
      3: 'Licensing is Fabric capacity-based; PPU is not a fast-copy prerequisite.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'fast-copy', 'requirements']
  }),
  // ── Notebooks (3) ────────────────────────────────────────────
  single({
    id: 'px-021', domain: 'prepare', subtopic: 'notebooks', difficulty: 2,
    prompt: 'Inside a Fabric PySpark notebook cell, which magic command executes the cell content as Spark SQL against the attached Lakehouse?',
    options: ['%%sql', '%%scala', '%%pyspark', '%%bash'],
    correct: 0,
    explanation: '`%%sql` is the cell magic that runs the cell as Spark SQL. The result is returned as a Spark DataFrame and rendered in the notebook output.',
    whyWrong: {
      1: '`%%scala` switches to Scala, not SQL.',
      2: '`%%pyspark` is the default kernel mode; not for SQL.',
      3: '`%%bash` runs shell commands and is not generally available in Fabric notebooks.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'magic', 'sql']
  }),
  single({
    id: 'px-022', domain: 'prepare', subtopic: 'notebooks', difficulty: 4,
    prompt: 'Which statement BEST compares `%%sql` (cell magic) and `spark.sql("...")` (Python API) inside a Fabric notebook?',
    options: [
      'Both run on the same Spark SQL engine and produce equivalent execution plans; choice is about cell ergonomics, not performance',
      '`%%sql` is faster because it bypasses Python serialization',
      '`spark.sql()` is faster because it stays in-process',
      '`%%sql` runs on the SQL endpoint while `spark.sql()` runs on Spark — different engines'
    ],
    correct: 0,
    explanation: 'Both `%%sql` and `spark.sql()` compile to identical Spark SQL plans on the same Spark engine. The difference is cell-vs-line ergonomics and how you capture the result; performance is the same.',
    whyWrong: {
      1: 'No serialization difference of meaningful magnitude; both go through Catalyst.',
      2: 'Same engine — neither is "in-process" in a way that matters here.',
      3: '`%%sql` does NOT route to the SQL analytics endpoint; both are Spark SQL.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'spark-sql']
  }),
  single({
    id: 'px-023', domain: 'prepare', subtopic: 'notebooks', difficulty: 3,
    prompt: 'A Fabric notebook needs to read a Delta table named `sales` from a specific Lakehouse. What is the recommended pattern?',
    options: [
      'Attach the Lakehouse as the notebook\'s default and reference the table as `sales` (or `lakehouse.sales`) directly',
      'Hard-code the OneLake URI in every cell',
      'Use `pandas.read_parquet` against an absolute path',
      'Use `requests.get` to fetch each Parquet file'
    ],
    correct: 0,
    explanation: 'Attaching a Lakehouse to a notebook registers its tables in the Spark catalog and makes them queryable by short name with `%%sql` or `spark.read.table()`. This is the supported, portable pattern.',
    whyWrong: {
      1: 'Hard-coding URIs hurts portability across environments (dev/test/prod).',
      2: 'pandas reads single-machine and bypasses Spark — fine for tiny data, wrong for production.',
      3: '`requests.get` for Parquet bytes is a hack and skips Spark entirely.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'lakehouse', 'attach']
  }),
  // ── T-SQL Warehouse (4) ─────────────────────────────────────
  single({
    id: 'px-024', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 3,
    prompt: 'Which T-SQL pattern correctly creates a new Warehouse table populated from a SELECT in one statement?',
    options: [
      'CREATE TABLE dbo.SalesAgg AS SELECT Region, SUM(Amount) AS Total FROM dbo.Sales GROUP BY Region;',
      'SELECT Region, SUM(Amount) AS Total INTO dbo.SalesAgg FROM dbo.Sales GROUP BY Region;',
      'INSERT INTO dbo.SalesAgg AS SELECT ... FROM dbo.Sales;',
      'CREATE TABLE dbo.SalesAgg AS QUERY (SELECT ...);'
    ],
    correct: 0,
    explanation: 'Fabric Warehouse supports CTAS via `CREATE TABLE ... AS SELECT`. This atomically defines the schema from the query result and bulk-loads the data — the canonical pattern for materializing transformations.',
    whyWrong: {
      1: '`SELECT INTO` syntax is not the supported CTAS form in Fabric Warehouse.',
      2: 'Mixed `INSERT ... AS SELECT` is not valid T-SQL.',
      3: '`AS QUERY` is not T-SQL syntax.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'ctas', 'warehouse']
  }),
  multi({
    id: 'px-025', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which statements about Fabric Warehouse data DISTRIBUTION and STATISTICS are TRUE?',
    options: [
      'Fabric Warehouse (Polaris engine) automatically manages data distribution; users do not pick HASH/ROUND_ROBIN distribution like in dedicated SQL pool',
      'Statistics are auto-created and auto-updated, but you can still manually CREATE / UPDATE STATISTICS for tuning hot tables',
      'Stale or missing statistics on join columns are a common cause of slow queries',
      'Users must run `DBCC DISTRIBUTION` weekly to rebalance partitions'
    ],
    correct: [0, 1, 2],
    explanation: 'Polaris auto-manages distribution (no DISTRIBUTION clause). Stats are auto-created and auto-updated, but manual stats updates remain a supported tuning lever. `DBCC DISTRIBUTION` is not a Fabric command — distribution is a managed concern, not a user task.',
    whyWrong: {
      3: 'No `DBCC DISTRIBUTION` exists; Polaris handles physical layout. This option mixes up dedicated SQL pool habits with Fabric.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'distribution', 'statistics', 'polaris']
  }),
  single({
    id: 'px-026', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A nightly load uses MERGE to upsert ~50M rows into a 2B-row dimension. The MERGE plan shows a hash join with a poor cardinality estimate. Which action is the FIRST tuning move?',
    options: [
      'UPDATE STATISTICS on the join columns of both tables',
      'Drop all indexes (Fabric Warehouse does not use them)',
      'Switch to a cursor-based row-by-row upsert',
      'Disable V-Order on the destination table'
    ],
    correct: 0,
    explanation: 'Bad cardinality estimates almost always trace to stale or missing statistics. Updating stats on the MERGE join keys gives the optimizer the row-count information it needs to pick a better join strategy and memory grant.',
    whyWrong: {
      1: 'Index management in Fabric Warehouse is automated; dropping nonexistent indexes does nothing.',
      2: 'Cursors are not supported in Fabric Warehouse.',
      3: 'V-Order applies to consumption-side optimizations (Direct Lake / VertiPaq); it does not affect Warehouse query plans.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'merge', 'statistics', 'tuning']
  }),
  order({
    id: 'px-027', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Order the steps for a robust Warehouse MERGE-based daily load (source already landed in `stg.SalesDelta`):',
    options: [
      'Validate row counts and key uniqueness in stg.SalesDelta',
      'Update statistics on the MERGE join columns of dim.Sales and stg.SalesDelta',
      'Run MERGE dim.Sales target USING stg.SalesDelta source ON keys WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT',
      'Verify rowcount changes and run reconciliation queries against the target'
    ],
    explanation: 'Validate inputs first so you do not corrupt the dimension. Update stats next so the optimizer plans the MERGE well. Execute the MERGE. Reconcile after. This sequence catches data-quality issues BEFORE they propagate.',
    source: SRC.tsql,
    tags: ['tsql', 'merge', 'workflow']
  }),
  // ── Pipelines orchestration (3) ─────────────────────────────
  single({
    id: 'px-028', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'Which Data Pipeline construct lets you reuse the SAME pipeline definition with different inputs (e.g., date, source table) at runtime?',
    options: [
      'Pipeline parameters with values supplied per trigger / per invocation',
      'Hard-coded pipeline copies — one per input',
      'Activity-level retry policies',
      'Dataflow Gen2 query parameters only'
    ],
    correct: 0,
    explanation: 'Pipeline parameters are runtime inputs that callers (manual run, scheduled trigger, parent pipeline) supply. Activities reference them with `@pipeline().parameters.<name>` to drive table names, dates, file paths, etc.',
    whyWrong: {
      1: 'Cloning pipelines per input defeats the purpose of orchestration.',
      2: 'Retry policies are unrelated to parameterization.',
      3: 'Dataflow query parameters work inside dataflows; pipeline parameterization is a pipeline-level construct.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'parameters']
  }),
  multi({
    id: 'px-029', domain: 'prepare', subtopic: 'pipelines', difficulty: 4,
    prompt: 'Which Data Pipeline mechanisms support PROPER error handling and conditional dependency between activities?',
    options: [
      'Activity dependency conditions: Succeeded, Failed, Completed, Skipped',
      'If Condition activity to branch on an expression',
      'Try-catch via a Failure-dependent activity that logs and rethrows',
      'A global `ON ERROR RESUME NEXT` setting at the pipeline level'
    ],
    correct: [0, 1, 2],
    explanation: 'Pipelines model error flow through dependency conditions on activity edges (Succeeded/Failed/Completed/Skipped), the If Condition activity for explicit branching, and Failure-dependent activities for try/catch-style logging. There is NO global "resume next" pipeline setting.',
    whyWrong: {
      3: 'No such global setting exists; error handling is per-edge / per-activity.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'error-handling', 'dependencies']
  }),
  order({
    id: 'px-030', domain: 'prepare', subtopic: 'pipelines', difficulty: 4,
    prompt: 'Order the activities to pass a value from one activity to another in a Fabric Data Pipeline (parent fetches a high-watermark, then a Copy uses it):',
    options: [
      'Lookup activity queries the metadata store and returns the high-watermark value',
      'Set Variable activity captures the Lookup output (e.g., @activity(\'Lookup1\').output.firstRow.Watermark)',
      'Copy Data activity references the variable in its source query (e.g., WHERE ts > @{variables(\'wm\')})',
      'Stored Procedure / Web activity persists the new max watermark for the next run'
    ],
    explanation: 'Lookup retrieves the value, Set Variable stores it for use across activities, Copy consumes it in the source query, and the final activity persists the new watermark for the next run — the canonical incremental-load pattern in pipelines.',
    source: SRC.pipelines,
    tags: ['pipelines', 'variables', 'incremental-load']
  })
];
