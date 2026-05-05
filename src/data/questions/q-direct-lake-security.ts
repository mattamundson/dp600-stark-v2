// Sprint 3 — Direct Lake security traps + dynamic RLS (18 Q).
//
// Most concentrated batch on the canonical Microsoft-documented
// exam trap: WAREHOUSE-LEVEL RLS forces Direct Lake to fall back to
// DirectQuery to honor the SQL predicate. This is high-frequency
// exam material and is widely under-studied.
//
// Splits:
//   warehouse RLS → DL fallback        5 Q  (semantic)
//   DL on OneLake security             3 Q  (semantic)
//   RLS placement (where to enforce)   4 Q  (semantic + maintain)
//   USERPRINCIPALNAME() patterns       3 Q  (semantic)
//   warehouse predicate-based security 3 Q  (maintain)
//
// IDs dls-001..dls-018.
// Sources: learn.microsoft.com/en-us/fabric/data-warehouse/row-level-security
// + learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview
// (both reviewed 2026-04 by user).

import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

export const directLakeSecurity: Question[] = [
  // ── Warehouse RLS → Direct Lake fallback (5 Q) ───────────────
  single({
    id: 'dls-001', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A semantic model uses **Direct Lake on Warehouse**. The Warehouse has CREATE SECURITY POLICY predicates filtering rows per user. A user queries the model. What happens?',
    options: [
      'The Direct Lake column-segment path serves the query, applying the warehouse RLS predicate inline in VertiPaq',
      'Direct Lake falls back to DirectQuery to honor the warehouse RLS predicate (the SQL engine evaluates the predicate)',
      'The warehouse RLS predicate is silently bypassed because Direct Lake reads Delta files directly',
      'The query fails with "RLS predicate not supported in Direct Lake"'
    ],
    correct: 1,
    explanation: 'Direct Lake on Warehouse must DEFER to DirectQuery to apply warehouse-level RLS. The VertiPaq column-segment path cannot evaluate SQL predicates, so the engine routes through DirectQuery for any query against a table with active warehouse RLS. This is the canonical Microsoft-documented exam trap.',
    whyWrong: {
      0: 'VertiPaq cannot evaluate SQL CREATE SECURITY POLICY predicates inline. Fallback is required.',
      2: 'Predicates are NOT bypassed — that would be a security failure. Direct Lake correctly defers to DirectQuery.',
      3: 'There is no error; the query succeeds via fallback path (subject to whatever fallback policy is set).'
    },
    source: SRC.rls,
    tags: ['direct-lake', 'warehouse-rls', 'fallback', 'exam-trap', 'security'],
    relatedIds: ['dls-002', 'dls-003', 'gs-012']
  }),

  multi({
    id: 'dls-002', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A team configures Direct Lake on Warehouse with `Direct Lake behavior = DirectLakeOnly` (no fallback allowed). The warehouse has RLS predicates active. What outcomes are possible? Select all that apply.',
    options: [
      'Queries against tables with active warehouse RLS FAIL because fallback is forbidden',
      'Queries succeed via VertiPaq with predicates magically applied',
      'The model owner sees correct results; RLS-restricted users see errors',
      'The model owner sees ALL rows (Owner identity bypasses RLS in test); RLS-restricted users see errors'
    ],
    correct: [0, 3],
    explanation: 'With DirectLakeOnly, fallback is forbidden — so warehouse-RLS-affected queries error out for restricted users. The model owner identity bypasses RLS in test mode (not because of DirectLakeOnly, but because owners always do). VertiPaq cannot apply warehouse predicates inline (B is wrong); the failure is per-user, not just for owners (C is incomplete).',
    whyWrong: {
      1: 'VertiPaq does not magically apply SQL predicates; that is the whole reason fallback is required.',
      2: 'The owner-bypass is true but incomplete — the failure is per-user, not "owner sees correct".'
    },
    source: SRC.rls,
    tags: ['direct-lake', 'directlakeonly', 'warehouse-rls', 'fallback-policy'],
    relatedIds: ['dls-001', 'dlm2-001']
  }),

  single({
    id: 'dls-003', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'A workload has a strict no-fallback SLA. The team has chosen Direct Lake on Warehouse for warehouse compatibility. They define warehouse RLS for compliance. What is the architectural conflict and the correct resolution?',
    options: [
      'No conflict — Direct Lake handles it transparently',
      'Conflict: warehouse RLS forces fallback. Resolution: enforce RLS at the SEMANTIC MODEL layer (Power BI roles), NOT at the warehouse, so Direct Lake can stay on the column-segment path',
      'Conflict: warehouse RLS forces fallback. Resolution: switch to Direct Lake on OneLake (which has no fallback path)',
      'Conflict is real but unresolvable — switch to Import mode'
    ],
    correct: 1,
    explanation: 'The architectural conflict is real: warehouse RLS forces fallback, breaking the no-fallback SLA. The correct resolution moves RLS UP the stack to the semantic model layer. Model RLS is evaluated by VertiPaq directly — no fallback required. Compliance is preserved; SLA is preserved.',
    whyWrong: {
      0: 'It is NOT transparent. Warehouse RLS forces fallback.',
      2: 'Direct Lake on OneLake does not support warehouse-style predicates (it bypasses the SQL endpoint for data reads), so SQL RLS would not apply at all. That is a SECURITY failure, not a resolution.',
      3: 'Import is overkill if the only constraint is fallback. Model-level RLS preserves Direct Lake.'
    },
    source: SRC.rls,
    tags: ['direct-lake', 'warehouse-rls', 'sla', 'design-pattern', 'exam-trap'],
    relatedIds: ['dls-002', 'dls-007']
  }),

  multi({
    id: 'dls-004', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'Diagnostic signals that "warehouse RLS is forcing Direct Lake fallback" — which appear in monitoring? Select all that apply.',
    options: [
      'Capacity Metrics shows DirectQuery fallback ratio rising for that model',
      'Per-query trace shows the storage engine routing to SQL endpoint',
      'CU consumption per query is HIGHER than typical Direct Lake (since DQ is more expensive)',
      'The Direct Lake column-segment cache hit rate drops to 0% on affected tables',
      'Refresh time on the Lakehouse table doubles'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Fallback shows up as a higher fallback ratio (1), SQL endpoint routing in traces (2), increased CU (3 — DirectQuery is more expensive than column-segment serving), and dropped column-segment cache hit rate (4) on the affected tables. (5) is wrong — refresh time concerns the lakehouse pipeline, not the model query path.',
    whyWrong: {
      4: 'Refresh time is unrelated to runtime query fallback. Refresh writes to the lakehouse; fallback affects query reads.'
    },
    source: SRC.troubleshoot,
    tags: ['direct-lake', 'fallback', 'monitoring', 'capacity-metrics', 'diagnostic'],
    relatedIds: ['dls-001']
  }),

  single({
    id: 'dls-005', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A model uses Direct Lake on Warehouse with warehouse RLS. The team accepts fallback (default `Direct Lake behavior = Automatic`). What is the LIKELY CU impact during peak hours?',
    options: [
      'Negligible — the column-segment cache absorbs the cost',
      'Significant — every RLS-affected query goes through DirectQuery, multiplying CU vs the no-RLS baseline',
      'Reduced CU — DirectQuery is cheaper than Direct Lake for filtered queries',
      'Zero CU — RLS-affected queries are served from edge cache'
    ],
    correct: 1,
    explanation: 'DirectQuery is more expensive per query than the Direct Lake column-segment path. When warehouse RLS forces fallback, every affected query pays that cost. At scale and during peak hours, the multiplier on CU consumption is significant — this is one of the most common "we ran out of capacity" surprises in regulated workloads.',
    whyWrong: {
      0: 'The cache absorbs Direct Lake serving costs, not DirectQuery costs. Fallback bypasses the cache.',
      2: 'DirectQuery is generally MORE expensive than Direct Lake for the same query, not less.',
      3: 'There is no edge cache for RLS-affected queries.'
    },
    source: SRC.capacity,
    tags: ['direct-lake', 'fallback', 'capacity', 'cu-impact', 'warehouse-rls'],
    relatedIds: ['dls-001', 'mo-006']
  }),

  // ── Direct Lake on OneLake security (3 Q) ────────────────────
  single({
    id: 'dls-006', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A semantic model uses **Direct Lake on OneLake**. The underlying Lakehouse has SQL endpoint RLS configured. What happens when RLS-restricted users query the model?',
    options: [
      'Direct Lake on OneLake honors the SQL endpoint RLS',
      'Direct Lake on OneLake BYPASSES SQL endpoint RLS — the rules are not applied',
      'The query fails with "SQL RLS not compatible with Direct Lake"',
      'The query falls back to DirectQuery to apply the SQL RLS'
    ],
    correct: 1,
    explanation: 'Direct Lake on OneLake reads Delta files DIRECTLY from OneLake — it does NOT go through the SQL endpoint for data reads. SQL endpoint RLS is therefore NOT applied. Users see ALL rows the OneLake file permissions allow them to see. This is the regulated-workload security trap: assuming SQL RLS still gates rows when storage mode changed.',
    whyWrong: {
      0: 'OneLake variant does not use the SQL endpoint for data reads — RLS at SQL has nothing to filter.',
      2: 'No error — the query succeeds and returns ALL rows (security failure if you assumed SQL RLS still applied).',
      3: 'OneLake variant has no fallback path at all — neither for fallback nor for security re-evaluation.'
    },
    source: SRC.rls,
    tags: ['direct-lake', 'on-onelake', 'sql-rls-bypass', 'exam-trap', 'security'],
    relatedIds: ['dls-007', 'dlm2-005', 'gs-015']
  }),

  multi({
    id: 'dls-007', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'Direct Lake on OneLake bypasses SQL RLS. To enforce row filtering on this storage variant, which mechanisms work? Select all that apply.',
    options: [
      'Define semantic-model RLS roles — these are evaluated by VertiPaq and apply to Direct Lake on OneLake',
      'Apply OneLake folder-level ACLs to deny entire folders to specific users',
      'Apply Delta-table-level partition pruning so different users see different partitions',
      'Re-add SQL RLS hoping it eventually applies',
      'Switch to Direct Lake on SQL if SQL RLS is the desired enforcement mechanism'
    ],
    correct: [0, 1, 4],
    explanation: 'Three working mechanisms: model RLS (1) evaluated by VertiPaq, OneLake ACLs (2) — coarse but effective at folder level, and switching to Direct Lake on SQL (5) if SQL RLS is the desired enforcement layer. Partition pruning (3) is not a security mechanism — partitions are not access-controlled per user. Re-adding SQL RLS (4) does not change the fact that OneLake variant bypasses it.',
    whyWrong: {
      2: 'Partition design is performance-oriented, not security-oriented. Partitions are not user-scoped.',
      3: 'OneLake variant does not consult the SQL endpoint for data reads — SQL RLS is structurally inapplicable.'
    },
    source: SRC.rls,
    tags: ['direct-lake', 'on-onelake', 'mitigation', 'design-options', 'security'],
    relatedIds: ['dls-006', 'gs-015']
  }),

  single({
    id: 'dls-008', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A Direct Lake on OneLake model serves a regulated workload. The team has defined semantic-model RLS roles. A pen-tester connects via XMLA endpoint with their Excel "Get Data". What should the team verify?',
    options: [
      'Excel cannot connect to a Power BI semantic model — no concern',
      'XMLA-endpoint connections honor RLS roles — verify the pen-tester sees only their allowed rows',
      'XMLA-endpoint connections BYPASS RLS by default — RLS roles must be explicitly enabled at the XMLA layer',
      'Excel always uses an aggregated view, so RLS is not relevant'
    ],
    correct: 1,
    explanation: 'XMLA endpoint connections DO honor semantic-model RLS roles for non-admin users. The pen-tester should see only their role-permitted rows. This is the correct behavior. The trap is when admin-level credentials are used; admins bypass RLS for testing.',
    whyWrong: {
      0: 'Excel definitely connects to Power BI/Fabric models via XMLA.',
      2: 'XMLA does not have a separate RLS-enable toggle. Roles apply by default.',
      3: 'Excel queries the model directly; aggregation is a query characteristic, not a security layer.'
    },
    source: SRC.rls,
    tags: ['direct-lake', 'on-onelake', 'xmla', 'pen-test', 'verification'],
    relatedIds: ['dls-007', 'gs-014']
  }),

  // ── RLS placement decisions (4 Q) ────────────────────────────
  single({
    id: 'dls-009', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A team is choosing where to place RLS for a workload using Direct Lake on Warehouse. Both layers (warehouse, semantic model) can host RLS. They want LOWEST query cost. Which placement is BEST?',
    options: [
      'Warehouse RLS — the predicate is closer to the data',
      'Semantic-model RLS — Direct Lake stays on the column-segment path; no fallback',
      'Both layers, defense in depth',
      'Neither — use OneLake folder ACLs only'
    ],
    correct: 1,
    explanation: 'Lowest query cost = stay on Direct Lake column-segment path = avoid fallback = enforce at the model layer. Warehouse RLS forces fallback to DirectQuery (more expensive). Defense-in-depth is right for compliance, but the question asks for lowest cost specifically. ACLs are coarse-grained and not row-level.',
    whyWrong: {
      0: 'Closer-to-data is a different optimization axis. For Direct Lake cost, model-layer wins.',
      2: 'Defense-in-depth has compliance value but raises cost. The question asks for lowest cost.',
      3: 'OneLake ACLs are folder-level, not row-level.'
    },
    source: SRC.rls,
    tags: ['rls-placement', 'direct-lake', 'cost', 'design-pattern'],
    relatedIds: ['dls-001', 'dls-010']
  }),

  multi({
    id: 'dls-010', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'A regulated workload requires defense-in-depth (RLS at warehouse AND model). Which OPERATIONAL costs come with this choice? Select all that apply.',
    options: [
      'Direct Lake fallback to DirectQuery on every affected query — ~2-3× CU per query',
      'Multi-layer RLS rules must be kept in sync; drift between layers is a compliance audit finding',
      'Model authoring is harder — testing must cover both layers (model + warehouse) for every role change',
      'No operational cost — defense-in-depth is "free"',
      'Warehouse RLS predicate changes invalidate the Direct Lake column-segment cache for affected tables'
    ],
    correct: [0, 1, 2],
    explanation: 'Three real costs: fallback CU (1), drift risk between layers (2), testing complexity (3). Defense-in-depth is NOT free (4 wrong). Cache invalidation on RLS predicate change (5) is not a documented Direct Lake behavior — predicate changes affect SQL plan, but the column-segment cache is not invalidated by predicate edits.',
    whyWrong: {
      3: 'Defense-in-depth costs query CU, audit complexity, and test coverage. Real costs.',
      4: 'Cache invalidation is tied to Delta commits / framing, not predicate changes.'
    },
    source: SRC.rls,
    tags: ['rls-placement', 'defense-in-depth', 'operational-cost', 'compliance'],
    relatedIds: ['dls-009']
  }),

  single({
    id: 'dls-011', domain: 'maintain', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A multi-tenant SaaS model has 200 customer tenants. Each customer must see ONLY their own rows. Which RLS placement scales BEST?',
    options: [
      'Warehouse RLS — one CREATE SECURITY POLICY per tenant',
      'Semantic-model RLS — one role per tenant',
      'Semantic-model RLS — ONE dynamic role using `[TenantId] = LOOKUPVALUE(Users[TenantId], Users[Email], USERPRINCIPALNAME())`',
      'OneLake ACLs — one folder per tenant'
    ],
    correct: 2,
    explanation: 'A single dynamic role using a lookup against a Users table scales linearly: adding a customer is a row INSERT, not a model edit. Static-role-per-tenant (B) requires authoring 200 roles. Warehouse RLS forces DL fallback (A). Folder-per-tenant (D) breaks the single-shared-table architecture.',
    whyWrong: {
      0: 'Warehouse RLS forces DL fallback — bad for performance.',
      1: 'Static roles do not scale: 200 roles is unmaintainable + every new tenant requires model deploy.',
      3: 'Folder-per-tenant means one Delta table per tenant — the table architecture is wrong for multi-tenant.'
    },
    source: SRC.rls,
    tags: ['rls-placement', 'multi-tenant', 'dynamic-rls', 'scale'],
    relatedIds: ['dls-009', 'gs-010']
  }),

  multi({
    id: 'dls-012', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'When migrating an existing warehouse-RLS workload to model-RLS, which actions are required for COMPLIANCE-EQUIVALENT enforcement? Select all that apply.',
    options: [
      'Translate every CREATE SECURITY POLICY predicate into a model RLS role expression with equivalent semantics',
      'Keep warehouse RLS active during the transition — defense-in-depth',
      'Verify model RLS is enforced for XMLA endpoint connections (not just Power BI service)',
      'Verify the model role membership matches the warehouse predicate audience exactly',
      'Drop warehouse RLS immediately to "force the team to rely on model RLS"'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Translate predicates (1), keep both layers during transition (2 — defense-in-depth + audit), verify XMLA bypass is closed (3), verify membership parity (4). Dropping warehouse RLS abruptly (5) is the same anti-pattern as deleting v1 model in the lifecycle case — leaves a window where RLS is misconfigured.',
    whyWrong: {
      4: 'Hard cutover before model RLS is verified is exactly how compliance violations happen.'
    },
    source: SRC.rls,
    tags: ['rls-migration', 'compliance', 'transition-pattern', 'audit'],
    relatedIds: ['dls-009', 'gs-014']
  }),

  // ── USERPRINCIPALNAME() patterns + bridge tables (3 Q) ────────
  single({
    id: 'dls-013', domain: 'semantic', subtopic: 'security-rls', difficulty: 3,
    prompt: 'USERPRINCIPALNAME() returns what value when called from a service principal context (e.g., Power BI Embedded with a service-principal token)?',
    options: [
      'The service principal\'s object ID',
      'The service principal\'s app ID',
      'The IMPERSONATED user identity passed by EffectiveUserName / token claims',
      'NULL — service principals do not have a UPN'
    ],
    correct: 2,
    explanation: 'In Embedded scenarios with a service principal acting on behalf of an end user, the impersonated user identity (passed via EffectiveUserName or token claims) is what USERPRINCIPALNAME() returns. This is the design that makes dynamic RLS work in embedded apps.',
    whyWrong: {
      0: 'Service-principal object ID is not what UPN returns.',
      1: 'App ID is the SP identifier, not what RLS evaluates.',
      3: 'NULL would make dynamic RLS fail in every embedded scenario — that is not the design.'
    },
    source: SRC.rls,
    tags: ['rls', 'userprincipalname', 'service-principal', 'embedded']
  }),

  multi({
    id: 'dls-014', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A bridge-table RLS pattern uses RELATED(Users[UserEmail]) = USERPRINCIPALNAME(). Which design considerations are TRUE? Select all that apply.',
    options: [
      'The Users table must have a relationship to the fact (or to a dimension that reaches the fact)',
      'The Users table requires UNIQUE rows per user — duplicates produce ambiguous filtering',
      'The Users table can be Direct Lake; it does not need to be Import',
      'Bridge tables work only with single-direction relationships',
      'Bridge tables can produce performance issues if very wide (many users × many entitlements)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Bridge tables need a relationship (1), unique rows (2), can be Direct Lake (3 — DL applies to dimensions too), and CAN have performance issues at scale (5). (4) is wrong — bidirectional relationships are sometimes needed for bridge patterns and DO work, with their own performance trade-offs.',
    whyWrong: {
      3: 'Bidirectional relationships work; sometimes they are required for bridge tables. Single-direction is not a hard constraint.'
    },
    source: SRC.rls,
    tags: ['rls', 'bridge-table', 'design-considerations', 'performance']
  }),

  single({
    id: 'dls-015', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A bridge-table RLS pattern shows users seeing rows for users they should NOT have access to. The Users table has duplicate rows for some users. What is the cause?',
    options: [
      'Duplicate rows in the bridge table cause RELATED to return ambiguous values; the predicate may match unexpectedly',
      'USERPRINCIPALNAME() varies between session resumes — random results',
      'Direct Lake caching is stale — refresh fixes it',
      'Power BI Service has known multi-row bug — fixed by SKU upgrade'
    ],
    correct: 0,
    explanation: 'Duplicates in the bridge table break the deterministic single-value join behavior of RELATED. The fix is enforcing uniqueness on the user key BEFORE the bridge row is loaded — typically a deduplication step in the upstream ETL or a SUMMARIZE in DAX.',
    whyWrong: {
      1: 'UPN does not vary between sessions; it is stable per identity.',
      2: 'Direct Lake caching does not produce ambiguous predicate matches.',
      3: 'No such bug exists.'
    },
    source: SRC.rls,
    tags: ['rls', 'bridge-table', 'duplicates', 'troubleshooting'],
    relatedIds: ['dls-014']
  }),

  // ── Warehouse predicate-based security operations (3 Q) ─────
  single({
    id: 'dls-016', domain: 'maintain', subtopic: 'security-rls', difficulty: 3,
    prompt: 'In Fabric Warehouse, what is the T-SQL pattern for defining row-level security?',
    options: [
      'CREATE SECURITY POLICY <name> ADD FILTER PREDICATE <function> ON <table>',
      'GRANT SELECT (rows) ON <table> TO <user>',
      'CREATE ROW SECURITY <table> WHERE <predicate>',
      'ALTER TABLE <table> ENABLE ROW SECURITY'
    ],
    correct: 0,
    explanation: 'Warehouse RLS uses the standard SQL Server `CREATE SECURITY POLICY` pattern with a predicate function and a FILTER PREDICATE binding to a table. This is consistent with SQL Server / Azure SQL DB syntax.',
    whyWrong: {
      1: 'GRANT does not have a row-filter clause.',
      2: 'No such CREATE ROW SECURITY syntax exists.',
      3: 'ALTER TABLE has no ENABLE ROW SECURITY clause.'
    },
    source: SRC.rls,
    tags: ['warehouse-rls', 'tsql-syntax', 'create-security-policy']
  }),

  multi({
    id: 'dls-017', domain: 'maintain', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A predicate function for warehouse RLS uses `WHERE [Region] = SESSION_CONTEXT(N\'CurrentRegion\')`. Which deployment considerations are TRUE? Select all that apply.',
    options: [
      'The application setting SESSION_CONTEXT before queries is required for the predicate to filter correctly',
      'Without SESSION_CONTEXT set, the predicate evaluates the session context as NULL → no rows match → "blank report" symptom',
      'Direct Lake on Warehouse honors the SESSION_CONTEXT-based predicate the same as a USER_NAME()-based one',
      'SESSION_CONTEXT works only with EXECUTE AS clauses, not with native user identities',
      'A SESSION_CONTEXT-based predicate forces Direct Lake to fall back to DirectQuery just like any other warehouse RLS predicate'
    ],
    correct: [0, 1, 4],
    explanation: 'SESSION_CONTEXT must be set per session (1), unset → NULL → empty result (2), and triggers DL fallback like all warehouse RLS (5). (3) is incorrect — SESSION_CONTEXT works regardless of identity mechanism but the calling app MUST set it. (4) is incorrect — SESSION_CONTEXT works with native auth, not just EXECUTE AS.',
    whyWrong: {
      2: 'The predicate honoring is the same; the difference is at the app layer (must set SESSION_CONTEXT per session).',
      3: 'SESSION_CONTEXT works with native auth too. It is not EXECUTE-AS-only.'
    },
    source: SRC.rls,
    tags: ['warehouse-rls', 'session-context', 'predicate-function', 'app-integration']
  }),

  single({
    id: 'dls-018', domain: 'maintain', subtopic: 'security-rls', difficulty: 4,
    prompt: 'An auditor asks for a list of every user-visible row in the Sales table for User X over the last 7 days, given warehouse RLS predicates apply. Where do you go?',
    options: [
      'Run a `SELECT * FROM Sales` AS User X via EXECUTE AS, then capture the result',
      'Open the Power BI activity log for the model that wraps the warehouse',
      'Microsoft Purview Activity Explorer + warehouse query audit logs',
      'Capacity Metrics → user-level CU breakdown'
    ],
    correct: 2,
    explanation: 'Audit asks "what did User X see?" — Purview Activity Explorer + warehouse query audit logs give the historical record of WHAT queries ran AS User X, with which rows returned. EXECUTE AS today (1) is a snapshot, not a 7-day audit. Power BI activity (2) covers the model layer, not the warehouse predicate audit. Capacity Metrics (4) tracks CU, not row-level audit.',
    whyWrong: {
      0: 'Snapshot of today is not a 7-day audit.',
      1: 'Power BI activity log does not capture warehouse-side predicate evaluation.',
      3: 'CU breakdown does not include row-level audit data.'
    },
    source: SRC.governance,
    tags: ['warehouse-rls', 'audit', 'compliance', 'purview-activity-explorer'],
    relatedIds: ['gs-028']
  })
];
