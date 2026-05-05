// Reference content. Real, dense, exam-relevant. No placeholders.
// Each section has a slug for deep-linking and a free-form body.

export interface RefTable {
  headers: string[];
  rows: string[][];
}

export interface RefSection {
  slug: string;
  title: string;
  category: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: RefTable;
  code?: { lang: string; body: string };
  warning?: string;
}

export const refSections: RefSection[] = [
  {
    slug: 'direct-lake-mechanics',
    title: 'Direct Lake — mechanics',
    category: 'Storage & Direct Lake',
    paragraphs: [
      'Direct Lake reads Delta-Parquet files directly from OneLake into the VertiPaq engine on demand — no scheduled refresh, no T-SQL pass-through. The model "frames" against the latest committed Delta version when it loads columns, then keeps that view of the data until the next framing event.'
    ],
    bullets: [
      'Framing happens automatically when the underlying Lakehouse / Warehouse SQL endpoint is updated — the model picks up the new Delta version on the next query.',
      'Manual reframe: "Refresh" on the semantic model triggers full reframe to the latest Delta version (does NOT re-import data; it re-binds column metadata).',
      'Hot vs cold columns: only columns actually used by visuals are paged into VertiPaq memory; cold columns sit in OneLake until needed.',
      'Eviction: if memory pressure hits the capacity SKU limit, columns are evicted in LRU order. Next query repages them.',
      'Fallback: when Direct Lake cannot serve a query (e.g. unsupported feature, capacity SKU mismatch, Delta features incompatible with V-Order), the model falls back to DirectQuery against the SQL endpoint.',
      'DirectLakeOnly mode forbids fallback — the query fails outright instead of degrading silently. Use this when you need to guarantee Direct Lake performance characteristics for SLAs.',
      'Direct Lake REQUIRES tables stored as Delta with V-Order enabled, in a Lakehouse or Warehouse, on Fabric capacity (F SKU), with semantic model in the same workspace as the data.'
    ],
    warning: 'Direct Lake on a non-V-Order Delta table will silently fall back to DirectQuery for those tables — usually catastrophic for performance. Inspect with Tabular Editor or DAX Studio.'
  },
  {
    slug: 'storage-modes',
    title: 'Storage modes — when to use each',
    category: 'Storage & Direct Lake',
    table: {
      headers: ['Mode', 'Latency', 'Freshness', 'Memory', 'Best for'],
      rows: [
        ['Import', 'Fastest', 'Refresh-bound', 'Full data in RAM', 'Stable, BI-shaped data with scheduled refresh windows'],
        ['DirectQuery', 'Slow', 'Real-time', 'Metadata only', 'Very large datasets where you cannot afford import RAM, or freshness > seconds'],
        ['Direct Lake', 'Near-Import', 'Near-real-time (frame on commit)', 'On-demand columns', 'Fabric-native; replaces both Import and DQ for most Lakehouse/Warehouse-backed models'],
        ['Composite', 'Mixed', 'Mixed', 'Hybrid', 'Star with large fact in DQ + small dims in Import; also Direct Lake + Import for slowly-changing reference tables']
      ]
    }
  },
  {
    slug: 'deployment-pipelines',
    title: 'Deployment pipelines — promotion rules',
    category: 'Deployment & lifecycle',
    paragraphs: [
      'Three stages: Development → Test → Production. Each stage is a workspace; the pipeline is a metadata layer that compares and promotes content between them.'
    ],
    bullets: [
      'Permissions to deploy: Member or above on source AND Contributor (or higher) on target.',
      'Permissions to view pipeline: Build permission on the workspaces involved.',
      'Deployment rules (data source rules, parameter rules) live on the TARGET stage and override the source artifact at deploy time. A common pattern is dev points at dev SQL DB, prod rule swaps it to prod SQL DB.',
      'Selective deployment: choose individual items to deploy. Useful for hotfixes — but be aware unselected items remain on the prior version, which can break dependencies.',
      'Backwards deployment (prod→test, test→dev) IS allowed; use carefully when reproducing prod incidents.',
      'Items NOT supported: dataflow Gen1 in pipelines (use Gen2), and certain real-time items.'
    ],
    table: {
      headers: ['Operation', 'Min role required'],
      rows: [
        ['View pipeline', 'Build permission on stages'],
        ['Initiate deployment', 'Member on source + Contributor on target'],
        ['Configure deployment rules', 'Admin or Member on the target stage'],
        ['Manage pipeline (add stages, etc.)', 'Pipeline admin']
      ]
    }
  },
  {
    slug: 'workspace-roles',
    title: 'Workspace roles & semantic model security',
    category: 'Security & governance',
    table: {
      headers: ['Role', 'Read', 'Edit content', 'Manage members', 'Notes'],
      rows: [
        ['Viewer', '✓', '✗', '✗', 'Read-only; can use SQL endpoint for Warehouse'],
        ['Contributor', '✓', 'create / edit own', '✗', 'Cannot publish apps or grant access'],
        ['Member', '✓', '✓', 'add Contributors/Viewers', 'Can publish apps, share content'],
        ['Admin', '✓', '✓', 'all roles', 'Full workspace control']
      ]
    },
    bullets: [
      'RLS filters ROWS at query time using DAX filter expressions on the user identity (USERPRINCIPALNAME() preferred).',
      'OLS hides TABLES or COLUMNS from designated roles — the user cannot even see the object exists.',
      'Sensitivity labels (from Microsoft Purview/MIP) classify content for compliance; they do NOT enforce row/column filtering by themselves.',
      'Build permission on the underlying semantic model is required for users to create their own reports against it (separate from workspace role).'
    ]
  },
  {
    slug: 'dax-traps',
    title: 'DAX trap patterns — read these twice',
    category: 'DAX',
    bullets: [
      'CALCULATE applies filters BEFORE evaluating the expression; filter context replaces, not adds, on the same column unless you use KEEPFILTERS.',
      'Context transition: a row context becomes a filter context inside CALCULATE (or an iterator with measure references). This is how SUMX(t, [Measure]) works — the row becomes a filter on each iteration.',
      'ALL vs ALLSELECTED: ALL removes ALL filters; ALLSELECTED preserves filters that came from outside the visual (slicers, page filters) but removes those inside the visual.',
      'WINDOW / INDEX / OFFSET (calculation-context functions, 2022+): operate on the visual\'s axis, not on physical rows in the table — they need an ORDERBY and a PARTITIONBY.',
      'Implicit measures auto-generated for columns are slow and lock the user out of best practices — convert to explicit measures.',
      'CALCULATETABLE rebuilds the table in a new filter context; useful when SUMMARIZECOLUMNS is too rigid.',
      'AVERAGE on a column with blanks: blanks are excluded from numerator AND denominator. Use IFERROR or COALESCE if you need them treated as 0.',
      'DATESYTD requires a marked date table; without one, time-intel functions silently return blank.',
      'USERELATIONSHIP only swaps an INACTIVE relationship for the duration of CALCULATE; it does not change model state.'
    ]
  },
  {
    slug: 'kql-cheatsheet',
    title: 'KQL operator cheat sheet',
    category: 'KQL',
    table: {
      headers: ['Operator', 'Purpose', 'Example'],
      rows: [
        ['where', 'Filter rows', 'T | where Status == "Open"'],
        ['project', 'Pick / rename columns', 'T | project Id, NewName=OldName'],
        ['extend', 'Add computed column', 'T | extend Bucket = bin(Ts, 1h)'],
        ['summarize ... by', 'Aggregate', 'T | summarize count() by State'],
        ['join', 'Default is innerunique; use kind=', 'T | join kind=leftouter U on Id'],
        ['lookup', 'Optimized join against small dim', 'T | lookup Dim on Id'],
        ['mv-expand', 'Explode dynamic array', 'T | mv-expand Tag=Tags'],
        ['parse', 'Pattern-extract from string', 'T | parse Msg with "user " User " action " Act'],
        ['materialize', 'Cache subquery for reuse', 'let m = materialize(...);'],
        ['take / top', 'Limit; top adds order', 'T | top 10 by Score desc'],
        ['render', 'Inline visualization', 'T | render timechart'],
        ['ago()', 'Relative time helper', 'where Ts > ago(7d)'],
        ['bin()', 'Bucket continuous values', 'summarize count() by bin(Ts, 1h)']
      ]
    },
    bullets: [
      'KQL is case-sensitive for column names but case-insensitive for operators.',
      'Default join is innerunique — easy to surprise yourself; specify kind explicitly.',
      'lookup is faster than join when the right side is small; both reorder is allowed.'
    ]
  },
  {
    slug: 'fabric-architecture',
    title: 'Fabric items quick reference',
    category: 'Architecture',
    table: {
      headers: ['Item', 'Primary engine', 'Best language', 'When to pick'],
      rows: [
        ['Lakehouse', 'Spark + SQL endpoint', 'PySpark / SQL', 'Open-format Delta, code-first transformations'],
        ['Warehouse', 'Polaris (T-SQL)', 'T-SQL', 'BI-shaped warehouse, ACID multi-table transactions'],
        ['Eventhouse', 'Kusto (KQL)', 'KQL', 'Streaming ingestion, time-series analytics'],
        ['Notebook', 'Spark / Python', 'PySpark / SQL / Scala', 'Code-first authoring, ML pipelines'],
        ['Dataflow Gen2', 'Power Query (M)', 'M', 'Low-code ELT, Fabric+PowerBI ingestion'],
        ['Pipeline', 'Data Factory orchestrator', 'JSON-as-config', 'Orchestrating notebooks/dataflows on a schedule'],
        ['Semantic model', 'VertiPaq + Polaris', 'DAX', 'Analytical model for reports'],
        ['Report (Power BI)', 'Visual layer', '—', 'End-user reports'],
        ['Real-Time Dashboard', 'KQL', 'KQL', 'Live operational dashboards'],
        ['Reflex (Activator)', 'Trigger engine', '—', 'Trigger actions on data conditions'],
        ['ML Model / Experiment', 'MLflow', 'Python', 'Model tracking + deployment']
      ]
    }
  },
  {
    slug: 'onelake-shortcuts',
    title: 'OneLake shortcuts vs ingest vs mirroring',
    category: 'Data ingestion',
    bullets: [
      'Shortcut: a virtual reference to data in another OneLake workspace, ADLS Gen2, or S3. Zero copy, governed by source ACLs. Best when you need to query data without moving it.',
      'Ingest (copy): physical copy via pipeline / dataflow / notebook. Best when you need transformation or independence from source uptime.',
      'Mirroring: continuous one-way replication from a source database (e.g. Azure SQL DB, Cosmos DB, Snowflake) into a Fabric Mirrored Database. Free (compute), Delta-format, near real-time. Best when you want a SQL-shaped fabric copy without an ETL job.'
    ],
    warning: 'Shortcut + RLS: shortcut respects source-side permissions only. If the source allows everyone to read but you want Fabric-side RLS, you must enforce RLS in the consuming semantic model — shortcuts do not propagate row filters.'
  },
  {
    slug: 'top-15-traps',
    title: 'Top 15 exam traps',
    category: 'Exam strategy',
    bullets: [
      '1. "Sensitivity labels" do NOT filter rows or columns. They are classification metadata only — easy mis-pick under time pressure.',
      '2. RLS filters rows; OLS hides objects entirely. Pick OLS when the question says "users must not even see the column exists".',
      '3. Direct Lake fallback to DirectQuery is silent unless DirectLakeOnly is set. Inspect a model that "feels slow" for fallback — V-Order missing is the usual culprit.',
      '4. Deployment-rule values live on the TARGET stage, not on the artifact. Editing the artifact does not change them.',
      '5. .pbix is binary; .pbip is source-control friendly. Pick .pbip for "team collaboration with Git".',
      '6. Dataflow Gen1 is NOT supported in deployment pipelines. Gen2 is.',
      '7. Workspace Viewer can use the Warehouse SQL endpoint read-only. Do not over-pick Contributor for a "read-only SQL access" requirement.',
      '8. USERNAME() returns DOMAIN\\user; USERPRINCIPALNAME() returns the UPN — preferred for cloud RLS.',
      '9. Composite models with Direct Lake + Import are allowed; Direct Lake + DirectQuery requires careful capacity tuning.',
      '10. Calculation groups are unique to a model; only ONE precedence value applies per filter context.',
      '11. Field parameters are presentation-layer DAX magic — they do NOT change relationships, just substitute the field referenced by visuals.',
      '12. Eventhouse is the KQL-native item. Lakehouse SQL endpoint cannot run KQL.',
      '13. T-SQL in Fabric Warehouse: limited DDL during preview vs full T-SQL; verify what is supported (e.g., MERGE, IDENTITY, sequences).',
      '14. Pipeline backwards-deploy is allowed (prod→test). Useful but read carefully — easy to mis-pick "you cannot deploy backwards".',
      '15. SemanticLink (sempy) and the XMLA endpoint are different surfaces. XMLA = Tabular protocol for management; sempy = Python notebook integration for reading model data.'
    ]
  },
  {
    slug: 'direct-lake-onelake',
    title: 'Direct Lake — OneLake & V-Order',
    category: 'Storage & Direct Lake',
    paragraphs: [
      'OneLake is the tenant-wide Delta-Parquet data lake every Fabric workload reads from. Direct Lake reads V-Ordered Parquet column segments directly from OneLake into VertiPaq, bypassing the Lakehouse / Warehouse SQL endpoint for data reads while still using the SQL endpoint for framing metadata.',
      'V-Order is a write-time sort + dictionary-encoding pass that aligns Parquet row groups with VertiPaq segments, making transcoding cheap. Lakehouse, Warehouse, and Mirrored Database all write V-Ordered Delta by default.'
    ],
    bullets: [
      'OneLake is the source of truth — eviction reclaims VertiPaq RAM but never deletes from OneLake.',
      'V-Order is required for Direct Lake; non-V-Ordered Delta tables silently fall back to DirectQuery.',
      'Third-party writers may produce non-V-Order Delta. Remediate with `OPTIMIZE … VORDER = TRUE` in a Fabric notebook.',
      'KQL Databases use the Kusto engine (not Delta-Parquet) and are NOT Direct-Lake-capable.',
      'Shortcuts let a Lakehouse expose data living elsewhere in OneLake without copying — same Delta-Parquet rules apply.',
      'Framing relies on the SQL endpoint metadata sync — schema changes require both an endpoint sync AND a model reframe before they appear.'
    ],
    table: {
      headers: ['Source', 'Direct-Lake-capable?', 'Notes'],
      rows: [
        ['Lakehouse Delta', 'Yes', 'V-Order on by default for Spark/Dataflow writes'],
        ['Warehouse', 'Yes', 'CTAS / INSERT writes V-Order Delta'],
        ['Mirrored Database', 'Yes', 'Replicated rows land V-Order in OneLake'],
        ['KQL Database / Eventhouse', 'No', 'Kusto engine — use DirectQuery instead'],
        ['External SQL DB (un-mirrored)', 'No', 'Mirror it first to get a Direct-Lake-ready copy'],
        ['OneLake shortcut to Lakehouse table', 'Yes', 'Honors the underlying Delta + V-Order rules']
      ]
    },
    warning: 'A non-V-Order Delta table is Direct-Lake-incompatible — queries silently fall back to DirectQuery. Verify with DAX Studio Server Timings; remediate with `OPTIMIZE` + V-Order or by fixing the upstream writer.'
  },
  {
    slug: 'direct-lake-on-onelake-vs-sql',
    title: 'Direct Lake on OneLake vs Direct Lake on SQL',
    category: 'Storage & Direct Lake',
    paragraphs: [
      'Microsoft splits Direct Lake into two TABLE storage modes. The split changes fallback behavior, composite-model support, deployment-pipeline rules, and security flow — exam-relevant traps cluster here.',
      '**Direct Lake on OneLake** reads Delta tables directly from OneLake and never falls back to DirectQuery. **Direct Lake on SQL** routes through the SQL analytics endpoint and falls back when it cannot serve a query (SQL view, RLS, granular access). Fallback is governed by the semantic-model property `Direct Lake behavior` (values: `Automatic` / `DirectLakeOnly` / `DirectQueryOnly`).'
    ],
    bullets: [
      'Falls back? On OneLake: never. On SQL: yes (controllable via Direct Lake behavior property).',
      'Composite models (Direct Lake + Import + DirectQuery)? On OneLake: supported. On SQL: NOT supported — only calc groups, what-if, field params allowed.',
      'Deployment pipeline rule to rebind data source? On OneLake: not supported directly (workaround: parameterize the connection string). On SQL: supported.',
      'Multiple tables from the same source table? Neither supports this in Power BI Desktop / web modeling — XMLA-only via external tools, and edits/refresh fail with multiple.',
      'SQL endpoint RLS? On OneLake: SQL RLS is NOT applied (file-level OneLake permissions instead). On SQL: queries fall back to DirectQuery to enforce RLS, unless fallback is disabled (then queries fail).',
      'Sources? On OneLake: any Fabric data source backed by Delta. On SQL: only lakehouse or warehouse tables/views.'
    ],
    table: {
      headers: ['Capability', 'Direct Lake on OneLake', 'Direct Lake on SQL'],
      rows: [
        ['Falls back to DirectQuery', 'No', 'Yes (governed by Direct Lake behavior property)'],
        ['Composite models', 'Yes', 'No (with narrow exceptions)'],
        ['Deployment pipeline rebind rule', 'No (use parameter expression)', 'Yes'],
        ['SQL RLS applied', 'No (file-level only)', 'Yes (forces DQ fallback)'],
        ['SQL OLS / column security', 'No', 'Yes (errors when permission denied)'],
        ['Connect to SQL views', 'No (use materialized lakehouse view)', 'Yes (forces DQ fallback)'],
        ['Calculated tables referencing DL columns', 'Limited', 'Not supported'],
        ['SSO', 'Yes', 'Yes']
      ]
    },
    warning: 'When picking the table storage mode for a regulated/SLA workload: Direct Lake on OneLake guarantees no fallback (perf is predictable), but you lose composite-model + SQL-RLS support. Direct Lake on SQL preserves SQL semantics but you must set Direct Lake behavior = DirectLakeOnly to forbid fallback.'
  },
  {
    slug: 'kql-join-kinds',
    title: 'KQL join kinds — the full matrix',
    category: 'KQL',
    paragraphs: [
      'The default `join` kind is `innerunique` — KQL silently de-duplicates the LEFT table on the join keys before inner-joining. This is the single most common KQL surprise. Always specify `kind=` explicitly.'
    ],
    table: {
      headers: ['kind=', 'Semantics', 'Left dedup?', 'Right dedup?', 'Use when'],
      rows: [
        ['innerunique (default)', 'Inner join after de-duplicating the LEFT side on the join keys', 'YES', 'no', 'Rare — usually you want kind=inner'],
        ['inner', 'SQL-style inner join — keep only matched rows from BOTH sides, no dedup', 'no', 'no', 'You want SQL-style inner semantics'],
        ['leftouter', 'Keep ALL left rows; null right columns when no match', 'no', 'no', 'Anti-join (with isnull on right cols), or "show all left enriched"'],
        ['rightouter', 'Keep ALL right rows; null left columns when no match', 'no', 'no', 'Inverse of leftouter — but watch broadcast direction'],
        ['fullouter', 'Keep ALL rows from BOTH sides; null on whichever side missed', 'no', 'no', 'Symmetric difference (with isnull filters), reconciliation']
      ]
    },
    code: {
      lang: 'kql',
      body:
        '// Anti-join: users with NO logins in the last 24h\n' +
        'Users\n' +
        '| join kind=leftouter (\n' +
        '    LoginEvents | where Ts > ago(1d)\n' +
        '  ) on UserId\n' +
        '| where isnull(Ts)\n\n' +
        '// Symmetric difference: users on EXACTLY one side\n' +
        'UsersA\n' +
        '| join kind=fullouter UsersB on UserId\n' +
        '| where isnull(UserId) or isnull(UserId1)'
    },
    warning: 'There is no `kind=cross` in KQL. Cartesian-style effects are achieved via `mv-expand` or by joining on a constant — not via a cross kind.'
  },
  {
    slug: 'kql-mv-expand-parse-materialize',
    title: 'KQL — mv-expand, parse, materialize examples',
    category: 'KQL',
    paragraphs: [
      'Three operators every KQL author should be fluent in: `mv-expand` for unnesting dynamic arrays, `parse` for pattern-extracting columns from free-form strings, and `materialize` for compute-once / reuse-many.'
    ],
    code: {
      lang: 'kql',
      body:
        '// mv-expand — explode a dynamic array column into one row per element\n' +
        'Events                                   // Tags is dynamic e.g. ["error","retry","auth"]\n' +
        '| mv-expand Tag = Tags                   // 1 row per (event, tag)\n' +
        '| summarize count() by tostring(Tag)\n\n' +
        '// parse — pull typed fields out of a free-form string\n' +
        'Logs                                     // Message: "2026-05-01 ERR user=alice code=503"\n' +
        '| parse Message with * "user=" User " code=" Code:int\n' +
        '| where Code >= 500\n' +
        '| summarize Failures = count() by User\n\n' +
        '// materialize — compute heavy aggregation once, reuse across joins\n' +
        'let recent = materialize(\n' +
        '    SignInEvents\n' +
        '    | where Ts > ago(7d)\n' +
        '    | summarize Attempts = count(), Failures = countif(Result == "Failure") by UserId\n' +
        ');\n' +
        'recent\n' +
        '| lookup (UserDirectory | project UserId, Department) on UserId\n' +
        '| where Failures > 100\n' +
        '| summarize TotalFailures = sum(Failures) by Department'
    },
    bullets: [
      'mv-expand is the canonical "array → rows" operator. Use `tostring(...)` after expanding if downstream operators need a string.',
      'parse uses literal anchor strings and wildcards (`*`) plus optional type annotations (`:int`, `:datetime`).',
      'materialize is in-query and ephemeral — the cache lives only for the duration of the single query.',
      'Materialize is most valuable when a heavy subquery is referenced 2+ times. Single-reference materialize is wasted overhead.'
    ]
  },
  {
    slug: 'dax-trap-snippets',
    title: 'DAX trap patterns — bad → fix',
    category: 'DAX',
    paragraphs: [
      'Five concrete patterns that show the bad shape and the fix. Memorize these — they appear in many DAX-perf and context-transition exam questions.'
    ],
    code: {
      lang: 'dax',
      body:
        '// 1. Context-transition surprise — SUMX over dim with measure ref\n' +
        '// BAD:\n' +
        '[AvgPerCustomer] = SUMX( Customer, [Sales] )\n' +
        '// Each Customer row context becomes a filter context, [Sales] re-evaluates per customer.\n' +
        '// FIX:\n' +
        '[AvgPerCustomer] = AVERAGEX( VALUES(Customer[CustomerKey]), [Sales] )\n\n' +
        '// 2. FILTER-as-row-iterator vs predicate pushdown\n' +
        '// BAD: row-by-row evaluation in formula engine\n' +
        '[BigSales] = CALCULATE( [Total], FILTER( Sales, Sales[Qty] > 10 ) )\n' +
        '// FIX: pushed into VertiPaq as column predicate\n' +
        '[BigSales] = CALCULATE( [Total], KEEPFILTERS( Sales[Qty] > 10 ) )\n\n' +
        '// 3. Accidental override of slicer\n' +
        '// BAD: slicer Color=Blue is silently overridden\n' +
        '[X_Red] = CALCULATE( [X], Product[Color] = "Red" )\n' +
        '// FIX: KEEPFILTERS intersects with slicer\n' +
        '[X_Red] = CALCULATE( [X], KEEPFILTERS( Product[Color] = "Red" ) )\n\n' +
        '// 4. ALL over-clears — wipes other Product filters too\n' +
        '// BAD:\n' +
        '[X_Elec] = CALCULATE( [X], FILTER( ALL(Product), Product[Category] = "Electronics" ) )\n' +
        '// FIX: clear only the Category column\n' +
        '[X_Elec] = CALCULATE( [X], FILTER( ALL(Product[Category]), Product[Category] = "Electronics" ) )\n\n' +
        '// 5. Time-intel without Marked-as-Date table — silently wrong at year boundaries\n' +
        '// BAD: Date dim not marked\n' +
        '[YTD] = TOTALYTD( [Sales], Date[Date] )\n' +
        '// FIX: Modeling → Mark as date table on the Date dim. Then the SAME DAX is correct.\n'
    },
    warning: 'Patterns 1, 3, and 5 are SILENT failures — wrong but no error. Performance Analyzer + DAX Studio are the way to catch them.'
  },
  {
    slug: 'security-decision-matrix',
    title: 'Security decision matrix — pick the right tool',
    category: 'Maintain solution',
    paragraphs: [
      'Most DP-600 security questions reduce to a single decision: WHAT are you trying to hide / protect / log, and which mechanism IS the answer? The matrix below is the single highest-ROI reference card on this material.'
    ],
    table: {
      headers: ['Goal', 'Mechanism', 'Layer', 'Common wrong tool'],
      rows: [
        ['Hide certain ROWS from a user', 'Semantic-model RLS roles', 'Model layer', 'Trying to use OLS (column-only)'],
        ['Hide certain COLUMNS / TABLES from a user', 'OLS', 'Model layer', 'Trying to use RLS (row-only)'],
        ['Hide BOTH rows and columns from same user', 'OLS + RLS combined', 'Model layer (both)', 'Single RLS expression "with column predicate" — does NOT actually hide column from field lists'],
        ['Encrypt exports to Excel/PDF', 'Purview sensitivity label with encryption protection', 'Tenant / data classification', 'Workspace-level export disable (broader than needed)'],
        ['Restrict who can view a report', 'App audience OR per-item Build/Read', 'Item / app layer', 'Adding the user as workspace Member (over-privileged)'],
        ['Audit every read tenant-wide', 'Microsoft Purview Activity Explorer', 'Tenant audit', 'Workspace activity log (per-workspace, misses cross-workspace flows)'],
        ['Force a user to see only THEIR managed reports', 'Dynamic RLS with PATHCONTAINS([Path], USERPRINCIPALNAME())', 'Model layer', '`SEARCH(...)>0` — substring false-matches on similar emails'],
        ['Block a user from a specific OneLake folder', 'OneLake folder-level ACL on the folder, denying the Entra group', 'Storage / OneLake', 'Workspace role downgrade (too coarse)'],
        ['Apply a uniform "Confidential" classification across reports', 'Workspace-level sensitivity label (propagates to items)', 'Tenant / Purview', 'Setting label on each item individually'],
        ['Combine model-level RLS with warehouse-level RLS', 'Both apply — filters AND together (most restrictive wins). Direct Lake on Warehouse falls back to DirectQuery to honor warehouse RLS.', 'Multi-layer', 'Assuming one supersedes the other']
      ]
    },
    warning: 'The single most common wrong answer on the exam: trying to use RLS to hide a column. RLS filters rows; it CANNOT hide columns from field lists. Use OLS for that.'
  },
  {
    slug: 'rls-multi-role-trap',
    title: 'RLS multi-role UNION trap (canonical exam question)',
    category: 'Maintain solution',
    paragraphs: [
      'The single most common RLS trap: when a user is in MULTIPLE roles, the role filters are UNIONed (OR), NOT intersected (AND). Each role contributes the rows it allows; the user sees the union of all of them.'
    ],
    bullets: [
      '**Multi-role behavior:** Filters are combined via UNION. A user in roles "Region_East" AND "Manager_View" sees ALL rows from East PLUS ALL rows their hierarchy includes — possibly the entire model.',
      '**If you NEED intersection:** Combine the predicates into a SINGLE role: `[Region] = "East" && PATHCONTAINS(...)` — one role, AND semantics.',
      '**Multi-role assignment is a privileged action.** Treat it as an explicit choice, not a side-effect of group membership.',
      '**There is NO explicit DENY in RLS.** You cannot "subtract" rows with a deny role. Restructure the model or roles instead.',
      '**Owner-identity bypass:** Model owner / Admin sees ALL rows in test mode. Always test with a non-owner identity. The owner-bypass is the #2 cause of "RLS is broken in prod" tickets.'
    ],
    warning: 'If a user reports "I see rows I should not see," check role membership FIRST. The fix is usually "remove from one of the roles" or "combine roles into a single AND-predicate role."'
  },
  {
    slug: 'maintain-operations-checklist',
    title: 'Maintenance & operations checklist',
    category: 'Maintain solution',
    paragraphs: [
      'Operational discipline for a Fabric workload comes down to four things: WHAT is happening (monitoring), HOW much it costs (capacity), WHY it broke (troubleshooting), and HOW to retire safely (lifecycle). The matrix below maps the typical signal to the right tool — wrong tool is the #1 reason teams misdiagnose Fabric issues.'
    ],
    table: {
      headers: ['Signal', 'First-stop tool', 'Confirms', 'Common wrong tool'],
      rows: [
        ['"Did the run succeed?"', 'Monitoring hub', 'Status / duration / submitter / item', 'Capacity Metrics (knows cost, not run status)'],
        ['"Why does it cost so much?"', 'Capacity Metrics app', 'CU% / per-item breakdown / throttling', 'Monitoring hub (no CU breakdown)'],
        ['"Refresh fails intermittently"', 'Monitoring hub → drill into failed runs', 'Error class buckets across runs', 'Restarting the gateway (destroys evidence)'],
        ['"Capacity went over 100% CU"', 'Capacity Metrics + smoothing math', 'Burst vs sustained vs throttling threshold', 'Capacity restart (drops every workload)'],
        ['"Memory error during refresh"', 'XMLA traces + Monitoring hub run details', 'Refresh memory ≈ 2× model size', 'SKU upgrade as first response'],
        ['"Slow report intermittently"', 'Performance Analyzer + DAX traces (find p99 visuals first)', 'Which visuals are slow, not whether everything is', 'Mode-switching to Import "to rule out"'],
        ['"Workspace deleted by mistake"', 'Fabric admin portal (within 7-day window)', 'Restorable by tenant admin', 'Re-creating from PBIP (loses run history + sessions)'],
        ['"Cross-run condition triggers alert"', 'Reflex (Activator) on Eventstream / KQL / model', 'Multi-run conditions, debounce, dedupe', 'Pipeline-level "Notify" (single-run only)']
      ]
    },
    warning: 'The single most common operational anti-pattern is "restart and pray" — restarting the gateway, capacity, or pipeline before capturing the failure evidence. The diagnostic state IS the answer; cancelling the run discards it.'
  },
  {
    slug: 'capacity-throttling-ladder',
    title: 'Capacity overage → throttling ladder',
    category: 'Maintain solution',
    paragraphs: [
      'When CU% exceeds 100%, Fabric does NOT immediately reject work. The escalation is graduated and predictable. Knowing the order means knowing how much headroom you have before users feel pain.'
    ],
    bullets: [
      '**Bursting** (within smoothing window, default 5 min) — overage is allowed; CU is "borrowed" against future smoothing.',
      '**Throttling** (smoothing window exhausted) — interactive operations are DELAYED, not rejected. Users see slowness.',
      '**Background rejection** — scheduled refreshes, dataflows, pipelines start failing.',
      '**Interactive rejection** — last stage; users get error toasts on report load.',
      'There is no auto-pause and no auto-upgrade. Recovery is manual: scale up SKU, kill heavy queries, or wait out the overage.',
      'Pause behavior: pausing the capacity ZEROES capacity billing; OneLake storage continues to bill independently.'
    ],
    warning: 'Default smoothing absorbs SHORT bursts (minutes), not 90-minute sustained 130% overages. Sustained overages WILL hit the throttling ladder.'
  },
  {
    slug: 'refresh-memory-rule',
    title: 'Refresh-time memory ≈ 2× model size',
    category: 'Maintain solution',
    paragraphs: [
      'A semantic-model refresh holds BOTH the old and new copy in memory simultaneously, until the swap is atomic. This means peak memory during refresh is roughly 2× steady-state model size. The exam-relevant arithmetic:'
    ],
    table: {
      headers: ['SKU', 'Steady model ceiling', 'Practical refresh ceiling (~½)', 'Concurrent-query headroom'],
      rows: [
        ['F2', '3 GB', '~1.5 GB', 'Tiny'],
        ['F8', '3 GB', '~1.5 GB', 'Tiny'],
        ['F32', '10 GB', '~5 GB', 'Small'],
        ['F64', '25 GB', '~12 GB', 'Moderate'],
        ['F128', '50 GB', '~25 GB', 'Large'],
        ['F256', '100 GB', '~50 GB', 'Very large']
      ]
    },
    warning: '"Memory: Allocation failure" on a 12-GB model on F64 is the canonical exam scenario — the model is well under the ceiling but refresh-time peaks (24 GB) plus concurrent-query memory push it over.'
  },
  {
    slug: 'last-hour-checklist',
    title: 'Last hour before the exam',
    category: 'Exam strategy',
    bullets: [
      'Skim Top 15 Exam Traps — they are the highest ROI re-read.',
      'Re-read Direct Lake mechanics + DirectLakeOnly distinction.',
      'Re-read deployment-rule permission matrix.',
      'Re-read RLS USERPRINCIPALNAME() pattern and OLS object-hiding distinction.',
      'Skim KQL cheat sheet — operator names recall is the #1 KQL pain point.',
      'DO NOT cram new content. The marginal new card is worth less than 10 minutes of relaxation before a 100-minute exam.',
      'Hydrate. Bathroom break. Set a stopwatch mentally to 100 minutes / 65 questions = ~92s/question.',
      'Strategy: first pass — answer everything you know in <60s; flag anything you don\'t. Second pass — flagged questions only.',
      'NEVER leave a question blank — a guess is +0 EV; a blank is -1.'
    ]
  }
];
