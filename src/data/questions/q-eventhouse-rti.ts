import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

// 25 Eventhouse + Real-Time Intelligence (RTI) questions (eh-001..eh-025)
// for the prepare domain. Closes the prepare-domain coverage gap on RTI:
// Eventhouse vs KQL DB vs Eventstream relationships, ingestion pipelines,
// update policies, materialized views, retention/caching, KQL DB security,
// OneLake availability, and Real-Time dashboards vs Power BI reports.
//
// Subtopic vocabulary (must match the project's allowed list):
//   eventhouse, eventstream, kql-db, kql-update-policy,
//   kql-materialized-views, kql-management, rti-routing

const SRC_RTI: Record<string, SourceAnchor> = {
  eventhouse: { category: 'eventhouse-rti', note: 'Eventhouse: container of KQL databases, OneLake-backed' },
  eventstream: { category: 'eventhouse-rti', note: 'Eventstream: no-code routing of streaming events to destinations' },
  kqlDb: { category: 'eventhouse-rti', note: 'KQL Database: native, write-through to OneLake as Delta' },
  updatePolicy: { category: 'eventhouse-rti', note: 'KQL update policy: ingest-time row transformation into target table' },
  matView: { category: 'eventhouse-rti', note: 'Materialized views: precomputed aggregations over append-only sources' },
  mgmt: { category: 'eventhouse-rti', note: 'KQL management: roles, retention, hot cache, ingestion mapping' },
  routing: { category: 'eventhouse-rti', note: 'RTI routing: sources -> Eventstream -> destinations (KQL DB, Lakehouse, Reflex)' }
};

