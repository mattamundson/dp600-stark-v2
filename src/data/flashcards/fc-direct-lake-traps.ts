// 20 Direct Lake "trap" flashcards — confidently-wrong patterns that fail in production.
// Each card teaches WHY the trap exists, not just the rule. Deck slug 'direct-lake-traps'
// is added to the FlashcardDeck schema enum at wire-up time.

import type { Flashcard } from '../../lib/schema';

export const directLakeTraps: Flashcard[] = [
  { id: 'fc-dlt-001', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: You add a calculated column to a Direct Lake table to "fix" a missing attribute. What goes wrong?',
    back: 'Calculated columns are unsupported in Direct Lake — adding one converts that table to DirectQuery (or fails to load entirely on stricter tooling). The model now silently pays per-query SQL round-trip cost on that table. Materialize the column upstream in the Lakehouse / Warehouse, or replace it with a measure.',
    tags: ['direct-lake', 'trap', 'calculated-columns'],
    sourceAnchor: { category: 'direct-lake-fallback', note: 'Calc columns disqualify Direct Lake on that table' } },

  { id: 'fc-dlt-002', deck: 'direct-lake-traps', difficulty: 5,
    front: 'TRAP: A third-party tool writes Delta tables with V-Order DISABLED. The model "works" but reports are slow.',
    back: 'Without V-Order, Direct Lake cannot transcode column segments efficiently and SILENTLY falls back to DirectQuery for those tables. The model still returns correct results — only the latency tells you. Run OPTIMIZE with VORDER=true to rewrite the files in-place, or fix the upstream writer.',
    tags: ['direct-lake', 'trap', 'v-order', 'fallback'],
    sourceAnchor: { category: 'direct-lake-fallback', note: 'Missing V-Order = silent DQ fallback' } },

  { id: 'fc-dlt-003', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: You place the semantic model in workspace A and the Lakehouse in workspace B for "separation of concerns". Direct Lake stops working.',
    back: 'Direct Lake currently REQUIRES the semantic model and its Lakehouse / Warehouse to be in the SAME workspace. Cross-workspace Direct Lake is not supported. Move the model into the data workspace, or vice versa — separation has to be done with permissions, not workspace boundaries.',
    tags: ['direct-lake', 'trap', 'workspace'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Same-workspace requirement' } },

  { id: 'fc-dlt-004', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: A team builds Direct Lake on top of a KQL Database in an Eventhouse for "real-time analytics". It does not work.',
    back: 'KQL Databases use the Kusto storage engine, NOT Delta-Parquet in OneLake. Direct Lake reads only V-Ordered Delta — KQL is not Direct-Lake-capable. Real-time analytics over KQL goes through DirectQuery on the KQL endpoint, or you mirror the data into a Lakehouse first.',
    tags: ['direct-lake', 'trap', 'eventhouse', 'kql'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Direct Lake source compatibility' } },

  { id: 'fc-dlt-005', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: You enable DirectLakeOnly to "guarantee performance". The next morning multiple reports throw query errors.',
    back: 'DirectLakeOnly REPLACES silent fallback with hard FAILURE — that is the contract. The errors are exposing latent fallback triggers (calc columns, missing V-Order, exceeded SKU guardrails) that were silently degrading the model before. Fix the triggers; do not roll back the setting.',
    tags: ['direct-lake', 'trap', 'directlakeonly'],
    sourceAnchor: { category: 'direct-lake-fallback', note: 'NeverFallback surfaces latent issues' } },

  { id: 'fc-dlt-006', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: A pyspark notebook adds a column to a Lakehouse table. The Direct Lake model never shows the new column.',
    back: 'Schema changes require both an SQL endpoint metadata sync AND an explicit reframe of the model. Data-only changes do not. Trigger a model Refresh after the endpoint syncs to make the new column visible. The lazy-by-default behavior catches teams who assume "it just refreshes".',
    tags: ['direct-lake', 'trap', 'schema-change', 'framing'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Schema-change reframe requirement' } },

  { id: 'fc-dlt-007', deck: 'direct-lake-traps', difficulty: 5,
    front: 'TRAP: A Direct Lake report is fast in dev (small dataset) and slow in prod (big dataset) on the same F2 capacity.',
    back: 'Per-SKU GUARDRAILS — max rows scanned, max columns paged, max model memory — scale with the F SKU. F2 has the tightest guardrails; a fact table that exceeds them silently falls back to DirectQuery even when capacity utilization looks low. The fix is usually a higher SKU, not "more capacity".',
    tags: ['direct-lake', 'trap', 'guardrails', 'sku'],
    sourceAnchor: { category: 'direct-lake-fallback', note: 'SKU guardrails govern fallback' } },

  { id: 'fc-dlt-008', deck: 'direct-lake-traps', difficulty: 3,
    front: 'TRAP: The first query against a freshly-opened Direct Lake report is slow but the next one is fast.',
    back: 'Direct Lake pages columns into VertiPaq ON FIRST REFERENCE — the first query touching a cold column pays a one-time transcode cost. After that, the column is resident and queries run at near-Import speed until the column is evicted under memory pressure (LRU). This is normal, not a bug.',
    tags: ['direct-lake', 'trap', 'paging', 'cold-start'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Lazy column transcode' } },

  { id: 'fc-dlt-009', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: You assume "Refresh" on a Direct Lake model imports new data, like Import mode.',
    back: 'A Direct Lake "Refresh" does NOT move data — it REFRAMES the model against the latest committed Delta version. Data lives in OneLake; the model just rebinds its column metadata. There is no Power Query / data movement step, no refresh window, and no failure-on-bad-rows path the way Import has.',
    tags: ['direct-lake', 'trap', 'refresh', 'framing'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Refresh = reframe, not ingest' } },

  { id: 'fc-dlt-010', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: After memory pressure events, a column is "missing" from queries until it pages back in.',
    back: 'Eviction under capacity memory pressure removes column segments from VertiPaq RAM in LRU order. The next query that references the column pays the cold-page cost from OneLake — but the data is NEVER deleted from OneLake. Eviction only reclaims RAM. Frequent eviction → undersized capacity.',
    tags: ['direct-lake', 'trap', 'eviction', 'lru'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'LRU eviction cost' } },

  { id: 'fc-dlt-011', deck: 'direct-lake-traps', difficulty: 5,
    front: 'TRAP: A complex CALCULATETABLE + USERELATIONSHIP measure runs fine in Import but silently falls back in Direct Lake.',
    back: 'Some DAX patterns exceed what the Direct Lake storage engine can translate to a Delta-scan plan, especially CALCULATETABLE crossing many tables with USERELATIONSHIP. The engine falls back to DirectQuery for the affected query. Either simplify the measure, materialize the join upstream, or accept fallback for that query path.',
    tags: ['direct-lake', 'trap', 'dax', 'fallback'],
    sourceAnchor: { category: 'direct-lake-fallback', note: 'DAX patterns that force fallback' } },

  { id: 'fc-dlt-012', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: A team enables Direct Lake on a Power BI Pro workspace.',
    back: 'Direct Lake is NOT supported on Power BI Pro. It requires a Fabric capacity (F SKU) or Premium Per User (PPU). Pro workspaces have no OneLake-backed capacity to source from. The fix is to assign the workspace to a Fabric capacity, or to switch users to PPU.',
    tags: ['direct-lake', 'trap', 'sku', 'licensing'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Capacity licensing requirement' } },

  { id: 'fc-dlt-013', deck: 'direct-lake-traps', difficulty: 5,
    front: 'TRAP: Different users see different "latest" data — some see new rows, others do not.',
    back: 'Each Direct Lake model has its OWN framed Delta version. If two semantic models on the same Lakehouse table reframe at different times, downstream reports diverge. The Lakehouse SQL endpoint and Direct Lake model can also diverge until the model is reframed. Coordinate reframes (or use a single model) to keep consumers consistent.',
    tags: ['direct-lake', 'trap', 'framing', 'consistency'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Per-model framed snapshot drift' } },

  { id: 'fc-dlt-014', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: A "Direct Lake" report is fast on every measure except one — and that one shows DirectQuery in Server Timings.',
    back: 'Mixed-mode behavior is the default contract: per-query fallback. The fast measures stay on Direct Lake; the slow one fell back. Most likely causes: (1) calc column on a referenced table, (2) missing V-Order on a referenced table, (3) the measure crossed an unsupported pattern. Use DAX Studio Server Timings + Performance Analyzer to localize the table.',
    tags: ['direct-lake', 'trap', 'fallback', 'troubleshooting'],
    sourceAnchor: { category: 'direct-lake-fallback', note: 'Per-query fallback localization' } },

  { id: 'fc-dlt-015', deck: 'direct-lake-traps', difficulty: 3,
    front: 'TRAP: A team changes the underlying Lakehouse SQL endpoint statistics expecting Direct Lake to "speed up".',
    back: 'Direct Lake bypasses the SQL endpoint for DATA reads — it reads Delta files directly. Endpoint statistics affect DirectQuery / fallback paths, not the Direct Lake path. Stats DO matter for FRAMING (the endpoint exposes the metadata view used to reframe), so stale stats can cause stale schema visibility, but not slow queries on the Direct Lake path itself.',
    tags: ['direct-lake', 'trap', 'sql-endpoint', 'statistics'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'SQL endpoint role in framing vs reads' } },

  { id: 'fc-dlt-016', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: You add an Import table to a Direct Lake model "for a small dim", and a JOINed query gets slower than expected.',
    back: 'Composite Direct Lake + Import places the two tables on different ISLANDS. Cross-island relationships become "limited" relationships with weaker filter propagation, and cross-island queries pay an extra plan cost. Calc columns are still allowed on the Import island, but on the Direct Lake island they break Direct Lake — composite mode does NOT exempt that rule.',
    tags: ['direct-lake', 'trap', 'composite', 'limited-relationships'],
    sourceAnchor: { category: 'storage-modes', note: 'Composite islands and limited relationships' } },

  { id: 'fc-dlt-017', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: A pipeline truncates and reloads a Lakehouse table; the next report query returns OLD data.',
    back: 'Until the model reframes, the previously-framed Delta version is still bound — even if the SQL endpoint sees the new version. Add a model Refresh step at the end of the pipeline (REST API, XMLA, or scheduled) so reports see the new data. "Refresh" is cheap on Direct Lake — it only rebinds metadata.',
    tags: ['direct-lake', 'trap', 'pipeline', 'framing'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Pipeline-driven reframe' } },

  { id: 'fc-dlt-018', deck: 'direct-lake-traps', difficulty: 5,
    front: 'TRAP: A regulated workload audits framing events but only sees a few entries despite many data changes.',
    back: 'Default Direct Lake behavior includes AUTOMATIC reframing on query, which may not be principal-attributed in audit logs. For audited reframing, disable auto-reframe and orchestrate every reframe via the dataset Refresh REST API using a service principal — those calls land in audit logs with the principal id. DirectLakeOnly is unrelated; that controls fallback, not framing.',
    tags: ['direct-lake', 'trap', 'governance', 'framing'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Auditable framing pattern' } },

  { id: 'fc-dlt-019', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: A measure that worked yesterday throws "DirectLakeOnly mode prohibits DirectQuery" today.',
    back: 'Something changed on the model or its sources to make a query no longer servable by Direct Lake — most often a new calculated column, a non-V-Ordered write into the underlying Delta, or a guardrail breach as the data grew. The error is the design working: investigate the trigger, do NOT disable DirectLakeOnly to "make it go away".',
    tags: ['direct-lake', 'trap', 'directlakeonly', 'incident-response'],
    sourceAnchor: { category: 'direct-lake-fallback', note: 'NeverFallback hard-error contract' } },

  { id: 'fc-dlt-020', deck: 'direct-lake-traps', difficulty: 4,
    front: 'TRAP: A user "fixes" Direct Lake performance by setting the model to Import. Queries get slower under heavy concurrency.',
    back: 'Switching to Import abandons Direct Lake entirely — you now pay scheduled-refresh latency, refresh-window failure modes, and full in-memory model size on every node. Under heavy concurrency, capacity memory pressure can be WORSE than Direct Lake\'s lazy paging. The right fix is usually to remove the fallback trigger (calc column, V-Order, guardrail) — not to abandon Direct Lake.',
    tags: ['direct-lake', 'trap', 'import', 'incident-response'],
    sourceAnchor: { category: 'direct-lake-overview', note: 'Anti-pattern: abandoning Direct Lake' } }
];
