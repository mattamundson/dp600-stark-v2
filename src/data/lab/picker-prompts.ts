// Component-picker question bank.
//
// 20 Fabric scenarios where the user picks ONE of the 9 canonical Fabric
// components. Self-contained: no external imports needed beyond the inline
// types below. The 9 options are identical (and in the same order) on every
// prompt — that is the UX contract.
//
// Correct-answer distribution intentionally spreads across all 9 options
// so the user cannot pattern-match a single label.

export interface PickerOption {
  id: string;
  label: string;
}

export interface PickerPrompt {
  id: string; // pp-001..pp-020
  business: string; // 1-line business context
  scenario: string; // 2-3 sentence Fabric scenario
  options: PickerOption[]; // exactly the 9 fabric items below, same order each time
  correctId: string; // option.id of the right answer
  explanation: string; // 2-4 sentences why
  whyWrong: Record<string, string>; // by option.id, must cover all 8 non-correct options
  tags: string[];
  domain: 'prepare';
  difficulty: 2 | 3 | 4 | 5;
}

const OPTIONS: PickerOption[] = [
  { id: 'lakehouse', label: 'Lakehouse' },
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'eventhouse', label: 'Eventhouse / KQL DB' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'dataflow-gen2', label: 'Dataflow Gen2' },
  { id: 'pipeline', label: 'Data Pipeline' },
  { id: 'reflex', label: 'Reflex (Activator)' },
  { id: 'mirrored-db', label: 'Mirrored Database' },
  { id: 'semantic-model', label: 'Semantic Model' }
];

// Helper to keep the file readable while still emitting the canonical option set.
function p(
  id: string,
  difficulty: 2 | 3 | 4 | 5,
  business: string,
  scenario: string,
  correctId: string,
  explanation: string,
  whyWrong: Record<string, string>,
  tags: string[]
): PickerPrompt {
  return {
    id,
    business,
    scenario,
    options: OPTIONS,
    correctId,
    explanation,
    whyWrong,
    tags,
    domain: 'prepare',
    difficulty
  };
}

