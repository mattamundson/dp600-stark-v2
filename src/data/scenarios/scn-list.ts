import type { Scenario } from '../../lib/schema';

// Senior-level DP-600 scenarios. Each forces a tradeoff (cost vs latency,
// freshness vs simplicity, security vs convenience). Question content lives
// in `../questions/q-scenarios.ts`; the questionIds here MUST stay in sync
// with the ids in that file.

export const scenarioBatch: Scenario[] = [
  // ── Direct Lake (4 scenarios, 10 questions) ─────────────────────────
  {
    id: 'scn-01',
    title: 'Contoso Retail OneLake migration',
    domain: 'semantic',
    business: 'Contoso Retail — ~3,000 stores, mid-size BI team of 8 analysts and 2 platform engineers',
    prompt:
      'Contoso Retail runs a 140 GB Import-mode Power BI dataset (StoreSales) on a P2 Premium capacity. ' +
      'The nightly refresh window is 95 minutes and is regularly missed when supplier feeds arrive late. ' +
      'The team is migrating to Microsoft Fabric on an F64 capacity and wants StoreSales rebuilt as a Lakehouse-backed semantic model in Direct Lake. ' +
      'Operational reports must keep sub-2-second p95 latency, sales finance refuses to wait for an overnight refresh anymore, and four legacy reports rely on a calculated column [MarginBucket] currently defined inside the Import model.',
    questionIds: ['scn-01-q1', 'scn-01-q2', 'scn-01-q3'],
    tags: ['direct-lake', 'migration', 'onelake', 'lakehouse']
  },
  {
    id: 'scn-02',
    title: 'Northwind Logistics fallback storms',
    domain: 'semantic',
    business: 'Northwind Logistics — pan-European parcel carrier, 200-seat ops centre',
    prompt:
      'Northwind Logistics shipped a Direct Lake model (FleetOps) over a Warehouse on an F32 capacity two weeks ago. ' +
      'Between 09:00 and 11:00 CET each weekday, the Capacity Metrics app shows DirectQuery fallback ratio spiking from 2% to 38%, p95 visual render time triples, and CU% hits 92%. ' +
      'Outside those hours the model behaves normally. The Warehouse ETL writes hourly Delta commits and a junior engineer recently re-wrote the FactShipments OPTIMIZE job to disable V-Order "to save compute". ' +
      'There are three measures using complex SELECTEDVALUE-driven dynamic RLS that were added in the same release.',
    questionIds: ['scn-02-q1', 'scn-02-q2', 'scn-02-q3'],
    tags: ['direct-lake', 'fallback', 'capacity', 'v-order']
  },
  {
    id: 'scn-03',
    title: 'Acme Capital Markets DirectLakeOnly mandate',
    domain: 'semantic',
    business: 'Acme Capital Markets — buy-side asset manager, regulated by FINRA and the SEC',
    prompt:
      'Acme Capital Markets must deliver an intraday RiskExposure semantic model with a contractual SLA: ' +
      '99th-percentile query latency under 800 ms during US market hours, with NO unannounced degradation paths. ' +
      'Compliance has explicitly forbidden silent fallback to DirectQuery because slow trades trigger regulatory inquiries. ' +
      'The data engineer has built a Direct Lake model over a Warehouse with V-Order enabled on all six fact partitions, but the head of risk wants formal proof the model cannot degrade.',
    questionIds: ['scn-03-q1', 'scn-03-q2'],
    tags: ['direct-lake', 'directlakeonly', 'sla', 'regulated']
  },
  {
    id: 'scn-04',
    title: 'Globex Pharma framing semantics',
    domain: 'semantic',
    business: 'Globex Pharma — clinical trial data ops, 15-person platform team',
    prompt:
      'Globex Pharma runs a Direct Lake semantic model over a Lakehouse called TrialResults. ' +
      'A pipeline writes new Delta commits to FactObservations every 10 minutes via a notebook MERGE. ' +
      'This morning the pipeline added a new STRING column "AdverseEventCode" to FactObservations and the team published an updated semantic model that references it. ' +
      'Analysts report that some queries see the new column while others throw a "column not found" error for ~20 minutes after deployment.',
    questionIds: ['scn-04-q1', 'scn-04-q2'],
    tags: ['direct-lake', 'framing', 'schema-change']
  },

  // ── Deployment pipelines (2 scenarios, 5 questions) ─────────────────
  {
    id: 'scn-05',
    title: 'Initech three-stage Fabric pipeline',
    domain: 'maintain',
    business: 'Initech Financial — internal BI team supporting Treasury and AP/AR',
    prompt:
      'Initech is standing up a three-stage Fabric deployment pipeline (Dev → Test → Prod) for a new TreasuryDaily semantic model and report. ' +
      'Dev points at azuresql-treasury-dev (a small Azure SQL DB), Test must point at azuresql-treasury-test, and Prod must point at the production Azure SQL Managed Instance. ' +
      'The semantic model also includes parameterised connection strings, a Dataflow Gen2 dependency, and a workspace-scoped sensitivity label "Confidential — Finance" that must persist across promotions.',
    questionIds: ['scn-05-q1', 'scn-05-q2', 'scn-05-q3'],
    tags: ['deployment-pipelines', 'rules', 'governance']
  },
  {
    id: 'scn-06',
    title: 'Stark Industries hotfix selective deploy',
    domain: 'maintain',
    business: 'Stark Industries — 60-analyst BI org with five active feature branches in pipeline',
    prompt:
      'A critical bug in the [Net Margin] DAX measure of the FinancialKPIs semantic model is producing incorrect numbers for the CFO\'s daily pack. ' +
      'The Dev → Test → Prod pipeline currently has FOUR other unrelated changes mid-flight in Test (a new dataflow, two report visual updates, and a relationship change to InventoryDim). ' +
      'The fix is a single-line change to one measure and was made directly against a Dev branch. Promoting the entire Test stage forward would push the in-flight unfinished work into Prod. ' +
      'The on-call analyst has Member on Dev and Test and Viewer on Prod.',
    questionIds: ['scn-06-q1', 'scn-06-q2'],
    tags: ['deployment-pipelines', 'selective', 'permissions', 'hotfix']
  },

  // ── Governance (2 scenarios, 4 questions) ───────────────────────────
  {
    id: 'scn-07',
    title: 'Wayne Enterprises RLS+OLS+labels',
    domain: 'maintain',
    business: 'Wayne Enterprises — multi-business-unit holding company, three regional finance teams',
    prompt:
      'Wayne Enterprises has a unified ConsolidatedFinance semantic model with a Sales fact, Margin column, and three regional sub-orgs (Americas, EMEA, APAC). ' +
      'Requirement set: (a) finance analysts must only see rows for their region; ' +
      '(b) the [Margin %] column must be entirely invisible to non-finance users (not even visible in the field list); ' +
      '(c) the model carries a "Highly Confidential" sensitivity label that must propagate to any Excel export. ' +
      'A first attempt used a single RLS role per region with a measure that returns BLANK for unauthorised users.',
    questionIds: ['scn-07-q1', 'scn-07-q2'],
    tags: ['rls', 'ols', 'sensitivity-labels', 'governance']
  },
  {
    id: 'scn-08',
    title: 'Hooli workspace-role audit',
    domain: 'maintain',
    business: 'Hooli — fast-growing tech firm, 22 active Fabric workspaces, recent SOC 2 audit finding',
    prompt:
      'A SOC 2 auditor flagged that Hooli cannot demonstrate who accessed the FinancialClose workspace over the last 90 days, ' +
      'and which workspace roles were granted/revoked in that window. The Fabric admin discovers tenant settings disable export of audit logs to anyone outside the M365 admin group. ' +
      'Additionally, three external contractors were given Member on the workspace last month "temporarily" but are still members today, and a former employee\'s account is still listed as Admin.',
    questionIds: ['scn-08-q1', 'scn-08-q2'],
    tags: ['governance', 'audit', 'workspace-roles', 'tenant-settings']
  },

  // ── Data prep (3 scenarios, 7 questions) ────────────────────────────
  {
    id: 'scn-09',
    title: 'Umbrella Foods Bronze→Silver→Gold',
    domain: 'prepare',
    business: 'Umbrella Foods — CPG manufacturer, 14 source systems, central data engineering team',
    prompt:
      'Umbrella Foods is building a medallion architecture in a single Lakehouse (lh_umbrella) on an F64 capacity. ' +
      'Bronze ingests raw JSON/CSV from SAP, Salesforce, and a legacy IBM iSeries via Dataflow Gen2 and Data Pipelines. ' +
      'Silver should hold cleaned, conformed, type-cast tables; Gold should hold business-ready star-schema facts and dims served to Direct Lake semantic models. ' +
      'The team disagrees about whether Silver should use Spark notebooks (PySpark) or stored procedures in the Warehouse, and whether Gold should be a Lakehouse or a Warehouse.',
    questionIds: ['scn-09-q1', 'scn-09-q2', 'scn-09-q3'],
    tags: ['medallion', 'lakehouse', 'warehouse', 'notebooks']
  },
  {
    id: 'scn-10',
    title: 'Pied Piper Dataflow vs Notebook',
    domain: 'prepare',
    business: 'Pied Piper — 12-person analytics team, mostly Power Query / SQL skills, one PySpark contractor',
    prompt:
      'Pied Piper needs to ingest a daily 8 GB customer-event JSON file, deduplicate it on (CustomerId, EventTimestamp), ' +
      'enrich it via lookup against a 4-million-row dimension table, and write to a Delta table in lh_events. ' +
      'The lead analyst proposed Dataflow Gen2; the contractor proposed a Spark notebook. The team\'s skill mix is 90% Power Query/SQL, 10% PySpark. ' +
      'The job must finish within a 25-minute SLA each day, the team owns no notebook infrastructure today, and the data engineering manager wants to minimise long-term maintenance burden.',
    questionIds: ['scn-10-q1', 'scn-10-q2'],
    tags: ['dataflow', 'notebook', 'tradeoff', 'ingestion']
  },
  {
    id: 'scn-11',
    title: 'Soylent Industries OneLake shortcut vs ingest',
    domain: 'prepare',
    business: 'Soylent Industries — global retailer, central data team plus 6 regional analytics teams',
    prompt:
      'Soylent Industries already lands cleansed regional sales data in Azure Data Lake Storage Gen2 (ADLS) under containers per region. ' +
      'A new central FabricSales semantic model needs to query all six regions together. ' +
      'Three options are on the table: (1) OneLake shortcut from each ADLS container into a central Lakehouse; ' +
      '(2) Mirroring the source Azure SQL replicas of each region into Fabric; ' +
      '(3) Re-ingesting via Data Pipelines into a Bronze Lakehouse and re-processing centrally. ' +
      'Storage costs, freshness, and long-term governance differ across the three.',
    questionIds: ['scn-11-q1', 'scn-11-q2'],
    tags: ['shortcut', 'mirroring', 'ingestion', 'tradeoff']
  },

  // ── DAX optimization (2 scenarios, 4 questions) ─────────────────────
  {
    id: 'scn-12',
    title: 'Massive Dynamic CALCULATE perf trap',
    domain: 'semantic',
    business: 'Massive Dynamic — enterprise BI team supporting 1,200 monthly active users',
    prompt:
      'A flagship "Top 50 Customers by Margin" report at Massive Dynamic takes 14 seconds to render. ' +
      'The DAX in question uses a SUMX over Customer iterating a CALCULATE-wrapped measure with multiple FILTER(ALL(...)) arguments and a context-transition pattern inside a calculated column. ' +
      'The semantic model is Direct Lake on an F64 capacity. The Performance Analyzer shows the storage engine returns in 200 ms but the formula engine spends 13.5 seconds. ' +
      'The DAX author is convinced the issue is "Direct Lake is slow" and wants to switch to Import.',
    questionIds: ['scn-12-q1', 'scn-12-q2'],
    tags: ['dax', 'calculate', 'context-transition', 'performance']
  },
  {
    id: 'scn-13',
    title: 'Cyberdyne calc groups + field params',
    domain: 'semantic',
    business: 'Cyberdyne Systems — finance team consuming 40+ near-identical time-intel measures',
    prompt:
      'Cyberdyne\'s FinancialReporting semantic model has 47 explicit measures: [Sales], [Sales YTD], [Sales QTD], [Sales MTD], [Sales PY], [Sales YoY %] etc., repeated for [Margin], [Volume], and [GP]. ' +
      'Every new metric duplicates the same six time-intelligence variants and analysts complain about clutter in the field list. ' +
      'A senior modeller proposes consolidating with calculation groups for time intelligence and field parameters for the user-pickable metric. ' +
      'A second proposal is to keep the current structure but use display folders.',
    questionIds: ['scn-13-q1', 'scn-13-q2'],
    tags: ['dax', 'calc-groups', 'field-parameters', 'time-intelligence']
  },

  // ── KQL real-time (2 scenarios, 4 questions) ────────────────────────
  {
    id: 'scn-14',
    title: 'Aperture Science Eventhouse stream',
    domain: 'prepare',
    business: 'Aperture Science — IoT manufacturer, 18,000 connected devices emitting telemetry',
    prompt:
      'Aperture Science streams device telemetry into a Fabric Eventhouse via Eventstream from Azure Event Hubs. ' +
      'The KQL DB ingests ~25k events/sec into TelemetryRaw. ' +
      'A spike in device error codes between 14:30 and 14:45 UTC needs to be investigated immediately. ' +
      'The on-call engineer must isolate which device groups (DeviceClass × FirmwareVersion) emitted the spike, then correlate with a deployments lookup table sitting in a separate Lakehouse.',
    questionIds: ['scn-14-q1', 'scn-14-q2'],
    tags: ['kql', 'eventhouse', 'real-time', 'investigation']
  },
  {
    id: 'scn-15',
    title: 'Tyrell Corp KQL summarize/join triage',
    domain: 'prepare',
    business: 'Tyrell Corp — security operations centre, 90-day hot retention in KQL DB',
    prompt:
      'A KQL query that joins SignInEvents (1.2 billion rows over 30 days) with a 4-million-row UserDirectory enrichment table and summarises by tenant has gone from 6 seconds to 90 seconds over the last week. ' +
      'No data volume changes have been made. The analyst is using a `join kind=inner` with the small UserDirectory on the LEFT and SignInEvents on the RIGHT, and a `summarize count() by tenant, ResultType` afterwards. ' +
      'A `where TimeGenerated >= ago(7d)` clause is at the BOTTOM of the query, after the join and summarize.',
    questionIds: ['scn-15-q1', 'scn-15-q2'],
    tags: ['kql', 'performance', 'join', 'summarize']
  },

  /* ─── Wave-2 deployment scenarios (4) ───────────────────────────── */
  {
    id: 'scn-16',
    title: 'Helix Robotics parameter-rule silent no-op',
    domain: 'maintain',
    business: 'Helix Robotics — 30-analyst BI org, 6-month-old Fabric pipeline',
    prompt:
      'Helix Robotics promoted a Sales semantic model from Test to Production. The Production stage has a Parameter Rule keyed on `psqlserver` that should rebind to the Prod Azure SQL Managed Instance. After deploy, queries still resolve to the Test SQL DB. The semantic model defines a Power Query parameter named `pSqlServer` (camelCase). No errors appear in the deployment history; the rule shows as configured on the target stage.',
    questionIds: ['scn-16-q1', 'scn-16-q2'],
    tags: ['deployment-pipelines', 'parameter-rule', 'silent-failure', 'case-sensitivity']
  },
  {
    id: 'scn-17',
    title: 'Vertex Bank cross-workspace shared model',
    domain: 'maintain',
    business: 'Vertex Bank — central data platform team owning shared certified semantic models',
    prompt:
      'Vertex Bank publishes a certified shared semantic model in Workspace ws-finance-core. Six downstream report workspaces consume it. The platform team wants pipelines for both ws-finance-core and the report workspaces, with the cross-workspace report→model reference correctly rebinding from Dev-core → Test-core → Prod-core as reports promote. A first attempt promoted only the report workspace into a pipeline; reports in Test still pointed at the Dev-core semantic model.',
    questionIds: ['scn-17-q1', 'scn-17-q2', 'scn-17-q3'],
    tags: ['deployment-pipelines', 'cross-workspace', 'pairing', 'shared-model']
  },
  {
    id: 'scn-18',
    title: 'Aperture Logistics Gen1→Gen2 dataflow promotion failure',
    domain: 'maintain',
    business: 'Aperture Logistics — legacy Power BI shop migrating to Fabric',
    prompt:
      'Aperture has 14 legacy Power BI Dataflow Gen1 artifacts in their Dev workspace, plus three new Dataflow Gen2 artifacts authored last sprint. They configured a 3-stage Fabric deployment pipeline and clicked Deploy Dev→Test. The Gen2 dataflows promoted successfully; the Gen1 dataflows do not appear in the deployment list at all.',
    questionIds: ['scn-18-q1', 'scn-18-q2'],
    tags: ['deployment-pipelines', 'dataflow-gen1', 'dataflow-gen2', 'migration']
  },
  {
    id: 'scn-19',
    title: 'Soylent Industries hotfix backwards-deploy + RLS re-validate',
    domain: 'maintain',
    business: 'Soylent Industries — global retailer, 24/7 Production reporting',
    prompt:
      'A critical Production-only bug in [Net Sales] is caught at 02:00 UTC. The on-call engineer applies a hotfix directly in Prod (out-of-process) to stop the bleeding. They must now backward-deploy Prod→Test→Dev to re-align Git and the lower stages, then re-validate RLS roles in each stage. The semantic model has 6 RLS roles with members managed per-stage and 2 OLS-hidden columns.',
    questionIds: ['scn-19-q1', 'scn-19-q2', 'scn-19-q3'],
    tags: ['deployment-pipelines', 'backward-deploy', 'rls', 'hotfix']
  },

  /* ─── Wave-2 semantic-model scenarios (3) ───────────────────────── */
  {
    id: 'scn-20',
    title: 'Hyperion Energy star vs snowflake under Direct Lake',
    domain: 'semantic',
    business: 'Hyperion Energy — large utility, 60M-row meter-reading fact, federated dim hierarchy',
    prompt:
      'Hyperion has a 60M-row FactMeterReading in a Direct Lake model. Their team built Customer → CustomerSegment → SegmentRegion as a snowflaked chain (three tables). Reports are slow at the visual level despite Direct Lake; cross-island join issues appear in DAX Studio traces. A senior modeller proposes flattening the snowflake into a single Customer dim with all attributes denormalized; another team member is concerned about Lakehouse storage cost.',
    questionIds: ['scn-20-q1', 'scn-20-q2', 'scn-20-q3'],
    tags: ['star-schema', 'snowflake', 'direct-lake', 'denormalization']
  },
  {
    id: 'scn-21',
    title: 'Wayne Enterprises RLS+OLS+sensitivity-label triple-stack',
    domain: 'maintain',
    business: 'Wayne Enterprises — multi-BU finance, regulated, three regional finance teams',
    prompt:
      'Wayne needs a single ConsolidatedFinance semantic model with: (a) regional RLS for the three finance teams, (b) OLS hiding [Margin %] from non-finance users entirely (not even visible in field list), (c) a "Highly Confidential" sensitivity label that propagates to Excel exports and downstream files. A first attempt used a single RLS role per region, a calc-group item that returns BLANK for unauthorized users, and assumed sensitivity labels enforce row filtering.',
    questionIds: ['scn-21-q1', 'scn-21-q2', 'scn-21-q3'],
    tags: ['rls', 'ols', 'sensitivity-labels', 'triple-stack']
  },
  {
    id: 'scn-22',
    title: 'Massive Dynamic DAX perf triage with VertiPaq Analyzer',
    domain: 'semantic',
    business: 'Massive Dynamic — flagship enterprise BI team, 14-second p95 visual',
    prompt:
      'A flagship report cell takes 14 seconds. Performance Analyzer shows storage-engine 200ms, formula-engine 13.5s. The DAX uses SUMX over a 60M-row fact, with a CALCULATE wrapping FILTER(ALL(Product), Product[Category] = "Electronics") inside the iterator and an IFERROR wrapper. A junior author proposes "switch to Import." A senior modeller wants to triage with VertiPaq Analyzer and rewrite the DAX.',
    questionIds: ['scn-22-q1', 'scn-22-q2'],
    tags: ['dax-perf', 'vertipaq-analyzer', 'context-transition', 'iterators']
  },

  /* ─── Wave-2 prepare-data component-picker scenarios (5) ────────── */
  {
    id: 'scn-23',
    title: 'Halcyon Energy Fabric stack-from-scratch',
    domain: 'prepare',
    business: 'Halcyon Energy — utility, brand-new Fabric tenant; 14 source systems, 8 analysts, 2 platform engineers',
    prompt:
      'Halcyon Energy is greenfielding its Fabric tenant. They have 30 TB of historical Parquet in ADLS Gen2, an Azure SQL DB OLTP source for billing, and a 25k-events/sec smart-meter telemetry stream from Azure Event Hubs. They want sub-2-second BI report latency, sub-second freshness for the smart-meter ops dashboard, and zero-copy access to the partner ADLS data. Skill mix is 70% T-SQL, 20% Power Query, 10% PySpark.',
    questionIds: ['scn-23-q1', 'scn-23-q2', 'scn-23-q3'],
    tags: ['component-picker', 'fabric-architecture', 'cross-domain']
  },
  {
    id: 'scn-24',
    title: 'Cogswell Cogs OLTP-to-BI replication',
    domain: 'prepare',
    business: 'Cogswell Cogs — manufacturer with a 240 GB Azure SQL DB powering ERP and shop-floor BI',
    prompt:
      'Cogswell Cogs needs Fabric to ALWAYS reflect the latest ERP rows with sub-minute lag, NO custom ETL code, and zero replication-compute charges. A SQL endpoint and Direct Lake-ready semantic model on the replicated copy are required for the executive Daily Sales pack. A separate 8 GB CSV vendor file arrives nightly and needs Power-Query-style cleansing into a Delta destination by an analyst with no Spark experience.',
    questionIds: ['scn-24-q1', 'scn-24-q2', 'scn-24-q3'],
    tags: ['component-picker', 'mirroring', 'dataflow-gen2']
  },
  {
    id: 'scn-25',
    title: 'Spacely Sprockets observability split',
    domain: 'prepare',
    business: 'Spacely Sprockets — IoT manufacturer with 18,000 connected devices and a SOC team',
    prompt:
      'Telemetry streams in at 80k events/sec; SOC analysts need sub-second KQL queries on a 90-day hot window, with native render timechart and join to enrichment tables. Compliance requires 5-year retention of cold history queryable from Power BI. Ops also wants automatic Teams notifications when a 1-minute device error rate exceeds 200, with no custom polling code.',
    questionIds: ['scn-25-q1', 'scn-25-q2', 'scn-25-q3'],
    tags: ['component-picker', 'eventhouse', 'reflex', 'tiering']
  },
  {
    id: 'scn-26',
    title: 'Pawnee BI nightly orchestration',
    domain: 'prepare',
    business: 'Pawnee — municipal analytics team standing up a nightly chained ELT',
    prompt:
      'The Pawnee team needs a single Fabric ITEM to orchestrate the nightly chain: copy vendor SFTP files → run Dataflow Gen2 → fan out to two notebooks → on success refresh the semantic model → on failure write a log row and send Teams alert. The chain must declare conditional branching and on-success / on-failure paths.',
    questionIds: ['scn-26-q1', 'scn-26-q2', 'scn-26-q3'],
    tags: ['component-picker', 'pipeline', 'semantic-model']
  },
  {
    id: 'scn-27',
    title: 'Vandelay Imports cross-BU reference data',
    domain: 'prepare',
    business: 'Vandelay Imports — global retailer; one Region A owns CustomerDim, Regions B-F consume it',
    prompt:
      'Region A maintains the canonical 1.4 TB CustomerDim Lakehouse table. Regions B-F currently re-ingest it nightly via Pipeline copy, ballooning storage. The architect must shift the consumers to zero-copy live access while keeping the same in-tenant security boundary. No external DB is involved — this is purely Fabric → Fabric.',
    questionIds: ['scn-27-q1', 'scn-27-q2'],
    tags: ['component-picker', 'shortcut', 'lakehouse']
  },

  /* ─── Wave-2 KQL scenarios (4) ──────────────────────────────────── */
  {
    id: 'scn-28',
    title: 'Aperture Eventhouse aggregation gone wrong',
    domain: 'prepare',
    business: 'Aperture Science — IoT manufacturer, 18,000 connected devices, on-call SRE rotation',
    prompt:
      'A KQL update policy continuously enriches `RawTelemetry` into `EnrichedTelemetry` in an Eventhouse on F64. This morning a dashboard tile that summarises ErrorRate per FirmwareVersion suddenly shows half the expected number of FirmwareVersions for the last 24 hours, and the analyst notices that `EnrichedTelemetry | summarize count() by FirmwareVersion` returns fewer rows than the same query against `RawTelemetry` filtered to that window. A junior engineer added a new step yesterday: `RawTelemetry | join SymptomLookup on FirmwareVersion | ...` to enrich rows with known-issue tags.',
    questionIds: ['scn-28-q1', 'scn-28-q2', 'scn-28-q3'],
    tags: ['kql', 'eventhouse', 'join', 'innerunique', 'investigation']
  },
  {
    id: 'scn-29',
    title: 'Cyberdyne KQL perf triage',
    domain: 'prepare',
    business: 'Cyberdyne Systems — security operations centre, 90-day hot retention',
    prompt:
      'A nightly KQL report (1.2B-row SignInEvents joined to a 4M-row UserDirectory and a 12M-row DeviceRegistry, aggregated by Department over the last 7 days) was running in 90 seconds and now takes 14 minutes. No data volume change. The query author wrote it as a single pipeline with the time filter at the bottom, used `join kind=inner` for both joins, and references the same `SignInEvents | summarize ...` shape as a subquery in three downstream tiles on the dashboard.',
    questionIds: ['scn-29-q1', 'scn-29-q2', 'scn-29-q3'],
    tags: ['kql', 'performance', 'materialize', 'lookup', 'join']
  },
  {
    id: 'scn-30',
    title: 'Globex Pharma anomaly detection',
    domain: 'prepare',
    business: 'Globex Pharma — clinical trial telemetry, real-time investigation rotation',
    prompt:
      'A trial-site sensor stream lands in `SensorReadings` (Eventhouse, 30-day hot retention, ~8k events/sec). Clinical ops needs an anomaly-detection query that buckets readings into 5-minute windows, computes the p95 reading per (SiteId, SensorType), and flags 5-minute windows where the p95 is more than 3 standard deviations above the rolling 24-hour mean for that (SiteId, SensorType) pair.',
    questionIds: ['scn-30-q1', 'scn-30-q2', 'scn-30-q3'],
    tags: ['kql', 'time-series', 'percentile', 'bin', 'anomaly-detection']
  },
  {
    id: 'scn-31',
    title: 'Stark Industries cross-cluster federated query',
    domain: 'prepare',
    business: 'Stark Industries — multi-region SOC, two Eventhouses (US + EU) with regional SignIn data',
    prompt:
      'Stark must produce a cross-region "users seen on BOTH US and EU clusters in the last 24 hours" report. The US cluster owns `SignInEvents` (1B rows, 7-day hot); the EU cluster owns its own `SignInEvents` of similar shape. The analyst must write a federated KQL query with the right `kind=` for symmetric-difference and intersection cuts, mind the cross-cluster broadcast cost, and decide where time filters and projections sit. Compliance requires that no row-level data is materialised in the wrong region.',
    questionIds: ['scn-31-q1', 'scn-31-q2'],
    tags: ['kql', 'cross-cluster', 'federated', 'join', 'kind']
  }
];
