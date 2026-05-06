import type { Scenario } from '../../lib/schema';

// DP-600 Sprint-13 scenario batch — scn-56 through scn-60.
// Question content lives in `../questions/q-scenarios-batch4.ts`.
// The questionIds here MUST stay in sync with the ids in that file.

export const scenarioBatch4: Scenario[] = [

  // ── scn-56 ─────────────────────────────────────────────────────────────────
  {
    id: 'scn-56',
    title: 'Meridian Analytics — OneLake shortcuts vs mirroring vs ingest decision',
    domain: 'prepare',
    business:
      'Meridian Analytics — mid-size retail BI shop, 18 data engineers, F64 capacity, ' +
      'three source systems: Azure SQL DB (200 GB ERP), Azure Data Lake Storage Gen2 (1.4 TB historical Parquet), ' +
      'and a Snowflake warehouse (90 GB partner vendor data). Monthly BI budget: $12K for storage + compute.',
    prompt:
      'Meridian Analytics is designing the ingestion tier of a new Fabric medallion architecture (Bronze → Silver → Gold). ' +
      'The ERP data in Azure SQL DB updates continuously with sub-minute write activity; ' +
      'the Silver team needs a Direct Lake-ready SQL endpoint on the replicated copy within 60 seconds of each committed transaction, with zero custom pipeline code. ' +
      'The historical Parquet archive in ADLS Gen2 is owned by a partner team and must remain in ADLS — the Fabric team cannot copy it into OneLake. ' +
      'Instead, analysts need to run SQL queries against the Parquet from within Fabric Lakehouses as if the data were local, ' +
      'while the canonical master copy stays in ADLS. ' +
      'The Snowflake vendor data (90 GB, refreshed weekly) must land in Bronze as a Delta table with no manual data-movement steps. ' +
      'The architect must choose among three primitives — OneLake shortcuts, mirroring, and Data Pipeline copy/ingest — ' +
      'applying each to the right source based on freshness requirements, code-minimisation goals, and ownership constraints. ' +
      'After the Bronze landing, a Silver medallion layer must apply cleansing and type-casting before Gold aggregation. ' +
      'The team has debated whether to use a single Lakehouse for all three zones or separate Lakehouse items per medallion tier.',
    questionIds: ['scn-56-q1', 'scn-56-q2', 'scn-56-q3'],
    tags: [
      'scn-56',
      'shortcuts',
      'mirroring',
      'medallion',
      'ingest',
      'onelake',
      'adls',
      'snowflake',
      'prepare'
    ]
  },

  // ── scn-57 ─────────────────────────────────────────────────────────────────
  {
    id: 'scn-57',
    title: 'Axiom Data Co — Spark notebooks vs Dataflow Gen2 vs Pipelines decision',
    domain: 'prepare',
    business:
      'Axiom Data Co — data engineering team of 11 (8 SQL/Power Query, 3 PySpark), F64 capacity, ' +
      'processing a 25 GB nightly JSON customer-event feed plus a 500 MB daily vendor CSV, ' +
      'both landing in Bronze by 02:00 and needing a Silver Delta output by 04:00.',
    prompt:
      'Axiom Data Co runs a nightly ELT batch that must meet a hard 04:00 Silver-completion deadline. ' +
      'The 25 GB JSON customer-event file requires: (1) deduplication on (CustomerId, EventTimestamp), ' +
      '(2) a lookup join against a 4-million-row DimCustomer table to enrich with segment codes, ' +
      'and (3) partitioned Delta output split by EventDate. ' +
      'The 500 MB vendor CSV requires Power-Query-style column renaming, type-casting, and a basic filter on Status = "Active". ' +
      'Three authoring approaches are under evaluation: ' +
      '(a) PySpark notebooks scheduled via Fabric Data Pipelines using the Notebook activity; ' +
      '(b) Dataflow Gen2 with Power Query M transformations writing to a Lakehouse Delta destination; ' +
      '(c) Data Pipelines with Copy Activity for raw landing and no transformation logic. ' +
      'The eight SQL/Power Query engineers own long-term maintenance; the three PySpark contractors rotate off in six months. ' +
      'A junior engineer proposed using Dataflow Gen2 for the 25 GB file on the grounds that "Power Query can handle anything." ' +
      'The engineering manager wants a recommendation that accounts for skill sustainability, performance at scale, and operational simplicity.',
    questionIds: ['scn-57-q1', 'scn-57-q2', 'scn-57-q3'],
    tags: [
      'scn-57',
      'spark-notebooks',
      'dataflow-gen2',
      'pipelines',
      'medallion',
      'skill-alignment',
      'prepare'
    ]
  },

  // ── scn-58 ─────────────────────────────────────────────────────────────────
  {
    id: 'scn-58',
    title: 'Vantage Financial — T-SQL Warehouse vs Lakehouse SQL endpoint for Direct Lake',
    domain: 'semantic',
    business:
      'Vantage Financial — asset manager, F64 capacity, Gold layer serving a 320 M-row FactTrades fact ' +
      'plus 6 dimension tables to a Direct Lake semantic model consumed by 250 Power BI users during US market hours.',
    prompt:
      'Vantage Financial is choosing between two Gold-layer patterns for their Direct Lake semantic model source: ' +
      '(A) Fabric Warehouse — the Gold tables live as managed tables in a Warehouse, exposed via the Warehouse SQL endpoint; ' +
      '(B) Lakehouse — the Gold tables live as Delta tables in a Lakehouse, exposed via the Lakehouse SQL endpoint. ' +
      'The primary constraint is Direct Lake performance: the model must not fall back to DirectQuery during peak hours (09:30–16:00 ET). ' +
      'The compliance team insists on row-level security predicates that filter the FactTrades rows by TraderDeskId, ' +
      'enforced at the data layer rather than the semantic model layer. ' +
      'A secondary requirement is that the Silver-to-Gold transformation uses T-SQL MERGE statements, ' +
      'which the data engineering team is comfortable maintaining. ' +
      'The semantic model is consumed in Direct Lake mode and the team has confirmed that V-Order is enabled on all Gold Delta files. ' +
      'The architect must pick the Gold-layer storage pattern that keeps Direct Lake on the columnar segment path while satisfying compliance.',
    questionIds: ['scn-58-q1', 'scn-58-q2'],
    tags: [
      'scn-58',
      'warehouse',
      'lakehouse',
      'sql-endpoint',
      'direct-lake',
      'warehouse-rls',
      'semantic',
      'v-order'
    ]
  },

  // ── scn-59 ─────────────────────────────────────────────────────────────────
  {
    id: 'scn-59',
    title: 'Crestline Corp — capacity SKU sizing for mixed workload',
    domain: 'maintain',
    business:
      'Crestline Corp — industrial manufacturer, current F32 capacity, ' +
      'workload mix: 12k IoT events/sec into Eventhouse (real-time), ' +
      '180 Power BI users on a Direct Lake 80M-row fact (peak 09:00–11:00), ' +
      'and a weekly ML training job (Spark, ~4 hours, runs Saturdays 01:00). ' +
      'Monthly Fabric spend budget: $18K.',
    prompt:
      'Crestline Corp is running an F32 capacity and experiencing sustained CU% above 100% on weekday mornings (09:00–11:00), ' +
      'with Power BI visuals throttling to interactive-delay mode while the IoT ingestion pipeline also competes for CUs. ' +
      'The Capacity Metrics app shows: Monday–Friday 09:00–11:00 CU% averages 118%; outside those windows CU% averages 34%. ' +
      'The Saturday ML job runs without user complaints because it uses background-priority smoothing. ' +
      'The CFO has approved a maximum of $18K/month. ' +
      'An F64 is $5,500/month; an F128 is $11,000/month; autoscale adds up to $500/month of burst capacity at F32. ' +
      'A junior engineer proposes immediately upgrading to F128 to "have headroom." ' +
      'The platform architect wants to evaluate three levers before committing: SKU upgrade, workload scheduling changes, and autoscale, ' +
      'and must recommend the minimum-cost option that eliminates the morning throttle while keeping ML and IoT healthy.',
    questionIds: ['scn-59-q1', 'scn-59-q2'],
    tags: [
      'scn-59',
      'capacity',
      'sku-sizing',
      'autoscale',
      'workload-scheduling',
      'mixed-workload',
      'maintain'
    ]
  },

  // ── scn-60 ─────────────────────────────────────────────────────────────────
  {
    id: 'scn-60',
    title: 'Pinnacle BI — Variable Libraries + Git integration for multi-stage CI/CD',
    domain: 'maintain',
    business:
      'Pinnacle BI — enterprise BI platform team, 14 engineers, three-stage Fabric deployment pipeline (Dev → Test → Prod), ' +
      'Git integration enabled with Azure DevOps, semantic model defined as PBIP files in source control, ' +
      'each stage binds a different Warehouse endpoint.',
    prompt:
      'Pinnacle BI is standing up a governed CI/CD pipeline for their RevenueAnalytics semantic model. ' +
      'The team stores the model definition as PBIP files (Power BI Project format) in an Azure DevOps Git repository. ' +
      'Each of the three Fabric workspaces (Dev, Test, Prod) must automatically resolve its own Warehouse connection string ' +
      'when the deployment pipeline promotes a stage — without manual parameter rule edits or pipeline rule exceptions. ' +
      'The team adopted Fabric Variable Libraries as the configuration mechanism: each workspace holds a Variable Library item ' +
      'with a key `warehouseEndpoint` set to the workspace-appropriate value. ' +
      'The semantic model M code references the `warehouseEndpoint` key via the Variable Library connector. ' +
      'During the last sprint, a Prod hotfix (one DAX measure correction) needed to reach Prod without carrying ' +
      'the five in-flight Test changes. The team used a hotfix branch in Git, deployed from a temporary workspace, ' +
      'and merged back to the main branch. ' +
      'After the hotfix, the team must verify that: ' +
      '(1) the Variable Library binding in Prod still resolves to the Prod Warehouse endpoint; ' +
      '(2) RLS role membership in Prod was not overwritten by the pipeline promotion; ' +
      '(3) the Git integration branch state in each workspace reflects the deployed commit. ' +
      'The architect must understand the full interaction between Git integration, deployment pipeline promotions, ' +
      'Variable Library scoping, and RLS membership to explain these post-deploy invariants to the team.',
    questionIds: ['scn-60-q1', 'scn-60-q2', 'scn-60-q3'],
    tags: [
      'scn-60',
      'variable-libraries',
      'git-integration',
      'deployment-pipelines',
      'cicd',
      'rls-membership',
      'pbip',
      'maintain'
    ]
  }
];
