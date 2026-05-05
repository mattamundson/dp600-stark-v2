// Maintain — Deep Operations batch (35 Q).
//
// IDs: mtdp-001 through mtdp-035.
// Domain: 'maintain' — all 35 (blueprint balance lift).
// Type mix: 10 multi-select, 3 ordering, 22 single.
//
// Subtopics covered:
//   monitoring            Monitoring hub, capacity metrics app, semantic model usage
//   capacity-management   CU%, throttling ladder, smoothing, bursting, SKU sizing
//   refresh-management    Incremental refresh, gateway, schedule limits, memory
//   troubleshooting       Refresh failure investigation, pipeline debugging, query insights
//   audit-logs            Activity log vs audit log, M365 Unified Audit Log
//   tenant-admin          Tenant settings, feature gating, capacity overrides
//   metrics               Capacity Metrics app deep-dive, CU utilization
//   alerts                Real-Time Hub alert rules, Reflex
//   sku-management        F-SKU selection, reserved vs PAYG, scaling
//   workspace-admin       Roles, retention, item lifecycle, domain admin

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const maintainDeep: Question[] = [

  // ── Capacity Metrics App (Q1–Q4) ─────────────────────────────

  single({
    id: 'mtdp-001',
    domain: 'maintain',
    subtopic: 'metrics',
    difficulty: 3,
    prompt: 'An F32 capacity has been running at 85% CU smoothed for five consecutive days. The Capacity Metrics app shows a growing "carryforward" bar each day. What does a growing daily carryforward SPECIFICALLY indicate?',
    options: [
      'Short interactive spikes are being absorbed by the 5-minute smoothing window',
      'The capacity is underutilized and the carryforward is credit for future spikes',
      'Background workloads are consistently exceeding the SKU capacity and the excess is rolled forward into the next 24-hour window',
      'The capacity has already been throttled and all interactive operations are rejected'
    ],
    correct: 2,
    explanation: 'Fabric smooths background workloads across a 24-hour window. A growing carryforward bar means the capacity is burning more background CU than the SKU allows on a sustained basis, and the excess rolls forward. If carryforward grows each day, the sustained average is above the SKU ceiling — a reliable signal to resize or reschedule heavy background jobs.',
    whyWrong: {
      0: 'Short interactive spikes are smoothed across 5 minutes, NOT represented by a growing carryforward bar.',
      1: 'Carryforward is a DEBT rolled forward, not a credit. Growing carryforward is a warning sign, not a positive indicator.',
      3: 'Throttling stages are a consequence of sustained excess — the growing carryforward describes the cause, not the terminal state. Interactive rejection is the last stage of the ladder.'
    },
    source: SRC.capacity,
    tags: ['capacity-metrics', 'carryforward', 'smoothing', 'background-workloads'],
    relatedIds: ['mtdp-002', 'mtdp-003']
  }),

  single({
    id: 'mtdp-002',
    domain: 'maintain',
    subtopic: 'metrics',
    difficulty: 4,
    prompt: 'In the Capacity Metrics app, you see a single item labeled "Notebook — ETL_Daily" consuming 62% of total CU over the last 24 hours on an F16 capacity. The next largest item is 8%. What is the MOST operationally sound first action?',
    options: [
      'Immediately scale the capacity to F32 to accommodate the notebook',
      'Kill the ETL_Daily notebook run to free the capacity',
      'Investigate whether ETL_Daily can be scheduled off-peak or whether its Spark job configuration can be right-sized',
      'Move ETL_Daily to Import mode to reduce its runtime CU cost'
    ],
    correct: 2,
    explanation: 'One item consuming 62% of an F16 is a classic runaway workload concentration. The right approach is workload right-sizing first: (a) check whether the notebook can run during off-peak hours, (b) tune the Spark session configuration (executor count, memory), and (c) optimize the underlying Delta table access. Scaling without optimizing just defers the same problem at higher cost.',
    whyWrong: {
      0: 'Scaling is valid eventually, but investing in optimization first often eliminates the need and always improves the cost curve.',
      1: 'Killing the notebook removes the immediate pressure but provides zero durable fix — it will be back tomorrow.',
      3: '"Import mode" applies to semantic models, not Spark notebooks. Notebooks are not storage-mode artifacts.'
    },
    source: SRC.capacity,
    tags: ['capacity-metrics', 'workload-concentration', 'optimization', 'spark'],
    relatedIds: ['mtdp-001']
  }),

  multi({
    id: 'mtdp-003',
    domain: 'maintain',
    subtopic: 'metrics',
    difficulty: 4,
    prompt: 'Which metrics are available in the Capacity Metrics app but NOT in the Monitoring hub? Select all that apply.',
    options: [
      'Per-item CU consumption over a time range',
      'Throttling percentage and rejected-operation counts',
      'Individual pipeline run success/failure status',
      'Bursting headroom remaining before the smoothing window is exhausted',
      'Submitter identity for a specific run'
    ],
    correct: [0, 1, 3],
    explanation: 'The Capacity Metrics app owns capacity-economics data: per-item CU cost, throttle/reject rates, and bursting headroom. Monitoring hub owns run-level operational data: whether a specific pipeline or dataflow run succeeded, how long it took, and who submitted it. The separation is deliberate — Capacity Metrics is for capacity planning; Monitoring hub is for operational triage.',
    whyWrong: {
      2: 'Individual run success/failure is Monitoring hub territory, not Capacity Metrics.',
      4: 'Submitter identity per run is in Monitoring hub run detail, not Capacity Metrics.'
    },
    source: SRC.capacity,
    tags: ['capacity-metrics', 'monitoring-hub', 'separation-of-concerns'],
    relatedIds: ['mtdp-001']
  }),

  single({
    id: 'mtdp-004',
    domain: 'maintain',
    subtopic: 'metrics',
    difficulty: 3,
    prompt: 'The Capacity Metrics app is a Power BI template app. Which workspace permission allows a user to INSTALL the Capacity Metrics app for their Fabric capacity, assuming they have the right Azure permissions?',
    options: [
      'Fabric capacity Contributor role',
      'Fabric capacity Admin role (or being the Azure subscription Owner/Contributor for the capacity resource)',
      'Power BI workspace Admin',
      'Tenant admin in the Microsoft 365 portal'
    ],
    correct: 1,
    explanation: 'Installing the Capacity Metrics app requires being a capacity admin or having Azure resource-level access to the capacity (Owner or Contributor on the Azure resource group). A Power BI workspace admin cannot install a cross-capacity telemetry app. Microsoft 365 admin does not grant Fabric capacity rights directly.',
    whyWrong: {
      0: 'There is no "Capacity Contributor" role; capacity roles are Admin or nothing for management-plane operations.',
      2: 'Workspace admin manages content inside a workspace, not the capacity itself.',
      3: 'M365 tenant admin grants directory-level rights but not Azure-resource-level Fabric capacity admin.'
    },
    source: SRC.capacity,
    tags: ['capacity-metrics', 'capacity-admin', 'permissions'],
    relatedIds: ['mtdp-003']
  }),

  // ── Throttling Ladder (Q5–Q7) ────────────────────────────────

  single({
    id: 'mtdp-005',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 4,
    prompt: 'An F32 capacity hits 110% CU smoothed for 30 minutes (well past the 5-minute interactive smoothing window). According to the Fabric throttling ladder, which operations are DELAYED first before any rejections occur?',
    options: [
      'Background operations (scheduled refreshes, pipeline runs)',
      'Interactive operations (report loads, on-demand queries)',
      'Both background and interactive simultaneously',
      'Neither — throttling starts with interactive REJECTION, skipping delay'
    ],
    correct: 1,
    explanation: 'The throttling ladder applies delays to INTERACTIVE operations first once the bursting/smoothing window is exhausted. The sequence is: (1) burst absorption within smoothing window, (2) interactive operations delayed, (3) background operations rejected, (4) interactive operations rejected. Interactive delay is the first user-visible symptom — reports slow down before anything is hard-rejected.',
    whyWrong: {
      0: 'Background rejection comes AFTER interactive delay — background is more tolerant of latency so it is rejected before interactives are hard-blocked.',
      2: 'The ladder is sequential, not simultaneous — interactive delay precedes background rejection.',
      3: 'Interactive rejection is the LAST stage. Delay is the first interactive-tier consequence.'
    },
    source: SRC.capacity,
    tags: ['throttling', 'throttling-ladder', 'interactive', 'background', 'exam-trap'],
    relatedIds: ['mtdp-006', 'mtdp-007']
  }),

  single({
    id: 'mtdp-006',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 4,
    prompt: 'A Fabric capacity is in the "background reject" phase of the throttling ladder. A user submits a manually-triggered Power BI report load. What does the user experience?',
    options: [
      'The report loads normally — interactive operations are not affected at the background-reject stage',
      'The report is rejected immediately with a throttling error',
      'The report load is delayed up to the interactive delay ceiling but is not rejected',
      'The capacity auto-pauses and the user sees a "capacity offline" message'
    ],
    correct: 2,
    explanation: 'At the background-reject stage, background jobs (scheduled refreshes, pipeline runs) are hard-rejected. Interactive operations are still being DELAYED at this point — they experience latency penalties but are not rejected. Hard rejection of interactive operations is the next (final) stage.',
    whyWrong: {
      0: 'Interactive operations ARE affected at the background-reject stage — they are being delayed, not pristine.',
      1: 'Interactive rejection is the stage AFTER background rejection; report loads are delayed, not rejected here.',
      3: 'Auto-pause is a configured cost control, not a throttling-ladder behavior. The ladder never auto-pauses a capacity.'
    },
    source: SRC.capacity,
    tags: ['throttling', 'throttling-ladder', 'background-reject', 'interactive-delay'],
    relatedIds: ['mtdp-005', 'mtdp-007']
  }),

  // Ordering Q1: "respond to a throttling event" 5-step flow
  order({
    id: 'mtdp-007',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 4,
    prompt: 'Place these steps in the correct order when RESPONDING to an active throttling event on a Fabric capacity.',
    options: [
      'Open the Capacity Metrics app and identify the top CU-consuming items at the time of the event',
      'Confirm the throttling stage (interactive delay / background reject / interactive reject) from the Capacity Metrics throttling chart',
      'Immediately scale up the capacity one SKU tier to provide relief while investigation continues',
      'Cancel or reschedule the heaviest non-urgent background jobs to reduce CU pressure',
      'Document the root-cause items and create a capacity right-sizing or schedule optimization plan'
    ],
    explanation: 'Confirm the throttling stage first (know what stage you are in), then identify top consumers, then take immediate relief action (scale up or cancel heavy jobs — in that order because scale-up is faster and less disruptive than ad-hoc job cancellation), then durable fix. Scaling before diagnosing wastes money if a single runaway job is the cause; but if the event is live and users are impacted, a temporary scale-up while you diagnose is operationally sound.',
    source: SRC.capacity,
    tags: ['throttling', 'incident-response', 'ordering', 'capacity-management'],
    relatedIds: ['mtdp-005', 'mtdp-006']
  }),

  // ── SKU Selection & Billing (Q8–Q10) ─────────────────────────

  single({
    id: 'mtdp-008',
    domain: 'maintain',
    subtopic: 'sku-management',
    difficulty: 3,
    prompt: 'A small analytics team runs mostly Power BI reports with scheduled Import refreshes, no Spark workloads, and a peak concurrent user count of ~20. Which F-SKU is the MINIMUM tier that supports scheduled semantic model refresh on Fabric (not just Power BI Premium per user)?',
    options: [
      'F2 — all Fabric SKUs support scheduled refresh',
      'F4 — F2 does not support multi-item scheduled refresh',
      'F8 — refresh requires at least F8 compute',
      'F64 — scheduled refresh is a premium-only feature'
    ],
    correct: 0,
    explanation: 'Scheduled semantic model refresh is available on all F-SKUs including F2. There is no minimum-SKU gate for scheduled refresh — the constraint is practical capacity (refresh memory and CU budget), not a product feature gate. F2 is the smallest billable Fabric capacity unit and supports the full semantic-model refresh surface.',
    whyWrong: {
      1: 'F4 is not required; F2 supports multi-item scheduled refresh without restriction.',
      2: 'F8 is not a minimum for refresh. This is a common misconception from the old Premium P-SKU feature tiers.',
      3: 'There is no F64 gate for scheduled refresh; that is nowhere in the product documentation.'
    },
    source: SRC.capacity,
    tags: ['sku', 'f2', 'scheduled-refresh', 'minimum-sku'],
    relatedIds: ['mtdp-009']
  }),

  multi({
    id: 'mtdp-009',
    domain: 'maintain',
    subtopic: 'sku-management',
    difficulty: 4,
    prompt: 'Which statements about reserved Fabric capacity vs. pay-as-you-go (PAYG) Fabric capacity are TRUE? Select all that apply.',
    options: [
      'Reserved (committed) capacity is billed at a discount compared to PAYG hourly rates for the same SKU',
      'PAYG capacity can be paused and billing stops while paused',
      'Reserved capacity commitments are typically 1-year or 3-year terms',
      'PAYG capacity scales elastically to any SKU tier without constraint',
      'A reserved capacity cannot be resized; you must cancel and repurchase'
    ],
    correct: [0, 1, 2],
    explanation: 'Reserved capacity offers significant hourly-rate discounts (typically 40–65% over PAYG) in exchange for a 1- or 3-year commitment. PAYG capacity can be paused (billing stops) and scaled freely. Reserved capacity CAN be resized (scale-up/down) within the commitment period — you do not need to cancel and repurchase to change SKU tier.',
    whyWrong: {
      3: 'PAYG capacity cannot scale to literally "any SKU tier without constraint" — there are regional limits and capacity quota limits per subscription.',
      4: 'Reserved capacity supports online SKU resize. Canceling and repurchasing is not required.'
    },
    source: SRC.capacity,
    tags: ['sku', 'reserved', 'payg', 'billing', 'commitment'],
    relatedIds: ['mtdp-008']
  }),

  single({
    id: 'mtdp-010',
    domain: 'maintain',
    subtopic: 'sku-management',
    difficulty: 3,
    prompt: 'A team needs to run Spark-based Fabric Notebooks as part of their data pipeline. The current capacity is F2. After running a large Spark job, users report the job failed citing insufficient resources. The MOST likely explanation is:',
    options: [
      'Spark is not supported on F2 — you must use at least F4',
      'F2 provides limited Spark concurrency and memory; a large Spark job may exceed the available CU budget and be throttled or rejected',
      'Spark jobs require XMLA Read-Write to be enabled on the capacity',
      'The Spark pool must be configured manually in the capacity settings before notebooks run'
    ],
    correct: 1,
    explanation: 'Spark is supported on all F-SKUs including F2, but F2 provides very limited CU headroom. A large Spark job can exhaust the CU budget of a small SKU, resulting in throttling or rejection. The fix is either to right-size the Spark session (reduce executor count / memory) or upgrade the capacity SKU for Spark-heavy workloads.',
    whyWrong: {
      0: 'Spark Notebooks are supported on F2; there is no hard minimum SKU gate for Spark on Fabric.',
      2: 'XMLA endpoint settings govern semantic model authoring, not Spark execution.',
      3: 'Fabric manages Spark pool allocation automatically; there is no manual pool configuration required in capacity settings for standard notebooks.'
    },
    source: SRC.capacity,
    tags: ['sku', 'spark', 'f2', 'resource-limits'],
    relatedIds: ['mtdp-009']
  }),

  // ── Refresh Management (Q11–Q14) ─────────────────────────────

  multi({
    id: 'mtdp-011',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 4,
    prompt: 'An Import-mode semantic model uses incremental refresh. A partition containing last month\'s data fails mid-refresh. Which statements about the failure are TRUE? Select all that apply.',
    options: [
      'Only the failed partition is rolled back; previously-refreshed partitions in the same run retain their updated data',
      'The entire refresh is rolled back atomically — all partitions revert to the pre-refresh state',
      'The model stays queryable on the last fully-committed state while the failed partition is retried',
      'A partial incremental failure leaves the model in an inconsistent state that requires a full refresh to resolve',
      'The refresh history in Monitoring hub shows which specific partition failed'
    ],
    correct: [1, 2, 4],
    explanation: 'Semantic model refresh is atomic at the model level: if a partition fails, the entire refresh is rolled back and the model reverts to its last successful state. The model remains queryable on the previous-commit snapshot while the failure is investigated. Refresh history in Monitoring hub exposes partition-level failure details. Individual partitions are NOT independently committed within a single refresh run.',
    whyWrong: {
      0: 'Fabric does not commit individual partitions independently within a run — the model is atomic.',
      3: 'The model is NOT in an inconsistent state; the atomic rollback ensures the previous consistent snapshot is preserved. A full refresh is not required — re-running incremental refresh targeting the failed window is sufficient.'
    },
    source: SRC.refresh,
    tags: ['incremental-refresh', 'partition-failure', 'atomic', 'rollback'],
    relatedIds: ['mtdp-012']
  }),

  single({
    id: 'mtdp-012',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 4,
    prompt: 'A semantic model\'s incremental refresh policy stores 3 years of history with a 5-day rolling refresh window. After 18 months of operation, the team notices that full refreshes are required every 6 months to "recover" from accumulating small-file issues. What is the MOST likely root cause?',
    options: [
      'The Power Query source does not support incremental refresh on 3 years of data',
      'Incremental refresh creates one partition per refresh run; without periodic partition merging, the partition count grows until the model overhead degrades performance',
      'The RangeStart / RangeEnd parameters are misconfigured, causing overlapping partitions',
      'The 5-day rolling window exceeds the maximum allowed window for the capacity SKU'
    ],
    correct: 1,
    explanation: 'Incremental refresh creates a new partition for each refresh run. Over 18 months with daily refreshes, you accumulate ~540 partitions. High partition counts increase model-open overhead, query plan complexity, and refresh memory. The fix is to enable "Detect data changes" OR to periodically consolidate partitions (which a full refresh achieves as a side-effect). This is a known long-term incremental-refresh operational pattern.',
    whyWrong: {
      0: 'The 3-year history window is a model-design choice; the source supports it as long as the folding query works correctly.',
      2: 'RangeStart/RangeEnd misconfiguration causes DATA issues (overlapping rows), not performance degradation after 18 months.',
      3: 'There is no maximum rolling-window constraint per SKU for incremental refresh.'
    },
    source: SRC.refresh,
    tags: ['incremental-refresh', 'partition-accumulation', 'performance', 'operations'],
    relatedIds: ['mtdp-011', 'mtdp-013']
  }),

  single({
    id: 'mtdp-013',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 3,
    prompt: 'A scheduled dataset refresh fails with "Data source credentials are expired or not configured." The data source is an on-premises SQL Server connected via an on-premises data gateway. Which is the MOST likely resolution?',
    options: [
      'Re-enter the gateway service account credentials in the dataset settings → Data source credentials',
      'Increase the capacity SKU to provide more refresh memory',
      'Switch from gateway-based refresh to Direct Lake mode',
      'Disable the scheduled refresh and use the Fabric REST API to trigger it instead'
    ],
    correct: 0,
    explanation: 'Credential errors on gateway-connected sources are resolved by re-entering (or re-authorizing) the data source credentials in the semantic model\'s Data source credentials settings. This is required whenever the service account password changes or the credential token expires. The gateway itself is not the issue; the stored credential binding is.',
    whyWrong: {
      1: 'Memory limits produce allocation errors, not credential errors. The error message distinguishes these.',
      2: 'Direct Lake requires the data to be in OneLake as Delta tables — an on-premises SQL Server cannot be a Direct Lake source.',
      3: 'Switching refresh trigger does not fix an invalid credential; the credential error fires regardless of how refresh is invoked.'
    },
    source: SRC.refresh,
    tags: ['refresh', 'gateway', 'credentials', 'troubleshooting'],
    relatedIds: ['mtdp-014']
  }),

  multi({
    id: 'mtdp-014',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 4,
    prompt: 'Which factors can cause a semantic model\'s scheduled refresh to be SKIPPED (not failed — skipped without attempting to run)? Select all that apply.',
    options: [
      'A previous scheduled refresh is still in progress when the next scheduled time arrives',
      'The capacity is paused',
      'The gateway cluster is offline',
      'Another refresh of the same dataset was manually triggered within the last 5 minutes',
      'The workspace has exceeded the 8 scheduled-refresh-per-day limit on a Premium Per User license'
    ],
    correct: [0, 1, 4],
    explanation: 'Three documented skip conditions: (1) an in-progress refresh of the same model at the scheduled time causes a skip (not queue); (2) a paused capacity cannot run refreshes; (3) PPU and shared capacity licenses impose a maximum daily refresh frequency, and exceeding it skips the run. A gateway being offline causes a FAILED refresh, not a skip. Manual trigger throttling exists for some APIs but is not a 5-minute skip window.',
    whyWrong: {
      2: 'An offline gateway causes a FAILURE with a connectivity error — the refresh ATTEMPTS and then fails. It is not silently skipped.',
      3: 'There is no 5-minute manual-trigger lockout that causes scheduled refreshes to skip. Manual and scheduled refresh queues are independent.'
    },
    source: SRC.refresh,
    tags: ['refresh', 'skip', 'scheduled-refresh', 'capacity-paused', 'ppu-limits'],
    relatedIds: ['mtdp-013']
  }),

  // ── Troubleshooting (Q15–Q17) ────────────────────────────────

  // Ordering Q2: "diagnose a refresh failure" 5-step flow
  order({
    id: 'mtdp-015',
    domain: 'maintain',
    subtopic: 'troubleshooting',
    difficulty: 3,
    prompt: 'Place these steps in the correct order for DIAGNOSING a semantic model scheduled refresh failure.',
    options: [
      'Navigate to the Monitoring hub and open the failed refresh run to read the error message',
      'Check whether the error is a credential, gateway, memory, or data-shape error by reading the error category and details',
      'Reproduce the failure by running the transformation logic against the data source manually (e.g., test the gateway connection, run the folding query in Power Query)',
      'Apply the fix (re-enter credentials, fix the M query, upgrade SKU, or update gateway)',
      'Verify the next scheduled run succeeds and review Monitoring hub to confirm no residual issues'
    ],
    explanation: 'Read the Monitoring hub error message first (1) — that determines which branch to take. Categorize the error type (2) before reproducing (3) so you reproduce the right thing. Fix after reproduction (4) and verify post-fix (5). Skipping step 1 and going straight to "fix" is the pattern that causes admins to update credentials when the real problem is an M query fault tolerance issue.',
    source: SRC.troubleshoot,
    tags: ['troubleshooting', 'refresh-failure', 'ordering', 'diagnostic-process'],
    relatedIds: ['mtdp-013', 'mtdp-014']
  }),

  single({
    id: 'mtdp-016',
    domain: 'maintain',
    subtopic: 'troubleshooting',
    difficulty: 4,
    prompt: 'A Fabric Data Pipeline fails at the "Copy Data" activity with the error "The server was not found or was not accessible." All other activities in the pipeline succeed. What is the MOST targeted first diagnostic action?',
    options: [
      'Restart the entire pipeline from the beginning',
      'Open the failed activity\'s run details in Monitoring hub and check the error message\'s source connector and connection details',
      'Recreate the pipeline from scratch',
      'Increase the pipeline timeout setting to allow more connection retries'
    ],
    correct: 1,
    explanation: 'Activity-level run details in Monitoring hub show the specific connection details that the Copy Data activity attempted. "Server not found" is a network/DNS issue on the source or sink connector — the details pane shows which connection string was used, which identifies whether it is misconfigured, a gateway issue, or a network policy block. Starting there avoids guessing.',
    whyWrong: {
      0: 'Restarting without diagnosis repeats the same failure and adds nothing.',
      2: 'Recreation destroys the pipeline configuration and is never the first step.',
      3: 'Timeout settings address slow connections; "server not found" is an unreachable host, not a slow host — timeouts do not fix network routing.'
    },
    source: SRC.troubleshoot,
    tags: ['troubleshooting', 'pipeline', 'copy-data', 'connectivity'],
    relatedIds: ['mtdp-015']
  }),

  single({
    id: 'mtdp-017',
    domain: 'maintain',
    subtopic: 'troubleshooting',
    difficulty: 4,
    prompt: 'A Fabric Warehouse query is reliably slower than expected. The query does a full table scan of a 500-million-row fact table. You want to know if the issue is a missing statistics or suboptimal execution plan. Which tool provides query execution plan information for Fabric Warehouse?',
    options: [
      'Monitoring hub — drill into the warehouse query run',
      'Query Insights view in the Fabric Warehouse (sys.dm_exec_query_stats equivalent)',
      'Capacity Metrics app — select the warehouse item and drill into CU cost',
      'XMLA endpoint + DAX Studio'
    ],
    correct: 1,
    explanation: 'Fabric Warehouse exposes Query Insights (via the built-in DMV-style views such as queryinsights.exec_requests_history and queryinsights.long_running_queries) for analyzing execution plans and query performance. Monitoring hub shows run-level success/failure but not execution plan detail. Capacity Metrics shows CU cost, not plan quality. XMLA/DAX Studio is for semantic models, not warehouses.',
    whyWrong: {
      0: 'Monitoring hub does not surface query execution plans for Fabric Warehouse — it shows run metadata.',
      2: 'Capacity Metrics shows how much CU the warehouse consumed, not WHY a specific query is slow.',
      3: 'XMLA endpoint and DAX Studio interact with the Tabular engine (semantic models), not the Fabric Warehouse SQL engine.'
    },
    source: SRC.troubleshoot,
    tags: ['troubleshooting', 'warehouse', 'query-insights', 'execution-plan'],
    relatedIds: ['mtdp-016']
  }),

  // ── Audit Logs (Q18–Q20) ─────────────────────────────────────

  single({
    id: 'mtdp-018',
    domain: 'maintain',
    subtopic: 'audit-logs',
    difficulty: 3,
    prompt: 'A security team wants to know which users exported data from a specific Power BI report in the last 30 days. Where should they look FIRST?',
    options: [
      'Workspace Activity log in the Fabric workspace settings',
      'Microsoft 365 Unified Audit Log (UAL) via the Purview compliance portal',
      'Capacity Metrics app — export events show up as CU spikes',
      'Monitoring hub — filter by item type "Report"'
    ],
    correct: 1,
    explanation: 'Export-data events from Power BI reports are audited in the Microsoft 365 Unified Audit Log (UAL), accessible via the Purview compliance portal or via the Office 365 Management Activity API. UAL captures user-level actions across all Microsoft 365 and Fabric services including Export events, View events, and Share events for Power BI items.',
    whyWrong: {
      0: 'Workspace Activity log records administrative workspace changes (member additions, workspace name changes) — not report-level export events.',
      2: 'Capacity Metrics tracks CU consumption, not user-level security events.',
      3: 'Monitoring hub tracks item run operations (refresh, pipeline runs), not user-interaction events like report exports.'
    },
    source: SRC.troubleshoot,
    tags: ['audit-logs', 'unified-audit-log', 'export-event', 'purview'],
    relatedIds: ['mtdp-019']
  }),

  multi({
    id: 'mtdp-019',
    domain: 'maintain',
    subtopic: 'audit-logs',
    difficulty: 4,
    prompt: 'Which events are captured in the Microsoft 365 Unified Audit Log for Fabric/Power BI? Select all that apply.',
    options: [
      'Report view events (who opened a report)',
      'Dataset refresh start and completion events',
      'Sensitivity label change events on Fabric items',
      'CU consumption per item per hour',
      'Share link creation and share events'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'UAL captures user-interaction events: report views, dataset refresh start/end, sensitivity label changes, share operations, export operations, and capacity-admin operations. CU consumption data is NOT a UAL event — that lives in the Capacity Metrics app and Azure Monitor diagnostics, not in the compliance audit trail.',
    whyWrong: {
      3: 'CU consumption is a telemetry metric, not a compliance-audit event. It lives in Capacity Metrics and Azure Monitor, not in the Unified Audit Log.'
    },
    source: SRC.troubleshoot,
    tags: ['audit-logs', 'unified-audit-log', 'events', 'purview'],
    relatedIds: ['mtdp-018']
  }),

  single({
    id: 'mtdp-020',
    domain: 'maintain',
    subtopic: 'audit-logs',
    difficulty: 3,
    prompt: 'How long does Microsoft 365 retain Unified Audit Log records for a standard Microsoft 365 E3 tenant without any add-on compliance licenses?',
    options: [
      '7 days',
      '90 days',
      '180 days',
      '1 year'
    ],
    correct: 1,
    explanation: 'The default UAL retention for M365 E3 is 90 days. Microsoft 365 E5 or the Microsoft Purview Audit (Premium) add-on extends retention to 1 year. For 10-year retention, Purview Audit (Premium) with long-term retention policies is required.',
    whyWrong: {
      0: '7 days is far too short and does not match any documented default retention tier.',
      2: '180 days is not a standard E3 retention tier.',
      3: '1-year retention requires E5 or Purview Audit (Premium); it is not the E3 default.'
    },
    source: SRC.troubleshoot,
    tags: ['audit-logs', 'retention', 'm365', 'purview', 'e3'],
    relatedIds: ['mtdp-018', 'mtdp-019']
  }),

  // ── Tenant Admin (Q21–Q23) ────────────────────────────────────

  single({
    id: 'mtdp-021',
    domain: 'maintain',
    subtopic: 'tenant-admin',
    difficulty: 3,
    prompt: 'A Power BI tenant admin wants to allow only specific security groups to use the "Export to Excel" feature. Where is this setting configured?',
    options: [
      'Workspace Settings → Export options',
      'Fabric Admin portal → Tenant settings → Export and sharing settings',
      'Azure Active Directory → App registrations → Power BI service',
      'Capacity settings → Workloads → Export limit'
    ],
    correct: 1,
    explanation: 'Tenant settings in the Fabric (Power BI) Admin portal control feature availability across the tenant. Export and sharing settings (including "Export to Excel", "Export to CSV", "Export reports as PowerPoint presentations") can be enabled/disabled for the whole tenant or scoped to specific security groups. This is the canonical admin surface for feature gating.',
    whyWrong: {
      0: 'Workspace settings do not have an export-feature gate — that is a tenant-level control.',
      2: 'Azure AD app registrations manage API access for service principals, not end-user feature toggles.',
      3: 'Capacity workload settings manage resource allocation (memory limits, concurrency), not user-facing feature toggles.'
    },
    source: SRC.troubleshoot,
    tags: ['tenant-admin', 'tenant-settings', 'export', 'feature-gating'],
    relatedIds: ['mtdp-022']
  }),

  multi({
    id: 'mtdp-022',
    domain: 'maintain',
    subtopic: 'tenant-admin',
    difficulty: 4,
    prompt: 'Which tenant settings can be overridden at the CAPACITY level in Fabric, allowing a capacity admin to apply different settings for workloads on that capacity? Select all that apply.',
    options: [
      'Certification and endorsement settings for items on the capacity',
      'Dataset scheduled refresh frequency (number of refreshes per day)',
      'Delegated tenant settings for workspaces assigned to the capacity',
      'Sensitivity label mandatory enforcement',
      'Workspace creation permissions'
    ],
    correct: [1, 2],
    explanation: 'Capacity-level delegation allows capacity admins to override specific tenant settings for workloads on their capacity. Specifically: refresh frequency limits (dataset refresh count per day) can be increased per capacity, and delegated tenant settings allow the capacity admin to apply different settings (e.g., enable/disable specific features) for all workspaces on that capacity. Certification/endorsement, sensitivity label enforcement, and workspace creation permissions are tenant-only settings not overridable at capacity level.',
    whyWrong: {
      0: 'Certification endorsement policies are set at the tenant level by the fabric admin — capacity admins cannot independently override them.',
      3: 'Sensitivity label mandatory enforcement is a Purview/tenant-level policy; capacity admins cannot override MIP label requirements.',
      4: 'Workspace creation permissions are a tenant-level governance control, not capacity-scoped.'
    },
    source: SRC.troubleshoot,
    tags: ['tenant-admin', 'capacity-delegation', 'tenant-settings', 'capacity-override'],
    relatedIds: ['mtdp-021']
  }),

  single({
    id: 'mtdp-023',
    domain: 'maintain',
    subtopic: 'tenant-admin',
    difficulty: 3,
    prompt: 'A Fabric tenant admin wants to prevent users from creating new workspaces by default while still allowing a designated "Workspace Creators" security group to create them. Which setting accomplishes this?',
    options: [
      'Set "Workspace creation" tenant setting to "Specific security groups" and add the designated group',
      'Remove all users from the Fabric license to block workspace creation',
      'Set workspace capacity to F2 — lower SKUs prevent workspace creation by non-admins',
      'Disable the "Delegated tenant settings" option on each capacity'
    ],
    correct: 0,
    explanation: 'The "Workspace creation" tenant setting in the Fabric admin portal has three options: Enabled for entire org, Enabled for specific security groups, and Disabled. Setting it to "Specific security groups" and adding the designated group is the supported, precise solution.',
    whyWrong: {
      1: 'Removing licenses is a heavy-handed approach that removes all Fabric/Power BI access, not just workspace creation.',
      2: 'Capacity SKU has no bearing on workspace creation permissions.',
      3: 'Delegated tenant settings are for capacity-level overrides of feature settings, not for workspace creation authorization.'
    },
    source: SRC.troubleshoot,
    tags: ['tenant-admin', 'workspace-creation', 'security-groups', 'governance'],
    relatedIds: ['mtdp-022']
  }),

  // ── Workspace Admin (Q24–Q26) ─────────────────────────────────

  single({
    id: 'mtdp-024',
    domain: 'maintain',
    subtopic: 'workspace-admin',
    difficulty: 2,
    prompt: 'Which workspace role is the MINIMUM required to publish a new report to a Fabric workspace?',
    options: [
      'Viewer',
      'Contributor',
      'Member',
      'Admin'
    ],
    correct: 1,
    explanation: 'Contributor is the minimum role required to publish (create) content in a workspace. Viewers can only consume published content. Member and Admin also have publish rights but include additional capabilities (Member can share; Admin manages access). The Contributor→publish mapping is frequently tested.',
    whyWrong: {
      0: 'Viewers have read-only access; they cannot publish.',
      2: 'Member can publish, but it is not the MINIMUM — Contributor already allows publish.',
      3: 'Admin can publish, but it is not the MINIMUM — Contributor already allows publish.'
    },
    source: SRC.workspace,
    tags: ['workspace-admin', 'roles', 'contributor', 'publish', 'minimum-role'],
    relatedIds: ['mtdp-025']
  }),

  multi({
    id: 'mtdp-025',
    domain: 'maintain',
    subtopic: 'workspace-admin',
    difficulty: 3,
    prompt: 'A workspace Admin needs to enable a user to share items from the workspace with external users AND manage workspace access (add/remove members). Which role(s) satisfy BOTH requirements? Select all that apply.',
    options: [
      'Admin',
      'Member',
      'Contributor',
      'Viewer'
    ],
    correct: [0, 1],
    explanation: 'Managing workspace access (adding/removing members) requires Admin role. Sharing items with external users requires at least Member role (which includes share rights). Admin inherits all Member rights. Contributor cannot manage workspace access and has limited sharing rights. Viewer has no management or sharing rights.',
    whyWrong: {
      2: 'Contributors cannot manage workspace access (add/remove members). That action is restricted to Admin.',
      3: 'Viewers have no sharing or management rights.'
    },
    source: SRC.workspace,
    tags: ['workspace-admin', 'roles', 'admin', 'member', 'share', 'manage-access'],
    relatedIds: ['mtdp-024']
  }),

  single({
    id: 'mtdp-026',
    domain: 'maintain',
    subtopic: 'workspace-admin',
    difficulty: 4,
    prompt: 'A Fabric domain admin wants to apply a governance rule that all workspaces in the "Finance" domain must use a sensitivity label of at least "Confidential" on published semantic models. Which mechanism enforces this at domain level?',
    options: [
      'Domain settings → Default sensitivity label for the domain',
      'Mandatory sensitivity label policy configured in Microsoft Purview scoped to the Finance domain security group',
      'A workspace role assignment that restricts publishing to Admin-only',
      'A capacity-level workload setting for the Finance capacity'
    ],
    correct: 1,
    explanation: 'Mandatory sensitivity label enforcement at domain granularity is achieved via a Purview label policy scoped to the security group that owns the Finance domain workspaces. The policy can mandate that items in scope carry at least a specified label. Domain Settings in Fabric can set a default label, but DEFAULT is not the same as ENFORCED MINIMUM — a default can be overridden downward by users who have change rights.',
    whyWrong: {
      0: 'Domain default sensitivity label sets a starting value but does not enforce a minimum — users with label-change rights can override it.',
      2: 'Workspace role restriction to Admin-only governs who can publish, not what label must be present.',
      3: 'Capacity workload settings manage compute allocation, not content governance rules.'
    },
    source: SRC.sensitivity,
    tags: ['workspace-admin', 'domain-admin', 'sensitivity-labels', 'purview', 'enforcement'],
    relatedIds: ['mtdp-023']
  }),

  // ── Delta Lake / Lakehouse Maintenance (Q27–Q29) ─────────────

  multi({
    id: 'mtdp-027',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 4,
    prompt: 'Which Delta Lake maintenance operations should be performed regularly on a Lakehouse fact table that receives continuous micro-batch appends? Select all that apply.',
    options: [
      'OPTIMIZE — compacts small Parquet files into fewer, larger files to reduce read overhead',
      'VACUUM — removes Delta transaction log files and Parquet files no longer referenced by any version within the retention window',
      'Z-ORDER by commonly-filtered columns to co-locate related rows and reduce files scanned',
      'DROP TABLE AND RECREATE — Delta does not support in-place maintenance',
      'V-Order write recompression of existing files to improve Direct Lake read performance'
    ],
    correct: [0, 1, 2],
    explanation: 'Three regularly-scheduled maintenance operations are recommended: OPTIMIZE (compact small files), VACUUM (reclaim storage from obsolete versions), and Z-ORDER (optional but effective for selective-predicate workloads on high-cardinality columns). DROP/RECREATE destroys table history and is not a maintenance pattern. V-Order is applied at WRITE time, not as a separate post-write recompression step on existing files.',
    whyWrong: {
      3: 'Dropping and recreating the table destroys all Delta history and is never a recommended maintenance pattern for an active table.',
      4: 'V-Order is a write-time encoding optimization. You cannot retroactively apply V-Order to existing files — you would need to rewrite the data (e.g., via OPTIMIZE with V-Order-aware write settings), not a standalone V-Order command.'
    },
    source: SRC.monitoring,
    tags: ['delta-lake', 'optimize', 'vacuum', 'z-order', 'lakehouse-maintenance'],
    relatedIds: ['mtdp-028']
  }),

  single({
    id: 'mtdp-028',
    domain: 'maintain',
    subtopic: 'troubleshooting',
    difficulty: 4,
    prompt: 'A Delta table time-travel query "SELECT * FROM silver.FactSales VERSION AS OF 10" fails with "Version 10 is older than the retention threshold." The table was last VACUUMed with default settings yesterday. What is the MOST likely cause?',
    options: [
      'The VACUUM command deleted transaction log entries older than 7 days, but version 10 was written more than 7 days ago',
      'Version 10 has been compacted by OPTIMIZE and no longer exists as a discrete version',
      'VACUUM sets the minimum readable version to the current version minus 1',
      'Time-travel requires the XMLA endpoint to be in Read-Write mode'
    ],
    correct: 0,
    explanation: 'VACUUM with default settings removes files not needed by Delta versions older than 7 days (168-hour retention). If version 10 was committed more than 7 days ago and VACUUM has run since, the Parquet files for that version are deleted and time-travel to that version fails. To extend the range, set `delta.deletedFileRetentionDuration` to a longer period BEFORE running VACUUM.',
    whyWrong: {
      1: 'OPTIMIZE compacts files but does not remove Delta transaction log entries or make old versions unreadable — it creates new versions and the old files are retained until VACUUM removes them.',
      2: 'VACUUM does not set a "current minus 1" floor; it respects the retention duration setting.',
      3: 'Time-travel is a Delta/Spark SQL feature on the Lakehouse, unrelated to the XMLA endpoint (which is a semantic-model concept).'
    },
    source: SRC.troubleshoot,
    tags: ['delta-lake', 'time-travel', 'vacuum', 'retention', 'version-as-of'],
    relatedIds: ['mtdp-027', 'mtdp-029']
  }),

  single({
    id: 'mtdp-029',
    domain: 'maintain',
    subtopic: 'troubleshooting',
    difficulty: 3,
    prompt: 'You want to preserve 30 days of Delta table history for compliance time-travel queries but do not want storage costs to grow unboundedly. Which configuration correctly extends VACUUM retention to 30 days?',
    options: [
      'Set `delta.logRetentionDuration = "interval 30 days"` on the table and run VACUUM with no flags',
      'Set `delta.deletedFileRetentionDuration = "interval 30 days"` on the table and run VACUUM (which will respect the new threshold)',
      'Run VACUUM RETAIN 720 (720 hours = 30 days)',
      'Both B and C achieve 30-day retention; B is the persistent setting, C is a one-time override'
    ],
    correct: 3,
    explanation: 'Both approaches work. `delta.deletedFileRetentionDuration` is the table property that persists the retention threshold across VACUUM runs. `VACUUM RETAIN 720` is a per-invocation override that sets the hours threshold for that single run. For durable 30-day compliance retention, set the table property (B) so all future VACUUM runs respect it. Using the RETAIN flag alone (C) requires discipline to always specify it correctly.',
    whyWrong: {
      0: '`delta.logRetentionDuration` controls how long the TRANSACTION LOG (not the data files) is kept. The transaction log retention is different from the deleted-file retention threshold used by VACUUM.',
      1: 'Correct in isolation but option D is more complete.',
      2: 'Correct in isolation but option D is more complete.'
    },
    source: SRC.troubleshoot,
    tags: ['delta-lake', 'vacuum', 'retention', 'deletedFileRetentionDuration', 'compliance'],
    relatedIds: ['mtdp-028']
  }),

  // ── Alerts & Real-Time Hub (Q30–Q31) ─────────────────────────

  single({
    id: 'mtdp-030',
    domain: 'maintain',
    subtopic: 'alerts',
    difficulty: 3,
    prompt: 'A data engineer wants to receive an email alert when a specific Eventstream stream\'s ingested event count drops below 100 events per minute for more than 5 consecutive minutes. Which Fabric feature is BEST suited for this?',
    options: [
      'Pipeline "Notify" action triggered by a pipeline condition activity',
      'Real-Time Hub alert rule with a condition on the stream\'s metric',
      'Monitoring hub scheduled report exported to email',
      'A Fabric Data Activator (Reflex) item connected to the Eventstream with a sustained-low condition'
    ],
    correct: 3,
    explanation: 'Fabric Data Activator (Reflex) supports sustained-condition alerting: you can define a trigger that fires only when a property stays below a threshold for a specified duration. A simple "below X" alert in Real-Time Hub fires on the first breach, not after a sustained period — Reflex allows the time-window condition logic needed here.',
    whyWrong: {
      0: 'Pipeline notifications fire on pipeline activity outcomes, not on streaming data metric conditions.',
      1: 'Real-Time Hub alert rules fire on simple threshold crossings but do NOT natively support "sustained for N minutes" conditions without additional logic. Reflex is the right tool for time-window conditions.',
      2: 'Monitoring hub does not provide stream-metric alerting or scheduled email exports at this granularity.'
    },
    source: SRC.monitoring,
    tags: ['alerts', 'reflex', 'activator', 'eventstream', 'sustained-condition'],
    relatedIds: ['mtdp-031']
  }),

  multi({
    id: 'mtdp-031',
    domain: 'maintain',
    subtopic: 'alerts',
    difficulty: 3,
    prompt: 'In Real-Time Hub, you create an alert rule on a KQL database table column. Which action outputs are available NATIVELY without writing custom code? Select all that apply.',
    options: [
      'Send an email to specified recipients',
      'Post a message to a Microsoft Teams channel',
      'Trigger a Power Automate cloud flow',
      'Execute an Azure Function directly',
      'Post to a custom HTTPS webhook endpoint'
    ],
    correct: [0, 1, 2],
    explanation: 'Real-Time Hub alert rules natively support three output action types: send email, post Teams message, and trigger a Power Automate flow. Azure Functions and custom webhooks are NOT directly available as native Real-Time Hub action types — they can be reached indirectly via Power Automate connectors, but that still requires Power Automate as the intermediary.',
    whyWrong: {
      3: 'Azure Functions are not a native Real-Time Hub action type. To trigger an Azure Function, use the Power Automate action and add an Azure Functions connector step inside the flow.',
      4: 'Custom HTTPS webhooks are not a first-class Real-Time Hub action output. Power Automate\'s HTTP connector can send to webhooks, but that requires Power Automate as the bridge.'
    },
    source: SRC.monitoring,
    tags: ['alerts', 'real-time-hub', 'kql', 'actions', 'multi-select'],
    relatedIds: ['mtdp-030']
  }),

  // ── Semantic Model Usage Metrics & Power BI Service (Q32–Q33) ─

  single({
    id: 'mtdp-032',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 3,
    prompt: 'A workspace admin wants to see how frequently each published report is being used and which users are the top consumers. Which built-in Fabric/Power BI feature provides this?',
    options: [
      'Monitoring hub — filter by item type "Report" and sort by run count',
      'Workspace usage metrics report (accessed via the "..." menu on the workspace)',
      'Capacity Metrics app — drill into the workspace and expand items',
      'Microsoft 365 Unified Audit Log — export and pivot on report view events'
    ],
    correct: 1,
    explanation: 'The workspace usage metrics report (available to workspace admins via the three-dot menu → View usage metrics) provides per-report open counts, daily/weekly trends, and top users — all in a pre-built Power BI report. Monitoring hub covers run operations, not consumption patterns. Capacity Metrics shows CU costs. UAL can provide the raw data but requires manual export and analysis.',
    whyWrong: {
      0: 'Monitoring hub tracks pipeline and dataflow runs, not user-consumption patterns (who opened which report).',
      2: 'Capacity Metrics shows CU consumption by item, not user-level consumption patterns or open counts.',
      3: 'UAL provides raw event data but requires manual extraction and pivoting — the workspace usage metrics report provides this out of the box.'
    },
    source: SRC.monitoring,
    tags: ['monitoring', 'usage-metrics', 'workspace-admin', 'report-usage'],
    relatedIds: ['mtdp-033']
  }),

  single({
    id: 'mtdp-033',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 4,
    prompt: 'You publish a "Usage Metrics" report for a semantic model and notice that all user identity fields are blank — only totals are available. What tenant setting is MOST likely disabled?',
    options: [
      '"Allow usage metrics for content creators" is turned off',
      '"Track per-user activity in usage metrics for content creators" is turned off',
      '"Audit and usage settings" are not available at the workspace tier',
      'The workspace is on a PAYG capacity which does not support per-user metrics'
    ],
    correct: 1,
    explanation: '"Track per-user activity in usage metrics for content creators" is a distinct tenant setting from the main usage-metrics toggle. When it is off, the usage metrics report shows aggregated counts but blanks out user identity fields (name and email) to protect privacy. Enabling this setting (and informing users per GDPR) populates the per-user columns.',
    whyWrong: {
      0: '"Allow usage metrics" enables the feature entirely — if it were off, there would be no usage metrics report at all, not blank identity fields.',
      2: 'Workspace tier does not affect per-user tracking settings; they are tenant-level.',
      3: 'PAYG vs reserved capacity does not affect usage metrics privacy settings.'
    },
    source: SRC.monitoring,
    tags: ['monitoring', 'usage-metrics', 'tenant-settings', 'per-user-tracking', 'privacy'],
    relatedIds: ['mtdp-032']
  }),

  // Ordering Q3: "add a new dataset to capacity" steps
  order({
    id: 'mtdp-034',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 3,
    prompt: 'Place these steps in the correct order for ADDING a new large semantic model to an existing F64 Fabric capacity without degrading currently-running workloads.',
    options: [
      'Check the Capacity Metrics app to understand current CU utilization baseline and available headroom',
      'Estimate the new model\'s refresh memory requirement (approximately 2× model size) and compare against the SKU memory ceiling',
      'Schedule the first full refresh during a known low-CU period (e.g., overnight) to avoid contention',
      'Monitor the Capacity Metrics app during and after the first refresh to confirm the capacity absorbs the additional load',
      'Adjust the refresh schedule or scale the capacity SKU if the Capacity Metrics app shows sustained overages post-addition'
    ],
    explanation: 'Understand current headroom first (1), then estimate the new workload\'s peak cost (2), time the initial load to minimize disruption (3), observe the impact (4), then tune permanently (5). Publishing the model without step 1-3 is how teams accidentally throttle a healthy capacity. The common mistake is skipping step 2 — underestimating refresh memory for large models leads to allocation failures that affect all users on the capacity.',
    source: SRC.capacity,
    tags: ['capacity-management', 'ordering', 'onboarding', 'capacity-planning', 'refresh-memory'],
    relatedIds: ['mtdp-001', 'mtdp-011']
  }),

  // ── Dataflow Gen2 Monitoring (Q35) ────────────────────────────

  single({
    id: 'mtdp-035',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 3,
    prompt: 'A Dataflow Gen2 is scheduled to refresh hourly. Over a 3-day period, Monitoring hub shows that 4 out of 72 runs failed with "Evaluation error in step \'MergeQueries\'". All failed runs occurred between 02:00 and 04:00 UTC. What is the MOST likely root cause, and what should be investigated FIRST?',
    options: [
      'The Dataflow Gen2 has a bug in the M code that affects all runs equally; rewrite the merge step',
      'The source system likely has a maintenance window or data availability gap between 02:00–04:00 UTC that causes the merge to fail on missing or locked data',
      'The capacity is paused nightly, causing the 02:00–04:00 runs to fail silently',
      'Dataflow Gen2 does not support hourly refresh; the schedule should be changed to every 2 hours'
    ],
    correct: 1,
    explanation: 'The time-bounded failure pattern (all failures within the same 2-hour window) is the diagnostic signal. This points strongly to a source-side event: a maintenance window, batch-load lock on the source table, a nightly ETL job that temporarily makes source data unavailable or inconsistent. The M code is unchanged across all runs — so the 4/72 failures cannot be a persistent code bug. Investigate source system maintenance schedules for the 02:00–04:00 UTC window.',
    whyWrong: {
      0: 'An M code bug would affect ALL 72 runs consistently, not just 4 in a specific time window.',
      2: 'A paused capacity would produce "capacity offline" errors, not "Evaluation error in step MergeQueries". And if the capacity were paused, the runs would be skipped, not logged as failures.',
      3: 'Dataflow Gen2 supports refresh intervals as frequent as 15 minutes on appropriate capacity; hourly is well within supported bounds.'
    },
    source: SRC.refresh,
    tags: ['refresh-management', 'dataflow-gen2', 'time-pattern', 'source-maintenance', 'troubleshooting'],
    relatedIds: ['mtdp-014', 'mtdp-015']
  })
];
