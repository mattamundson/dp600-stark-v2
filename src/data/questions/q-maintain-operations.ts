// Maintain — Operations batch.
//
// Sprint 1 of the 14-day exam-prep schedule. ALL questions tagged
// domain:'maintain' to lift the bank from 22.1% (109/493) toward
// the 27.5% blueprint target. Subtopics chosen to be NEW (none in
// the current top-15) so we don't duplicate existing coverage:
//
//   monitoring             Monitoring hub, capacity metrics app, refresh history
//   capacity-management    F-SKUs, bursting, throttling, autoscale, pause/resume
//   refresh-management     Scheduled, on-demand, gateway-bound, incremental
//   troubleshooting        Refresh failures, perf debugging, audit logs
//   lifecycle-management   Workspace lifecycle, item versions, retention
//
// Source: learn.microsoft.com/en-us/fabric/admin/* and Capacity Metrics App
// docs (last reviewed 2026-04 by the user).

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const maintainOperations: Question[] = [
  // ── Monitoring hub (5 Q) ─────────────────────────────────────
  single({
    id: 'mo-001',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 2,
    prompt: 'Where in Fabric do you go FIRST to see a unified view of recent runs across data pipelines, dataflow Gen2 refreshes, and notebook executions across a workspace?',
    options: [
      'Capacity Metrics app',
      'Monitoring hub',
      'Workspace Settings → Activity log',
      'Power BI service Activity feed (legacy)'
    ],
    correct: 1,
    explanation: 'Monitoring hub is the first-stop unified runs view: pipelines, dataflows, notebooks, semantic-model refreshes, scheduled jobs, and shortcut sync activities all surface there with status, duration, and submitter. Capacity Metrics tracks CU consumption, not run-level success/failure.',
    whyWrong: {
      0: 'Capacity Metrics app shows CU% / throttling / bursting at the capacity level — not individual run status.',
      2: 'Workspace Activity log records administrative events (role changes, item create/delete) — not run history.',
      3: 'The legacy Power BI Activity feed is dataset-refresh-specific and does not cover Fabric-native items.'
    },
    source: SRC.monitoring,
    tags: ['monitoring', 'monitoring-hub', 'first-stop'],
    relatedIds: ['mo-002', 'mo-006']
  }),

  multi({
    id: 'mo-002',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 3,
    prompt: 'Which signals can the Monitoring hub surface for a given run? Select all that apply.',
    options: [
      'Run status (succeeded / failed / in-progress / cancelled)',
      'Duration and start/end timestamps',
      'Submitter identity',
      'Per-CU% breakdown by item (which item burned which capacity unit-seconds)',
      'Item type and item name'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Monitoring hub surfaces run-level metadata: status, timing, submitter, item type/name. Per-CU breakdowns by item live in the **Capacity Metrics app**, not the Monitoring hub. This is the most common DP-600 trap on monitoring placement.',
    whyWrong: {
      3: 'CU breakdowns are a Capacity Metrics app concept. Monitoring hub knows that a run happened; Capacity Metrics knows what it cost.'
    },
    source: SRC.monitoring,
    tags: ['monitoring', 'monitoring-hub', 'capacity-metrics', 'separation-of-concerns'],
    relatedIds: ['mo-001', 'mo-006']
  }),

  single({
    id: 'mo-003',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 3,
    prompt: 'A semantic model refresh is shown as "In progress" in Monitoring hub, but the team suspects it has hung. The refresh has been running for 45 minutes; the historical p95 is 8 minutes. What is the FIRST diagnostic step?',
    options: [
      'Cancel the refresh and re-trigger it from the workspace',
      'Open the refresh details from Monitoring hub and inspect refresh-error / partition / step-level breakdown',
      'Restart the capacity to clear stuck workloads',
      'Open a Microsoft support ticket'
    ],
    correct: 1,
    explanation: 'Drill into the run in Monitoring hub first. Refresh details surface partition-level errors, step durations, and the actual current step — which tells you whether the refresh is genuinely stuck or just on a slow partition. Cancelling without diagnosis loses the diagnostic state.',
    whyWrong: {
      0: 'Cancelling without diagnosis throws away the evidence. You will hit the same hang next refresh and have nothing to compare.',
      2: 'Capacity restart is destructive and disrupts every other workload on the SKU. Almost never the first step.',
      3: 'Open a ticket only after gathering refresh-detail evidence; otherwise support will ask you to gather it anyway.'
    },
    source: SRC.troubleshoot,
    tags: ['monitoring', 'troubleshooting', 'refresh', 'diagnostic-order'],
    relatedIds: ['mo-013', 'mo-014']
  }),

  single({
    id: 'mo-004',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 3,
    prompt: 'A workspace owner wants notifications when a scheduled pipeline run fails. Which native Fabric mechanism delivers this without writing custom code?',
    options: [
      'Set a "Notify" action on the pipeline that posts to Teams or email on failure',
      'Open Monitoring hub manually each morning',
      'Build a Reflex (Activator) trigger over the pipeline-runs Eventstream',
      'Both A and C — pipeline notifications cover the simple case; Reflex covers richer condition logic across runs'
    ],
    correct: 3,
    explanation: 'Both work and serve different needs. Pipeline-level notify actions are the simplest path — built-in, no extra item required. Reflex (Activator) is the right answer when you need cross-run conditions ("notify only if 3 consecutive runs fail" or "notify once per day, not once per run").',
    whyWrong: {
      0: 'Correct in isolation but option D is more complete. Pipeline notifications cover the simple case; not all production needs.',
      1: 'A monitoring strategy that requires a human to look at a dashboard is not a notification strategy.',
      2: 'Correct in isolation but option D acknowledges both options. Reflex alone is overkill for trivial "notify on fail" cases.'
    },
    source: SRC.monitoring,
    tags: ['monitoring', 'reflex', 'activator', 'notifications', 'pipelines'],
    relatedIds: ['mo-005']
  }),

  multi({
    id: 'mo-005',
    domain: 'maintain',
    subtopic: 'monitoring',
    difficulty: 4,
    prompt: 'Which Reflex (Activator) source patterns are valid for monitoring an analytics workload? Select all that apply.',
    options: [
      'A KQL query result column from an Eventhouse',
      'A measure on a Direct Lake semantic model',
      'A column in a streaming Eventstream',
      'The pm2 process status of a Linux daemon outside Fabric',
      'A pipeline-run status feed from Monitoring hub'
    ],
    correct: [0, 1, 2],
    explanation: 'Reflex (Activator) accepts Eventstream streaming columns, KQL query result columns, and Power BI/Direct Lake semantic-model measures as triggers. External-process monitoring (pm2, systemd, Windows Service) and Monitoring-hub run feeds are NOT first-class Reflex sources — those need a custom Eventstream feed first.',
    whyWrong: {
      3: 'External daemons are out of Fabric scope. To monitor them, push their status into an Eventstream first, then point Reflex at that.',
      4: 'Monitoring-hub run history is not exposed as a Reflex source. Use pipeline-level "Notify" actions or push run results into a custom Eventstream.'
    },
    source: SRC.monitoring,
    tags: ['monitoring', 'reflex', 'activator', 'eventstream', 'sources'],
    relatedIds: ['mo-004']
  }),

  // ── Capacity management (5 Q) ────────────────────────────────
  single({
    id: 'mo-006',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 3,
    prompt: 'A team\'s F64 capacity is sustaining 78% CU averaged over a business day, with 90-minute spikes to 130% in the morning. Smoothing has not been adjusted from defaults. What is the MOST cost-effective response?',
    options: [
      'Upgrade to F128 immediately',
      'Do nothing — the smoothing window absorbs the morning spike',
      'Scale to F128 only during 08:00–10:00 via an autoscale schedule, drop back to F64 for the rest of the day',
      'Move the heaviest morning report to Import mode'
    ],
    correct: 2,
    explanation: 'Scheduled scale-up matches cost to demand. The morning spike pattern is exactly what scheduled autoscale was built for: pay F128 prices for 2 hours, F64 for the other 22. Default smoothing of 5 minutes does NOT absorb a 90-minute sustained spike — that is a sustained-overage condition, which throttles after the smoothing window.',
    whyWrong: {
      0: 'Upgrading to F128 24/7 costs ~2× F64 even though the spike is only 8% of the business day.',
      1: 'Smoothing is 5 minutes by default — it absorbs short bursts, NOT 90-minute sustained overages. Throttling will kick in.',
      3: 'Import-mode refresh just shifts the CU cost to overnight; if the morning report is interactive, Import does not help the spike pattern.'
    },
    source: SRC.capacity,
    tags: ['capacity', 'autoscale', 'smoothing', 'cost-optimization'],
    relatedIds: ['mo-007', 'mo-008']
  }),

  single({
    id: 'mo-007',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 4,
    prompt: 'On a sustained CU% > 100%, Fabric applies graduated penalties. In the documented order, what does the capacity do FIRST?',
    options: [
      'Reject all interactive operations immediately',
      'Throttle (delay) interactive operations after the burstable smoothing window is exhausted',
      'Pause the capacity automatically',
      'Auto-upgrade the SKU one tier'
    ],
    correct: 1,
    explanation: 'The documented escalation: bursting (allowed within smoothing window) → throttling (interactive operations are delayed) → rejection of background operations → rejection of interactive operations. Auto-pause and auto-upgrade are NOT part of the throttling ladder.',
    whyWrong: {
      0: 'Rejection is the LAST step, not the first. Bursting + throttling come first.',
      2: 'Auto-pause is configurable but NOT a throttling response. It is a manual or schedule-driven cost control.',
      3: 'There is no auto-upgrade. SKU changes are manual or scheduled.'
    },
    source: SRC.capacity,
    tags: ['capacity', 'throttling', 'bursting', 'overage-policy', 'exam-trap'],
    relatedIds: ['mo-006']
  }),

  multi({
    id: 'mo-008',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 4,
    prompt: 'Which actions reduce CU consumption on a Direct Lake workload? Select all that apply.',
    options: [
      'Enable V-Order on the underlying Delta tables',
      'Increase the number of Direct Lake column-segment cache slots indirectly by SKU upgrade',
      'Apply OPTIMIZE + VACUUM to compact small Delta files',
      'Reduce model-level partition count to a single partition per fact',
      'Add explicit measures so the model serves common aggregations from the cache'
    ],
    correct: [0, 2, 4],
    explanation: 'V-Order, OPTIMIZE/VACUUM, and explicit measures all reduce per-query CU cost: V-Order cuts decode time, OPTIMIZE reduces small-file overhead, and explicit measures hit the cache instead of recomputing from columns. SKU upgrade increases TOTAL CU available but does NOT reduce per-query cost. Single-partition fact tables are an anti-pattern — Direct Lake parallelism benefits from sensible partitioning.',
    whyWrong: {
      1: 'SKU upgrade adds CU budget; it does not reduce per-query CU cost. The question asks about consumption, not capacity.',
      3: 'Single-partition fact tables hurt Direct Lake parallelism and are a known anti-pattern. Multi-partition with reasonable sizing is the recommendation.'
    },
    source: SRC.capacity,
    tags: ['capacity', 'direct-lake', 'v-order', 'optimization', 'cu-reduction'],
    relatedIds: ['mo-006']
  }),

  single({
    id: 'mo-009',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 3,
    prompt: 'A workload runs only on weekday business hours. Which built-in cost control reduces capacity spend on weekends?',
    options: [
      'Pause the capacity manually each Friday and resume Monday',
      'Set a scheduled pause (Sat 00:00) and scheduled resume (Mon 06:00) on the capacity',
      'Drop to a lower SKU on weekends',
      'Both B and C — both reduce spend; B is simpler, C keeps the capacity online'
    ],
    correct: 3,
    explanation: 'Both options reduce weekend spend. Scheduled pause (B) cuts cost to zero but offlines all items on the capacity. Scheduled SKU drop (C) keeps the capacity online for ad-hoc usage at lower cost. Choose based on whether weekend access is required.',
    whyWrong: {
      0: 'Manual operation works but is error-prone. The question asks for a built-in mechanism.',
      1: 'Correct in isolation but option D is more complete.',
      2: 'Correct in isolation but option D is more complete.'
    },
    source: SRC.capacity,
    tags: ['capacity', 'pause', 'autoscale', 'cost-control'],
    relatedIds: ['mo-006']
  }),

  multi({
    id: 'mo-010',
    domain: 'maintain',
    subtopic: 'capacity-management',
    difficulty: 4,
    prompt: 'Which statements about Fabric capacity SKUs and their billing are TRUE? Select all that apply.',
    options: [
      'F-SKUs are Azure-billed (per-second consumption); P-SKUs are Office-365-billed monthly',
      'Pausing an F-SKU stops billing for capacity; storage is billed separately and continues',
      'F-SKUs can be scaled up or down at any time; SKU change is online',
      'Free trial capacity (FT1) supports Direct Lake on OneLake but not on SQL'
    ],
    correct: [0, 1, 2],
    explanation: 'F-SKUs are Azure-billed and pause-able; P-SKUs are Office-365 commitment-priced. Storage (OneLake) is billed independently of capacity and continues during a pause. SKU resize is online. The FT1 trial supports both Direct Lake variants, not just one.',
    whyWrong: {
      3: 'FT1 trial supports both Direct Lake on OneLake and Direct Lake on SQL. The mode-specific limitations are about composite-model support, not trial restrictions.'
    },
    source: SRC.capacity,
    tags: ['capacity', 'sku', 'billing', 'pause', 'storage'],
    relatedIds: ['mo-009']
  }),

  // ── Refresh management (4 Q) ─────────────────────────────────
  single({
    id: 'mo-011',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 2,
    prompt: 'A Direct Lake semantic model is configured with no scheduled refresh. The Lakehouse fact table receives a Delta commit. When does the model see the new rows?',
    options: [
      'On the next scheduled refresh — but there is no schedule, so never',
      'Immediately on next query — Direct Lake reframes automatically when the underlying Delta commit is detected',
      'After a manual "Refresh now" from the model menu',
      'Only after a Run-now of the upstream pipeline'
    ],
    correct: 1,
    explanation: 'Direct Lake automatic framing detects new Delta commits and reframes on the next query. No explicit refresh required. This is a key contrast with Import mode (which requires refresh) and is one of the headline benefits of Direct Lake.',
    whyWrong: {
      0: 'Direct Lake does not depend on a scheduled refresh — it has no refresh in the Import sense.',
      2: 'Manual reframe is allowed (and useful for specific scenarios) but not required for visibility of new commits.',
      3: 'Pipelines are unrelated; Direct Lake reads Delta directly.'
    },
    source: SRC.refresh,
    tags: ['refresh', 'direct-lake', 'framing', 'auto-reframe'],
    relatedIds: ['mo-012']
  }),

  multi({
    id: 'mo-012',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 4,
    prompt: 'Which scenarios benefit from incremental refresh on an Import-mode semantic model? Select all that apply.',
    options: [
      'A 200-GB FactSales table with 10 years of history; only the last 30 days changes daily',
      'A small 50-row dimension table that changes once per quarter',
      'A large fact table where ALL historical rows are restated nightly',
      'An Import model on F64 where refresh consistently exceeds the 5-hour limit'
    ],
    correct: [0, 3],
    explanation: 'Incremental refresh shines when only a small partition window changes (option 1) and when refresh duration is hitting practical limits (option 4). For tables where all rows restate, incremental gives no benefit (option 3 still has to refresh everything). For tiny dimensions, the partition overhead exceeds the savings (option 2).',
    whyWrong: {
      1: 'Tiny tables do not benefit — partition setup overhead exceeds the savings. Just refresh the table.',
      2: 'When all history restates each refresh, incremental partitions still all refresh, so no benefit.'
    },
    source: SRC.refresh,
    tags: ['refresh', 'incremental', 'import-mode', 'partitions'],
    relatedIds: ['mo-011']
  }),

  single({
    id: 'mo-013',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 4,
    prompt: 'A semantic model refresh fails with the error "Memory error: Allocation failure". The model is 12 GB; the F-SKU is F64 (which has a 25-GB model memory limit). What is the MOST likely root cause?',
    options: [
      'Model size exceeds the SKU memory limit',
      'Refresh is held by another long-running query and runs out of working memory (memory required > 25 GB during refresh because both old and new copies live in memory)',
      'The on-prem data gateway is misconfigured',
      'The capacity is paused'
    ],
    correct: 1,
    explanation: 'Refresh memory ≈ 2× model size because both the old and new model copies live in memory simultaneously during a refresh swap. A 12-GB model peaks at ~24 GB during refresh — close to the F64 25-GB ceiling. Concurrent queries push it over. Solution: schedule refresh outside peak query hours, or upgrade SKU.',
    whyWrong: {
      0: 'Steady-state model size is 12 GB, well under the 25 GB ceiling. Steady-state OOM is not the cause; refresh-time memory is.',
      2: 'Gateway issues surface as connection-string or auth errors, not memory allocation failures.',
      3: 'Paused capacity does not run refreshes at all — you would not see allocation errors, you would see "capacity paused".'
    },
    source: SRC.troubleshoot,
    tags: ['refresh', 'memory', 'capacity-limits', 'troubleshooting', 'exam-trap'],
    relatedIds: ['mo-014']
  }),

  multi({
    id: 'mo-014',
    domain: 'maintain',
    subtopic: 'refresh-management',
    difficulty: 4,
    prompt: 'A scheduled refresh fails intermittently (~10% of runs). Which diagnostic actions are valuable? Select all that apply.',
    options: [
      'Open refresh details in Monitoring hub for failed runs and compare error messages across instances',
      'Enable detailed refresh logging via the XMLA endpoint and capture trace events',
      'Cancel any in-progress refresh on the next failure to "reset state"',
      'Check whether the source system has documented maintenance windows that overlap with the failures',
      'Review Capacity Metrics for CU spikes coinciding with the failures'
    ],
    correct: [0, 1, 3, 4],
    explanation: 'Pattern-matching across failed runs (1) often reveals a common error class. Detailed XMLA traces (2) expose the exact step that fails. Source system maintenance (4) is a frequent cause of intermittent failure. Capacity throttling (5) at the moment of refresh is another. Cancelling in-progress refreshes (3) destroys diagnostic state.',
    whyWrong: {
      2: 'Cancelling throws away the diagnostic evidence. Wait for the failure, capture details, then re-trigger.'
    },
    source: SRC.troubleshoot,
    tags: ['refresh', 'troubleshooting', 'diagnostic', 'monitoring', 'xmla'],
    relatedIds: ['mo-003', 'mo-013']
  }),

  // ── Lifecycle management (3 Q) ───────────────────────────────
  order({
    id: 'mo-015',
    domain: 'maintain',
    subtopic: 'lifecycle-management',
    difficulty: 3,
    prompt: 'Order the steps for safely retiring a workspace that contains a semantic model still consumed by external Power BI reports.',
    options: [
      'Inventory all consumers (apps, embedded reports, scheduled exports) of the semantic model',
      'Migrate consumers to a replacement model in a different workspace, validating each',
      'Mark the original semantic model with a "retiring" sensitivity label and notify users',
      'Wait the announced grace period (≥30 days) for stragglers',
      'Delete the workspace'
    ],
    explanation: 'Inventory consumers first — without that, "delete and see who screams" is a real tactic that real teams regret. Migrate, then notify, then grace period, then delete. Cutting any of these steps is how outages start.',
    source: SRC.governance,
    tags: ['lifecycle', 'retirement', 'consumer-impact', 'communication'],
    relatedIds: ['mo-016']
  }),

  single({
    id: 'mo-016',
    domain: 'maintain',
    subtopic: 'lifecycle-management',
    difficulty: 3,
    prompt: 'A workspace is deleted. How long is the content recoverable, and by whom?',
    options: [
      'Immediately and permanently gone — no recovery path',
      'Up to 7 days; the workspace can be restored by a Fabric admin from the admin portal',
      'Up to 30 days, restorable only by the original workspace owner',
      'Indefinitely — Fabric soft-deletes everything and admins can restore at any time'
    ],
    correct: 1,
    explanation: 'Deleted workspaces are soft-deleted for **7 days**, restorable by a Fabric tenant admin via the admin portal. Past 7 days, content is permanently gone. The original owner cannot restore — that is intentional, since the owner may be the reason the workspace was deleted in the first place.',
    whyWrong: {
      0: 'There IS a recovery path within 7 days.',
      2: 'The window is 7 days, not 30; and the original owner is not granted restore privileges.',
      3: 'Soft-delete is bounded at 7 days, not indefinite.'
    },
    source: SRC.governance,
    tags: ['lifecycle', 'soft-delete', 'recovery', 'admin'],
    relatedIds: ['mo-015']
  }),

  multi({
    id: 'mo-017',
    domain: 'maintain',
    subtopic: 'lifecycle-management',
    difficulty: 4,
    prompt: 'A semantic model is being replaced by a redesigned version. Which approaches preserve user reports and bookmarks across the migration? Select all that apply.',
    options: [
      'Publish the new model with a new name and ask users to manually rebind reports',
      'Use Power BI report rebind via the XMLA endpoint to point existing reports at the new model',
      'Republish the new model with the SAME name and SAME table/measure surface — most reports continue to work',
      'Use deployment pipelines to promote the new model into the same workspace, replacing the old one',
      'Delete the old model immediately to force users onto the new one'
    ],
    correct: [1, 2, 3],
    explanation: 'The three real preservation strategies: XMLA rebind (1), surface-compatible republish (2), and pipeline-driven replace (3). Option 0 ("ask users to rebind manually") is migration by hope and rarely works at scale. Option 4 (delete to force migration) is destructive and breaks reports the moment users open them — never recommended.',
    whyWrong: {
      0: 'Manual rebind at scale fails. Some users miss the email, some bookmarks break silently, and nobody owns the cleanup. This is "migration by hope".',
      4: 'Deleting before migration is the wrong order — see mo-015 for the correct sequence.'
    },
    source: SRC.governance,
    tags: ['lifecycle', 'migration', 'rebind', 'xmla', 'consumer-preservation'],
    relatedIds: ['mo-015']
  }),

  // ── Troubleshooting (3 Q) ────────────────────────────────────
  single({
    id: 'mo-018',
    domain: 'maintain',
    subtopic: 'troubleshooting',
    difficulty: 4,
    prompt: 'Users report "this report is slow" intermittently. The Direct Lake model is on F64. CU is 60%. p95 visual latency is 2.1s, p99 is 12s. What is the BEST first investigation step?',
    options: [
      'Upgrade to F128',
      'Examine the p99 visuals specifically — find which queries are slow, not assume all are slow',
      'Cancel all running queries and re-test',
      'Switch the model to Import mode to "rule out" Direct Lake'
    ],
    correct: 1,
    explanation: 'Performance investigation always starts with measurement, not action. p95 of 2.1s vs p99 of 12s means a long tail — find which visuals make up the tail. Performance Analyzer in Power BI Desktop or DAX query traces in Fabric are the right tools. Acting before measuring (upgrade, cancel, switch mode) is expensive and usually wrong.',
    whyWrong: {
      0: 'Doubling capacity to fix a problem you have not localized is expensive and may not even help if the bottleneck is a single bad measure.',
      2: 'Cancelling running queries does not produce evidence about WHICH visuals are slow.',
      3: 'Mode-switching is a major change with side effects (refresh, framing, security re-eval). Never the first step.'
    },
    source: SRC.troubleshoot,
    tags: ['troubleshooting', 'performance', 'p99', 'measurement-first', 'exam-trap'],
    relatedIds: ['mo-003', 'mo-008']
  })
];
