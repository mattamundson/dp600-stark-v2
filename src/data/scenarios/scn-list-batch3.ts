import type { Scenario } from '../../lib/schema';

// DP-600 Sprint-8 scenario batch — scn-51 through scn-55.
// Question content lives in `../questions/q-scenarios-batch3.ts`.
// The questionIds here MUST stay in sync with the ids in that file.

export const scenarioBatch3: Scenario[] = [

  // ── Direct Lake on OneLake vs SQL endpoint security choice (3 questions) ─
  {
    id: 'scn-51',
    title: 'Wayne Aerospace — Direct Lake on OneLake vs SQL endpoint security choice',
    domain: 'semantic',
    business:
      'Wayne Aerospace — defense contractor, F64 capacity, V-Order Delta tables in OneLake, classified pilot roster (PIN-protected pilots vs general crew), Power BI reports consumed by 200 users',
    prompt:
      'Wayne Aerospace stores classified workforce data in a Fabric Warehouse. ' +
      'The Gold Warehouse tables use V-Order Delta stored in OneLake. ' +
      'Classified rows — those belonging to licensed pilots — must never be visible to general crew users, enforced by warehouse-level row-security predicates on the FactWorkforce table. ' +
      'Three Power BI report options are under evaluation: ' +
      '(1) Direct Lake on OneLake (native columnar segment reads, no SQL hop); ' +
      '(2) Direct Lake on the Warehouse SQL endpoint (SQL engine applies warehouse RLS before serving data); ' +
      '(3) Import mode with a nightly refresh. ' +
      'The compliance officer requires that classified rows are NEVER exposed regardless of query path. ' +
      'The operations team wants p95 visual render < 1 s for the general crew dashboard. ' +
      'A daily ETL job loads ~4 million new rows each night.',
    questionIds: ['scn-51-q1', 'scn-51-q2', 'scn-51-q3'],
    tags: [
      'direct-lake',
      'warehouse-rls',
      'onelake',
      'sql-endpoint',
      'import',
      'security',
      'storage-modes'
    ]
  },

  // ── Calc groups vs measures vs field parameters (2 questions) ────────────
  {
    id: 'scn-52',
    title: 'Tyrell Pharma — calc groups vs measures vs field parameters',
    domain: 'semantic',
    business:
      'Tyrell Pharma — global pharmaceutical company, Power BI Premium semantic model, Tabular Editor 2 and Power BI Desktop both installed',
    prompt:
      'Tyrell Pharma\'s BI team has authored 48 separate DAX measures: ' +
      '12 base measures (Sales, Cost, Profit, GrossMargin%, Units, Returns, ReturnRate%, ASP, Discounts, NetSales, Budget, Variance) ' +
      'each replicated across 4 time-intelligence variants (Current Period, YoY%, MTD, YTD). ' +
      'Model maintenance is painful: every change to a base measure requires updating all 4 variants. ' +
      'A new requirement asks for two more time variants (QTD and Rolling-3M), which would push the count to 72 measures. ' +
      'The team wants to reduce the measure count drastically while keeping full report interactivity. ' +
      'Report authors currently use a slicer to toggle between time variants on charts.',
    questionIds: ['scn-52-q1', 'scn-52-q2'],
    tags: [
      'calc-groups',
      'field-parameters',
      'measures',
      'tabular-editor',
      'time-intelligence',
      'semantic-model-design'
    ]
  },

  // ── Multi-tenant Lakehouse with mirrored sources + Reflex alerts (3 Qs) ──
  {
    id: 'scn-53',
    title: 'Massive Dynamic — multi-tenant Lakehouse with mirrored sources + Reflex alerts',
    domain: 'prepare',
    business:
      'Massive Dynamic — B2B SaaS company, 200 enterprise customers each with their own Postgres database, Fabric F64 capacity, data engineering team of 6',
    prompt:
      'Massive Dynamic operates 200 customer Postgres databases hosted in Azure Database for PostgreSQL. ' +
      'The analytics team is building a Gold-layer Fabric estate where each customer\'s data must be strictly isolated — no cross-customer query paths allowed. ' +
      'Requirements: ' +
      '(1) Source connector: land Postgres data into Fabric with minimal custom code and continuous near-real-time replication where possible; ' +
      '(2) Isolation pattern: choose between a workspace-per-tenant model (one Fabric workspace per customer) and a schema-per-tenant model (one Lakehouse, one schema per customer); ' +
      '(3) Alerting: trigger a Teams notification when a customer\'s daily row count in their Gold table drops below 1,000 — indicating a possible data pipeline failure — with no custom polling code. ' +
      'The team has 6 engineers. Onboarding a new customer must be achievable in under 2 hours.',
    questionIds: ['scn-53-q1', 'scn-53-q2', 'scn-53-q3'],
    tags: [
      'mirroring',
      'shortcuts',
      'multi-tenant',
      'workspace-isolation',
      'schema-isolation',
      'reflex',
      'activator',
      'postgres'
    ]
  },

  // ── XMLA + Tabular Editor + ALM Toolkit CI/CD (3 questions) ─────────────
  {
    id: 'scn-54',
    title: 'Cyberdyne — XMLA endpoint + Tabular Editor + ALM Toolkit CI/CD',
    domain: 'maintain',
    business:
      'Cyberdyne Systems — technology firm, Fabric F64 capacity, XMLA write endpoint enabled, GitHub Actions CI pipeline, TMDL files committed to a Git repo',
    prompt:
      'Cyberdyne\'s data platform team wants to deploy semantic model changes from a Git-based CI/CD pipeline without any human opening Power BI Desktop. ' +
      'The repo stores the semantic model definition as TMDL (Tabular Model Definition Language) files managed under source control. ' +
      'The XMLA write endpoint is enabled at the Fabric capacity level. ' +
      'The deployment pipeline must: ' +
      '(1) build and validate the TMDL model definition in CI; ' +
      '(2) deploy the model to a Premium workspace via the XMLA endpoint; ' +
      '(3) roll back to the previous version if the post-deploy validation query fails. ' +
      'The team is evaluating: Tabular Editor 2 (CLI, open-source) with the ALM Toolkit approach, ' +
      'deploying a .pbit template file, and using the Fabric REST API with a PBIP zip payload.',
    questionIds: ['scn-54-q1', 'scn-54-q2', 'scn-54-q3'],
    tags: [
      'xmla-endpoint',
      'tabular-editor',
      'alm-toolkit',
      'tmdl',
      'cicd',
      'deployment',
      'pbip',
      'rollback'
    ]
  },

  // ── DAX perf triage with VertiPaq Analyzer (3 questions) ─────────────────
  {
    id: 'scn-55',
    title: 'Acme Capital — DAX perf triage with VertiPaq Analyzer',
    domain: 'semantic',
    business:
      'Acme Capital — asset management firm, Power BI Premium semantic model, 200M-row FactTrades fact table, DAX Studio and VertiPaq Analyzer available',
    prompt:
      'Acme Capital\'s risk team reports that a key measure — [Risk-Adjusted Return] — takes 45 seconds to evaluate in a Power BI report. ' +
      'The developer opens DAX Studio Server Timings and observes that the query is FE-dominant (Formula Engine time is 40 s vs Storage Engine time of 5 s). ' +
      'VertiPaq Analyzer shows: ' +
      '(1) DimDate has 36 columns and 50,000 rows; ' +
      '(2) DimDate cardinality for [DateKey] is 50,000 (one row per day spanning 137 years); ' +
      '(3) [Risk-Adjusted Return] is defined as a deeply nested SUMX over FactTrades that computes an intermediate ratio per row before aggregating. ' +
      'The Performance Analyzer in Power BI Desktop shows the visual takes 42 s total with a single DAX query accounting for 41 s of that. ' +
      'A junior analyst suggests adding more CPU cores via an SKU upgrade as the first fix. ' +
      'The architect wants a systematic triage before any infrastructure change.',
    questionIds: ['scn-55-q1', 'scn-55-q2', 'scn-55-q3'],
    tags: [
      'dax-performance',
      'vertiPaq-analyzer',
      'formula-engine',
      'storage-engine',
      'date-table',
      'sumx',
      'aggregations',
      'fe-dominant'
    ]
  }
];