export const pickerPrompts: PickerPrompt[] = [
  p(
    'pp-001',
    3,
    'Mid-size CPG with on-prem Azure SQL DB driving the BI stack',
    'The team needs Fabric to ALWAYS reflect the latest source rows from a 240 GB Azure SQL DB with sub-minute lag, with NO custom ETL code, and no extra capacity charged for replication compute. They want SQL-endpoint access to the data inside Fabric.',
    'mirrored-db',
    'Mirrored Database is purpose-built: continuous one-way replication, no custom code, free replication compute, lands as Delta in OneLake with auto SQL endpoint and Direct Lake-ready semantic model.',
    {
      lakehouse: 'Lakehouse is a destination for ingested data, not a replication mechanism — would need pipelines + custom ETL.',
      warehouse: 'Warehouse is a SQL-first store but not a replication mechanism for an external DB.',
      eventhouse: 'Eventhouse is for streaming/time-series telemetry, not transactional DB replication.',
      notebook: 'A notebook would require custom Spark code AND scheduling — explicit "no custom code" violation.',
      'dataflow-gen2': 'Dataflow Gen2 runs on a refresh schedule and is M-language ETL — does not meet the sub-minute lag with no code requirement.',
      pipeline: 'Pipelines orchestrate movement but do not provide native CDC of an external DB without bespoke logic.',
      reflex: 'Reflex triggers downstream actions on conditions; not a replication mechanism.',
      'semantic-model': 'Semantic Model is consumption-side; does not replicate source data.'
    },
    ['mirroring', 'azure-sql', 'cdc']
  ),
  p(
    'pp-002',
    2,
    'Small-team analytics shop standing up a centralised data lake',
    'The team has 8 TB of Parquet/CSV files arriving daily into ADLS Gen2 from a partner. They need a Fabric item that hosts Delta tables, supports both PySpark notebooks AND a SQL endpoint over the same files, and serves Power BI Direct Lake.',
    'lakehouse',
    'Lakehouse is the canonical "Spark + SQL endpoint over Delta in OneLake" item; it serves Direct Lake natively and supports notebook code-first workflows.',
    {
      warehouse: 'Warehouse is T-SQL only; Spark cannot natively write to it.',
      eventhouse: 'Eventhouse is KQL only — neither Spark notebooks nor SQL endpoint over Delta.',
      notebook: 'A notebook is compute, not a storage item.',
      'dataflow-gen2': 'Dataflow Gen2 transforms data; it is not a storage destination by itself.',
      pipeline: 'A pipeline orchestrates; it is not a storage item.',
      reflex: 'Reflex triggers actions on conditions; not storage.',
      'mirrored-db': 'Mirroring targets transactional DBs, not file lakes.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['lakehouse', 'fundamentals']
  ),
  p(
    'pp-003',
    3,
    'Finance org running a nightly close that needs ACID and rollback',
    'The team has 60 GB of structured financial data, all-SQL skills, and needs multi-statement T-SQL transactions with ROLLBACK semantics for the close. They want classic dimensional modelling in T-SQL.',
    'warehouse',
    'Warehouse is the SQL-first store with full T-SQL DDL/DML and multi-statement ACID — exactly what a transactional close needs. Lakehouse SQL endpoint is read-only.',
    {
      lakehouse: 'Lakehouse SQL endpoint is read-only — no T-SQL DML, no multi-statement transactions.',
      eventhouse: 'Eventhouse is KQL streaming/time-series, not T-SQL ACID.',
      notebook: 'Notebooks are PySpark code; the team is SQL-skilled and needs T-SQL ACID.',
      'dataflow-gen2': 'Dataflow Gen2 does not provide multi-statement T-SQL ACID semantics.',
      pipeline: 'Pipeline orchestrates; it does not provide T-SQL ACID.',
      reflex: 'Reflex is for triggers, not for T-SQL transactions.',
      'mirrored-db': 'Mirrored DB is read-only on the Fabric side; cannot host the transactional close.',
      'semantic-model': 'Semantic Model is consumption, not the storage tier for a close.'
    },
    ['warehouse', 'tsql', 'acid']
  ),
  p(
    'pp-004',
    3,
    'IoT manufacturer with 25k events/sec from connected devices',
    'Telemetry streams from Event Hubs into Fabric. The team needs sub-second ingest-to-query freshness, KQL operators (make-series, mv-expand, summarize bin) for time-series analysis, and built-in hot/cold tiering.',
    'eventhouse',
    'Eventhouse / KQL DB is purpose-built for streaming time-series with sub-second ingest-to-query, native KQL operators, and tiering — exactly the IoT shape.',
    {
      lakehouse: 'Lakehouse is batch / Delta-shaped; cannot deliver sub-second streaming freshness.',
      warehouse: 'Warehouse is T-SQL/BI batch — not streaming-shaped.',
      notebook: 'A notebook is compute, not a streaming store.',
      'dataflow-gen2': 'Dataflow Gen2 is scheduled batch ETL.',
      pipeline: 'Pipeline orchestrates; not a streaming store.',
      reflex: 'Reflex triggers on conditions; it does not store the telemetry.',
      'mirrored-db': 'Mirroring targets transactional DBs, not Event Hubs streams.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['eventhouse', 'streaming', 'iot']
  ),
  p(
    'pp-005',
    4,
    'Data engineering team modernising a 4 TB nightly ELT job',
    'The job needs custom Python UDFs for fuzzy address matching, cluster-tunable parallelism, unit-tested code in Git with CI/CD, and the ability to read AND write Delta tables in a Lakehouse.',
    'notebook',
    'Notebooks are the code-first, Git-friendly, cluster-tunable Spark surface — custom UDFs, scaled parallelism, and full read/write to Lakehouse Delta. Exactly the use case.',
    {
      lakehouse: 'Lakehouse is the storage; the question asks for the COMPUTE / authoring item.',
      warehouse: 'Warehouse is T-SQL only — no custom Python UDFs at scale.',
      eventhouse: 'Eventhouse is KQL streaming, not Spark batch ELT.',
      'dataflow-gen2': 'Dataflow Gen2 is low-code M; custom Python UDFs and Git-CI workflows are awkward.',
      pipeline: 'Pipeline orchestrates; the actual transformation lives elsewhere.',
      reflex: 'Reflex triggers downstream actions; it is not a transformation tool.',
      'mirrored-db': 'Mirroring is for source replication, not transformation.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['notebook', 'spark', 'elt']
  ),
  p(
    'pp-006',
    3,
    'Analyst-led BI team with strong Power Query skills',
    'The team must transform a 5 GB daily CSV with 4 lookups and simple type casting into a Lakehouse Delta table. They want low-code authoring on a refresh schedule, with no Spark exposure required.',
    'dataflow-gen2',
    'Dataflow Gen2: Power Query M low-code authoring, refresh schedule, writes to Lakehouse / Warehouse / KQL DB destinations. Exactly the analyst-friendly shape for this volume.',
    {
      lakehouse: 'Lakehouse is the destination; we still need a transformation tool.',
      warehouse: 'Warehouse hosts T-SQL transforms but the team is Power-Query-skilled, not T-SQL.',
      eventhouse: 'Eventhouse is for streaming KQL; not CSV ETL.',
      notebook: 'Notebook would force Spark exposure — violates the "no Spark" constraint.',
      pipeline: 'Pipeline orchestrates; we still need the transformation tool.',
      reflex: 'Reflex is for triggers, not transformation.',
      'mirrored-db': 'Mirroring is for transactional DB replication, not CSV ingestion.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['dataflow-gen2', 'low-code']
  ),
  p(
    'pp-007',
    3,
    'Platform team running a chained nightly batch with conditional logic',
    'The chain runs: refresh Dataflow → wait for completion → execute Notebook → on failure send a Teams alert and write to a log table → on success kick off semantic model refresh. Which item ORCHESTRATES this chain?',
    'pipeline',
    'Data Pipelines (Data Factory in Fabric) are the orchestrator: chained activities, conditional branching, on-success/on-failure routing, and Teams notifications. Notebooks/Dataflows are units of work the pipeline runs.',
    {
      lakehouse: 'Lakehouse is storage; not an orchestrator.',
      warehouse: 'Warehouse is storage; not an orchestrator.',
      eventhouse: 'Eventhouse is storage for telemetry; not an orchestrator of items.',
      notebook: 'A notebook executes code; it can call activities but is not the orchestrator pattern.',
      'dataflow-gen2': 'Dataflow Gen2 is a unit of work; it does not orchestrate other items.',
      reflex: 'Reflex triggers on conditions but is event-shape, not nightly chained-batch orchestration.',
      'mirrored-db': 'Mirroring replicates a source; not an orchestrator.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['pipeline', 'orchestration']
  ),
  p(
    'pp-008',
    4,
    'Operations team that wants to act on data conditions in near real-time',
    'When a KQL query against the Eventhouse returns more than 50 device errors per minute, the team needs an automatic Teams message AND a row written to an incident table. No custom polling job; the action should fire on data conditions.',
    'reflex',
    'Reflex (Activator) is the no-code "act on data conditions" item — it watches Eventhouse / Power BI / Eventstream for conditions and triggers downstream actions (Teams message, Power Automate, custom action). Exact fit.',
    {
      lakehouse: 'Lakehouse stores data; it does not trigger actions.',
      warehouse: 'Warehouse stores data; it does not trigger actions.',
      eventhouse: 'Eventhouse stores telemetry; the trigger layer on top of it is Reflex.',
      notebook: 'A notebook would require custom polling — explicit anti-requirement.',
      'dataflow-gen2': 'Dataflow Gen2 is ETL on a schedule; not an event trigger.',
      pipeline: 'A pipeline could check on a schedule but is not the canonical event-on-condition surface.',
      'mirrored-db': 'Mirrored DB replicates; it does not trigger actions.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['reflex', 'activator', 'eventing']
  ),
  p(
    'pp-009',
    3,
    'BI consumption team building a Direct Lake report for the CFO pack',
    'The Gold Lakehouse table is V-Ordered and ready. The team now needs the entity that holds the relationships, measures, calculation groups, and RLS roles — and serves Power BI reports / Excel via XMLA.',
    'semantic-model',
    'Semantic Model is the consumption-layer artifact: tables, relationships, measures, calc groups, RLS, XMLA endpoint, Direct Lake source binding. Exactly what is needed once Gold is ready.',
    {
      lakehouse: 'Lakehouse is the source of Gold tables; it does not host measures or RLS roles.',
      warehouse: 'Warehouse stores tables; it is not the semantic / model surface for Power BI.',
      eventhouse: 'Eventhouse is streaming storage.',
      notebook: 'Notebooks are compute.',
      'dataflow-gen2': 'Dataflow Gen2 is ETL, not the consumption model layer.',
      pipeline: 'Pipeline orchestrates ETL; not the model layer.',
      reflex: 'Reflex is event triggers.',
      'mirrored-db': 'Mirrored DB replicates a source; it does not hold the BI model.'
    },
    ['semantic-model', 'direct-lake', 'bi-consumption']
  ),
  p(
    'pp-010',
    2,
    'Cross-BU data sharing inside one Fabric tenant',
    'Region A owns a 1.4 TB CustomerDim Lakehouse table. Regions B–F want to query it WITHOUT copying or duplicating storage, with automatic propagation of updates. They are all in the same tenant.',
    'lakehouse',
    'A Lakehouse owned by Region A, with OneLake Shortcuts from B–F into it, gives zero-copy live access. The destination ITEM is the consuming Lakehouse (which holds the shortcut). Mirroring does not apply (Fabric→Fabric is not a Mirroring scenario).',
    {
      warehouse: 'Warehouse is the wrong destination — the data is Lakehouse-shaped Delta and the consumers want zero-copy.',
      eventhouse: 'Eventhouse is KQL streaming.',
      notebook: 'Notebook is compute, not storage.',
      'dataflow-gen2': 'Dataflow Gen2 would create copies in each consumer.',
      pipeline: 'Pipeline copy duplicates storage — anti-requirement.',
      reflex: 'Reflex triggers actions; not a sharing surface.',
      'mirrored-db': 'Mirroring is for external transactional DBs, not Fabric→Fabric.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['lakehouse', 'shortcut', 'sharing']
  ),
  p(
    'pp-011',
    4,
    'Security ops team with 1.2 B sign-in events over 30 days',
    'The team needs ad-hoc query latency under 5s on a 30-day rolling window, KQL-native joins to small enrichment tables, render timecharts, and the ability to retain hot data for fast investigation.',
    'eventhouse',
    'Eventhouse / KQL DB is the canonical SOC store: KQL natively, fast hot retention, render timechart, join/lookup against small reference tables.',
    {
      lakehouse: 'Lakehouse cannot deliver KQL operators or hot-tier sub-5s on 1.2B rows interactively.',
      warehouse: 'Warehouse is T-SQL, not KQL; missing the SOC operators.',
      notebook: 'Notebook is compute, not the store.',
      'dataflow-gen2': 'Dataflow Gen2 is batch ETL; not interactive.',
      pipeline: 'Pipeline orchestrates; not the store.',
      reflex: 'Reflex triggers actions on conditions; it does not store/query the events.',
      'mirrored-db': 'Mirroring targets transactional DBs.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['eventhouse', 'soc', 'kql']
  ),
  p(
    'pp-012',
    3,
    'ELT engineer materialising a 2 B-row Gold fact in Fabric Warehouse',
    'The team needs to create a transformed table from a SELECT, in one set-based statement, persisted to disk in the Warehouse. Schema and data in one shot.',
    'warehouse',
    'Warehouse is the right item; the canonical pattern there is CTAS (CREATE TABLE AS SELECT). Single-statement, set-based, schema+data — idiomatic Polaris ELT.',
    {
      lakehouse: 'Lakehouse SQL endpoint is read-only — no T-SQL CTAS / DDL.',
      eventhouse: 'Eventhouse uses KQL; not T-SQL CTAS.',
      notebook: 'A notebook can do this in Spark but the team is doing T-SQL Warehouse ELT.',
      'dataflow-gen2': 'Dataflow Gen2 is M, not T-SQL CTAS.',
      pipeline: 'Pipeline orchestrates; the SQL still has to live in Warehouse.',
      reflex: 'Reflex is event triggers.',
      'mirrored-db': 'Mirroring is for source replication, not transformation.',
      'semantic-model': 'Semantic Model is consumption.'
    },
    ['warehouse', 'ctas', 'tsql']
  ),
  p(
    'pp-013',
    4,
    'Migration from on-prem SQL Server to Fabric for a 200-GB OLTP-shaped DB',
    'The OLTP DB is Azure SQL DB (already migrated). The team wants Fabric to keep a continuously-replicated read-only copy as Delta in OneLake, queryable via SQL endpoint and Direct Lake — with no code.',
    'mirrored-db',
    'Azure SQL DB is a supported Mirroring source; this is exactly the use case. Continuous one-way CDC replication, free replication compute, lands as Delta with auto SQL endpoint.',
    {
      lakehouse: 'Lakehouse needs ingestion code/pipeline; not zero-code CDC.',
      warehouse: 'Warehouse is a destination but not a CDC mechanism.',
      eventhouse: 'Eventhouse is for streaming, not OLTP CDC.',
      notebook: 'Notebook means custom code — anti-requirement.',
      'dataflow-gen2': 'Dataflow Gen2 is scheduled batch, not continuous CDC.',
      pipeline: 'Pipeline lacks native source CDC without bespoke logic.',
      reflex: 'Reflex is event triggers.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['mirroring', 'azure-sql', 'cdc']
  ),
  p(
    'pp-014',
    4,
    'A Direct Lake report shows stale numbers after a Gold table change',
    'The Gold Delta table was OPTIMIZE-d and a new column added. Reports still see old data and missing column for ~10 minutes. Which artifact must be RE-FRAMED (or the change applied to) for the new bytes/columns to surface?',
    'semantic-model',
    'Direct Lake framing is a property of the Semantic Model. The model frames a snapshot of Delta versions; framing on next query (or via API) applies new data and schema. The Lakehouse is fine — the model needs the framing.',
    {
      lakehouse: 'Lakehouse already holds the new bytes; the action lives at the model layer.',
      warehouse: 'Warehouse is unrelated.',
      eventhouse: 'Eventhouse is unrelated.',
      notebook: 'Notebook may have written the change but does not need to be re-framed.',
      'dataflow-gen2': 'Dataflow is unrelated to the framing.',
      pipeline: 'Pipeline runs the ETL; not the framing surface.',
      reflex: 'Reflex is event triggers.',
      'mirrored-db': 'Mirroring is irrelevant; this is a Lakehouse Gold change.'
    },
    ['semantic-model', 'direct-lake', 'framing']
  ),
  p(
    'pp-015',
    3,
    'Streaming Eventhouse with critical thresholds being exceeded',
    'When the Eventhouse KQL query "1-minute device error rate" exceeds 200, the team needs an automatic notification AND an Activator action without writing custom polling code. Which item provides this no-code event-on-condition surface?',
    'reflex',
    'Reflex (Activator) is the no-code event-on-condition surface for Eventhouse / Power BI / Eventstream. It runs the KQL trigger natively and dispatches Teams / Power Automate / custom actions.',
    {
      lakehouse: 'Lakehouse stores data; it does not trigger.',
      warehouse: 'Warehouse stores data; it does not trigger.',
      eventhouse: 'Eventhouse stores the data; the trigger layer is Reflex.',
      notebook: 'A notebook needs explicit scheduling — not an event surface.',
      'dataflow-gen2': 'Dataflow Gen2 is batch ETL on a schedule.',
      pipeline: 'Pipelines run on schedules / triggers, but Reflex is the canonical no-code event-on-data-condition surface.',
      'mirrored-db': 'Mirroring is for replication, not events.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['reflex', 'kql', 'eventing']
  ),
  p(
    'pp-016',
    2,
    'Brand-new Fabric tenant standing up its first medallion stack',
    'The team needs a single item to host Bronze raw landing tables (append-only Delta) AND give them PySpark notebook access for Silver/Gold transforms downstream. Storage skill emphasises "Delta in OneLake".',
    'lakehouse',
    'Lakehouse hosts Bronze Delta append-only AND is the natural read/write target for Spark notebooks. The medallion canonical container.',
    {
      warehouse: 'Warehouse is T-SQL; Spark cannot natively write to it.',
      eventhouse: 'Eventhouse is streaming KQL.',
      notebook: 'A notebook is compute, not storage.',
      'dataflow-gen2': 'Dataflow Gen2 is ETL on a schedule, not the storage item.',
      pipeline: 'Pipeline orchestrates; not the storage item.',
      reflex: 'Reflex triggers actions.',
      'mirrored-db': 'Mirroring is for transactional source replication.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['lakehouse', 'medallion', 'bronze']
  ),
  p(
    'pp-017',
    4,
    'Ad-hoc daily ingestion of a vendor SFTP file with a Power-Query-skilled analyst',
    'A 1.2 GB CSV arrives at 02:00 daily. The analyst must dedupe, type-cast, lookup against a 200K-row reference, and write to a Lakehouse Delta table. Low-code, scheduled, no Spark exposure.',
    'dataflow-gen2',
    'Volume + low-code + Power Query skills + scheduled refresh + Lakehouse destination = Dataflow Gen2 sweet spot.',
    {
      lakehouse: 'Lakehouse is the destination; we still need an ETL surface.',
      warehouse: 'Warehouse is T-SQL ELT, not Power Query.',
      eventhouse: 'Eventhouse is streaming KQL.',
      notebook: 'Notebook would force Spark — anti-requirement.',
      pipeline: 'Pipeline orchestrates; we still need the transformation tool.',
      reflex: 'Reflex is event triggers.',
      'mirrored-db': 'Mirroring is for transactional source DB replication.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['dataflow-gen2', 'analyst-driven']
  ),
  p(
    'pp-018',
    4,
    'Ops team building a daily chained job with conditional branching and notifications',
    'Each night the chain copies vendor files → runs a Dataflow → fans out to two notebooks → on success refreshes the Direct Lake model → on failure logs to a table and sends a Teams alert. The team needs a SINGLE Fabric ITEM to express the whole chain declaratively.',
    'pipeline',
    'Data Pipeline is the chain orchestrator: copy activity, dataflow refresh, notebook activity, condition/branch, on-success / on-failure paths, semantic-model refresh, Teams notification.',
    {
      lakehouse: 'Lakehouse is storage; not orchestration.',
      warehouse: 'Warehouse is storage; not orchestration.',
      eventhouse: 'Eventhouse is storage; not orchestration.',
      notebook: 'A notebook is one activity in the chain, not the chain itself.',
      'dataflow-gen2': 'Dataflow Gen2 is one activity in the chain.',
      reflex: 'Reflex is condition-driven event triggers — not nightly chained-batch orchestration.',
      'mirrored-db': 'Mirroring replicates a source.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['pipeline', 'orchestration', 'on-failure']
  ),
  p(
    'pp-019',
    5,
    'Code-first Spark engineer building a streaming-ish enrichment with custom UDFs at 4 TB/day',
    'The job MUST run a Python UDF for fuzzy entity resolution, scale across many cluster cores, READ from a Lakehouse, WRITE Delta back, and live in Git. Dataflow Gen2 is forbidden by the team\'s engineering standards (no low-code).',
    'notebook',
    'Notebook = code-first, custom Python UDF at scale, full Spark cluster control, Git/CI workflow, Lakehouse read/write Delta. The exact use case.',
    {
      lakehouse: 'Lakehouse is the source/sink storage; the question asks for the COMPUTE surface.',
      warehouse: 'Warehouse is T-SQL only; no custom Python UDFs at scale.',
      eventhouse: 'Eventhouse is KQL streaming, not Spark batch.',
      'dataflow-gen2': 'Dataflow Gen2 is explicitly forbidden by the team\'s standards.',
      pipeline: 'Pipeline orchestrates; the actual UDF lives in code.',
      reflex: 'Reflex is event triggers.',
      'mirrored-db': 'Mirroring is for source replication.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['notebook', 'spark', 'udf']
  ),
  p(
    'pp-020',
    5,
    'Compliance-driven 5-year archive with 90-day hot interactive retention',
    'Hot 90 days of telemetry already lives in Eventhouse / KQL DB. The team needs to age cold data out into a separate item that supports cheap long-term Delta storage, Power BI Direct Lake access for occasional historical queries, and Spark notebook reads. Which item should hold the cold tier?',
    'lakehouse',
    'A Lakehouse holds cold Delta cheaply, supports Spark + SQL endpoint reads, and serves Direct Lake for occasional historical Power BI queries. Eventhouse stays hot; Lakehouse stays cold. Two-tier observability pattern.',
    {
      warehouse: 'Warehouse is T-SQL/BI batch — fine but more expensive than Lakehouse and lacks Spark-native reads.',
      eventhouse: 'Eventhouse is the HOT tier — moving cold there defeats the cost goal.',
      notebook: 'Notebook is compute, not the cold-tier store.',
      'dataflow-gen2': 'Dataflow Gen2 is ETL, not a storage tier.',
      pipeline: 'Pipeline orchestrates the move; it is not the cold-tier store itself.',
      reflex: 'Reflex is event triggers.',
      'mirrored-db': 'Mirrored DB is source replication, not a cold-tier archive.',
      'semantic-model': 'Semantic Model is consumption-side.'
    },
    ['lakehouse', 'eventhouse', 'tiering']
  )
];
