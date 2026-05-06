// 15 Database Mirroring "trap" flashcards — confidently-wrong patterns that fail in production.
// Each card teaches WHY the trap exists, not just the rule. Deck slug 'storage-modes'.

import type { Flashcard } from '../../lib/schema';

export const mirroringTraps: Flashcard[] = [
  { id: 'fc-mir-001', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A team tries to mirror an on-premises SQL Server database into Fabric. The Mirror wizard finds no compatible source.',
    back: 'Fabric Database Mirroring supports only specific cloud-hosted sources: Azure SQL Database, Azure SQL Managed Instance, Azure Cosmos DB (NoSQL API), Snowflake, and Azure Database for PostgreSQL (Flexible Server). On-premises SQL Server is NOT supported — use Dataflow Gen2, ADF, or Fabric Data Pipeline for on-prem ingestion. Availability also varies: some sources are GA, others remain in preview; always confirm the current status in the Fabric release notes before committing to an architecture.',
    tags: ['mirroring', 'trap', 'supported-sources', 'on-premises'],
    sourceAnchor: { category: 'mirroring', note: 'Supported source DBs: GA vs preview vs unsupported' } },

  { id: 'fc-mir-002', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A data engineer uses a Shortcut to "mirror" a Snowflake table into OneLake to avoid copying data.',
    back: 'A Shortcut is a POINTER — it references the source location without copying data. A Mirrored Database is a COPY — Fabric reads from the source (via CDC / change feed) and writes replicated Delta files into OneLake. The distinction matters: Shortcuts have near-zero storage cost but incur source-query cost and latency on every read; Mirrors incur OneLake storage cost but serve reads locally from Delta at Direct-Lake speed. Choosing wrong means either unexpected egress/query cost (using Shortcuts when you need local performance) or stale data (using Mirrors and forgetting replication lag).',
    tags: ['mirroring', 'trap', 'shortcut', 'copy-vs-pointer', 'cost'],
    sourceAnchor: { category: 'mirroring', note: 'Mirror = COPY (incremental sync), Shortcut = POINTER (no copy)' } },

  { id: 'fc-mir-003', deck: 'storage-modes', difficulty: 3,
    front: 'TRAP: An architect promises "real-time" dashboards from a Mirrored Database and sets an SLA of seconds.',
    back: '"Near-real-time" in Fabric Mirroring typically means end-to-end latency of under one minute under normal conditions — NOT sub-second. Lag accumulates from three sources: (1) CDC/change-feed polling interval at the source, (2) network transfer and Fabric ingestion pipeline, (3) Delta file commit and framing in OneLake. Heavy source write load, large transactions, or schema changes can push latency beyond a minute. For true sub-second freshness, use Eventhouse/KQL with Direct-Ingestion streams instead.',
    tags: ['mirroring', 'trap', 'latency', 'near-real-time', 'sla'],
    sourceAnchor: { category: 'mirroring', note: 'Near-real-time semantics: typically <1 min, not sub-second' } },

  { id: 'fc-mir-004', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A developer builds a Direct Lake model on top of a Mirrored Database and can\'t find the Delta files to verify V-Order.',
    back: 'Mirrored Database landing path in OneLake is: `<workspace>/<mirrored-db-name>.MirroredDatabase/Files/LandingZone/<schema>/<table>/`. Files are Delta format with V-Order applied automatically — making them Direct-Lake-ready without any manual OPTIMIZE step. This path is fixed; you cannot rename the `.MirroredDatabase` folder. Shortcuts or Direct Lake models must reference this exact path. If the path is wrong (e.g. pointing at the workspace root), binding fails silently and falls back to DirectQuery.',
    tags: ['mirroring', 'trap', 'onelake-path', 'direct-lake', 'delta'],
    sourceAnchor: { category: 'mirroring', note: 'OneLake landing path structure for mirrored tables' } },

  { id: 'fc-mir-005', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A column is added upstream in Azure SQL DB. The mirrored table in Fabric automatically shows it.',
    back: 'Adding a column upstream DOES propagate to the mirror — but the semantic model or Direct Lake binding does NOT automatically see it. You must still trigger a model reframe (dataset Refresh via REST or scheduled) to expose the new column downstream. Renaming or dropping a column is MORE disruptive: the mirror can fail to reconcile the change and may require reconfiguration (stopping + restarting mirroring for that table). DDL handling is additive-safe but non-additive DDL is high-risk.',
    tags: ['mirroring', 'trap', 'ddl', 'schema-evolution', 'column-add'],
    sourceAnchor: { category: 'mirroring', note: 'DDL handling: column add propagates; rename/drop needs reconfiguration' } },

  { id: 'fc-mir-006', deck: 'storage-modes', difficulty: 5,
    front: 'TRAP: A source table\'s VARCHAR(100) column is widened to VARCHAR(200) upstream. The mirror silently drops rows.',
    back: 'Type WIDENING (VARCHAR(100) → VARCHAR(200), INT → BIGINT) typically succeeds because the Delta schema accommodates the larger type. Type NARROWING (BIGINT → INT) or INCOMPATIBLE changes (VARCHAR → DATE) can cause the CDC pipeline to fail silently for affected rows — the mirror continues without error but those rows are not replicated. The failure surfaces only in Replication Metrics (missed rows counter). Always widen types rather than narrow, and monitor the metrics dashboard after any source DDL change.',
    tags: ['mirroring', 'trap', 'schema-evolution', 'type-widening', 'silent-failure'],
    sourceAnchor: { category: 'mirroring', note: 'Type widening vs narrowing vs incompatible — silent vs explicit failure' } },

  { id: 'fc-mir-007', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A data engineer uses Dataflow Gen2 to copy a 50 GB operational table daily into Fabric "because it\'s simpler than configuring mirroring".',
    back: 'Decision tree: (1) SOURCE IS SUPPORTED for mirroring AND you need near-continuous freshness (<5 min) AND the table is large → USE MIRRORING (CDC-based incremental, no full-scan cost). (2) You need transformations during ingest, complex fanout, or the source is unsupported → USE DATAFLOW GEN2 or PIPELINE. (3) You need < daily batch with custom logic → USE PIPELINE. Mirroring is config-driven and runs continuously; Dataflow/Pipeline are code-driven and scheduled. Using Dataflow for a 50 GB table that changes continuously burns refresh capacity and introduces hourly latency — a classic wrong-tool choice.',
    tags: ['mirroring', 'trap', 'decision-tree', 'dataflow-gen2', 'pipeline'],
    sourceAnchor: { category: 'mirroring', note: 'Mirror vs Dataflow Gen2 vs Pipeline decision criteria' } },

  { id: 'fc-mir-008', deck: 'storage-modes', difficulty: 3,
    front: 'TRAP: A manager sees no line item for "mirroring replication" on the Fabric capacity bill and assumes mirroring is free.',
    back: 'Source replication itself (reading from the source DB and writing to OneLake) is included in Fabric capacity — there is no per-row or per-GB charge for the replication operation. However, you still pay: (1) OneLake STORAGE for the mirrored Delta files (billed like any OneLake data), (2) CU consumption when the mirror\'s background processes run against the capacity, and (3) egress costs if source DB is in a different Azure region. "Free replication" does not mean zero cost — it means the replication compute is pooled into your capacity rather than billed separately.',
    tags: ['mirroring', 'trap', 'cost', 'capacity', 'billing'],
    sourceAnchor: { category: 'mirroring', note: 'Cost model: included in capacity, but storage + CU + egress still apply' } },

  { id: 'fc-mir-009', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A Mirrored Database stops replicating silently and the team only notices days later when reports show stale data.',
    back: 'Two monitoring surfaces exist: (1) REPLICATION STATUS — a per-table status flag (Running / Error / Paused) visible in the Fabric portal Mirrored Database item. (2) REPLICATION METRICS — latency trend and row-count deltas, surfaced in the same panel. Common silent-failure modes: lapsed managed identity / expired service principal (auth failure causes pause without alert by default); source DDL rejection (incompatible type change); source CDC/change-feed disabled by a DBA. Set up a monitor alert on replication status or integrate a pipeline that checks the metrics API — do not rely on downstream report complaints.',
    tags: ['mirroring', 'trap', 'monitoring', 'replication-status', 'auth'],
    sourceAnchor: { category: 'mirroring', note: 'Monitoring: Replication status + metrics; common failure modes' } },

  { id: 'fc-mir-010', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A team expects the mirrored table to be queryable seconds after enabling mirroring on a 200 GB table.',
    back: 'Mirroring starts with a FULL INITIAL SNAPSHOT — a complete read of the source table written as Delta files in OneLake. For a 200 GB table this can take hours; the table is NOT queryable (or shows zero rows) until the snapshot completes. Only after the snapshot does INCREMENTAL CDC-based sync begin with near-real-time lag. Progress is visible in Replication Metrics. Plan initial snapshot time into any go-live schedule — treating the mirror as "instantly available" leads to empty-dashboard incidents.',
    tags: ['mirroring', 'trap', 'initial-snapshot', 'incremental-sync', 'cdc'],
    sourceAnchor: { category: 'mirroring', note: 'Initial snapshot (full) vs incremental (CDC); snapshot lag on large tables' } },

  { id: 'fc-mir-011', deck: 'storage-modes', difficulty: 5,
    front: 'TRAP: A team enables mirroring for Azure SQL DB but the wizard says "change feed not supported" on their database.',
    back: 'Each source has distinct server-side prerequisites: AZURE SQL DB requires the database to have system-assigned managed identity enabled AND the Fabric-managed change feed feature switched on (ALTER DATABASE ... SET CHANGE_FEED = ON — not the same as SQL Server CDC). SNOWFLAKE requires Change Tracking enabled on the source tables (ALTER TABLE ... ENABLE CHANGE_TRACKING). COSMOS DB requires the analytical store / change feed to be enabled on the container at creation time — you cannot add it post-hoc to an existing container without migration. Missing any of these causes the mirroring wizard to fail or silently produce an empty mirror.',
    tags: ['mirroring', 'trap', 'prerequisites', 'azure-sql', 'snowflake', 'cosmos-db', 'change-feed'],
    sourceAnchor: { category: 'mirroring', note: 'Source-side requirements: change tracking, change feed, managed identity' } },

  { id: 'fc-mir-012', deck: 'storage-modes', difficulty: 3,
    front: 'TRAP: A senior engineer says "Mirroring is just ADF Copy Activity with a scheduling wrapper."',
    back: 'Mirroring and ADF Copy are architecturally opposite: MIRRORING is PUSH-DOWN CONFIG-DRIVEN — Fabric manages a persistent CDC listener on the source, triggers writes automatically, and you configure it through the Fabric portal UI with no code. ADF COPY is PULL-BASED CODE-DRIVEN — you define a pipeline with explicit source/sink connectors, mapping, scheduling, and transformation logic in JSON/GUI. Mirroring has no transformation capability (whole-table only), whereas ADF Copy supports column mapping, derived columns, and full Mapping Data Flows. Using ADF Copy "because it\'s familiar" for a supported mirroring source wastes engineering effort on scheduling and monitoring that mirroring handles automatically.',
    tags: ['mirroring', 'trap', 'adf', 'copy-activity', 'architecture'],
    sourceAnchor: { category: 'mirroring', note: 'Mirroring vs ADF Copy: push-down config vs pull-based code' } },

  { id: 'fc-mir-013', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A Fabric workspace is in East US but the source Azure SQL DB is in West Europe. The team assumes latency is the only downside.',
    back: 'Cross-region mirroring has two cost dimensions beyond latency: (1) AZURE EGRESS COST — data leaving West Europe to reach the Fabric capacity in East US is billed at Azure inter-region egress rates (typically $0.02–0.08/GB depending on regions). For a high-churn table this adds up fast. (2) LATENCY increases the CDC batch window, pushing "near-real-time" lag from <1 min toward several minutes. Best practice: provision the Fabric capacity in the same Azure region as the source DB. If that\'s impossible, quantify the egress cost against the freshness requirement before committing.',
    tags: ['mirroring', 'trap', 'cross-region', 'egress-cost', 'latency'],
    sourceAnchor: { category: 'mirroring', note: 'Cross-region: latency and egress cost implications' } },

  { id: 'fc-mir-014', deck: 'storage-modes', difficulty: 4,
    front: 'TRAP: A compliance requirement says only non-PII columns should be in Fabric. The team adds a row filter in the Mirroring configuration to exclude sensitive rows.',
    back: 'ROW FILTERING IS NOT SUPPORTED in Fabric Database Mirroring — the mirror replicates WHOLE TABLES. You cannot filter rows at the source, and there is no WHERE clause in the mirroring config. Column-level exclusions vary by source (some connectors allow you to exclude specific columns during setup), but are not universally available. For compliance use cases: either exclude the entire sensitive table from mirroring and use a pipeline with explicit masking, or mirror the table and apply column-level security / row-level security in the semantic model layer on top of the mirrored data.',
    tags: ['mirroring', 'trap', 'row-filter', 'pii', 'compliance', 'whole-table'],
    sourceAnchor: { category: 'mirroring', note: 'Filtering at source: no row filter; column exclusion varies by source' } },

  { id: 'fc-mir-015', deck: 'storage-modes', difficulty: 3,
    front: 'TRAP: A BI developer expects to use Import mode on the Mirrored Database tables for best performance, since they are "already in Fabric".',
    back: 'Mirrored Database tables land in OneLake as DELTA files with V-ORDER automatically applied — making them DIRECT LAKE-READY without any additional preparation. Import mode would re-copy data already in OneLake into the VertiPaq in-memory store, wasting storage and adding a refresh-lag layer on top of data that is already incrementally up-to-date. The correct pattern: build the semantic model with a Direct Lake connection to the `.MirroredDatabase` path — you get near-Import query performance, automatic V-Order optimization, and data freshness bounded only by the mirror replication lag (typically <1 min), not by an Import refresh schedule.',
    tags: ['mirroring', 'trap', 'direct-lake', 'v-order', 'delta', 'import-mode'],
    sourceAnchor: { category: 'mirroring', note: 'Mirror tables are Delta+V-Order: Direct Lake-ready, not Import candidates' } },
];
