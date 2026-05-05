import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// 40 lab-flavoured Prepare-data questions covering Lakehouse vs Warehouse,
// shortcuts vs ingest vs mirror, medallion progression, notebook/Dataflow/T-SQL
// choice, OneLake patterns, Polaris-engine specifics, CTAS, mirrored DB
// lifecycle, and Eventhouse vs Lakehouse for time-series.
//
// IDs: prl-001..prl-040 (no collisions with arch-/ol-/tr-/tsql-/kql-/px-).
// Mix: ≥8 multi-select, ≥3 ordering. Difficulty 2-5, mostly 3-4. 100% whyWrong.
//
// Subtopics used:
//   fabric-architecture, medallion, onelake-shortcuts, mirroring,
//   dataflow-gen2, notebooks, pipelines, tsql-warehouse, transform.

export const prepareLab: Question[] = [
  // ───────── Lakehouse vs Warehouse decisions (1-7) ─────────
  single({
    id: 'prl-001', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    prompt: 'A team has 80 GB of structured sales data, all-SQL skills, and needs multi-statement ACID transactions for a nightly close process. Which Fabric storage item fits BEST?',
    options: ['Lakehouse with SQL endpoint', 'Warehouse', 'Eventhouse', 'Mirrored Database'],
    correct: 1,
    explanation: 'Warehouse is the SQL-first store with full T-SQL DDL/DML and multi-statement ACID. The team has SQL skills and needs transactional close logic — Warehouse aligns end-to-end.',
    whyWrong: {
      0: 'Lakehouse SQL endpoint is read-only; no DML/DDL T-SQL surface for nightly close.',
      2: 'Eventhouse is for streaming/time-series (KQL), not BI nightly close.',
      3: 'Mirrored Database is one-way external→Fabric replication, not a primary write target.'
    },
    source: SRC.fabricArch,
    tags: ['lakehouse-vs-warehouse', 'decision']
  }),
  single({
    id: 'prl-002', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    prompt: 'A platform team has petabyte-scale Delta tables, code-first PySpark engineers, and needs notebook + SQL-endpoint access to the same physical files. Which item fits BEST?',
    options: ['Warehouse', 'Lakehouse', 'Eventhouse', 'Semantic model'],
    correct: 1,
    explanation: 'Lakehouse exposes Delta-Parquet for Spark notebooks AND a SQL analytics endpoint over the same files — the canonical "code-first + SQL-read" surface.',
    whyWrong: {
      0: 'Warehouse is T-SQL-first; Spark cannot natively write to Warehouse tables (read-only via OneLake).',
      2: 'Eventhouse is KQL-only; not Spark-shaped.',
      3: 'Semantic model is consumption-side, not storage.'
    },
    source: SRC.fabricArch,
    tags: ['lakehouse', 'spark']
  }),
  multi({
    id: 'prl-003', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    prompt: 'Which statements about Fabric Lakehouse vs Warehouse are TRUE?',
    options: [
      'Both store Delta-Parquet in OneLake',
      'Warehouse offers cross-table multi-statement ACID; Lakehouse SQL endpoint does not',
      'Lakehouse SQL endpoint is read-only',
      'Lakehouse data is unreadable from a Warehouse',
      'Warehouse uses the Polaris distributed query engine'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Both land in OneLake as Delta. Warehouse is T-SQL with ACID; Lakehouse SQL endpoint is read-only. Polaris is the underlying Warehouse engine. Warehouse and Lakehouse can read each other via OneLake (cross-item is fine).',
    whyWrong: {
      3: 'Cross-item reads via OneLake are explicitly supported; a Warehouse can read Lakehouse Delta tables (and vice-versa).'
    },
    source: SRC.tsql,
    tags: ['polaris', 'comparison']
  }),
  single({
    id: 'prl-004', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    prompt: 'A Fabric architect is told "use Lakehouse for everything." A use case requires UPDATE/DELETE in T-SQL with rollback. Which is the correct pushback?',
    options: [
      'Lakehouse SQL endpoint supports UPDATE/DELETE just like Warehouse',
      'Lakehouse SQL endpoint is read-only — UPDATE/DELETE require Warehouse (or Spark on Lakehouse)',
      'UPDATE/DELETE are not supported anywhere in Fabric',
      'You must enable a "writable" flag on the Lakehouse'
    ],
    correct: 1,
    explanation: 'Lakehouse SQL endpoint is read-only. T-SQL UPDATE/DELETE/MERGE require Warehouse. From Spark you can MERGE into a Lakehouse Delta table — but not via the SQL endpoint.',
    whyWrong: {
      0: 'False — the SQL endpoint is explicitly read-only.',
      2: 'False — Warehouse fully supports UPDATE/DELETE/MERGE.',
      3: 'No such flag exists.'
    },
    source: SRC.fabricArch,
    tags: ['lakehouse', 'tsql', 'read-only']
  }),
  single({
    id: 'prl-005', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 5,
    prompt: 'A Warehouse and a Lakehouse coexist in one workspace. The team wants to run a single T-SQL query that JOINs a Warehouse fact with a Lakehouse dimension. Is this supported?',
    options: [
      'No — cross-item queries are not supported in Fabric',
      'Yes — three-part naming lets Warehouse T-SQL JOIN Lakehouse SQL-endpoint tables in the same workspace',
      'Only via a Dataflow Gen2',
      'Only by copying the Lakehouse table into the Warehouse first'
    ],
    correct: 1,
    explanation: 'Fabric supports three-part-name cross-database queries within a workspace. A Warehouse query can JOIN a Lakehouse SQL-endpoint table directly — no copy required.',
    whyWrong: {
      0: 'False — cross-item is supported in-workspace.',
      2: 'Dataflow is unnecessary; the SQL surface handles it.',
      3: 'A copy works but is not required and adds redundancy.'
    },
    source: SRC.tsql,
    tags: ['cross-database', 'three-part-name']
  }),
  single({
    id: 'prl-006', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    prompt: 'Which Fabric pattern lets multiple Lakehouses share a single physical Delta table without duplication?',
    options: [
      'Each Lakehouse imports the table on a daily refresh',
      'OneLake shortcut from each "consumer" Lakehouse to the producer Lakehouse table',
      'A Mirrored Database fan-out',
      'A Reflex (Activator) trigger pattern'
    ],
    correct: 1,
    explanation: 'OneLake shortcuts are virtual references — multiple Lakehouses can point at the same physical Delta table in another Lakehouse with zero copy.',
    whyWrong: {
      0: 'Daily import duplicates data and adds latency.',
      2: 'Mirrored DB is for replicating EXTERNAL databases into Fabric; not Fabric→Fabric fan-out.',
      3: 'Reflex is for triggering downstream actions, not zero-copy reads.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'zero-copy']
  }),
  multi({
    id: 'prl-007', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    prompt: 'Which workloads are appropriate for FABRIC WAREHOUSE rather than Lakehouse?',
    options: [
      'Multi-statement T-SQL transactions with ROLLBACK',
      'Petabyte unstructured-blob analytics with PySpark UDFs',
      'BI workloads with classic dimensional star schemas authored in T-SQL',
      'Queries requiring CTAS as a building block',
      'Read-only consumption of an existing Delta lakehouse from a notebook'
    ],
    correct: [0, 2, 3],
    explanation: 'Warehouse fits T-SQL ACID, classic BI star-schema, and CTAS-driven ELT. Spark UDFs and notebook-first reads belong on Lakehouse.',
    whyWrong: {
      1: 'Warehouse is not Spark-native — UDFs in Python/Scala belong in notebooks against a Lakehouse.',
      4: 'A notebook reading Delta belongs against a Lakehouse, not a Warehouse.'
    },
    source: SRC.tsql,
    tags: ['warehouse', 'workload']
  }),

  // ───────── Shortcuts vs ingest vs mirror (8-14) ─────────
  single({
    id: 'prl-008', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'A team needs CURRENT data in Fabric without copying or moving the source bytes. The source is a partner ADLS Gen2 container that updates throughout the day. Which mechanism fits?',
    options: ['OneLake Shortcut to ADLS Gen2', 'Mirrored Database', 'Pipeline copy job', 'Dataflow Gen2 ingest'],
    correct: 0,
    explanation: 'Shortcut is zero-copy and live — every read goes to the source bytes. No duplication, no refresh schedule, automatic propagation.',
    whyWrong: {
      1: 'Mirroring targets transactional databases (Azure SQL, Cosmos, Snowflake), not ADLS containers.',
      2: 'Pipeline copy duplicates bytes and adds latency.',
      3: 'Dataflow Gen2 also copies and runs on a schedule.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'adls']
  }),
  single({
    id: 'prl-009', domain: 'prepare', subtopic: 'mirroring', difficulty: 3,
    prompt: 'Which sources are SUPPORTED for Fabric Mirroring?',
    options: [
      'ADLS Gen2 containers',
      'Azure SQL DB, Azure Cosmos DB, and Snowflake',
      'On-prem SQL Server 2014',
      'Any S3 bucket'
    ],
    correct: 1,
    explanation: 'Mirroring is purpose-built for transactional databases. The first wave covers Azure SQL DB, Azure Cosmos DB, and Snowflake (with more coming). ADLS/S3 are file stores — use Shortcuts instead.',
    whyWrong: {
      0: 'ADLS Gen2 is a Shortcut target, not a Mirroring source.',
      2: 'On-prem SQL 2014 is not a supported mirroring source today.',
      3: 'S3 is reachable via Shortcut, not Mirroring.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'sources']
  }),
  multi({
    id: 'prl-010', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Which characteristics of Fabric MIRRORED DATABASES are TRUE?',
    options: [
      'It is a continuous one-way replication; the Fabric copy is read-only',
      'Compute for replication is metered against your Fabric capacity',
      'Mirrored data lands as Delta in OneLake and is queryable via SQL endpoint and Direct Lake',
      'You can make the mirrored copy writable from Fabric',
      'A SQL endpoint and a corresponding default semantic model are auto-provisioned'
    ],
    correct: [0, 2, 4],
    explanation: 'Mirroring is one-way (source → Fabric), Fabric copy is read-only, lands as Delta in OneLake, and gets a SQL endpoint + auto semantic model. The replication compute is FREE during preview/GA — not metered against your capacity.',
    whyWrong: {
      1: 'Mirroring replication compute is provided free; storage in OneLake counts but compute does not consume your CU.',
      3: 'You cannot make the mirrored copy writable — it must reflect the source.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'capabilities']
  }),
  single({
    id: 'prl-011', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A user with Workspace Member role queries a Lakehouse shortcut to ADLS Gen2 and gets "AuthorizationFailed". The shortcut itself was created successfully. Why?',
    options: [
      'Shortcuts require Admin role',
      'The user must also have read access on the underlying ADLS storage account; shortcuts honor source-side ACLs',
      'Shortcuts cannot point at ADLS Gen2',
      'The shortcut is using the wrong region'
    ],
    correct: 1,
    explanation: 'OneLake shortcuts pass through to source-side identity. Read permission must exist on the ADLS storage account/container for the querying user; the shortcut itself does not grant that permission.',
    whyWrong: {
      0: 'Member is sufficient for shortcut consumption.',
      2: 'ADLS Gen2 IS a supported shortcut target.',
      3: 'Region rarely produces AuthorizationFailed; this is permissions.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'permissions']
  }),
  order({
    id: 'prl-012', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'Order these decision steps for "Shortcut vs Mirror vs Ingest", from FIRST to LAST.',
    options: [
      'Confirm the source type (file lake vs transactional DB vs ad-hoc API)',
      'Decide if you need zero-copy live access or a managed replica',
      'Select Shortcut (file lake live), Mirror (transactional replica), or Ingest (transformed copy)',
      'Configure source-side permissions and capacity headroom',
      'Validate refresh latency and freshness against the SLA'
    ],
    explanation: 'Type → access pattern → mechanism → permissions/capacity → SLA validation. You cannot validate latency before you have chosen a mechanism, and you cannot choose without knowing the source type.',
    whyWrong: {},
    source: SRC.onelakeShortcuts,
    tags: ['decision', 'ordering']
  }),
  single({
    id: 'prl-013', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A Lakehouse holds a 1.2 TB Delta table that 6 downstream Lakehouses currently re-ingest nightly via pipelines. Storage cost is becoming a concern. Which migration produces the BIGGEST storage saving with the LEAST refactor?',
    options: [
      'Move every consumer to a Warehouse',
      'Replace each consumer\'s ingested copy with a OneLake Shortcut to the source Lakehouse table',
      'Switch every consumer to Mirrored Database',
      'Replace each pipeline with a Dataflow Gen2'
    ],
    correct: 1,
    explanation: 'Six 1.2 TB copies → 6 zero-copy shortcuts. Storage drops by ~6× and the consumer code keeps reading the same table name. Mirror does not apply (source is not an external DB). Dataflow still copies.',
    whyWrong: {
      0: 'Switching to Warehouse does not reduce storage.',
      2: 'Mirroring is for external transactional DBs, not Fabric→Fabric.',
      3: 'Dataflow Gen2 still creates a copy at the destination.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'storage', 'migration']
  }),
  single({
    id: 'prl-014', domain: 'prepare', subtopic: 'mirroring', difficulty: 5,
    prompt: 'A team mirrored an Azure SQL DB into Fabric two weeks ago. They drop a column on the source. What happens to the Fabric mirrored copy?',
    options: [
      'The mirrored copy retains the dropped column indefinitely',
      'The mirrored copy reflects the schema change automatically; downstream artifacts referencing the dropped column will break',
      'You must rebuild the mirror from scratch',
      'Fabric blocks DDL changes on the source'
    ],
    correct: 1,
    explanation: 'Mirroring tracks source schema changes. Dropped columns disappear from the Fabric copy. Downstream Direct Lake models, semantic models, and SQL views that reference the dropped column will fail until updated.',
    whyWrong: {
      0: 'False — the mirror is a faithful replica.',
      2: 'No rebuild required; mirror keeps in sync.',
      3: 'Fabric does not block source DDL.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'schema-change', 'lifecycle']
  }),

  // ───────── Medallion (Bronze→Silver→Gold) (15-21) ─────────
  single({
    id: 'prl-015', domain: 'prepare', subtopic: 'medallion', difficulty: 2,
    prompt: 'In medallion architecture, which layer should hold UNTRANSFORMED, append-only ingestion of source data?',
    options: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    correct: 0,
    explanation: 'Bronze is raw landing — append-only, schema-on-read, preserves full source fidelity for replay.',
    whyWrong: {
      1: 'Silver is cleansed/conformed/de-duplicated.',
      2: 'Gold is business-ready aggregates.',
      3: 'Platinum is not part of the canonical medallion pattern.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'bronze']
  }),
  multi({
    id: 'prl-016', domain: 'prepare', subtopic: 'medallion', difficulty: 4,
    prompt: 'Which transformations belong in the SILVER layer of a medallion lakehouse?',
    options: [
      'Type casting and column renames',
      'De-duplication on natural keys',
      'Calculation of business KPIs and YoY measures',
      'Cleansing of malformed records and PII pseudonymisation',
      'Final star-schema conformance for the BI model'
    ],
    correct: [0, 1, 3],
    explanation: 'Silver = cleansed/conformed/de-duplicated/typed. Star-schema and KPI calculation belong to Gold (or the semantic model).',
    whyWrong: {
      2: 'Business KPIs / YoY belong in Gold tables (or semantic model measures), not Silver.',
      4: 'Final star-schema conformance is a Gold responsibility — Silver may have many narrow conformed tables, not the final model.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'silver']
  }),
  single({
    id: 'prl-017', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'Which layer should the Direct Lake semantic model in production read from?',
    options: ['Bronze', 'Silver', 'Gold', 'It does not matter — Direct Lake is layer-agnostic'],
    correct: 2,
    explanation: 'Gold tables are pre-aggregated, conformed, and shaped for BI consumption — exactly what Direct Lake reads efficiently. Bronze/Silver are intermediate.',
    whyWrong: {
      0: 'Bronze is raw — too dirty for BI, and column shapes change.',
      1: 'Silver is conformed but not BI-shaped — Direct Lake reading wide Silver tables increases lookup cost.',
      3: 'It DOES matter — Direct Lake performance depends on table shape and V-Order.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'gold', 'direct-lake']
  }),
  order({
    id: 'prl-018', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'Order these tasks in a typical Bronze→Silver→Gold daily run.',
    options: [
      'Land raw source files into Bronze (append-only)',
      'Clean, type-cast, and de-duplicate into Silver',
      'Conform to star schema and aggregate into Gold',
      'Refresh / frame the Direct Lake semantic model',
      'Publish a downstream report for end users'
    ],
    explanation: 'The medallion pattern flows top-to-bottom; semantic refresh and report publishing happen after Gold is ready.',
    whyWrong: {},
    source: SRC.fabricArch,
    tags: ['medallion', 'ordering']
  }),
  single({
    id: 'prl-019', domain: 'prepare', subtopic: 'medallion', difficulty: 4,
    prompt: 'A team\'s Bronze layer carries 10 TB of CDC change feed. Silver is computed via a Spark MERGE every 30 minutes. Which performance problem is MOST likely?',
    options: [
      'Bronze growth is unbounded — no retention policy',
      'Spark cannot read Bronze',
      'MERGE every 30 minutes will scale linearly with Bronze size; need delta CDC isolation or partitioning',
      'Direct Lake will fall back during Silver runs'
    ],
    correct: 2,
    explanation: 'A naive MERGE that scans the full 10 TB Bronze each cycle does not scale. Solutions: partition Bronze by ingestion date, isolate the delta CDC since last Silver run, or use Delta Change Data Feed (CDF).',
    whyWrong: {
      0: 'Unbounded growth is real but is a cost issue, not the perf bottleneck.',
      1: 'Spark CAN read Bronze — that is its native shape.',
      3: 'Direct Lake fallback is unrelated to Silver job runs.'
    },
    source: SRC.notebooks,
    tags: ['medallion', 'merge', 'performance']
  }),
  single({
    id: 'prl-020', domain: 'prepare', subtopic: 'medallion', difficulty: 3,
    prompt: 'Which medallion principle BEST explains why Bronze should be append-only and never modified?',
    options: [
      'Append-only data is faster to query',
      'It enables full replay/recovery and immutable audit history of source data',
      'Delta does not allow updates in Bronze layer',
      'It is a Power BI requirement'
    ],
    correct: 1,
    explanation: 'Append-only Bronze provides a faithful, immutable log of source state — enabling full replay if Silver/Gold logic changes, and a clean audit trail for governance.',
    whyWrong: {
      0: 'Append-only is not inherently faster to query.',
      2: 'Delta supports updates — appending is a CHOICE for Bronze, not a constraint.',
      3: 'Power BI does not require this.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'design']
  }),
  multi({
    id: 'prl-021', domain: 'prepare', subtopic: 'medallion', difficulty: 4,
    prompt: 'Which patterns are CORRECT for serving a Direct Lake semantic model from a medallion lakehouse?',
    options: [
      'Materialise Gold star-schema tables and point Direct Lake at them',
      'Apply V-Order and OPTIMIZE on Gold tables to keep them framable',
      'Skip Silver entirely and read Bronze straight from Direct Lake',
      'Compute calculated columns at the model layer rather than upstream',
      'Keep partition counts reasonable on Gold (avoid millions of small files)'
    ],
    correct: [0, 1, 4],
    explanation: 'Gold + V-Order + reasonable partitioning is the canonical Direct Lake setup. Skipping Silver makes Bronze too dirty; calculated columns on the model break Direct Lake (forces fallback).',
    whyWrong: {
      2: 'Bronze is unconformed — Direct Lake will struggle and BI metrics will be wrong.',
      3: 'Calculated columns on the model break Direct Lake — push them upstream to Gold.'
    },
    source: SRC.fabricArch,
    tags: ['medallion', 'direct-lake', 'gold']
  }),

  // ───────── Notebook vs Dataflow vs T-SQL choice (22-26) ─────────
  single({
    id: 'prl-022', domain: 'prepare', subtopic: 'transform', difficulty: 3,
    prompt: 'A team of analysts with strong Power Query skills must transform a 6 GB CSV daily into a Lakehouse Delta table, with simple type casting and 4 lookups. Which tool is BEST?',
    options: ['Spark notebook', 'Dataflow Gen2', 'T-SQL stored procedure', 'KQL'],
    correct: 1,
    explanation: 'Power Query M skills + low-code shape + modest volume = Dataflow Gen2. It writes directly to Lakehouse, runs on a schedule, and analysts can author it.',
    whyWrong: {
      0: 'Notebook is over-engineered for simple Power-Query-shaped transforms.',
      2: 'T-SQL stored procedure does not run against Lakehouse Delta files directly.',
      3: 'KQL targets Eventhouse, not Lakehouse Delta.'
    },
    source: SRC.dataflow,
    tags: ['dataflow', 'choice']
  }),
  single({
    id: 'prl-023', domain: 'prepare', subtopic: 'notebooks', difficulty: 4,
    prompt: 'A 2 TB nightly job needs custom-tuned cluster parallelism, a Python UDF for fuzzy address matching, and unit-tested code in Git. Which tool fits BEST?',
    options: ['Dataflow Gen2', 'Spark notebook', 'T-SQL CTAS in Warehouse', 'Reflex (Activator)'],
    correct: 1,
    explanation: 'Code-first, Git-friendly, custom Python UDF, cluster-tunable — that is the notebook sweet spot.',
    whyWrong: {
      0: 'Dataflow Gen2 is low-code; harder to unit test and lacks custom Python UDFs.',
      2: 'T-SQL is poor for Python UDFs and 2 TB cluster-tunable Spark jobs.',
      3: 'Reflex is for downstream triggers, not transformation.'
    },
    source: SRC.notebooks,
    tags: ['notebooks', 'choice']
  }),
  multi({
    id: 'prl-024', domain: 'prepare', subtopic: 'transform', difficulty: 4,
    prompt: 'When a SQL-skilled team needs to transform Warehouse data with set-based operations, which patterns are appropriate?',
    options: [
      'CTAS (CREATE TABLE AS SELECT) into a new staging table',
      'INSERT…SELECT into a target Warehouse table',
      'A Spark MERGE running against the Warehouse',
      'A Dataflow Gen2 with Power Query M',
      'A T-SQL stored procedure orchestrating multi-step ELT'
    ],
    correct: [0, 1, 4],
    explanation: 'CTAS, INSERT…SELECT, and stored procedures are native T-SQL. Spark cannot directly MERGE into a Warehouse (Warehouse is read-only via OneLake from Spark). Dataflow is unnecessary for SQL-skilled teams.',
    whyWrong: {
      2: 'Spark cannot natively WRITE/MERGE into a Warehouse table; Warehouse is read-only via OneLake from Spark.',
      3: 'Dataflow is a fine option but adds a tool a SQL team does not need.'
    },
    source: SRC.tsql,
    tags: ['warehouse', 'tsql', 'ctas']
  }),
  single({
    id: 'prl-025', domain: 'prepare', subtopic: 'pipelines', difficulty: 3,
    prompt: 'Which Fabric ITEM orchestrates a chain like "run Dataflow → wait → run Notebook → on failure send email"?',
    options: ['Notebook', 'Data Pipeline', 'Dataflow Gen2', 'Reflex'],
    correct: 1,
    explanation: 'Data Pipelines (Data Factory in Fabric) orchestrate chained activities with conditional logic and notifications. Notebooks/Dataflows are units OF orchestration, not orchestrators.',
    whyWrong: {
      0: 'Notebook executes code; it is not an orchestrator of other items.',
      2: 'Dataflow Gen2 transforms data; it does not orchestrate a chain of items.',
      3: 'Reflex triggers downstream actions on conditions; not a general-purpose orchestrator.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'orchestration']
  }),
  multi({
    id: 'prl-026', domain: 'prepare', subtopic: 'transform', difficulty: 5,
    prompt: 'A team must choose ONE primary tool for a transformation tier. Which decision factors push toward NOTEBOOK over Dataflow Gen2?',
    options: [
      'Workload exceeds 1 TB/day',
      'Custom Python or Scala UDFs are required',
      'The team is mostly Power Query / Excel analysts',
      'Code must be unit-tested and version-controlled in Git',
      'Pipeline must be authored quickly with low ramp-up'
    ],
    correct: [0, 1, 3],
    explanation: 'Volume, custom UDFs, and Git/test discipline favor notebooks. Power Query teams and quick low-ramp authoring favor Dataflow Gen2.',
    whyWrong: {
      2: 'Power Query / Excel teams favor Dataflow Gen2 — notebook ramp is steep.',
      4: 'Quick authoring with low ramp-up is the Dataflow Gen2 sweet spot.'
    },
    source: SRC.notebooks,
    tags: ['notebook-vs-dataflow', 'decision']
  }),

  // ───────── OneLake patterns (27-30) ─────────
  single({
    id: 'prl-027', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'OneLake is best described as which of the following?',
    options: [
      'A separate storage account customers must provision',
      'A logical, tenant-wide data lake automatically present in every Fabric tenant',
      'A copy-based data warehouse',
      'A read-only KQL store'
    ],
    correct: 1,
    explanation: 'OneLake is a SINGLE logical data lake provisioned automatically with each tenant; every Fabric workspace lives inside it. It removes per-workload provisioning of storage accounts.',
    whyWrong: {
      0: 'It is not a separate provisioned storage account.',
      2: 'It is a lake, not a warehouse.',
      3: 'It is a lake hosting many surfaces, not KQL-only.'
    },
    source: SRC.fabricArch,
    tags: ['onelake', 'fundamentals']
  }),
  single({
    id: 'prl-028', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A data steward must enforce that ALL Fabric workspaces in a domain use a SHARED reference dimension Lakehouse — without each team copying it. Which pattern fits?',
    options: [
      'Distribute the source bytes via a OneDrive folder',
      'Publish the dimension Lakehouse and have consumer workspaces use OneLake Shortcuts to it',
      'Mirror the dimension Lakehouse',
      'Use a Reflex to push updates to consumers'
    ],
    correct: 1,
    explanation: 'Shortcuts are zero-copy and update-live. The dimension owner publishes once; consumers reference via shortcut. Single source of truth, no duplication, automatic propagation.',
    whyWrong: {
      0: 'OneDrive is not a Fabric data-sharing surface.',
      2: 'Mirroring targets external transactional DBs, not Fabric→Fabric distribution.',
      3: 'Reflex is for triggering actions, not zero-copy distribution.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'governance']
  }),
  multi({
    id: 'prl-029', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'Which sources are SUPPORTED for OneLake shortcuts?',
    options: [
      'Another OneLake workspace/Lakehouse in the same tenant',
      'ADLS Gen2',
      'Amazon S3',
      'Local filesystem on a Fabric capacity node',
      'Google Cloud Storage'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Internal OneLake, ADLS Gen2, S3, and GCS are supported (as of GA). Dataverse and a few others are also supported. There is no "local capacity-node filesystem" surface for shortcuts.',
    whyWrong: {
      3: 'Capacity-node filesystem is not a supported shortcut target — Fabric capacity is a managed service.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'sources']
  }),
  single({
    id: 'prl-030', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'When a Lakehouse holds a OneLake shortcut to ADLS Gen2 raw files, which engine reads the bytes physically from the source on each query?',
    options: [
      'OneLake caches the bytes locally on first read',
      'The Fabric query engine fetches directly from ADLS through the shortcut on every query',
      'Direct Lake materialises a copy',
      'V-Order rewrites them locally'
    ],
    correct: 1,
    explanation: 'Shortcuts are virtual references — bytes are fetched from the source on each read. There is no implicit cache or copy; performance and source ACL apply per-query.',
    whyWrong: {
      0: 'No implicit cache.',
      2: 'Direct Lake reads through the shortcut; it does not duplicate.',
      3: 'V-Order applies to managed Delta in the lakehouse, not shortcut source bytes.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['shortcut', 'mechanics']
  }),

  // ───────── Polaris-engine specifics + CTAS (31-34) ─────────
  single({
    id: 'prl-031', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which T-SQL feature is NOT supported in Fabric Warehouse (Polaris engine)?',
    options: ['CTAS', 'INSERT…SELECT', 'IDENTITY columns with auto-increment', 'CREATE VIEW'],
    correct: 2,
    explanation: 'Polaris does not support IDENTITY auto-increment. Use sequences, MERGE-derived keys, or generated keys upstream. CTAS, INSERT…SELECT, and views are all supported.',
    whyWrong: {
      0: 'CTAS is the canonical Polaris ELT building block.',
      1: 'INSERT…SELECT works.',
      3: 'CREATE VIEW works.'
    },
    source: SRC.tsql,
    tags: ['polaris', 'identity', 'unsupported']
  }),
  multi({
    id: 'prl-032', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which Fabric Warehouse limitations should an architect plan around?',
    options: [
      'No CLR functions',
      'No cursors',
      'No MERGE statement',
      'No IDENTITY columns with auto-increment',
      'No multi-statement transactions'
    ],
    correct: [0, 1, 3],
    explanation: 'CLR, cursors, and IDENTITY auto-increment are not supported. MERGE IS supported. Multi-statement transactions ARE supported (one of Warehouse\'s headline features vs Lakehouse SQL endpoint).',
    whyWrong: {
      2: 'MERGE IS supported in Fabric Warehouse.',
      4: 'Multi-statement transactions ARE supported — they are a key Warehouse feature.'
    },
    source: SRC.tsql,
    tags: ['polaris', 'limitations']
  }),
  single({
    id: 'prl-033', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which T-SQL pattern is the CANONICAL way to materialise a transformed table in Fabric Warehouse?',
    options: [
      'CREATE TABLE AS SELECT (CTAS)',
      'SELECT INTO #tempTable, then CREATE TABLE',
      'INSERT…VALUES one row at a time',
      'Spark MERGE from a notebook into the Warehouse'
    ],
    correct: 0,
    explanation: 'CTAS is the workhorse — single-statement, set-based, schema-and-data in one shot. Idiomatic Polaris ELT.',
    whyWrong: {
      1: 'Polaris supports temp tables but the CTAS pattern is the canonical answer.',
      2: 'Per-row INSERT is anti-pattern in any analytical engine.',
      3: 'Spark cannot natively WRITE to a Warehouse; that is a Lakehouse pattern.'
    },
    source: SRC.tsql,
    tags: ['ctas', 'polaris']
  }),
  multi({
    id: 'prl-034', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which performance levers exist in Fabric Warehouse for a slow analytical query?',
    options: [
      'Update statistics on join columns',
      'Materialise intermediate results with CTAS into a staging table',
      'Reduce columns in SELECT to leverage columnstore',
      'Add a clustered B-tree index',
      'Add an IDENTITY column'
    ],
    correct: [0, 1, 2],
    explanation: 'Statistics, materialisation via CTAS, and column pruning are real Polaris levers. Clustered B-tree indexes do not exist in Polaris (everything is columnar). IDENTITY does not address perf and is not even supported.',
    whyWrong: {
      3: 'Polaris is columnstore-only; B-tree indexes do not exist as a tuning lever.',
      4: 'IDENTITY is not supported and is not a perf lever.'
    },
    source: SRC.tsql,
    tags: ['polaris', 'performance']
  }),

  // ───────── Mirrored DB lifecycle + Eventhouse vs Lakehouse (35-40) ─────────
  order({
    id: 'prl-035', domain: 'prepare', subtopic: 'mirroring', difficulty: 4,
    prompt: 'Order the lifecycle steps of setting up a Fabric Mirrored Database for Azure SQL DB.',
    options: [
      'Grant the source DB the required CDC / replication permissions',
      'Create the Mirrored Database item in the Fabric workspace and configure connection',
      'Initial snapshot replicates to OneLake as Delta',
      'Continuous CDC replication keeps the Fabric copy in sync',
      'Connect a Direct Lake semantic model to the mirrored copy'
    ],
    explanation: 'Permissions → create item → snapshot → continuous CDC → consume via Direct Lake. You cannot snapshot before permissions are granted, and you cannot consume before snapshot lands.',
    whyWrong: {},
    source: SRC.mirroring,
    tags: ['mirroring', 'lifecycle']
  }),
  single({
    id: 'prl-036', domain: 'prepare', subtopic: 'mirroring', difficulty: 5,
    prompt: 'A Mirrored Database stops replicating; the lag has grown to 14 hours. Which is the MOST likely root cause?',
    options: [
      'Source DB CDC log retention exhausted (the mirror cannot catch up)',
      'V-Order is disabled on the mirrored Delta',
      'Direct Lake fallback is inhibiting replication',
      'The Fabric capacity is overloaded'
    ],
    correct: 0,
    explanation: 'Mirroring relies on the source DB\'s change-data-capture/log retention. If the log is rotated faster than Fabric can read, replication breaks and you must reseed. Other items (V-Order, Direct Lake fallback, capacity) do not stop replication.',
    whyWrong: {
      1: 'V-Order is irrelevant to replication ingestion.',
      2: 'Direct Lake fallback is read-side; it does not throttle replication.',
      3: 'Capacity overload may slow downstream queries but not stop CDC ingestion.'
    },
    source: SRC.mirroring,
    tags: ['mirroring', 'troubleshooting']
  }),
  single({
    id: 'prl-037', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 3,
    prompt: 'A team must store 50,000 events/sec of IoT telemetry with sub-second query freshness and KQL analytics. Which item fits BEST?',
    options: ['Lakehouse', 'Warehouse', 'Eventhouse / KQL Database', 'Mirrored Database'],
    correct: 2,
    explanation: 'Eventhouse / KQL DB is purpose-built for high-cardinality streaming with sub-second ingest-to-query and KQL analytics. Lakehouse and Warehouse are batch-oriented; mirroring is for transactional sources.',
    whyWrong: {
      0: 'Lakehouse is batch / Delta-shaped; not streaming-shaped.',
      1: 'Warehouse is T-SQL/BI; not optimised for 50k/sec.',
      3: 'Mirroring targets transactional DB sources, not raw streams.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'streaming']
  }),
  multi({
    id: 'prl-038', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    prompt: 'For TIME-SERIES analytics, when is EVENTHOUSE the better choice vs LAKEHOUSE?',
    options: [
      'Sub-second query freshness on streaming data',
      'High-cardinality time-series with hot/cold storage tiering',
      'Native KQL operators like make-series, mv-expand, and bin()',
      'Simple nightly batch BI with no streaming',
      'Scenarios with strictly transactional T-SQL semantics'
    ],
    correct: [0, 1, 2],
    explanation: 'Eventhouse wins on streaming freshness, time-series-shaped storage, and native KQL operators. Nightly batch is Lakehouse territory; transactional T-SQL is Warehouse.',
    whyWrong: {
      3: 'Nightly batch is a Lakehouse / Warehouse case, not Eventhouse.',
      4: 'Eventhouse is KQL, not T-SQL — transactional semantics belong on Warehouse.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse-vs-lakehouse']
  }),
  single({
    id: 'prl-039', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 4,
    prompt: 'A team has 90 days of hot telemetry in Eventhouse and wants to keep 5 years of cold history queryable from Power BI. Which pattern is BEST?',
    options: [
      'Keep all 5 years in Eventhouse hot tier',
      'Eventhouse hot for 90 days; periodically export aged data to a Lakehouse Delta table for cold queries',
      'Mirror the Eventhouse to a Warehouse',
      'Move everything to a Warehouse and drop Eventhouse'
    ],
    correct: 1,
    explanation: 'Two-tier pattern: Eventhouse keeps recent hot data with sub-second freshness; Lakehouse Delta holds cold history accessible via Direct Lake. Each item plays to its strengths.',
    whyWrong: {
      0: 'Keeping 5 years in Eventhouse hot tier is expensive and unnecessary.',
      2: 'Eventhouse-to-Warehouse mirroring is not a supported pattern.',
      3: 'Dropping Eventhouse loses the streaming freshness the workload needs.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse', 'tiering', 'lakehouse']
  }),
  multi({
    id: 'prl-040', domain: 'prepare', subtopic: 'fabric-architecture', difficulty: 5,
    prompt: 'A senior architect must choose between Eventhouse and Lakehouse for a 30-day high-cardinality observability stack with 80k events/sec and sub-second freshness. Which arguments support EVENTHOUSE?',
    options: [
      'Sub-second ingest-to-query meets the freshness SLA',
      'KQL operators (make-series, mv-expand, summarize bin) are native to the workload',
      'High-cardinality time-series compression is built-in',
      'Better fit for nightly batch reporting',
      'Lakehouse SQL endpoint can serve KQL operators directly'
    ],
    correct: [0, 1, 2],
    explanation: 'Sub-second freshness, native KQL, and time-series compression are Eventhouse strengths. Nightly batch is a Lakehouse case. Lakehouse SQL endpoint does NOT serve KQL operators.',
    whyWrong: {
      3: 'Nightly batch reporting is a Lakehouse / Warehouse pattern, not Eventhouse.',
      4: 'False — Lakehouse SQL endpoint is T-SQL flavour, not KQL.'
    },
    source: SRC.eventhouse,
    tags: ['eventhouse-vs-lakehouse', 'observability']
  })
];
