// Fabric Mirroring deep-dive — 25 questions, ids mirr-001..mirr-025.
// Closes the Prepare-domain gap (47.5% blueprint, currently under-represented).
// Subtopics: mirroring, mirroring-cosmos, mirroring-snowflake, mirroring-azure-sql,
//            mirroring-azure-sql-mi, mirroring-monitoring, mirroring-security.
// All domain: 'prepare'. Difficulty 3-5. 100% whyWrong coverage.

import type { Question } from '../../lib/schema';
import type { SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

const SRC: SourceAnchor = {
  category: 'fabric-mirroring-deep',
  note: 'Mirrored Databases: continuous OneLake replication, sources, perms, monitoring, vs shortcuts/Gen2'
};

export const mirroringDeep: Question[] = [
  // ── Concept / what is mirroring (4) ─────────────────────────────────
  single({
    id: 'mirr-001', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'Which statement BEST describes Fabric Mirroring?',
    options: [
      'Continuous, low-latency replication of a source database into OneLake as Delta Parquet, exposed as a queryable Mirrored Database item',
      'A scheduled batch ETL job that copies snapshots of a source database into a Lakehouse',
      'A virtual pointer (zero-copy) from OneLake to a remote database; reads stream live from the source',
      'A bidirectional sync that writes Power BI changes back to the source database'
    ],
    correct: 0,
    explanation: 'Mirroring continuously replicates source database changes into OneLake as Delta Parquet. The Mirrored Database is a managed Fabric item — the data physically lands in OneLake (read-only), keeping read latency low without scheduled refresh.',
    whyWrong: {
      1: 'Scheduled batch is what Dataflow Gen2 / pipelines do. Mirroring is continuous CDC-driven replication.',
      2: 'That describes a Shortcut. Mirroring physically replicates data into OneLake; shortcuts are pointers.',
      3: 'Mirroring is one-way (source → OneLake). The mirrored copy is read-only; no write-back.'
    },
    source: SRC,
    tags: ['mirroring', 'concept', 'overview']
  }),
  single({
    id: 'mirr-002', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'After enabling Mirroring on an Azure SQL Database, what items are AUTO-CREATED in the Fabric workspace?',
    options: [
      'A Mirrored Database item, a SQL analytics endpoint, and a default semantic model',
      'A Lakehouse and a notebook',
      'A pipeline scheduled every 5 minutes',
      'Just a Mirrored Database item — the SQL endpoint and semantic model must be created manually'
    ],
    correct: 0,
    explanation: 'Mirroring creates three items: the Mirrored Database (the replicated Delta tables in OneLake), an auto-provisioned SQL analytics endpoint for T-SQL queries, and a default semantic model so Power BI can immediately consume the data.',
    whyWrong: {
      1: 'Mirroring does not create a Lakehouse or notebook; the data lands in a Mirrored Database item.',
      2: 'No pipeline is created — mirroring is continuous CDC, not pipeline-orchestrated.',
      3: 'False — both the SQL endpoint and default semantic model are auto-created at mirror enable time.'
    },
    source: SRC,
    tags: ['mirroring', 'auto-provisioning', 'sql-endpoint', 'semantic-model']
  }),
  single({
    id: 'mirr-003', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'In what physical OneLake format does Mirroring land replicated data?',
    options: [
      'Delta Parquet (V-Ordered) under the Mirrored Database item path in OneLake',
      'Native source-format files (e.g., SQL Server BACPAC) zipped on capacity storage',
      'CSV files refreshed nightly',
      'In-memory only — never persisted to OneLake'
    ],
    correct: 0,
    explanation: 'Mirrored data is persisted as Delta Parquet (V-Ordered for Direct Lake compatibility) under the Mirrored Database item in OneLake. This is what enables zero-copy consumption from Direct Lake semantic models, Spark notebooks via shortcut, and the SQL endpoint.',
    whyWrong: {
      1: 'BACPAC is a SQL backup format; Mirroring writes Delta Parquet, not source-native blobs.',
      2: 'CSV is not the storage format and refresh is continuous, not nightly.',
      3: 'Mirroring physically persists to OneLake — that is the whole point of the architecture.'
    },
    source: SRC,
    tags: ['mirroring', 'delta', 'onelake', 'storage']
  }),
  multi({
    id: 'mirr-004', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Which downstream Fabric experiences can consume a Mirrored Database WITHOUT additional copy or pipeline work?',
    options: [
      'Power BI report against the auto-created default semantic model (Direct Lake)',
      'T-SQL queries against the auto-created SQL analytics endpoint',
      'A Lakehouse notebook reading the mirrored tables via OneLake shortcut',
      'A Power Apps canvas app writing back to the mirrored copy'
    ],
    correct: [0, 1, 2],
    explanation: 'Because mirrored data is Delta in OneLake, all read-side Fabric experiences consume it directly: default semantic model (Direct Lake), SQL endpoint (T-SQL), and Lakehouse via shortcut for Spark/notebook reads. Power Apps write-back is not supported — the mirrored copy is read-only.',
    whyWrong: {
      3: 'Mirrored Databases are read-only in Fabric. Writes to the source happen on the source DB; Fabric never writes back through the mirror.'
    },
    source: SRC,
    tags: ['mirroring', 'consumption', 'read-only']
  }),
  // ── Sources (Azure SQL DB / Cosmos / Snowflake / Azure SQL MI) (5) ───
  single({
    id: 'mirr-005', domain: 'prepare', subtopic: 'mirroring-azure-sql', difficulty: 3,
    prompt: 'For an Azure SQL Database mirror, which CHANGE-CAPTURE technology must be enabled or available on the source?',
    options: [
      'Change Data Capture (CDC) at the database level (or system-managed change feed used internally by Mirroring)',
      'Triggers on every table forwarding changes to a queue table',
      'SQL Server Replication publication + subscription',
      'Service Broker queues with EXTERNAL ACTIVATOR'
    ],
    correct: 0,
    explanation: 'Mirroring for Azure SQL DB depends on CDC-style change tracking — enabling CDC at the database level (or relying on the equivalent system-managed change feed). Without it, the mirror cannot capture incremental row-level changes.',
    whyWrong: {
      1: 'Trigger-based CDC is fragile and unsupported; Mirroring uses platform CDC, not user triggers.',
      2: 'Transactional Replication is a different feature stack and not how Mirroring works.',
      3: 'Service Broker is unrelated to Mirroring change capture.'
    },
    source: SRC,
    tags: ['mirroring', 'azure-sql', 'cdc']
  }),
  single({
    id: 'mirr-006', domain: 'prepare', subtopic: 'mirroring-cosmos', difficulty: 3,
    prompt: 'When mirroring an Azure Cosmos DB account into Fabric, which Cosmos API surface is currently supported?',
    options: [
      'Cosmos DB for NoSQL (the Core / SQL API)',
      'Cosmos DB for MongoDB (RU mode)',
      'Cosmos DB for Cassandra',
      'Cosmos DB for Gremlin (graph)'
    ],
    correct: 0,
    explanation: 'Fabric Mirroring for Cosmos DB targets the NoSQL (Core) API. The Mongo, Cassandra, and Gremlin APIs are not mirroring sources at this time — for those you would use other ingestion paths (Eventstream CDC connector, pipelines, or app-side dual-write).',
    whyWrong: {
      1: 'Cosmos DB for MongoDB is not a Mirroring source today.',
      2: 'Cosmos DB for Cassandra is not a Mirroring source.',
      3: 'Cosmos DB for Gremlin is not a Mirroring source.'
    },
    source: SRC,
    tags: ['mirroring', 'cosmos', 'nosql-api']
  }),
  single({
    id: 'mirr-007', domain: 'prepare', subtopic: 'mirroring-snowflake', difficulty: 4,
    prompt: 'Which Snowflake feature does Fabric Mirroring rely on to detect and replicate row-level changes?',
    options: [
      'Snowflake Streams (CDC objects on the source tables)',
      'Snowflake Tasks scheduled every 30 seconds',
      'A Snowpipe pulling from S3',
      'Time Travel queries replayed by Fabric'
    ],
    correct: 0,
    explanation: 'Snowflake Mirroring uses Streams — Snowflake\'s native CDC mechanism — to capture inserts/updates/deletes on tracked tables. Fabric reads from those Streams to replicate changes. The required SELECT permission therefore extends to those Stream objects.',
    whyWrong: {
      1: 'Tasks orchestrate scheduled SQL; they are not the change-capture mechanism.',
      2: 'Snowpipe ingests external files INTO Snowflake — wrong direction.',
      3: 'Time Travel is a query-time historical lookup, not a continuous CDC feed.'
    },
    source: SRC,
    tags: ['mirroring', 'snowflake', 'streams', 'cdc']
  }),
  multi({
    id: 'mirr-008', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Which databases ARE supported as Fabric Mirroring sources today?',
    options: [
      'Azure SQL Database',
      'Azure Cosmos DB (NoSQL API)',
      'Snowflake',
      'Azure SQL Managed Instance',
      'On-premises SQL Server (direct, no Arc)',
      'Oracle Database 19c on-premises'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Azure SQL DB, Cosmos DB (NoSQL), Snowflake, and Azure SQL Managed Instance are supported (with PostgreSQL and others rolling out). On-prem SQL Server is NOT directly mirrored — it requires Azure Arc-enabled SQL or an alternative ingestion path. On-prem Oracle is not a Mirroring source at all.',
    whyWrong: {
      4: 'On-prem SQL Server cannot be mirrored directly — Fabric needs Azure Arc-enabled SQL Server or a different ingestion strategy (pipeline + CDC, third-party).',
      5: 'On-prem Oracle is not a Mirroring source. Use pipelines, third-party CDC tools, or Eventstream connectors.'
    },
    source: SRC,
    tags: ['mirroring', 'sources', 'support-matrix']
  }),
  single({
    id: 'mirr-009', domain: 'prepare', subtopic: 'mirroring-azure-sql-mi', difficulty: 4,
    prompt: 'You are mirroring an Azure SQL Managed Instance. Which network configuration is REQUIRED so Fabric can reach the MI for CDC reads?',
    options: [
      'A public endpoint on the MI OR a private endpoint with managed virtual network / on-premises data gateway connectivity from Fabric',
      'Open the MI to 0.0.0.0/0 (allow all) — this is the only supported configuration',
      'Disable TLS on the MI listener',
      'No networking config — Fabric can always reach any Managed Instance regardless of VNet isolation'
    ],
    correct: 0,
    explanation: 'Azure SQL MI is VNet-bound. Mirroring needs a reachable endpoint — either the MI public endpoint (locked down by firewall) or private connectivity via a managed VNet / private endpoint configuration. VNet-isolated MIs require explicit network setup before Mirroring can connect.',
    whyWrong: {
      1: 'Wide-open 0.0.0.0/0 is a security anti-pattern, not a requirement and not recommended.',
      2: 'TLS must remain on; disabling it would block the connection, not enable it.',
      3: 'Private MI endpoints are NOT auto-reachable; explicit Fabric networking is required.'
    },
    source: SRC,
    tags: ['mirroring', 'azure-sql-mi', 'networking', 'private-endpoint']
  }),
  // ── Source permissions (3) ──────────────────────────────────────────
  single({
    id: 'mirr-010', domain: 'prepare', subtopic: 'mirroring-security', difficulty: 4,
    prompt: 'Which source-side SQL role / permission is sufficient to enable Mirroring on an Azure SQL Database?',
    options: [
      'Membership in db_owner on the source database (or equivalent CDC-administration permission to enable change tracking)',
      'db_datareader on the source database',
      'VIEW DATABASE STATE only',
      'No source-side permission — Fabric uses a backdoor admin path'
    ],
    correct: 0,
    explanation: 'Enabling Mirroring requires the Fabric-side identity to have rights to enable and read CDC on the source — db_owner (or an equivalent CDC administration role) on the database. Read-only roles like db_datareader cannot enable change tracking.',
    whyWrong: {
      1: 'db_datareader can SELECT but cannot enable CDC; insufficient to set up the mirror.',
      2: 'VIEW DATABASE STATE exposes DMVs but does not authorize CDC enablement.',
      3: 'Fabric uses a normal authenticated connection; there is no backdoor.'
    },
    source: SRC,
    tags: ['mirroring', 'azure-sql', 'permissions', 'db_owner']
  }),
  single({
    id: 'mirr-011', domain: 'prepare', subtopic: 'mirroring-cosmos', difficulty: 4,
    prompt: 'Which Cosmos DB permission is needed for the Fabric service identity to mirror a container?',
    options: [
      'Read access on the Cosmos DB account / container (data plane), typically granted via account key, AAD-assigned data role, or RBAC data reader',
      'Owner role on the entire Azure subscription',
      'Network Contributor on the Cosmos VNet',
      'No permission — mirroring uses anonymous reads on Cosmos'
    ],
    correct: 0,
    explanation: 'Cosmos DB Mirroring needs read access on the container — granted by the account primary/secondary key, an AAD-assigned data plane role (e.g., Cosmos DB Built-in Data Reader), or equivalent. Subscription Owner and Network Contributor are control-plane roles and not how Cosmos data-plane reads are authorized.',
    whyWrong: {
      1: 'Subscription Owner is control-plane and grossly excessive; data-plane access is what is needed.',
      2: 'Network Contributor manages network resources, not data access.',
      3: 'Cosmos does not allow anonymous data reads in production accounts.'
    },
    source: SRC,
    tags: ['mirroring', 'cosmos', 'permissions', 'rbac']
  }),
  single({
    id: 'mirr-012', domain: 'prepare', subtopic: 'mirroring-snowflake', difficulty: 4,
    prompt: 'For Snowflake Mirroring, which set of source-side permissions does the Fabric service user need at MINIMUM?',
    options: [
      'USAGE on the warehouse + database + schema, SELECT on the source tables, and access to the Streams (typically via a dedicated role)',
      'ACCOUNTADMIN on the Snowflake account',
      'OWNERSHIP on every source table',
      'PUBLIC role only'
    ],
    correct: 0,
    explanation: 'Snowflake mirror access is granted via a dedicated role with USAGE on the warehouse/database/schema, SELECT on the tables you are mirroring, and access to the change Streams Mirroring uses for CDC. ACCOUNTADMIN is way over-privileged; OWNERSHIP transfers the table.',
    whyWrong: {
      1: 'ACCOUNTADMIN is a violation of least-privilege and not required.',
      2: 'OWNERSHIP grants full control of the table including DROP — far more than reads need.',
      3: 'PUBLIC alone has no rights on user objects in a normal Snowflake account.'
    },
    source: SRC,
    tags: ['mirroring', 'snowflake', 'permissions', 'streams', 'least-privilege']
  }),
  // ── Latency expectations (2) ────────────────────────────────────────
  single({
    id: 'mirr-013', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'What end-to-end replication latency should you expect from Fabric Mirroring under normal conditions?',
    options: [
      'Seconds to single-digit minutes — near-real-time, asynchronous',
      'Synchronous (every source commit blocks until OneLake confirms write)',
      '24+ hours, similar to a nightly batch load',
      'Sub-millisecond, comparable to in-region SQL replication'
    ],
    correct: 0,
    explanation: 'Mirroring is asynchronous near-real-time replication. Under normal load, replicated rows appear in OneLake within seconds to a few minutes. It is NOT synchronous (does not block source commits) and NOT sub-millisecond (CDC + OneLake landing has inherent overhead).',
    whyWrong: {
      1: 'Synchronous replication would degrade source TPS and is not how Mirroring works.',
      2: '24-hour latency is batch-ETL territory, far slower than Mirroring.',
      3: 'Sub-ms is impossible across CDC + Delta-write in OneLake; expect seconds at best.'
    },
    source: SRC,
    tags: ['mirroring', 'latency', 'asynchronous']
  }),
  multi({
    id: 'mirr-014', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Which factors can INCREASE Mirroring replication lag?',
    options: [
      'Heavy write burst on the source database (e.g., bulk load into mirrored tables)',
      'Wide tables with many columns and large row payloads',
      'Network latency or throttling between the source region and the Fabric capacity',
      'Adding a new Power BI report consumer to the default semantic model'
    ],
    correct: [0, 1, 2],
    explanation: 'Lag rises with source write volume, row size (more bytes to land per CDC event), and source-to-Fabric network conditions. Adding a downstream consumer affects READ load on the SQL endpoint or semantic model — it does not slow the upstream replication path.',
    whyWrong: {
      3: 'Power BI consumers query the SQL endpoint or semantic model, which is downstream of the Mirroring write path. They do not back-pressure source-to-OneLake replication.'
    },
    source: SRC,
    tags: ['mirroring', 'lag', 'performance', 'troubleshooting']
  }),
  // ── Mirroring vs Shortcuts vs Dataflow Gen2 vs Pipelines (3 — 2 scenario) ──
  single({
    id: 'mirr-015', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Scenario: Marketing wants near-real-time analytics on Azure SQL DB transaction tables. They need T-SQL access AND Direct Lake Power BI reports without managing refresh schedules. Which ingestion pattern is the BEST fit?',
    options: [
      'Mirror the Azure SQL Database — auto-creates a SQL endpoint and default Direct Lake semantic model with continuous replication',
      'Create a OneLake shortcut from a Lakehouse to the Azure SQL DB',
      'Build a Dataflow Gen2 that refreshes hourly from Azure SQL DB into a Lakehouse',
      'Schedule a pipeline Copy Activity every 15 minutes from Azure SQL DB to a Warehouse'
    ],
    correct: 0,
    explanation: 'Mirroring exactly matches: continuous (no refresh schedule), auto SQL endpoint (T-SQL), auto default semantic model (Direct Lake-ready), low latency. Shortcuts do not exist for Azure SQL DB. Gen2/pipelines are batch and require scheduling.',
    whyWrong: {
      1: 'OneLake shortcuts target storage (ADLS, S3, GCS) and other Fabric items — not Azure SQL DB tables.',
      2: 'Hourly batch is far slower than "near-real-time" and requires schedule management.',
      3: 'Pipelines are batch micro-ETL; not continuous and does not auto-create the SQL endpoint / semantic model.'
    },
    source: SRC,
    tags: ['mirroring', 'pattern-selection', 'scenario', 'azure-sql']
  }),
  single({
    id: 'mirr-016', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Scenario: You have 80 TB of Parquet event data sitting in an existing Amazon S3 bucket. Analysts need to query it in Fabric. Which pattern minimizes data movement?',
    options: [
      'Create a OneLake shortcut from a Lakehouse to the S3 bucket — zero copy',
      'Mirror the S3 bucket as a Mirrored Database',
      'Pipeline Copy Activity to land all 80 TB into a Fabric Warehouse',
      'Dataflow Gen2 with the S3 connector loading into a Lakehouse'
    ],
    correct: 0,
    explanation: 'Shortcut is the zero-copy choice for S3 Parquet — Spark and the SQL endpoint can read directly from S3 with no replication. Mirroring is for relational source DBs (Azure SQL, Cosmos, Snowflake, MI); S3 is object storage, not a Mirroring source.',
    whyWrong: {
      1: 'Mirroring sources are databases (Azure SQL DB / MI, Cosmos NoSQL, Snowflake) — NOT S3 buckets.',
      2: 'Copying 80 TB into a Warehouse defeats "minimize data movement" and incurs OneLake storage cost.',
      3: 'Dataflow Gen2 also copies the data into a destination — not zero-copy.'
    },
    source: SRC,
    tags: ['mirroring', 'shortcut', 'pattern-selection', 's3', 'scenario']
  }),
  single({
    id: 'mirr-017', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Scenario: Finance needs a daily snapshot of an on-prem SQL Server transactional system in Fabric, with full Power Query transformation and column shaping. Which pattern fits?',
    options: [
      'Dataflow Gen2 with on-premises data gateway, scheduled daily, landing in a Lakehouse or Warehouse',
      'Mirror the on-prem SQL Server directly into a Mirrored Database',
      'Create a OneLake shortcut to the on-prem SQL Server',
      'Use Eventstream with the on-prem SQL CDC connector'
    ],
    correct: 0,
    explanation: 'On-prem SQL Server cannot be mirrored directly (requires Azure Arc), and shortcuts do not target databases. Dataflow Gen2 over the on-premises data gateway is the right pattern: schedules a daily refresh, supports rich Power Query transformations, lands in Lakehouse/Warehouse.',
    whyWrong: {
      1: 'On-prem SQL Server is not a direct Mirroring source — needs Azure Arc-enabled SQL or a different path.',
      2: 'Shortcuts target storage / other Fabric items, not on-prem SQL Server tables.',
      3: 'Eventstream\'s SQL CDC connectors target Azure SQL DB / PostgreSQL, not on-prem SQL Server directly; also not the right fit for "daily" + "Power Query transformation".'
    },
    source: SRC,
    tags: ['mirroring', 'pattern-selection', 'on-prem', 'dataflow-gen2', 'scenario']
  }),
  // ── Schema drift / DDL handling (2) ─────────────────────────────────
  single({
    id: 'mirr-018', domain: 'prepare', subtopic: 'mirroring-azure-sql', difficulty: 4,
    prompt: 'A column is ADDED to a mirrored Azure SQL Database table. What does Fabric Mirroring do?',
    options: [
      'Detects the additive schema change and propagates the new column into the mirrored Delta table; existing rows show NULL for the new column',
      'Stops the mirror and requires a full re-initialization of the table',
      'Continues replicating the existing columns and silently ignores the new column forever',
      'Drops and recreates the entire database in OneLake'
    ],
    correct: 0,
    explanation: 'Mirroring handles additive DDL — ADD COLUMN — automatically. The mirrored Delta table picks up the new column and historical rows show NULL for it. Destructive changes (DROP COLUMN, type narrowing) are more constrained and may need attention.',
    whyWrong: {
      1: 'Additive changes do not stop the mirror; that would defeat continuous-replication value.',
      2: 'New columns ARE propagated; not ignored.',
      3: 'Mirroring does not destructively recreate the database for a column add.'
    },
    source: SRC,
    tags: ['mirroring', 'schema-drift', 'ddl', 'azure-sql']
  }),
  multi({
    id: 'mirr-019', domain: 'prepare', subtopic: 'mirroring', difficulty: 5,
    prompt: 'Which DDL / data-shape changes on a mirrored source can break or limit the mirror (require remediation, may not auto-replicate)?',
    options: [
      'DROP COLUMN on a mirrored table',
      'Changing a column type to a narrower / incompatible type',
      'Renaming a table that is part of the mirror configuration',
      'INSERT of normal new rows into the table'
    ],
    correct: [0, 1, 2],
    explanation: 'Destructive or breaking changes — DROP COLUMN, narrowing type changes, or renaming a tracked table — are the failure modes. Vanilla INSERTs are the happy path Mirroring is designed for and replicate continuously without issue.',
    whyWrong: {
      3: 'INSERTs are exactly what Mirroring is built to handle — no remediation needed.'
    },
    source: SRC,
    tags: ['mirroring', 'schema-drift', 'breaking-changes']
  }),
  // ── Monitoring (3) ──────────────────────────────────────────────────
  single({
    id: 'mirr-020', domain: 'prepare', subtopic: 'mirroring-monitoring', difficulty: 3,
    prompt: 'Where do you check the health, replication status, per-table row counts, and lag for a Mirrored Database?',
    options: [
      'The Mirroring monitoring / replication status page on the Mirrored Database item itself',
      'The capacity metrics app — it surfaces per-table replication lag',
      'Power BI usage metrics report',
      'Microsoft Purview audit log'
    ],
    correct: 0,
    explanation: 'The Mirrored Database item in Fabric exposes a built-in monitoring page showing per-table replication state, row counts replicated, last refresh time, current lag, and any error messages. The capacity metrics app reports CU consumption, not table-level replication detail.',
    whyWrong: {
      1: 'Capacity metrics covers CU usage and throttling — not per-table mirror state.',
      2: 'Usage metrics tracks Power BI report consumption, unrelated to Mirroring health.',
      3: 'Purview audit logs governance events; not a Mirroring runtime monitor.'
    },
    source: SRC,
    tags: ['mirroring', 'monitoring', 'health']
  }),
  multi({
    id: 'mirr-021', domain: 'prepare', subtopic: 'mirroring-monitoring', difficulty: 4,
    prompt: 'Which signals on the Mirroring monitoring page would prompt INVESTIGATION rather than be considered normal?',
    options: [
      'A table in "Failed" or persistent "Error" state with a non-transient error message',
      'Replication lag steadily growing over hours and not recovering',
      'A specific table stuck in "Initializing" hours after the mirror was enabled on a small dataset',
      'Brief, isolated lag spikes during a heavy source bulk load that recover within minutes'
    ],
    correct: [0, 1, 2],
    explanation: 'Persistent error state, monotonically rising lag that never recovers, and an "Initializing" state stuck far past expected duration are all real problems. Transient lag spikes during source write bursts that recover are normal asynchronous-replication behavior.',
    whyWrong: {
      3: 'Brief lag spikes during heavy source writes that recover quickly are expected — not a remediation trigger.'
    },
    source: SRC,
    tags: ['mirroring', 'monitoring', 'troubleshooting']
  }),
  single({
    id: 'mirr-022', domain: 'prepare', subtopic: 'mirroring-monitoring', difficulty: 4,
    prompt: 'A mirrored Snowflake table reports "Replication Failed: insufficient privileges on stream". What is the FIRST remediation step?',
    options: [
      'Grant the Fabric Mirroring role SELECT on the underlying Stream object (and verify USAGE on warehouse/db/schema), then resume the mirror',
      'Drop and recreate the Mirrored Database from scratch',
      'Increase the Fabric capacity SKU',
      'Disable CDC on the Snowflake source'
    ],
    correct: 0,
    explanation: 'The error is explicit: the role lacks SELECT on the Stream that Mirroring uses for CDC. Granting SELECT on the Stream (and verifying USAGE on the warehouse/db/schema chain) typically resumes replication without recreating the mirror.',
    whyWrong: {
      1: 'Recreating the mirror does not fix a permission problem; the same role would hit the same error.',
      2: 'SKU has nothing to do with source-side permissions.',
      3: 'Disabling CDC removes the change feed entirely — the opposite of what is needed.'
    },
    source: SRC,
    tags: ['mirroring', 'snowflake', 'monitoring', 'troubleshooting', 'permissions']
  }),
  // ── Cost / capacity model (1) ───────────────────────────────────────
  multi({
    id: 'mirr-023', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Which statements about the COST model of Fabric Mirroring are TRUE?',
    options: [
      'Compute cost for the change-capture work runs on the SOURCE side (e.g., Snowflake credits, Cosmos RUs, Azure SQL DTUs/vCores) — the source pays to read its own change feed',
      'OneLake storage of the mirrored Delta data is included with eligible Fabric capacity (subject to current promotional limits per tenant)',
      'Mirroring eliminates all source-side cost; Fabric capacity covers everything end-to-end',
      'Each Power BI report read against the default semantic model is metered as a separate Mirroring operation'
    ],
    correct: [0, 1],
    explanation: 'Mirroring incurs source-side compute (Cosmos RUs, Snowflake credits, Azure SQL compute) for the CDC reads. OneLake mirrored storage is included with eligible Fabric capacity (within current per-tenant limits). Read consumption against the semantic model is normal Direct Lake / SQL endpoint metering, not a separate "mirroring op" charge.',
    whyWrong: {
      2: 'False — source-side compute is real and can be material on busy databases. Mirroring does not eliminate it.',
      3: 'Report reads are metered as Direct Lake / SQL endpoint operations against the semantic model, not as Mirroring operations.'
    },
    source: SRC,
    tags: ['mirroring', 'cost', 'capacity', 'billing']
  }),
  // ── Ordering (2) ────────────────────────────────────────────────────
  order({
    id: 'mirr-024', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Order the steps to set up Fabric Mirroring for an Azure SQL Database from scratch.',
    options: [
      'Verify source prerequisites: Azure SQL DB SKU supported, network access from Fabric, and grant the Fabric service identity db_owner (or CDC-admin) on the database',
      'In the Fabric workspace, create a new Mirrored Azure SQL Database item and supply the source connection string + credentials',
      'Select which tables to mirror and start replication; Fabric provisions the Mirrored Database, SQL endpoint, and default semantic model',
      'Open the Mirroring monitoring page to verify each table reaches the Replicating state and lag is within expected bounds'
    ],
    explanation: 'Standard setup: verify source prerequisites and permissions FIRST, then create the Mirrored Database item with credentials, pick tables and start replication (which auto-provisions the SQL endpoint + default semantic model), and finally verify health on the monitoring page.',
    source: SRC,
    tags: ['mirroring', 'azure-sql', 'setup', 'workflow']
  }),
  order({
    id: 'mirr-025', domain: 'prepare', subtopic: 'mirroring-monitoring', difficulty: 5,
    prompt: 'Order the troubleshooting steps when one mirrored Snowflake table is stuck in "Failed" while other tables on the same mirror replicate fine.',
    options: [
      'Open the Mirroring monitoring page and read the specific error message for the failing table',
      'Check source-side: Snowflake role permissions on the failing table and its associated Stream (USAGE / SELECT)',
      'Apply the fix on the source (grant missing privilege, recreate Stream if invalidated, fix unsupported DDL) and resume the table',
      'Confirm the table returns to Replicating state on the monitoring page and lag normalizes'
    ],
    explanation: 'Read the actual error first — never guess. Then narrow to the source side (permissions or Stream state are the most common Snowflake failure modes), apply the targeted fix, and verify recovery on the monitoring page. Skipping straight to "drop and recreate the mirror" wastes time and bandwidth.',
    source: SRC,
    tags: ['mirroring', 'snowflake', 'monitoring', 'troubleshooting', 'workflow']
  })
];
