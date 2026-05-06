import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

// 25 Reflex (Activator) + Real-Time Intelligence Alerts questions
// (rfx-001..rfx-025) for the prepare domain. Closes the prepare-domain
// coverage gap on event-driven actions: Reflex object/property/rule model,
// Reflex sources (Eventstream / PBI visuals / PBI semantic measures),
// action types (email, Teams, Power Automate, Fabric pipeline, webhook),
// Power BI Data Alerts vs Reflex, RTI dashboards refresh model, throttling
// /debounce, service principal for Fabric API actions, and the
// "pick-the-right-alerting-pattern" scenario family.
//
// Sibling file: q-eventhouse-rti.ts (eh-001..eh-025) covers Eventhouse,
// KQL DB, Eventstream sources/destinations/transformations, update policy,
// materialized views, retention, RLS, and the routing scenario family.
// Coordination rule: this file leaves Eventstream sources/destinations and
// generic routing patterns to that sibling and focuses on the ALERTING /
// ACTIVATION layer. Where Eventstream appears here it is in the context of
// FEEDING Reflex, not enumerating its capabilities.
//
// Subtopic vocabulary (must match the project's allowed list for this file):
//   reflex, rti-alerts, rti-routing, eventstream,
//   power-bi-alerts, rti-dashboards

const SRC: Record<string, SourceAnchor> = {
  reflex:        { category: 'reflex-rti-alerts', note: 'Reflex (Activator): objects + properties + rules + actions' },
  reflexSources: { category: 'reflex-rti-alerts', note: 'Reflex sources: Eventstream, Power BI visuals, semantic-model measures' },
  reflexActions: { category: 'reflex-rti-alerts', note: 'Reflex actions: email, Teams, Power Automate, Fabric pipeline, custom webhook' },
  reflexRules:   { category: 'reflex-rti-alerts', note: 'Reflex rules: thresholds, change detection, deviation, time windows' },
  pbiAlerts:     { category: 'reflex-rti-alerts', note: 'Power BI Data Alerts: single-card visuals, refresh-coupled, per-user' },
  rtiDash:       { category: 'reflex-rti-alerts', note: 'Real-Time dashboards: continuous auto-refresh, KQL-native tiles' },
  routing:       { category: 'reflex-rti-alerts', note: 'RTI routing TO Reflex: Eventstream destination, semantic-model bind' },
  governance:    { category: 'reflex-rti-alerts', note: 'Reflex governance: service principal, throttling/debounce, ownership' }
};