export const eventhouseRti: Question[] = [
  // ── 001: Eventhouse vs KQL DB vs Eventstream — relationships ───
  single({
    id: 'eh-001', domain: 'prepare', subtopic: 'eventhouse', difficulty: 3,
    prompt:
      'Which statement BEST describes the relationship between Eventhouse, KQL Database, and Eventstream in Microsoft Fabric Real-Time Intelligence?',
    options: [
      'Eventhouse is a workspace item that contains one or more KQL Databases; Eventstream is a separate item that ROUTES streaming events into destinations such as a KQL Database',
      'Eventstream contains Eventhouses, which contain KQL Databases — Eventstream is the top-level item',
      'KQL Database and Eventhouse are synonyms; Eventstream is just an alternate query interface',
      'Eventhouse is the streaming source; KQL Database queries it directly without any intermediate item'
    ],
    correct: 0,
    explanation:
      'Eventhouse is the container item that holds one or more KQL Databases (each KQL DB has its own data and policies). Eventstream is a SEPARATE Fabric item — a no-code routing surface that pulls events from sources and pushes them to destinations like a KQL DB, Lakehouse, or Reflex. The three items have distinct roles.',
    whyWrong: {
      1: 'Hierarchy is inverted — Eventhouse contains KQL DBs; Eventstream is its own item, not a parent.',
      2: 'KQL DB and Eventhouse are NOT synonyms — Eventhouse is the container, KQL DB is the database it holds.',
      3: 'Eventhouse is not itself the streaming source; sources are Event Hubs, IoT Hub, Kafka, etc., wired in via Eventstream.'
    },
    source: SRC_RTI.eventhouse,
    tags: ['eventhouse', 'kql-db', 'eventstream', 'rti']
  }),

  // ── 002: Eventstream sources — multi ───────────────────────────
  multi({
    id: 'eh-002', domain: 'prepare', subtopic: 'eventstream', difficulty: 3,
    prompt: 'Which of the following are valid SOURCES that can be wired into a Fabric Eventstream?',
    options: [
      'Azure Event Hubs',
      'Azure IoT Hub',
      'Apache Kafka (including Confluent)',
      'Sample data (built-in synthetic feed)',
      'Custom Endpoint (push events via Event Hubs / Kafka / AMQP protocol)',
      'Power BI semantic model refresh history'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'Eventstream supports Azure Event Hubs, IoT Hub, Kafka, the built-in Sample data feed, and a Custom Endpoint that exposes Event Hubs / Kafka / AMQP-compatible ingest URLs. A Power BI semantic model refresh history is monitoring metadata, not a streaming source.',
    whyWrong: {
      5: 'Power BI semantic model refresh history is operational metadata; it is not a streaming source for Eventstream.'
    },
    source: SRC_RTI.eventstream,
    tags: ['eventstream', 'sources', 'event-hubs', 'iot-hub', 'kafka']
  }),

  // ── 003: Eventstream destinations — multi ──────────────────────
  multi({
    id: 'eh-003', domain: 'prepare', subtopic: 'eventstream', difficulty: 3,
    prompt: 'Which of the following are valid DESTINATIONS for a Fabric Eventstream?',
    options: [
      'KQL Database (inside an Eventhouse)',
      'Lakehouse (lands events into a Delta table)',
      'Another Eventstream (fan-out / chain)',
      'Reflex (Activator) — trigger actions when conditions are met',
      'Custom Endpoint (push events to an external consumer)',
      'Power BI Premium dataflow Gen1 refresh queue'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'Eventstream destinations include KQL DB, Lakehouse, another Eventstream, Reflex (Activator) for action triggers, and a Custom Endpoint for downstream consumers. Power BI Premium Gen1 dataflows are not Eventstream destinations — they are a legacy ingestion item, not part of RTI routing.',
    whyWrong: {
      5: 'Dataflow Gen1 is not an Eventstream destination — RTI does not push events into the Gen1 refresh queue.'
    },
    source: SRC_RTI.eventstream,
    tags: ['eventstream', 'destinations', 'kql-db', 'lakehouse', 'reflex']
  }),

  // ── 004: streaming vs queued ingestion ─────────────────────────
  single({
    id: 'eh-004', domain: 'prepare', subtopic: 'kql-db', difficulty: 4,
    prompt:
      'A KQL Database receives a high-volume Eventstream. Which statement BEST contrasts STREAMING ingestion with QUEUED (batched) ingestion?',
    options: [
      'Streaming ingestion targets sub-second to seconds latency at the cost of smaller, more frequent extents; queued ingestion batches rows into larger extents for higher throughput at the cost of higher end-to-end latency',
      'Streaming ingestion is always faster end-to-end and there is no reason to use queued ingestion in production',
      'Queued ingestion writes directly to the hot cache; streaming ingestion writes only to cold storage',
      'Streaming ingestion bypasses ingestion mappings; queued ingestion requires them'
    ],
    correct: 0,
    explanation:
      'Streaming ingestion optimizes for low latency by committing small batches frequently; queued (batched) ingestion aggregates rows into larger extents (default ~5 min / 1 GB / 1000 files, whichever first) for higher steady-state throughput. The trade is latency vs throughput; both write to KQL DB storage and both can use mappings.',
    whyWrong: {
      1: 'Queued is the throughput-optimized path; streaming is not unconditionally better.',
      2: 'Both ingest into KQL DB storage following the same hot-cache policy; the storage path is not split that way.',
      3: 'Both ingestion modes use ingestion mappings to shape incoming data into table columns.'
    },
    source: SRC_RTI.kqlDb,
    tags: ['kql-db', 'ingestion', 'streaming', 'queued', 'latency']
  }),

  // ── 005: ingestion mapping — code reading ──────────────────────
  single({
    id: 'eh-005', domain: 'prepare', subtopic: 'kql-db', difficulty: 4,
    prompt:
      'Given:\n```kql\n.create table Telemetry (Ts:datetime, DeviceId:string, Temp:real, Payload:dynamic)\n\n.create table Telemetry ingestion json mapping "TelemetryMap"\n```\n```json\n[\n  { "column":"Ts",       "Properties":{"path":"$.timestamp"} },\n  { "column":"DeviceId", "Properties":{"path":"$.device.id"} },\n  { "column":"Temp",     "Properties":{"path":"$.metrics.temperature"} },\n  { "column":"Payload",  "Properties":{"path":"$"} }\n]\n```\nWhat does the JSON mapping accomplish?',
    options: [
      'It tells the ingestion engine how to project specific JSONPath expressions in each incoming event onto the named columns of the Telemetry table — including a copy of the entire event into the dynamic Payload column',
      'It rewrites incoming events to add a Payload column at ingest time using a server-side function',
      'It is required to enable streaming ingestion; queued ingestion cannot use mappings',
      'It defines a row-level security policy that filters which columns each user can see'
    ],
    correct: 0,
    explanation:
      'An ingestion mapping declares how to extract values from each incoming JSON event (via JSONPath) into table columns. Mapping `Payload` to `$` keeps a full copy of each event in a dynamic column for ad-hoc inspection. Mappings work for both streaming and queued ingestion; they are not RLS.',
    whyWrong: {
      1: 'No server-side function — the mapping is a declarative projection, not a transform function.',
      2: 'Mappings work for both streaming AND queued ingestion.',
      3: 'RLS is configured via `.add table policy row_level_security`, not via ingestion mapping.'
    },
    source: SRC_RTI.kqlDb,
    tags: ['kql-db', 'ingestion-mapping', 'json', 'jsonpath']
  }),

  // ── 006: update policy — concept ───────────────────────────────
  single({
    id: 'eh-006', domain: 'prepare', subtopic: 'kql-update-policy', difficulty: 4,
    prompt:
      'Which statement BEST describes a KQL update policy on a target table?',
    options: [
      'A function-based, ingest-time transform: rows ingested into a SOURCE table are passed through a query-defined function and the output is APPENDED to the TARGET table — useful for parsing, filtering, or shaping raw events into curated tables',
      'A scheduled refresh that re-runs nightly to rebuild the target table from scratch',
      'A row-level security filter that hides specific rows from queries on the target table',
      'A retention policy that controls how long rows live before being deleted'
    ],
    correct: 0,
    explanation:
      'An update policy bound to a target table fires SYNCHRONOUSLY on each ingestion into a source (parent) table: the policy function executes against the newly ingested rows and the output is appended to the target. Common use: keep raw events in a bronze table and shape/filter them into curated silver tables in one pipeline.',
    whyWrong: {
      1: 'Not scheduled — the policy fires on each ingest, not on a clock.',
      2: 'RLS is `.add table policy row_level_security` — a different policy.',
      3: 'Retention is `.alter table policy retention` — separate concept.'
    },
    source: SRC_RTI.updatePolicy,
    tags: ['kql-update-policy', 'ingestion', 'transform', 'bronze-silver']
  }),

  // ── 007: update policy syntax — code reading ───────────────────
  single({
    id: 'eh-007', domain: 'prepare', subtopic: 'kql-update-policy', difficulty: 5,
    prompt:
      'Given:\n```kql\n.create-or-alter function ParseRaw() {\n    RawEvents\n    | where isnotempty(Payload)\n    | extend Parsed = parse_json(Payload)\n    | project Ts, DeviceId = tostring(Parsed.deviceId), Temp = toreal(Parsed.temp)\n}\n\n.alter table CleanEvents policy update\n```\n```json\n[\n  {\n    "IsEnabled": true,\n    "Source": "RawEvents",\n    "Query": "ParseRaw()",\n    "IsTransactional": true,\n    "PropagateIngestionProperties": true\n  }\n]\n```\nWhat is the EFFECT of this configuration?',
    options: [
      'Every ingestion into RawEvents triggers ParseRaw() against the new rows; the result is appended to CleanEvents transactionally — so a parse failure rolls back the source ingestion as well',
      'CleanEvents will be rebuilt from scratch every night by re-running ParseRaw() over all of RawEvents',
      'New rows in CleanEvents are pushed BACK into RawEvents (reverse propagation)',
      'The policy disables ingestion into RawEvents until a successful manual run of ParseRaw()'
    ],
    correct: 0,
    explanation:
      'An update policy with Source=RawEvents and Query=ParseRaw() runs ParseRaw() on each ingestion batch into RawEvents and appends the output to the policy-bound table (CleanEvents). With IsTransactional=true, a failure in the policy rolls back the source ingestion — strong consistency across the bronze->silver hop.',
    whyWrong: {
      1: 'Not nightly — it fires on each ingestion event, not on a schedule.',
      2: 'Update policies flow source -> target only; not bidirectional.',
      3: 'It does not block ingestion; it transforms ingested rows.'
    },
    source: SRC_RTI.updatePolicy,
    tags: ['kql-update-policy', 'transactional', 'function', 'code-reading']
  }),

  // ── 008: update policy gotchas — multi ─────────────────────────
  multi({
    id: 'eh-008', domain: 'prepare', subtopic: 'kql-update-policy', difficulty: 4,
    prompt: 'Which statements about KQL update policies are TRUE?',
    options: [
      'The policy QUERY must be referentially-bound to the source table (typically via a stored function that reads the source)',
      'Setting IsTransactional=true causes any policy-function failure to FAIL the source ingestion as well',
      'Update policies can chain — table B has an update policy reading from A, and table C has an update policy reading from B',
      'Update policies execute only on streaming ingestion; queued ingestion bypasses them',
      'You can attach multiple update policies to the SAME target table from DIFFERENT source tables'
    ],
    correct: [0, 1, 2, 4],
    explanation:
      'Update policies require their query/function to read the source table; transactional mode propagates failure back to the source ingest; chaining is supported (A->B->C); and a target table can have policies from multiple sources. They fire on BOTH streaming and queued ingestion — that is the whole point.',
    whyWrong: {
      3: 'Update policies fire on every ingestion into the source table, including queued ingestion.'
    },
    source: SRC_RTI.updatePolicy,
    tags: ['kql-update-policy', 'transactional', 'chaining', 'gotchas']
  }),

  // ── 009: materialized view — concept ───────────────────────────
  single({
    id: 'eh-009', domain: 'prepare', subtopic: 'kql-materialized-views', difficulty: 4,
    prompt:
      'Which workload is the BEST fit for a KQL materialized view?',
    options: [
      'A frequently-queried aggregation (e.g., dcount of distinct users per day) over an append-only source table where you want pre-computed, incrementally-maintained results',
      'An ad-hoc one-off investigation query that you will run once and never again',
      'Row-level security filtering (showing different rows per user role)',
      'Persisting raw streaming events for compliance (no aggregation needed)'
    ],
    correct: 0,
    explanation:
      'Materialized views in KQL are precomputed, incrementally-maintained aggregations on top of an append-only source table. They are designed for repeated aggregate queries (count, dcount, sum, percentile, arg_max, take_any...) where the cost of computing on every read is high. They are not for ad-hoc work, RLS, or raw retention.',
    whyWrong: {
      1: 'One-off queries do not justify the maintenance overhead of a materialized view.',
      2: 'RLS is a separate policy mechanism, not a view type.',
      3: 'Raw retention belongs in the base table with a retention policy; views are aggregates.'
    },
    source: SRC_RTI.matView,
    tags: ['kql-materialized-views', 'aggregation', 'append-only']
  }),

  // ── 010: materialized view — code reading ──────────────────────
  single({
    id: 'eh-010', domain: 'prepare', subtopic: 'kql-materialized-views', difficulty: 4,
    prompt:
      'Given:\n```kql\n.create materialized-view DailyActiveUsers on table SignInEvents\n{\n    SignInEvents\n    | summarize Users = dcount(UserId), Sessions = count() by Day = startofday(Ts)\n}\n```\nWhich statement is MOST accurate?',
    options: [
      'The view is built once over historical SignInEvents and then incrementally maintained as new events arrive; subsequent queries against materialized_view("DailyActiveUsers") read the precomputed Day-level aggregates',
      'The view re-runs the full summarize on every query, just like a regular `view` keyword',
      'The view requires a second `.create-or-alter` statement before it can be queried',
      'Materialized views do not support `dcount`; only `count` and `sum` are allowed'
    ],
    correct: 0,
    explanation:
      'A materialized view is built up-front (backfill) and then incrementally maintained as new rows land in the source. Queries read precomputed aggregates via `materialized_view("name")`. Supported aggregates include count, dcount, sum, avg, min, max, percentile, arg_max, arg_min, take_any, hll, tdigest, etc.',
    whyWrong: {
      1: 'That is the regular `.create function` pattern; materialized views precompute and incrementally maintain.',
      2: 'A single `.create materialized-view` is enough; no second statement required.',
      3: '`dcount` is fully supported (often the headline reason to use a matview).'
    },
    source: SRC_RTI.matView,
    tags: ['kql-materialized-views', 'dcount', 'incremental', 'code-reading']
  }),

  // ── 011: materialized view refresh semantics — multi ───────────
  multi({
    id: 'eh-011', domain: 'prepare', subtopic: 'kql-materialized-views', difficulty: 4,
    prompt: 'Which statements about KQL materialized-view refresh semantics are TRUE?',
    options: [
      'Materialized views refresh INCREMENTALLY — only new rows in the source contribute to the next maintenance cycle',
      'Querying via `materialized_view("Name")` returns only the precomputed (materialized) portion; the unmaterialized tail in the source is not included',
      'Querying the view by NAME (without the helper) returns the materialized portion UNION the unmaterialized tail — slower but always up-to-the-second',
      'Materialized views require a manual nightly REBUILD job; otherwise they go stale',
      'The source table for a materialized view should be APPEND-ONLY — updates and deletes can break or invalidate the view'
    ],
    correct: [0, 1, 2, 4],
    explanation:
      'Materialized views are incrementally maintained on append; querying via `materialized_view("Name")` reads only the materialized portion (fast, slightly stale), while querying by name reads materialized UNION the unmaterialized tail (slower, fully current). Source should be append-only — updates/deletes can invalidate the maintained aggregates.',
    whyWrong: {
      3: 'Maintenance is automatic on ingest; no nightly rebuild is required.'
    },
    source: SRC_RTI.matView,
    tags: ['kql-materialized-views', 'incremental', 'staleness', 'append-only']
  }),

  // ── 012: retention policy — concept ────────────────────────────
  single({
    id: 'eh-012', domain: 'prepare', subtopic: 'kql-management', difficulty: 3,
    prompt:
      'A KQL Database table has a RETENTION policy of 90 days and a HOT CACHE policy of 7 days. Which statement is correct?',
    options: [
      'Rows are kept for 90 days total; the most recent 7 days live in hot cache (fast SSD/RAM near compute) while days 8-90 live in cold storage and are slower to query',
      'Rows older than 7 days are physically deleted; only hot data exists',
      'Rows older than 90 days remain queryable but are read-only; hot cache is a separate index',
      'Hot cache must be >= retention; setting hot=7 with retention=90 is invalid'
    ],
    correct: 0,
    explanation:
      'Retention controls TOTAL lifetime (90d here — older rows are deleted). Hot cache controls how much of that lifetime is held in fast tier (7d here). Rows in days 8-90 still query, but from cold storage with higher latency. Hot may be <= retention; that is the normal cost-vs-latency tuning.',
    whyWrong: {
      1: 'Retention=90d keeps rows for 90 days; hot=7 is just the cache window.',
      2: 'Rows past retention are deleted, not kept read-only.',
      3: 'Hot < retention is the normal pattern (and the only sensible cost shape).'
    },
    source: SRC_RTI.mgmt,
    tags: ['kql-management', 'retention', 'hot-cache', 'cold-storage']
  }),

  // ── 013: KQL DB roles — multi ──────────────────────────────────
  multi({
    id: 'eh-013', domain: 'prepare', subtopic: 'kql-management', difficulty: 3,
    prompt: 'Which security PRINCIPALS / ROLES are valid at the KQL Database level?',
    options: [
      'Database Admin — full control of the database (schema, policies, principals)',
      'Database User — can query and create tables/functions',
      'Database Viewer — read-only query access (no schema changes)',
      'Database Ingestor — can ingest into existing tables but cannot query',
      'Database Monitor — can view metrics/usage of the database',
      'Database Compiler — can rewrite KQL queries before execution'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'KQL DB roles are Admin, User, Viewer, Ingestor, Monitor, and UnrestrictedViewer — each with distinct rights. There is no "Compiler" role; KQL queries are compiled by the engine, not by a principal.',
    whyWrong: {
      5: 'No "Database Compiler" role exists — compilation is an engine concern, not a security principal.'
    },
    source: SRC_RTI.mgmt,
    tags: ['kql-management', 'security', 'roles', 'rbac']
  }),

  // ── 014: row-level security in KQL DB — code reading ───────────
  single({
    id: 'eh-014', domain: 'prepare', subtopic: 'kql-management', difficulty: 4,
    prompt:
      'Given:\n```kql\n.create-or-alter function RlsForSales() {\n    Sales\n    | where Region == current_principal_details()["UserPrincipalName"]\n}\n\n.alter table Sales policy row_level_security enable "RlsForSales"\n```\nWhich statement is MOST accurate?',
    options: [
      'Every query against Sales (by any non-admin principal) is rewritten to read through RlsForSales(), filtering rows so the caller only sees rows where Region matches their UPN',
      'Only direct queries see the filter; queries that join Sales with another table bypass it',
      'RLS is enforced at ingestion time, not query time — newly ingested rows that violate the policy are rejected',
      'RLS in KQL DB requires Microsoft Entra group membership; raw UPN comparisons are not supported'
    ],
    correct: 0,
    explanation:
      'Enabling row-level security via a function policy makes the engine substitute the policy function for the table reference on every read by a non-admin principal — including joins, lookups, and downstream views. Standard `current_principal_*` functions return caller identity for the predicate.',
    whyWrong: {
      1: 'RLS applies on every read, including joins.',
      2: 'RLS is a query-time row filter, not an ingest-time validator.',
      3: 'Both UPN and group-based predicates are supported via `current_principal_details()` and `current_principal_is_member_of()`.'
    },
    source: SRC_RTI.mgmt,
    tags: ['kql-management', 'rls', 'security', 'code-reading']
  }),

  // ── 015: OneLake availability — concept ────────────────────────
  single({
    id: 'eh-015', domain: 'prepare', subtopic: 'kql-db', difficulty: 4,
    prompt:
      'A KQL Database in Fabric has "OneLake availability" enabled on a table. What does this enable?',
    options: [
      'The KQL DB writes the table THROUGH to OneLake as Delta-Parquet, so other Fabric engines (Spark, T-SQL endpoint, Direct Lake) can query the same data WITHOUT copying it',
      'The KQL DB queries data DIRECTLY from any Lakehouse table without ingestion or shortcut',
      'It enables row-level security automatically on the table',
      'It changes the storage from columnar to row-oriented for low-latency lookups'
    ],
    correct: 0,
    explanation:
      'OneLake availability writes a copy of the KQL table THROUGH to OneLake in Delta-Parquet format (read-only from the KQL side, full Delta semantics on the OneLake side). Other engines (Spark notebooks, the SQL analytics endpoint, Direct Lake semantic models) can then query the table WITHOUT a separate ingestion or shortcut — single-copy, multi-engine.',
    whyWrong: {
      1: 'KQL DB queries Lakehouse data via shortcuts or external tables, not by enabling OneLake availability.',
      2: 'RLS is a separate policy.',
      3: 'KQL storage stays columnar; OneLake availability is about exposure, not storage layout.'
    },
    source: SRC_RTI.kqlDb,
    tags: ['kql-db', 'onelake', 'delta', 'cross-engine']
  }),

  // ── 016: RTI dashboard vs Power BI report — single ─────────────
  single({
    id: 'eh-016', domain: 'prepare', subtopic: 'eventhouse', difficulty: 3,
    prompt:
      'A team needs a continuously-refreshing operational view over a KQL Database with sub-minute latency, KQL-native parameters, and drill-throughs that re-execute KQL on click. Which Fabric surface BEST fits?',
    options: [
      'A Real-Time dashboard built directly on the KQL Database (KQL-native, auto-refresh, parameterized)',
      'A Power BI report in Import mode refreshed every 30 minutes',
      'An Excel workbook connected via OData to the KQL DB',
      'A Power BI paginated report rendered as PDF on a daily schedule'
    ],
    correct: 0,
    explanation:
      'Real-Time dashboards in Fabric are the KQL-native operational surface: tiles compile to KQL, parameters bind into queries, auto-refresh intervals are seconds-to-minutes, and they query the KQL DB directly. Power BI Import has refresh latency measured in minutes-to-hours; paginated PDFs are batch artifacts.',
    whyWrong: {
      1: 'Import mode imposes refresh-batch latency; not suitable for sub-minute operational views.',
      2: 'Excel/OData has no auto-refresh comparable to RT dashboards.',
      3: 'Paginated PDF is a static batch artifact, not a live view.'
    },
    source: SRC_RTI.eventhouse,
    tags: ['eventhouse', 'real-time-dashboard', 'power-bi', 'comparison']
  }),

  // ── 017: when Power BI is the right surface ────────────────────
  single({
    id: 'eh-017', domain: 'prepare', subtopic: 'eventhouse', difficulty: 4,
    prompt:
      'A business needs a polished, semantic-model-driven analytical report over the SAME KQL Database — with measures, RLS via DAX, and bookmarks for storytelling. Which BEST fits?',
    options: [
      'A Power BI report on top of a Direct Lake or DirectQuery semantic model that targets the KQL DB (or its OneLake-available shadow)',
      'A Real-Time dashboard with a hand-written KQL tile per visual',
      'A KQL `.show queries` operational report rendered into Excel',
      'A paginated report rendered to PDF and emailed nightly'
    ],
    correct: 0,
    explanation:
      'Power BI semantic models add measures, relationships, RLS-via-DAX, perspectives, calculation groups, and the full reporting/storytelling surface — none of which Real-Time dashboards provide. With OneLake availability on the KQL table, you can use Direct Lake; otherwise, DirectQuery into the KQL DB.',
    whyWrong: {
      1: 'RT dashboards are operational and KQL-native — no DAX measures, no calc groups, no bookmarks.',
      2: '`.show queries` is a diagnostic command, not a reporting surface.',
      3: 'Paginated PDFs lack interactivity / DAX modeling.'
    },
    source: SRC_RTI.eventhouse,
    tags: ['eventhouse', 'power-bi', 'direct-lake', 'comparison']
  }),

  // ── 018: routing scenario — single ─────────────────────────────
  single({
    id: 'eh-018', domain: 'prepare', subtopic: 'rti-routing', difficulty: 4,
    prompt:
      'IoT devices push telemetry to Azure IoT Hub. The team wants RAW retention in OneLake for compliance, REAL-TIME analytics on the last 7 days, and an ALERT when a temperature breaches a threshold. Which RTI routing BEST fits?',
    options: [
      'Eventstream from IoT Hub fanned to THREE destinations: (1) Lakehouse for raw Delta retention, (2) KQL Database for hot-cache analytics, (3) Reflex/Activator for the temperature trigger',
      'Eventstream into a Lakehouse only; query the Lakehouse directly for real-time analytics and alerts',
      'KQL DB only — write a KQL function that periodically exports raw events to a Lakehouse and emails alerts via REST',
      'Power BI streaming dataset only — push events from IoT Hub straight into Power BI'
    ],
    correct: 0,
    explanation:
      'The canonical RTI fan-out: one Eventstream, three destinations. Lakehouse covers compliance retention as Delta; KQL DB powers hot-cache analytics with sub-second query; Reflex (Activator) evaluates conditions and triggers actions. Each destination plays to its strength rather than overloading one item.',
    whyWrong: {
      1: 'Lakehouse alone cannot match KQL DB query latency for operational analytics, and has no built-in alerting.',
      2: 'Hand-rolled exports and email are an anti-pattern when Eventstream + Lakehouse + Reflex are available.',
      3: 'Power BI streaming datasets are limited and not durable storage.'
    },
    source: SRC_RTI.routing,
    tags: ['rti-routing', 'eventstream', 'lakehouse', 'reflex', 'fan-out']
  }),

  // ── 019: ordering — design an Eventstream pipeline ─────────────
  order({
    id: 'eh-019', domain: 'prepare', subtopic: 'rti-routing', difficulty: 4,
    prompt:
      'Order these steps to build a Fabric Real-Time Intelligence pipeline that ingests Kafka events, curates them, and exposes both an operational dashboard and a Power BI report:',
    options: [
      'Create the Eventhouse and a KQL Database inside it',
      'Define raw and curated tables; attach an UPDATE POLICY that transforms raw rows into curated rows on ingest',
      'Create an Eventstream and wire Kafka as the SOURCE and the KQL DB raw table as the DESTINATION',
      'Build a Real-Time dashboard on the curated table for sub-minute operational views',
      'Enable OneLake availability on the curated table and build a Direct Lake Power BI semantic model on top'
    ],
    explanation:
      'Container first (Eventhouse + KQL DB), then schema and the ingest-time transform (raw + curated + update policy), then the routing (Eventstream from Kafka into raw), then the operational surface (RT dashboard on curated), then the analytical surface (OneLake availability + Direct Lake semantic model). This sequence avoids dangling references and lets each step verify before the next.',
    source: SRC_RTI.routing,
    tags: ['rti-routing', 'eventstream', 'update-policy', 'ordering']
  }),

  // ── 020: ordering — investigate slow KQL DB query ──────────────
  order({
    id: 'eh-020', domain: 'prepare', subtopic: 'kql-management', difficulty: 4,
    prompt:
      'Order these steps to triage a slow recurring aggregation query on a KQL Database:',
    options: [
      'Confirm the time predicate references the partition column (Ts) directly so partition pruning is enabled',
      'Check the HOT CACHE policy — make sure the queried window fits inside the hot cache',
      'Replace ad-hoc heavy aggregations with a MATERIALIZED VIEW that maintains them incrementally',
      'Replace `join` with `lookup` against any small dimension to avoid innerunique dedup and broadcast the small side',
      'Verify with `.show queries` and the query plan that the new shape executes the way you expect'
    ],
    explanation:
      'Standard KQL DB perf triage: prune partitions (time predicate on partition col), keep the working set hot (cache window), pre-aggregate via materialized view, optimize joins (lookup for small dim), then verify with `.show queries`. Ordering matters — pruning and caching are pre-requisites; matview and lookup are structural; verification is last.',
    source: SRC_RTI.mgmt,
    tags: ['kql-management', 'performance', 'materialized-view', 'lookup', 'ordering']
  }),

  // ── 021: management commands — multi ───────────────────────────
  multi({
    id: 'eh-021', domain: 'prepare', subtopic: 'kql-management', difficulty: 4,
    prompt: 'Which KQL MANAGEMENT (control) commands are correctly described?',
    options: [
      '`.create table T (Col:type, ...)` — create a table with the given schema',
      '`.alter table T policy retention softdelete = 30d` — set the retention window for table T',
      '`.alter table T policy caching hot = 7d` — set the hot-cache window for table T',
      '`.show queries` — list recently-executed queries with statistics for diagnosis',
      '`.create-or-alter function F() { ... }` — create or replace a stored KQL function',
      '`.select * from T` — the canonical KQL data-read syntax'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'KQL management commands begin with `.` and configure the database. Read queries do NOT use `.select * from T`; reads are written as `T | where ... | project ...` (KQL pipeline syntax). The `.select` form is the SQL distractor.',
    whyWrong: {
      5: 'KQL reads use the pipeline syntax (`T | ...`), not `.select * from T` — that is a SQL/T-SQL pattern, not KQL.'
    },
    source: SRC_RTI.mgmt,
    tags: ['kql-management', 'commands', 'syntax']
  }),

  // ── 022: Eventhouse vs KQL DB — multi ──────────────────────────
  multi({
    id: 'eh-022', domain: 'prepare', subtopic: 'eventhouse', difficulty: 4,
    prompt: 'Which statements about Eventhouse vs KQL Database are TRUE?',
    options: [
      'An Eventhouse is a Fabric workspace ITEM that contains one or more KQL Databases',
      'Each KQL Database within an Eventhouse has its OWN tables, policies, and principals',
      'Compute resources (caching, ingestion, query) are scoped at the EVENTHOUSE level and shared across its KQL DBs',
      'A single KQL Database can simultaneously belong to multiple Eventhouses for failover',
      'Deleting an Eventhouse deletes all KQL Databases inside it'
    ],
    correct: [0, 1, 2, 4],
    explanation:
      'Eventhouse is the workspace container; each KQL DB is independent in schema/policies/principals; compute is shared at the Eventhouse boundary (which is why splitting workloads across Eventhouses is a tuning lever). KQL DBs do NOT belong to multiple Eventhouses — each lives in exactly one. Deleting the Eventhouse cascades.',
    whyWrong: {
      3: 'A KQL DB lives in exactly one Eventhouse — there is no multi-Eventhouse membership for failover.'
    },
    source: SRC_RTI.eventhouse,
    tags: ['eventhouse', 'kql-db', 'compute', 'lifecycle']
  }),

  // ── 023: Eventstream transformations — multi ───────────────────
  multi({
    id: 'eh-023', domain: 'prepare', subtopic: 'eventstream', difficulty: 4,
    prompt: 'Which event-processing TRANSFORMATIONS can be configured INSIDE an Eventstream (no-code) before events reach a destination?',
    options: [
      'Filter events by predicate (drop rows that do not match)',
      'Manage fields — add, remove, rename, or change the type of fields',
      'Aggregate over a tumbling/hopping window (e.g., 1-minute counts)',
      'Group-by and summarize streaming events',
      'Union events from multiple input streams',
      'Run an arbitrary Python script against each event in the stream'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'Eventstream offers no-code operators for filter, manage fields, aggregate (windowed), group-by, and union. Arbitrary Python is NOT an Eventstream operator — for Python you process the stream downstream (e.g., a Spark notebook reading from a Lakehouse destination, or a custom consumer on a Custom Endpoint).',
    whyWrong: {
      5: 'Eventstream does not run arbitrary Python on each event; it offers a fixed set of declarative operators.'
    },
    source: SRC_RTI.eventstream,
    tags: ['eventstream', 'transformations', 'no-code', 'windowing']
  }),

  // ── 024: code reading — materialized view query patterns ───────
  single({
    id: 'eh-024', domain: 'prepare', subtopic: 'kql-materialized-views', difficulty: 5,
    prompt:
      'Given:\n```kql\n.create materialized-view LatestStatus on table DeviceEvents\n{\n    DeviceEvents\n    | summarize arg_max(Ts, *) by DeviceId\n}\n```\nA query reads `materialized_view("LatestStatus") | count`. Compared to running the same `arg_max` over the raw DeviceEvents table on every query, this is faster because:',
    options: [
      'The view is incrementally maintained — each ingestion updates the per-DeviceId latest row, so the read only scans one row per device instead of re-aggregating the entire history',
      'The view materializes the FULL history of DeviceEvents into a second table, doubling storage but allowing parallel scans',
      'The view bypasses the hot/cold cache split entirely',
      'arg_max is faster than other aggregates because it is implemented as a SQL window function'
    ],
    correct: 0,
    explanation:
      'A materialized view with `arg_max(Ts, *) by DeviceId` keeps a precomputed "latest row per device" set, maintained incrementally on ingest. Queries read O(devices) rows, not O(events). The view stores aggregates, not the full history; cache behaviour is unchanged; arg_max is a KQL aggregate, not a SQL window.',
    whyWrong: {
      1: 'Materialized views store AGGREGATED data, not a full second copy of history.',
      2: 'Cache split still applies; the view simply stores less data to scan.',
      3: 'arg_max is a KQL aggregate function; it is not a SQL window function and the speedup comes from precomputation.'
    },
    source: SRC_RTI.matView,
    tags: ['kql-materialized-views', 'arg-max', 'incremental', 'code-reading']
  }),

  // ── 025: end-to-end design choice — single ─────────────────────
  single({
    id: 'eh-025', domain: 'prepare', subtopic: 'rti-routing', difficulty: 5,
    prompt:
      'A factory ingests 100K events/sec from Kafka. Requirements: (a) raw events retained 7 years for compliance; (b) curated rows queryable with sub-second latency for a control-room dashboard; (c) automatic page when temperature > threshold; (d) monthly executive Power BI report off the same data with measures and RLS. Which design BEST satisfies all four?',
    options: [
      'Eventstream(Kafka) -> KQL DB raw table (with update policy -> curated table) AND -> Lakehouse for 7-yr retention AND -> Reflex for the temperature trigger; Real-Time dashboard on curated for control-room; Direct Lake semantic model + Power BI report on the curated table (OneLake availability ON) for the executive report',
      'KQL DB only — store raw forever, dashboard via Power BI Import refreshed every minute, alert via custom KQL function calling Logic Apps',
      'Lakehouse only — write Kafka into Delta, dashboard via Power BI DirectQuery, alert via Spark structured streaming job',
      'Eventstream -> Reflex only; Reflex stores history, drives dashboard, and triggers alerts'
    ],
    correct: 0,
    explanation:
      'Each requirement is satisfied by the right destination: KQL DB (low-latency curated) + Lakehouse (cheap long-term Delta) + Reflex (alerting) = three Eventstream destinations. RT dashboard on curated covers the control room; Direct Lake semantic model on the OneLake-available curated table covers the executive report with full DAX/RLS. This is the canonical RTI fan-out at scale.',
    whyWrong: {
      1: 'KQL DB-only does not give you cheap 7-yr retention; Power BI Import every minute will not hold up at 100K eps; hand-rolled Logic-Apps alerting reinvents Reflex.',
      2: 'Lakehouse-only cannot match KQL DB query latency for the control-room dashboard at this throughput; DirectQuery over Spark is too slow.',
      3: 'Reflex is for triggers/actions, not durable storage or visualization — it is one piece of the puzzle, not the whole solution.'
    },
    source: SRC_RTI.routing,
    tags: ['rti-routing', 'eventhouse', 'lakehouse', 'reflex', 'end-to-end']
  })
];
