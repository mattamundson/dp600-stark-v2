// 30 advanced Direct Lake questions — mastery-track companion to q-direct-lake.ts.
// All ids dlm-001..dlm-030. Subtopics are direct-lake-* family slugs so they
// can be filtered with `subtopic.startsWith('direct-lake')`.

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const directLakeMastery: Question[] = [
  /* ─── Import vs DirectQuery vs Direct Lake comparison (3-4) ──────── */
  single({
    id: 'dlm-001', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'Compared with Import mode, what is the principal trade-off Direct Lake makes?',
    options: [
      'Direct Lake gives up freshness in exchange for faster query latency',
      'Direct Lake gives up the deterministic in-memory data set for on-demand column paging from OneLake',
      'Direct Lake removes support for relationships in exchange for higher cardinality',
      'Direct Lake stores the model file outside OneLake to reduce capacity usage'
    ],
    correct: 1,
    explanation: 'Import keeps the entire model resident in VertiPaq after refresh; Direct Lake keeps only what queries need, paged in on first reference from OneLake Delta files. The cost is occasional cold-paging latency; the benefit is no scheduled refresh and zero-copy storage.',
    whyWrong: {
      0: 'Direct Lake actually improves freshness over Import; Import is the slower, refresh-bound mode.',
      2: 'Relationships are fully supported in Direct Lake — that is not the trade.',
      3: 'Direct Lake reads from OneLake; the model itself is still managed by Fabric, not relocated.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'import', 'comparison']
  }),
  single({
    id: 'dlm-002', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'A team chose DirectQuery for a 6 TB model so they could query "live" data. Which Direct Lake property would most likely make Direct Lake a strictly better choice?',
    options: [
      'Direct Lake eliminates the per-query round trip to the source SQL engine while still serving near-real-time data from Delta commits',
      'Direct Lake supports a larger maximum row count than DirectQuery',
      'Direct Lake automatically rewrites DAX into T-SQL for source-side execution',
      'Direct Lake disables relationships for performance'
    ],
    correct: 0,
    explanation: 'The DirectQuery pain point is per-query SQL round-trip cost. Direct Lake answers DAX in VertiPaq using paged Delta columns, so latency is closer to Import while freshness stays close to DirectQuery.',
    whyWrong: {
      1: 'Both modes scale into very large datasets; row-count is not the differentiator that wins this decision.',
      2: 'Direct Lake does not rewrite DAX into T-SQL; it executes DAX in VertiPaq.',
      3: 'Direct Lake supports relationships normally; disabling them is not how it wins.'
    },
    source: SRC.storageModes,
    tags: ['direct-lake', 'directquery', 'comparison']
  }),
  multi({
    id: 'dlm-003', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Pick the statements that distinguish Direct Lake from Import AND from DirectQuery. Select all that apply.',
    options: [
      'No scheduled data refresh is needed; the model frames against the latest Delta version',
      'Queries execute in VertiPaq, not in the source SQL engine',
      'There is no copy of the data sitting in the model file',
      'It supports calculated columns identically to Import',
      'Each query incurs a network round-trip to the source SQL endpoint'
    ],
    correct: [0, 1, 2],
    explanation: 'Direct Lake combines the best traits of both: VertiPaq execution like Import (option B), no scheduled refresh and no data copy because OneLake is the source (options A and C). Calculated columns and per-query SQL round-trips are NOT how Direct Lake works.',
    whyWrong: {
      3: 'Calculated columns disable Direct Lake on the affected table — that is the opposite of "identical to Import".',
      4: 'Direct Lake answers in VertiPaq using paged columns; per-query SQL round-trips are DirectQuery behavior.'
    },
    source: SRC.storageModes,
    tags: ['direct-lake', 'comparison', 'multi']
  }),
  single({
    id: 'dlm-004', domain: 'semantic', subtopic: 'direct-lake', difficulty: 2,
    prompt: 'Which mode physically stores the data inside the model file rather than reading from OneLake at query time?',
    options: ['Direct Lake', 'Import', 'DirectQuery', 'DirectLakeOnly'],
    correct: 1,
    explanation: 'Import is the only mode that materializes the data into the model. Direct Lake reads from OneLake; DirectQuery sends the query to the source.',
    whyWrong: {
      0: 'Direct Lake does not store data in the model file — it pages from OneLake.',
      2: 'DirectQuery stores no data; it queries the source per request.',
      3: 'DirectLakeOnly is a fallback policy on Direct Lake, not a separate storage layout.'
    },
    source: SRC.storageModes,
    tags: ['direct-lake', 'import', 'storage']
  }),

  /* ─── Delta tables in OneLake + V-Order (3-4) ────────────────────── */
  single({
    id: 'dlm-005', domain: 'semantic', subtopic: 'direct-lake-onelake', difficulty: 3,
    prompt: 'What does V-Order do to a Parquet file written into OneLake?',
    options: [
      'It encrypts the file using a Fabric-managed key',
      'It applies a sort + dictionary encoding pass that aligns Parquet row groups with VertiPaq segment layout',
      'It splits the file into smaller shards for parallel SQL endpoint reads',
      'It rewrites the file into the Iceberg table format'
    ],
    correct: 1,
    explanation: 'V-Order is a write-time optimization: Parquet row groups are sorted and dictionary-encoded to match how VertiPaq stores column segments. That alignment is what lets Direct Lake transcode columns into memory without a costly re-encoding step.',
    whyWrong: {
      0: 'V-Order is not encryption; encryption is handled separately by OneLake / capacity settings.',
      2: 'V-Order does not shard files for parallel SQL reads.',
      3: 'OneLake uses Delta on Parquet; V-Order does not switch table formats.'
    },
    source: SRC.directLake,
    tags: ['v-order', 'parquet', 'onelake']
  }),
  single({
    id: 'dlm-006', domain: 'semantic', subtopic: 'direct-lake-onelake', difficulty: 4,
    prompt: 'A pyspark notebook writes a Delta table into a Lakehouse with `spark.conf.set("spark.sql.parquet.vorder.default", "false")`. A Direct Lake model points at this table. What is the likely outcome on the next query?',
    options: [
      'The query succeeds at full Direct Lake speed because V-Order is optional',
      'The query silently falls back to DirectQuery against the SQL endpoint',
      'The model rejects the table at framing time with an error',
      'V-Order is automatically applied retroactively before the query runs'
    ],
    correct: 1,
    explanation: 'Without V-Order, Direct Lake cannot efficiently transcode column segments into VertiPaq, so for affected queries it silently falls back to DirectQuery against the SQL endpoint. Performance degrades, but the query still returns.',
    whyWrong: {
      0: 'Full Direct Lake speed REQUIRES V-Order on the underlying Parquet.',
      2: 'Framing does not reject non-V-Ordered tables — fallback is the contract instead.',
      3: 'V-Order is a write-time pass; the engine does not retroactively reorder existing files.'
    },
    source: SRC.directLakeFallback,
    tags: ['v-order', 'direct-lake', 'fallback']
  }),
  multi({
    id: 'dlm-007', domain: 'semantic', subtopic: 'direct-lake-onelake', difficulty: 3,
    prompt: 'Which Fabric items write V-Ordered Delta-Parquet to OneLake by default? Select all that apply.',
    options: [
      'Lakehouse table loads via Dataflow Gen2',
      'Fabric Warehouse INSERT / CTAS',
      'Mirrored Database replication into OneLake',
      'KQL Database in an Eventhouse',
      'Azure SQL Database (un-mirrored) external table'
    ],
    correct: [0, 1, 2],
    explanation: 'Dataflow Gen2 → Lakehouse, Warehouse INSERT/CTAS, and Mirrored Databases all land Delta with V-Order in OneLake by default. KQL stores in the Kusto engine (not Delta-Parquet); a non-mirrored Azure SQL DB lives outside OneLake entirely.',
    whyWrong: {
      3: 'KQL Databases use the Kusto engine — not Delta-Parquet — so they cannot serve Direct Lake.',
      4: 'A non-mirrored Azure SQL DB is external to OneLake; nothing is written there.'
    },
    source: SRC.directLake,
    tags: ['v-order', 'onelake', 'fabric-architecture']
  }),
  single({
    id: 'dlm-008', domain: 'semantic', subtopic: 'direct-lake-onelake', difficulty: 4,
    prompt: 'You inherit a Lakehouse table written by a third-party tool that does NOT support V-Order. The table cannot be re-written. What is the most appropriate remediation for a Direct Lake model on this table?',
    options: [
      'Run OPTIMIZE with VORDER=true on the table from a Fabric notebook to apply V-Order to the existing files',
      'Set the model to DirectLakeOnly so V-Order is no longer required',
      'Switch the table to Iceberg format inside OneLake',
      'Delete the SQL endpoint statistics so framing skips V-Order'
    ],
    correct: 0,
    explanation: 'OPTIMIZE with V-Order rewrites the underlying Parquet files in-place with the Direct-Lake-friendly layout. This is the canonical remediation when an upstream writer cannot be changed.',
    whyWrong: {
      1: 'DirectLakeOnly does NOT remove the V-Order requirement — it makes failures harder, not easier.',
      2: 'OneLake uses Delta, not Iceberg; switching format is not the answer.',
      3: 'SQL endpoint statistics are unrelated to V-Order — there is no skip-via-stats path.'
    },
    source: SRC.directLake,
    tags: ['v-order', 'optimize', 'remediation']
  }),

  /* ─── Framing — automatic, manual, scheduled, programmatic (5-6) ── */
  single({
    id: 'dlm-009', domain: 'semantic', subtopic: 'direct-lake-framing', difficulty: 3,
    prompt: 'What does framing actually bind?',
    options: [
      'The current Delta version of each table to the semantic-model column metadata',
      'The active VertiPaq cache to the report visual cache',
      'The user identity to the row-level security filter',
      'The capacity SKU to the workspace'
    ],
    correct: 0,
    explanation: 'Framing snapshots the latest committed Delta version per table and binds that version into the model metadata, so subsequent queries see a consistent, atomic view of the data until the next reframe.',
    whyWrong: {
      1: 'Visual cache is unrelated to framing.',
      2: 'RLS is identity-driven and orthogonal to framing.',
      3: 'Capacity-to-workspace binding is administrative, not a framing concept.'
    },
    source: SRC.directLake,
    tags: ['framing', 'direct-lake']
  }),
  single({
    id: 'dlm-010', domain: 'semantic', subtopic: 'direct-lake-framing', difficulty: 3,
    prompt: 'A Lakehouse SQL endpoint auto-syncs after a Delta write. When does the Direct Lake model see the new data?',
    options: [
      'Immediately on write, even before the SQL endpoint sync completes',
      'After the SQL endpoint sync completes AND a reframe occurs (manual, automatic, or query-triggered)',
      'Only after a manual REST API refresh call',
      'Only after the next scheduled refresh window'
    ],
    correct: 1,
    explanation: 'New data is visible to Direct Lake once two things have happened: the SQL endpoint metadata sync exposes the schema/version, and the model has been reframed to that version. The reframe can be automatic, manual, or driven by the next query event.',
    whyWrong: {
      0: 'Direct Lake does not see writes prior to SQL endpoint sync — framing depends on endpoint metadata.',
      2: 'Manual REST API is one option, not the only one — automatic and query-triggered reframes also exist.',
      3: 'There is no scheduled-refresh requirement for Direct Lake; that is an Import concept.'
    },
    source: SRC.directLake,
    tags: ['framing', 'sql-endpoint']
  }),
  multi({
    id: 'dlm-011', domain: 'semantic', subtopic: 'direct-lake-framing', difficulty: 4,
    prompt: 'Which mechanisms can trigger a reframe of a Direct Lake model? Select all that apply.',
    options: [
      'Clicking "Refresh now" in the Fabric portal',
      'A POST to the dataset Refresh REST API',
      'A scheduled refresh configured in the dataset settings',
      'An XMLA `Refresh` command targeting the model',
      'Restarting the report viewer session in the browser'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Any operation that issues a Refresh against the model — UI, REST API, scheduled refresh, or XMLA — reframes Direct Lake. Restarting the browser only resets the client; the server-side framed state is unchanged.',
    whyWrong: {
      4: 'Browser restart only resets the client; it cannot reach the model framing state.'
    },
    source: SRC.directLake,
    tags: ['framing', 'refresh', 'xmla']
  }),
  single({
    id: 'dlm-012', domain: 'semantic', subtopic: 'direct-lake-framing', difficulty: 4,
    prompt: 'You add a column to the underlying Lakehouse table via a Spark notebook. Reports built on the Direct Lake model do not see the new column. What is the most likely fix?',
    options: [
      'Wait — the model reframes on every query and the column will appear in seconds',
      'Trigger a model Refresh after the SQL endpoint metadata sync, so the model picks up the new schema',
      'Re-publish the report from Power BI Desktop',
      'Disable V-Order so the schema is re-read'
    ],
    correct: 1,
    explanation: 'Schema-changing writes require both an SQL-endpoint metadata sync AND an explicit reframe of the model — only then will the new column appear in the table\'s columns. Data-only changes do NOT need this; schema changes do.',
    whyWrong: {
      0: 'Reframing is not automatic on every query; schema changes specifically need the model refresh.',
      2: 'Re-publishing the report does not reframe the underlying semantic model.',
      3: 'Disabling V-Order would degrade performance and would not expose the new column.'
    },
    source: SRC.directLake,
    tags: ['framing', 'schema-change']
  }),
  single({
    id: 'dlm-013', domain: 'semantic', subtopic: 'direct-lake-framing', difficulty: 5,
    prompt: 'A regulated environment requires that every framing event is auditable and triggered by a known principal. Which approach BEST satisfies that requirement?',
    options: [
      'Allow the automatic-on-query reframe and rely on query telemetry',
      'Disable automatic reframing on the model and drive every reframe via a scheduled REST API call from a service principal that is logged in audit',
      'Set the model to DirectLakeOnly so it never reframes',
      'Convert the model to Import and rely on scheduled refresh history'
    ],
    correct: 1,
    explanation: 'For audited, principal-attributed reframes, disable auto-reframe and orchestrate all reframes via the dataset Refresh REST API using a service principal — those calls land in audit logs with the principal id. DirectLakeOnly is about fallback, not framing.',
    whyWrong: {
      0: 'Query telemetry is too coarse to attribute every reframe to a known principal.',
      2: 'DirectLakeOnly does not control framing — it controls fallback to DirectQuery.',
      3: 'Switching to Import abandons Direct Lake entirely; that is the wrong scope of fix.'
    },
    source: SRC.directLake,
    tags: ['framing', 'governance', 'rest-api']
  }),
  order({
    id: 'dlm-014', domain: 'semantic', subtopic: 'direct-lake-framing', difficulty: 4,
    prompt: 'Place the events in the order they occur after a new batch lands in a Lakehouse table.',
    options: [
      'Spark/Pipeline writes a new Delta version to OneLake',
      'Lakehouse SQL endpoint metadata sync exposes the new version',
      'Direct Lake model reframes against the latest Delta version',
      'A user query reads the new data through VertiPaq column paging'
    ],
    explanation: 'Write → SQL endpoint sync → reframe → query. Skipping any step means the user query reads stale data.',
    source: SRC.directLake,
    tags: ['framing', 'order', 'pipeline']
  }),

  /* ─── DirectQuery fallback triggers (4-5) ────────────────────────── */
  multi({
    id: 'dlm-015', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 4,
    prompt: 'Which conditions can trigger silent DirectQuery fallback in a Direct Lake model? Select all that apply.',
    options: [
      'A calculated column is added to a Direct Lake table',
      'The underlying Parquet files were written without V-Order',
      'A query exceeds the per-SKU Direct Lake guardrails (e.g., max rows scanned)',
      'A relationship is built between two Direct Lake tables',
      'The Delta table uses a feature Direct Lake does not yet support (e.g., deletion vectors in some capacity tiers)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Fallback fires on calculated columns, missing V-Order, SKU guardrail violations, and unsupported Delta features. Plain relationships between Direct Lake tables are fully supported and do not trigger fallback.',
    whyWrong: {
      3: 'Building a relationship between two Direct Lake tables is normal modeling; it does NOT cause fallback.'
    },
    source: SRC.directLakeFallback,
    tags: ['fallback', 'multi', 'guardrails']
  }),
  single({
    id: 'dlm-016', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 4,
    prompt: 'A query against a Direct Lake model produces correct results but is unexpectedly slow. The trace shows DirectQuery to the SQL endpoint. Which tool gives the FASTEST signal of which table caused the fallback?',
    options: [
      'Capacity Metrics App on the workspace capacity',
      'Performance Analyzer in Power BI Desktop, plus the "DAX Studio" Server Timings trace identifying the storage engine path per table',
      'OneLake file explorer to inspect Parquet files',
      'XMLA endpoint with a Tabular Object Model dump'
    ],
    correct: 1,
    explanation: 'Performance Analyzer shows visual timings; DAX Studio Server Timings then breaks the storage-engine work down per table and reveals which table fell back. That combo localizes the fallback table fastest.',
    whyWrong: {
      0: 'Capacity Metrics shows aggregate capacity health, not the table that fell back on a query.',
      2: 'Inspecting Parquet by hand cannot tell you which query path executed.',
      3: 'A TOM dump describes the model, not the runtime fallback decision for a specific query.'
    },
    source: SRC.directLakeFallback,
    tags: ['fallback', 'troubleshooting', 'dax-studio']
  }),
  single({
    id: 'dlm-017', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 3,
    prompt: 'Direct Lake fallback to DirectQuery is conceptually a graceful-degradation feature. What is the user-visible cost of fallback?',
    options: [
      'The query fails',
      'The query becomes slower (per-query SQL round-trip cost) but still returns the correct result',
      'The data shown is stale by one day',
      'RLS is bypassed on the fallback path'
    ],
    correct: 1,
    explanation: 'Fallback preserves correctness but pays the DirectQuery latency cost: a SQL round-trip plus translation overhead. RLS is enforced identically on either path; data freshness is unchanged.',
    whyWrong: {
      0: 'Failure is the DirectLakeOnly behavior, not default fallback.',
      2: 'Fallback does not introduce a one-day staleness; freshness is governed by framing, which still applies.',
      3: 'RLS is enforced on the SQL endpoint side as well; fallback does not bypass it.'
    },
    source: SRC.directLakeFallback,
    tags: ['fallback', 'directquery']
  }),
  single({
    id: 'dlm-018', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 4,
    prompt: 'Which DAX-side pattern is most likely to trigger fallback on a Direct Lake model?',
    options: [
      'A SUMX over a fact table grouped by a dim attribute',
      'A measure that uses CALCULATETABLE with USERELATIONSHIP across many Direct Lake tables in ways the storage engine cannot translate to a Delta scan',
      'A simple SUM of a numeric column',
      'A DISTINCTCOUNT over a low-cardinality column'
    ],
    correct: 1,
    explanation: 'Complex CALCULATETABLE + USERELATIONSHIP combinations may exceed what the Direct Lake storage engine can translate to a Delta-scan plan, so it falls back. Simple aggregations stay on the Direct Lake path.',
    whyWrong: {
      0: 'SUMX over a fact grouped by a dim is a normal star-schema query pattern; it stays on Direct Lake.',
      2: 'A simple SUM is the canonical Direct-Lake-friendly query.',
      3: 'DISTINCTCOUNT over a low-cardinality column is well-supported; nothing about it forces fallback.'
    },
    source: SRC.directLakeFallback,
    tags: ['fallback', 'dax']
  }),
  single({
    id: 'dlm-019', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 5,
    prompt: 'A Direct Lake model on an F2 capacity reports frequent fallback for the largest fact table. Capacity utilization is low. What is the likely root cause and fix?',
    options: [
      'Capacity is the bottleneck; raise to F4',
      'Per-SKU Direct Lake guardrails (max rows per table) are tighter on F2 than the fact requires; raise the SKU to one whose guardrails accommodate the table size',
      'V-Order is incompatible with F2; remove V-Order',
      'The model is using DirectLakeOnly mode; switch to default'
    ],
    correct: 1,
    explanation: 'Direct Lake guardrails (max rows scanned, max columns paged, max model memory) scale with SKU. F2 has the tightest guardrails; a fact that exceeds them triggers fallback even when capacity utilization looks low. Raising the SKU lifts the guardrails.',
    whyWrong: {
      0: 'Capacity utilization being low is the clue — it is the per-SKU guardrails, not utilization, doing the gating.',
      2: 'V-Order is required, not incompatible.',
      3: 'DirectLakeOnly would make queries fail, not fall back; that is not what was described.'
    },
    source: SRC.directLakeFallback,
    tags: ['fallback', 'sku', 'guardrails']
  }),

  /* ─── DirectLakeOnly mode (2-3) ──────────────────────────────────── */
  single({
    id: 'dlm-020', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 3,
    prompt: 'What does DirectLakeOnly mode (a.k.a. NeverFallback) do?',
    options: [
      'It forces all queries through the SQL endpoint',
      'It causes queries that cannot be served by Direct Lake to FAIL instead of falling back to DirectQuery',
      'It disables column eviction so all columns stay resident',
      'It pins the model to a single capacity SKU'
    ],
    correct: 1,
    explanation: 'DirectLakeOnly turns silent fallback off — any query that exceeds Direct Lake capability fails outright. This makes performance regressions visible instead of silent, which is essential for SLA-sensitive workloads.',
    whyWrong: {
      0: 'It does the opposite — it refuses to use the SQL endpoint via fallback.',
      2: 'Column eviction is governed by memory pressure / LRU, not by this setting.',
      3: 'SKU pinning is not what this setting controls.'
    },
    source: SRC.directLakeFallback,
    tags: ['directlakeonly', 'fallback']
  }),
  single({
    id: 'dlm-021', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 4,
    prompt: 'You enable DirectLakeOnly on a production model. The next morning users report that some reports throw "DirectLakeOnly mode prohibits DirectQuery" errors. What is the appropriate response?',
    options: [
      'Disable DirectLakeOnly to silence the errors',
      'Investigate and remove the trigger (e.g., calculated column, missing V-Order, exceeded guardrails) on the affected table; DirectLakeOnly is correctly surfacing a real issue',
      'Raise the SKU so guardrails are higher, then ignore the errors',
      'Switch the affected report visuals to a different model'
    ],
    correct: 1,
    explanation: 'DirectLakeOnly is doing exactly its job — surfacing latent fallback triggers as visible failures. Fix the underlying cause (calc column, V-Order, guardrails) instead of suppressing the signal.',
    whyWrong: {
      0: 'Disabling reverts to silent slowdowns — the original problem returns invisible.',
      2: 'Raising the SKU may fix a guardrail issue, but ignoring errors is the wrong posture.',
      3: 'Moving visuals to another model masks the design defect rather than fixing it.'
    },
    source: SRC.directLakeFallback,
    tags: ['directlakeonly', 'incident-response']
  }),
  single({
    id: 'dlm-022', domain: 'semantic', subtopic: 'direct-lake-fallback', difficulty: 3,
    prompt: 'Which scenario is the BEST justification for using DirectLakeOnly?',
    options: [
      'A scratch model used for ad-hoc data exploration by analysts',
      'A regulated, customer-facing report whose SLA depends on Direct Lake-class latency',
      'A small dimension table that rarely changes',
      'A development workspace where developers expect to iterate quickly'
    ],
    correct: 1,
    explanation: 'DirectLakeOnly turns silent DirectQuery slowdowns into visible failures — exactly what an SLA-bound, regulated workload needs. Other scenarios are tolerant of the silent fallback.',
    whyWrong: {
      0: 'Scratch exploration prefers graceful degradation; DirectLakeOnly would block analysts.',
      2: 'A small dim is unlikely to trigger fallback at all; the protection is unnecessary.',
      3: 'Dev iteration benefits from the model continuing to work; failures interrupt iteration.'
    },
    source: SRC.directLakeFallback,
    tags: ['directlakeonly', 'when-to-use']
  }),

  /* ─── Transcoding cache + column paging (3-4) ────────────────────── */
  single({
    id: 'dlm-023', domain: 'semantic', subtopic: 'direct-lake-cache', difficulty: 4,
    prompt: 'In Direct Lake, "transcoding" refers to which step?',
    options: [
      'Translating DAX into T-SQL for the SQL endpoint',
      'Decoding V-Ordered Parquet column segments into the in-memory VertiPaq dictionary + column store representation',
      'Re-encrypting Parquet files when written to OneLake',
      'Converting M scripts into Spark SQL'
    ],
    correct: 1,
    explanation: 'Transcoding is the on-demand conversion of V-Ordered Parquet column segments into the VertiPaq in-memory format. V-Order is what makes this transcoding cheap enough to do at query time.',
    whyWrong: {
      0: 'DAX-to-T-SQL is DirectQuery / fallback territory, not Direct Lake transcoding.',
      2: 'Encryption is unrelated to transcoding.',
      3: 'M-to-Spark conversion is a Dataflow Gen2 / pipeline concept, not Direct Lake.'
    },
    source: SRC.directLake,
    tags: ['transcoding', 'paging', 'vertipaq']
  }),
  multi({
    id: 'dlm-024', domain: 'semantic', subtopic: 'direct-lake-cache', difficulty: 4,
    prompt: 'Which statements about Direct Lake column paging and the transcoding cache are TRUE? Select all that apply.',
    options: [
      'Only columns referenced by queries are paged in — the model does NOT load every column on framing',
      'Hot columns stay resident in VertiPaq and serve subsequent queries from RAM',
      'Cold columns are evicted in LRU order under capacity memory pressure',
      'Column eviction deletes the underlying Parquet from OneLake to reclaim disk',
      'After eviction, the next query that references the column re-pages it from OneLake'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Paging is lazy; hot stays resident; cold evicts under pressure in LRU; re-pages from OneLake on next reference. Eviction NEVER touches OneLake — OneLake is the source of truth.',
    whyWrong: {
      3: 'OneLake is never modified by eviction. Eviction only reclaims VertiPaq RAM; the Parquet stays.'
    },
    source: SRC.directLake,
    tags: ['paging', 'eviction', 'cache']
  }),
  order({
    id: 'dlm-025', domain: 'semantic', subtopic: 'direct-lake-cache', difficulty: 4,
    prompt: 'A measure touches a previously cold column. Place the engine steps in execution order, from query arrival to result.',
    options: [
      'Engine receives the DAX query and identifies referenced columns',
      'Engine checks the VertiPaq column store for residency and finds the column missing',
      'Engine reads the V-Ordered Parquet column segments from OneLake',
      'Segments are transcoded into the in-memory VertiPaq dictionary + column store',
      'VertiPaq executes the query against the now-resident column and returns the result'
    ],
    explanation: 'Cold-paging path: parse → residency check → read from OneLake → transcode → execute. The first-touch cost is the read+transcode pair; subsequent queries skip both because the column stays resident under LRU.',
    source: SRC.directLake,
    tags: ['paging', 'first-touch', 'order', 'transcoding']
  }),

  /* ─── Fabric SKU and capacity implications (2-3) ─────────────────── */
  single({
    id: 'dlm-026', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'Direct Lake is supported on which capacity types?',
    options: [
      'Any capacity, including Premium Per User (PPU) and Power BI Pro',
      'Fabric capacity (F SKU) and Power BI Premium Per User (PPU); NOT Power BI Pro',
      'Only Fabric F64 and above',
      'Only Power BI Pro workspaces in My Workspace'
    ],
    correct: 1,
    explanation: 'Direct Lake requires Fabric capacity (F SKU) or Premium Per User (PPU). Power BI Pro workspaces cannot host Direct Lake models — they have no OneLake-backed capacity to source from.',
    whyWrong: {
      0: 'Pro is excluded; not "any capacity".',
      2: 'F2/F4 also support Direct Lake; the F64+ floor is wrong.',
      3: 'Pro / My Workspace cannot host Direct Lake.'
    },
    source: SRC.directLake,
    tags: ['sku', 'ppu', 'capacity']
  }),
  single({
    id: 'dlm-027', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Direct Lake guardrails (max rows per table, max model memory) scale with the F SKU. What is the implication for a 5-billion-row fact table?',
    options: [
      'It will work identically on F2 and F64',
      'It is likely to exceed F2 guardrails and trigger fallback; a higher SKU may be required to keep it on the Direct Lake path',
      'It cannot be served by any F SKU and must be Import-mode',
      'It must be split into 100 tables to fit any guardrail'
    ],
    correct: 1,
    explanation: 'F2 has the tightest guardrails; large facts often exceed them and silently fall back. Raising the SKU lifts the per-table row scan / model memory limits and keeps the table on Direct Lake.',
    whyWrong: {
      0: 'Guardrails differ by SKU, so behavior is not identical.',
      2: 'Higher F SKUs accommodate billions of rows.',
      3: 'Splitting tables is rarely necessary; the SKU lift is the standard answer.'
    },
    source: SRC.directLake,
    tags: ['sku', 'guardrails', 'capacity']
  }),
  multi({
    id: 'dlm-028', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Which of these are direct consequences of running a Direct Lake model on an under-sized capacity? Select all that apply.',
    options: [
      'Increased frequency of DirectQuery fallback',
      'More aggressive column eviction under memory pressure → more cold-page latency',
      'Refresh windows that grow longer over time',
      'Loss of access to OneLake for the underlying tables'
    ],
    correct: [0, 1],
    explanation: 'Under-sized capacity tightens guardrails (more fallback) and reduces resident memory headroom (more eviction → more cold-page costs). It does not introduce refresh windows (Direct Lake does not import) and never disables OneLake access.',
    whyWrong: {
      2: 'Direct Lake does not have refresh windows the way Import does — there is no scheduled refresh to grow.',
      3: 'OneLake remains accessible regardless of capacity sizing; only model behavior changes.'
    },
    source: SRC.directLake,
    tags: ['sku', 'capacity', 'multi']
  }),

  /* ─── Composite Direct Lake + Import (2-3) ───────────────────────── */
  single({
    id: 'dlm-029', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'You need a tiny, slowly-changing reference dim sourced from a remote SQL DB joined into a Direct Lake fact. Which composite design is typically the simplest?',
    options: [
      'Direct Lake the fact, Import the dim (composite Direct Lake + Import)',
      'DirectQuery for both fact and dim',
      'Import the fact, Direct Lake the dim',
      'Live connection to a remote AS model for the dim'
    ],
    correct: 0,
    explanation: 'A composite of Direct Lake (fact) + Import (small, slowly-changing dim) is the most common pattern: the fact stays fast and fresh; the small dim is trivially refreshed and joined as a limited relationship.',
    whyWrong: {
      1: 'DirectQuery for the fact gives up the Direct Lake performance — the wrong direction.',
      2: 'Importing the fact is exactly what Direct Lake replaces; reversing the modes is the inverse of the pattern.',
      3: 'Live connection to a remote AS model is an entirely different architecture, not a composite.'
    },
    source: SRC.directLake,
    tags: ['composite', 'design']
  }),
  multi({
    id: 'dlm-030', domain: 'semantic', subtopic: 'direct-lake', difficulty: 5,
    prompt: 'Which constraints apply when mixing Direct Lake tables and Import tables in a single composite model? Select all that apply.',
    options: [
      'Cross-island relationships (Direct Lake table ↔ Import table) become "limited" relationships, with implications for filter propagation',
      'A query that crosses islands may execute on a slower path than a within-island query',
      'Calculated columns on the Import island do not affect Direct Lake on the other island',
      'You can safely place calculated columns on Direct Lake tables in composite mode',
      'RLS roles are impossible in composite Direct Lake + Import models'
    ],
    correct: [0, 1, 2],
    explanation: 'Cross-island relationships are limited and propagate filters less freely; cross-island queries pay extra cost; Import-side calc columns stay on the Import side. Calc columns on the Direct Lake side STILL break Direct Lake on that table even in composite mode. RLS works fine.',
    whyWrong: {
      3: 'Calculated columns on a Direct Lake table convert that table off Direct Lake — composite does not exempt this rule.',
      4: 'RLS is supported in composite models; this option is false.'
    },
    source: SRC.directLake,
    tags: ['composite', 'multi', 'limited-relationships']
  })
];
