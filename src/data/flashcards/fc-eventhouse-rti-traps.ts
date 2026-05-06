// 15 Eventhouse + Real-Time Intelligence "trap" flashcards — confidently-wrong patterns
// that fail on the DP-600 exam and in production. Each card teaches WHY the trap exists.
// Deck slug 'fabric-architecture' — Eventhouse/RTI is a Fabric architecture domain topic.

import type { Flashcard } from '../../lib/schema';

export const eventhouseRtiTraps: Flashcard[] = [
  { id: 'fc-erti-001', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: You wire a Kafka source into Eventstream and expect it to behave identically to an Azure Event Hubs source. What is the critical difference?',
    back: 'Kafka and Event Hubs are both supported Eventstream sources, but they expose DIFFERENT consumer-group semantics and offset management. Event Hubs uses consumer-group checkpointing native to the Event Hubs service; Kafka uses Kafka offset commits. CDC sources (Azure SQL DB, Cosmos DB) are a third class entirely — they require the Eventstream Change Data Capture connector, which emits INSERT/UPDATE/DELETE change records, not raw event payloads. Mixing them up means you get the wrong data shape or miss the offset-reset behavior on restart.',
    tags: ['eventhouse', 'rti', 'trap', 'eventstream', 'sources', 'kafka'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Eventstream source type matrix: Kafka vs Event Hubs vs CDC' } },

  { id: 'fc-erti-002', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: You route an Eventstream to a Custom App destination believing it will preserve the schema you defined upstream. Does it?',
    back: 'Custom App destinations emit events as raw bytes or JSON — they do NOT enforce or preserve a schema. Only the KQL Database destination applies an explicit table mapping that enforces column types on ingest. Lakehouse destinations land data as Parquet files and preserve column names but do NOT enforce types server-side — type coercion happens at the Lakehouse SQL endpoint layer. If schema fidelity is critical, land in KQL Database (with explicit table mapping) or add an Eventstream transform before the destination.',
    tags: ['eventhouse', 'rti', 'trap', 'eventstream', 'destinations', 'schema'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Eventstream destination schema preservation behavior' } },

  { id: 'fc-erti-003', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: A KQL Database query is fast in the Eventhouse UI but slow when the Power BI report hits it. The team increases the hot cache tier. The report does not speed up.',
    back: 'Hot tier (hot cache) controls what percentage of the most recent data the Kusto engine keeps in SSD/RAM between queries — it reduces I/O latency for re-queried data. BUT: the first query against data NOT yet in cache still pays the cold read cost from Azure blob storage, regardless of the hot percentage. If the Power BI report always queries a time window that falls outside the hot window, increasing the hot tier does nothing. Fix: widen the hot window to cover the report\'s typical lookback range, OR materialize a summary using a materialized view so the aggregated result fits entirely inside the hot tier.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'hot-tier', 'caching'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'KQL hot-cache tier semantics and misapplication' } },

  { id: 'fc-erti-004', deck: 'fabric-architecture', difficulty: 5,
    front: 'TRAP: You set a KQL Database retention policy to 30 days believing deleted data is gone immediately and unrecoverable.',
    back: 'Retention policy in KQL uses a SOFT-DELETE model. Data past the retention window is marked as logically deleted and excluded from queries — but it remains physically in storage for a configurable recoverability window (default 2 days, max depends on cluster config). During this window you CAN recover with `.recover extents`. After the recoverability window expires, data is HARD-DELETED and genuinely unrecoverable. Confusing soft-delete with hard-delete causes compliance failures: a GDPR-delete request needs you to verify the recoverability window has also elapsed, not just that retention policy is set.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'retention', 'soft-delete'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'KQL retention policy: soft-delete vs hard-delete and recoverability window' } },

  { id: 'fc-erti-005', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: A team replaces a repeated `summarize count() by bin(timestamp, 1h)` query with a materialized view to "always have it fast". They expect the MV to refresh continuously.',
    back: 'Materialized views in KQL are NOT continuously refreshed like a streaming aggregation. They are refreshed on an INCREMENTAL basis as new extents (data shards) arrive — KQL merges new extents into the MV\'s materialized part. The MV always has a delta part (new data not yet materialized) that is computed on query. The win is that the pre-materialized part skips the full scan. If data arrives in very large infrequent batches, the delta can be large and the benefit small. MV pays off most when data is small-to-medium, continuously arriving, and the aggregation reduces cardinality significantly.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'materialized-views', 'refresh'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'KQL materialized view refresh model and when it pays off' } },

  { id: 'fc-erti-006', deck: 'fabric-architecture', difficulty: 5,
    front: 'TRAP: You chain two KQL update policies — PolicyA feeds TableB, PolicyB feeds TableC — and expect data to flow A→B→C on ingest to TableA.',
    back: 'KQL update policies execute in the context of the SOURCE table\'s ingest transaction only. PolicyA fires when data lands in TableA and writes to TableB. PolicyB is registered on TableB, but it does NOT fire for rows written by PolicyA — it only fires when external data is ingested directly into TableB. There is NO cascading update-policy chain in KQL. To achieve A→B→C you must register a single update policy on TableA whose query joins and transforms to produce the final shape for TableC, writing there directly, or use two independent ingest paths.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'update-policies', 'cascading'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Update policy cascade trap — policies do not chain' } },

  { id: 'fc-erti-007', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: A team enables the OneLake availability flag on a KQL Database and then queries it from the Lakehouse SQL endpoint expecting all KQL tables to be visible.',
    back: 'Enabling OneLake availability on a KQL Database exports data as Delta-Parquet files to OneLake — but ONLY for tables that have OneLake mirroring explicitly turned ON (per-table setting). Tables without the flag are NOT exported. Furthermore, the SQL analytics endpoint sees ONLY the exported Delta tables, not internal KQL-only tables or materialized view internal tables. Update policies and ingestion-time transforms still run inside Kusto; the OneLake export is a one-way snapshot of the resulting data. If you query an unexported table from the SQL endpoint, you get "table not found" — not a stale read.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'onelake', 'availability-flag'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'KQL OneLake availability: per-table flag and SQL endpoint visibility' } },

  { id: 'fc-erti-008', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: You configure a Reflex (Activator) rule to alert "when sensor_temp > 80 for 5 consecutive minutes". It fires once, but the temperature stays at 90 for an hour — no further alerts.',
    back: 'This is the Reflex COOLDOWN trap. By default, Activator fires once per rule-match episode and does NOT re-fire while the condition remains continuously true — it treats a sustained breach as a single event, not a stream of events. The rule fires on TRANSITION into the breaching state. To get re-fire behavior on sustained conditions you must configure a repeat interval (re-fire every N minutes while condition holds). Without that, the alert fires once at onset and is silent until the condition clears and re-triggers.',
    tags: ['eventhouse', 'rti', 'trap', 'reflex', 'activator', 'cooldown'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Reflex trigger cooldown: fires on transition, not sustained condition' } },

  { id: 'fc-erti-009', deck: 'fabric-architecture', difficulty: 3,
    front: 'TRAP: A developer opens Real-Time Hub to set up data movement from an Event Hub into a KQL Database. They find they cannot create a pipeline there and need a separate tool.',
    back: 'Real-Time Hub is the DISCOVERY surface — it lets you browse, monitor, and connect to real-time data streams (Event Hubs, Kafka, Fabric items). It is NOT the data movement engine. Actual data movement — routing, transformation, fan-out — is done in EVENTSTREAM. Real-Time Hub surfaces streams; you click "Connect" and it opens (or creates) an Eventstream to handle movement. Confusing Hub for Stream leads to looking for features in the wrong place.',
    tags: ['eventhouse', 'rti', 'trap', 'real-time-hub', 'eventstream', 'architecture'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Real-Time Hub = discovery surface; Eventstream = data movement primitive' } },

  { id: 'fc-erti-010', deck: 'fabric-architecture', difficulty: 3,
    front: 'TRAP: An architect says "we put our data in Eventhouse" and someone else says "we put it in the KQL Database" — are they talking about the same thing?',
    back: 'No — they are DIFFERENT objects in the hierarchy. An EVENTHOUSE is the Fabric workspace item that acts as a container and shared compute/cache tier for one or more KQL DATABASES. A KQL Database is the actual data store where tables, functions, and materialized views live. You cannot "put data in an Eventhouse" directly — you ingest into a KQL Database inside the Eventhouse. An Eventhouse can contain multiple KQL Databases sharing the same cluster resources, which is the key cost/isolation trade-off. Eventstream is a third thing: it is the pipeline that moves data INTO KQL Databases (or other destinations).',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'eventstream', 'architecture', 'hierarchy'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Eventhouse vs KQL Database vs Eventstream object hierarchy' } },

  { id: 'fc-erti-011', deck: 'fabric-architecture', difficulty: 5,
    front: 'TRAP: On the exam, a question asks which window function gives OVERLAPPING results. You answer "tumbling" because it sounds like it rolls. Wrong — which type actually overlaps?',
    back: 'SLIDING windows overlap — they advance by a step smaller than the window size, so consecutive windows share data. HOPPING windows are parameterized by size AND hop; when hop < size they also overlap (hopping is essentially the KQL/stream-analytics name for sliding). TUMBLING windows are non-overlapping and contiguous — each event falls in exactly one window. The exam trap is the word "tumbling" sounding like rolling/sliding motion. Memory anchor: tumbling is like a tumble dryer — fixed, non-overlapping cycles. Sliding/hopping windows require you to specify BOTH window size and step/hop, always.',
    tags: ['eventhouse', 'rti', 'trap', 'streaming', 'window-functions', 'sliding', 'tumbling', 'hopping'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Window aggregation types: overlap semantics for exam questions' } },

  { id: 'fc-erti-012', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: A KQL script uses `.set MyTable <| query` to rebuild a table daily. On the second run, instead of replacing the data, it fails with "table already exists".',
    back: '`.set` creates a NEW table from a query — it FAILS if the table already exists. `.append` adds rows to an existing table. `.set-or-append` creates the table if absent, then appends — it is additive, NOT destructive. To rebuild (truncate-and-replace) use `.set-or-replace`, which DROPS existing data and replaces with the query result. Misusing `.set-or-append` for a daily rebuild pattern produces ever-growing duplicates. The safe daily-rebuild idiom is `.set-or-replace TargetTable <| <query>`.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'ingest-commands', 'set-append'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'KQL .set vs .append vs .set-or-append vs .set-or-replace semantics' } },

  { id: 'fc-erti-013', deck: 'fabric-architecture', difficulty: 5,
    front: 'TRAP: A team wants Direct Lake on a KQL Database for sub-second Power BI dashboards on live telemetry. They enable OneLake availability and expect Direct Lake to work.',
    back: 'Direct Lake reads V-Ordered Delta-Parquet from OneLake — KQL Database storage is Kusto-native, NOT Delta. Enabling OneLake availability exports KQL data as Delta files via a periodic mirror, introducing LAG (typically minutes). Direct Lake on top of that mirror is therefore NOT real-time — it reflects the last export cycle. For truly live KQL data in Power BI you must use DirectQuery on the KQL endpoint (high latency per query) or accept the export lag with Direct Lake. There is no native real-time Direct Lake path on KQL; if a question implies there is, it is a trap.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'direct-lake', 'onelake'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Direct Lake on KQL Database — requires Delta export, introduces lag' } },

  { id: 'fc-erti-014', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: A team switches a KQL Database from batched ingestion to streaming ingestion for "real-time latency". Their storage costs triple.',
    back: 'Streaming ingestion bypasses the Kusto batching engine and lands rows in storage immediately as tiny extents (data shards), reducing latency from ~5 min to seconds. BUT: each tiny extent is its own storage object. Without the background merge/optimize step that batching provides, you accumulate thousands of micro-extents, multiplying metadata overhead and I/O per query — hence the cost spike. Streaming ingestion is appropriate for latency-sensitive paths (< 10 K rows/sec); heavy-volume paths should stay batched. The fix is to enable streaming only on high-priority tables and run `.optimize` policies to merge micro-extents after the fact.',
    tags: ['eventhouse', 'rti', 'trap', 'kql-database', 'streaming-ingestion', 'batched-ingestion', 'cost'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Streaming vs batched ingestion: latency vs cost/micro-extent trade-off' } },

  { id: 'fc-erti-015', deck: 'fabric-architecture', difficulty: 4,
    front: 'TRAP: A Reflex (Activator) rule triggers a Power Automate flow on a sensor breach. The flow silently does nothing. How do you detect and diagnose this?',
    back: 'Power Automate flows triggered from Reflex can fail silently if (1) the flow is disabled, (2) the connection used in the flow has expired credentials, or (3) the flow\'s premium connector requires a license the service principal does not have. Reflex itself shows the rule as "fired" — it has no visibility into what the downstream flow did. To detect: open Power Automate → Run History for the flow; a failed run shows the error. Reflex Teams message actions fail differently — they surface an error in the Activator item logs because Teams connectivity is validated at activation time. Custom webhook actions also fail silently unless you build error-response handling in the target. The exam pattern: PA flows are the highest-risk silent-failure destination; always instrument with PA run-history monitoring or an error-handling branch in the flow.',
    tags: ['eventhouse', 'rti', 'trap', 'reflex', 'activator', 'power-automate', 'silent-failure'],
    sourceAnchor: { category: 'eventhouse-rti', note: 'Reflex action failure modes: PA silent-fail vs Teams error surfacing' } },
];
