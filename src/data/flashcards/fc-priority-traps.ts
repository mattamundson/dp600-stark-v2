// Priority Trap Flashcards — high-frequency DP-600 exam discriminators.
//
// 30 cards, IDs fc-prt-001..fc-prt-030, deck:'exam-traps'.
// Front: concise trap-trigger question.
// Back: 2-4 sentence mechanism + one wrong-attractor warning.

import type { Flashcard } from '../../lib/schema';

export const priorityTraps: Flashcard[] = [

  // ── Direct Lake fallback ─────────────────────────────────────────────────

  {
    id: 'fc-prt-001',
    deck: 'exam-traps',
    front: 'In Direct Lake, what causes silent fallback to DirectQuery?',
    back: 'Any condition the Direct Lake engine cannot satisfy — including row-level security applied to a Delta table, a table exceeding the per-table framing threshold, or a V-Order absent on Parquet files. Fallback is silent by default and degrades performance; it does NOT surface an error to the user. Wrong attractor: "fallback only occurs when the OneLake path changes."',
    tags: ['direct-lake', 'fallback', 'directquery', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'direct-lake-fallback', note: 'Conditions that trigger DL → DQ fallback' }
  },

  {
    id: 'fc-prt-002',
    deck: 'exam-traps',
    front: 'Warehouse RLS and Direct Lake — what is the connection?',
    back: 'Applying RLS to a Fabric Warehouse table forces any Direct Lake semantic model reading that table to fall back to DirectQuery. Direct Lake cannot enforce Warehouse RLS at the columnar-read layer, so it escalates to DQ for that table. Wrong attractor: "Warehouse RLS has no effect on Direct Lake models."',
    tags: ['direct-lake', 'warehouse', 'rls', 'fallback', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'direct-lake-fallback', note: 'Warehouse RLS forces DL → DQ fallback' }
  },

  {
    id: 'fc-prt-003',
    deck: 'exam-traps',
    front: 'Direct Lake on OneLake bypasses SQL endpoint RLS — true or false?',
    back: 'True. Direct Lake reads Parquet/Delta files in OneLake directly, bypassing the SQL endpoint entirely. Any RLS defined at the SQL endpoint layer is invisible to Direct Lake. If row security is required, it must be defined in the semantic model itself. Wrong attractor: "SQL endpoint RLS is enforced uniformly for all query modes."',
    tags: ['direct-lake', 'onelake', 'sql-endpoint', 'rls', 'bypass', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'direct-lake-overview', note: 'DL bypasses SQL endpoint RLS' }
  },

  // ── RLS patterns ─────────────────────────────────────────────────────────

  {
    id: 'fc-prt-004',
    deck: 'exam-traps',
    front: 'LOOKUPVALUE in RLS — what happens when no matching row is found?',
    back: 'LOOKUPVALUE returns BLANK when no match exists. In an RLS filter `[UserEmail] = LOOKUPVALUE(Users[Email], Users[ID], USERPRINCIPALNAME())`, a BLANK result means the filter evaluates to FALSE for all rows — the user sees zero data (fail-closed). Wrong attractor: "LOOKUPVALUE returns ALL rows when no match is found."',
    tags: ['rls', 'lookupvalue', 'blank', 'fail-closed', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'row-level-security', note: 'LOOKUPVALUE BLANK = fail-closed in RLS' }
  },

  {
    id: 'fc-prt-005',
    deck: 'exam-traps',
    front: 'USERPRINCIPALNAME() vs USERNAME() in RLS — what is the difference?',
    back: 'USERPRINCIPALNAME() returns the email/UPN format (user@domain.com), matching Microsoft Entra ID identity. USERNAME() returns DOMAIN\\user format — which only applies in on-premises Analysis Services. In Fabric and Power BI Service, USERNAME() also returns the UPN string, but USERPRINCIPALNAME() is the canonical, unambiguous choice. Wrong attractor: "USERNAME() returns the display name from Entra ID."',
    tags: ['rls', 'userprincipalname', 'username', 'entra-id', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'row-level-security', note: 'UPN vs DOMAIN\\user distinction' }
  },

  {
    id: 'fc-prt-006',
    deck: 'exam-traps',
    front: 'Multi-role RLS — if a user is in two roles, what data do they see?',
    back: 'The UNION of both roles (OR semantics) — the user sees all rows permitted by either role. The rules do NOT intersect (AND). This is the most common RLS exam trap; adding a second role always broadens access, never restricts it. Wrong attractor: "Multiple roles apply the most restrictive filter (intersection)."',
    tags: ['rls', 'multi-role', 'union', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'row-level-security', note: 'Multi-role union semantics' }
  },

  {
    id: 'fc-prt-007',
    deck: 'exam-traps',
    front: '"View as role" in Power BI Desktop shows no data — but the model owner sees everything. Why?',
    back: 'The model owner (creator) bypasses RLS by design. "View as role" tests the rule logic but does NOT simulate what a non-owner, non-admin user experiences. To test accurately, use a second non-owner account in the Service or Power BI Embedded with a non-admin identity. Wrong attractor: "View as role always shows exactly what a real user would see."',
    tags: ['rls', 'view-as-role', 'owner-bypass', 'testing', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'row-level-security', note: 'Owner bypass in test mode' }
  },

  // ── Direct Lake performance ──────────────────────────────────────────────

  {
    id: 'fc-prt-008',
    deck: 'exam-traps',
    front: 'What is V-Order and why is it required for Direct Lake performance?',
    back: 'V-Order is a write-time Parquet optimization (sorting + compression) applied by Fabric Spark and Dataflow Gen2 pipelines. Direct Lake reads columns at near-in-memory speed only when the Parquet files are V-Order encoded. Files without V-Order require more I/O per read and reduce Direct Lake\'s performance advantage. Wrong attractor: "V-Order is optional because Direct Lake caches data in memory anyway."',
    tags: ['direct-lake', 'v-order', 'performance', 'parquet'],
    difficulty: 3,
    sourceAnchor: { category: 'direct-lake-overview', note: 'V-Order requirement for DL performance' }
  },

  {
    id: 'fc-prt-009',
    deck: 'exam-traps',
    front: 'Direct Lake framing — what are the three methods?',
    back: 'Manual framing (user-triggered in the semantic model editor), Scheduled framing (configured cadence, like a refresh schedule), and Programmatic framing (REST API or Fabric SDK call). Framing updates the model\'s table snapshots without a full data reload. Wrong attractor: "Framing happens automatically whenever a Delta table is written to."',
    tags: ['direct-lake', 'framing', 'scheduled', 'programmatic', 'manual'],
    difficulty: 3,
    sourceAnchor: { category: 'direct-lake-overview', note: 'Three framing methods in Direct Lake' }
  },

  // ── Deployment pipelines ─────────────────────────────────────────────────

  {
    id: 'fc-prt-010',
    deck: 'exam-traps',
    front: 'Can you add a stage to a deployment pipeline after it is created?',
    back: 'No. Stage count is fixed at pipeline creation time. To add a stage, you must create an entirely new pipeline and re-assign workspaces and rules. There is no "Add Stage" button or StageCount property. Wrong attractor: "You can add up to 10 stages at any time by editing pipeline settings."',
    tags: ['deployment-pipelines', 'stage-count', 'immutable', 'exam-trap'],
    difficulty: 2,
    sourceAnchor: { category: 'deployment-pipelines', note: 'Stage count is fixed at creation' }
  },

  {
    id: 'fc-prt-011',
    deck: 'exam-traps',
    front: 'Deployment rules bind by parameter NAME — why does this matter?',
    back: 'Deployment rules (Data Source Rules, Parameter Rules) match parameters by exact name, case-sensitive. If the parameter in Dev is named "ServerName" and the rule references "servername", the rule silently does not fire — the Dev value is promoted unchanged. Wrong attractor: "Parameter matching is case-insensitive like most Power BI settings."',
    tags: ['deployment-pipelines', 'deployment-rules', 'parameter-rules', 'case-sensitive', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'deployment-pipelines', note: 'Rule binding is case-sensitive on parameter name' }
  },

  {
    id: 'fc-prt-012',
    deck: 'exam-traps',
    front: 'Does RLS membership promote across deployment pipeline stages?',
    back: 'No. RLS role definitions (DAX filters) are promoted with the semantic model, but RLS role MEMBERSHIP (which users/groups are in a role) is NOT promoted. You must manually assign membership in each stage\'s workspace. Wrong attractor: "Deploying a semantic model carries its full security configuration including role membership."',
    tags: ['deployment-pipelines', 'rls', 'role-membership', 'non-promotion', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'deployment-pipelines', note: 'RLS membership not promoted across stages' }
  },

  {
    id: 'fc-prt-013',
    deck: 'exam-traps',
    front: 'Variable Libraries vs deployment rules — do they conflict?',
    back: 'No — they coexist. Variable Libraries store shared parameter values that can be consumed by multiple items across stages. Deployment rules override connection strings and parameters at promotion time. Both can be active simultaneously; rules take precedence at deploy time for the specific parameters they target. Wrong attractor: "Variable Libraries replace deployment rules for parameter management."',
    tags: ['deployment-pipelines', 'variable-libraries', 'deployment-rules', 'coexist'],
    difficulty: 4,
    sourceAnchor: { category: 'deployment-pipelines', note: 'Variable Libraries and deployment rules coexist' }
  },

  // ── DAX — iterator performance ───────────────────────────────────────────

  {
    id: 'fc-prt-014',
    deck: 'exam-traps',
    front: 'SUMX iterator vs SUM × constant — when does the choice matter for performance?',
    back: 'SUMX iterates row by row and materializes a virtual column; for large tables this is significantly slower than SUM(table[col]) × constant, which computes in a single storage engine pass. Use SUM × constant when the multiplier is fixed. Use SUMX only when the expression varies per row. Wrong attractor: "SUMX and SUM always produce identical engine plans for constant multipliers."',
    tags: ['dax', 'sumx', 'iterator', 'performance', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-performance', note: 'SUMX vs SUM × constant performance' }
  },

  // ── DAX — filter context ─────────────────────────────────────────────────

  {
    id: 'fc-prt-015',
    deck: 'exam-traps',
    front: 'CALCULATE — what does it do to the filter context?',
    back: 'CALCULATE transitions row context to filter context (enabling context transition for iterators) and then applies any additional filter arguments, which override existing filters on those columns. It is the only DAX function that modifies filter context. Wrong attractor: "CALCULATE adds to the existing filter context without replacing any existing filters."',
    tags: ['dax', 'calculate', 'filter-context', 'context-transition'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-functions', note: 'CALCULATE filter context override mechanics' }
  },

  {
    id: 'fc-prt-016',
    deck: 'exam-traps',
    front: 'ALL vs ALLSELECTED — what filter context does each preserve?',
    back: 'ALL removes all filters from the specified table or column, ignoring both slicer and visual filters. ALLSELECTED removes only filters from the current visual context while RETAINING outer query / slicer filters — it "sees" what a user selected on the page. Wrong attractor: "ALLSELECTED and ALL both ignore slicers."',
    tags: ['dax', 'all', 'allselected', 'outer-filter', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'dax-functions', note: 'ALL vs ALLSELECTED outer filter behavior' }
  },

  {
    id: 'fc-prt-017',
    deck: 'exam-traps',
    front: 'KEEPFILTERS inside CALCULATE — what does it do?',
    back: 'KEEPFILTERS prevents CALCULATE from overriding existing filters — instead it intersects (AND) the new filter with the existing filter context. Without KEEPFILTERS, CALCULATE replaces the existing filter on that column. Wrong attractor: "KEEPFILTERS makes CALCULATE ignore all existing filters."',
    tags: ['dax', 'keepfilters', 'calculate', 'intersection', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'dax-functions', note: 'KEEPFILTERS intersection semantics' }
  },

  // ── DAX — time intelligence ──────────────────────────────────────────────

  {
    id: 'fc-prt-018',
    deck: 'exam-traps',
    front: 'Time intelligence functions — what date table requirement must be met?',
    back: 'The date table must be marked as a Date Table in Power BI, must contain one row per day with no gaps, must cover the full range of dates in fact tables, and must have a date column of data type Date. Missing days or gaps silently break time-intelligence functions. Wrong attractor: "Any table with a date column works for time intelligence without special marking."',
    tags: ['dax', 'time-intelligence', 'date-table', 'mark-as-date-table'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-functions', note: 'Date table requirements for time intelligence' }
  },

  {
    id: 'fc-prt-019',
    deck: 'exam-traps',
    front: 'USERELATIONSHIP — where can it be used?',
    back: 'USERELATIONSHIP can only be used INSIDE a CALCULATE (or a function that implicitly creates a CALCULATE context, such as CALCULATETABLE). It activates an inactive relationship for the duration of that expression. Using it outside CALCULATE causes an error. Wrong attractor: "USERELATIONSHIP can be placed directly in a measure without CALCULATE."',
    tags: ['dax', 'userelationship', 'calculate', 'inactive-relationship', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'dax-functions', note: 'USERELATIONSHIP requires CALCULATE scope' }
  },

  // ── DAX — field parameters & calc groups ────────────────────────────────

  {
    id: 'fc-prt-020',
    deck: 'exam-traps',
    front: 'Field parameters — what is their structure and typical use?',
    back: 'A field parameter is a single-column, single-table parameter that lets report users dynamically switch which measure or column is displayed on a visual. It stores a list of field references and is added to visuals like any other field. Wrong attractor: "Field parameters store actual data values, not field references."',
    tags: ['dax', 'field-parameters', 'dynamic-measures', 'semantic-model'],
    difficulty: 3,
    sourceAnchor: { category: 'semantic-model-design', note: 'Field parameters for dynamic measure switching' }
  },

  {
    id: 'fc-prt-021',
    deck: 'exam-traps',
    front: 'Calculation groups — what function do you use inside a calculation item?',
    back: 'SELECTEDMEASURE() references whichever base measure is currently in the filter context when the calculation item is applied. It is the standard pattern for wrapping measures (e.g., YTD, prior period). SELECTEDMEASURENAME() returns the measure\'s name as a string. Wrong attractor: "You use a hard-coded measure reference inside a calculation item."',
    tags: ['dax', 'calculation-groups', 'selectedmeasure', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'semantic-model-design', note: 'SELECTEDMEASURE() in calculation items' }
  },

  // ── Semantic modeling ────────────────────────────────────────────────────

  {
    id: 'fc-prt-022',
    deck: 'exam-traps',
    front: 'Star schema vs snowflake — which does VertiPaq favor and why?',
    back: 'VertiPaq favors star schema. Denormalized dimension tables compress extremely well because the compression algorithm exploits low-cardinality repeated values. Snowflake\'s normalized lookup tables introduce extra joins that reduce compression efficiency and increase query complexity. Wrong attractor: "Snowflake is preferred because it reduces data redundancy in the model."',
    tags: ['semantic-modeling', 'star-schema', 'snowflake', 'vertipaq', 'compression'],
    difficulty: 3,
    sourceAnchor: { category: 'semantic-model-design', note: 'VertiPaq compression favors star schema' }
  },

  {
    id: 'fc-prt-023',
    deck: 'exam-traps',
    front: 'Many-to-many relationships — bridge tables vs native M:M. When does each apply?',
    back: 'A bridge table (associative entity) is used when the many-to-many relationship has its own attributes or measures. A native M:M relationship (both tables set to cross-filter both directions) is used for pure cardinality resolution with no additional attributes. Native M:M can cause unexpected filter ambiguity; bridge tables offer more control. Wrong attractor: "Native M:M always replaces the need for a bridge table."',
    tags: ['semantic-modeling', 'many-to-many', 'bridge-table', 'relationships'],
    difficulty: 4,
    sourceAnchor: { category: 'semantic-model-design', note: 'Bridge tables vs native M:M design decision' }
  },

  {
    id: 'fc-prt-024',
    deck: 'exam-traps',
    front: 'Composite models — how are security boundaries enforced across sources?',
    back: 'Each source in a composite model enforces its own security independently. SQL Server RLS is enforced by SQL Server, Power BI model RLS is enforced by the model engine, and DirectQuery source credentials are passed through per-user. There is no unified single security layer — you must configure security at each source. Wrong attractor: "Model-level RLS in a composite model enforces security across all underlying sources."',
    tags: ['composite-models', 'security', 'rls', 'directquery', 'exam-trap'],
    difficulty: 4,
    sourceAnchor: { category: 'storage-modes', note: 'Per-source security boundaries in composite models' }
  },

  // ── Fabric architecture ──────────────────────────────────────────────────

  {
    id: 'fc-prt-025',
    deck: 'exam-traps',
    front: 'Lakehouse SQL endpoint vs Warehouse — what T-SQL DML difference matters most for the exam?',
    back: 'The Lakehouse SQL endpoint is read-only for T-SQL DML — you cannot run INSERT, UPDATE, DELETE, or MERGE against it. All writes to a Lakehouse go through Spark or the Lakehouse API. The Fabric Warehouse fully supports T-SQL DML. Wrong attractor: "The Lakehouse SQL endpoint supports all T-SQL operations, just with lower concurrency."',
    tags: ['lakehouse', 'warehouse', 'sql-endpoint', 'tsql', 'dml', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'fabric-warehouse-tsql', note: 'Lakehouse SQL endpoint is read-only for DML' }
  },

  {
    id: 'fc-prt-026',
    deck: 'exam-traps',
    front: 'Mirroring in Fabric — what is the target database state?',
    back: 'A Mirrored Database is a read-only replica of the source database (e.g., Azure SQL Database, Cosmos DB, Snowflake) replicated continuously into OneLake. It cannot be written to directly. Queries go against the mirrored copy; writes still go to the source. Wrong attractor: "Mirroring creates a bi-directional sync so writes can go to either the source or the mirror."',
    tags: ['mirroring', 'read-only', 'onelake', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'mirroring', note: 'Mirrored databases are read-only replicas' }
  },

  {
    id: 'fc-prt-027',
    deck: 'exam-traps',
    front: 'OneLake Shortcuts — do they copy data or virtualize it?',
    back: 'Shortcuts virtualize access — no data is copied into OneLake. A shortcut is a pointer to data at another location (another Lakehouse, ADLS Gen2, S3, etc.). Any query through the shortcut reads from the source at query time. Wrong attractor: "Creating a shortcut copies the data into OneLake for faster access."',
    tags: ['onelake', 'shortcuts', 'virtualization', 'no-copy', 'exam-trap'],
    difficulty: 2,
    sourceAnchor: { category: 'onelake-shortcuts', note: 'Shortcuts virtualize, do not copy data' }
  },

  // ── Capacity & governance ────────────────────────────────────────────────

  {
    id: 'fc-prt-028',
    deck: 'exam-traps',
    front: 'Fabric throttling ladder — what is the order of escalation?',
    back: 'Stage 1: Interactive operations are delayed (25% slowdown). Stage 2: Interactive operations are rejected (user sees errors). Stage 3: Background operations are also rejected. The ladder escalates as carryforward CU debt grows; resolving requires reducing workload or scaling the SKU. Wrong attractor: "Throttling immediately rejects all operations with no warning delay stage."',
    tags: ['capacity', 'throttling', 'ladder', 'interactive', 'background', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'fabric-capacity', note: 'Three-stage throttling escalation ladder' }
  },

  {
    id: 'fc-prt-029',
    deck: 'exam-traps',
    front: 'Tenant audit log default retention — what is it and when does it change?',
    back: 'Default M365 Unified Audit Log retention is 30 days (E1/F1 licenses). Microsoft 365 E3 extends this to 90 days. E5 or the Audit (Premium) add-on extends to 1 year. The Fabric Admin portal Activity Log is a separate surface with a fixed 30-day window regardless of license. Wrong attractor: "The default audit log retention is 90 days for all Microsoft 365 tenants."',
    tags: ['audit-logs', 'retention', 'e3', 'e5', 'tenant-admin', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'audit-logs', note: 'Audit log retention tiers by M365 license' }
  },

  {
    id: 'fc-prt-030',
    deck: 'exam-traps',
    front: 'Large semantic model refresh failure — what SKU constraint is commonly overlooked?',
    back: 'Large-model storage format (enabling datasets >10 GB) requires a Premium or Fabric capacity — it cannot be enabled on shared or Pro capacity. Additionally, the SKU must be sized to hold the model in memory at refresh time; an undersized SKU causes refresh OOM failures. Wrong attractor: "Large model refresh failures are always caused by query complexity, not SKU size."',
    tags: ['refresh', 'large-model', 'sku', 'capacity', 'exam-trap'],
    difficulty: 3,
    sourceAnchor: { category: 'refresh-management', note: 'Large model storage SKU requirement' }
  }

];
