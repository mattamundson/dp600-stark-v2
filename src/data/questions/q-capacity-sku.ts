import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

const SRC: SourceAnchor = {
  category: 'fabric-capacity-sku',
  note: 'F-SKUs, throttling, smoothing, bursting, Capacity Metrics App, scaling'
};

export const capacitySku: Question[] = [
  // ── SKU sizing & PBI Premium equivalents ───────────────────────
  single({
    id: 'cap-001', domain: 'maintain', subtopic: 'capacity-management', difficulty: 3,
    prompt: 'Which Fabric F-SKU is the compute equivalent of a Power BI Premium P1?',
    options: ['F8', 'F32', 'F64', 'F128'],
    correct: 2,
    explanation: 'F64 matches P1 in CU (Capacity Units) and is also the smallest SKU that grants free-license users the right to consume Power BI content the capacity hosts (the "P1 equivalence" threshold).',
    whyWrong: {
      0: 'F8 is far smaller than P1 — roughly 1/8 the compute.',
      1: 'F32 is half of P1; consumption by free users is NOT enabled below F64.',
      3: 'F128 maps to P2, not P1.'
    },
    source: SRC,
    tags: ['capacity', 'sku-sizing', 'p1-equivalent']
  }),
  single({
    id: 'cap-002', domain: 'maintain', subtopic: 'capacity-management', difficulty: 3,
    prompt: 'A tenant is on F32. Free-license users open a Power BI report hosted in a workspace assigned to that capacity. What happens?',
    options: [
      'They view the report normally — F32 is sufficient',
      'They are blocked — free users need at least F64 (P1 equivalent) to consume Power BI content',
      'They view the report but cannot interact with slicers',
      'They get a Pro trial prompt'
    ],
    correct: 1,
    explanation: 'F64 is the threshold where free-license users can consume Power BI content in the capacity. Below F64 (F2..F32) every consumer must hold a Pro or PPU license.',
    whyWrong: {
      0: 'F32 does NOT grant free-user consumption rights for Power BI content.',
      2: 'There is no slicer-only restriction — access is all-or-nothing per license.',
      3: 'No automatic trial prompt is the documented behavior; access is denied.'
    },
    source: SRC,
    tags: ['capacity', 'licensing', 'f64-threshold']
  }),
  single({
    id: 'cap-003', domain: 'maintain', subtopic: 'capacity-management', difficulty: 2,
    prompt: 'Fabric F-SKUs scale from which smallest to which largest size?',
    options: ['F1 to F1024', 'F2 to F2048', 'F4 to F512', 'F8 to F4096'],
    correct: 1,
    explanation: 'The Fabric F-SKU family runs F2, F4, F8, F16, F32, F64, F128, F256, F512, F1024, F2048 — doubling at each step.',
    whyWrong: {
      0: 'F1 is not a Fabric SKU; the family starts at F2.',
      2: 'F4 is not the smallest, and F512 is not the largest.',
      3: 'F8 is not the smallest, and F4096 does not exist.'
    },
    source: SRC,
    tags: ['capacity', 'sku-range']
  }),

  // ── Trial vs paid + grace ──────────────────────────────────────
  single({
    id: 'cap-004', domain: 'maintain', subtopic: 'capacity-management', difficulty: 2,
    prompt: 'A Fabric trial capacity is approaching the end of its 60-day window. What happens to workspaces assigned to it when the trial expires WITHOUT conversion to a paid SKU?',
    options: [
      'Workspaces are deleted immediately',
      'Workspaces enter a grace period and revert to Pro / shared-capacity behavior; Fabric items become inaccessible until reassigned',
      'Workspaces are silently moved to F64',
      'Trial auto-renews indefinitely'
    ],
    correct: 1,
    explanation: 'After trial expiration, workspaces enter a grace period during which they cannot consume Fabric workloads but data is preserved. Admins must reassign to a paid F-SKU or content (especially Fabric-only items like Lakehouse, Notebook, KQL) becomes inaccessible.',
    whyWrong: {
      0: 'Workspaces are NOT deleted — data is preserved during the grace period.',
      2: 'There is no silent paid auto-provisioning.',
      3: 'Trials do not auto-renew; conversion is an explicit action.'
    },
    source: SRC,
    tags: ['capacity', 'trial', 'grace-period']
  }),

  // ── Capacity assignment ────────────────────────────────────────
  single({
    id: 'cap-005', domain: 'maintain', subtopic: 'capacity-management', difficulty: 3,
    prompt: 'A workspace currently runs on capacity FabricProd-East. A team wants to assign it ALSO to FabricProd-West for HA. What is the actual constraint?',
    options: [
      'Allowed — multi-capacity assignment is supported via the admin portal',
      'A workspace can only be assigned to ONE capacity at a time; reassignment moves it, not duplicates it',
      'Allowed only if both capacities are in the same region',
      'Allowed only on F128 and above'
    ],
    correct: 1,
    explanation: 'A workspace lives on exactly one capacity at any given moment. Reassigning moves it; there is no native multi-capacity HA. HA strategies use deployment pipelines or replicated content across separately-assigned workspaces.',
    whyWrong: {
      0: 'Multi-capacity assignment for one workspace is not supported.',
      2: 'Region is irrelevant — the constraint is one-capacity-per-workspace.',
      3: 'SKU size does not unlock multi-assignment.'
    },
    source: SRC,
    tags: ['capacity', 'workspace-assignment', 'one-to-one']
  }),
  single({
    id: 'cap-006', domain: 'maintain', subtopic: 'capacity-management', difficulty: 3,
    prompt: 'Who can reassign a workspace from one Fabric capacity to another?',
    options: [
      'Any workspace Member',
      'Workspace Admin only, regardless of capacity rights',
      'A user who is BOTH a workspace Admin AND has Capacity Admin (or contributor) rights on the TARGET capacity',
      'Only Fabric tenant admins'
    ],
    correct: 2,
    explanation: 'Reassignment requires you to (a) have admin rights on the workspace being moved, AND (b) have permission to assign workspaces to the target capacity (Capacity Admin or capacity contributor role). Source capacity rights are not required.',
    whyWrong: {
      0: 'Member cannot manage capacity assignment.',
      1: 'Workspace Admin alone cannot assign INTO a capacity they have no rights on.',
      3: 'Tenant admin works but is not the minimum — capacity-level rights are sufficient.'
    },
    source: SRC,
    tags: ['capacity', 'admin-roles', 'reassignment']
  }),
  single({
    id: 'cap-007', domain: 'maintain', subtopic: 'capacity-management', difficulty: 2,
    prompt: 'Which role manages capacity-level settings such as XMLA mode, workload limits, and capacity admins?',
    options: ['Workspace Admin', 'Capacity Admin', 'Power BI Service Administrator', 'Tenant Admin'],
    correct: 1,
    explanation: 'Capacity Admin is the role scoped to a single capacity that controls its settings (XMLA, workload caps, admins, autoscale, etc.). Tenant Admin can assign Capacity Admins but does not have to be one.',
    whyWrong: {
      0: 'Workspace Admin is scoped to a workspace, not its underlying capacity.',
      2: 'Power BI Service Admin is a tenant-level legacy role — broader than per-capacity ops.',
      3: 'Tenant Admin can do this implicitly but the canonical role is Capacity Admin.'
    },
    source: SRC,
    tags: ['capacity', 'capacity-admin']
  }),

  // ── Pause / resume ─────────────────────────────────────────────
  single({
    id: 'cap-008', domain: 'maintain', subtopic: 'capacity-management', difficulty: 3,
    prompt: 'A team pauses an F64 capacity over a long weekend to save cost. Which statement is TRUE?',
    options: [
      'All assigned workspaces are deleted on pause',
      'Capacity state and workspace assignments are preserved; no compute charges accrue while paused; workloads are unavailable until resumed',
      'Pause moves the capacity to a free tier automatically',
      'Pause keeps interactive queries running but blocks background jobs'
    ],
    correct: 1,
    explanation: 'Pause halts billing for capacity compute (storage and OneLake fees still apply) and keeps all configuration / workspace assignments intact. On resume, everything is back as it was. Workloads cannot run while paused.',
    whyWrong: {
      0: 'Workspaces are NOT deleted; they are held.',
      2: 'There is no auto-downgrade to a free tier.',
      3: 'Pause halts ALL compute, both interactive and background.'
    },
    source: SRC,
    tags: ['capacity', 'pause', 'billing']
  }),
  multi({
    id: 'cap-009', domain: 'maintain', subtopic: 'capacity-management', difficulty: 4,
    prompt: 'Which charges CONTINUE to accrue when a Fabric capacity is paused? Select all that apply.',
    options: [
      'OneLake storage fees for data stored in the tenant',
      'Compute / CU consumption',
      'Mirroring storage charges',
      'Background refresh CU usage'
    ],
    correct: [0, 2],
    explanation: 'Storage fees (OneLake, mirroring) are decoupled from compute pause. The capacity is what stops billing for CU consumption; the data sitting in OneLake still incurs storage charges.',
    whyWrong: {
      1: 'Compute / CU charges STOP — that is the entire point of pause.',
      3: 'Background refresh cannot run on a paused capacity, so no CU is consumed.'
    },
    source: SRC,
    tags: ['capacity', 'pause', 'cost']
  }),

  // ── Throttling: smoothing, windows, tiers ──────────────────────
  single({
    id: 'cap-010', domain: 'maintain', subtopic: 'capacity-management', difficulty: 4,
    prompt: 'Fabric uses CU "smoothing" to amortize spikes. How are interactive vs background CU operations smoothed?',
    options: [
      'Interactive smoothed over 5 minutes, background smoothed over 24 hours',
      'Both smoothed identically over 1 hour',
      'Interactive smoothed over 24 hours, background not smoothed',
      'No smoothing — instantaneous CU is what counts toward limits'
    ],
    correct: 0,
    explanation: 'Interactive operations (report queries, ad-hoc) are smoothed over a short ~5-minute window. Background operations (refreshes, pipeline runs, Spark jobs) are smoothed over 24 hours, which is what enables sustained bursting on background workloads.',
    whyWrong: {
      1: 'They are smoothed differently — that is the whole reason both categories exist.',
      2: 'Interactive uses the SHORT window; background uses the long one.',
      3: 'Smoothing is precisely what protects users from instantaneous CU spikes.'
    },
    source: SRC,
    tags: ['capacity', 'throttling', 'smoothing']
  }),
  order({
    id: 'cap-011', domain: 'maintain', subtopic: 'capacity-management', difficulty: 4,
    prompt: 'Place the following Fabric throttling tiers in order of severity (least → most severe).',
    options: [
      'Overage protection (future CU borrowed; no user impact)',
      'Interactive delay (user-facing requests slowed)',
      'Interactive rejection (new interactive requests rejected)',
      'Background rejection (new background jobs rejected)'
    ],
    explanation: 'Throttling escalates: first you borrow against future windows (overage), then interactive requests are slowed, then interactive requests are outright rejected, finally background jobs are rejected. Background rejection is the deepest tier and is the signal you need to upscale or pause expensive workloads.',
    source: SRC,
    tags: ['capacity', 'throttling', 'tiers']
  }),
  multi({
    id: 'cap-012', domain: 'maintain', subtopic: 'capacity-management', difficulty: 4,
    prompt: 'Which statements about Fabric bursting are TRUE? Select all that apply.',
    options: [
      'Bursting lets a workload temporarily consume more CU than the SKU baseline allows',
      'CU consumed via bursting is added to the smoothing window and counted toward future usage',
      'Bursting permanently raises the SKU baseline',
      'Bursting is disabled by default and must be turned on per workspace'
    ],
    correct: [0, 1],
    explanation: 'Bursting is the mechanism that lets short spikes complete by borrowing future CU. The borrowed CU still counts — it just gets amortized into the smoothing window. Repeated bursting accumulates into throttling.',
    whyWrong: {
      2: 'Bursting is borrowing, not a SKU upgrade. The baseline is unchanged.',
      3: 'Bursting is built-in; there is no per-workspace toggle.'
    },
    source: SRC,
    tags: ['capacity', 'bursting']
  }),
  single({
    id: 'cap-013', domain: 'maintain', subtopic: 'capacity-management', difficulty: 4,
    prompt: 'A capacity has been at 110% smoothed CU consumption for 30 minutes. Background jobs are still running. Which throttling tier is active?',
    options: [
      'Overage protection — no user-visible impact yet',
      'Interactive rejection — reports are being denied',
      'Background rejection — refreshes are queued or denied',
      'No throttling because background does not throttle'
    ],
    correct: 0,
    explanation: 'At ~10–60 minutes of overage, the system runs in overage protection — borrowing CU from future windows; no user-facing throttling yet. Sustained overage past the smoothing window escalates to interactive delay → rejection → background rejection.',
    whyWrong: {
      1: 'Interactive rejection requires deeper sustained overage than 30 minutes at 110%.',
      2: 'Background rejection is the deepest tier; not triggered at 30 min / 110%.',
      3: 'Background absolutely can be throttled — it is the deepest tier.'
    },
    source: SRC,
    tags: ['capacity', 'throttling', 'overage']
  }),

  // ── Capacity Metrics App ───────────────────────────────────────
  single({
    id: 'cap-014', domain: 'maintain', subtopic: 'monitoring', difficulty: 2,
    prompt: 'Which app is the canonical Microsoft-provided tool for visualizing CU consumption, throttling events, and item-level usage on a Fabric capacity?',
    options: [
      'Microsoft Fabric Capacity Metrics app',
      'Power BI Usage Metrics report',
      'Azure Monitor for Fabric',
      'OneLake Capacity Dashboard'
    ],
    correct: 0,
    explanation: 'The Fabric Capacity Metrics app (installed via AppSource by Capacity Admins) is the single canonical surface for capacity diagnostics: CU over time, smoothing/overage timelines, top items by CU, throttling events.',
    whyWrong: {
      1: 'Power BI Usage Metrics measures report views, not capacity CU.',
      2: 'There is no "Azure Monitor for Fabric" capacity-metrics surface.',
      3: 'OneLake Capacity Dashboard is not a real product name.'
    },
    source: SRC,
    tags: ['capacity', 'metrics-app', 'monitoring']
  }),
  multi({
    id: 'cap-015', domain: 'maintain', subtopic: 'monitoring', difficulty: 4,
    prompt: 'In the Capacity Metrics App, which signals would you check FIRST when investigating a "reports are slow" complaint? Select all that apply.',
    options: [
      'CU % utilization over the past 4 hours',
      'Top items by interactive CU consumption',
      'Throttling / overage events in the timeline',
      'Tenant-wide license assignment counts'
    ],
    correct: [0, 1, 2],
    explanation: 'Utilization, top items, and throttling timeline together pinpoint whether the slowness is capacity-pressure (throttling), a single noisy item (top items), or simply elevated baseline (utilization trend). License counts are unrelated to runtime perf.',
    whyWrong: {
      3: 'License assignments do not affect runtime performance of an already-loaded report.'
    },
    source: SRC,
    tags: ['capacity', 'metrics-app', 'troubleshooting']
  }),
  single({
    id: 'cap-016', domain: 'maintain', subtopic: 'metrics', difficulty: 3,
    prompt: 'Which Capacity Metrics App page surfaces the SMOOTHED CU usage curve and the overage / future-borrowed CU?',
    options: ['Item Detail', 'Compute (timepoint detail / utilization)', 'Storage', 'Tenant Settings'],
    correct: 1,
    explanation: 'The Compute / utilization page (timepoint detail) plots smoothed CU% over the rolling window and shades the borrowed / future-debt portion. Item Detail drills into one specific item; Storage covers OneLake bytes.',
    whyWrong: {
      0: 'Item Detail is per-item drill, not the system-wide smoothed curve.',
      2: 'Storage shows bytes, not CU.',
      3: 'Tenant Settings is admin config, not a metric view.'
    },
    source: SRC,
    tags: ['capacity', 'metrics-app']
  }),

  // ── Reflex / Activator alerts ─────────────────────────────────
  single({
    id: 'cap-017', domain: 'maintain', subtopic: 'alerts', difficulty: 3,
    prompt: 'You want to receive a Teams message any time capacity CU% exceeds 85% for more than 10 minutes. Which Fabric item type is built for this?',
    options: ['Reflex (Data Activator)', 'Dataflow Gen2', 'KQL Database alert', 'Power Automate flow scheduled every minute'],
    correct: 0,
    explanation: 'Reflex (Data Activator) is the Fabric item designed for trigger-on-condition alerts against streaming or report data, including Capacity Metrics App outputs. It can route to Teams, email, or Power Automate.',
    whyWrong: {
      1: 'Dataflow Gen2 is ingestion/transformation, not alerting.',
      2: 'KQL alerts exist but are scoped to KQL DB queries, not the canonical Fabric alerting item.',
      3: 'A Power Automate flow polling every minute is brittle and consumes CU itself; Reflex is the intended path.'
    },
    source: SRC,
    tags: ['capacity', 'alerts', 'reflex', 'activator']
  }),
  single({
    id: 'cap-018', domain: 'maintain', subtopic: 'alerts', difficulty: 3,
    prompt: 'A Reflex trigger on the Capacity Metrics App is firing but no Teams message arrives. Which is the FIRST thing to verify?',
    options: [
      'The capacity is paused',
      'The Reflex trigger has a defined ACTION (Teams/email/Power Automate) and the channel is reachable',
      'Sensitivity labels are blocking',
      'The Capacity Metrics App is on the wrong capacity'
    ],
    correct: 1,
    explanation: 'A common Reflex misconfiguration is defining the condition (trigger fires) but no action, OR an action whose target (Teams channel webhook, email recipient) is unreachable. Verify both halves before deeper debugging.',
    whyWrong: {
      0: 'A paused capacity would prevent the trigger evaluation entirely; the question states triggers ARE firing.',
      2: 'Sensitivity labels do not block Reflex action delivery.',
      3: 'Wrong-capacity binding would prevent the trigger from firing at all.'
    },
    source: SRC,
    tags: ['capacity', 'alerts', 'reflex', 'troubleshooting']
  }),

  // ── Refresh management ────────────────────────────────────────
  single({
    id: 'cap-019', domain: 'maintain', subtopic: 'refresh-management', difficulty: 3,
    prompt: 'A semantic model refresh is failing intermittently with "capacity throttled". Which scheduling change would MOST reduce the failures without scaling SKU?',
    options: [
      'Move the refresh from peak business hours to an off-hour window',
      'Increase refresh frequency to spread load',
      'Convert the model from Import to DirectQuery',
      'Disable the refresh history'
    ],
    correct: 0,
    explanation: 'Refreshes consume background CU and compete with interactive load. Moving to off-hours (when interactive demand is low) lets the smoothing window absorb the refresh without throttling — a no-cost mitigation before you upscale.',
    whyWrong: {
      1: 'Higher frequency consumes MORE CU, not less.',
      2: 'DirectQuery shifts cost to per-query and often increases overall pressure.',
      3: 'Disabling refresh history hides the problem; it does not solve it.'
    },
    source: SRC,
    tags: ['capacity', 'refresh', 'scheduling']
  }),
  single({
    id: 'cap-020', domain: 'maintain', subtopic: 'refresh-management', difficulty: 3,
    prompt: 'Where do you view the per-attempt refresh history and error details for a Fabric semantic model?',
    options: [
      'Workspace settings → Refresh history',
      'Semantic model settings → Refresh history (per-item)',
      'Tenant admin portal → Refresh log',
      'Capacity Metrics App → Item Detail page only'
    ],
    correct: 1,
    explanation: 'Refresh history is exposed on the per-item settings page for a semantic model — each scheduled or on-demand attempt with start/end time, duration, and full error message. The Capacity Metrics App shows the CU side, not the per-attempt error detail.',
    whyWrong: {
      0: 'Workspace settings do not aggregate per-item refresh history.',
      2: 'There is no tenant-wide "Refresh log" surface for end-users.',
      3: 'Capacity Metrics App is for CU, not refresh error text.'
    },
    source: SRC,
    tags: ['capacity', 'refresh', 'history']
  }),

  // ── Scaling: up vs out, autoscale ─────────────────────────────
  single({
    id: 'cap-021', domain: 'maintain', subtopic: 'capacity-management', difficulty: 3,
    prompt: 'A Fabric capacity is sustaining 95% CU. The team wants more compute headroom. Which scaling option is supported?',
    options: [
      'Scale OUT — add a second capacity in parallel as a single logical pool',
      'Scale UP — change the SKU (e.g., F64 → F128); workspaces remain assigned through the change',
      'Add a Read Replica capacity',
      'Enable horizontal sharding across capacities'
    ],
    correct: 1,
    explanation: 'Fabric capacities scale UP only — you change the SKU. There is no native scale-out / horizontal pooling. Splitting workloads across multiple separately-assigned capacities is a workspace-redistribution exercise, not "scale out".',
    whyWrong: {
      0: 'There is no logical pooling across multiple capacities.',
      2: 'Read Replica is not a capacity-level concept in Fabric.',
      3: 'No horizontal sharding feature exists at the capacity layer.'
    },
    source: SRC,
    tags: ['capacity', 'scaling', 'scale-up']
  }),
  multi({
    id: 'cap-022', domain: 'maintain', subtopic: 'capacity-management', difficulty: 4,
    prompt: 'Which patterns are valid Fabric capacity cost-optimization techniques? Select all that apply.',
    options: [
      'Schedule a runtime job to scale capacity SKU down off-hours via the Azure REST API or CLI',
      'Pause non-prod capacities outside business hours',
      'Right-size SKU to observed peak smoothed CU rather than instantaneous spikes',
      'Disable smoothing to reduce CU consumption',
      'Move heavy background workloads to off-peak windows so smoothing absorbs them'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Programmatic scale-down, off-hour pause, right-sizing to smoothed peak, and off-peak shifting are all standard cost-optimization plays. Smoothing cannot be disabled — it is the protection mechanism, not a knob.',
    whyWrong: {
      3: 'Smoothing is not a user-controllable feature; you cannot disable it. It also REDUCES the chance of throttling, not increases cost.'
    },
    source: SRC,
    tags: ['capacity', 'cost-optimization', 'scaling']
  }),

  // ── Troubleshooting scenarios ─────────────────────────────────
  single({
    id: 'cap-023', domain: 'maintain', subtopic: 'troubleshooting', difficulty: 5,
    prompt: 'A user reports "the Sales Executive Dashboard takes 45 seconds to load this morning, normally <5 seconds". Capacity Metrics App shows CU% at 60%, no throttling events, no overage. What is the MOST likely diagnostic next step?',
    options: [
      'Immediately scale the capacity from F64 to F128',
      'Drill into Item Detail for the Sales Exec semantic model and check query duration / DirectQuery fallback / model size growth',
      'Reassign the workspace to a different capacity',
      'Pause and resume the capacity to clear caches'
    ],
    correct: 1,
    explanation: 'Capacity-level metrics are healthy (60% CU, no throttle), so the bottleneck is item-level: a slow DAX query, Direct Lake → DirectQuery fallback, growing model, or upstream source slowdown. Item Detail is the right drill before any capacity action.',
    whyWrong: {
      0: 'Scaling without diagnosis wastes money and does not address an item-level cause.',
      2: 'Reassigning to a different capacity does nothing if the model itself is slow.',
      3: 'Pause/resume causes outage and does not "clear caches" reliably.'
    },
    source: SRC,
    tags: ['capacity', 'troubleshooting', 'diagnose']
  }),
  single({
    id: 'cap-024', domain: 'maintain', subtopic: 'troubleshooting', difficulty: 5,
    prompt: 'Capacity is pinned at 100% smoothed CU during business hours. Item Detail shows ONE notebook job consumes 40% of background CU on a 6-hour cadence. Which mitigation is BEST short-term?',
    options: [
      'Scale capacity from F64 to F256 immediately',
      'Move the notebook to an off-peak schedule and rerun Item Detail to confirm CU% drops',
      'Convert the notebook output to a Direct Lake table',
      'Delete the notebook'
    ],
    correct: 1,
    explanation: 'A scheduled notebook is a background workload — the smoothing window is 24 hours. Shifting its run to off-peak lets the same total CU be absorbed without contention with interactive load. Verify by re-checking the Compute timepoint detail.',
    whyWrong: {
      0: 'Scaling 4× is a heavy / expensive answer to a scheduling problem.',
      2: 'Direct Lake is a storage-mode choice; it does not resolve a notebook compute spike.',
      3: 'Deleting business-critical work is destructive and usually not the right call.'
    },
    source: SRC,
    tags: ['capacity', 'troubleshooting', 'background-shift']
  }),
  multi({
    id: 'cap-025', domain: 'maintain', subtopic: 'troubleshooting', difficulty: 5,
    prompt: 'A capacity entered "Background rejection" throttling overnight. Refreshes failed. Which post-incident actions are appropriate? Select all that apply.',
    options: [
      'Use Capacity Metrics App to identify the top background CU consumers in the 24h smoothing window leading up to the event',
      'Stagger the heaviest refreshes / pipelines so they do not overlap',
      'Set up a Reflex trigger to alert when smoothed CU > 85% for >15 minutes (early-warning)',
      'Right-size the SKU only if mitigation 1+2+3 still leaves you above the throttle threshold',
      'Permanently disable all background jobs to prevent recurrence'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Forensics (top consumers) → schedule fix (stagger) → early-warning (Reflex) → SKU change (only if needed) is the canonical incident-response order. Disabling all background jobs is a non-starter — refreshes are the work.',
    whyWrong: {
      4: 'Disabling all background jobs makes the system useless. Mitigations 1-4 are the supported path.'
    },
    source: SRC,
    tags: ['capacity', 'troubleshooting', 'incident-response']
  })
];
