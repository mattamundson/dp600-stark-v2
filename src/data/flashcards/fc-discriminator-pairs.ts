// Discriminator Pairs — 30 high-confusion A-vs-B flashcards for the final 12 days.
//
// Each card isolates the SINGLE discriminator that separates two commonly-confused
// Fabric / DAX / semantic-model concepts.  Back always gives: right answer, mirror
// contrast, and a "Pick X when..." rule of thumb.
//
// IDs: fc-disc-001..fc-disc-030, deck: 'exam-traps'.
// NO overlap with fc-priority-traps (fc-prt-001..fc-prt-030).

import type { Flashcard } from '../../lib/schema';

export const discriminatorPairs: Flashcard[] = [

  // ── Storage mode selection ───────────────────────────────────────────────

  {
    id: 'fc-disc-001',
    deck: 'exam-traps',
    front: 'Import vs DirectQuery vs Direct Lake — which mode gives true sub-second refresh from live OneLake Delta files?',
    back: 'Direct Lake. It reads Delta/Parquet files in OneLake at near in-memory speed without a full Import reload, and without the per-query latency of DirectQuery. Import requires a scheduled or on-demand refresh cycle; DirectQuery hits the source on every visual interaction. Pick Direct Lake when the data lives in OneLake, freshness is important, and query performance must match Import speed.',
    tags: ['storage-modes', 'direct-lake', 'import', 'directquery', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'direct-lake-overview', note: 'Storage-mode selection: DL vs Import vs DQ' }
  },

  {
    id: 'fc-disc-002',
    deck: 'exam-traps',
    front: 'Lakehouse vs Fabric Warehouse — which one supports T-SQL INSERT, UPDATE, DELETE via a standard connection?',
    back: 'Fabric Warehouse fully supports T-SQL DML (INSERT, UPDATE, DELETE, MERGE) through its SQL connection endpoint. The Lakehouse SQL endpoint is read-only for T-SQL — all writes to a Lakehouse must go through Spark notebooks, Dataflow Gen2, or the Lakehouse Files API. Pick the Warehouse when downstream teams require T-SQL write access; pick the Lakehouse when the primary workload is Spark-based data engineering.',
    tags: ['lakehouse', 'warehouse', 'tsql', 'dml', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'fabric-warehouse-tsql', note: 'Warehouse write capability vs Lakehouse read-only SQL endpoint' }
  },

  {
    id: 'fc-disc-003',
    deck: 'exam-traps',
    front: 'Notebook vs Dataflow Gen2 — which is the right choice when transformation logic exceeds 10 GB of data and requires custom Python libraries?',
    back: 'Notebook. Notebooks run on Spark and support arbitrary Python/Scala/R with pip-installed libraries, scaling horizontally across the cluster. Dataflow Gen2 is a low-code/no-code Power Query transformation layer optimized for sub-10 GB structured data with a visual UI — it does not support custom Python packages. Pick Notebooks for code-first, large-scale, or library-dependent transforms; pick Dataflow Gen2 for no-code, citizen-developer-friendly pipelines.',
    tags: ['notebook', 'dataflow-gen2', 'scale', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'data-engineering', note: 'Notebook vs Dataflow Gen2 scale and code-first boundary' }
  },

  {
    id: 'fc-disc-004',
    deck: 'exam-traps',
    front: 'Pipeline Copy Activity vs Notebook activity — which preserves Delta transaction log and supports ACID writes to a Lakehouse?',
    back: 'Notebook activity (executing a Spark notebook). The Copy Activity moves raw files efficiently but writes data as flat files — it does not create or maintain a Delta transaction log. A Spark notebook using `spark.write.format("delta")` writes ACID-compliant Delta tables with full transaction log support. Pick Copy Activity for raw-file ingestion (CSV, Parquet, JSON); pick Notebook activity when the destination must be a Delta table with ACID guarantees.',
    tags: ['pipeline', 'copy-activity', 'notebook', 'delta', 'acid', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'data-factory-fabric', note: 'Copy Activity vs Notebook: Delta ACID distinction' }
  },

  {
    id: 'fc-disc-005',
    deck: 'exam-traps',
    front: 'Eventhouse (KQL Database) vs Lakehouse — which is optimized for high-throughput streaming telemetry with sub-second query latency over billions of rows?',
    back: 'Eventhouse. It uses columnar storage optimized for append-heavy, time-series telemetry (logs, events, IoT) with KQL queries returning results in milliseconds. The Lakehouse (Delta/Parquet) is optimized for batch analytics and ML workloads — not for sub-second streaming fan-out queries. Pick Eventhouse for real-time operational analytics over streaming data; pick Lakehouse for structured batch ELT and ML feature stores.',
    tags: ['eventhouse', 'lakehouse', 'streaming', 'kql', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'real-time-analytics', note: 'Eventhouse vs Lakehouse: streaming vs batch' }
  },

  {
    id: 'fc-disc-006',
    deck: 'exam-traps',
    front: 'Mirrored Database vs OneLake Shortcut — which creates a physical replica of the source data in OneLake?',
    back: 'Mirrored Database. Mirroring continuously replicates source data (e.g. Azure SQL, Cosmos DB, Snowflake) into OneLake as Delta Parquet files — queries read from the OneLake copy, not the source. A Shortcut is a virtual pointer that reads the source at query time; no data is copied. Pick Mirroring when you need OneLake-resident data for downstream Spark or DL workloads; pick Shortcuts when you want to query external data without ingestion cost.',
    tags: ['mirroring', 'shortcuts', 'onelake', 'copy-vs-virtualize', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'mirroring', note: 'Mirrored DB (copy) vs Shortcut (virtual pointer)' }
  },

  // ── Event-driven and automation ──────────────────────────────────────────

  {
    id: 'fc-disc-007',
    deck: 'exam-traps',
    front: 'Reflex (Activator) vs Power Automate — which fires an alert within seconds of a streaming metric crossing a threshold?',
    back: 'Reflex (Activator). It is the Fabric-native real-time intelligence component that subscribes to Eventstream or KQL data and fires actions (email, Teams message, webhook) within seconds of a condition being met. Power Automate runs on a scheduled or connector-triggered basis — its minimum recurrence is typically 1 minute, and it is not designed for sub-second event detection. Pick Reflex for streaming-threshold alerting; pick Power Automate for process automation triggered by user actions or longer-polling connectors.',
    tags: ['reflex', 'activator', 'power-automate', 'event-driven', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'real-time-analytics', note: 'Reflex vs Power Automate: latency and trigger model' }
  },

  // ── Workspace roles ──────────────────────────────────────────────────────

  {
    id: 'fc-disc-008',
    deck: 'exam-traps',
    front: 'Workspace Member vs Workspace Contributor — which role can add and remove OTHER workspace members?',
    back: 'Member. The Member role can add users at Contributor or Viewer level (but not Admin or other Members). Contributor can create and edit content but cannot manage workspace membership at all. Pick Member when a team lead needs to onboard colleagues; pick Contributor for developers who only need to publish and edit items.',
    tags: ['workspace-roles', 'member', 'contributor', 'discriminator'],
    difficulty: 2,
    sourceAnchor: { category: 'workspace-roles', note: 'Member vs Contributor: membership management boundary' }
  },

  {
    id: 'fc-disc-009',
    deck: 'exam-traps',
    front: 'Workspace Admin vs Fabric Tenant Admin — which can disable Direct Lake for the entire organization?',
    back: 'Fabric Tenant Admin (via the Admin portal). Tenant admin controls organization-wide settings such as enabling/disabling Direct Lake, controlling who can create workspaces, and toggling export features. Workspace Admin controls only that single workspace — they can manage content, members, and settings within their workspace but cannot override tenant-level feature flags. Pick Tenant Admin when the requirement spans the organization; pick Workspace Admin when scope is a single workspace.',
    tags: ['workspace-admin', 'tenant-admin', 'scope', 'discriminator'],
    difficulty: 2,
    sourceAnchor: { category: 'fabric-governance', note: 'Tenant Admin vs Workspace Admin authority scope' }
  },

  // ── Security ─────────────────────────────────────────────────────────────

  {
    id: 'fc-disc-010',
    deck: 'exam-traps',
    front: 'RLS vs OLS — a user should not see the Salary column at all, even in a "Total Payroll" measure name. Which security mechanism applies?',
    back: 'OLS (Object-Level Security). OLS hides the column object itself from the role — users in the restricted role cannot see the column name and any measure that references it will error for them. RLS hides rows, not columns; a restricted user could still see the Salary column header with RLS. Pick OLS to hide columns or tables entirely; pick RLS to filter the rows a user can see.',
    tags: ['ols', 'rls', 'column-hiding', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'object-level-security', note: 'OLS for column/table hiding vs RLS for row filtering' }
  },

  // ── Calculation groups vs field parameters vs multiple measures ──────────

  {
    id: 'fc-disc-011',
    deck: 'exam-traps',
    front: 'Calculation group vs Field parameter vs writing multiple explicit measures — which is best when you need YTD, QTD, and MTD variants of every base measure, and new base measures should automatically get all three?',
    back: 'Calculation group. A calculation group applies a set of calculation items (YTD, QTD, MTD using SELECTEDMEASURE()) to any base measure in the model — new measures get all variants automatically. Field parameters let users switch which measure is displayed but do not add time-intelligence wrapping. Writing explicit measures (e.g., Sales YTD, Sales QTD) means every new measure requires N more explicit variants. Pick calculation groups for cross-cutting time intelligence or format switching applied to many measures.',
    tags: ['calculation-groups', 'field-parameters', 'measures', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'semantic-model-design', note: 'Calc group vs field parameter vs explicit measures' }
  },

  // ── VertiPaq compression ─────────────────────────────────────────────────

  {
    id: 'fc-disc-012',
    deck: 'exam-traps',
    front: 'V-Order vs Z-Order — which optimization benefits a Direct Lake semantic model query, and which benefits a Delta table scan in Spark?',
    back: 'V-Order benefits Direct Lake. V-Order is a Fabric write-time Parquet optimization that sorts and compresses columns for the VertiPaq analysis-services engine — it accelerates columnar reads in Direct Lake. Z-Order is a Delta Lake optimization that co-locates related data within files to reduce file scanning in Spark (e.g. `OPTIMIZE ... ZORDER BY (column)`). Pick V-Order when the primary consumer is a Power BI / Direct Lake semantic model; pick Z-Order when Spark queries need predicate-pushdown acceleration.',
    tags: ['v-order', 'z-order', 'direct-lake', 'delta', 'spark', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'direct-lake-overview', note: 'V-Order (VertiPaq) vs Z-Order (Spark Delta scan)' }
  },

  // ── Direct Lake framing ─────────────────────────────────────────────────

  {
    id: 'fc-disc-013',
    deck: 'exam-traps',
    front: 'Direct Lake automatic framing vs scheduled framing vs programmatic framing — which happens without any user or admin action when a Delta table is updated?',
    back: 'Automatic framing. When automatic framing is enabled on the semantic model, Fabric detects that the underlying Delta table version has changed and re-frames the model automatically — no human trigger or REST call required. Scheduled framing fires on a configured time cadence regardless of table changes. Programmatic framing is explicitly invoked via the REST API or Fabric SDK. Pick automatic framing for zero-latency model freshness; pick scheduled or programmatic when you need control over when the model updates.',
    tags: ['direct-lake', 'framing', 'automatic', 'scheduled', 'programmatic', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'direct-lake-overview', note: 'Automatic vs scheduled vs programmatic framing triggers' }
  },

  // ── DAX — SUM vs SUMX ────────────────────────────────────────────────────

  {
    id: 'fc-disc-014',
    deck: 'exam-traps',
    front: 'SUM vs SUMX — which is required when the value to aggregate involves a per-row calculation between two columns?',
    back: 'SUMX. `SUMX(table, [Qty] * [Price])` iterates each row and evaluates the expression before summing. `SUM` aggregates a single existing column — it cannot compute a row-level expression. The trade-off: SUMX materializes a virtual column per row (higher memory), while SUM is a single storage-engine pass. Pick SUM for single-column aggregations; pick SUMX when you need a row-by-row expression inside the aggregation.',
    tags: ['dax', 'sum', 'sumx', 'iterator', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-functions', note: 'SUM single-column vs SUMX row expression' }
  },

  // ── DAX — ALL vs ALLSELECTED ─────────────────────────────────────────────

  {
    id: 'fc-disc-015',
    deck: 'exam-traps',
    front: 'ALL vs ALLSELECTED used as a CALCULATE filter modifier — which one retains the user\'s slicer selections from the report page?',
    back: 'ALLSELECTED retains outer slicer and page-filter context while removing the visual\'s own cross-filter. ALL removes ALL filters from the table or column — including slicer selections — and computes against the full domain. Pick ALLSELECTED for "% of slicer total" measures; pick ALL for "% of grand total" measures that must ignore everything the user has selected.',
    tags: ['dax', 'all', 'allselected', 'slicer', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'dax-functions', note: 'ALLSELECTED retains outer query; ALL ignores all filters' }
  },

  // ── DAX — CALCULATE vs CALCULATETABLE ────────────────────────────────────

  {
    id: 'fc-disc-016',
    deck: 'exam-traps',
    front: 'CALCULATE vs CALCULATETABLE — what is the difference in return type, and when does it matter?',
    back: 'CALCULATE returns a scalar value (number, text, date) by evaluating an expression in a modified filter context. CALCULATETABLE returns a TABLE by evaluating a table expression in a modified filter context. CALCULATETABLE is used as the filter argument of another function (e.g., inside FILTER or as a virtual table) when you need a filtered table, not a single value. Pick CALCULATE for measures and scalar expressions; pick CALCULATETABLE when the result must be a table.',
    tags: ['dax', 'calculate', 'calculatetable', 'scalar-vs-table', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-functions', note: 'CALCULATE scalar vs CALCULATETABLE table return' }
  },

  // ── DAX — KEEPFILTERS ────────────────────────────────────────────────────

  {
    id: 'fc-disc-017',
    deck: 'exam-traps',
    front: 'CALCULATE with a filter argument vs CALCULATE with KEEPFILTERS — which overwrites the existing filter on a column, and which intersects with it?',
    back: 'A plain filter argument to CALCULATE (e.g., `CALCULATE([Measure], Region[Country] = "US")`) OVERWRITES any existing filter on `Region[Country]` from the visual or slicer context. Wrapping it in `KEEPFILTERS` (e.g., `CALCULATE([Measure], KEEPFILTERS(Region[Country] = "US"))`) intersects the new filter with the existing filter — both conditions must be true. Pick KEEPFILTERS when you want the filter to NARROW existing context rather than replace it.',
    tags: ['dax', 'keepfilters', 'calculate', 'overwrite-vs-intersect', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'dax-functions', note: 'CALCULATE override vs KEEPFILTERS intersection' }
  },

  // ── DAX — USERELATIONSHIP vs bidirectional cross-filter ─────────────────

  {
    id: 'fc-disc-018',
    deck: 'exam-traps',
    front: 'USERELATIONSHIP vs enabling bidirectional cross-filter on a relationship — which is safer for avoiding unintended filter propagation across the whole model?',
    back: 'USERELATIONSHIP is safer. It activates an inactive relationship only for the duration of a single measure — the rest of the model is unaffected. Bidirectional cross-filtering is a permanent relationship-level setting that propagates filters in BOTH directions for every query involving those tables, which can cause unexpected measure values and ambiguous filter paths in complex models. Pick USERELATIONSHIP for targeted, measure-scoped relationship activation; pick bidirectional only when the data model explicitly requires it (e.g., many-to-many bridge scenarios).',
    tags: ['dax', 'userelationship', 'bidirectional', 'relationships', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'dax-functions', note: 'USERELATIONSHIP scoped vs bidirectional global propagation' }
  },

  // ── DAX — RELATED vs LOOKUPVALUE ─────────────────────────────────────────

  {
    id: 'fc-disc-019',
    deck: 'exam-traps',
    front: 'RELATED vs LOOKUPVALUE — which requires an active relationship in the model, and which can work without one?',
    back: 'RELATED requires an active relationship. It traverses the model\'s existing relationship from the current row context to the related table and returns the column value — it cannot operate without a defined active relationship. LOOKUPVALUE performs a row scan (like VLOOKUP) using explicit match columns and does NOT require a model relationship at all. Pick RELATED for performance and clean model design; pick LOOKUPVALUE when no model relationship exists or when matching on non-key columns.',
    tags: ['dax', 'related', 'lookupvalue', 'relationships', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-functions', note: 'RELATED (requires relationship) vs LOOKUPVALUE (no relationship)' }
  },

  // ── DAX — SUMMARIZE vs SUMMARIZECOLUMNS ──────────────────────────────────

  {
    id: 'fc-disc-020',
    deck: 'exam-traps',
    front: 'SUMMARIZE vs SUMMARIZECOLUMNS — which one should you use when adding extension columns, and why?',
    back: 'SUMMARIZECOLUMNS. Adding extension columns (extra aggregations) directly inside SUMMARIZE is officially unsupported — Microsoft documentation states SUMMARIZE should only be used to group, not to add measures. Extension columns added to SUMMARIZE can produce incorrect results (double-counting, wrong context). SUMMARIZECOLUMNS was designed as the replacement for both grouping and extension in a single call. Pick SUMMARIZECOLUMNS for all virtual summary tables that include measures; use SUMMARIZE only for pure grouping with ADDCOLUMNS wrapping if needed.',
    tags: ['dax', 'summarize', 'summarizecolumns', 'extension-columns', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'dax-functions', note: 'SUMMARIZE (group only) vs SUMMARIZECOLUMNS (group + extend)' }
  },

  // ── Audit surfaces ───────────────────────────────────────────────────────

  {
    id: 'fc-disc-021',
    deck: 'exam-traps',
    front: 'Fabric Activity Log vs M365 Unified Audit Log — which surface captures dataset refresh failures from an automated pipeline triggered externally?',
    back: 'M365 Unified Audit Log (Microsoft Purview). The Fabric Activity Log records user-driven interactions in the Power BI / Fabric portal (view report, edit dataset, etc.) and is accessible via the Admin API. The M365 Unified Audit Log captures both user and service-principal events including pipeline-triggered refresh operations that are initiated programmatically. Pick the M365 Unified Audit Log for compliance and pipeline-triggered event forensics; pick the Fabric Activity Log for portal-driven user-behavior analysis.',
    tags: ['audit-logs', 'activity-log', 'unified-audit-log', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'audit-logs', note: 'Activity Log (portal UI events) vs UAL (all events including pipelines)' }
  },

  // ── Capacity throttling discriminators ───────────────────────────────────

  {
    id: 'fc-disc-022',
    deck: 'exam-traps',
    front: 'Capacity throttling: interactive delay vs interactive reject vs background reject — what CU debt level triggers each stage?',
    back: 'Interactive delay begins when carryforward CU debt exceeds 10 minutes of capacity. Interactive reject begins when debt exceeds 60 minutes. Background reject begins when debt exceeds 24 hours. The stages are additive — background reject does NOT begin before interactive reject. Pick interactive delay as the first warning sign; at interactive reject the end user experience breaks; at background reject scheduled refreshes and pipelines also fail.',
    tags: ['capacity', 'throttling', 'cu-debt', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'fabric-capacity', note: 'CU debt thresholds: 10m / 60m / 24h throttle stages' }
  },

  // ── Deployment pipelines detail ──────────────────────────────────────────

  {
    id: 'fc-disc-023',
    deck: 'exam-traps',
    front: 'Selective deploy vs Full pipeline deploy — which allows promoting a single semantic model without overwriting the reports in the target stage?',
    back: 'Selective deploy. You can tick specific items (e.g., only the semantic model) in the deployment UI and promote just those items to the target stage — reports remain unchanged. A full (all items) deploy pushes everything from the source stage, potentially overwriting reports, dashboards, and dataflows already in the target. Pick selective deploy when you want surgical, item-level promotion; pick full deploy only when the entire stage should be replaced.',
    tags: ['deployment-pipelines', 'selective-deploy', 'full-deploy', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'deployment-pipelines', note: 'Selective vs full deploy: item granularity' }
  },

  // ── Variable Library vs Parameter Rule ───────────────────────────────────

  {
    id: 'fc-disc-024',
    deck: 'exam-traps',
    front: 'Variable Library vs Deployment Parameter Rule — which one allows multiple items in different workspaces to read the same connection-string value without repeating it?',
    back: 'Variable Library. A Variable Library stores shared name-value pairs (connection strings, server names) that any item in the same workspace or linked workspace can reference — a single update propagates everywhere. Deployment Parameter Rules are deployment-pipeline-scoped rules that override parameter values only at promotion time for specific items — they are not a live shared-value store. Pick Variable Library for centralized, multi-item shared configuration; pick Parameter Rules for stage-specific promotion overrides.',
    tags: ['deployment-pipelines', 'variable-library', 'parameter-rules', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'deployment-pipelines', note: 'Variable Library (live shared store) vs Parameter Rule (deploy-time override)' }
  },

  // ── Fabric Domains vs Workspaces ─────────────────────────────────────────

  {
    id: 'fc-disc-025',
    deck: 'exam-traps',
    front: 'Fabric Domain vs Workspace — which is the correct boundary for grouping all analytics assets owned by the Sales business unit across multiple teams?',
    back: 'Fabric Domain. A Domain is an administrative grouping of MULTIPLE workspaces that share a common business owner (e.g., Sales, Finance, HR). It allows central domain admins to govern data for that business unit across all its workspaces. A Workspace is a single collaboration unit — it does not span teams or apply policies across other workspaces. Pick Domain for cross-workspace business-unit governance; pick Workspace for a single team\'s collaboration boundary.',
    tags: ['fabric-domain', 'workspace', 'governance', 'discriminator'],
    difficulty: 2,
    sourceAnchor: { category: 'fabric-governance', note: 'Domain (multi-workspace grouping) vs Workspace (single team)' }
  },

  // ── Sensitivity label vs Tag ──────────────────────────────────────────────

  {
    id: 'fc-disc-026',
    deck: 'exam-traps',
    front: 'Sensitivity label vs Fabric endorsement (Promoted / Certified tag) — which one enforces data protection such as encryption on export?',
    back: 'Sensitivity label. Labels are Microsoft Purview Information Protection constructs that can enforce encryption, watermarking, and access restrictions when data is exported to Office files or other formats. Fabric endorsement tags (Promoted, Certified) are organizational quality indicators — they signal trustworthiness and discovery priority but provide NO data-access restrictions or encryption. Pick sensitivity labels for compliance and data-protection enforcement; pick endorsement tags for discoverability and curation signals.',
    tags: ['sensitivity-labels', 'endorsement', 'certified', 'promoted', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'sensitivity-labels', note: 'Label (enforcement) vs endorsement tag (quality signal)' }
  },

  // ── OneLake shortcut vs ADLS Gen2 mount ──────────────────────────────────

  {
    id: 'fc-disc-027',
    deck: 'exam-traps',
    front: 'OneLake Shortcut to ADLS Gen2 vs mounting ADLS Gen2 directly in a Spark notebook — which makes the data first-class in the Lakehouse explorer and accessible via SQL endpoint?',
    back: 'OneLake Shortcut. When you create a shortcut from a Lakehouse to ADLS Gen2, the external data appears as a folder in the Lakehouse Files/Tables section and can be queried via the Lakehouse SQL endpoint or exposed to Direct Lake — it is treated as a Fabric-native item. A direct ADLS Gen2 mount in a Spark notebook (`mssparkutils.fs.mount`) makes the data accessible inside that notebook session only — it does NOT appear in the Lakehouse explorer or SQL endpoint. Pick Shortcuts for Fabric-native integration; pick direct mounts for notebook-scoped, session-local access.',
    tags: ['onelake', 'shortcuts', 'adls-gen2', 'spark', 'discriminator'],
    difficulty: 4,
    sourceAnchor: { category: 'onelake-shortcuts', note: 'Shortcut (Fabric-native, SQL endpoint) vs direct ADLS mount (notebook session only)' }
  },

  // ── DAX hierarchy functions ───────────────────────────────────────────────

  {
    id: 'fc-disc-028',
    deck: 'exam-traps',
    front: 'PATH vs PATHITEM vs PATHCONTAINS — which DAX function tests whether a specific value exists anywhere in a delimited hierarchy path?',
    back: 'PATHCONTAINS. It returns TRUE/FALSE given a path string and a search value — ideal for RLS filters like `PATHCONTAINS([ManagerPath], USERPRINCIPALNAME())`. PATH builds the delimited path string from a self-referencing table. PATHITEM extracts the Nth item from an existing path string. Pick PATHCONTAINS when you need a boolean membership test on a path; pick PATH to build the path column; pick PATHITEM to extract a specific level.',
    tags: ['dax', 'path', 'pathitem', 'pathcontains', 'hierarchy', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-functions', note: 'PATH (build) vs PATHITEM (extract) vs PATHCONTAINS (test)' }
  },

  // ── USERPRINCIPALNAME vs USERNAME ─────────────────────────────────────────

  {
    id: 'fc-disc-029',
    deck: 'exam-traps',
    front: 'USERPRINCIPALNAME() vs USERNAME() — which function is required for RLS in Fabric and Power BI Service (not on-premises)?',
    back: 'USERPRINCIPALNAME() is the canonical choice for cloud RLS. It returns the Microsoft Entra ID user principal name (user@domain.com) that matches the identity stored in Entra. USERNAME() historically returned DOMAIN\\user for on-premises Analysis Services; in Power BI Service it also returns the UPN string — but it is not guaranteed to return the Entra UPN format in all scenarios and is not the canonical recommendation. Pick USERPRINCIPALNAME() for all cloud (Fabric / Power BI Service) RLS rules to avoid edge-case mismatches.',
    tags: ['dax', 'userprincipalname', 'username', 'rls', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'row-level-security', note: 'USERPRINCIPALNAME() preferred over USERNAME() in cloud RLS' }
  },

  // ── OneLake and governance ────────────────────────────────────────────────

  {
    id: 'fc-disc-030',
    deck: 'exam-traps',
    front: 'Fabric Domain admin vs Workspace admin — who can assign a workspace to a domain, and who can prevent that assignment?',
    back: 'Domain admin can assign workspaces to their domain. A Tenant admin can also configure a setting that allows ONLY domain admins (not workspace admins) to assign workspaces — effectively locking down domain membership. Workspace admins cannot assign their own workspace to a domain unless the tenant or domain admin permits it. Pick Domain admin when you need to onboard a workspace into a governed business-unit domain; the Tenant admin controls whether workspace admins can self-assign.',
    tags: ['fabric-domain', 'workspace-admin', 'tenant-admin', 'governance', 'discriminator'],
    difficulty: 3,
    sourceAnchor: { category: 'fabric-governance', note: 'Domain admin vs Workspace admin: domain assignment authority' }
  }

];
