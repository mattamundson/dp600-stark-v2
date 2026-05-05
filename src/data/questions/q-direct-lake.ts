import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const directLake: Question[] = [
  single({
    id: 'dl-001', domain: 'semantic', subtopic: 'direct-lake', difficulty: 2,
    prompt: 'Which storage modality reads Delta-Parquet files from OneLake on demand into VertiPaq without a scheduled refresh?',
    options: ['Import', 'DirectQuery', 'Direct Lake', 'Live connection to Analysis Services'],
    correct: 2,
    explanation: 'Direct Lake pages columns from OneLake Delta tables into the VertiPaq engine on demand. There is no refresh job to schedule — the model "frames" against the latest Delta version automatically.',
    whyWrong: {
      0: 'Import physically copies data into the model file and requires a scheduled refresh to update.',
      1: 'DirectQuery pushes every query down to the source SQL engine; nothing is stored in VertiPaq.',
      3: 'Live connection talks to a remote Analysis Services model; it has no local storage at all.'
    },
    source: SRC.directLake,
    tags: ['storage-modes', 'direct-lake', 'onelake']
  }),
  single({
    id: 'dl-002', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'A semantic model in Direct Lake mode is reading from a Lakehouse table that was just updated. The user runs a new query. What happens?',
    options: [
      'The query returns stale data until the next scheduled refresh runs.',
      'The model frames against the latest Delta version and returns fresh data immediately.',
      'The query fails until you manually run a Refresh on the model.',
      'The Lakehouse pushes a webhook to the model to invalidate cache.'
    ],
    correct: 1,
    explanation: 'Direct Lake automatically frames against the latest committed Delta version when new queries arrive. No manual refresh is needed for typical updates.',
    whyWrong: {
      0: 'There is no scheduled refresh in Direct Lake — that\'s an Import-mode concept.',
      2: 'A manual Refresh is only needed when you want to force a full reframe (e.g., after a schema change).',
      3: 'Lakehouse does not push webhooks to semantic models; the framing is pull-based on next query.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'framing']
  }),
  multi({
    id: 'dl-003', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Which conditions are REQUIRED for a table to be queryable via Direct Lake? Select all that apply.',
    options: [
      'The underlying data must be stored as Delta-Parquet in OneLake',
      'V-Order must be enabled on the Delta table',
      'The semantic model must be in the same workspace as the underlying Lakehouse / Warehouse',
      'The table must use IDENTITY columns for primary keys',
      'The workspace must be on a Fabric capacity (F SKU) or Power BI Premium Per User'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Direct Lake requires Delta-Parquet with V-Order, same-workspace placement, and Fabric/PPU capacity. IDENTITY columns are unrelated.',
    whyWrong: {
      3: 'IDENTITY columns are a T-SQL feature; they have no bearing on Direct Lake eligibility.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'requirements']
  }),
  single({
    id: 'dl-004', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'A Direct Lake model occasionally falls back to DirectQuery for a specific query. What is the most likely root cause?',
    options: [
      'The user opened the report from a Viewer role',
      'The query uses an unsupported feature (e.g., row-level filtering pattern Direct Lake cannot push down) or the table lost V-Order',
      'The capacity is paused',
      'The model file size exceeds 1 GB'
    ],
    correct: 1,
    explanation: 'Direct Lake silently falls back to DirectQuery when it encounters something it cannot serve — typically a missing V-Order, a Delta feature it does not yet support, or a query pattern outside its envelope.',
    whyWrong: {
      0: 'Viewer role affects authorization but does not change the storage path.',
      2: 'A paused capacity stops queries entirely — it does not produce a fallback to DirectQuery.',
      3: 'There is no 1 GB file-size threshold that triggers fallback — Direct Lake is column-paged from OneLake.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'fallback']
  }),
  single({
    id: 'dl-005', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'You need to GUARANTEE that a regulated workload only ever uses Direct Lake (never DirectQuery fallback) for SLA reasons. What setting do you configure?',
    options: [
      'Set the model to "Import + Direct Lake" composite mode',
      'Set the model to DirectLakeOnly mode (forbidding fallback)',
      'Disable V-Order on the source table',
      'Pin the dataset to a Premium capacity'
    ],
    correct: 1,
    explanation: 'DirectLakeOnly mode forbids fallback. Queries that cannot run in Direct Lake fail outright instead of degrading silently — which is exactly what you want when SLAs depend on Direct Lake performance.',
    whyWrong: {
      0: 'A composite mode allows additional storage modes — the opposite of what is required.',
      2: 'Disabling V-Order would force more fallback, not eliminate it.',
      3: 'Pinning to Premium does not change the fallback decision; that is a model-level setting.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'directlakeonly', 'fallback']
  }),
  single({
    id: 'dl-006', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'In Direct Lake, when does a column actually consume VertiPaq memory?',
    options: [
      'When the semantic model is opened in Power BI Desktop',
      'When the underlying Delta table is written to OneLake',
      'When a query references the column for the first time (it pages in on demand)',
      'When the workspace admin runs Process Full'
    ],
    correct: 2,
    explanation: 'Columns are paged into memory only when first referenced by a query. Cold columns sit in OneLake; hot columns stay resident; under memory pressure they are evicted in LRU order.',
    whyWrong: {
      0: 'Opening the model in Desktop is a metadata operation; it does not page columns.',
      1: 'A write to OneLake does not push anything into VertiPaq — Direct Lake is pull-based.',
      3: 'There is no Process Full operation in Direct Lake — that\'s a tabular import concept.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'paging', 'memory']
  }),
  single({
    id: 'dl-007', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'Which Microsoft Fabric backing store CANNOT serve a Direct Lake semantic model directly?',
    options: ['Lakehouse', 'Warehouse', 'KQL Database / Eventhouse', 'Mirrored Database'],
    correct: 2,
    explanation: 'Direct Lake reads Delta-Parquet from OneLake. Lakehouse and Warehouse expose Delta tables; Mirrored Databases write Delta into OneLake. KQL Databases use a different storage engine (Kusto), not Delta-Parquet, so they require DirectQuery rather than Direct Lake.',
    whyWrong: {
      0: 'Lakehouse exposes Delta tables in OneLake — fully Direct-Lake-capable.',
      1: 'Warehouse persists data as Delta-Parquet in OneLake — Direct-Lake-capable.',
      3: 'Mirrored Databases write incoming data as Delta in OneLake — Direct-Lake-capable.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'eventhouse', 'mirroring']
  }),
  single({
    id: 'dl-008', domain: 'semantic', subtopic: 'direct-lake', difficulty: 5,
    prompt: 'A user reports that a Direct Lake report is slow, and looking at the trace shows DirectQuery activity against the SQL endpoint. What investigative step is most likely to reveal the issue?',
    options: [
      'Check whether the Delta tables have V-Order enabled and are not using unsupported Delta features',
      'Increase the capacity SKU',
      'Switch the model to Import mode',
      'Disable the query cache on the model'
    ],
    correct: 0,
    explanation: 'A Direct Lake model trace showing DirectQuery means fallback is active. The most common causes are missing V-Order on one or more tables, Delta features the engine cannot consume, or query patterns that exceed Direct Lake support.',
    whyWrong: {
      1: 'A larger SKU does not fix fallback — fallback is a feature/compatibility issue, not a capacity issue.',
      2: 'Switching to Import is a workaround, not an investigation step; it abandons Direct Lake entirely.',
      3: 'There is no "disable the query cache" toggle that resolves fallback.'
    },
    source: SRC.directLakeFallback,
    tags: ['direct-lake', 'fallback', 'troubleshooting']
  }),
  single({
    id: 'dl-009', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'Which file format are Delta tables stored in when written to OneLake?',
    options: ['Optimized Avro', 'Parquet with a transaction log', 'CSV with a manifest', 'Iceberg'],
    correct: 1,
    explanation: 'Delta Lake stores data as Parquet files plus a transaction log (the `_delta_log` directory) that tracks ACID-style commits. Direct Lake reads from this Parquet+log layout.',
    whyWrong: {
      0: 'Avro is not the underlying format for Delta tables.',
      2: 'CSV is not used by Delta Lake at all.',
      3: 'Iceberg is a different open table format; OneLake uses Delta.'
    },
    source: SRC.directLake,
    tags: ['delta', 'parquet', 'onelake']
  }),
  multi({
    id: 'dl-010', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Which behaviors are TRUE about column eviction in Direct Lake under memory pressure?',
    options: [
      'Columns are evicted in LRU (least-recently-used) order',
      'Eviction is triggered by hitting the capacity SKU memory limit',
      'After eviction, the next query that references the column pages it back in from OneLake',
      'Eviction wipes the data from OneLake to reclaim space'
    ],
    correct: [0, 1, 2],
    explanation: 'Direct Lake evicts cold columns from VertiPaq under capacity memory pressure using LRU and re-pages them on next reference. Eviction is purely an in-memory cache operation; it never deletes data in OneLake.',
    whyWrong: {
      3: 'OneLake is the source of truth; eviction NEVER deletes from OneLake — it only reclaims VertiPaq RAM.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'eviction', 'memory']
  }),
  single({
    id: 'dl-011', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'You add a calculated column to a Direct Lake table. What is the consequence?',
    options: [
      'The column is computed at OneLake write time as a Delta column',
      'The model can no longer use Direct Lake for that table — it falls back to Import or DirectQuery for it',
      'Calculated columns work natively in Direct Lake without any side-effect',
      'The model rejects the calculated column with a validation error'
    ],
    correct: 1,
    explanation: 'Direct Lake reads native columns from Delta; calculated columns require materialization, which Direct Lake does not perform on the fly. Adding one will push the affected table to a different storage mode (or it may be unsupported entirely depending on tooling).',
    whyWrong: {
      0: 'Direct Lake does not write back to OneLake. It only reads from it.',
      2: 'Calculated columns DO have a side effect — they break pure Direct Lake on that table.',
      3: 'The model does not necessarily reject them; the cost is the storage-mode change, which is the trap.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'calculated-columns', 'trap']
  }),
  single({
    id: 'dl-012', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'Direct Lake models are well-suited for which scenario?',
    options: [
      'Real-time stock-tick aggregation with sub-second freshness',
      'BI workload over Lakehouse/Warehouse with near-Import latency and near-real-time freshness',
      'Operational reporting that needs row-level updates committed within 1 ms',
      'Massive-volume cold archival data accessed once per quarter'
    ],
    correct: 1,
    explanation: 'Direct Lake is the sweet spot for analytical BI on Fabric Lakehouse/Warehouse — fast queries with freshness on the order of seconds (whenever Delta commits land).',
    whyWrong: {
      0: 'Sub-second tick aggregation is the Eventhouse / KQL territory, not Direct Lake.',
      2: '1 ms commit-to-query is well below what Direct Lake offers; that is OLTP-class latency.',
      3: 'Cold archival data does not benefit from Direct Lake; the column-paging overhead is unrewarded for one-off queries.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'when-to-use']
  }),
  multi({
    id: 'dl-013', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Which actions can trigger an explicit reframe of a Direct Lake model?',
    options: [
      'Running "Refresh now" on the semantic model',
      'Updating the underlying Lakehouse SQL endpoint metadata (e.g., adding a column)',
      'Calling the dataset Refresh API (REST or XMLA)',
      'Restarting the user\'s browser'
    ],
    correct: [0, 1, 2],
    explanation: 'Both UI Refresh and API Refresh trigger a reframe to the latest Delta version. Schema changes against the Lakehouse SQL endpoint also require a reframe to expose the new shape. Browser restarts don\'t reach the model.',
    whyWrong: {
      3: 'Restarting the browser only resets the client; the server-side model is untouched.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'framing', 'refresh']
  }),
  single({
    id: 'dl-014', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'A team is migrating an Import-mode model with 80 GB of data and 30-minute refresh windows to Direct Lake. What benefit do they realize FIRST?',
    options: [
      'Sub-millisecond query latency across all visuals',
      'Elimination of the refresh window — data freshness becomes near-real-time as Delta commits land',
      'A 10x reduction in DAX measure complexity',
      'Automatic conversion of all calculated columns to native Delta columns'
    ],
    correct: 1,
    explanation: 'The killer benefit is removing the scheduled-refresh latency. Once the Delta source is updated, queries see the new data after framing — no 30-minute window, no retry-on-fail orchestration.',
    whyWrong: {
      0: 'Direct Lake latency is comparable to Import, not necessarily better and not sub-millisecond.',
      2: 'DAX measure complexity is unchanged by storage mode.',
      3: 'Calculated columns are not auto-converted — and they conflict with Direct Lake on that table.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'migration', 'freshness']
  }),
  single({
    id: 'dl-015', domain: 'semantic', subtopic: 'direct-lake', difficulty: 5,
    prompt: 'You are designing a model where one fact table needs Direct Lake performance but a slowly-changing reference dimension is sourced from a remote SQL DB. What model design fits?',
    options: [
      'Single-mode Direct Lake — pull the dim into OneLake via shortcut so everything is Delta',
      'Composite model — Direct Lake for the fact, Import for the small dim',
      'Composite model — DirectQuery for the dim and Direct Lake for the fact, fully on Fabric capacity',
      'Both options 1 and 2 are valid; pick based on freshness needs of the dim'
    ],
    correct: 3,
    explanation: 'Either approach is valid: shortcut-into-OneLake keeps everything Delta and Direct-Lakeable; composite Import-of-dim with Direct-Lake-of-fact is also supported and often simpler when the dim updates rarely. DirectQuery for dim+Direct-Lake-fact in composite is more advanced and capacity-sensitive.',
    whyWrong: {
      0: 'Valid, but it is not the only good answer.',
      1: 'Valid, but it is not the only good answer.',
      2: 'Technically possible but the most complex pattern; not generally recommended without specific reason.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'composite', 'design']
  }),
  order({
    id: 'dl-016', domain: 'semantic', subtopic: 'direct-lake', difficulty: 4,
    prompt: 'Place the steps of a typical Direct Lake query in execution order.',
    options: [
      'Engine receives query and identifies referenced columns',
      'Engine checks whether the columns are resident in VertiPaq',
      'Cold columns are paged in from OneLake Delta files',
      'VertiPaq executes the query against the resident data',
      'Result returns to the caller'
    ],
    explanation: 'Direct Lake is pull-based: parse the query, see what columns it needs, page anything missing, run, return.',
    source: SRC.directLake,
    tags: ['direct-lake', 'execution']
  }),
  single({
    id: 'dl-017', domain: 'semantic', subtopic: 'direct-lake', difficulty: 3,
    prompt: 'A Lakehouse SQL endpoint has its statistics refreshed regularly. Why does this matter for Direct Lake?',
    options: [
      'Direct Lake queries do not use SQL endpoint statistics',
      'Stale statistics on the SQL endpoint can lead to inaccurate metadata used during framing',
      'The SQL endpoint is the only path Direct Lake uses to read data',
      'Statistics determine which columns get evicted from VertiPaq'
    ],
    correct: 1,
    explanation: 'Even though Direct Lake reads Delta files directly, framing relies on the SQL endpoint\'s metadata view. Stale statistics or undiscovered tables can lead to stale or missing model state until refresh.',
    whyWrong: {
      0: 'Framing uses SQL endpoint metadata; this answer reverses the relationship.',
      2: 'Direct Lake bypasses the SQL endpoint for data reads — it reads Delta directly.',
      3: 'Eviction is by LRU based on memory pressure, not by SQL statistics.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'sql-endpoint', 'framing']
  }),
  single({
    id: 'dl-018', domain: 'semantic', subtopic: 'direct-lake', difficulty: 2,
    prompt: 'In Direct Lake, which workspace placement is required for a semantic model relative to its Lakehouse / Warehouse source?',
    options: [
      'Source and model must be in the same Fabric workspace',
      'Source and model can be in any two workspaces in the same tenant',
      'The model must be in a Power BI workspace and the source in a Fabric workspace',
      'They must be in different workspaces for security isolation'
    ],
    correct: 0,
    explanation: 'Direct Lake currently requires same-workspace co-location of the semantic model with its underlying Lakehouse/Warehouse. Cross-workspace placement is not supported as of the GA release.',
    whyWrong: {
      1: 'Cross-workspace Direct Lake is not supported.',
      2: 'Mixing PBI workspace + Fabric workspace is not the requirement; both must be Fabric, in the same workspace.',
      3: 'There is no security-isolation requirement that mandates cross-workspace placement.'
    },
    source: SRC.directLake,
    tags: ['direct-lake', 'workspace']
  })
];
