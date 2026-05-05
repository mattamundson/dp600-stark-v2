import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

// 14 chained scenario questions for scn-46..scn-50.
// IDs must stay in sync with `questionIds` in scn-list-batch2.ts.

export const scenarioQuestionsBatch2: Question[] = [

  // ─── scn-46 — Greenfield Steel — multi-source medallion + RLS (3 Qs) ──

  single({
    id: 'scn-46-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'medallion-architecture',
    difficulty: 3,
    scenarioId: 'scn-46',
    scenarioTitle: 'Greenfield Steel — multi-source medallion + RLS',
    prompt:
      'The Silver layer must apply SCD Type 2 to DimSupplier, which arrives daily from four ERPs with overlapping surrogate keys. ' +
      'Which Fabric authoring approach BEST handles the SCD2 merge while remaining maintainable by the team\'s mostly T-SQL / Power Query skill set?',
    options: [
      'A Dataflow Gen2 with Power Query M scripts that implement the SCD2 MERGE logic in-memory, writing Delta output to the Silver Lakehouse',
      'A PySpark notebook using the Delta MERGE INTO command with WHEN MATCHED / WHEN NOT MATCHED clauses and a synthetic surrogate key',
      'A Fabric Data Pipeline with a Copy Activity that overwrites the supplier table nightly (full-load, no SCD)',
      'A Fabric Warehouse stored procedure running T-SQL MERGE with IsSurrent / EffectiveDate columns, writing to the Silver Warehouse'
    ],
    correct: 3,
    explanation:
      'T-SQL MERGE in a Fabric Warehouse is the skill-aligned path: the team is mostly T-SQL proficient, and MERGE with IsCurrent / EffectiveDate / ExpiredDate columns is the canonical SCD2 implementation. ' +
      'The Silver layer output is a Warehouse table that Direct Lake can consume via its SQL endpoint. ' +
      'Dataflow Gen2 / Power Query lacks native Delta MERGE semantics for SCD2 at scale. ' +
      'PySpark is correct in principle but requires Spark expertise the team does not have. ' +
      'Full-load nightly copy destroys the historical dimension rows that SCD2 is specifically designed to preserve.',
    whyWrong: {
      0: 'Dataflow Gen2 Power Query does not expose a native SCD2 MERGE step against Delta tables at scale; the in-memory model breaks on multi-million-row dimensions and lacks the MERGE atomicity required for correctness.',
      1: 'PySpark Delta MERGE is architecturally sound but mismatches the team\'s T-SQL skill set, creating a long-term maintenance burden with no material benefit over the T-SQL path.',
      2: 'Full nightly overwrite is a destructive load pattern — it permanently loses the slowly-changing history that SCD2 is designed to capture, violating the Silver contract.'
    },
    source: SRC.tsql,
    tags: ['scenario', 'medallion', 'scd2', 'warehouse', 'prepare']
  }),

  single({
    id: 'scn-46-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'row-level-security',
    difficulty: 3,
    scenarioId: 'scn-46',
    scenarioTitle: 'Greenfield Steel — multi-source medallion + RLS',
    prompt:
      'The Gold semantic model must restrict each plant manager to their own plant\'s FactSales rows. ' +
      'DimPlant contains [PlantId] and [ManagerEmail]. ' +
      'Which RLS role expression CORRECTLY implements the requirement using the authenticated user\'s identity?',
    options: [
      'On FactSales: `[PlantId] IN VALUES(DimPlant[PlantId])`',
      'On DimPlant: `[ManagerEmail] = USERPRINCIPALNAME()`',
      'On FactSales: `[PlantId] = LOOKUPVALUE(DimPlant[PlantId], DimPlant[ManagerEmail], USERPRINCIPALNAME())`',
      'On DimPlant: `[PlantId] = USERNAME()`'
    ],
    correct: 1,
    explanation:
      'Placing the RLS filter on DimPlant (`[ManagerEmail] = USERPRINCIPALNAME()`) is the canonical dynamic-RLS pattern when the dimension holds the manager identity. ' +
      'The relationship between DimPlant and FactSales propagates the filter automatically — the manager sees only the FactSales rows joined to their plant row. ' +
      'Filtering directly on FactSales with LOOKUPVALUE works but is less efficient (evaluated per row during scan). ' +
      'A filter on FactSales with IN VALUES() gives every manager access to all plant rows unless further constrained. ' +
      '`USERNAME()` returns the legacy Windows SAM name, not the UPN — it will fail in Entra ID / cloud-identity environments.',
    whyWrong: {
      0: '`IN VALUES(DimPlant[PlantId])` returns all PlantId values currently in context — it does not restrict to the logged-in manager\'s plant and gives unrestricted access.',
      2: 'A LOOKUPVALUE on FactSales is evaluated row-by-row during scan, which is functionally correct but slower than letting the relationship propagate a DimPlant filter. It is also harder to maintain.',
      3: '`USERNAME()` returns the Windows domain\\account name (SAM format), which does not match Entra UPNs (email format). In a Fabric workspace this will return blank, making the filter `[PlantId] = ""` — leaking all rows or filtering all rows depending on data, not the intended behaviour.'
    },
    source: SRC.rls,
    tags: ['scenario', 'rls', 'dynamic-rls', 'userprincipalname', 'semantic']
  }),

  single({
    id: 'scn-46-q3',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 3,
    scenarioId: 'scn-46',
    scenarioTitle: 'Greenfield Steel — multi-source medallion + RLS',
    prompt:
      'The CFO requires an audit log of every period-close data load so finance can certify the Gold layer each month-end. ' +
      'Which combination of Fabric features BEST delivers traceable, queryable load history with minimal custom code?',
    options: [
      'Write a custom log table in the Warehouse that each notebook and pipeline activity appends to manually at the end of each step',
      'Use Fabric Data Pipeline activity run history (viewable in Monitoring Hub) plus OneLake file-level Delta commit logs as the audit trail',
      'Enable Fabric Workspace Monitoring (tenant-level Eventhouse) and write a KQL query against IngestionLogs to surface period-close load events',
      'Use the Microsoft 365 Unified Audit Log to capture semantic model refresh events, queried via the Purview compliance portal'
    ],
    correct: 1,
    explanation:
      'Fabric Data Pipeline run history in the Monitoring Hub records each activity\'s start time, end time, status, and row counts — out of the box, no custom code. ' +
      'Delta\'s commit log (the `_delta_log/` folder) additionally records every transaction affecting a table, including schema changes and row counts per commit, providing a tamper-evident record at the storage layer. ' +
      'Together these give finance a traceable audit trail that covers both orchestration and data-layer changes. ' +
      'A custom log table requires manual discipline (easy to forget), is not tamper-resistant, and breaks if a pipeline fails before the write. ' +
      'Workspace Monitoring Eventhouse is powerful for capacity/operational metrics but is not a period-close data-load audit trail. ' +
      'The M365 Unified Audit Log records refresh events but not pipeline execution details, row counts, or Gold-layer commit granularity.',
    whyWrong: {
      0: 'A manually maintained log table introduces human error, is not atomic with the data load, and is easy to omit or overwrite — it lacks the tamper-evident property finance needs for certification.',
      2: 'Workspace Monitoring Eventhouse is designed for capacity and performance telemetry, not data-load audit trails. It does not surface row counts, Delta commit details, or pipeline activity lineage needed for month-end certification.',
      3: 'The M365 Unified Audit Log captures Power BI refresh trigger events but lacks pipeline activity status, source-row counts, and the Delta commit granularity needed for a data-certifiable audit trail.'
    },
    source: SRC.monitoring,
    tags: ['scenario', 'audit', 'monitoring', 'pipeline', 'delta', 'maintain']
  }),

  // ─── scn-47 — Wonka Industries — Direct Lake fallback storm (3 Qs) ──

  single({
    id: 'scn-47-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-47',
    scenarioTitle: 'Wonka Industries — Direct Lake fallback storm',
    prompt:
      'What is the ROOT CAUSE of the Monday 09:00 fallback storm at Wonka Industries?',
    options: [
      'The Monday batch job triggers a large number of Delta commits simultaneously, exhausting framing capacity on F64',
      'Warehouse-level row-security predicates force Direct Lake to fall back to DirectQuery because predicates must be evaluated by the SQL engine, not the columnar store',
      'The F64 capacity is undersized for a 200M-row fact — Direct Lake requires at least F128 for tables above 100M rows',
      'Monday 09:00 brings a concurrent user spike that triggers query-based throttling, slowing all visual renders to DirectQuery speeds'
    ],
    correct: 1,
    explanation:
      'Direct Lake can only read column segments from OneLake directly — it cannot evaluate warehouse-level row-security predicates, which are enforced by the SQL engine. ' +
      'When warehouse RLS is present on a table, any query against that table falls back to DirectQuery so the SQL engine can apply the predicate. ' +
      'This is a hard architectural constraint: RLS lives in the SQL engine layer, not in the columnar segment layer Direct Lake accesses. ' +
      'Monday batch commits cause framing events, not fallback storms. ' +
      'Direct Lake has no hard row-count floor tied to SKU size — fallback is triggered by compatibility issues, not table size. ' +
      'Query throttling slows renders but does not change the storage mode from Direct Lake to DirectQuery.',
    whyWrong: {
      0: 'Delta commits trigger framing (metadata refresh), not DirectQuery fallback. Framing is fast and transparent to users; it does not produce a 55% fallback ratio.',
      2: 'There is no SKU-tier row-count threshold in Direct Lake. A 200M-row fact on F64 is within normal operating parameters. Fallback is triggered by compatibility issues (V-Order, unsupported features, warehouse RLS), not table size.',
      3: 'Query throttling is a capacity-layer concern that slows all queries proportionally. It does not switch a specific model\'s storage mode from Direct Lake to DirectQuery.'
    },
    source: SRC.directLakeFallback,
    tags: ['scenario', 'direct-lake', 'fallback', 'warehouse-rls', 'root-cause']
  }),

  multi({
    id: 'scn-47-q2',
    type: 'scenario-multi',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 5,
    scenarioId: 'scn-47',
    scenarioTitle: 'Wonka Industries — Direct Lake fallback storm',
    prompt:
      'The compliance team insists warehouse RLS predicates on FactConfections cannot be removed. ' +
      'Which TWO mitigation strategies allow Wonka to restore Direct Lake performance while keeping the compliance requirement intact? ' +
      '(Select 2)',
    options: [
      'Move FactConfections from the Warehouse to a Lakehouse and implement RLS on the semantic model layer using USERPRINCIPALNAME() instead of warehouse predicates',
      'Increase the capacity from F64 to F128 — the larger SKU eliminates fallback caused by warehouse RLS',
      'Set the semantic model to DirectLakeOnly mode so fallback fails hard instead of falling back silently',
      'Keep the Direct Lake model but add a dedicated Import-mode copy of FactConfections for Power BI, refreshed hourly, so the semantic model bypasses the warehouse predicates',
      'Partition FactConfections by the same dimension used in the RLS predicate (e.g., DivisionId) and replicate the partition to the Lakehouse, then attach a semantic-model RLS role on DivisionId'
    ],
    correct: [0, 4],
    explanation:
      'Option A (move to Lakehouse + semantic-model RLS) eliminates warehouse predicates entirely by relocating data to a layer Direct Lake reads natively and implementing the access control where Direct Lake can honour it — the model layer. ' +
      'Option E (partition replication + model-layer RLS) is a more surgical version: only the partition slices that need access control are replicated, and semantic-model RLS on DivisionId achieves the same compliance outcome without warehouse predicates. ' +
      'Both approaches satisfy compliance (row-level access control is preserved) while restoring the columnar segment path. ' +
      'A larger SKU (B) does not change the fallback trigger — warehouse predicates always require SQL-engine evaluation regardless of SKU. ' +
      'DirectLakeOnly (C) converts the fallback to a hard error, making the problem worse for users rather than fixing it. ' +
      'An Import-mode copy (D) introduces data-freshness lag, doubles storage, and adds refresh orchestration complexity; it also moves away from Direct Lake rather than fixing it.',
    whyWrong: {
      1: 'Warehouse RLS fallback is a hard architectural constraint — the SQL engine must evaluate predicates, and no SKU size changes that routing decision. F128 would absorb the DirectQuery CU cost better, but fallback will still happen.',
      2: 'DirectLakeOnly turns the fallback into a query error returned to the user. With warehouse RLS predicates present, EVERY query would error — the model becomes completely non-functional.',
      3: 'An Import-mode copy introduces a staleness window (hourly), doubles storage cost, and creates a parallel refresh pipeline that must stay in sync. It also abandons the real-time framing benefit Direct Lake was chosen for.'
    },
    source: SRC.directLakeFallback,
    tags: ['scenario', 'direct-lake', 'fallback', 'warehouse-rls', 'mitigation', 'multi-answer']
  }),

  single({
    id: 'scn-47-q3',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'fabric-capacity',
    difficulty: 3,
    scenarioId: 'scn-47',
    scenarioTitle: 'Wonka Industries — Direct Lake fallback storm',
    prompt:
      'After the mitigation from scn-47-q2 is in place and fallback is eliminated, the Monday 09:00 batch load ' +
      'still pushes CU% to 82% on F64. The junior engineer again proposes an immediate SKU upgrade to F128. ' +
      'What SHOULD the architect evaluate BEFORE approving the SKU change?',
    options: [
      'Check if the batch load can be rescheduled to an off-peak window (e.g., 05:00) and whether semantic model queries can use background-priority bursting without user-facing throttling',
      'Immediately approve F128 — 82% CU is above the 80% safe threshold and any delay risks throttling',
      'Switch all Direct Lake models to Import mode permanently to eliminate CU spikes during batch',
      'Enable autoscale to handle the spike automatically with no investigation needed'
    ],
    correct: 0,
    explanation:
      'Before spending on a SKU upgrade, the architect should evaluate whether the problem is time-of-day scheduling rather than capacity ceiling. ' +
      'Moving the batch to 05:00 flattens the Monday spike before users arrive. ' +
      'Fabric also supports background-priority execution for batch / scheduled workloads so they contend less with interactive queries. ' +
      'F64 has 128 CUs with a 2× burst ceiling of 256 CUs; 82% utilisation during a known batch window is within normal operating range and does not mandate an immediate SKU increase. ' +
      'Import mode eliminates the Direct Lake benefit Wonka chose for freshness and adds 200M-row refresh overhead. ' +
      'Autoscale is a valid complementary control but is not a substitute for investigating whether the spike is architecturally avoidable.',
    whyWrong: {
      1: '82% CU during a scheduled batch window is not an emergency — Fabric F-SKUs support bursting above 100% for short periods via smoothing. The correct response is investigate first, then size if justified.',
      2: 'Import mode on a 200M-row fact table adds significant refresh duration, storage cost, and freshness lag. It trades one problem for several others and abandons the architectural investment in Direct Lake.',
      3: 'Autoscale adds compute when CU is exceeded but does not eliminate the root spike or reduce cost. Rescheduling is free and should be evaluated first.'
    },
    source: SRC.capacity,
    tags: ['scenario', 'capacity', 'autoscale', 'batch-scheduling', 'maintain']
  }),

  // ─── scn-48 — Tyrell Logistics — composite model + label propagation (2 Qs)

  single({
    id: 'scn-48-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'storage-modes',
    difficulty: 4,
    scenarioId: 'scn-48',
    scenarioTitle: 'Tyrell Logistics — composite model + label propagation',
    prompt:
      'The architect is deciding the storage mode for the tariff reference table in the composite model. ' +
      'It updates hourly in Azure SQL and is ~500k rows. FactShipments (Direct Lake) and DimCarrier (Import) ' +
      'are already decided. Which storage mode for the tariff table BEST balances freshness and query performance in this composite model?',
    options: [
      'Direct Lake — point a second Direct Lake connection at the Azure SQL DB for real-time freshness',
      'Import — refresh hourly via a scheduled semantic model refresh; 500k rows is small enough that memory overhead is negligible',
      'DirectQuery — the tariff table is the slowly-changing reference that drives the hourly freshness requirement; DirectQuery ensures every query sees the latest Azure SQL state without a refresh',
      'Dual mode — store in both Import and DirectQuery; the engine chooses based on query pattern'
    ],
    correct: 2,
    explanation:
      'DirectQuery against Azure SQL for the tariff table is the correct choice. The table updates hourly and the scenario explicitly describes it as a "slowly-changing reference" requiring current values — Import with hourly refresh introduces up-to-60-minute staleness and risks refresh overlap during a 24-hour schedule. ' +
      'DirectQuery against a 500k-row reference table in a composite model is performant: the engine can push down filter/join predicates to the SQL DB, and since it is a reference (not a fact), query fanout is limited. ' +
      'Direct Lake requires the source to be a Delta table in OneLake — Azure SQL DB is not a valid Direct Lake source. ' +
      'Dual mode is for tables that serve BOTH aggregated (Import) and detail (DirectQuery) query patterns; it is not the right default for a freshness-driven reference table.',
    whyWrong: {
      0: 'Direct Lake sources must be Delta tables in OneLake (Lakehouse or Warehouse-backed). Azure SQL DB is not a valid Direct Lake source — this option is architecturally invalid.',
      1: 'Hourly Import refresh means users could see tariff data up to 59 minutes stale, which contradicts the "hourly freshness" requirement. Refresh also competes with interactive query capacity.',
      3: 'Dual mode is applicable when a table participates in both aggregation-friendly (Import) and detail-level (DirectQuery) patterns. For a reference table whose primary value is freshness, it adds unnecessary complexity without benefit.'
    },
    source: SRC.storageModes,
    tags: ['scenario', 'composite-model', 'storage-modes', 'directquery', 'direct-lake', 'semantic']
  }),

  multi({
    id: 'scn-48-q2',
    type: 'scenario-multi',
    domain: 'maintain',
    subtopic: 'sensitivity-labels',
    difficulty: 4,
    scenarioId: 'scn-48',
    scenarioTitle: 'Tyrell Logistics — composite model + label propagation',
    prompt:
      'A report author connects to the composite model and publishes a derived report. ' +
      'Which TWO statements correctly describe how sensitivity labels and RLS behave in this downstream flow? ' +
      '(Select 2)',
    options: [
      'The derived report inherits the HIGHEST sensitivity label among all sources — "Confidential — Logistics" from the Gold Lakehouse — via automatic label propagation',
      'The derived report inherits the LOWEST label ("Internal — Logistics") because Fabric applies the least-restrictive label when multiple sources have different labels',
      'RLS roles defined on the semantic model apply to the derived report — a user without an RLS role assignment will see filtered (or no) data in the report',
      'RLS roles defined on the semantic model are NOT enforced in derived reports published to a different workspace; users in the target workspace see all rows',
      'The report author can manually assign a LOWER sensitivity label to the derived report to override the inherited "Confidential — Logistics" label if they have the downgrade permission'
    ],
    correct: [0, 2],
    explanation:
      'Microsoft Purview / MIP label propagation in Fabric applies the most restrictive (highest) label when content is derived from multiple labelled sources. ' +
      'Since the composite model sources include Gold (Confidential — Logistics), the derived report inherits "Confidential — Logistics". ' +
      'RLS roles are attached to the semantic model, not to the workspace. Any consumer of the model — including a derived report in another workspace — is subject to the same RLS evaluation against USERPRINCIPALNAME(). ' +
      'A user not mapped to an RLS role sees no data (not all data). ' +
      'Label downgrade requires an explicit justification step and is governed by the tenant\'s label-downgrade policy; it is not a free action.',
    whyWrong: {
      1: 'Fabric applies the HIGHEST (most restrictive) label when inheriting from multiple sources, not the lowest. "Least restrictive" inheritance would undermine the purpose of sensitivity labels in a governed tenant.',
      3: 'RLS is enforced at the semantic model layer, not the workspace layer. Derived reports in other workspaces still connect to the same model and are subject to the same role filters. Workspace membership does not bypass semantic model RLS.',
      4: 'Downgrading a sensitivity label requires an explicit justification that is captured in the audit log and is governed by tenant policy. It is not a silent override — and in a regulated tenant like Tyrell, such policies are typically restricted or audited heavily.'
    },
    source: SRC.sensitivity,
    tags: ['scenario', 'sensitivity-labels', 'label-propagation', 'rls', 'composite-model', 'maintain']
  }),

  // ─── scn-49 — Acme Capital Markets — deployment pipeline + variable libraries (3 Qs)

  single({
    id: 'scn-49-q1',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 3,
    scenarioId: 'scn-49',
    scenarioTitle: 'Acme Capital Markets — deployment pipeline + variable libraries',
    prompt:
      'Acme is migrating TradingAnalytics from hardcoded M parameters to Fabric Variable Libraries. ' +
      'How should the team BIND the per-stage connection strings so that each stage (Dev, Test, Prod) ' +
      'resolves its own Warehouse endpoint automatically at promotion time?',
    options: [
      'Define one Variable Library item per stage workspace; in the semantic model M code, reference the variable by name using the native Variable Library connector; configure deployment pipeline rules to swap the Variable Library binding per stage',
      'Keep the connection strings in Power Query parameter objects named exactly as the Variable Library keys; the deployment pipeline will auto-detect the names and inject stage values',
      'Store connection strings in the tenant admin settings under "Capacity settings → Variable overrides" and let the pipeline pick them up automatically',
      'Hard-code stage connection strings into three separate semantic model PBIP files (one per stage) and promote the correct file per stage'
    ],
    correct: 0,
    explanation:
      'Fabric Variable Libraries are workspace-scoped items that hold named key-value pairs. ' +
      'The semantic model\'s M code references a variable by its key name via the Variable Library connector (similar to referencing a parameter). ' +
      'Each stage workspace contains its own Variable Library item with stage-appropriate values (Dev Warehouse endpoint, Test Warehouse endpoint, Prod Warehouse endpoint). ' +
      'When the deployment pipeline promotes a stage, it carries the model definition but resolves variables from the TARGET workspace\'s Variable Library — achieving per-stage binding with zero manual rule configuration. ' +
      'Power Query named parameters do not auto-inject from Variable Libraries without an explicit connector reference. ' +
      '"Capacity settings → Variable overrides" does not exist — this is a distractor. ' +
      'Maintaining three PBIP files is the manual anti-pattern Variable Libraries are designed to replace.',
    whyWrong: {
      1: 'Power Query parameter names must be explicitly wired to Variable Library keys in the M code using the Variable Library connector. There is no automatic name-matching between PQ parameters and Variable Library keys.',
      2: '"Capacity settings → Variable overrides" is not a real Fabric feature. Variable Libraries are workspace-scoped items, not tenant/capacity settings.',
      3: 'Maintaining three separate PBIP files is the brittle, error-prone manual approach that Variable Libraries eliminate. It does not scale and creates divergence risk across stages.'
    },
    source: SRC.deployment,
    tags: ['scenario', 'variable-libraries', 'deployment-pipelines', 'binding', 'maintain']
  }),

  single({
    id: 'scn-49-q2',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    scenarioId: 'scn-49',
    scenarioTitle: 'Acme Capital Markets — deployment pipeline + variable libraries',
    prompt:
      'The hotfix (single DAX measure correction) must reach Prod without carrying the four in-flight Test changes. ' +
      'Which sequence CORRECTLY delivers the hotfix while preserving the in-flight work?',
    options: [
      'Fix the measure in Dev, promote Dev→Test (overwriting in-flight changes), then promote Test→Prod',
      'Fix the measure directly in the Prod workspace using the semantic model editor (bypassing the pipeline), then back-port the fix to Dev and Test separately to re-align the pipeline',
      'Create a separate hotfix branch in PBIP source control, apply the one-measure change, deploy directly from the hotfix branch to Prod via a pipeline rule, then merge the hotfix branch back to the main development branch',
      'Pause the deployment pipeline, apply the fix to all three stages simultaneously using the REST API, then resume the pipeline'
    ],
    correct: 2,
    explanation:
      'The standard hotfix pattern for Fabric deployment pipelines mirrors the Git hotfix branch model: ' +
      'create a branch from the Prod state (or a dedicated hotfix workspace), apply only the emergency change, deploy from that hotfix branch/workspace to Prod, then merge back to the main integration line (Dev/Test). ' +
      'This avoids polluting Prod with the four in-flight Test changes, maintains a clean audit trail, and re-aligns all stages after the merge. ' +
      'Promoting Dev→Test→Prod overwrites the in-flight changes into Prod, which is the exact risk the question describes. ' +
      'Editing directly in Prod (option B) works operationally but violates the deployment-pipeline governance contract and creates a diverged state that must be manually reconciled — also valid as an emergency break-glass, but the canonical answer for exam purposes is the branch pattern. ' +
      'A "pause pipeline + REST API patch all stages" does not exist as a Fabric feature.',
    whyWrong: {
      0: 'Promoting Dev→Test merges the four in-flight Test changes into Test\'s current state, and then promoting Test→Prod pushes all of them to Prod — exactly the unintended side-effect the scenario is trying to avoid.',
      1: 'Direct Prod edits bypass pipeline governance, create a state where Prod diverges from all lower stages, and require careful manual back-porting. While it can be used as an emergency break-glass, it is not the governed hotfix pattern and introduces reconciliation risk.',
      3: '"Pause + REST API patch all stages simultaneously" is not a Fabric feature. The pipeline deploy API promotes between stages — it does not expose a per-item patch endpoint that can target multiple stages at once.'
    },
    source: SRC.deployment,
    tags: ['scenario', 'deployment-pipelines', 'hotfix', 'selective-deploy', 'maintain']
  }),

  single({
    id: 'scn-49-q3',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'row-level-security',
    difficulty: 3,
    scenarioId: 'scn-49',
    scenarioTitle: 'Acme Capital Markets — deployment pipeline + variable libraries',
    prompt:
      'After the hotfix promotion to Prod, the team needs to re-validate that RLS role membership in Prod ' +
      'was not modified by the pipeline deploy. Which statement correctly describes how RLS role membership ' +
      'behaves in Fabric deployment pipeline promotions?',
    options: [
      'Deployment pipelines preserve RLS role definitions (expressions) but RESET role membership (assigned users/groups) on the target stage to match the source stage',
      'Deployment pipelines carry both RLS role definitions AND role membership from source to target, overwriting target membership',
      'Deployment pipelines carry RLS role definitions (DAX filter expressions) but do NOT carry role membership — member assignments in the target stage are preserved unchanged',
      'RLS role membership is stored in the Variable Library and is automatically swapped per stage like connection strings'
    ],
    correct: 2,
    explanation:
      'This is a critical exam trap. Fabric deployment pipelines promote the semantic model definition — which includes RLS role expressions (the DAX filter predicates) — but do NOT overwrite role membership in the target stage. ' +
      'Role membership (which users or groups are assigned to which roles) is a workspace-layer concern managed separately per stage. ' +
      'This means: after a promotion, the team must verify that the correct Prod users/groups are still assigned to the correct RLS roles in the Prod workspace, because they were never touched by the pipeline deploy. ' +
      'The team\'s concern (that promotion "wiped" membership) is unfounded — but the concern that a fresh promotion to a new Prod workspace would have NO membership is valid. ' +
      'RLS membership has nothing to do with Variable Libraries.',
    whyWrong: {
      0: 'The pipeline does NOT reset role membership to match the source. Target membership is left intact. If membership appears to have changed, the cause is a manual action or the target was newly created with no members at all.',
      1: 'Carrying membership from source to target would mean every promotion overwrites Prod user assignments with Dev user assignments — a serious security anti-pattern. Fabric explicitly does not do this.',
      3: 'Variable Libraries hold key-value pairs for connection strings and similar configuration. RLS role membership is a security construct managed via the workspace/model security panel, not Variable Libraries.'
    },
    source: SRC.rls,
    tags: ['scenario', 'deployment-pipelines', 'rls', 'role-membership', 'maintain']
  }),

  // ─── scn-50 — Initech — Eventhouse + KQL real-time anomaly detection (3 Qs)

  single({
    id: 'scn-50-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'kql',
    difficulty: 4,
    scenarioId: 'scn-50',
    scenarioTitle: 'Initech — Eventhouse + KQL real-time anomaly detection',
    prompt:
      'The reliability team needs to bucket readings into 5-minute windows and compute the z-score of each window\'s ' +
      'average reading against a rolling 24-hour baseline per (MachineId, SensorType). ' +
      'Which KQL pattern CORRECTLY implements the 5-minute tumbling window aggregation?',
    options: [
      '`SensorReadings | summarize avg(Reading) by MachineId, SensorType, bin(Timestamp, 5m)`',
      '`SensorReadings | summarize avg(Reading) by MachineId, SensorType, startofday(Timestamp)`',
      '`SensorReadings | summarize avg(Reading) by MachineId, SensorType | extend window = now()`',
      '`SensorReadings | make-series avg(Reading) on Timestamp from ago(5m) to now() step 5m by MachineId, SensorType`'
    ],
    correct: 0,
    explanation:
      '`bin(Timestamp, 5m)` is the standard KQL operator for fixed tumbling windows. It floor-rounds each timestamp to the nearest 5-minute boundary, so `summarize` groups all events in the same 5-minute bucket together. ' +
      'This is the canonical pattern for tumbling window aggregations in KQL. ' +
      '`startofday()` produces 24-hour windows, not 5-minute windows. ' +
      'The third option does not produce time windows at all — it computes a single aggregate per group with no time bucketing. ' +
      '`make-series` is appropriate for time-series analysis functions (anomaly_detection_fl, series_decompose) but its syntax produces a series array per group, not a row-per-window output suitable for direct z-score computation against a rolling baseline.',
    whyWrong: {
      1: '`startofday(Timestamp)` creates day-level buckets (24-hour windows). The requirement specifies 5-minute tumbling windows — this is off by a factor of 288.',
      2: 'This query has no time-windowing at all. `extend window = now()` appends a scalar timestamp column — it does not group events into time buckets. The result would be a single aggregate per (MachineId, SensorType) across all history.',
      3: '`make-series` is the right entry point for applying Kusto time-series ML functions (anomaly detection, forecasting). However, its output is an array-valued column per group, not one row per window — computing z-scores against a rolling baseline requires a row-per-window shape that `summarize + bin` produces cleanly.'
    },
    source: SRC.kql,
    tags: ['scenario', 'kql', 'bin', 'tumbling-window', 'summarize', 'prepare']
  }),

  single({
    id: 'scn-50-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'eventhouse',
    difficulty: 4,
    scenarioId: 'scn-50',
    scenarioTitle: 'Initech — Eventhouse + KQL real-time anomaly detection',
    prompt:
      'The team wants to materialize anomaly results into `SensorAnomalies` automatically as new data arrives in `SensorReadings`, ' +
      'without scheduling a recurring pipeline job. ' +
      'Which Fabric/KQL feature is purpose-built for this continuous materialisation requirement?',
    options: [
      'A Fabric Data Pipeline with a tumbling-window trigger set to 5-minute intervals, running a KQL command to insert anomaly rows into `SensorAnomalies`',
      'A KQL update policy on `SensorAnomalies` that defines a function transforming ingested `SensorReadings` rows — executed automatically by the Eventhouse ingestion engine for each new batch',
      'A Fabric Notebook scheduled every 5 minutes via a pipeline trigger that runs the z-score KQL and appends results to `SensorAnomalies`',
      'A Power BI dataflow that queries `SensorReadings` every 5 minutes and writes anomaly rows to `SensorAnomalies` via a connector'
    ],
    correct: 1,
    explanation:
      'A KQL update policy is the native Eventhouse mechanism for continuous, event-driven materialisation. ' +
      'You define a query function against the source table (`SensorReadings`) and attach it as an update policy on the target table (`SensorAnomalies`). ' +
      'Every time the Eventhouse ingestion engine commits a new batch to `SensorReadings`, it automatically evaluates the update-policy function and appends qualifying rows to `SensorAnomalies` — with no external scheduler, no pipeline, and no polling. ' +
      'A Data Pipeline tumbling trigger introduces scheduling latency and an external orchestration dependency. ' +
      'A Notebook on a 5-minute schedule has the same latency problem plus cold-start overhead. ' +
      'Power BI dataflows are an ingestion tool, not a real-time stream-processing primitive — they are not suitable for sub-minute materialisation.',
    whyWrong: {
      0: 'A 5-minute pipeline trigger is not continuous — it introduces up to 5 minutes of latency and relies on an external orchestrator. Update policies fire inline with ingestion, delivering near-real-time materialisation.',
      2: 'A scheduled notebook has cold-start overhead, scheduling jitter, and latency proportional to the schedule interval. It is also fragile if the notebook run duration exceeds the interval.',
      3: 'Power BI dataflows are not a stream-processing tool. They are batch-ingestion items that are not designed for sub-minute latency or event-driven writes to a KQL table.'
    },
    source: SRC.eventhouse,
    tags: ['scenario', 'eventhouse', 'update-policy', 'materialisation', 'kql', 'prepare']
  }),

  single({
    id: 'scn-50-q3',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'eventhouse',
    difficulty: 3,
    scenarioId: 'scn-50',
    scenarioTitle: 'Initech — Eventhouse + KQL real-time anomaly detection',
    prompt:
      'The team wants automatic Teams notifications whenever a new row is written to `SensorAnomalies`, ' +
      'with NO custom polling code or Azure Functions. ' +
      'Which Fabric feature BEST satisfies this requirement?',
    options: [
      'A Fabric Activator (Reflex) rule set on the `SensorAnomalies` KQL table that triggers a Teams notification when a new row matching a condition is detected',
      'A Power Automate cloud flow with a "When a new row is added" trigger on the Eventhouse KQL DB',
      'A Fabric Data Pipeline with a Wait activity that polls `SensorAnomalies | count` every 60 seconds and sends an HTTP request to a Teams webhook',
      'A Power BI alert on a dashboard card connected to `SensorAnomalies` that fires when the row count increases'
    ],
    correct: 0,
    explanation:
      'Fabric Activator (also called Reflex) is the native Fabric alerting primitive for event-driven rules on streaming data. ' +
      'It can monitor a KQL table for new rows matching a condition and trigger a pre-built Teams notification — entirely within Fabric, with no custom code, no polling, and no external functions. ' +
      'This is the purpose-built answer for "detect a condition in Eventhouse → alert in Teams without custom code." ' +
      'Power Automate with a KQL "new row" trigger can work but involves a connector outside Fabric and is not the Microsoft Learn canonical answer for this pattern. ' +
      'A pipeline polling every 60 seconds IS custom polling code (using a pipeline as a scheduler), which the requirement explicitly forbids. ' +
      'Power BI alerts fire on dashboard card thresholds, not on individual row writes — latency is minutes to hours, not seconds.',
    whyWrong: {
      1: 'Power Automate requires leaving the Fabric surface to a separate SaaS tool, involves a KQL connector that may require a premium licence, and is not the canonical exam answer for "Fabric native alerting on Eventhouse data."',
      2: 'Polling a `count` every 60 seconds is exactly the custom polling code the requirement forbids. It is also unreliable for high-throughput anomaly scenarios where multiple rows arrive between polls.',
      3: 'Power BI alerts operate on aggregated dashboard card values, not individual row inserts. They do not fire in real-time — Power BI data cache refresh intervals mean alerts can lag by minutes to hours after the anomaly lands in `SensorAnomalies`.'
    },
    source: SRC.eventhouse,
    tags: ['scenario', 'reflex', 'activator', 'eventhouse', 'alerting', 'teams', 'prepare']
  })

];
