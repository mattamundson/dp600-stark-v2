import type { Scenario } from '../../lib/schema';

// DP-600 Sprint-7 scenario batch — scn-46 through scn-50.
// Question content lives in `../questions/q-scenarios-batch2.ts`.
// The questionIds here MUST stay in sync with the ids in that file.

export const scenarioBatch2: Scenario[] = [
  // ── Medallion + RLS (1 scenario, 3 questions) ──────────────────────
  {
    id: 'scn-46',
    title: 'Greenfield Steel — multi-source medallion + RLS',
    domain: 'prepare',
    business:
      'Greenfield Steel — regional steel distributor, 4 ERP sources (SAP, Oracle JD Edwards, legacy CSV, Azure SQL OLTP), 6 plant managers, CFO + finance team',
    prompt:
      'Greenfield Steel is consolidating four ERP sources into a Fabric medallion architecture. ' +
      'Bronze lands raw files; Silver deduplicates and applies SCD Type 2 to supplier and customer dimensions; ' +
      'Gold contains a star schema (FactSales, DimCustomer, DimSupplier, DimDate, DimPlant) served to a Direct Lake semantic model in Power BI. ' +
      'RLS requirement: each plant manager must see only their plant\'s rows in FactSales — no cross-plant visibility. ' +
      'The CFO wants a daily scheduled refresh (07:00 local) and an audit log of every period-close data load so finance can certify the numbers each month-end.',
    questionIds: ['scn-46-q1', 'scn-46-q2', 'scn-46-q3'],
    tags: ['medallion', 'rls', 'scd2', 'audit', 'refresh', 'governance']
  },

  // ── Direct Lake fallback (1 scenario, 3 questions) ──────────────────
  {
    id: 'scn-47',
    title: 'Wonka Industries — Direct Lake fallback storm',
    domain: 'semantic',
    business:
      'Wonka Industries — confectionery manufacturer, 200M-row FactConfections in a Fabric Warehouse, F64 capacity, 150 Power BI users',
    prompt:
      'Wonka Industries hosts a 200M-row FactConfections table in a Fabric Warehouse. ' +
      'The Power BI semantic model is configured as Direct Lake. ' +
      'Every Monday at 09:00 the Capacity Metrics app shows DirectQuery fallback ratio spiking from 3% to 55%, ' +
      'p95 visual render time rising from 800 ms to 7 s, and CU% hitting 95%. ' +
      'The pattern started three weeks ago after the warehouse DBA added warehouse-level row-security predicates ' +
      'to FactConfections for compliance. Reports are slow but functional during the storm; outside Monday 09:00 they are fine. ' +
      'A junior engineer suggests switching to an F128 SKU to absorb the spike. ' +
      'The architect asks for a root-cause analysis before any SKU decision.',
    questionIds: ['scn-47-q1', 'scn-47-q2', 'scn-47-q3'],
    tags: ['direct-lake', 'fallback', 'warehouse-rls', 'capacity', 'monday-storm']
  },

  // ── Composite model + label propagation (1 scenario, 2 questions) ───
  {
    id: 'scn-48',
    title: 'Tyrell Logistics — composite model + label propagation',
    domain: 'semantic',
    business:
      'Tyrell Logistics — global freight carrier, Fabric F64 capacity, Microsoft Purview deployed tenant-wide',
    prompt:
      'Tyrell Logistics builds a composite semantic model: FactShipments (200M rows) uses Direct Lake from a Lakehouse, ' +
      'DimCarrier (10k rows, rarely changes) uses Import, and a slowly-changing tariff reference table uses DirectQuery ' +
      'against an Azure SQL DB that updates hourly. ' +
      'The Gold Lakehouse carries a "Confidential — Logistics" Purview sensitivity label; ' +
      'the Silver Lakehouse carries "Internal — Logistics". ' +
      'A Power BI report author connects to the composite model and publishes a derived report to a workspace that ' +
      'does not yet carry any sensitivity label. ' +
      'The compliance team wants to know: what label will the derived report carry, and will RLS roles ' +
      'defined on the semantic model flow through to row-filtered Export-to-Excel?',
    questionIds: ['scn-48-q1', 'scn-48-q2'],
    tags: ['composite-model', 'direct-lake', 'import', 'directquery', 'sensitivity-labels', 'rls', 'label-propagation']
  },

  // ── Deployment pipeline + variable libraries (1 scenario, 3 questions)
  {
    id: 'scn-49',
    title: 'Acme Capital Markets — deployment pipeline + variable libraries',
    domain: 'maintain',
    business:
      'Acme Capital Markets — buy-side asset manager, three-stage Fabric deployment pipeline (Dev → Test → Prod), regulated workload',
    prompt:
      'Acme Capital Markets runs a three-stage Fabric deployment pipeline (Dev → Test → Prod) for their TradingAnalytics semantic model. ' +
      'Connection strings to the underlying Warehouse previously used hardcoded M parameters; the data team is migrating them to ' +
      'Fabric Variable Libraries so each stage binds its own connection string at promotion time. ' +
      'Mid-sprint, a hotfix is required: a single incorrect DAX measure in Prod needs an emergency patch. ' +
      'The fix is authored in Dev and must reach Prod without promoting the four other in-flight Test changes. ' +
      'After the Prod fix lands, the team must validate that RLS role membership — which is managed per-stage — ' +
      'was not wiped by the promotion.',
    questionIds: ['scn-49-q1', 'scn-49-q2', 'scn-49-q3'],
    tags: ['deployment-pipelines', 'variable-libraries', 'hotfix', 'rls', 'selective-deploy']
  },

  // ── Eventhouse + KQL real-time anomaly detection (1 scenario, 3 Qs) ─
  {
    id: 'scn-50',
    title: 'Initech — Eventhouse + KQL real-time anomaly detection',
    domain: 'prepare',
    business:
      'Initech Manufacturing — discrete-parts factory, 12,000 IoT sensors streaming at ~18k events/sec into Fabric Eventhouse',
    prompt:
      'Initech Manufacturing streams sensor readings (SensorId, MachineId, Reading, Timestamp) into a KQL DB ' +
      '(`SensorReadings` table, ~18k events/sec). ' +
      'The reliability team needs to: ' +
      '(1) detect anomalies — any 5-minute tumbling window where the z-score of readings for a (MachineId, SensorType) pair exceeds 3 — ' +
      'computed against a rolling 24-hour baseline; ' +
      '(2) materialize the anomaly results into a `SensorAnomalies` table via a KQL update policy so the history is preserved; ' +
      '(3) automatically alert the on-call engineer in Teams whenever a new anomaly row is written to `SensorAnomalies`, ' +
      'with no custom polling code. ' +
      'The architect must choose the right KQL aggregation pattern, materialisation mechanism, and Fabric alerting primitive.',
    questionIds: ['scn-50-q1', 'scn-50-q2', 'scn-50-q3'],
    tags: ['kql', 'eventhouse', 'anomaly-detection', 'update-policy', 'reflex', 'real-time', 'z-score']
  }
];
