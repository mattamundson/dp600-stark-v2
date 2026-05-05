import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

// 14 chained scenario questions for scn-51..scn-55.
// IDs must stay in sync with `questionIds` in scn-list-batch3.ts.

export const scenarioQuestionsBatch3: Question[] = [

  // ─── scn-51 — Wayne Aerospace — Direct Lake on OneLake vs SQL endpoint (3 Qs)

  single({
    id: 'scn-51-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-51',
    scenarioTitle: 'Wayne Aerospace — Direct Lake on OneLake vs SQL endpoint security choice',
    prompt:
      'Wayne Aerospace needs to satisfy the compliance requirement that classified pilot rows are NEVER visible to general crew users. ' +
      'The warehouse-level row-security predicates on FactWorkforce enforce this boundary. ' +
      'Which storage mode for the Power BI semantic model CORRECTLY satisfies the compliance requirement?',
    options: [
      'Direct Lake on OneLake — reads V-Order Delta column segments directly, bypassing the SQL engine entirely, so queries are faster',
      'Direct Lake sourced from the Warehouse SQL endpoint — the SQL engine evaluates the warehouse RLS predicates before returning data to the semantic model',
      'Import mode — a nightly scheduled refresh copies the full (unfiltered) fact table into the in-memory model, which applies its own semantic-model RLS',
      'DirectQuery against the Warehouse SQL endpoint — every visual query round-trips to the SQL engine so warehouse predicates always apply'
    ],
    correct: 1,
    explanation:
      'When a Fabric Warehouse has row-security predicates, Direct Lake on OneLake BYPASSES those predicates — it reads column segments directly from OneLake storage and the SQL engine (which holds the predicate logic) is never consulted. ' +
      'This means classified rows WOULD be visible to general crew users if the semantic model is connected directly to OneLake. ' +
      'Direct Lake sourced from the Warehouse SQL endpoint routes each framing request through the SQL engine, which evaluates the warehouse RLS predicate before serving segment metadata. ' +
      'This is the correct architecture to honour warehouse-layer access control in a Direct Lake model. ' +
      'Import mode with semantic-model RLS also satisfies compliance, but it introduces nightly refresh latency and doubles storage — it is a valid fallback, not the optimum answer. ' +
      'DirectQuery also satisfies compliance but loses the Direct Lake columnar performance advantage entirely.',
    whyWrong: {
      0: 'Direct Lake on OneLake reads Delta column segments without involving the SQL engine. Warehouse-level row-security predicates live in the SQL engine layer — they are silently skipped, exposing classified rows to all model consumers.',
      2: 'Import mode with a full-table copy would load the unfiltered fact table into memory, then rely on semantic-model RLS. This double-layer is maintainable but introduces nightly refresh latency, increases memory consumption, and is not the canonical approach for warehouse-predicate enforcement.',
      3: 'DirectQuery routes every query through the SQL engine and correctly enforces warehouse predicates, but it abandons Direct Lake columnar performance entirely — every visual render becomes a SQL round-trip with no framing benefit.'
    },
    source: SRC.directLakeFallback,
    tags: ['scenario', 'direct-lake', 'warehouse-rls', 'sql-endpoint', 'compliance', 'semantic']
  }),

  single({
    id: 'scn-51-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'row-level-security',
    difficulty: 4,
    scenarioId: 'scn-51',
    scenarioTitle: 'Wayne Aerospace — Direct Lake on OneLake vs SQL endpoint security choice',
    prompt:
      'The compliance team wants a defence-in-depth posture: warehouse-level predicates remain in place, ' +
      'AND the semantic model should also enforce an RLS role so that even if the storage-layer is queried directly via XMLA, ' +
      'general crew users cannot see classified rows. ' +
      'Which approach CORRECTLY adds the semantic-model RLS layer while avoiding double-maintenance of the classification logic?',
    options: [
      'Define a semantic-model RLS role on FactWorkforce using a hardcoded list of classified PlantIds: `[ClassificationLevel] = "Pilot"`',
      'Define a semantic-model RLS role that calls a USERPRINCIPALNAME()-based DAX filter on DimEmployee, relying on a [IsClassifiedUser] flag populated from a lookup table maintained in the Warehouse',
      'Define a semantic-model RLS role using the same predicate logic as the warehouse via a CALCULATE filter on FactWorkforce: `CALCULATE(1, FILTER(DimClassification, DimClassification[Level] = "Pilot" && RELATED(DimEmployee[UPN]) = USERPRINCIPALNAME()))`',
      'Enable Object-Level Security (OLS) on the [ClassificationLevel] column instead of RLS — hiding the column prevents any classification-based query'
    ],
    correct: 1,
    explanation:
      'The defence-in-depth goal is met when the semantic-model RLS mirrors the warehouse predicate without duplicating its hardcoded logic. ' +
      'Using a [IsClassifiedUser] boolean flag in a Warehouse-backed DimEmployee lookup table means the classification truth source stays in the Warehouse — the semantic-model role simply evaluates `DimEmployee[IsClassifiedUser] = FALSE() && DimEmployee[UPN] = USERPRINCIPALNAME()` (general crew: not classified users). ' +
      'When the Warehouse classification roster changes, only the Warehouse table needs updating; the DAX expression remains stable. ' +
      'A hardcoded classification list in DAX creates a maintenance single point of failure — every roster change requires a model republish. ' +
      'The CALCULATE/FILTER approach (option C) is complex, technically fragile (RELATED direction may not exist), and still duplicates predicate logic in DAX. ' +
      'OLS hides a column entirely from the schema — it does not restrict rows, so all FactWorkforce rows are still accessible; classified row data can be derived from other visible columns.',
    whyWrong: {
      0: 'Hardcoding `[ClassificationLevel] = "Pilot"` as a DAX filter on FactWorkforce creates a static list that must be manually updated every time the classification roster changes. It also filters incorrectly — it would SHOW only pilot rows to all users rather than hiding them from general crew.',
      2: 'CALCULATE with FILTER and RELATED is fragile: the relationship direction between FactWorkforce and DimClassification may not support RELATED in this direction, and the expression duplicates classification logic in DAX rather than delegating to the single source of truth in the Warehouse.',
      3: 'OLS removes a column from the model schema — it does not restrict which rows are visible. General crew users can still access all FactWorkforce rows; they simply cannot see the [ClassificationLevel] column directly, which does not prevent data exposure through other query paths.'
    },
    source: SRC.rls,
    tags: ['scenario', 'rls', 'defence-in-depth', 'ols', 'userprincipalname', 'semantic']
  }),

  single({
    id: 'scn-51-q3',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 3,
    scenarioId: 'scn-51',
    scenarioTitle: 'Wayne Aerospace — Direct Lake on OneLake vs SQL endpoint security choice',
    prompt:
      'With Direct Lake sourced from the Warehouse SQL endpoint in place, the ops team reports that the general crew dashboard ' +
      '(a high-traffic report with 8 visuals and no classified rows in scope) has p95 render time of 3.2 s — above the 1 s target. ' +
      'Server Timings in DAX Studio shows Storage Engine time is 2.8 s and Formula Engine time is 0.4 s. ' +
      'Which SINGLE action is MOST likely to bring p95 under 1 s for this SE-dominant bottleneck?',
    options: [
      'Switch the semantic model back to Direct Lake on OneLake (bypassing the SQL endpoint) for the general crew workspace, and keep the SQL-endpoint model only for a separate classified-access workspace',
      'Add an aggregation table over FactWorkforce in the Lakehouse and configure the semantic model to use the aggregation for the summary-level visuals used by general crew',
      'Increase the Fabric capacity from F64 to F128 to provide more Storage Engine thread budget',
      'Rewrite all 8 report visuals to use SUMMARIZECOLUMNS instead of SUMMARIZE to reduce SE scan fan-out'
    ],
    correct: 1,
    explanation:
      'The bottleneck is Storage Engine time (2.8 s) on a 200M-row fact table — this is an SE-dominant scan problem. ' +
      'An aggregation table pre-materialises the rolled-up values that the general crew dashboard needs (typically totals and ratios at department/date granularity). ' +
      'When the aggregation hit rate is high, Direct Lake serves the pre-aggregated rows instead of scanning 200M fact rows, reducing SE time dramatically without changing the security architecture. ' +
      'Switching back to Direct Lake on OneLake (option A) would recover SE speed but breaks the compliance requirement — warehouse RLS predicates would be bypassed. ' +
      'A capacity upgrade (option C) provides more SE thread budget but does not reduce the data volume scanned; it is a costly band-aid that does not fix the architectural root cause. ' +
      'SUMMARIZECOLUMNS vs SUMMARIZE (option D) affects Formula Engine efficiency and query-folding hints, not raw Storage Engine scan depth on a 200M-row table.',
    whyWrong: {
      0: 'Switching to Direct Lake on OneLake for general crew recovers SE performance but violates the compliance requirement — warehouse row-security predicates are bypassed, and classified rows could be reached through the model.',
      2: 'An F128 upgrade doubles the CU budget but does not reduce the Storage Engine scan depth. On a 200M-row table without aggregations, the SE will still read the same volume of data — just with more threads. The latency improvement will be incremental, not the order-of-magnitude needed to reach 1 s.',
      3: 'SUMMARIZECOLUMNS is generally preferred over SUMMARIZE for performance in DAX, but the bottleneck here is explicitly Storage Engine (2.8 s SE vs 0.4 s FE). Optimising the formula engine path has minimal impact when SE is the dominant cost.'
    },
    source: SRC.directLake,
    tags: ['scenario', 'direct-lake', 'aggregations', 'storage-engine', 'performance', 'semantic']
  }),

  // ─── scn-52 — Tyrell Pharma — calc groups vs measures vs field parameters (2 Qs)

  single({
    id: 'scn-52-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'calc-groups',
    difficulty: 4,
    scenarioId: 'scn-52',
    scenarioTitle: 'Tyrell Pharma — calc groups vs measures vs field parameters',
    prompt:
      'Tyrell Pharma wants to reduce the 48 measures (12 base × 4 time variants) to the smallest maintainable set ' +
      'while enabling report authors to switch between time variants via a slicer. ' +
      'Adding QTD and Rolling-3M should require only one change per new variant, not 12. ' +
      'Which design BEST satisfies these requirements?',
    options: [
      'Keep all 48 measures; add a "Selected Metric" field parameter that exposes them as a slicer-selectable list, requiring no structural change',
      'Create a calculation group with one calculation item per time variant (Current, YoY%, MTD, YTD) and author only the 12 base measures; the calculation group applies the time intelligence to whichever base measure is in context',
      'Consolidate to 12 base measures and author 4 separate report pages (one per time variant), removing the slicer entirely',
      'Use a single measure with a SWITCH(SELECTEDVALUE(SlicerTable[Variant]), ...) pattern that manually branches to all 48 DAX expressions'
    ],
    correct: 1,
    explanation:
      'Calculation groups are the purpose-built Power BI / Tabular feature for time-intelligence reuse across multiple base measures. ' +
      'By defining one calculation group with items for Current, YoY%, MTD, YTD (and later QTD, Rolling-3M), each new time variant requires one new calculation item — not 12 new measures. ' +
      'The 12 base measures are authored once; the calculation group applies the selected time context at query time via SELECTEDMEASURE(). ' +
      'Report authors retain a slicer (on the calculation group dimension) to switch time variants, satisfying the interactivity requirement. ' +
      'A field parameter (option A) does reduce visual clutter but still requires all 48 measures to be authored and maintained individually — adding QTD still requires 12 new measures. ' +
      'Separate report pages (option C) eliminate the slicer requirement the business specified. ' +
      'A SWITCH/SELECTEDVALUE mega-measure (option D) is a brittle anti-pattern that duplicates all DAX logic in one expression, is harder to test, and does not scale.',
    whyWrong: {
      0: 'A field parameter is a model object that surfaces existing measures in a slicer — it does not reduce the number of measures that must be authored and maintained. Adding QTD and Rolling-3M would still require authoring 12 new measures each.',
      2: 'Separate report pages remove the slicer-based interactivity the scenario requires. Each page also carries its own visual layer, multiplying maintenance across layout, not just DAX.',
      3: 'SWITCH(SELECTEDVALUE(...)) with hardcoded branches for all 48 permutations is a maintenance anti-pattern: it is a single fragile expression that mixes all base-measure logic, time-intelligence logic, and slicer state into one place, with no reuse and no scalability.'
    },
    source: SRC.semanticModel,
    tags: ['scenario', 'calc-groups', 'time-intelligence', 'field-parameters', 'measures', 'semantic']
  }),

  single({
    id: 'scn-52-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'calc-groups',
    difficulty: 3,
    scenarioId: 'scn-52',
    scenarioTitle: 'Tyrell Pharma — calc groups vs measures vs field parameters',
    prompt:
      'The team has decided to implement a calculation group for time variants. ' +
      'Power BI Desktop does not expose a calculation groups authoring UI. ' +
      'Which tool allows the team to CREATE and EDIT calculation groups in a semantic model that is deployed to a Fabric Premium workspace?',
    options: [
      'Power BI Desktop (November 2023 or later) — the "Calculation Groups" button in the Modeling ribbon is available when connected to a Premium workspace',
      'Tabular Editor 2 (open-source) or Tabular Editor 3 — both support calculation group creation via the XMLA write endpoint and via local model files',
      'DAX Studio — the Calculation Group wizard in DAX Studio writes calculation items directly to the connected model',
      'Power Query Editor in Power BI Desktop — calculation groups are authored as M functions applied to a query step'
    ],
    correct: 1,
    explanation:
      'Calculation groups cannot be created in Power BI Desktop — the Desktop UI does not expose a calculation group authoring surface. ' +
      'Tabular Editor 2 (free, open-source) and Tabular Editor 3 (commercial) are the canonical tools for creating and editing calculation groups. ' +
      'Both support connecting live to a Premium / Fabric workspace via the XMLA write endpoint (for direct publish) or editing a TMDL/BIM file locally and then deploying. ' +
      'This is explicitly documented in the Microsoft Learn DP-600 study guide under "Create calculation groups." ' +
      'DAX Studio is a query and performance analysis tool — it does not have a calculation group wizard and does not write schema changes to the model. ' +
      'Power Query Editor handles data transformation (M language), not semantic model schema or DAX calculation objects.',
    whyWrong: {
      0: 'Power BI Desktop has never exposed a calculation group authoring UI in any release version. This is a well-known limitation explicitly called out in Microsoft documentation — Tabular Editor is the prescribed tool.',
      2: 'DAX Studio is a read/query tool for DAX evaluation and performance analysis. It exposes Server Timings, VertiPaq Analyzer statistics, and DMV queries, but it does not write calculation groups or any other schema changes to the model.',
      3: 'Power Query Editor handles M-language data transformation steps, not Tabular semantic model objects. Calculation groups are a tabular model metadata construct — they live in the model schema, not in query/ETL logic.'
    },
    source: SRC.xmla,
    tags: ['scenario', 'calc-groups', 'tabular-editor', 'xmla-endpoint', 'authoring-tools', 'semantic']
  }),

  // ─── scn-53 — Massive Dynamic — multi-tenant Lakehouse + Reflex alerts (3 Qs)

  multi({
    id: 'scn-53-q1',
    type: 'scenario-multi',
    domain: 'prepare',
    subtopic: 'mirroring',
    difficulty: 4,
    scenarioId: 'scn-53',
    scenarioTitle: 'Massive Dynamic — multi-tenant Lakehouse with mirrored sources + Reflex alerts',
    prompt:
      'Massive Dynamic must land 200 customer Postgres databases into Fabric with minimal custom code and near-real-time replication where available. ' +
      'Which TWO Fabric ingestion mechanisms are MOST suitable for Azure Database for PostgreSQL as a source? (Select 2)',
    options: [
      'Fabric Mirrored Database — supports Azure Database for PostgreSQL as a mirrored source with continuous CDC-based replication into a Lakehouse Delta table, no custom code required',
      'OneLake shortcut pointing at the Postgres database — shortcuts can reference external RDBMS tables natively via the shortcut connector',
      'Dataflow Gen2 with a PostgreSQL connector — polls the source on a configurable schedule (minimum 15 minutes) and outputs Delta to a Lakehouse',
      'A Fabric Data Pipeline with a Copy Activity using the PostgreSQL connector — orchestrated on a scheduled trigger, suitable for batch ingestion when near-real-time is not required',
      'Azure Data Factory mirroring agent — an ADF-managed agent pushes Postgres WAL changes into a Fabric Lakehouse Delta table in real time'
    ],
    correct: [0, 3],
    explanation:
      'Fabric Mirrored Database supports Azure Database for PostgreSQL as a source (using logical replication / CDC), continuously replicating changes into a Lakehouse Delta table with no custom pipeline code. ' +
      'For customers where CDC is not available or near-real-time is not required, a Fabric Data Pipeline with a Copy Activity and PostgreSQL connector provides reliable batch ingestion on a scheduled trigger. ' +
      'Together these two cover the near-real-time and batch cases with minimal custom code. ' +
      'OneLake shortcuts (option B) support ADLS Gen2, S3, GCS, and Dataverse — not external RDBMS connections. You cannot shortcut directly to a Postgres table. ' +
      'Dataflow Gen2 with a PostgreSQL connector (option C) is viable but poll-based with a minimum 15-minute interval — it is not "near-real-time" and involves more configuration overhead than mirroring for the always-on case. ' +
      '"Azure Data Factory mirroring agent" (option E) is a fabricated distractor; ADF does not have a "mirroring agent" for Fabric Lakehouse — this functionality belongs to Fabric Mirroring natively.',
    whyWrong: {
      1: 'OneLake shortcuts support storage-layer sources (ADLS Gen2, S3, GCS, Google Cloud Storage, Dataverse) — they do not support RDBMS connections such as Postgres. Shortcuts are a metadata-layer redirect to a storage URI, not a database connector.',
      2: 'Dataflow Gen2 is a pull-based, scheduled tool with a minimum refresh granularity of 15 minutes. It is suitable for batch reporting scenarios but does not deliver the near-real-time replication described in the scenario for customers where CDC is available.',
      4: '"ADF mirroring agent" is a fabricated option. Azure Data Factory and Fabric Mirroring are separate products. Postgres CDC replication into Fabric is a native Fabric Mirroring capability — no ADF agent is involved.'
    },
    source: SRC.mirroring,
    tags: ['scenario', 'mirroring', 'postgres', 'dataflow', 'ingestion', 'copy-activity', 'prepare']
  }),

  single({
    id: 'scn-53-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'fabric-architecture',
    difficulty: 4,
    scenarioId: 'scn-53',
    scenarioTitle: 'Massive Dynamic — multi-tenant Lakehouse with mirrored sources + Reflex alerts',
    prompt:
      'The team is choosing between a workspace-per-tenant model (200 workspaces) and a schema-per-tenant model ' +
      '(one workspace, one Lakehouse, one Delta schema per customer). ' +
      'The primary concern is strict data isolation: no query path can return rows from Customer A to Customer B. ' +
      'Which isolation pattern BEST satisfies the strict-isolation requirement while keeping the onboarding time under 2 hours per customer?',
    options: [
      'Schema-per-tenant in a single Lakehouse — Delta table paths are segregated by customer schema prefix (e.g., `customer_42/gold/orders`), and semantic-model RLS enforces customer boundaries',
      'Workspace-per-tenant — each workspace has independent Lakehouse items, capacity assignments, and RBAC; no cross-workspace query path exists by default',
      'Schema-per-tenant with Lakehouse-level OLS (Object-Level Security) hiding each customer\'s tables from other tenants\' service principals',
      'A single shared Lakehouse with a [CustomerId] column on every table, enforced via warehouse-level row-security predicates, so one RLS definition covers all 200 customers'
    ],
    correct: 1,
    explanation:
      'Workspace-per-tenant is the canonical Fabric multi-tenant isolation pattern when strict data isolation is a hard requirement. ' +
      'Each Fabric workspace is an independent security boundary: RBAC is managed per-workspace, items in one workspace cannot be queried from another workspace without an explicit cross-workspace permission grant. ' +
      'Onboarding automation (Fabric REST API or Terraform) can provision a new workspace, Lakehouse, and Mirrored Database item in under 2 hours. ' +
      'Schema-per-tenant in a shared Lakehouse (option A) with semantic-model RLS is weaker: a service principal or admin with Lakehouse-level access can bypass the semantic model and query Delta files directly via the SQL endpoint or notebooks. ' +
      'Lakehouse OLS (option C) hides schema objects from the model but does not prevent direct file-path access via notebooks or pipelines — not a hard isolation boundary. ' +
      'Single Lakehouse with [CustomerId] warehouse RLS (option D) is a soft boundary: it requires every consumer of the data to route through the warehouse SQL engine, and a data engineer with file-system access can bypass it entirely via Delta path reads.',
    whyWrong: {
      0: 'Schema-per-tenant in a shared Lakehouse is a soft isolation boundary. A user or service principal with Lakehouse access can bypass semantic-model RLS by reading the underlying Delta files directly via notebooks, pipelines, or the SQL endpoint with appropriate permissions.',
      2: 'OLS restricts which columns and tables are visible in the semantic model — it does not restrict Delta file access from outside the semantic model layer. A notebook or pipeline running with Lakehouse contributor permissions can still read every customer\'s table directly.',
      3: 'Row-security predicates in a single shared Warehouse rely on every query path routing through the SQL engine. Direct Delta file access via notebooks, Spark, or the REST API bypasses the warehouse predicate layer entirely, making this a soft rather than hard isolation boundary.'
    },
    source: SRC.fabricArch,
    tags: ['scenario', 'workspace-isolation', 'multi-tenant', 'rbac', 'lakehouse', 'prepare']
  }),

  single({
    id: 'scn-53-q3',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'eventhouse',
    difficulty: 3,
    scenarioId: 'scn-53',
    scenarioTitle: 'Massive Dynamic — multi-tenant Lakehouse with mirrored sources + Reflex alerts',
    prompt:
      'Massive Dynamic wants to alert the operations team in Teams when any customer\'s Gold table daily row count drops below 1,000, ' +
      'indicating a possible ETL failure — with no custom polling code. ' +
      'Which Fabric feature BEST delivers this capability?',
    options: [
      'A Fabric Data Pipeline with a Lookup Activity that queries each Gold table\'s row count every 30 minutes, and a conditional Send Teams Message activity',
      'Fabric Activator (Reflex) set on a KQL query or Lakehouse table metric — define a rule that fires a Teams notification when the daily row count for any customer drops below the threshold',
      'A Power BI alert on a dashboard card showing customer row counts — configure the alert to trigger when the card value drops below 1,000',
      'An Azure Monitor alert rule on the Fabric capacity metrics that fires when throughput drops, correlating to an ETL failure'
    ],
    correct: 1,
    explanation:
      'Fabric Activator (Reflex) is the native Fabric event-driven alerting primitive. ' +
      'It can monitor a Lakehouse table metric, an Eventhouse KQL query result, or a Real-Time Dashboard tile, and fire a pre-built Teams notification when a defined condition is met — with no custom polling code, no pipeline, and no external functions. ' +
      'Defining a rule on a daily row-count KQL aggregate (or a Lakehouse monitor) that fires when count < 1,000 is the exact use case Reflex was designed for. ' +
      'A Data Pipeline with a Lookup + Conditional (option A) is functional but constitutes custom polling code — exactly what the requirement forbids. ' +
      'Power BI alerts (option C) are backed by the Power BI data cache refresh cycle; they fire on aggregated card values with latency proportional to refresh interval (minutes to hours), and they do not support per-customer threshold granularity without per-customer report pages. ' +
      'Azure Monitor capacity alerts (option D) track CU utilisation, not data volume in customer tables — they cannot distinguish a silent ETL failure from normal low-traffic periods.',
    whyWrong: {
      0: 'A Lookup Activity + conditional Teams message in a Data Pipeline is a custom polling loop — it requires an external orchestrator, has minimum scheduling granularity, and is precisely the "custom polling code" the requirement explicitly rules out.',
      2: 'Power BI alerts depend on the data cache refresh schedule; the delay between a row count falling below 1,000 and the alert firing can be 30 minutes or more. They also require one configured alert per customer, making 200-customer management operationally complex.',
      3: 'Azure Monitor capacity metrics measure Fabric CU utilisation, query latency, and throttling events — not the row count of specific customer Delta tables. A silent ETL failure (pipeline produced zero rows) would not appear in capacity metrics at all.'
    },
    source: SRC.eventhouse,
    tags: ['scenario', 'reflex', 'activator', 'alerting', 'multi-tenant', 'teams', 'prepare']
  }),

  // ─── scn-54 — Cyberdyne — XMLA endpoint + Tabular Editor + ALM Toolkit CI/CD (3 Qs)

  single({
    id: 'scn-54-q1',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'xmla-endpoint',
    difficulty: 4,
    scenarioId: 'scn-54',
    scenarioTitle: 'Cyberdyne — XMLA endpoint + Tabular Editor + ALM Toolkit CI/CD',
    prompt:
      'Cyberdyne\'s CI pipeline stores the model as TMDL files and must deploy to a Premium workspace via the XMLA write endpoint ' +
      'without opening Power BI Desktop. ' +
      'Which tool combination is BEST suited for validating and deploying TMDL in a headless CI environment?',
    options: [
      'Power BI Desktop in headless mode — use the command-line flag `/B <file.pbix>` to open and publish without a GUI',
      'Tabular Editor 2 CLI (`TabularEditor.exe`) — natively reads TMDL, validates the model, and deploys via the XMLA endpoint using a service principal; the ALM Toolkit comparison engine produces a diff-deploy that only pushes changed objects',
      'The Fabric REST API with a PBIP zip payload — compress the TMDL folder into a .pbip archive, POST to `/v1/workspaces/{id}/items`, and the API unpacks and deploys',
      'Power BI CLI (`pbicli`) — the `pbicli model deploy --tmdl` command deploys TMDL files directly to a workspace'
    ],
    correct: 1,
    explanation:
      'Tabular Editor 2 (open-source CLI) is the canonical headless TMDL deployment tool in the Microsoft Learn DP-600 curriculum. ' +
      'Its command-line interface (`TabularEditor.exe "<model.bim>" -D "<connection string>" "<database>"`) reads BIM/TMDL, validates the schema, and deploys to any XMLA-compatible endpoint using a service principal. ' +
      'The ALM Toolkit comparison engine — which is integrated into Tabular Editor 3 or available as a standalone Tabular Editor 2 script — produces an object-level diff deploy: only changed tables, measures, and relationships are pushed, minimising disruption to in-flight queries on the target workspace. ' +
      'Power BI Desktop has no headless command-line deploy capability — the `/B` flag is not a real feature. ' +
      'The Fabric REST API accepts PBIP-format items but TMDL is a folder structure, not a compressed archive; the API does not accept a raw .pbip zip for semantic models in the same way. ' +
      '`pbicli model deploy --tmdl` is a fabricated command; the Power BI CLI (`pbicli`) does not have a TMDL-specific deploy verb.',
    whyWrong: {
      0: 'Power BI Desktop does not support headless or command-line deployment. There is no `/B` flag for batch publish. Desktop is an interactive GUI tool and is explicitly excluded by the scenario requirement.',
      2: 'The Fabric REST API can create and update semantic model items using PBIP definition JSON, but TMDL is a multi-file folder format that requires Tabular Editor or the XMLA endpoint to assemble into a deployable model object. There is no "PBIP zip" REST endpoint for model deployment.',
      3: '`pbicli model deploy --tmdl` is a fabricated distractor. The Power BI CLI (`pbicli`) has commands for workspace, dataset refresh, and report management, but does not have a native TMDL deploy verb that interfaces with the XMLA endpoint.'
    },
    source: SRC.xmla,
    tags: ['scenario', 'xmla-endpoint', 'tabular-editor', 'tmdl', 'cicd', 'headless-deploy', 'maintain']
  }),

  single({
    id: 'scn-54-q2',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'workspace-roles',
    difficulty: 3,
    scenarioId: 'scn-54',
    scenarioTitle: 'Cyberdyne — XMLA endpoint + Tabular Editor + ALM Toolkit CI/CD',
    prompt:
      'The CI pipeline uses an Entra ID service principal to authenticate to the Fabric workspace for XMLA deployment. ' +
      'What is the MINIMUM workspace role (and tenant setting) required for the service principal to write to a semantic model via the XMLA endpoint?',
    options: [
      'Workspace Viewer role — XMLA read and write are available to all workspace members regardless of role',
      'Workspace Contributor role — contributors can publish and overwrite semantic model items; no tenant setting change needed',
      'Workspace Member role (or Contributor), AND the "Allow service principals to use Power BI APIs" tenant admin setting must be enabled; XMLA write also requires the workspace to be on a Premium/Fabric capacity with XMLA write enabled',
      'Workspace Admin role — only admins can use the XMLA write endpoint; contributor access is read-only for XMLA'
    ],
    correct: 2,
    explanation:
      'XMLA write access for a service principal has three requirements that must ALL be true: ' +
      '(1) the Fabric/Power BI capacity must have XMLA read/write enabled (capacity admin setting); ' +
      '(2) the "Allow service principals to use Power BI APIs" tenant admin setting must be enabled (and optionally scoped to a security group containing the CI service principal); ' +
      '(3) the service principal must have at least Workspace Member role (Contributor also works for most operations). ' +
      'Viewer role is read-only — it cannot publish or modify semantic model items. ' +
      'Contributor role alone does not bypass the tenant setting requirement; if the tenant setting is disabled, the service principal will receive a 401 regardless of workspace role. ' +
      'Admin role is not the minimum — Member and Contributor are sufficient for XMLA write operations.',
    whyWrong: {
      0: 'Viewer is a read-only role. XMLA write operations (deploy, alter schema) require at least Contributor or Member access. Viewer-level service principals can only read model metadata via XMLA, not write.',
      1: 'Contributor role is necessary but not sufficient. Without the "Allow service principals to use Power BI APIs" tenant admin setting enabled, service principals receive 401 Unauthorized regardless of workspace role — this is an independent prerequisite.',
      3: 'Admin role is not the minimum required — it is the maximum. Contributor and Member roles both allow XMLA write operations. Restricting CI deployments to Admin-level service principals grants excessive permissions and violates least-privilege principles.'
    },
    source: SRC.workspace,
    tags: ['scenario', 'xmla-endpoint', 'service-principal', 'workspace-roles', 'tenant-settings', 'maintain']
  }),

  single({
    id: 'scn-54-q3',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    scenarioId: 'scn-54',
    scenarioTitle: 'Cyberdyne — XMLA endpoint + Tabular Editor + ALM Toolkit CI/CD',
    prompt:
      'After deploying a new model version, the CI pipeline runs a validation DAX query. ' +
      'The query returns an error, indicating the deployment introduced a regression. ' +
      'The rollback strategy must restore the previous model version in the Premium workspace within 5 minutes. ' +
      'Which rollback approach BEST meets this requirement given the team\'s TMDL-in-Git workflow?',
    options: [
      'Restore the workspace from the most recent Fabric workspace backup — workspaces are backed up hourly and can be restored via the admin portal in under 5 minutes',
      'Manually re-open the previous .pbix file in Power BI Desktop and republish it to the workspace',
      'Re-run the CI deploy step against the previous TMDL commit (HEAD~1 or the last known-good tag) — Tabular Editor deploys the previous model definition to the workspace via XMLA, overwriting the bad version',
      'Pause the workspace refresh schedule, revert the bad measures manually in the Power BI Service semantic model editor, then resume the schedule'
    ],
    correct: 2,
    explanation:
      'Because the model definition is stored as TMDL in Git, rolling back is equivalent to deploying a previous commit. ' +
      'The CI pipeline can be triggered with the last known-good commit ref (a Git tag, HEAD~1, or a release branch SHA), and Tabular Editor will deploy that prior model definition to the workspace via XMLA — overwriting the bad version in place. ' +
      'This is fast (typically under 2 minutes for an XMLA deploy), auditable (the Git ref is logged), and deterministic (the exact prior state is restored). ' +
      'Fabric workspace backup (option A) is not an hourly feature for all workspaces — automated backups are not a standard Fabric SLA and certainly not restorable in under 5 minutes via the portal. ' +
      'Re-publishing a .pbix (option B) requires Power BI Desktop, which is excluded from the headless CI workflow, and the .pbix may not be up-to-date with the prior TMDL commit. ' +
      'Manual measure editing in the Service editor (option D) is slow, error-prone, and non-reproducible — it does not restore the full model definition to the prior state.',
    whyWrong: {
      0: 'Fabric does not provide automated hourly workspace backups as a default feature. Workspace-level backup and restore is available in limited scenarios (e.g., Power BI Premium Gen2 backup via XMLA), but is not a sub-5-minute general-purpose rollback mechanism.',
      1: 'Re-publishing a .pbix requires opening Power BI Desktop interactively — this contradicts the "no Power BI Desktop" requirement of the CI/CD workflow. Additionally, the .pbix may not reflect the prior TMDL commit state if the file was not updated in parallel.',
      3: 'Manually patching measures in the Power BI Service editor is a tedious, non-atomic operation that does not restore the full model definition. It is prone to human error and leaves the workspace in a manually-edited state that diverges from source control.'
    },
    source: SRC.deployment,
    tags: ['scenario', 'xmla-endpoint', 'rollback', 'tmdl', 'cicd', 'git', 'maintain']
  }),

  // ─── scn-55 — Acme Capital — DAX perf triage with VertiPaq Analyzer (3 Qs)

  multi({
    id: 'scn-55-q1',
    type: 'scenario-multi',
    domain: 'semantic',
    subtopic: 'dax-performance',
    difficulty: 4,
    scenarioId: 'scn-55',
    scenarioTitle: 'Acme Capital — DAX perf triage with VertiPaq Analyzer',
    prompt:
      'Server Timings shows the [Risk-Adjusted Return] query is FE-dominant (40 s FE vs 5 s SE). ' +
      'VertiPaq Analyzer shows DimDate has 36 columns, 50,000 rows (137-year span), and [DateKey] cardinality of 50,000. ' +
      '[Risk-Adjusted Return] is a deeply nested SUMX over FactTrades. ' +
      'Which TWO findings BEST explain the 40-second Formula Engine time? (Select 2)',
    options: [
      'The DimDate table\'s 36 columns inflate the model size and slow column-segment reads, causing the SE to return large result sets that the FE must process',
      'The deeply nested SUMX iterates over FactTrades row-by-row in the Formula Engine, evaluating intermediate per-row ratio calculations in FE context rather than pushing aggregation to the SE',
      'The 50,000-row DimDate with 137-year span creates a high-cardinality date dimension that forces the FE to maintain a large intermediate calculation context during SUMX iteration',
      'The 36 columns on DimDate are all materialised as VertiPaq segments; the column count inflates the number of SE storage segment reads per query',
      'FE-dominant time always indicates a CALCULATE context transition overhead caused by ALL() or REMOVEFILTERS() calls inside the measure'
    ],
    correct: [1, 2],
    explanation:
      'FE-dominant queries indicate that the Formula Engine is doing significant per-row work that cannot be delegated to the Storage Engine. ' +
      'SUMX iterates over the FactTrades table row-by-row in FE context, and if the intermediate ratio expression is complex (nested divisions, RELATED lookups, or nested iterators), the FE cannot compress the work into a single SE request — every row triggers additional evaluation. ' +
      'A high-cardinality DimDate (50,000 rows — one per calendar day over 137 years) compounds this: during SUMX iteration, each row of FactTrades participates in a date relationship lookup. With 50,000 distinct date values, the FE maintains a large intermediate row-context population. ' +
      'Column count (option A / D) primarily affects SE segment read volume and model storage size — it does not directly drive FE time. 36 columns is unusual but the SE time is only 5 s, confirming SE is not the bottleneck. ' +
      'CALCULATE / ALL() context transitions (option E) are one cause of FE overhead, but the question describes no CALCULATE pattern — the bottleneck is explicitly iterator + cardinality.',
    whyWrong: {
      0: 'Column count affects Storage Engine segment read volume and model file size. With SE time at only 5 s, the SE is not the bottleneck. Excess columns can slow cold model loads but do not directly produce 40-second FE time.',
      3: 'Column count affects SE segment read size, not FE computation time. VertiPaq stores each column in a separate compressed segment; more columns increase storage pressure but do not by themselves produce a 40-second FE overhead.',
      4: 'While CALCULATE context transitions and ALL()/REMOVEFILTERS() are a known FE overhead source, the question identifies no such pattern. Attributing FE dominance to a blanket "always CALCULATE overhead" explanation is a test trap — the evidence points to iterator + cardinality, not context transition.'
    },
    source: SRC.daxPerf,
    tags: ['scenario', 'dax-performance', 'fe-dominant', 'sumx', 'cardinality', 'vertiPaq', 'semantic']
  }),

  single({
    id: 'scn-55-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'dax-performance',
    difficulty: 4,
    scenarioId: 'scn-55',
    scenarioTitle: 'Acme Capital — DAX perf triage with VertiPaq Analyzer',
    prompt:
      'The architect has identified the deeply nested SUMX iterator and the 50,000-row DimDate (137-year span) as the two root causes. ' +
      'The team has three candidate fixes: ' +
      '(A) Refactor [Risk-Adjusted Return] using VAR declarations to hoist intermediate ratio computation outside the row iterator. ' +
      '(B) Trim DimDate to a 10-year span and remove unused columns to reduce cardinality to ~3,650. ' +
      '(C) Add a pre-aggregated aggregation table at month-date granularity over FactTrades. ' +
      'Which fix should the team apply FIRST to minimise re-work and get an accurate baseline measurement?',
    options: [
      'Fix C first (aggregation table) — it eliminates SE scan volume regardless of FE iterator efficiency',
      'Fix A first (VAR refactor) — it directly addresses the primary FE bottleneck with a low-risk DAX-only change; no schema restructuring required',
      'Fix B first (DimDate trim) — reducing dimension cardinality is the fastest schema change and unblocks the iterator optimisation',
      'All three fixes should be applied simultaneously in a single deployment to measure the combined impact'
    ],
    correct: 1,
    explanation:
      'The VAR refactor (Fix A) is the correct first step. ' +
      'It targets the primary root cause — the FE-dominant SUMX iterator — with a DAX-only change that requires no schema restructuring, no table additions, and no impact on downstream reports or refresh pipelines. ' +
      'Applying the aggregation table (Fix C) first is wasteful: you would be building a pre-aggregation layer on top of an iterator measure that is still inefficient — if the VAR refactor later changes query patterns, the aggregation table may need to be redesigned. ' +
      'DimDate trim (Fix B) is the right second step: once the iterator is fixed and FE time is measured post-refactor, trimming DimDate removes residual cardinality overhead with a contained schema change. ' +
      'Applying all three simultaneously (option D) makes it impossible to isolate which fix produced which improvement — the team loses the ability to verify each change and attribute causality, violating the systematic triage principle.',
    whyWrong: {
      0: 'The aggregation table is the most architecturally complex change. Applying it before the VAR refactor means you are optimising SE access patterns for a measure that is still FE-inefficient. If the DAX refactor changes the query shape, the aggregation table may need to be rebuilt — wasted effort.',
      2: 'DimDate trim reduces cardinality overhead, which compounds the SUMX problem but is not the primary driver of 40-second FE time. The VAR refactor addresses the bigger lever first. DimDate trim is the correct second step, not the first.',
      3: 'Applying all three changes simultaneously eliminates the ability to measure the individual contribution of each fix. If performance improves (or does not), the team cannot determine which change was responsible, making future iterations and regression analysis impossible.'
    },
    source: SRC.daxPerf,
    tags: ['scenario', 'dax-performance', 'sumx', 'var', 'aggregations', 'fix-order', 'semantic']
  }),

  single({
    id: 'scn-55-q3',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'dax-performance',
    difficulty: 3,
    scenarioId: 'scn-55',
    scenarioTitle: 'Acme Capital — DAX perf triage with VertiPaq Analyzer',
    prompt:
      'After the VAR refactor and DimDate trim, DAX Studio Server Timings shows FE time dropped from 40 s to 8 s. ' +
      'SE time is unchanged at 5 s. Total query time is now 13 s — still above the target. ' +
      'The junior analyst again proposes an SKU upgrade. ' +
      'What should the architect evaluate NEXT before considering a hardware change?',
    options: [
      'Approve the SKU upgrade immediately — 13 s is still user-impacting and only more CUs will close the remaining gap',
      'Check if the remaining 8 s FE time correlates with a CALCULATE context transition by examining the Server Timings "FE callout" breakdown for context filter overhead; if so, refactor using KEEPFILTERS or restructure the measure\'s filter arguments',
      'Add a pre-aggregated aggregation table at date-month granularity so the SE answers summary queries without iterating the full FactTrades fact table, then re-measure',
      'Switch the semantic model storage mode from Direct Lake to Import to eliminate any residual framing overhead contributing to FE latency'
    ],
    correct: 2,
    explanation:
      'With FE time at 8 s and SE time at 5 s, the remaining bottleneck is still partly FE-heavy but now in a range where an aggregation table can make a structural difference. ' +
      'Pre-aggregated aggregation tables at month-date granularity allow the Storage Engine to answer the summary visuals (the typical risk-adjusted return report view) by reading a small aggregation Delta table rather than iterating 200M FactTrades rows. ' +
      'When the aggregation hit rate is high, SE time drops and FE iterator work largely disappears because the iterator has far fewer rows to process. ' +
      'An SKU upgrade (option A) at this stage is premature — the architecture still has an unapplied structural improvement (aggregation table) that is both cheaper and more effective. ' +
      'Examining CALCULATE context transitions (option B) is the right next move if the remaining FE time is context-transition-driven; however, given that the measure is an SUMX-based iterator (not a CALCULATE/ALL pattern), the aggregation table is more targeted. ' +
      'Switching to Import mode (option D) introduces refresh latency and memory overhead and does not address the FE iterator bottleneck — FE time is independent of storage mode.',
    whyWrong: {
      0: 'An SKU upgrade adds compute budget but does not reduce the volume of data the iterator must traverse. The aggregation table is a structural fix that eliminates the per-row FE work for the most common query patterns — it should be evaluated before spending on a larger SKU.',
      1: 'CALCULATE context-transition analysis is appropriate when Server Timings shows high "FE callout" overhead tied to filter re-evaluation. The root cause here is SUMX iteration, not CALCULATE context transitions — the VAR refactor has already addressed most of that. The aggregation table is the higher-impact next step.',
      3: 'Switching to Import mode does not reduce FE iterator time. Formula Engine evaluation happens at query time regardless of storage mode (Import, Direct Lake, or DirectQuery). Import mode eliminates DirectQuery round-trips but the bottleneck here is FE computation inside the iterator, not storage-layer latency.'
    },
    source: SRC.daxPerf,
    tags: ['scenario', 'dax-performance', 'aggregations', 'fe-dominant', 'sumx', 'vertiPaq', 'semantic']
  })

];
