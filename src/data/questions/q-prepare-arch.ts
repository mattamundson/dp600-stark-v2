import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

export const prepareArchitecture: Question[] = [
  single({
    id: 'arch-001', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 1,
    prompt: 'Which Fabric item is BEST suited for SQL-first analytical workloads with structured schemas, ACID multi-statement transactions, and T-SQL semantics?',
    options: ['Lakehouse', 'Warehouse', 'Eventhouse', 'Notebook'],
    correct: 1,
    explanation: 'Fabric Warehouse is the SQL-first analytical store. It exposes a managed T-SQL surface with multi-statement transactions and schema-on-write — designed for BI workloads.',
    whyWrong: {
      0: 'Lakehouse exposes Delta with Spark + read-only SQL endpoint, not T-SQL DDL/DML.',
      2: 'Eventhouse uses KQL for streaming/time-series data.',
      3: 'Notebook is a development environment, not a storage item.'
    },
    source: SRC.fabricArch,
    tags: ['warehouse', 'architecture']
  }),
  single({
    id: 'arch-002', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 2,
    prompt: 'A data engineer needs to read raw Delta files with Spark AND query the same data via SQL endpoint for reporting. Which item natively supports both?',
    options: ['Warehouse', 'Lakehouse', 'Eventhouse', 'Semantic model'],
    correct: 1,
    explanation: 'Lakehouse uniquely provides both a Spark engine for code-first work and a SQL analytics endpoint for BI consumption — both reading the same Delta tables.',
    whyWrong: {
      0: 'Warehouse has T-SQL but is not Spark-native; you cannot run notebooks against its tables in the same direct way.',
      2: 'Eventhouse is KQL-only and not Spark-shaped.',
      3: 'Semantic models are consumption-side, not storage.'
    },
    source: SRC.fabricArch,
    tags: ['lakehouse', 'spark', 'sql-endpoint']
  }),
  single({
    id: 'arch-003', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 2,
    prompt: 'Which Fabric item is purpose-built for high-volume streaming ingestion and time-series analytics with KQL as the primary query language?',
    options: ['Lakehouse', 'Warehouse', 'Eventhouse', 'Dataflow Gen2'],
    correct: 2,
    explanation: 'Eventhouse hosts KQL Databases — designed for telemetry, IoT, logs, and time-series data with sub-second ingest-to-query.',
    whyWrong: {
      0: 'Lakehouse is Delta-based and batch-oriented.',
      1: 'Warehouse is SQL-first; not optimized for streaming.',
      3: 'Dataflow Gen2 is a transformation tool, not a database.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'kql']
  }),
  single({
    id: 'arch-004', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    prompt: 'Which item is the orchestration layer that schedules and chains data movement and transformation tasks (similar to Azure Data Factory pipelines)?',
    options: ['Data pipeline', 'Notebook', 'Dataflow Gen2', 'Reflex (Activator)'],
    correct: 0,
    explanation: 'Data pipelines (powered by Data Factory in Fabric) orchestrate copy activities, notebook runs, dataflow refreshes, and conditional logic on schedules.',
    whyWrong: {
      1: 'Notebooks compute; they do not orchestrate.',
      2: 'Dataflow Gen2 is a transformation tool.',
      3: 'Reflex/Activator triggers downstream actions on data conditions; not a general-purpose orchestrator.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'orchestration']
  }),
  multi({
    id: 'arch-005', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    prompt: 'Which statements about Lakehouse vs Warehouse are TRUE in current Fabric?',
    options: [
      'Lakehouse exposes a read-only SQL endpoint; Warehouse exposes a full T-SQL endpoint with DDL/DML',
      'Both ultimately store data as Delta-Parquet in OneLake',
      'Warehouse supports multi-table ACID transactions; Lakehouse SQL endpoint generally does not',
      'A Lakehouse can be queried by Spark notebooks but a Warehouse cannot'
    ],
    correct: [0, 1, 2],
    explanation: 'Both store Delta in OneLake. Lakehouse SQL endpoint is read-only; Warehouse offers full T-SQL with cross-table ACID. Spark CAN query a Warehouse via OneLake (e.g., Lakehouse shortcut to Warehouse tables), so the option claiming it cannot is false.',
    whyWrong: {
      3: 'Warehouse data CAN be accessed from Spark via OneLake — the SQL surface is one-way (T-SQL writes), but reads via Delta are open.'
    },
    source: SRC.fabricArch,
    tags: ['lakehouse', 'warehouse', 'comparison']
  }),
  single({
    id: 'arch-006', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'Which medallion-architecture layer is generally for cleansed, conformed data ready for downstream business calculations?',
    options: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    correct: 1,
    explanation: 'Bronze = raw landing; Silver = cleansed/conformed/de-duplicated; Gold = business-ready aggregates and serving tables. Silver is the cleansed-and-conformed layer.',
    whyWrong: {
      0: 'Bronze is raw, untransformed.',
      2: 'Gold is business-ready / serving layer.',
      3: 'Platinum is not a standard layer.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'bronze-silver-gold']
  }),
  single({
    id: 'arch-007', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'In a medallion Lakehouse, which layer most directly feeds Power BI semantic models in Direct Lake mode?',
    options: ['Bronze', 'Silver', 'Gold', 'A separate Warehouse outside the medallion'],
    correct: 2,
    explanation: 'Gold tables are designed for downstream consumption — pre-aggregated, conformed, and modeled for BI. Direct Lake reads from Gold for fast reporting.',
    whyWrong: {
      0: 'Bronze is raw — too dirty for direct BI.',
      1: 'Silver is cleansed but typically not yet shaped for BI consumption.',
      3: 'A separate Warehouse can serve BI but is not implied by the medallion layering.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'direct-lake']
  }),
  // ── OneLake shortcuts / mirroring ────────────────────────────
  single({
    id: 'ol-001', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 2,
    prompt: 'Which Fabric feature creates a virtual reference to data in another OneLake workspace, ADLS Gen2, or Amazon S3 — without copying the data?',
    options: ['Mirroring', 'Shortcut', 'Pipeline copy activity', 'Dataflow Gen2 reference'],
    correct: 1,
    explanation: 'Shortcuts create zero-copy virtual references. Reads go through Fabric to the source-of-truth location while honoring source-side ACLs.',
    whyWrong: {
      0: 'Mirroring continuously replicates a source DB into Fabric — physical copy, not a virtual reference.',
      2: 'Pipeline copy moves bytes physically.',
      3: 'A dataflow reference is a transformation step, not a storage shortcut.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'onelake']
  }),
  single({
    id: 'ol-002', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A Lakehouse shortcut points to ADLS Gen2 data. A user with workspace Viewer role queries the shortcut. The query fails. Why?',
    options: [
      'Viewer cannot use shortcuts',
      'The user must also be granted access to the underlying ADLS storage account',
      'Shortcuts only work for OneLake-internal targets',
      'The Lakehouse must be marked "external" to allow shortcuts'
    ],
    correct: 1,
    explanation: 'Shortcuts honor source-side permissions. The shortcut itself does not grant ADLS access — the user querying through Fabric still needs ADLS-side identity for the read to succeed.',
    whyWrong: {
      0: 'Viewers can use shortcuts; permissions are the issue.',
      2: 'Shortcuts work to ADLS Gen2 and S3 (and Dataverse, GCS, etc.).',
      3: 'There is no "external" mark required.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'permissions']
  }),
  single({
    id: 'ol-003', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'Mirrored Databases in Fabric provide which capability?',
    options: [
      'Continuous one-way replication of an external database (Azure SQL DB, Cosmos DB, Snowflake) into OneLake as Delta',
      'Bidirectional sync between two Fabric Warehouses',
      'A read-only snapshot taken once per day',
      'A backup copy of a Lakehouse'
    ],
    correct: 0,
    explanation: 'Mirroring is continuous, one-way replication of an external source database into Fabric as Delta in OneLake. Compute is free; data lands fast and is queryable via SQL endpoint and Direct Lake.',
    whyWrong: {
      1: 'Mirroring is one-way from external source, not bidirectional Fabric-to-Fabric.',
      2: 'It is continuous, not daily snapshots.',
      3: 'It is not a backup tool.'
    },
    source: SRC.mirroring,
    tags: ['mirroring']
  }),
  single({
    id: 'ol-004', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A team needs to expose a slowly-changing reference table from another business unit\'s Lakehouse to their own model with NO data movement and NO duplication. The other BU updates the table monthly and the team wants those updates to flow automatically. Which choice fits?',
    options: ['Shortcut to the other BU\'s table', 'Mirror the other BU\'s Lakehouse', 'Pipeline copy on a monthly schedule', 'Dataflow Gen2 reference'],
    correct: 0,
    explanation: 'Shortcut: zero copy, automatic propagation of updates, single source of truth in the other BU\'s workspace. Exactly the requirement.',
    whyWrong: {
      1: 'Mirroring duplicates data.',
      2: 'Pipeline copy duplicates data and adds operational risk (refresh failures).',
      3: 'Dataflow Gen2 reference still creates a copy in your workspace.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'design']
  }),
  // ── Transformation tools ─────────────────────────────────────
  single({
    id: 'tr-001', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 2,
    prompt: 'Dataflow Gen2 in Fabric is built on which language for transformations?',
    options: ['DAX', 'M (Power Query)', 'PySpark', 'KQL'],
    correct: 1,
    explanation: 'Dataflow Gen2 uses Power Query M for transformations, the same authoring experience as Power BI Desktop and Excel Power Query.',
    whyWrong: {
      0: 'DAX is for semantic model expressions, not ETL.',
      2: 'PySpark is for notebooks.',
      3: 'KQL is for Eventhouse/Kusto queries.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'm-language']
  }),
  single({
    id: 'tr-002', domain: 'prepare', subtopic: 'dataflow-gen2', difficulty: 3,
    prompt: 'A Dataflow Gen2 has been authored in Power Query Online. Which destination is supported for its output?',
    options: [
      'Power BI semantic model only (legacy Gen1 behavior)',
      'Lakehouse, Warehouse, KQL Database, or Azure SQL DB (multiple destinations supported)',
      'Reflex / Activator only',
      'Only OneLake shortcut endpoints'
    ],
    correct: 1,
    explanation: 'Gen2 supports multiple output destinations including Fabric items (Lakehouse, Warehouse, KQL DB) and external sinks (Azure SQL DB). This is one of the headline differentiators from Gen1.',
    whyWrong: {
      0: 'That was Gen1 behavior; Gen2 is more flexible.',
      2: 'Reflex is not a dataflow destination.',
      3: 'Shortcuts are not destinations; they are read-side virtual references.'
    },
    source: SRC.dataflow,
    tags: ['dataflow-gen2', 'destinations']
  }),
  single({
    id: 'tr-003', domain: 'prepare', subtopic: 'transform', difficulty: 4,
    prompt: 'A team must transform 5 TB/day of clickstream data with complex logic, custom UDFs, and unit-tested code in Git. Which tool fits BEST?',
    options: [
      'Dataflow Gen2 with Power Query M',
      'Spark notebook (PySpark/Scala) under .pbip-style version control',
      'A T-SQL stored procedure in Warehouse',
      'A Reflex trigger chain'
    ],
    correct: 1,
    explanation: 'For high-volume code-first transformations with custom UDFs and Git workflow, notebooks are the right tool. Dataflow is great low-code; T-SQL is great BI-shaped. Notebooks are the code-first path.',
    whyWrong: {
      0: 'Dataflow scales but is low-code; harder to unit test.',
      2: 'T-SQL works but custom UDFs in T-SQL are limited and high-volume Spark-shaped jobs are awkward.',
      3: 'Reflex is for triggers, not transformation.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'transformation']
  }),
  single({
    id: 'tr-004', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'Which pipeline activity is the right choice for a high-volume, schema-aware copy from an on-prem SQL Server to a Lakehouse?',
    options: ['Copy Data activity', 'Notebook activity', 'Lookup activity', 'Web activity'],
    correct: 0,
    explanation: 'Copy Data is the workhorse for moving bytes between sources and sinks at scale, with parallelism, partitioning, and connector ecosystem support.',
    whyWrong: {
      1: 'Notebook activity runs Spark — overkill for simple copy and not the data movement-optimized path.',
      2: 'Lookup is for fetching small reference values.',
      3: 'Web activity calls REST endpoints.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'copy-activity']
  }),
  multi({
    id: 'tr-005', domain: 'prepare', subtopic: 'transform', difficulty: 4,
    prompt: 'When choosing between Dataflow Gen2 and Spark Notebook for transformation, which factors favor NOTEBOOK?',
    options: [
      'Need for unit-tested, version-controlled code',
      'Custom Python/Scala UDFs',
      'Low-code authoring by an analyst with no Spark experience',
      'Very high data volume with cluster-tunable parallelism'
    ],
    correct: [0, 1, 3],
    explanation: 'Notebooks: code-first, Git-friendly, custom UDFs, scalable parallelism. Dataflow: low-code, analyst-friendly. Pick the one that matches the team\'s skills and the workload\'s shape.',
    whyWrong: {
      2: 'Low-code analyst authoring is the Dataflow Gen2 sweet spot, not notebooks.'
    },
    source: SRC.notebooks,
    tags: ['transformation', 'choice']
  }),
  // ── T-SQL Warehouse ─────────────────────────────────────────
  single({
    id: 'tsql-001', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 3,
    prompt: 'Which T-SQL feature is supported in Fabric Warehouse?',
    options: [
      'CREATE TABLE … AS SELECT (CTAS)',
      'Identity columns auto-increment',
      'Cursor declarations in stored procedures',
      'CLR functions'
    ],
    correct: 0,
    explanation: 'CTAS is supported in Fabric Warehouse for creating tables from query results. Some classic T-SQL features (IDENTITY auto-increment, cursors, CLR) are not yet supported in the Polaris-based engine.',
    whyWrong: {
      1: 'IDENTITY columns are not supported with auto-increment in Fabric Warehouse (use sequences or generate keys via merge logic).',
      2: 'Cursors are not supported.',
      3: 'CLR functions are not supported.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'warehouse', 'features']
  }),
  single({
    id: 'tsql-002', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A T-SQL MERGE between two Warehouse tables in Fabric runs slowly. Which factor MOST affects performance?',
    options: [
      'Statistics on the join columns',
      'Use of cursors instead of MERGE',
      'Whether the tables have IDENTITY primary keys',
      'V-Order being enabled'
    ],
    correct: 0,
    explanation: 'Statistics drive the optimizer\'s plan. Stale or missing statistics on the join columns are the most common reason a MERGE underperforms in any T-SQL engine, including Fabric Warehouse.',
    whyWrong: {
      1: 'Cursors are not even available in Fabric Warehouse; MERGE is what you have.',
      2: 'IDENTITY is not supported and would not affect MERGE perf.',
      3: 'V-Order is for VertiPaq/Direct Lake; it does not affect Warehouse SQL execution.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'merge', 'performance']
  }),
  // ── KQL ──────────────────────────────────────────────────────
  single({
    id: 'kql-001', domain: 'prepare', subtopic: 'kql', difficulty: 2,
    prompt: 'Which KQL operator filters rows based on a predicate?',
    options: ['project', 'where', 'extend', 'summarize'],
    correct: 1,
    explanation: '`where` filters rows. `project` selects columns, `extend` adds computed columns, `summarize` aggregates.',
    whyWrong: {
      0: 'project picks/renames columns.',
      2: 'extend adds computed columns.',
      3: 'summarize aggregates groups.'
    },
    source: SRC.kql,
    tags: ['kql', 'where']
  }),
  single({
    id: 'kql-002', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'Which KQL aggregation correctly counts events per hour?',
    options: [
      'T | summarize count() by bin(Timestamp, 1h)',
      'T | project Timestamp | distinct count()',
      'T | where Timestamp >= ago(1h) | count',
      'T | aggregate count() over Timestamp'
    ],
    correct: 0,
    explanation: '`bin(Timestamp, 1h)` buckets events into hourly windows; `summarize count() by bin(...)` counts per bucket.',
    whyWrong: {
      1: 'distinct does not produce per-hour grouping.',
      2: 'This counts events in the last hour only, not per hour over time.',
      3: 'aggregate is not a KQL operator.'
    },
    source: SRC.kql,
    tags: ['kql', 'summarize', 'bin']
  }),
  single({
    id: 'kql-003', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'A KQL `T | join U on Id` is producing fewer rows than expected. What is the most likely cause?',
    options: [
      'The default join kind is `innerunique` which de-duplicates on the LEFT side',
      'KQL joins always produce a Cartesian product',
      'KQL does not support joins on equality',
      '`on` requires a string column'
    ],
    correct: 0,
    explanation: 'KQL\'s default join kind is `innerunique` (the engine de-duplicates the LEFT table on the join keys before joining). To get standard inner-join semantics, specify `kind=inner` or `kind=leftouter` etc.',
    whyWrong: {
      1: 'Joins are not Cartesian by default.',
      2: 'KQL supports equality joins.',
      3: 'Any column type can be used.'
    },
    source: SRC.kql,
    tags: ['kql', 'join', 'innerunique']
  }),
  multi({
    id: 'kql-004', domain: 'prepare', subtopic: 'kql', difficulty: 4,
    prompt: 'Which KQL operators help PERFORMANCE for queries that reuse a subresult or look up small tables?',
    options: [
      '`materialize()` to cache an inline subresult',
      '`lookup` for joining against a small dimension',
      '`bag_unpack()` for splitting dynamic columns',
      '`render` for charting'
    ],
    correct: [0, 1],
    explanation: '`materialize()` caches a subquery once and reuses it. `lookup` is optimized for joining against small reference tables, faster than a generic `join`. `bag_unpack` and `render` are functional but not perf tools.',
    whyWrong: {
      2: 'bag_unpack splits dynamic objects — useful, but not a perf optimization.',
      3: 'render visualizes; no perf impact.'
    },
    source: SRC.kql,
    tags: ['kql', 'performance']
  }),
  single({
    id: 'kql-005', domain: 'prepare', subtopic: 'kql', difficulty: 3,
    prompt: 'Which KQL function returns a relative timestamp like "7 days ago"?',
    options: ['ago(7d)', 'now() - 7', 'datetime_add(7d, now())', 'time(7d)'],
    correct: 0,
    explanation: '`ago()` is the canonical KQL helper for relative time. `ago(7d)` = now minus 7 days.',
    whyWrong: {
      1: 'KQL does not allow subtracting an int from a datetime like that.',
      2: 'datetime_add adds time but with this signature it would not produce 7 days ago.',
      3: '`time()` is a different concept (timespan literal).'
    },
    source: SRC.kql,
    tags: ['kql', 'time']
  }),
  single({
    id: 'kql-006', domain: 'prepare', subtopic: 'eventhouse', difficulty: 3,
    prompt: 'Which Fabric item hosts KQL Databases for real-time analytics?',
    options: ['Eventhouse', 'Lakehouse', 'Warehouse', 'Notebook'],
    correct: 0,
    explanation: 'Eventhouse is the parent item that contains KQL Databases. KQL Databases are where streaming/event data lives and is queried with KQL.',
    whyWrong: {
      1: 'Lakehouse hosts Delta tables, not KQL DBs.',
      2: 'Warehouse is T-SQL.',
      3: 'Notebook is a development environment.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'kql']
  })
];
