import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const reinforcement: Question[] = [
  // ── Copilot for Fabric / Data Engineer ───────────────────────
  single({
    id: 'rx-001', domain: 'prepare', subtopic: 'copilot', difficulty: 3,
    prompt: 'A data engineer opens a Fabric notebook and asks Copilot to "create a PySpark cell that loads the bronze.orders Delta table, deduplicates on order_id, and writes to silver.orders." What does Copilot for Data Engineering produce?',
    options: [
      'A natural-language summary only — code generation requires Copilot Pro license',
      'A PySpark code cell inserted in the notebook that the engineer can run, edit, or reject',
      'A Power Query M script, since Copilot in Fabric only supports M',
      'A pull request opened against the workspace Git integration'
    ],
    correct: 1,
    explanation: 'Copilot for Data Engineering generates PySpark/SparkSQL code cells inline in the notebook. The engineer reviews, edits, and runs the cell — Copilot proposes; the human commits.',
    whyWrong: {
      0: 'Copilot in Fabric is included with the F SKU (F64+ for full Copilot or shared capacity); it generates code, not just summaries.',
      2: 'Copilot supports PySpark and SparkSQL in notebooks, not just M. M is generated in Dataflow Gen2 Copilot.',
      3: 'Copilot writes into the notebook directly; it does not auto-open Git PRs.'
    },
    source: SRC.notebooks,
    tags: ['copilot', 'notebooks', 'pyspark']
  }),
  single({
    id: 'rx-002', domain: 'semantic', subtopic: 'copilot', difficulty: 3,
    prompt: 'A business user opens a Power BI report on a Direct Lake semantic model and asks Copilot, "What were total sales by region last quarter?" Which Copilot capability handles this?',
    options: [
      'Copilot for Data Science generates a Python notebook',
      'Copilot for Power BI answers via the semantic model using DAX, returning a visual or narrative',
      'Copilot writes a T-SQL query against the Warehouse SQL endpoint',
      'Copilot launches a KQL query against an Eventhouse'
    ],
    correct: 1,
    explanation: 'Copilot for Power BI uses the semantic model\'s metadata (tables, measures, relationships) to translate natural-language questions into DAX and present results as a visual or narrative summary.',
    whyWrong: {
      0: 'Data Science Copilot is for notebooks/ML, not report Q&A.',
      2: 'Q&A goes through the semantic model\'s DAX engine, not raw T-SQL.',
      3: 'KQL Copilot is for Eventhouse / Real-Time Intelligence, not Power BI report Q&A.'
    },
    source: SRC.semanticModel,
    tags: ['copilot', 'power-bi', 'qna']
  }),
  multi({
    id: 'rx-003', domain: 'prepare', subtopic: 'copilot', difficulty: 4,
    prompt: 'Which statements about KQL Copilot in a Real-Time Intelligence Eventhouse are TRUE?',
    options: [
      'It can translate a natural-language prompt into a KQL query against the active KQL Database schema',
      'It can explain an existing KQL query in plain English',
      'It can fix syntax errors and suggest performance improvements',
      'It will automatically execute and persist generated queries as scheduled jobs without user action'
    ],
    correct: [0, 1, 2],
    explanation: 'KQL Copilot supports prompt-to-KQL, query explanation, and fix/optimize suggestions — all surfaced in the queryset for human review. It never auto-executes destructive or scheduled work without the user explicitly running the suggestion.',
    whyWrong: {
      3: 'Copilot proposes queries; persisting them as scheduled update policies or set-or-append jobs requires explicit user action.'
    },
    source: SRC.kql,
    tags: ['copilot', 'kql', 'eventhouse']
  }),
  multi({
    id: 'rx-004', domain: 'maintain', subtopic: 'copilot', difficulty: 4,
    prompt: 'Which statements describe what Copilot for Fabric CANNOT do today?',
    options: [
      'Author a complete production-grade semantic model with no human review',
      'Bypass workspace permissions to read items the user is not entitled to see',
      'Generate a draft DAX measure based on a natural-language description',
      'Be enabled or disabled per-tenant or per-workspace by Fabric administrators'
    ],
    correct: [0, 1],
    explanation: 'Copilot is an assistant — it drafts code, measures, narratives, and queries, but always within the calling user\'s permissions and always for human review. It is not an unattended autonomous agent and it cannot escalate access.',
    whyWrong: {
      2: 'Drafting DAX from natural language is a core Copilot capability.',
      3: 'Tenant admins can scope Copilot in Fabric tenant settings — that is a real and supported control.'
    },
    source: SRC.governance,
    tags: ['copilot', 'governance', 'permissions']
  }),
  // ── ML Experiments / MLflow integration ──────────────────────
  single({
    id: 'rx-005', domain: 'prepare', subtopic: 'ml-experiments', difficulty: 3,
    prompt: 'A data scientist trains a model in a Fabric notebook and wants every parameter, metric, and artifact tracked. Which Fabric item type is the canonical container for these tracked runs?',
    options: ['ML Model', 'ML Experiment', 'Notebook', 'Lakehouse'],
    correct: 1,
    explanation: 'A Fabric ML Experiment is the MLflow-compatible container that holds runs (each with parameters, metrics, tags, and artifacts). ML Model is a separate item that holds registered, versioned models.',
    whyWrong: {
      0: 'ML Model holds registered model versions, not the per-run training history.',
      2: 'A notebook is the code surface; runs and metrics persist in the Experiment, not in the notebook itself.',
      3: 'Lakehouse stores data, not MLflow tracking metadata.'
    },
    source: SRC.fabricArch,
    tags: ['mlflow', 'experiments', 'tracking']
  }),
  order({
    id: 'rx-006', domain: 'prepare', subtopic: 'ml-experiments', difficulty: 4,
    prompt: 'Place the steps of an MLflow-tracked Fabric workflow in execution order, from initial training to in-database scoring.',
    options: [
      'Open a Fabric notebook and start an MLflow run inside an ML Experiment',
      'Log parameters, metrics, and the trained artifact to the run',
      'Pick the best run and register its artifact as a versioned ML Model item',
      'Call PREDICT in T-SQL against the registered ML Model to score new rows in the Warehouse'
    ],
    explanation: 'The MLflow flow in Fabric: train inside an Experiment run, log parameters/metrics/artifacts to that run, register the chosen artifact as an ML Model version, then consume the registered model in T-SQL with PREDICT (or in Spark with the same registry).',
    source: SRC.fabricArch,
    tags: ['mlflow', 'register-model', 'predict', 'ordering']
  }),
  multi({
    id: 'rx-007', domain: 'prepare', subtopic: 'ml-experiments', difficulty: 4,
    prompt: 'Which statements about scoring a registered Fabric ML Model with PREDICT in T-SQL are TRUE?',
    options: [
      'PREDICT is exposed as a T-SQL function in the Fabric Warehouse / SQL endpoint surface',
      'PREDICT references the ML Model by name and version and applies it row-wise to a query result',
      'PREDICT can be called from a notebook via SparkSQL using the same model registry',
      'PREDICT requires the model to be re-trained inside the Warehouse before each scoring call'
    ],
    correct: [0, 1, 2],
    explanation: 'Fabric integrates PREDICT into the T-SQL surface for in-database scoring of registered ML Models, and the same model registry can be referenced from Spark via SparkSQL/PySpark. Re-training per call is not how it works — the registered model is loaded and applied.',
    whyWrong: {
      3: 'PREDICT loads an already-registered model artifact; training and scoring are deliberately separate stages.'
    },
    source: SRC.tsql,
    tags: ['predict', 'tsql', 'ml-model', 'scoring']
  }),
  // ── Real-Time Dashboard / Reflex (Activator) ─────────────────
  single({
    id: 'rx-008', domain: 'prepare', subtopic: 'reflex', difficulty: 2,
    prompt: 'Which Fabric item watches data for user-defined conditions and triggers downstream actions (Teams message, email, Power Automate flow) when those conditions fire?',
    options: ['Real-Time Dashboard', 'Reflex (Activator)', 'Eventstream', 'Data pipeline'],
    correct: 1,
    explanation: 'Reflex (Data Activator) is the no-code condition-and-action item. It listens to a stream or a Power BI visual, evaluates user-defined rules, and fires actions when the rules are satisfied.',
    whyWrong: {
      0: 'Real-Time Dashboard visualizes KQL data; it does not itself trigger external actions on conditions.',
      2: 'Eventstream routes/transforms streaming events; it is the upstream pipe, not the rule engine.',
      3: 'Pipelines orchestrate scheduled or chained activities, not condition-based event reactions.'
    },
    source: SRC.fabricArch,
    tags: ['reflex', 'activator', 'triggers']
  }),
  multi({
    id: 'rx-009', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt: 'Which sources can drive a Reflex (Activator) trigger?',
    options: [
      'A Power BI report visual — alert when the visual\'s value crosses a threshold',
      'An Eventstream feeding live telemetry into Reflex',
      'A KQL Database table queried on a polling schedule',
      'A Lakehouse static reference table queried once at item creation'
    ],
    correct: [0, 1, 2],
    explanation: 'Reflex consumes Power BI visuals, Eventstreams, and KQL Database queries (polled on a schedule). It is purpose-built to detect changes over time, so a static one-shot read of a reference table is not a Reflex source pattern.',
    whyWrong: {
      3: 'Reflex needs evolving data to detect a triggering change; a single static read at creation is not a supported event source.'
    },
    source: SRC.fabricArch,
    tags: ['reflex', 'activator', 'sources']
  }),
  single({
    id: 'rx-010', domain: 'prepare', subtopic: 'reflex', difficulty: 3,
    prompt: 'A Real-Time Dashboard is built over a KQL Database. The dashboard shows live charts but the team also wants an email when "error rate > 5% sustained for 10 minutes." Which item adds that capability?',
    options: [
      'Add a Reflex (Activator) trigger over the same KQL source with the rule and email action',
      'Configure an alert directly inside the Real-Time Dashboard tile',
      'Schedule a notebook to email when the rule fires',
      'Use a Data pipeline with an If Condition activity'
    ],
    correct: 0,
    explanation: 'Reflex is the right tool: define the threshold-and-window rule, attach the email/Teams/Power Automate action, point it at the KQL source. Real-Time Dashboards visualize but do not own action delivery.',
    whyWrong: {
      1: 'Real-Time Dashboard tiles do not natively own external action delivery; conditions-and-actions are Reflex\'s job.',
      2: 'A scheduled notebook can email but cannot evaluate "sustained over 10 minutes" cleanly and is fragile.',
      3: 'Pipelines run on a schedule or trigger; they are not designed for streaming threshold-with-window evaluation.'
    },
    source: SRC.fabricArch,
    tags: ['reflex', 'real-time-dashboard', 'alerting']
  }),
  // ── OneLake general ──────────────────────────────────────────
  single({
    id: 'rx-011', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'Which protocol scheme is used to address files in OneLake from Spark, Azure Storage Explorer, and most ADLS-aware tools?',
    options: ['onelake://', 'wasbs://', 'abfss://', 'file://'],
    correct: 2,
    explanation: 'OneLake exposes the same ABFS (Azure Data Lake Storage Gen2 driver) endpoint pattern: abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<item>.<itemtype>/Files/... — so existing ADLS-compatible tooling works unchanged.',
    whyWrong: {
      0: 'There is no onelake:// scheme; OneLake reuses ABFS.',
      1: 'wasbs:// is the legacy Windows Azure Storage Blob driver, not the Gen2 driver OneLake uses.',
      3: 'file:// is the local filesystem scheme.'
    },
    source: SRC.fabricArch,
    tags: ['onelake', 'abfss', 'paths']
  }),
  single({
    id: 'rx-012', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 2,
    prompt: 'OneLake File Explorer (the Windows app) does what?',
    options: [
      'Replicates OneLake content to OneDrive automatically',
      'Surfaces OneLake workspaces and items in Windows Explorer so users can browse Files/ and Tables/ like a network drive',
      'Provides a SQL query window for Lakehouse tables on the desktop',
      'Backs up OneLake to a local NAS on a schedule'
    ],
    correct: 1,
    explanation: 'OneLake File Explorer is a Windows shell extension. Once installed and signed in, OneLake workspaces appear as folders in File Explorer, letting users open files (Excel, CSV, Parquet) directly from their desktop.',
    whyWrong: {
      0: 'It is not a OneDrive sync client and does not replicate to OneDrive.',
      2: 'It does not provide a SQL surface; it is a file browser.',
      3: 'It is not a backup tool; it is a navigation/access shell extension.'
    },
    source: SRC.fabricArch,
    tags: ['onelake', 'file-explorer']
  }),
  multi({
    id: 'rx-013', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'Which statements about OneLake APIs and access are TRUE?',
    options: [
      'OneLake supports the ADLS Gen2 REST API, so any tool that speaks that API can read and write files',
      'OneLake permissions are enforced regardless of which API surface (ABFS, OneLake explorer, Spark) the caller uses',
      'OneLake stores per-tenant data physically isolated from other tenants in a single global blob account',
      'OneLake supports Delta and other open file formats; Fabric items use Delta but raw files of any format can be stored under Files/'
    ],
    correct: [0, 1, 3],
    explanation: 'OneLake speaks ADLS Gen2 (so any ADLS-aware client works), enforces unified Fabric permissions across all surfaces, and stores raw files of any format under Files/ (with Tables/ being the Delta-managed area). Multi-tenant data is logically (not physically) isolated — each tenant has its own OneLake namespace.',
    whyWrong: {
      2: 'OneLake gives each tenant a logically separated namespace, but the underlying storage is multi-tenant Azure infrastructure, not a per-tenant physical blob account.'
    },
    source: SRC.fabricArch,
    tags: ['onelake', 'api', 'access']
  }),
  // ── Capacity & SKU ───────────────────────────────────────────
  single({
    id: 'rx-014', domain: 'maintain', subtopic: 'capacity', difficulty: 3,
    prompt: 'A Fabric workspace is on an F2 capacity. Which statement is TRUE about what runs there?',
    options: [
      'F2 supports all Fabric workloads but with a smaller compute pool than F64',
      'F2 cannot run Copilot — Copilot requires F64+ (or shared capacity in some regions)',
      'F2 is read-only — no writes allowed',
      'F2 is exclusively for Power BI Pro users; Fabric items are unavailable'
    ],
    correct: 1,
    explanation: 'F2 supports the full range of Fabric items, but Copilot specifically requires F64 or higher in dedicated capacity (or routes via shared capacity in some preview regions). All other Fabric features run on F2, just with proportionally less CU.',
    whyWrong: {
      0: 'Partly true on workloads, but the explicit Copilot SKU floor makes this answer incomplete and the better-precision answer is the Copilot one.',
      2: 'F2 is fully read/write; size affects throughput, not write capability.',
      3: 'F2 is a Fabric capacity SKU and supports Fabric items — not just Power BI Pro.'
    },
    source: SRC.governance,
    tags: ['capacity', 'sku', 'copilot']
  }),
  multi({
    id: 'rx-015', domain: 'maintain', subtopic: 'capacity', difficulty: 4,
    prompt: 'Which statements about Fabric capacity smoothing, autoscale, and throttling are TRUE?',
    options: [
      'Capacity Units (CU) consumption is smoothed over a 24-hour window for background operations to absorb spikes',
      'Sustained overage past the smoothing window leads first to interactive delay, then to interactive rejection, then to background rejection',
      'Autoscale (when configured) adds CU automatically and bills the additional usage separately',
      'When throttling kicks in, all queued operations are silently dropped with no signal to the user'
    ],
    correct: [0, 1, 2],
    explanation: 'Fabric smooths background CU over 24 hours so spiky workloads do not throttle prematurely. Sustained overage triggers a documented escalation: interactive delay → interactive rejection → background rejection. Autoscale, when on, adds capacity and bills it on a pay-as-you-go basis.',
    whyWrong: {
      3: 'Throttled or rejected operations surface explicit errors and are visible in the Capacity Metrics App; they are not silent.'
    },
    source: SRC.governance,
    tags: ['capacity', 'smoothing', 'autoscale', 'throttling']
  }),
  single({
    id: 'rx-016', domain: 'maintain', subtopic: 'capacity', difficulty: 4,
    prompt: 'A capacity admin sees "interactive rejection" events in the Capacity Metrics App. What does that signal mean?',
    options: [
      'Users\' ad-hoc queries (report renders, DAX queries) are being refused because sustained CU usage exceeds the SKU\'s capacity',
      'The capacity has been paused by a billing event',
      'A specific report\'s RLS roles are misconfigured',
      'A Spark notebook silently failed and rolled back'
    ],
    correct: 0,
    explanation: 'Interactive rejection is the most user-visible throttling state: ad-hoc, user-driven operations are refused outright until CU usage drops back inside the smoothed envelope. The fix is to scale up the SKU, autoscale, or reduce demand.',
    whyWrong: {
      1: 'Pause is a different state and stops everything, not just interactive operations.',
      2: 'RLS misconfig produces empty results or auth errors, not capacity-level rejection.',
      3: 'Spark failures are job-level events, distinct from capacity throttling signals.'
    },
    source: SRC.governance,
    tags: ['capacity', 'throttling', 'rejection']
  }),
  // ── Tenant settings ──────────────────────────────────────────
  single({
    id: 'rx-017', domain: 'maintain', subtopic: 'tenant-settings', difficulty: 3,
    prompt: 'Where does a Fabric tenant administrator restrict WHO can create new workspaces?',
    options: [
      'Workspace settings → Roles for each workspace individually',
      'Fabric Admin Portal → Tenant settings → "Create workspaces" setting, scoped to security groups',
      'Microsoft 365 Admin Center → Licenses',
      'Power BI Desktop → Options → Preview features'
    ],
    correct: 1,
    explanation: 'Tenant settings in the Fabric Admin Portal hold the "Create workspaces" toggle, which can be enabled for the whole org or restricted to specified security groups (with optional exclusions). Per-workspace settings cannot govern creation of new workspaces.',
    whyWrong: {
      0: 'Per-workspace role assignments cannot govern who creates new workspaces.',
      2: 'M365 license assignment controls Fabric/PBI entitlement broadly, not the workspace-creation gate.',
      3: 'Desktop preview-feature toggles are unrelated to tenant governance.'
    },
    source: SRC.governance,
    tags: ['tenant-settings', 'workspace-creation', 'admin-portal']
  }),
  multi({
    id: 'rx-018', domain: 'maintain', subtopic: 'tenant-settings', difficulty: 4,
    prompt: 'Which statements about the "Publish apps" tenant setting are TRUE?',
    options: [
      'It controls who in the tenant can publish a Power BI app from a workspace to consumers',
      'It can be scoped to specific security groups and excluded for others',
      'Once a user is allowed to publish apps, they additionally need workspace Admin or Member to publish from a given workspace',
      'It is the same setting as "Install template apps" — both govern the same population'
    ],
    correct: [0, 1, 2],
    explanation: 'Publish apps is a tenant setting that gates which users can publish workspace apps; it scopes to security groups and works in conjunction with workspace-role permissions (publishing requires Admin or Member). Template-app installation is a separate, distinct tenant setting.',
    whyWrong: {
      3: '"Install template apps" is a separate setting governing template-app consumption — not the same as publishing workspace apps.'
    },
    source: SRC.governance,
    tags: ['tenant-settings', 'publish-apps', 'workspace-roles']
  }),
  single({
    id: 'rx-019', domain: 'maintain', subtopic: 'tenant-settings', difficulty: 4,
    prompt: 'A report developer needs to use a custom visual that has not been certified by Microsoft. The visual fails to load for all consumers. The most likely fix lives in which tenant setting area?',
    options: [
      'Sensitivity labels',
      '"Allow visuals created using the Power BI SDK" and "Add and use certified visuals only" under Tenant settings → Custom visuals',
      'Workspace OneLake settings',
      'Capacity Premium-only feature toggle'
    ],
    correct: 1,
    explanation: 'Custom visuals are governed by tenant-level toggles. If the org is set to "certified visuals only," uncertified visuals will not load. The admin must allow uncertified visuals (broadly or scoped to a security group) for the visual to render.',
    whyWrong: {
      0: 'Sensitivity labels protect data; they do not gate visual loading.',
      2: 'OneLake settings are storage governance, unrelated to visual rendering.',
      3: 'Premium-only toggles do not gate custom-visual loading.'
    },
    source: SRC.governance,
    tags: ['tenant-settings', 'custom-visuals']
  }),
  // ── More T-SQL Warehouse ─────────────────────────────────────
  single({
    id: 'rx-020', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'In Fabric Warehouse, which mechanism is used to control workload concurrency and resource allocation across competing queries on a shared capacity?',
    options: [
      'CREATE WORKLOAD GROUP / CLASSIFIER as in dedicated SQL Pools',
      'Workload management is automatic — Fabric uses capacity-level smoothing and burstable CU rather than per-query workload groups',
      'sp_configure to pin individual queries to specific cores',
      'Resource Governor — same as box-product SQL Server'
    ],
    correct: 1,
    explanation: 'Fabric Warehouse does NOT expose dedicated SQL Pool style WORKLOAD GROUP / CLASSIFIER objects. Workload management is handled at the capacity level via CU smoothing, autoscale, and throttling. Per-query resource pinning is not a Fabric concept.',
    whyWrong: {
      0: 'WORKLOAD GROUP / CLASSIFIER is a Synapse Dedicated SQL Pool feature; Fabric Warehouse uses a different model.',
      2: 'sp_configure has no role here; you cannot pin queries to cores in Fabric.',
      3: 'Resource Governor is a SQL Server box-product feature, not Fabric Warehouse.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'warehouse', 'workload-management']
  }),
  multi({
    id: 'rx-021', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'Which Fabric Warehouse features help diagnose a slow query?',
    options: [
      'Query Insights views (e.g., queryinsights.exec_requests_history) for historical query telemetry',
      'sys.dm_exec_query_stats and related DMVs for current activity',
      'SHOW STATISTICS to inspect column statistics health on a table',
      'Profiler trace files (.trc) attached to the warehouse'
    ],
    correct: [0, 1, 2],
    explanation: 'Fabric Warehouse exposes Query Insights views (queryinsights schema) for historical analysis, the standard sys.dm_exec_* DMVs for live state, and SHOW STATISTICS / DBCC SHOW_STATISTICS for column-statistics inspection. SQL Profiler / .trc files are a legacy box-SQL tool and are not the Fabric path.',
    whyWrong: {
      3: 'Profiler with .trc files is not how you observe Fabric Warehouse; use Query Insights and DMVs instead.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'query-insights', 'statistics', 'diagnostics']
  }),
  single({
    id: 'rx-022', domain: 'prepare', subtopic: 'tsql-warehouse', difficulty: 4,
    prompt: 'A T-SQL query against a Fabric Warehouse table returns the wrong cardinality estimate, causing a bad join plan. What is the right first action?',
    options: [
      'Drop and recreate the table',
      'Run UPDATE STATISTICS (or rely on auto-create/update) on the involved columns and re-check via SHOW STATISTICS / DBCC SHOW_STATISTICS',
      'Add a CLUSTERED COLUMNSTORE INDEX explicitly with CREATE INDEX',
      'Force MAXDOP 1 via OPTION (MAXDOP 1)'
    ],
    correct: 1,
    explanation: 'Bad cardinality estimates almost always trace back to stale or missing column statistics. UPDATE STATISTICS refreshes them; SHOW STATISTICS / DBCC SHOW_STATISTICS lets you confirm the fix. Fabric also auto-creates statistics, but explicit refresh is the right first lever.',
    whyWrong: {
      0: 'Recreating the table is destructive and unnecessary.',
      2: 'Fabric Warehouse already stores data in a columnstore-style format; explicit CLUSTERED COLUMNSTORE INDEX DDL is not the lever.',
      3: 'MAXDOP hints mask symptoms; they do not fix bad estimates.'
    },
    source: SRC.tsql,
    tags: ['tsql', 'statistics', 'cardinality', 'show-statistics']
  }),
  // ── More semantic model ──────────────────────────────────────
  single({
    id: 'rx-023', domain: 'semantic', subtopic: 'semantic-model-design', difficulty: 4,
    prompt: 'A semantic model serves Finance, HR, and Sales. Each audience should see only the tables, measures, and hierarchies relevant to them — without modifying the underlying model. Which feature fits?',
    options: ['Object-Level Security (OLS)', 'Perspectives', 'Row-Level Security (RLS)', 'Translations'],
    correct: 1,
    explanation: 'Perspectives are tooling-friendly named subsets of the model that show only the chosen tables/columns/measures to a given audience. They are NOT a security boundary — they only shape the metadata view in tools like Excel or Tabular Editor.',
    whyWrong: {
      0: 'OLS hides objects for security and is enforced by the engine; it is the right tool when the requirement is denial of access, not just visibility.',
      2: 'RLS filters rows, not metadata visibility.',
      3: 'Translations localize captions/descriptions; they do not subset the metadata.'
    },
    source: SRC.semanticModel,
    tags: ['perspectives', 'metadata', 'audience']
  }),
  single({
    id: 'rx-024', domain: 'semantic', subtopic: 'semantic-model-design', difficulty: 3,
    prompt: 'A semantic model needs to present field captions and measure names in English, French, and German based on the user\'s client locale. Which tabular feature delivers this?',
    options: ['Perspectives', 'Translations', 'Calculation groups', 'Sensitivity labels'],
    correct: 1,
    explanation: 'Translations attach localized captions and descriptions to objects (tables, columns, measures, hierarchies). The client tool requests a culture and the engine returns the translated metadata, with no model duplication required.',
    whyWrong: {
      0: 'Perspectives subset the model; they do not localize.',
      2: 'Calculation groups parameterize calculations; they do not handle localization.',
      3: 'Sensitivity labels protect data; unrelated to localization.'
    },
    source: SRC.semanticModel,
    tags: ['translations', 'localization', 'metadata']
  }),
  multi({
    id: 'rx-025', domain: 'semantic', subtopic: 'semantic-model-design', difficulty: 5,
    prompt: 'Which statements about Automatic Aggregations vs user-defined Aggregations in a semantic model are TRUE?',
    options: [
      'Automatic Aggregations train on real query patterns and create/maintain agg tables transparently in the background',
      'User-defined Aggregations require the modeler to create the agg table, define the precedence/grain, and map base columns explicitly',
      'Automatic Aggregations only apply to DirectQuery models; they do not apply to pure Import models',
      'Both approaches are mutually exclusive — turning on Automatic Aggregations disables any user-defined Aggregations on the model'
    ],
    correct: [0, 1, 2],
    explanation: 'Automatic Aggregations are an ML-driven feature for DirectQuery (and DirectQuery-leg of Composite) models — they observe query telemetry and synthesize agg tables. User-defined Aggregations are an explicit modeling pattern with manual grain/precedence/mapping. The two CAN coexist; turning on automatic does not delete user-defined aggs.',
    whyWrong: {
      3: 'User-defined and Automatic Aggregations can coexist on the same model — they are not mutually exclusive.'
    },
    source: SRC.semanticModel,
    tags: ['aggregations', 'automatic-aggregations', 'directquery', 'composite']
  })
];
