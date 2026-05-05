import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const maintainMore: Question[] = [
  // ── Deployment pipelines (deeper) ────────────────────────────
  single({
    id: 'mx-001', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A team uses Git integration on the Development workspace and a deployment pipeline for promotion. A developer commits a measure change directly in the pbip repo and pushes to the main branch. What happens in the Development workspace?',
    options: [
      'The change appears in Development only after the team manually clicks "Update workspace" in the source control panel',
      'The change auto-syncs to Development immediately on every push',
      'The change auto-syncs to all three pipeline stages',
      'Git integration is read-only — the push is rejected'
    ],
    correct: 0,
    explanation: 'Fabric Git integration shows incoming changes as pending updates. The workspace owner must click "Update workspace" (or run a script) to apply them — there is no automatic write-through from Git to the workspace. Promotion to Test/Prod is still done via the deployment pipeline.',
    whyWrong: {
      1: 'Git integration is pull-on-demand for workspaces, not push-triggered auto-sync.',
      2: 'Git integration only binds to a single workspace (typically Dev). Other stages get content via the pipeline.',
      3: 'Git is fully read/write; pushes from a developer machine are accepted.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'git-integration']
  }),
  single({
    id: 'mx-002', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'Your team uses one branch per environment (dev, test, prod) with each branch connected to its own Fabric workspace. Promotion happens via pull requests between branches, NOT via deployment pipelines. What is the BIGGEST functional gap with this Git-only approach?',
    options: [
      'Branches cannot hold semantic models',
      'There is no built-in equivalent of deployment rules to swap connections per environment',
      'Workspaces cannot be Git-connected',
      'Reports cannot be source-controlled this way'
    ],
    correct: 1,
    explanation: 'Deployment pipelines provide deployment rules and parameter rules that swap data sources, connection strings, and parameter values per stage. A pure Git-branches model needs custom build steps (e.g., updating expressions.tmdl in CI) to achieve the same swap.',
    whyWrong: {
      0: 'Branches can hold any pbip-supported item including semantic models.',
      2: 'Workspaces are Git-connectable; that is in fact the basis of this pattern.',
      3: 'Reports are fully source-controlled in pbip format.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'git-branches', 'environments']
  }),
  single({
    id: 'mx-003', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A production-only bug requires a hotfix. The Dev workspace is mid-feature and cannot be promoted. Which workflow is the SAFEST way to apply the hotfix?',
    options: [
      'Edit the report directly in the Production workspace',
      'Create a hotfix branch from the prod-aligned commit, fix, deploy via a temporary pipeline, then back-merge to dev',
      'Backward deploy Prod → Test, then forward deploy Test → Prod immediately',
      'Selective-deploy the in-progress Dev item to Prod'
    ],
    correct: 1,
    explanation: 'Hotfix-from-prod-tag, fix on isolated branch, deploy through a clean pipeline, then back-merge into dev is the canonical pattern. It preserves traceability, keeps in-flight Dev work out of Prod, and avoids drift between Git and the workspaces.',
    whyWrong: {
      0: 'Editing Prod directly creates immediate drift between source control and the workspace — almost always wrong.',
      2: 'Round-tripping does not isolate the fix from in-progress Dev work and risks regressing the bug.',
      3: 'Selective-deploying an in-progress Dev item promotes unfinished code to Prod.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'hotfix', 'git-integration']
  }),
  multi({
    id: 'mx-004', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'You are promoting a Dataflow Gen2 from Test to Production via a deployment pipeline. Which behaviors should you EXPECT? Select all that apply.',
    options: [
      'Connections are NOT promoted — the target stage uses its own bound connections',
      'Linked semantic-model dependencies must already exist on the target or the deploy fails for those items',
      'Default destinations (Lakehouse / Warehouse) bind to the target-stage equivalent if the workspace pairing is configured',
      'A Gen2 dataflow gets a new item ID on the target, breaking any external API references',
      'Power Query parameters can be overridden by deployment rules on the target stage'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Connections are environment-bound and never promoted with the artifact. Default destinations re-bind across paired workspaces. Parameter rules on the target stage override Power Query parameters. Missing dependencies fail individual items but do not block the whole deploy.',
    whyWrong: {
      3: 'Deployment pipelines preserve the item ID across stages — that is precisely the property that makes external API references stable across promotions.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'dataflow-gen2', 'promotion-edge-cases']
  }),
  multi({
    id: 'mx-005', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'You are deploying a Lakehouse with OneLake shortcuts (to ADLS Gen2 and another workspace\'s Lakehouse) from Test to Production via a deployment pipeline. Which statements are TRUE?',
    options: [
      'Lakehouse metadata (tables, schema, shortcut definitions) is promoted',
      'Shortcut TARGETS are NOT automatically swapped — they still point to the original test sources unless rebound',
      'Underlying Delta files in OneLake are copied to a Production OneLake location',
      'Shortcut connections require deployment rules or post-deploy rebinding to point at production data',
      'The SQL analytics endpoint regenerates automatically against the Production-stage Lakehouse'
    ],
    correct: [0, 1, 3, 4],
    explanation: 'Pipelines promote the Lakehouse object and its shortcut definitions, but the data and shortcut targets are not magically remapped. Shortcuts retain their original URLs unless explicitly rebound (often via parameterized or scripted post-deploy steps). The SQL analytics endpoint is auto-provisioned per Lakehouse.',
    whyWrong: {
      2: 'Pipelines move metadata, not data. The Production Lakehouse starts empty (or relies on shortcuts/ingestion) — Delta files are not copied.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'lakehouse', 'shortcuts', 'edge-cases']
  }),
  // ── Deployment rules / parameters ─────────────────────────────
  single({
    id: 'mx-006', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'A semantic model uses a parameterized M expression for the SQL Server name. Which deployment-pipeline mechanism should you use to swap that value per stage?',
    options: [
      'Data source rule',
      'Parameter rule',
      'Connection rule',
      'Workspace rule'
    ],
    correct: 1,
    explanation: 'Parameter rules override the value of an M parameter on deploy into a stage. Data source rules swap the connection-string for non-parameterized sources. Choose the rule that matches how the source was authored.',
    whyWrong: {
      0: 'Data source rules apply when the connection is hardcoded; with a parameter, parameter rules are the right surface.',
      2: '"Connection rule" is not a distinct rule type — there are data source rules and parameter rules.',
      3: 'There is no "workspace rule" type in deployment pipelines.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'parameter-rules']
  }),
  multi({
    id: 'mx-007', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'Which of the following are ALWAYS swapped or scoped per stage by deployment pipelines without manual configuration? Select all that apply.',
    options: [
      'Workspace ID and item IDs',
      'OneLake URLs that point at the deployed item itself',
      'SQL connection strings inside semantic models',
      'M parameter values',
      'Lakehouse shortcut targets'
    ],
    correct: [0, 1],
    explanation: 'The pipeline guarantees the workspace and item identity per stage and rewires intra-workspace OneLake URLs. SQL connections, M parameters, and shortcut targets all require explicit deployment rules or post-deploy steps — they are NOT auto-swapped.',
    whyWrong: {
      2: 'SQL connection strings require a data source rule on the target stage; otherwise the artifact carries the source-stage value.',
      3: 'M parameter values require a parameter rule on the target; default behavior is to keep the source value.',
      4: 'Shortcut targets retain their original URL across stages and must be rebound manually or via script.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'rules', 'what-does-not-swap']
  }),
  single({
    id: 'mx-008', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'A Power BI report is deployed Dev → Test, but the report\'s semantic model lives in a DIFFERENT workspace that is NOT on this pipeline. What happens to the binding on Test?',
    options: [
      'The report on Test still binds to the same external semantic model (no rebinding)',
      'The deploy fails because the model is not on the same pipeline',
      'A copy of the semantic model is automatically cloned into the Test workspace',
      'The report binding is broken until manually reconfigured'
    ],
    correct: 0,
    explanation: 'Cross-workspace dataset references are preserved across deployments. The Test report continues pointing at the same external model unless you author a deployment rule to rebind it. This is a common mistake when the model lives in a "shared model" workspace not part of the pipeline.',
    whyWrong: {
      1: 'Deploys do not fail on cross-workspace references; they pass through.',
      2: 'There is no automatic clone of external dependencies.',
      3: 'The binding is preserved, not broken — that is the issue: Test reports may end up reading Dev data.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'cross-workspace', 'shared-model']
  }),
  single({
    id: 'mx-009', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'Custom parameters were added to a semantic model AFTER the initial deploy, and a parameter rule was created on the Production stage. The next deploy completes successfully but the parameter value on Prod still equals the Dev value. Most likely cause?',
    options: [
      'Parameter rules apply only to the next FULL redeploy of the item',
      'The rule references the parameter by display name; the M code uses a different internal name',
      'Parameter rules require XMLA Read-Write to take effect',
      'Parameter rules only fire on backward deployments'
    ],
    correct: 1,
    explanation: 'Parameter rules bind by the M parameter NAME. If the rule was authored against an old or display name that does not match the actual M parameter identifier, the rule silently does nothing on deploy. Always verify name consistency between the rule and expressions.tmdl / Power Query.',
    whyWrong: {
      0: 'Rules apply on each deploy, including incremental ones.',
      2: 'XMLA Read-Write is unrelated to deployment-rule execution.',
      3: 'Parameter rules apply to forward deployments as well as backward.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'custom-parameters', 'troubleshooting']
  }),
  // ── RLS edge cases ────────────────────────────────────────────
  single({
    id: 'mx-010', domain: 'maintain', subtopic: 'security-rls', difficulty: 3,
    prompt: 'Which statement BEST distinguishes static RLS from dynamic RLS?',
    options: [
      'Static RLS uses hardcoded filter values (e.g., [Region]="EU"); dynamic RLS resolves the filter at query time using DAX functions like USERPRINCIPALNAME()',
      'Static RLS is enforced on import models; dynamic RLS only works on DirectQuery',
      'Static RLS requires a security table; dynamic RLS does not',
      'Static RLS is faster because it is precomputed at refresh time'
    ],
    correct: 0,
    explanation: 'Static RLS encodes the filter literally per role, requiring one role per slice (EU, US, APAC). Dynamic RLS uses one role with a runtime-evaluated filter (commonly via a Users dim and USERPRINCIPALNAME()), so adding users does not require new roles.',
    whyWrong: {
      1: 'Both work on Import, DirectQuery, and Direct Lake models.',
      2: 'It is the OPPOSITE: dynamic RLS typically uses a security/users table; static does not.',
      3: 'RLS filters are not precomputed at refresh; both styles evaluate at query time.'
    },
    source: SRC.rls,
    tags: ['rls', 'static-vs-dynamic']
  }),
  single({
    id: 'mx-011', domain: 'maintain', subtopic: 'security-rls', difficulty: 3,
    prompt: 'You assign an Azure AD security group "EU Sales Team" to the EU role of a semantic model. A new hire is added to the AD group via her manager. When does she gain access?',
    options: [
      'Immediately on her next report load — group membership resolves at query time',
      'Only after the semantic model is refreshed',
      'Only after a tenant admin manually re-syncs role assignments',
      'Only after she is also added directly to the workspace'
    ],
    correct: 0,
    explanation: 'RLS role membership inheritance from AAD groups is resolved at query time against AAD. Adding a user to a mapped group grants them the role on her next session, with no model refresh or admin action required.',
    whyWrong: {
      1: 'Refresh updates DATA, not security mappings.',
      2: 'No manual sync is required — AAD is queried live.',
      3: 'For RLS via AAD groups, a separate workspace add is not needed (though she still needs Build/Read on the model itself, typically inherited by app or workspace).'
    },
    source: SRC.rls,
    tags: ['rls', 'aad-groups', 'inheritance']
  }),
  single({
    id: 'mx-012', domain: 'maintain', subtopic: 'security-rls', difficulty: 5,
    prompt: 'You build a composite model that imports a Sales table locally AND references a remote Direct Lake "Customer 360" semantic model via DirectQuery for Power BI datasets. RLS is defined on the remote model. Which statement is TRUE?',
    options: [
      'RLS from the remote model is honored — chained RLS propagates through the composite',
      'RLS from the remote model is bypassed; the composite always sees all rows',
      'RLS works only if you redefine the same roles locally',
      'Composite models cannot reference remote models with RLS — the connection is blocked'
    ],
    correct: 0,
    explanation: 'Composite models with chained DirectQuery to a remote model honor the remote model\'s RLS via the user\'s identity. The remote model evaluates its roles for that user; the composite respects the resulting filter set.',
    whyWrong: {
      1: 'RLS is NOT bypassed; the security model relies on chained enforcement.',
      2: 'You do not need to redefine roles locally — they execute on the remote model.',
      3: 'Composite-on-remote is supported and a standard pattern.'
    },
    source: SRC.rls,
    tags: ['rls', 'composite-models', 'chained-rls']
  }),
  multi({
    id: 'mx-013', domain: 'maintain', subtopic: 'security-rls', difficulty: 5,
    prompt: 'A dynamic RLS implementation using a 2M-row Users dim is causing visual queries to take 8-12 seconds. Which optimizations are likely to help? Select all that apply.',
    options: [
      'Mark the Users dim as a slowly-changing/static table and reduce columns to only those needed for security',
      'Replace the bidirectional Users → Sales relationship with a single-direction relationship plus an explicit CALCULATETABLE in the role filter',
      'Add a calculated column on Sales that hashes USERPRINCIPALNAME() at refresh',
      'Pre-aggregate user-to-territory mapping into a narrow security bridge table',
      'Use TREATAS in the role filter to push a virtual relationship instead of a physical one when the user-to-fact mapping is sparse'
    ],
    correct: [0, 1, 3, 4],
    explanation: 'Trim the security dim, prefer single-direction filters with CALCULATETABLE, materialize a narrow bridge, and use TREATAS for sparse mappings — all standard RLS performance levers. Hashing USERPRINCIPALNAME() at refresh is wrong because the user identity is not known until query time.',
    whyWrong: {
      2: 'USERPRINCIPALNAME() resolves at query time, not at refresh time. A calculated column cannot capture the runtime user.'
    },
    source: SRC.rls,
    tags: ['rls', 'performance', 'optimization']
  }),
  // ── OLS interaction with RLS and reports ─────────────────────
  single({
    id: 'mx-014', domain: 'maintain', subtopic: 'security-ols', difficulty: 4,
    prompt: 'A user is in two roles. Role A has OLS that hides the [Salary] column. Role B has OLS that grants access to [Salary]. What does the user see for [Salary]?',
    options: [
      'The column is visible — multiple-role union grants the LEAST restrictive OLS',
      'The column is hidden — OLS denials override grants across roles',
      'A NULL value with the column header still visible',
      'The model fails to open — OLS conflicts are not allowed'
    ],
    correct: 0,
    explanation: 'OLS, like RLS, combines roles via UNION. If ANY role grants access, the user sees the object. There is no deny-overrides semantic in OLS — the most permissive role wins.',
    whyWrong: {
      1: 'OLS does not have deny-overrides. Union semantics apply.',
      2: 'OLS hides the entire object; it does not return NULL with a visible header.',
      3: 'OLS conflicts are resolved by union, not by failing the model load.'
    },
    source: SRC.ols,
    tags: ['ols', 'multi-role', 'union-semantics']
  }),
  single({
    id: 'mx-015', domain: 'maintain', subtopic: 'security-ols', difficulty: 4,
    prompt: 'A report visual references a measure [Total Margin] that internally uses a column [Margin Pct] hidden by OLS for the current user. What happens when the user opens the report?',
    options: [
      'The visual renders normally — measures abstract away their column dependencies',
      'The visual shows an error because the underlying [Margin Pct] reference fails',
      'The visual renders BLANK silently',
      'The measure auto-drops the [Margin Pct] reference at runtime'
    ],
    correct: 1,
    explanation: 'OLS is enforced at the engine level. A measure that touches a hidden object errors out for users who lack access — there is no transparent fallback. This is why OLS scope must include all dependency chains, not just the column.',
    whyWrong: {
      0: 'Measures do NOT abstract away OLS — the dependency is enforced.',
      2: 'The visual surfaces an error, not a silent BLANK.',
      3: 'There is no automatic reference-rewriting at runtime.'
    },
    source: SRC.ols,
    tags: ['ols', 'measures', 'enforcement']
  }),
  multi({
    id: 'mx-016', domain: 'maintain', subtopic: 'security-ols', difficulty: 5,
    prompt: 'You need both RLS (rows by region) AND OLS (hide [Salary] from non-HR) on the same semantic model. Which statements are TRUE?',
    options: [
      'RLS and OLS can coexist on the same model and are evaluated together for each user',
      'OLS must be authored via Tabular Editor or ALM Toolkit because the Power BI Desktop UI does not surface OLS',
      'A user in the HR role plus a Region role sees only their region\'s rows with [Salary] visible',
      'OLS rules can reference DAX security functions like USERPRINCIPALNAME() inline',
      'OLS applies to roles, so a user must be a member of at least one role to be subject to OLS'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'RLS and OLS coexist and combine. OLS is a per-role property (None/Read/Default) on tables/columns, authored via TE/ALM Toolkit because PBI Desktop has no OLS UI. OLS applies to role members, and an HR+Region user sees their rows with the protected column visible.',
    whyWrong: {
      3: 'OLS uses simple Read/None grants per role on tables/columns — it does not accept inline DAX expressions like USERPRINCIPALNAME(). Dynamic behavior is achieved via role membership, not OLS expression syntax.'
    },
    source: SRC.ols,
    tags: ['ols', 'rls', 'tabular-editor']
  }),
  // ── Sensitivity labels ───────────────────────────────────────
  single({
    id: 'mx-017', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    prompt: 'A Lakehouse is labeled "Highly Confidential". A semantic model is built on top of the SQL analytics endpoint of that Lakehouse with NO label set. A report is then built on the semantic model. Per default Fabric behavior, what label does the report inherit?',
    options: [
      'No label — labels do not propagate downstream',
      '"Highly Confidential" — label inheritance flows along data lineage from upstream items',
      '"General" — defaults are applied at every untagged item',
      '"Highly Confidential" only on the model, not the report'
    ],
    correct: 1,
    explanation: 'Fabric supports downstream sensitivity-label inheritance: if an upstream item is labeled, downstream items (semantic model, report) inherit the most restrictive label encountered in the lineage when they have none set explicitly.',
    whyWrong: {
      0: 'Labels DO propagate downstream — that is one of the central guarantees of MIP-aware Fabric.',
      2: 'Defaults are not auto-applied per-item; inheritance flows from upstream.',
      3: 'Inheritance reaches the report too, not just the model.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity', 'inheritance', 'lineage']
  }),
  single({
    id: 'mx-018', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    prompt: 'A user exports an analyze-in-Excel pivot from a "Confidential" semantic model. The label should travel and the file should be encrypted such that only members of the "Finance" group can open it. Which is required for the encryption to actually be enforced on the resulting .xlsx?',
    options: [
      'The MIP label must have an associated encryption / protection policy that targets the Finance group',
      'The user must enable Bitlocker on the device',
      'The Fabric capacity must be set to "encrypted-export"',
      'No action — labels always encrypt by default'
    ],
    correct: 0,
    explanation: 'Sensitivity labels are policy carriers; encryption only happens if the label\'s protection settings (in Purview) are configured with encryption + the target audience. Without that, the label is metadata only.',
    whyWrong: {
      1: 'Bitlocker protects the disk, not the file across recipients.',
      2: 'There is no such per-capacity setting.',
      3: 'Labels do NOT auto-encrypt — encryption is opt-in via Purview policy.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity', 'mip', 'encryption']
  }),
  multi({
    id: 'mx-019', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    prompt: 'Which behaviors does Fabric / MIP integration enforce when a user exports report data from a labeled semantic model? Select all that apply.',
    options: [
      'Labels travel with PowerPoint, Excel, and PDF exports',
      'A user without rights to apply or remove the label cannot downgrade it on the export',
      'Audit events are written to the M365 Unified Audit Log including the label name',
      'Print To PDF from a desktop browser strips the label completely',
      'Embed in another tenant strips the label automatically'
    ],
    correct: [0, 1, 2],
    explanation: 'Labels propagate to standard Office and PDF exports, downgrade requires explicit permission, and label-related actions emit auditable events. Print-to-PDF and cross-tenant embed do NOT silently strip labels — labels are designed to persist across these boundaries when MIP-aware tooling is in play.',
    whyWrong: {
      3: 'Print-to-PDF preserves labels when invoked through MIP-aware paths; the design goal is persistence.',
      4: 'Cross-tenant embed does not silently strip the label — protection follows the data per the label\'s policy.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity', 'export', 'audit']
  }),
  // ── XMLA endpoint ────────────────────────────────────────────
  single({
    id: 'mx-020', domain: 'maintain', subtopic: 'xmla-endpoint', difficulty: 4,
    prompt: 'You connect Tabular Editor 2 to a Fabric semantic model via XMLA, add a new measure, and click Save. Save fails with "Endpoint is read-only". What capacity-level change is required?',
    options: [
      'Switch the capacity\'s XMLA Endpoint setting from Read to Read-Write',
      'Increase the capacity SKU to F64 or higher',
      'Enable the "Allow third-party tools" tenant setting and re-authenticate',
      'Apply a sensitivity label of "General" or lower'
    ],
    correct: 0,
    explanation: 'The XMLA endpoint mode is a per-capacity setting (Off / Read / Read-Write). Authoring with Tabular Editor / ALM Toolkit requires Read-Write. SKU size, third-party-tool flags, and sensitivity labels are unrelated.',
    whyWrong: {
      1: 'XMLA mode is independent of SKU; F-series capacities support XMLA without a minimum size for write.',
      2: 'There is no "third-party tools" tenant setting governing XMLA mode.',
      3: 'Sensitivity labels do not gate XMLA write.'
    },
    source: SRC.xmla,
    tags: ['xmla', 'tabular-editor', 'capacity']
  }),
  single({
    id: 'mx-021', domain: 'maintain', subtopic: 'xmla-endpoint', difficulty: 4,
    prompt: 'You want to script "create 12 calculation-group items, one per fiscal period" against a semantic model in CI. Which approach is most appropriate?',
    options: [
      'Use Tabular Editor 2/3 in CLI mode with a C# script targeting the model via XMLA',
      'Use the Power BI REST API\'s /reports endpoint',
      'Edit the .pbix in Power BI Desktop and re-publish manually',
      'Use the Fabric REST API\'s lakehouses endpoint'
    ],
    correct: 0,
    explanation: 'Tabular Editor\'s C# scripting (run via `TabularEditor.exe -S script.csx`) against the XMLA endpoint is the canonical pattern for repeatable model authoring from CI.',
    whyWrong: {
      1: '/reports manages report items, not model schema.',
      2: 'Manual PBIX edits are not scriptable or CI-friendly.',
      3: 'Lakehouse endpoints have nothing to do with semantic-model schema.'
    },
    source: SRC.xmla,
    tags: ['xmla', 'tabular-editor', 'scripting', 'ci']
  }),
  multi({
    id: 'mx-022', domain: 'maintain', subtopic: 'xmla-endpoint', difficulty: 4,
    prompt: 'Which Fabric semantic-model operations REQUIRE the XMLA endpoint to be in Read-Write mode? Select all that apply.',
    options: [
      'Deploying a model from Tabular Editor or ALM Toolkit',
      'Running TMSL CreateOrReplace via SSMS to redeploy a database',
      'Issuing a manual XMLA refresh via SSMS or a script',
      'Browsing the model in Excel via Analyze in Excel',
      'Querying a perspective via DAX Studio'
    ],
    correct: [0, 1, 2],
    explanation: 'Authoring deploys (TE/ALM Toolkit), TMSL DDL, and XMLA-driven refresh are all WRITE operations requiring Read-Write mode. Read-only consumption (Excel browse, DAX Studio queries) only needs Read.',
    whyWrong: {
      3: 'Analyze in Excel performs queries, not writes — it works against Read mode.',
      4: 'DAX Studio queries are read-only and run against Read mode.'
    },
    source: SRC.xmla,
    tags: ['xmla', 'read-vs-write']
  }),
  // ── Governance / monitoring ──────────────────────────────────
  single({
    id: 'mx-023', domain: 'maintain', subtopic: 'governance', difficulty: 4,
    prompt: 'A Fabric capacity is showing user-visible delays. The Capacity Metrics app reports significant "carryforward" / "smoothing" of background CU. What does this MEAN, and what should you do FIRST?',
    options: [
      'Smoothing spreads spike CU across up to 24 hours; persistent carryforward indicates sustained over-consumption — investigate the heaviest items first, not the spike',
      'Smoothing means the capacity was unhealthy; restart it immediately',
      'Carryforward indicates a billing error; open a support ticket',
      'It means the SKU is too small; resize first and analyze later'
    ],
    correct: 0,
    explanation: 'Fabric smooths interactive spikes over 5 minutes and background workloads over up to 24 hours. Carryforward growing day over day means sustained workloads exceed the SKU on average — the right first step is to identify the top consumers, not blindly resize.',
    whyWrong: {
      1: 'Restarting a capacity does not address the underlying workload imbalance.',
      2: 'It is a normal mechanic, not a billing error.',
      3: 'Resizing without diagnosis is wasteful; a runaway item may dominate regardless of SKU.'
    },
    source: SRC.governance,
    tags: ['governance', 'smoothing', 'throttling', 'capacity-metrics']
  }),
  single({
    id: 'mx-024', domain: 'maintain', subtopic: 'governance', difficulty: 3,
    prompt: 'A Fabric capacity has autoscale enabled. Which statement BEST describes what autoscale will do during sustained over-consumption?',
    options: [
      'Add v-cores temporarily, billed by the minute, up to the configured maximum',
      'Move the workload to a different region',
      'Pause non-priority items to free CU',
      'Throttle interactive operations until usage drops'
    ],
    correct: 0,
    explanation: 'Autoscale (where available) elastically adds v-cores up to a customer-set max during sustained CU pressure, billed per minute. It does not pause workloads, redirect regions, or replace throttling — it complements them.',
    whyWrong: {
      1: 'Autoscale does not change region.',
      2: 'It does not pause items; that is a manual or policy action.',
      3: 'Throttling is the protective mechanism that kicks in when capacity is exceeded WITHOUT (or beyond) autoscale.'
    },
    source: SRC.governance,
    tags: ['governance', 'autoscale', 'capacity']
  }),
  // ── Ordering ──────────────────────────────────────────────────
  order({
    id: 'mx-025', domain: 'maintain', subtopic: 'governance', difficulty: 4,
    prompt: 'Order the steps to set up a Fabric Activator (Reflex) alert that posts a Teams message when a KPI crosses a threshold, end-to-end with proper permissions.',
    options: [
      'Verify you have Member or Contributor on the workspace that will host the Activator item',
      'Create or open a streaming source (e.g., Eventstream / Reflex-supported event) and connect it to a new Activator item',
      'Define an object/property in the Activator and set the threshold trigger condition',
      'Add a Teams action, granting the Activator the connection to post to the target channel',
      'Test by injecting a synthetic event that crosses the threshold and verify the Teams post arrives'
    ],
    explanation: 'Permissions first, then connect the source, then define the property/condition, then bind the action with its connection, and finally validate with a synthetic event. Skipping the synthetic test is a common reason production alerts silently fail.',
    source: SRC.governance,
    tags: ['governance', 'activator', 'reflex', 'permissions']
  })
];
