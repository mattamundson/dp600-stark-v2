import type { Question } from '../../lib/schema';
import { single, SRC } from './_helpers';

// 13 chained scenario questions for scn-56..scn-60 (Sprint-13 batch).
// IDs must stay in sync with `questionIds` in scn-list-batch4.ts.

export const scenarioQuestionsBatch4: Question[] = [

  // ─── scn-56 — Meridian Analytics — shortcuts vs mirroring vs ingest (3 Qs)

  single({
    id: 'scn-56-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'onelake-shortcuts',
    difficulty: 4,
    scenarioId: 'scn-56',
    scenarioTitle: 'Meridian Analytics — OneLake shortcuts vs mirroring vs ingest decision',
    prompt:
      'For the Azure SQL DB ERP source (200 GB, sub-minute write activity), the requirement is a Direct Lake-ready SQL endpoint ' +
      'on the replicated copy within 60 seconds of each committed transaction, with zero custom pipeline code. ' +
      'Which Fabric primitive BEST satisfies this requirement?',
    options: [
      'An OneLake shortcut from the Azure SQL DB OLTP endpoint into a Fabric Lakehouse — shortcuts virtualise the data without copying it',
      'A Fabric mirrored database targeting the Azure SQL DB — mirroring provides near-real-time CDC replication into OneLake with a SQL endpoint, no pipeline code required',
      'A Fabric Data Pipeline Copy Activity on a 15-minute scheduled trigger — moves data into a Bronze Lakehouse where a second pipeline writes to Silver',
      'A Dataflow Gen2 with an Azure SQL DB connector refreshed hourly — suitable for the sub-minute freshness window'
    ],
    correct: 1,
    explanation:
      'Fabric mirroring uses Change Data Capture (CDC) on the Azure SQL DB to continuously replicate committed transactions into OneLake as Delta tables, ' +
      'typically within 30–60 seconds of each commit. ' +
      'The mirrored database exposes a fully functional SQL endpoint, making the data immediately Direct Lake-compatible with no custom pipeline or transformation code. ' +
      'OneLake shortcuts virtualise data that already lives in a supported store (ADLS, S3, GCS, another Lakehouse) — they do not support real-time CDC replication from a transactional SQL DB. ' +
      'A 15-minute Copy Activity pipeline introduces up to 15 minutes of lag and requires orchestration code, violating the zero-custom-code and sub-minute requirements. ' +
      'Dataflow Gen2 scheduled hourly is 60× too infrequent for the sub-minute freshness requirement.',
    whyWrong: {
      0: 'OneLake shortcuts do not replicate data from Azure SQL DB via CDC — shortcuts virtualise files or objects already in ADLS Gen2, Amazon S3, Google Cloud Storage, or another OneLake Lakehouse. An Azure SQL DB is a transactional database, not a supported shortcut source.',
      2: 'A 15-minute pipeline trigger introduces up to 15 minutes of staleness — 15× beyond the 60-second SLA. It also requires explicit Copy Activity configuration, violating the zero-custom-code requirement.',
      3: 'Dataflow Gen2 scheduled hourly provides 60-minute maximum lag — 60× beyond the 60-second SLA. Dataflow is appropriate for batch ingestion of moderate-size sources with Power Query transformations, not for near-real-time CDC.'
    },
    source: SRC.mirroring,
    tags: ['scn-56', 'mirroring', 'cdc', 'sql-db', 'freshness', 'prepare']
  }),

  single({
    id: 'scn-56-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'onelake-shortcuts',
    difficulty: 4,
    scenarioId: 'scn-56',
    scenarioTitle: 'Meridian Analytics — OneLake shortcuts vs mirroring vs ingest decision',
    prompt:
      'For the historical Parquet archive in ADLS Gen2 (1.4 TB), owned by a partner team that must retain the canonical copy in ADLS, ' +
      'Meridian needs Fabric engineers to run SQL queries against it from within Lakehouses without duplicating storage. ' +
      'Which primitive is purpose-built for this requirement?',
    options: [
      'A Fabric Data Pipeline Copy Activity that ingests the 1.4 TB Parquet archive into a Bronze Lakehouse nightly — data must be in OneLake for SQL queries to work',
      'An OneLake shortcut pointing from a Fabric Lakehouse subfolder to the ADLS Gen2 container — the shortcut virtualises the Parquet files inside OneLake, making them queryable via the Lakehouse SQL endpoint without copying data',
      'A Fabric mirrored database with an ADLS Gen2 source connector — mirroring will replicate the Parquet files into OneLake automatically',
      'Dataflow Gen2 with an ADLS connector, scheduled weekly to refresh the full 1.4 TB into a Silver Lakehouse'
    ],
    correct: 1,
    explanation:
      'OneLake shortcuts are designed exactly for this scenario: the Parquet files remain in ADLS Gen2 (the partner team retains ownership and the canonical copy), ' +
      'but a shortcut mounted in a Fabric Lakehouse makes the files appear as if they were native Lakehouse tables. ' +
      'The Lakehouse SQL endpoint can then query them with T-SQL or Spark. ' +
      'No data is duplicated; the shortcut is a metadata pointer, not a data copy. ' +
      'A nightly Copy Activity would duplicate 1.4 TB of data into OneLake, double storage cost, introduce 24-hour lag, and violate the "canonical copy stays in ADLS" ownership constraint. ' +
      'Fabric mirroring does not support ADLS Gen2 as a mirroring source — it targets transactional databases (Azure SQL DB, Cosmos DB, Snowflake). ' +
      'Dataflow Gen2 weekly refresh would still copy the data into Fabric and introduce 7-day lag, violating the zero-copy, live-access requirement.',
    whyWrong: {
      0: 'Copying 1.4 TB nightly duplicates storage (doubling cost), introduces up to 24-hour lag, and transfers ownership of the canonical copy to Fabric — directly against the partner team\'s constraint that ADLS remains the master.',
      2: 'Fabric mirroring supports transactional databases and Snowflake as sources — not ADLS Gen2 blob/file storage. ADLS Gen2 Parquet files are not a mirroring source; they are a shortcut source.',
      3: 'Dataflow Gen2 ingestion copies data into Fabric, creating a duplicate 1.4 TB dataset. It also introduces weekly lag and requires re-running on each change — the opposite of the zero-copy live-access requirement.'
    },
    source: SRC.onelakeShortcuts,
    tags: ['scn-56', 'shortcuts', 'adls', 'zero-copy', 'parquet', 'prepare']
  }),

  single({
    id: 'scn-56-q3',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'medallion-architecture',
    difficulty: 3,
    scenarioId: 'scn-56',
    scenarioTitle: 'Meridian Analytics — OneLake shortcuts vs mirroring vs ingest decision',
    prompt:
      'The Meridian team is debating whether to use a single Lakehouse item for all three medallion tiers (Bronze, Silver, Gold) ' +
      'versus separate Lakehouse items per tier (one Lakehouse each for Bronze, Silver, Gold). ' +
      'Which statement BEST describes the recommended pattern and why?',
    options: [
      'Use a single Lakehouse for all three tiers — fewer items simplify workspace governance and reduce the number of SQL endpoints the semantic model must reference',
      'Use separate Lakehouse items per tier — each tier has distinct lifecycle, access controls, and refresh patterns; separate items allow tier-specific permissions, independent monitoring, and clean promotion boundaries',
      'Use a single Lakehouse but with schema separation (bronze_schema, silver_schema, gold_schema) using the Lakehouse schema feature — this achieves isolation without the overhead of multiple items',
      'Use a Warehouse for Gold and a single Lakehouse for Bronze and Silver combined — Warehouse SQL endpoint is required for Direct Lake'
    ],
    correct: 1,
    explanation:
      'Separate Lakehouse items per tier is the canonical Fabric medallion pattern. ' +
      'Each tier has distinct access requirements (Bronze = data engineers only; Gold = BI consumers), ' +
      'different refresh rates and monitoring needs, and independent workspace role assignments. ' +
      'Separate items also prevent Silver or Gold consumers from accidentally querying or overwriting Bronze raw files. ' +
      'Deployment pipelines promote workspace items — separate Lakehouses can be promoted independently if needed. ' +
      'A single Lakehouse with all three tiers co-mingled creates governance risk: a viewer-role assignment to the Gold SQL endpoint cannot be scoped away from Bronze tables in the same item. ' +
      'Lakehouse schemas (Preview as of mid-2025) provide some namespacing but do not enforce separate workspace-level security per tier. ' +
      'A Warehouse for Gold is valid but not required — a Lakehouse SQL endpoint is equally Direct Lake-compatible when Delta tables are V-Order optimised, and avoids the cost of maintaining a Warehouse.',
    whyWrong: {
      0: 'A single Lakehouse for all tiers conflates access boundaries: Bronze raw files (often containing PII or sensitive vendor data) would be reachable by any role that has access to the Gold SQL endpoint. Separating tiers is an access-control and governance requirement, not just a preference.',
      2: 'Lakehouse schemas provide namespace isolation but are still within the same Lakehouse item — workspace roles cannot be scoped to individual schemas. A Viewer assigned to the Lakehouse can still enumerate all schemas and tables, regardless of tier.',
      3: 'A Fabric Warehouse is not required for Direct Lake compatibility — a Lakehouse SQL endpoint backed by V-Order Delta tables supports Direct Lake equally well. Warehouses add T-SQL DDL capabilities but introduce additional cost and complexity without a Direct Lake benefit advantage.'
    },
    source: SRC.fabricArch,
    tags: ['scn-56', 'medallion', 'lakehouse', 'tier-isolation', 'governance', 'prepare']
  }),

  // ─── scn-57 — Axiom Data Co — Spark vs Dataflow Gen2 vs Pipelines (3 Qs)

  single({
    id: 'scn-57-q1',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'dataflow-gen2',
    difficulty: 4,
    scenarioId: 'scn-57',
    scenarioTitle: 'Axiom Data Co — Spark notebooks vs Dataflow Gen2 vs Pipelines decision',
    prompt:
      'The junior engineer proposes using Dataflow Gen2 for the 25 GB nightly JSON deduplication and lookup-join job. ' +
      'Which statement BEST explains why Dataflow Gen2 is NOT the right choice for this workload?',
    options: [
      'Dataflow Gen2 cannot write Delta output to a Lakehouse — only Warehouse tables are supported as output destinations',
      'Dataflow Gen2 runs Power Query M in-memory on a Mashup engine that is not designed for multi-GB fan-out at scale; a 25 GB JSON file with a 4M-row lookup join risks exceeding memory limits and missing the 04:00 deadline',
      'Dataflow Gen2 does not support deduplication logic — only PySpark notebooks can deduplicate rows in Fabric',
      'Dataflow Gen2 requires a premium P2 licence and is unavailable on F64 capacity'
    ],
    correct: 1,
    explanation:
      'Dataflow Gen2 uses the Power Query Mashup engine, which is optimised for low-to-moderate data volumes (typically under 1–2 GB). ' +
      'At 25 GB with a 4-million-row enrichment join, the in-memory model is prone to OOM errors, long evaluation times, and refresh failures that would violate the 04:00 Silver deadline. ' +
      'PySpark notebooks with the Delta MERGE INTO or join operations scale horizontally across Fabric\'s Spark cluster and are purpose-built for this workload size. ' +
      'Dataflow Gen2 does support Lakehouse Delta output destinations. ' +
      'Deduplication is possible in Power Query using "Remove Duplicates" — the constraint is scale, not capability. ' +
      'Dataflow Gen2 is available on all Fabric F-SKUs including F64; there is no P2 licence requirement.',
    whyWrong: {
      0: 'Dataflow Gen2 supports writing directly to Lakehouse Delta tables as an output destination — this is one of its primary use cases for Power Query-based medallion ingestion.',
      2: 'Power Query M (Dataflow Gen2) does support deduplication via the "Remove Duplicates" step — the problem is not capability but performance at 25 GB scale, where the Mashup engine becomes a bottleneck.',
      3: 'Dataflow Gen2 is a standard Fabric item available on all F-SKUs. It does not require a Power BI Premium P2 licence; that is legacy Power BI Dataflow Gen1 terminology that does not apply to Fabric.'
    },
    source: SRC.dataflow,
    tags: ['scn-57', 'dataflow-gen2', 'scale', 'mashup-engine', 'prepare']
  }),

  single({
    id: 'scn-57-q2',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'spark-notebooks',
    difficulty: 4,
    scenarioId: 'scn-57',
    scenarioTitle: 'Axiom Data Co — Spark notebooks vs Dataflow Gen2 vs Pipelines decision',
    prompt:
      'The engineering manager wants a recommendation for the 25 GB JSON file that accounts for long-term skill sustainability (8 SQL/Power Query engineers, PySpark contractors rotating off in 6 months). ' +
      'Which authoring choice is most appropriate?',
    options: [
      'PySpark notebook with Delta MERGE INTO for deduplication and a broadcast join for the 4M-row lookup — best performance, but maintenance risk when contractors leave; mitigate by documenting the notebook thoroughly',
      'Dataflow Gen2 for the deduplication and lookup steps — the 8 SQL engineers can maintain it; accept the performance risk and monitor refresh duration',
      'A Fabric Data Pipeline Copy Activity to land the JSON in Bronze, followed by a T-SQL stored procedure in a Fabric Warehouse that performs the deduplication MERGE and lookup join in Silver',
      'A Fabric Data Pipeline with a Notebook Activity invoking a PySpark notebook — best performance at scale AND the Notebook Activity wraps the Spark job in a Pipeline for error-handling and retry, making it maintainable by the SQL team through the Pipeline UI'
    ],
    correct: 3,
    explanation:
      'The recommended pattern separates concerns: the Fabric Data Pipeline (Copy Activity + Notebook Activity) provides the orchestration layer (scheduling, retry, dependency management, error-path branching) in a UI the SQL-proficient team can read and modify. ' +
      'The PySpark notebook handles the Spark-native heavy lifting (25 GB deduplication, 4M-row broadcast join, partitioned Delta write). ' +
      'When the PySpark contractors rotate off in 6 months, the team can still modify the Pipeline triggers, thresholds, and alert logic without touching the notebook. ' +
      'The notebook itself is well-bounded (one job, one output table) and easier to hand off than an end-to-end Spark architecture. ' +
      'Pure PySpark notebook (option A) with no Pipeline wrapper gives the team no orchestration UI and no retry — operationally fragile. ' +
      'Dataflow Gen2 (option B) is the wrong scale tier for 25 GB + 4M-row join as established in scn-57-q1. ' +
      'A T-SQL Warehouse MERGE (option C) is valid for moderate-size T-SQL-proficient teams but Fabric Warehouse compute is single-node scale-up, not Spark distributed — a 25 GB JSON deduplication plus lookup join will be slower than PySpark and risks the 04:00 deadline.',
    whyWrong: {
      0: 'A standalone PySpark notebook with no Pipeline wrapper has no native retry, no dependency orchestration, and no conditional branching — if the job fails at 03:45 there is no automated error path. It also gives the SQL team no UI layer to modify without touching PySpark code.',
      1: 'At 25 GB + 4M-row join, Dataflow Gen2 Mashup-engine memory limits make this operationally risky regardless of skill alignment. The performance risk is real, not speculative — 25 GB consistently pushes Mashup-engine evaluations past the 2-hour timeout window.',
      2: 'Fabric Warehouse T-SQL compute is scale-up (single node), not distributed. A 25 GB JSON file + 4M-row MERGE in T-SQL will be significantly slower than Spark and is harder to parallelize. T-SQL MERGE is excellent for SCD2 on moderate-size dimensions, not for raw-JSON multi-GB deduplication.'
    },
    source: SRC.notebooks,
    tags: ['scn-57', 'spark-notebooks', 'pipelines', 'skill-alignment', 'orchestration', 'prepare']
  }),

  single({
    id: 'scn-57-q3',
    type: 'scenario-single',
    domain: 'prepare',
    subtopic: 'dataflow-gen2',
    difficulty: 3,
    scenarioId: 'scn-57',
    scenarioTitle: 'Axiom Data Co — Spark notebooks vs Dataflow Gen2 vs Pipelines decision',
    prompt:
      'For the 500 MB vendor CSV (Power-Query-style column renaming, type-casting, Status = "Active" filter), ' +
      'which authoring approach is the correct fit given the team\'s skill mix and the workload size?',
    options: [
      'PySpark notebook with a Spark DataFrame pipeline — Spark is always faster than Dataflow Gen2 regardless of file size',
      'Dataflow Gen2 with Power Query M transformations writing Delta output to the Silver Lakehouse — 500 MB is well within Mashup-engine scale, and the 8 SQL/Power Query engineers can author and maintain it without PySpark skills',
      'A Fabric Data Pipeline Copy Activity that ingests the raw CSV and applies the column rename via a Pipeline data mapping, then a T-SQL stored procedure applies the filter',
      'A Fabric Notebook with pandas — pandas DataFrames are more familiar to SQL engineers than PySpark and handle 500 MB efficiently'
    ],
    correct: 1,
    explanation:
      'Dataflow Gen2 is purpose-built for this workload: 500 MB is comfortably within the Power Query Mashup engine\'s scale range (well under the 1–2 GB practical ceiling), ' +
      'the transformations (column rename, type-cast, simple filter) are native Power Query steps, and the output destination is a Lakehouse Delta table. ' +
      'The 8 SQL/Power Query engineers can author, test, and maintain this entirely in the Dataflow Gen2 UI with no Spark or Python skills required. ' +
      'PySpark adds Spark cluster cold-start overhead (~30–60s) and requires PySpark code maintenance for a job that is trivially simple — disproportionate complexity for 500 MB. ' +
      'A Copy Activity + T-SQL stored procedure adds Pipeline orchestration overhead and requires the SQL team to manage two items instead of one. ' +
      'Pandas in a notebook is a valid option for small files but puts the code in Python, which the majority-SQL team is less comfortable maintaining.',
    whyWrong: {
      0: 'Spark is not always faster — Spark cluster cold-start (30–60s) dominates for small files. For 500 MB with simple projections, the Mashup engine finishes before a Spark job has even started. "Always use Spark" is not a sound engineering principle.',
      2: 'Copy Activity + T-SQL procedure requires two items, two sets of monitoring, and more orchestration overhead than a single Dataflow Gen2 item. It also maps the problem to the Warehouse compute layer when the team already has a Lakehouse destination.',
      3: 'Pandas in a notebook requires Python skills that 8 of the 11 engineers do not have, creating maintenance risk. It also places the transformation inside a Notebook item that the SQL engineers cannot easily modify without Python knowledge.'
    },
    source: SRC.dataflow,
    tags: ['scn-57', 'dataflow-gen2', 'skill-alignment', 'csv', 'prepare']
  }),

  // ─── scn-58 — Vantage Financial — T-SQL Warehouse vs Lakehouse SQL endpoint (2 Qs)

  single({
    id: 'scn-58-q1',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-58',
    scenarioTitle: 'Vantage Financial — T-SQL Warehouse vs Lakehouse SQL endpoint for Direct Lake',
    prompt:
      'The compliance team requires row-level security predicates that filter FactTrades by TraderDeskId, enforced at the data layer. ' +
      'The architect is evaluating Warehouse (option A) vs Lakehouse (option B) as the Gold layer source. ' +
      'Which statement CORRECTLY describes the impact of each option on Direct Lake query performance?',
    options: [
      'Both options support Direct Lake equally — the Direct Lake engine reads column segments from OneLake Delta files regardless of whether the source is a Warehouse or a Lakehouse SQL endpoint',
      'Option A (Warehouse with warehouse-level RLS predicates) will cause Direct Lake to fall back to DirectQuery for every query against FactTrades, because warehouse predicates are evaluated by the SQL engine, not the columnar segment reader',
      'Option A (Warehouse) is preferred because warehouse-level RLS is more performant than semantic-model-layer RLS when the fact table exceeds 100M rows',
      'Option B (Lakehouse SQL endpoint) does not support row-level filtering of any kind — RLS must be implemented in the semantic model for Lakehouse sources'
    ],
    correct: 1,
    explanation:
      'This is the core Direct Lake fallback trap for warehouse-level security. ' +
      'Direct Lake reads column segments directly from OneLake Delta files, bypassing the SQL engine entirely. ' +
      'When a query targets a table that has warehouse-level RLS predicates, Direct Lake cannot honour those predicates (they live in the SQL engine, not in the Delta file metadata). ' +
      'The query therefore falls back to DirectQuery mode, which routes through the Warehouse SQL engine to apply the predicates — eliminating the columnar segment performance advantage. ' +
      'Option B (Lakehouse SQL endpoint) does not support warehouse-level RLS predicates; instead, RLS must be implemented at the semantic model layer (DAX filter expressions on roles). ' +
      'Semantic-model RLS is evaluated by the tabular engine AFTER column segments are read — so Direct Lake can still read column segments natively, and the RLS filter is applied in-memory by the tabular engine without triggering a SQL fallback. ' +
      'The correct choice for the compliance requirement while preserving Direct Lake performance is Option B (Lakehouse) with semantic-model RLS.',
    whyWrong: {
      0: 'Not all options support Direct Lake equally — a Warehouse with RLS predicates triggers DirectQuery fallback for affected tables. The Direct Lake engine CANNOT evaluate warehouse SQL predicates, so it cannot stay on the columnar segment path when those predicates are present.',
      2: 'Warehouse-level RLS forces a DirectQuery fallback, which is SLOWER than semantic-model RLS for Direct Lake sources, not faster. Routing every query through the SQL engine adds the full DirectQuery round-trip latency instead of the sub-second columnar segment read.',
      3: 'A Lakehouse SQL endpoint DOES support row-level filtering via semantic-model RLS (DAX role expressions). The semantic model layer can implement `[TraderDeskId] = LOOKUPVALUE(...)` or `USERPRINCIPALNAME()`-based predicates that are enforced in-memory after Direct Lake reads segments — without any SQL fallback.'
    },
    source: SRC.directLakeFallback,
    tags: ['scn-58', 'direct-lake', 'warehouse-rls', 'fallback', 'lakehouse', 'semantic']
  }),

  single({
    id: 'scn-58-q2',
    type: 'scenario-single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 4,
    scenarioId: 'scn-58',
    scenarioTitle: 'Vantage Financial — T-SQL Warehouse vs Lakehouse SQL endpoint for Direct Lake',
    prompt:
      'The data engineering team insists on using T-SQL MERGE statements for the Silver-to-Gold transformation — a skill requirement that is non-negotiable. ' +
      'Given the decision to use a Lakehouse SQL endpoint as the Gold-layer source (to avoid Direct Lake fallback), ' +
      'how can the team CONTINUE using T-SQL MERGE while writing output to a Lakehouse Delta table?',
    options: [
      'This is not possible — T-SQL MERGE can only write to Warehouse managed tables; writing to a Lakehouse Delta table from T-SQL requires a Data Pipeline Copy Activity instead',
      'Use a Fabric Warehouse for the Silver-to-Gold MERGE computation, then use a Lakehouse shortcut that points at the Warehouse-backed Delta files as the Gold source for Direct Lake — the model reads from the Lakehouse shortcut, the engineers write via T-SQL MERGE in the Warehouse',
      'Write the T-SQL MERGE output to a Warehouse managed table, then configure the semantic model to use the Warehouse SQL endpoint as a Direct Lake source — Warehouse SQL endpoint supports Direct Lake without RLS predicates',
      'Switch from T-SQL MERGE to PySpark Delta MERGE INTO — the skill requirement cannot be satisfied in a Lakehouse + Direct Lake architecture'
    ],
    correct: 1,
    explanation:
      'The bridging pattern is to use a Fabric Warehouse for the T-SQL transformation logic while exposing the output to Direct Lake via a Lakehouse shortcut. ' +
      'Specifically: the Silver-to-Gold T-SQL MERGE runs in the Warehouse and writes to Warehouse managed tables (Delta format stored in OneLake). ' +
      'A Lakehouse item then mounts the same Delta files via an internal OneLake shortcut. ' +
      'The semantic model is pointed at the Lakehouse SQL endpoint (NOT the Warehouse SQL endpoint), ' +
      'so warehouse-level RLS predicates are never applied to the Direct Lake path — the model reads columnar segments via the Lakehouse shortcut directly. ' +
      'Semantic-model RLS on the Lakehouse source is then used to enforce TraderDeskId filtering without fallback. ' +
      'This preserves both the T-SQL MERGE skill requirement AND the Direct Lake performance requirement. ' +
      'Option A is incorrect — Warehouse T-SQL can write to Warehouse managed tables, and those tables are Delta files in OneLake that a Lakehouse shortcut can reference. ' +
      'Option C would use the Warehouse SQL endpoint as a Direct Lake source; as long as no warehouse RLS predicates are applied, this also works — but the Warehouse SQL endpoint has more overhead than the Lakehouse shortcut path for Direct Lake.',
    whyWrong: {
      0: 'T-SQL in the Warehouse CAN write to Warehouse managed tables, and those tables are stored as Delta files in OneLake. A Lakehouse shortcut can then reference those OneLake Delta files, making the data queryable via the Lakehouse SQL endpoint without warehouse-layer RLS predicates.',
      2: 'Using the Warehouse SQL endpoint as a Direct Lake source is technically valid when no warehouse RLS predicates are applied. However, the scenario explicitly states RLS predicates ARE applied in the Warehouse for compliance — so using the Warehouse SQL endpoint for Direct Lake would re-introduce the fallback problem.',
      3: 'Fabric\'s architecture explicitly supports T-SQL MERGE in the Warehouse with output consumed by a Lakehouse shortcut for Direct Lake. Abandoning T-SQL is not required — the skill and the architecture requirement can coexist via the shortcut bridge pattern.'
    },
    source: SRC.directLakeFallback,
    tags: ['scn-58', 'warehouse', 'lakehouse', 'shortcut', 'tsql', 'direct-lake', 'semantic']
  }),

  // ─── scn-59 — Crestline Corp — capacity SKU sizing for mixed workload (2 Qs)

  single({
    id: 'scn-59-q1',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'fabric-capacity',
    difficulty: 4,
    scenarioId: 'scn-59',
    scenarioTitle: 'Crestline Corp — capacity SKU sizing for mixed workload',
    prompt:
      'The platform architect wants to evaluate three levers before committing to a SKU upgrade: ' +
      '(1) autoscale burst, (2) workload scheduling changes, (3) SKU upgrade to F64. ' +
      'Given the Capacity Metrics data (118% CU weekday mornings, 34% outside that window, F32 with default smoothing), ' +
      'which sequence of evaluation BEST follows the cost-minimisation principle?',
    options: [
      'Immediately upgrade to F64 ($5,500/month) — 118% CU is above the 100% safe ceiling and any delay risks capacity-level throttling for all workloads including IoT ingestion',
      'First enable autoscale (adds up to $500/month burst on top of F32); simultaneously reschedule the Power BI semantic model refresh to 05:00 (pre-market) to reduce morning peak; then re-measure for 2 weeks before considering F64',
      'Switch Power BI to Import mode with an 05:00 refresh and disable Direct Lake — this eliminates the morning CU spike without any spend increase',
      'Move the IoT Eventhouse ingestion to a separate F8 capacity to isolate it from the Power BI workload'
    ],
    correct: 1,
    explanation:
      'The cost-minimisation sequence is: cheapest interventions first, measure, then escalate. ' +
      'Autoscale adds at most $500/month burst for peaks and covers the overage without a permanent SKU commitment. ' +
      'Rescheduling the semantic model refresh (which triggers framing and CU load) to 05:00 removes the overlap with the 09:00 user-query spike — both changes together are likely to bring the morning window below 100% without touching the SKU. ' +
      'Re-measuring for 2 weeks after changes is standard capacity-optimisation practice before committing to a $5,500/month step change. ' +
      'Immediately upgrading to F64 ignores two cheaper levers that may fully resolve the issue. ' +
      'Switching to Import mode abandons Direct Lake freshness benefits, adds 80M-row refresh overhead, and is a feature regression — disproportionate to a scheduling problem. ' +
      'Creating a separate F8 capacity for Eventhouse adds a second capacity billing line and increases monthly cost without solving the morning Power BI contention.',
    whyWrong: {
      0: 'F-SKU capacities support smoothing: short bursts above 100% are absorbed over a 24-hour rolling window before throttling triggers. 118% for a 2-hour morning window on an otherwise lightly-loaded F32 is within the smoothing tolerance. An immediate F64 upgrade before trying cheaper levers is not cost-optimal.',
      2: 'Import mode on an 80M-row fact adds significant refresh duration and storage overhead, introduces up to 5-hour staleness (05:00 refresh to 09:00 first use), and trades one problem for several others. This is a feature regression, not a capacity lever.',
      3: 'Creating a separate F8 capacity for Eventhouse adds a second capacity billing line (F8 is $700/month), increases administrative overhead, and does not reduce the morning Power BI CU spike — it only prevents IoT from competing with Power BI, which may not even be the bottleneck.'
    },
    source: SRC.capacity,
    tags: ['scn-59', 'capacity', 'autoscale', 'sku-sizing', 'cost-optimisation', 'maintain']
  }),

  single({
    id: 'scn-59-q2',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'fabric-capacity',
    difficulty: 3,
    scenarioId: 'scn-59',
    scenarioTitle: 'Crestline Corp — capacity SKU sizing for mixed workload',
    prompt:
      'After two weeks of monitoring with autoscale enabled and the semantic model refresh rescheduled to 05:00, ' +
      'the Capacity Metrics app shows morning CU% has dropped to 72% (peak) and the autoscale burst has fired 3 times in 14 days for under 10 minutes each time. ' +
      'The Saturday ML Spark job still runs at 01:00 without throttling. ' +
      'Which conclusion is MOST consistent with this data?',
    options: [
      'The F64 upgrade is still required — 72% is close to 100% and a single anomalous batch job could push the capacity over the ceiling',
      'The autoscale + scheduling changes were sufficient; the F32 capacity is operating within healthy parameters (72% peak, autoscale covering infrequent short spikes) and no SKU upgrade is warranted at this time',
      'The capacity is still at risk because autoscale fired 3 times — this indicates the capacity is consistently near its ceiling and a permanent upgrade to F64 is prudent',
      'The morning spike will return within a month as usage grows; proactively upgrade to F64 now to avoid repeating the exercise'
    ],
    correct: 1,
    explanation:
      '72% peak CU with autoscale covering 3 short-burst events over 14 days is a healthy capacity profile for F32. ' +
      'Fabric F-SKUs have a well-documented burst buffer (smoothing over 24 hours) and autoscale is functioning as designed — covering infrequent spikes without sustained overage. ' +
      'A 72% sustained peak leaves 28% headroom before the autoscale trigger, and autoscale covers the remaining short burst events. ' +
      'This is the outcome the capacity management framework is designed to achieve. ' +
      'No SKU upgrade is justified by this data — the problem has been solved at lower cost. ' +
      'Three autoscale firings over 14 days (averaging one every ~4.7 days) at under 10 minutes each is normal burst behaviour, not evidence of chronic overload. ' +
      'Projecting future growth without data is speculative and does not justify immediate spend; revisit in 30 days if CU% trend is upward.',
    whyWrong: {
      0: '72% peak with 28% headroom is a healthy capacity utilisation level. F-SKU smoothing absorbs short spikes above 100% over 24 hours before throttling triggers — 72% is well below the point where a SKU upgrade is warranted.',
      2: 'Three autoscale firings in 14 days for under 10 minutes each is not "consistently near the ceiling" — it is episodic burst behaviour that autoscale is designed to handle. Chronic ceiling risk would manifest as sustained 90%+ CU for hours per day, not three 10-minute spikes.',
      3: 'Proactive upgrades based on hypothetical future growth without a measured trend line are not cost-optimal. Capacity planning should be data-driven: monitor the CU% trend over 30-60 days and upgrade when the trend line projects to exceed 85% sustained before the next review cycle.'
    },
    source: SRC.capacity,
    tags: ['scn-59', 'capacity', 'autoscale', 'monitoring', 'maintain']
  }),

  // ─── scn-60 — Pinnacle BI — Variable Libraries + Git Integration CI/CD (3 Qs)

  single({
    id: 'scn-60-q1',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'variable-libraries',
    difficulty: 4,
    scenarioId: 'scn-60',
    scenarioTitle: 'Pinnacle BI — Variable Libraries + Git integration for multi-stage CI/CD',
    prompt:
      'After the hotfix promotion to Prod, the team needs to verify that the Variable Library binding in Prod still resolves to the Prod Warehouse endpoint. ' +
      'What is the CORRECT expectation about how Fabric deployment pipeline promotions interact with Variable Library items?',
    options: [
      'Promoting the semantic model from Test to Prod also promotes the source (Test) Variable Library item, overwriting the Prod Variable Library with Test Warehouse endpoint values',
      'The deployment pipeline promotes the semantic model definition (PBIP files including the Variable Library connector reference in M code) but does NOT promote the Variable Library item itself — the Prod workspace\'s own Variable Library item is untouched, and its `warehouseEndpoint` key still resolves to the Prod value',
      'Variable Library items are global to the Fabric tenant and shared across all workspaces; a promotion in one workspace automatically updates all downstream workspaces',
      'A promotion resets the Variable Library binding in the target stage to the default value (empty string) until an admin re-keys the value manually'
    ],
    correct: 1,
    explanation:
      'This is the key Variable Library + deployment pipeline interaction to understand. ' +
      'Fabric deployment pipelines promote specific item types — by default, semantic models, reports, Lakehouses, and other supported items. ' +
      'Variable Library items are workspace-scoped configuration items that hold per-workspace key-value pairs. ' +
      'When the pipeline promotes the semantic model from Test to Prod, it carries the model definition (the M code that references `warehouseEndpoint` by key name via the Variable Library connector). ' +
      'It does NOT promote the Variable Library item itself. ' +
      'The Prod workspace\'s Variable Library already exists and holds `warehouseEndpoint = <Prod Warehouse endpoint>`. ' +
      'After promotion, the semantic model definition in Prod resolves `warehouseEndpoint` from the Prod workspace\'s own Variable Library — which still points to Prod. ' +
      'This is by design: Variable Libraries provide the per-stage binding that makes promotion environment-safe. ' +
      'The team\'s concern about the Prod endpoint being overwritten is unfounded — but verifying the Prod Variable Library item has the correct value is still good post-deploy hygiene.',
    whyWrong: {
      0: 'Deployment pipelines do NOT promote Variable Library items as part of a semantic model promotion. Promoting the Variable Library would overwrite the Prod endpoint with the Test value — precisely the anti-pattern Variable Libraries are designed to prevent.',
      2: 'Variable Libraries are workspace-scoped, not tenant-global. Each workspace has its own Variable Library item with its own key-value pairs. There is no tenant-wide shared Variable Library.',
      3: 'A pipeline promotion does not touch the Variable Library item in the target workspace at all — it neither resets it nor modifies it. The target Variable Library retains whatever values were in it before the promotion.'
    },
    source: SRC.deployment,
    tags: ['scn-60', 'variable-libraries', 'deployment-pipelines', 'binding', 'maintain']
  }),

  single({
    id: 'scn-60-q2',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    scenarioId: 'scn-60',
    scenarioTitle: 'Pinnacle BI — Variable Libraries + Git integration for multi-stage CI/CD',
    prompt:
      'The team used a hotfix branch in Git and a temporary workspace to deploy the DAX measure fix to Prod without promoting the five in-flight Test changes. ' +
      'After merging the hotfix branch back to the main Git branch, the team must reconcile the Git integration branch state in each workspace. ' +
      'Which statement CORRECTLY describes what each workspace\'s Git integration status will show immediately after the hotfix branch merge?',
    options: [
      'All three workspaces (Dev, Test, Prod) will show "in sync" with the main branch automatically — Git integration auto-pulls the merge commit',
      'Dev and Test workspaces will show "uncommitted changes" or "out of sync" because their workspace items now differ from the merged main branch (Test still has the 5 in-flight changes that are in the workspace but not yet in main); Prod will show "in sync" if the hotfix branch commit is now in main',
      'Prod workspace will show "conflicts" because the hotfix was deployed via a temporary workspace, creating a fork in the Git history that must be manually resolved',
      'Git integration status is only relevant when committing from workspace to Git, not when the branch changes upstream — workspaces do not poll for upstream changes'
    ],
    correct: 1,
    explanation:
      'Fabric Git integration tracks the divergence between a workspace\'s item state and the connected Git branch. ' +
      'After the hotfix branch is merged into main: ' +
      '- Dev workspace: connected to main; the hotfix fix is now in main; Dev\'s items may be ahead of main (the 5 in-flight changes) or behind (if they weren\'t committed to Git yet) — status shows the delta. ' +
      '- Test workspace: also connected to main; the 5 in-flight Test changes are in the Test workspace items but NOT yet committed to the main branch, so Test will show workspace items ahead of (or differing from) the main branch commit. ' +
      '- Prod workspace: if the hotfix branch merge commit is now HEAD of main and Prod was last updated from that commit (via the temporary workspace deploy), Prod may show "in sync" or show a small delta depending on whether the Prod workspace was directly synced from Git post-deploy. ' +
      'The key exam point is that Git integration does NOT auto-pull changes from upstream into workspace items — an administrator must explicitly "Update workspace" (pull from Git) for each workspace to reflect the merged state. ' +
      'Status shows divergence; it does not auto-resolve it.',
    whyWrong: {
      0: 'Git integration does not auto-pull upstream branch changes into workspace items. A branch merge in Azure DevOps does not automatically update workspace items — a workspace admin must explicitly trigger an "Update workspace" operation to pull the latest commit.',
      2: '"Conflicts" in Git integration arise when workspace items have uncommitted changes AND the Git branch has advanced ahead of the workspace\'s last sync point simultaneously — this is a divergence, not a permanent fork. Conflicts are resolved via the Git integration UI, not manually in Git.',
      3: 'Fabric Git integration does poll for upstream branch changes and surfaces them in the workspace Source Control panel as "behind" status — the workspace admin sees that the branch has advanced and can choose to update. Upstream changes are visible to the workspace, not ignored.'
    },
    source: SRC.deployment,
    tags: ['scn-60', 'git-integration', 'deployment-pipelines', 'branch-sync', 'maintain']
  }),

  single({
    id: 'scn-60-q3',
    type: 'scenario-single',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 3,
    scenarioId: 'scn-60',
    scenarioTitle: 'Pinnacle BI — Variable Libraries + Git integration for multi-stage CI/CD',
    prompt:
      'After the hotfix, the architect wants to confirm that RLS role membership in Prod was not affected by the pipeline promotion. ' +
      'Which statement CORRECTLY describes the relationship between Fabric deployment pipeline promotions and RLS role membership?',
    options: [
      'Deployment pipeline promotions carry RLS role expressions (DAX filter predicates) AND role membership (assigned users/groups) from source to target, so the Prod membership is now set to whatever Test membership was',
      'Deployment pipeline promotions carry RLS role expressions but NOT role membership — target workspace membership is managed separately per stage and is preserved unchanged by any pipeline promotion',
      'RLS role membership in Prod was reset to empty (no members) by the promotion — the team must re-assign all Prod users to their roles manually',
      'RLS role membership is stored in the Variable Library and was swapped automatically to match Prod users when the Variable Library binding resolved to the Prod endpoint'
    ],
    correct: 1,
    explanation:
      'This is a frequently-tested exam point that mirrors the pattern in scn-49-q3. ' +
      'Fabric deployment pipelines promote the semantic model definition — which includes the RLS role definitions (the DAX filter expressions, e.g. `[TraderDeskId] = LOOKUPVALUE(...)`) — ' +
      'but they do NOT carry RLS role membership (which users or Entra groups are assigned to which roles). ' +
      'Role membership is a workspace-layer security configuration managed separately per stage. ' +
      'A pipeline promotion from Test to Prod does NOT overwrite, reset, or read the Prod role membership. ' +
      'The Prod role membership was not touched by the hotfix promotion. ' +
      'The correct post-deploy validation step is to open the Prod workspace semantic model\'s security panel and confirm the expected Prod users/groups are still assigned to the correct roles — not because the promotion changed them, but as standard hygiene to confirm no manual changes occurred during the hotfix.',
    whyWrong: {
      0: 'Carrying role membership from Test to Prod would mean every promotion overwrites Prod security assignments with Test security assignments (which typically include dev/test user accounts). This would be a critical security anti-pattern. Fabric explicitly does not do this.',
      2: 'The promotion does NOT reset role membership to empty. Resetting membership would leave Prod with no RLS enforcement — all users would see all rows. Fabric preserves target-stage membership intact through promotions.',
      3: 'RLS role membership has no relationship to Variable Libraries. Variable Libraries hold connection strings and configuration key-value pairs for items like semantic model M code parameters. User/group security assignments are a separate concern managed via the workspace security model.'
    },
    source: SRC.rls,
    tags: ['scn-60', 'deployment-pipelines', 'rls', 'role-membership', 'maintain']
  })

];