export const reflexRtiAlerts: Question[] = [
  // ── 001: Reflex object model — single ────────────────────────────
  single({
    id: 'rfx-001', domain: 'prepare', subtopic: 'reflex', difficulty: 3,
    prompt:
      'In Reflex (Activator), what is an "OBJECT" and how does it relate to PROPERTIES and RULES?',
    options: [
      'An object is a logical entity (e.g., a package, a device, a store) with PROPERTIES whose recent values are tracked over time; RULES are conditions evaluated against those property values that trigger actions when satisfied',
      'An object is a single row in the source stream; properties are columns; rules are SQL WHERE clauses applied at ingest',
      'An object is a Reflex-specific data table that mirrors the source stream verbatim, and rules are scheduled queries against it',
      'An object is a Power BI visual; properties are its visual fields; rules are bookmarks'
    ],
    correct: 0,
    explanation:
      'Reflex models the world as OBJECTS (groups of like entities — e.g., one row per package or device) with PROPERTIES that have time-series values (the recent history of each property is tracked). RULES are conditions over property values; when a rule is satisfied for an object instance, the bound ACTION fires. This entity-property-rule model is what distinguishes Reflex from a row-by-row stream filter.',
    whyWrong: {
      1: 'Objects represent ENTITIES (one per package/device), not raw stream rows; rules are not SQL WHERE clauses.',
      2: 'Reflex does not mirror the source as a queryable table — it tracks recent property values per object instance.',
      3: 'Reflex is an alerting/action item, not a Power BI visual concept; bookmarks are unrelated.'
    },
    source: SRC.reflex,
    tags: ['reflex', 'objects', 'properties', 'rules']
  }),

  // ── 002: valid Reflex SOURCES — multi ────────────────────────────
  multi({
    id: 'rfx-002', domain: 'prepare', subtopic: 'reflex', difficulty: 3,
    prompt: 'Which of the following are valid SOURCES that can feed properties into a Reflex (Activator)?',
    options: [
      'A Fabric Eventstream (Reflex chosen as a destination on the stream)',
      'A Power BI report VISUAL (the visual\'s underlying data is bound as a property source)',
      'A Power BI SEMANTIC MODEL measure (selected directly without going through a visual)',
      'A KQL Database table queried on a 30-second SQL polling interval defined inside Reflex',
      'An on-prem SQL Server table accessed without any Eventstream / semantic model in between'
    ],
    correct: [0, 1, 2],
    explanation:
      'Reflex accepts three first-class sources: an Eventstream destination, a Power BI report VISUAL, and a Power BI SEMANTIC MODEL measure. To bring a KQL DB into Reflex, route through Eventstream or expose via a semantic model. Reflex does not directly poll on-prem SQL — that requires an upstream pipeline / Eventstream.',
    whyWrong: {
      3: 'Reflex does not run a SQL polling loop directly against KQL DB; route via Eventstream or a semantic model.',
      4: 'On-prem SQL is not a direct Reflex source; it must be brought into Fabric first (pipeline / mirroring / Eventstream).'
    },
    source: SRC.reflexSources,
    tags: ['reflex', 'sources', 'eventstream', 'power-bi']
  }),

  // ── 003: valid Reflex ACTIONS — multi ────────────────────────────
  multi({
    id: 'rfx-003', domain: 'prepare', subtopic: 'reflex', difficulty: 3,
    prompt: 'Which of the following are valid ACTION types that a Reflex rule can invoke when its condition is satisfied?',
    options: [
      'Send an email to one or more recipients',
      'Post a message to a Microsoft Teams channel or chat',
      'Trigger a Power Automate flow (custom action)',
      'Start a Fabric Data Pipeline run',
      'Call a custom HTTP endpoint (webhook)',
      'Mutate the underlying KQL Database row that triggered the rule (UPDATE in place)'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'Reflex ships with email, Teams message, Power Automate (the door to anything Power Automate can reach), Fabric pipeline kick-off, and custom HTTP webhook actions. Reflex does NOT mutate source data — KQL DB tables are append-oriented and Reflex actions push outward; if you need to update state, do it via the action target.',
    whyWrong: {
      5: 'Reflex actions push outward (email/Teams/flow/pipeline/webhook); they do not write back into the source KQL DB row.'
    },
    source: SRC.reflexActions,
    tags: ['reflex', 'actions', 'email', 'teams', 'power-automate', 'pipeline', 'webhook']
  }),

  // ── 004: rule types — multi ──────────────────────────────────────
  multi({
    id: 'rfx-004', domain: 'prepare', subtopic: 'rti-alerts', difficulty: 4,
    prompt: 'Which of the following are valid CONDITION patterns expressible as a Reflex rule on an object property?',
    options: [
      'Threshold: property value crosses a fixed numeric threshold (e.g., Temp > 90)',
      'Change detection: property value CHANGES (with optional from/to filters)',
      'Becomes true / becomes false: a boolean-valued property transitions',
      'Common values: enters or leaves a configured set (e.g., Status enters {"red","critical"})',
      'Deviation / windowed comparison: current value deviates from a rolling window baseline',
      'Arbitrary multi-table KQL JOIN evaluated server-side every minute against historical data'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'Reflex rules are EVENT-DRIVEN over an object\'s recent property values: thresholds, change/becomes-true/becomes-false transitions, common-value sets, and deviation-from-rolling-baseline are all first-class. What Reflex is NOT is a generic KQL query scheduler — for arbitrary multi-table joins use a KQL stored function in the Eventhouse and route the result property into Reflex.',
    whyWrong: {
      5: 'Reflex is not a scheduled KQL query runner over historical multi-table joins — push the aggregate into the property via Eventstream / semantic-model measure first.'
    },
    source: SRC.reflexRules,
    tags: ['rti-alerts', 'reflex', 'rules', 'thresholds', 'deviation']
  }),

  // ── 005: Reflex on Eventstream vs PBI Data Alerts — single ───────
  single({
    id: 'rfx-005', domain: 'prepare', subtopic: 'power-bi-alerts', difficulty: 4,
    prompt:
      'A team needs sub-minute alerting on a per-device telemetry stream. Which statement BEST contrasts a Reflex (Activator) on the Eventstream with classic Power BI Data Alerts on a report visual?',
    options: [
      'Reflex evaluates rules per-object as new events arrive — sub-second-to-seconds latency, multi-action (email, Teams, Power Automate, pipeline, webhook), and configured by the alert AUTHOR for the whole audience. Power BI Data Alerts only work on single-number visuals (card, KPI, gauge) on a report in a PREMIUM/PPU workspace, are evaluated at semantic-model REFRESH cadence, and are configured PER USER on the report',
      'Power BI Data Alerts are real-time and work on any visual; Reflex is the legacy batch alternative',
      'Reflex requires a Premium capacity for any report-level alerting; Power BI Data Alerts run on shared capacity for free',
      'Reflex and Power BI Data Alerts are the same feature, exposed under two different names in the Fabric portal'
    ],
    correct: 0,
    explanation:
      'Reflex is event-driven (latency follows the source stream, near-real-time when the source is an Eventstream), supports rich actions, and is authored once for an audience of objects. Power BI Data Alerts are coupled to model refresh, only target single-number visuals (card/KPI/gauge), are configured per user, and only support email + Power Automate trigger — they are not a substitute for Reflex on streaming data.',
    whyWrong: {
      1: 'Power BI Data Alerts are refresh-coupled, not real-time, and only work on single-number visuals — not "any visual".',
      2: 'Reflex does not require a Premium SKU for capability discussion in the way described — the contrast is about latency/scope, not licensing direction.',
      3: 'They are distinct features with different latency, scope, action surfaces, and authoring models.'
    },
    source: SRC.pbiAlerts,
    tags: ['power-bi-alerts', 'reflex', 'comparison', 'latency']
  }),

  // ── 006: Power BI Data Alerts limitations — multi ────────────────
  multi({
    id: 'rfx-006', domain: 'prepare', subtopic: 'power-bi-alerts', difficulty: 4,
    prompt: 'Which statements about classic Power BI DATA ALERTS (set on a report visual) are TRUE?',
    options: [
      'They can be set only on single-number visuals: card, KPI, and gauge',
      'They are configured PER USER — each consumer who wants the alert sets up their own',
      'They are evaluated when the underlying semantic model REFRESHES, not on a continuous stream',
      'They support sending an email and triggering a Power Automate flow',
      'They can fire on any visual (line chart, table, matrix) provided the visual returns at most one row',
      'They run on dashboard tiles pinned from those single-number visuals (legacy Workspace Dashboards)'
    ],
    correct: [0, 1, 2, 3, 5],
    explanation:
      'Power BI Data Alerts are a long-standing feature with sharply defined limits: single-number visuals only (card/KPI/gauge), per-user config, evaluated at semantic-model refresh, action surface limited to email + Power Automate. They were designed for the Workspace Dashboard surface where those visuals are pinned as tiles. They DO NOT extend to arbitrary visuals "as long as one row is returned" — the visual TYPE itself is the gate.',
    whyWrong: {
      4: 'The visual TYPE matters — line/table/matrix visuals cannot host a Data Alert even if filtered to one row.'
    },
    source: SRC.pbiAlerts,
    tags: ['power-bi-alerts', 'limitations', 'card', 'kpi', 'gauge']
  }),

  // ── 007: pick the right alerting pattern — scenario single ───────
  single({
    id: 'rfx-007', domain: 'prepare', subtopic: 'rti-alerts', difficulty: 5,
    prompt:
      'A logistics platform tracks 50 000 packages. Each package emits status events; the team wants to alert ops when ANY package goes from "in_transit" to "delayed" with sub-minute latency, paging the on-call channel. Which Fabric pattern is the BEST fit?',
    options: [
      'Eventstream from the package-status source -> Reflex (Activator); model "Package" as the Reflex object with PackageId as the key, define a rule "Status becomes \'delayed\'", action: post to the on-call Teams channel',
      'Power BI Import-mode report on a daily refresh with a Data Alert on a "delayed count" card visual',
      'A nightly Spark notebook that queries the Lakehouse and emails a CSV of delayed packages',
      'Reflex with NO object model — treat every event as a flat row and email the entire stream contents to the on-call inbox'
    ],
    correct: 0,
    explanation:
      'The right pattern is per-OBJECT alerting on a streaming source: Eventstream feeds Reflex, Package is the object (keyed by PackageId so each package is tracked independently), and a "becomes \'delayed\'" rule fires per package with a Teams action. That gives sub-minute latency, per-package state tracking, and the on-call routing the team needs.',
    whyWrong: {
      1: 'Daily-refresh Import + a card-visual Data Alert is hours-late and aggregates across packages — it cannot page on a SPECIFIC package transition.',
      2: 'A nightly notebook is the wrong latency budget by orders of magnitude.',
      3: 'Throwing every event as an email without object modeling floods the inbox and gives no per-package state — alert fatigue is guaranteed.'
    },
    source: SRC.reflexRules,
    tags: ['rti-alerts', 'reflex', 'scenario', 'objects', 'change-detection']
  }),

  // ── 008: pick the right alerting pattern — scenario single ───────
  single({
    id: 'rfx-008', domain: 'prepare', subtopic: 'rti-alerts', difficulty: 4,
    prompt:
      'An exec wants an emailed alert when the company "Yesterday Revenue" KPI card on her Power BI report drops below $1M. The semantic model refreshes hourly and lives in a Premium-per-User workspace. Which is the LOWEST-FRICTION pattern?',
    options: [
      'Configure a Power BI Data Alert on the KPI card visual with threshold $1M and "Send me an email" — it will be evaluated on each model refresh',
      'Stand up an Eventstream and Reflex on the underlying warehouse table, and replicate the KPI logic in Reflex',
      'Build a Real-Time dashboard from scratch and put a KQL tile on it just to fire the alert',
      'Schedule a Fabric pipeline that runs a T-SQL query every hour and sends the email via SMTP if the value is below $1M'
    ],
    correct: 0,
    explanation:
      'For a refresh-cadence threshold on a single-number visual that ALREADY exists on a report in a PPU/Premium workspace, classic Power BI Data Alerts are exactly the right tool. Reflex / RT dashboards / pipeline-driven email all reinvent something the platform already does declaratively, with no new code or items.',
    whyWrong: {
      1: 'Reflex is overkill when you already have the KPI visual and the latency budget is "every refresh".',
      2: 'A whole new RT dashboard just to host a tile is unnecessary for a refresh-cadence single-number alert.',
      3: 'A custom pipeline + SMTP recreates Data Alerts in code — anti-pattern when the native feature applies.'
    },
    source: SRC.pbiAlerts,
    tags: ['power-bi-alerts', 'scenario', 'card', 'refresh-cadence']
  }),

  // ── 009: pick the right alerting pattern — scenario single ───────
  single({
    id: 'rfx-009', domain: 'prepare', subtopic: 'rti-routing', difficulty: 4,
    prompt:
      'A team needs to KICK OFF a Fabric Data Factory pipeline whenever the streaming row count for a partner feed exceeds 10 000 events in a 5-minute window — to launch a downstream lakehouse curation job. Which pattern fits BEST?',
    options: [
      'Eventstream with a 5-minute tumbling-window aggregate -> Reflex object on the windowed count -> rule "WindowCount > 10000" with a Fabric pipeline action',
      'Schedule the pipeline every 5 minutes regardless of volume; ignore the threshold',
      'Configure a Power BI Data Alert on a card pinned from the partner-feed report; have it call the pipeline directly',
      'Use an Eventstream destination of "Lakehouse" and rely on the Lakehouse to auto-trigger the pipeline'
    ],
    correct: 0,
    explanation:
      'Window the stream INSIDE Eventstream so Reflex receives a property value (the windowed count) rather than raw events; the Reflex rule fires the pipeline action when the count exceeds the threshold. This is the canonical "stream -> windowed property -> Reflex rule -> Fabric pipeline" alert-to-orchestration pattern.',
    whyWrong: {
      1: 'Unconditional 5-minute scheduling wastes capacity on quiet windows and adds latency in busy ones.',
      2: 'Power BI Data Alerts cannot directly invoke a Fabric pipeline — only email + Power Automate.',
      3: 'Lakehouses do not auto-trigger pipelines on row arrival; the orchestration must be explicit.'
    },
    source: SRC.routing,
    tags: ['rti-routing', 'reflex', 'pipeline', 'window', 'scenario']
  }),

  // ── 010: routing — KQL DB to Reflex via Eventstream — single ─────
  single({
    id: 'rfx-010', domain: 'prepare', subtopic: 'rti-routing', difficulty: 4,
    prompt:
      'You want Reflex to react to a derived metric that lives only in a KQL Database table (computed by an update policy). What is the standard way to wire it into Reflex?',
    options: [
      'Add an Eventstream that uses the KQL Database table as a source and routes to Reflex as a destination, exposing the derived metric column as a Reflex property',
      'Open Reflex and connect it directly to the KQL Database via a built-in "KQL DB source" connector that polls the table every second',
      'Export the table to a Lakehouse Delta file and have Reflex watch the file for changes',
      'Have the KQL update policy directly call a Reflex REST endpoint per row inserted'
    ],
    correct: 0,
    explanation:
      'KQL DB content reaches Reflex via an Eventstream (KQL DB as the source, Reflex as the destination) — that is the Fabric-native bridge. There is no direct Reflex-to-KQL polling connector and no row-level webhook from update policies; bridging through Eventstream is the supported pattern and gives you no-code transformations along the way.',
    whyWrong: {
      1: 'Reflex does not poll KQL DB tables directly — wiring is via Eventstream.',
      2: 'Lakehouse-file-watching is not a Reflex source pattern.',
      3: 'KQL update policies do not invoke external REST endpoints per row; cross-engine wiring is via Eventstream.'
    },
    source: SRC.routing,
    tags: ['rti-routing', 'kql-db', 'eventstream', 'reflex']
  }),

  // ── 011: ordering — build a Reflex alert end-to-end ──────────────
  order({
    id: 'rfx-011', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt:
      'Order these steps to deliver a per-device temperature alert from Eventstream to a Teams channel using Reflex (Activator):',
    options: [
      'Add Reflex (Activator) as a destination on the existing Eventstream and pick the event schema to expose',
      'Define a Reflex object "Device" with DeviceId as the unique-key property',
      'Add the temperature column as a property on the Device object',
      'Author a rule on Device.Temperature with condition "value > 90" and a 5-minute debounce',
      'Bind the rule to a Teams-message action targeting the on-call channel and start the rule'
    ],
    explanation:
      'Wire the source first (Eventstream destination = Reflex), then model the entity (Device with DeviceId as the key so per-device state is tracked), then the property (Temperature), then the rule (threshold + debounce to avoid floods), then the action (Teams) and start it. Skipping the object/key step is the most common mistake — it makes "every event" the unit of evaluation instead of "per device".',
    source: SRC.reflex,
    tags: ['reflex', 'ordering', 'objects', 'rules', 'teams']
  }),

  // ── 012: ordering — pick the right alerting pattern flowchart ────
  order({
    id: 'rfx-012', domain: 'prepare', subtopic: 'rti-alerts', difficulty: 4,
    prompt:
      'Order this decision flow for choosing the right Fabric alerting pattern (top-most question first):',
    options: [
      'Is the data CONTINUOUSLY STREAMING (sub-minute latency required)? If yes -> Reflex on an Eventstream',
      'If not streaming, does the alert come from a SINGLE-NUMBER visual (card / KPI / gauge) on an existing Power BI report? If yes -> Power BI Data Alert',
      'If neither: does the alert require a stateful per-OBJECT rule on a semantic-model measure? If yes -> Reflex on the semantic model',
      'If you only need to KICK OFF an ETL job on a schedule (no condition over recent values), use a scheduled Fabric Data Pipeline trigger instead of any alert',
      'If you only need a real-time human-watched OPERATIONS view (no automated action), use a Real-Time dashboard rather than an alert at all'
    ],
    explanation:
      'Working from latency + action surface inward: streaming + automated action = Reflex on Eventstream; refresh-cadence single-number = PBI Data Alert; per-object measure rules = Reflex on semantic model; schedule-only ETL = pipeline; humans-in-front-of-screens = RT dashboard. This decision order catches the most common mis-fits (people reach for Reflex when a Data Alert suffices, or build a dashboard when an alert is what they need).',
    source: SRC.rtiDash,
    tags: ['rti-alerts', 'ordering', 'decision-flow', 'reflex', 'power-bi-alerts']
  }),

  // ── 013: Real-Time dashboard refresh model — single ──────────────
  single({
    id: 'rfx-013', domain: 'prepare', subtopic: 'rti-dashboards', difficulty: 3,
    prompt:
      'Which statement BEST describes the REFRESH model of a Fabric Real-Time dashboard?',
    options: [
      'Tiles auto-refresh on a configurable interval (seconds to minutes), each tile re-executing its KQL against the underlying KQL Database — so the dashboard is "continuously" current at the cadence configured',
      'The dashboard streams events directly into the browser via WebSocket; there is no polling',
      'It depends on a Power BI semantic model refresh schedule (typically hourly)',
      'It refreshes only on user click of a manual "Refresh" button'
    ],
    correct: 0,
    explanation:
      'Real-Time dashboards are POLLING-based at the tile level: each tile has an auto-refresh interval (seconds-to-minutes) and re-executes its KQL query against the KQL DB on that cadence. There is no semantic-model dependency, no WebSocket push, and no requirement for a manual click — the "real-time" feel comes from short auto-refresh intervals.',
    whyWrong: {
      1: 'There is no WebSocket push — tiles poll on their own auto-refresh interval.',
      2: 'No semantic-model dependency; RT dashboards bind directly to the KQL DB.',
      3: 'Manual refresh is supported but the model is auto-refresh, not click-driven.'
    },
    source: SRC.rtiDash,
    tags: ['rti-dashboards', 'auto-refresh', 'kql', 'polling']
  }),

  // ── 014: RT dashboard vs PBI report — multi ──────────────────────
  multi({
    id: 'rfx-014', domain: 'prepare', subtopic: 'rti-dashboards', difficulty: 4,
    prompt: 'Which statements correctly contrast a Real-Time DASHBOARD with a Power BI REPORT for monitoring KQL DB data?',
    options: [
      'Real-Time dashboards bind directly to the KQL DB and re-execute KQL per-tile on auto-refresh intervals as short as a few seconds',
      'Power BI reports go through a SEMANTIC MODEL (Direct Lake / DirectQuery / Import) and gain DAX measures, calculation groups, and DAX-based RLS',
      'Real-Time dashboards support DAX measures and calculation groups for richer modeling',
      'Power BI reports can be embedded in Microsoft Teams; Real-Time dashboards can also be shared via Fabric workspace permissions',
      'Real-Time dashboards include parameters that bind into KQL, including time-range pickers',
      'Power BI reports run KQL queries directly without a semantic model when the source is a KQL DB'
    ],
    correct: [0, 1, 3, 4],
    explanation:
      'RT dashboards are KQL-native, polling, parameterized; PBI reports are semantic-model-mediated and bring DAX/RLS. RT dashboards do NOT support DAX (no semantic model), and PBI does NOT skip the semantic model when the source is a KQL DB — even DirectQuery requires a semantic model wrapper.',
    whyWrong: {
      2: 'RT dashboards are KQL-native; DAX measures and calculation groups are semantic-model concepts.',
      5: 'A semantic model is always involved with Power BI; even DirectQuery to KQL DB needs a model.'
    },
    source: SRC.rtiDash,
    tags: ['rti-dashboards', 'power-bi', 'comparison', 'dax']
  }),

  // ── 015: throttling / debounce — single ──────────────────────────
  single({
    id: 'rfx-015', domain: 'prepare', subtopic: 'rti-alerts', difficulty: 4,
    prompt:
      'A Reflex temperature rule on 50 000 sensors fires THOUSANDS of Teams notifications during a heat wave because each sensor flaps just above and below the threshold every minute. Which built-in Reflex feature is the RIGHT first response?',
    options: [
      'Configure DEBOUNCE / minimum-interval on the rule so each object instance only triggers once per configured window — and consider hysteresis (e.g., trigger above 92 °F, recover below 88 °F) to avoid flapping',
      'Disable the rule entirely until the heat wave passes',
      'Switch the action from Teams to email — email throttles notifications automatically',
      'Move the rule to a Power BI Data Alert so the model-refresh interval naturally rate-limits firing'
    ],
    correct: 0,
    explanation:
      'Reflex rules support per-object debounce windows and condition shaping (e.g., separate trigger and recovery thresholds for hysteresis) so the alert FIRES ONCE per real event rather than once per oscillation. That is the right primitive for flapping; disabling the rule throws out the signal, the email channel does not throttle, and shoehorning into a PBI Data Alert loses per-object state.',
    whyWrong: {
      1: 'Disabling loses the alert during the exact incident you wanted to be told about.',
      2: 'Email channel does not auto-throttle; the volume problem is at the rule, not the action.',
      3: 'PBI Data Alerts are refresh-coupled and lose per-object state — wrong tool entirely.'
    },
    source: SRC.reflexRules,
    tags: ['rti-alerts', 'reflex', 'debounce', 'hysteresis', 'flapping']
  }),

  // ── 016: service principal for Fabric API actions — single ───────
  single({
    id: 'rfx-016', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt:
      'A Reflex action invokes a Fabric Data Pipeline. To make this work in PRODUCTION (no human-interactive auth), which identity model is the standard recommendation?',
    options: [
      'Run the action under a SERVICE PRINCIPAL (Microsoft Entra app registration) granted the necessary Fabric workspace role and pipeline-trigger permissions, with its secret stored in a secure secret store',
      'Run the action under the rule AUTHOR\'s personal account; their interactive token will be reused indefinitely',
      'Disable authentication on the pipeline\'s trigger endpoint so any caller can invoke it',
      'Embed an admin\'s username and password in the rule configuration as plaintext so any service can call the pipeline'
    ],
    correct: 0,
    explanation:
      'Production-grade Reflex actions that call Fabric APIs (kicking off a pipeline, calling a webhook into a Fabric tenant, etc.) authenticate via a Microsoft Entra service principal with the correct workspace role assignments. Personal tokens expire and bind production behavior to a specific human; disabling auth or storing plaintext credentials are security incidents.',
    whyWrong: {
      1: 'User tokens expire and tie production reliability to a person\'s account state — never the right answer for prod.',
      2: 'Disabling authentication on a Fabric API endpoint is a critical security incident.',
      3: 'Plaintext credentials in a rule config are a textbook secret leak.'
    },
    source: SRC.governance,
    tags: ['reflex', 'service-principal', 'security', 'governance', 'fabric-api']
  }),

  // ── 017: Reflex on a Power BI semantic model measure — single ────
  single({
    id: 'rfx-017', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt:
      'A Reflex rule is bound to a Power BI SEMANTIC-MODEL MEASURE (not a visual). Which statement is MOST accurate about WHEN the rule is evaluated and WHAT it sees?',
    options: [
      'Reflex re-evaluates the measure on a configured schedule (or on semantic-model refresh, depending on configuration); the rule sees the latest measure value as a property and fires when the configured condition over recent values is met',
      'The rule re-runs the measure live on every user interaction with any report that uses the model',
      'The rule subscribes to a streaming push from the semantic model — sub-second propagation with no schedule',
      'The rule fires only when the data source UNDER the semantic model is updated, regardless of whether the model itself has refreshed'
    ],
    correct: 0,
    explanation:
      'A semantic-model-backed Reflex rule treats the measure value as a property sampled on a schedule or on model refresh; that sampled history is the substrate over which the rule condition (threshold, change, deviation) is evaluated. There is no live push from the model and no per-interaction firing.',
    whyWrong: {
      1: 'Reflex does not re-fire per user interaction with a report; it samples the measure on its own schedule.',
      2: 'Semantic models do not push streaming events to Reflex; sampling is poll/refresh-based.',
      3: 'A stale model serves stale measure values; Reflex sees what the model returns at evaluation time, not what is in the source.'
    },
    source: SRC.reflexSources,
    tags: ['reflex', 'semantic-model', 'measure', 'evaluation']
  }),

  // ── 018: Reflex on a Power BI VISUAL — single ────────────────────
  single({
    id: 'rfx-018', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt:
      'A team binds Reflex to a Power BI report VISUAL (not a measure or an Eventstream). Which is the BEST description of what is happening?',
    options: [
      'Reflex captures the visual\'s underlying query result as the property source — effectively turning a visual\'s data (which can be richer than a single number) into Reflex object/property values without re-modeling the data',
      'Reflex screen-scrapes pixels from the rendered visual and OCRs them into properties',
      'Reflex executes the visual\'s DAX query inside a separate Reflex DAX engine that ignores the source semantic model',
      'Reflex requires the visual to be a card / KPI / gauge, exactly like Power BI Data Alerts'
    ],
    correct: 0,
    explanation:
      'Binding to a visual lets Reflex use the SHAPE of the visual\'s underlying query as the property source — keeping report-author intent (filters, groupings, measures) without re-modeling. This is one of three Reflex source patterns (Eventstream, semantic-model measure, report visual) and is RICHER than the card/KPI/gauge limitation that constrains classic PBI Data Alerts.',
    whyWrong: {
      1: 'There is no OCR — Reflex consumes the visual\'s structured query result, not its rendered pixels.',
      2: 'Reflex does not run its own DAX engine; the model serves the query.',
      3: 'Reflex is NOT limited to single-number visuals — that limitation is specific to classic PBI Data Alerts.'
    },
    source: SRC.reflexSources,
    tags: ['reflex', 'power-bi', 'visual', 'sources']
  }),

  // ── 019: ordering — diagnose noisy Reflex alerts ─────────────────
  order({
    id: 'rfx-019', domain: 'prepare', subtopic: 'rti-alerts', difficulty: 5,
    prompt:
      'Order these steps to diagnose and remediate a NOISY Reflex alert that is paging the on-call channel hundreds of times per hour:',
    options: [
      'Confirm the OBJECT KEY is the correct grain (e.g., DeviceId per device) — wrong grain causes one rule to fire as many objects',
      'Inspect the property\'s recent history view to see whether values are FLAPPING just around the threshold (oscillation) or genuinely sustained',
      'Add HYSTERESIS by separating trigger and recovery thresholds (e.g., trigger > 92 °F, recover < 88 °F)',
      'Add a per-object DEBOUNCE window so each object instance can only re-fire after the window elapses',
      'Validate the new rule shape against historical events (replay) before reactivating production paging'
    ],
    explanation:
      'Diagnose grain first (a misconfigured object key turns "one alert per device" into "one alert per row"), then look at the property history to see flapping vs sustained, then apply hysteresis (separate trigger / recovery thresholds) and debounce (rate-limit per object), then VALIDATE on history before going back into production paging. This is the canonical Reflex noise-remediation runbook.',
    source: SRC.reflexRules,
    tags: ['rti-alerts', 'ordering', 'debounce', 'hysteresis', 'object-key']
  }),

  // ── 020: properties of effective Reflex objects — multi ──────────
  multi({
    id: 'rfx-020', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt: 'Which design choices make a Reflex OBJECT effective for per-entity alerting at scale?',
    options: [
      'Choose a unique-per-entity KEY (e.g., DeviceId, PackageId, OrderId) so each entity\'s state is tracked independently',
      'Keep property cardinality reasonable — model the few properties used by rules, not every column on the source row',
      'Use rules that combine THRESHOLDS and time WINDOWS rather than alerting on every raw event',
      'Set debounce/hysteresis to match the natural variability of the property',
      'Use a high-cardinality concatenated synthetic key (e.g., timestamp + every column) so every event is its own object',
      'Disable change-detection rules in favor of always alerting on every value to maximize signal'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'Effective Reflex objects have a stable per-entity key, focused property set, condition shapes that match the physical signal (windowed thresholds + debounce + hysteresis). Anti-patterns: synthetic ultra-high-cardinality keys (turn objects into events) or "alert on every value" (drowns operators).',
    whyWrong: {
      4: 'A synthetic key per row makes every event its own object — defeating per-entity state tracking entirely.',
      5: '"Alert on every value" is alert fatigue by design and removes the value Reflex provides over a raw stream.'
    },
    source: SRC.reflex,
    tags: ['reflex', 'design', 'objects', 'cardinality']
  }),

  // ── 021: action targets — multi ──────────────────────────────────
  multi({
    id: 'rfx-021', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt: 'A Reflex rule fires. Which downstream targets can be reached DIRECTLY by the built-in actions (no extra glue code)?',
    options: [
      'A specific Microsoft Teams channel or chat (Teams message action)',
      'A list of email recipients (email action)',
      'A specific Fabric Data Pipeline run (Fabric pipeline action)',
      'An external HTTP endpoint protected by a custom token in a header (custom webhook action)',
      'Any system reachable from a Power Automate cloud flow (via the Power Automate action — e.g., ServiceNow, Jira, SAP through their Power Automate connectors)',
      'Direct write into an arbitrary Azure SQL table without any pipeline / Power Automate / webhook intermediary'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'The action surface is Teams + email + Fabric pipeline + custom webhook + Power Automate. Power Automate is the universal escape hatch (anything Power Automate connectors reach is reachable from Reflex). What Reflex CANNOT do directly is mutate an arbitrary downstream database — that needs a pipeline / Power Automate / webhook intermediary.',
    whyWrong: {
      5: 'There is no built-in "write to arbitrary SQL" Reflex action — route through Power Automate, a Fabric pipeline, or your webhook.'
    },
    source: SRC.reflexActions,
    tags: ['reflex', 'actions', 'power-automate', 'webhook', 'integration']
  }),

  // ── 022: scenario — exec dashboard vs alert vs pager — single ────
  single({
    id: 'rfx-022', domain: 'prepare', subtopic: 'rti-alerts', difficulty: 5,
    prompt:
      'You are designing the observability stack for a new factory floor. Requirements: (a) operators see live equipment status all shift; (b) supervisors get a Teams ping when ANY machine\'s vibration exceeds spec for more than 30 seconds; (c) execs get a Monday email digest of weekly downtime. Which combination BEST fits?',
    options: [
      '(a) Real-Time dashboard tiled per machine on the floor screens; (b) Reflex on the Eventstream with a per-machine windowed-threshold rule and Teams action with debounce; (c) Power BI report on the curated weekly aggregate with a scheduled subscription email',
      '(a) Power BI report refreshed hourly; (b) Power BI Data Alert on a card visual emailed to supervisors; (c) Reflex rule that fires every Monday morning',
      '(a) Reflex dashboard view of the rule-evaluation history; (b) Real-Time dashboard alarms with on-screen flashing only (no Teams); (c) Real-Time dashboard exported to PDF on Mondays',
      '(a) Power BI streaming dataset pushed from the source; (b) Email alerts via a custom Logic App; (c) Reflex rule triggered weekly'
    ],
    correct: 0,
    explanation:
      'Each requirement maps to its right tool: live operations -> Real-Time dashboard; per-machine streaming threshold with Teams routing -> Reflex on Eventstream with debounce; weekly digest -> Power BI report + scheduled subscription. This avoids overloading any one item with a job it is not designed for.',
    whyWrong: {
      1: 'Hourly refresh is too slow for operators on the floor; PBI Data Alert per card cannot evaluate per-machine state efficiently; Reflex is event-driven, not a weekly clock.',
      2: 'Reflex has no "dashboard view" of its own; Real-Time dashboards do not "page" supervisors via Teams without a separate alert rule; PDF-by-Monday is fragile compared to scheduled subscriptions.',
      3: 'Streaming datasets are deprecated for this kind of ingestion; Logic Apps reinvent the Reflex action layer; Reflex is event-driven, not scheduled.'
    },
    source: SRC.routing,
    tags: ['rti-alerts', 'scenario', 'dashboard', 'reflex', 'subscription']
  }),

  // ── 023: scenario — wrong tool detection — single ────────────────
  single({
    id: 'rfx-023', domain: 'prepare', subtopic: 'power-bi-alerts', difficulty: 5,
    prompt:
      'A team wants to alert on a Power BI MATRIX visual whenever ANY row\'s "Margin %" measure drops below 5%. They are trying to configure a Power BI Data Alert and cannot find the option. Why?',
    options: [
      'Power BI Data Alerts only support single-number visuals (card / KPI / gauge); they cannot evaluate per-row conditions on a matrix. The right tool is Reflex bound to the underlying semantic-model measure with the matrix\'s row grain (e.g., per Product) as the Reflex object',
      'Data Alerts work on any visual but require Premium-per-User licensing',
      'They need to re-publish the report into a personal workspace; matrix alerts only work outside shared workspaces',
      'Matrix alerts require enabling "Streaming" on the semantic model first'
    ],
    correct: 0,
    explanation:
      'The visual TYPE gates Data Alerts — card/KPI/gauge only, no matrix. The right pattern for "per-row condition" is to model the row grain (Product) as a Reflex object, expose Margin % as a property (semantic-model measure), and define a "Margin % < 5" rule with the appropriate action. That gives true per-object alerting without abusing PBI Data Alerts.',
    whyWrong: {
      1: 'Licensing is not the gate — visual type is. PPU/Premium does not unlock matrix Data Alerts.',
      2: 'Workspace location does not change the visual-type restriction.',
      3: 'There is no "enable Streaming on the semantic model" toggle that turns matrix alerts on.'
    },
    source: SRC.pbiAlerts,
    tags: ['power-bi-alerts', 'reflex', 'matrix', 'per-row', 'scenario']
  }),

  // ── 024: ownership / sharing — multi ─────────────────────────────
  multi({
    id: 'rfx-024', domain: 'prepare', subtopic: 'reflex', difficulty: 4,
    prompt: 'Which statements about Reflex item OWNERSHIP, SHARING, and AUDIENCE are TRUE?',
    options: [
      'A Reflex item lives in a Fabric workspace and inherits workspace roles for management permissions (Admin / Member / Contributor / Viewer)',
      'A Reflex rule, once created and started, fires for ALL matching object instances regardless of which user is currently signed in',
      'Action recipients (e.g., Teams channel, email list) are configured by the rule AUTHOR — the alert is broadcast to that audience, not personalized per consumer',
      'For production, runtime authentication for actions that call Fabric APIs should use a service principal',
      'Each consumer of a Reflex rule must individually subscribe to the rule, the way Power BI Data Alerts work',
      'Deleting the underlying Eventstream silently keeps the Reflex rule running on cached data'
    ],
    correct: [0, 1, 2, 3],
    explanation:
      'Reflex is a workspace item with workspace-role-based management; rules fire system-wide for matching objects (not per logged-in user); the action audience is set by the author; and production actions calling Fabric APIs should authenticate via service principal. Reflex is NOT per-consumer-subscription (that is the PBI Data Alert model), and removing the source breaks the rule (no cached-data fallback).',
    whyWrong: {
      4: 'Reflex is author-broadcast, not per-consumer-subscription — that is the PBI Data Alert pattern.',
      5: 'Removing the source breaks the rule; Reflex does not silently run on cached data.'
    },
    source: SRC.governance,
    tags: ['reflex', 'governance', 'ownership', 'sharing', 'service-principal']
  }),

  // ── 025: end-to-end design — single ──────────────────────────────
  single({
    id: 'rfx-025', domain: 'prepare', subtopic: 'rti-routing', difficulty: 5,
    prompt:
      'A retail chain has POS events streaming from 1 200 stores at ~5 000 events/sec. Requirements: (a) RAW events archived 3 years for audit; (b) per-store fraud alert when ANY card is used > 10x in 5 minutes, paging the store manager via Teams; (c) the fraud-alert rule must also kick off a Fabric pipeline to refresh a downstream "fraud watch" curated table; (d) per-store hourly KPIs in a Power BI report for area managers. Which design BEST satisfies all four with native Fabric items?',
    options: [
      'Eventstream(POS) fanned to: (1) Lakehouse for 3-year raw retention; (2) KQL DB raw + update-policy curated; (3) Reflex (Activator) with object = (Store, Card), windowed-count rule + dual action (Teams to manager AND Fabric pipeline run); plus a Power BI report on the curated table for area managers',
      'KQL DB only — store raw forever, Power BI Import refreshed hourly; build a custom Logic App that polls the KQL DB every minute and emails managers',
      'Lakehouse only — write Kafka/POS into Delta; build a Spark structured-streaming job that emails managers and triggers the pipeline; use Power BI DirectQuery for the report',
      'Reflex only — let Reflex archive the raw events for 3 years, run the fraud rule, kick off the pipeline, and serve the area manager report'
    ],
    correct: 0,
    explanation:
      'Each requirement is satisfied by the right item: Lakehouse for cheap multi-year Delta retention; KQL DB raw + curated for hot-cache analytics and the basis of Power BI reporting; Reflex with a (Store, Card) object key and a windowed-count rule that BOTH pages Teams AND triggers the Fabric pipeline (Reflex rules can bind multiple actions); Power BI report on the curated table for area managers. This is the canonical RTI fan-out with Reflex serving the action layer.',
    whyWrong: {
      1: 'KQL DB-only does not give you cheap 3-year retention; Logic-App polling reinvents Reflex; Power BI Import hourly will not keep up at 5 000 eps long-term.',
      2: 'Lakehouse-only with Spark structured streaming reinvents what Reflex + Eventstream + Lakehouse + KQL DB give natively, and DirectQuery on Lakehouse will not match KQL DB latency.',
      3: 'Reflex is the action layer — it does not store raw events, it does not host reports, and it is not a long-term archive.'
    },
    source: SRC.routing,
    tags: ['rti-routing', 'reflex', 'lakehouse', 'kql-db', 'end-to-end']
  })
];
