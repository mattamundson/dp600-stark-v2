import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

const SRC: SourceAnchor = {
  category: 'fabric-pipelines-deep',
  note: 'Fabric Data Factory pipelines: activities, control flow, expressions, parameters, monitoring'
};

export const pipelinesDeep: Question[] = [
  // ── Activity catalog ──────────────────────────────────────────
  single({
    id: 'pipd-001', domain: 'prepare', subtopic: 'pipeline-activities', difficulty: 3,
    prompt: 'A Fabric pipeline must call an external REST endpoint to retrieve a small JSON payload (an OAuth token) and pass the token to a downstream Copy Data activity. Which activity is the BEST fit for the REST call?',
    options: ['Web activity', 'Copy Data activity', 'Lookup activity', 'Notebook activity'],
    correct: 0,
    explanation: 'Web activity is purpose-built for invoking arbitrary HTTP/REST endpoints from a pipeline and exposing the response body via `@activity(\'name\').output`. It supports auth methods (Basic, MSI, Service Principal) and returns JSON for downstream consumption.',
    whyWrong: {
      1: 'Copy Data moves bytes between connectors at scale; it is not designed to invoke an arbitrary REST endpoint and return its body for use in expressions.',
      2: 'Lookup runs a query against a configured dataset (SQL, Lakehouse, etc.) — it is not a generic HTTP client.',
      3: 'Notebook activity launches a Spark session — heavy, slow startup, and overkill for one HTTP call.'
    },
    source: SRC,
    tags: ['web-activity', 'rest', 'oauth']
  }),
  single({
    id: 'pipd-002', domain: 'prepare', subtopic: 'pipeline-activities', difficulty: 3,
    prompt: 'A pipeline must list files in a Lakehouse Files area and then iterate over them. Which activity returns the file listing for downstream iteration?',
    options: ['GetMetadata activity', 'Lookup activity', 'Filter activity', 'Set Variable activity'],
    correct: 0,
    explanation: 'GetMetadata returns metadata about a dataset — including `childItems` for a folder (the file/dir listing). The result is bound to `@activity(\'GetFiles\').output.childItems` and consumed by ForEach.',
    whyWrong: {
      1: 'Lookup returns rows from a query against a tabular dataset — it does not list files.',
      2: 'Filter narrows an existing array; it does not produce one from storage.',
      3: 'Set Variable mutates a pipeline variable; it does not enumerate storage.'
    },
    source: SRC,
    tags: ['get-metadata', 'foreach', 'files']
  }),
  multi({
    id: 'pipd-003', domain: 'prepare', subtopic: 'pipeline-activities', difficulty: 4,
    prompt: 'Which of the following are first-class Fabric Data Pipeline activities (not Dataflow Gen2 steps or notebook constructs)?',
    options: [
      'Copy Data',
      'ForEach',
      'If Condition',
      'Power Query Merge step',
      'Switch',
      'PySpark cell'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Copy Data, ForEach, If Condition, and Switch are all native pipeline activities. Power Query Merge is a Dataflow Gen2 step (different surface). PySpark cell is a notebook construct, not a pipeline activity (the pipeline-side activity is "Notebook").',
    whyWrong: {
      3: 'Merge is a Power Query M operation inside Dataflow Gen2 — not a pipeline activity.',
      5: 'PySpark cells live inside a notebook. The pipeline activity that runs a notebook is called "Notebook activity".'
    },
    source: SRC,
    tags: ['activities', 'catalog']
  }),
  // ── Copy Data ─────────────────────────────────────────────────
  single({
    id: 'pipd-004', domain: 'prepare', subtopic: 'pipeline-activities', difficulty: 4,
    prompt: 'A Copy Data activity loads 200M rows from on-prem SQL Server into a Lakehouse table. The team wants the load to continue past a small number of malformed source rows rather than fail the activity. Which Copy Data setting controls this?',
    options: [
      'Fault tolerance: skip incompatible rows (with optional log of skipped rows)',
      'Retry policy with exponential backoff',
      'Parallel copy degree',
      'Staging via Lakehouse intermediate'
    ],
    correct: 0,
    explanation: 'Copy Data\'s Fault Tolerance setting allows skipping incompatible rows and (optionally) writing them to a log location for later inspection. Retry handles transient failures, not row-level data quality.',
    whyWrong: {
      1: 'Retry re-runs the whole activity on transient failure; it does not skip individual bad rows.',
      2: 'Parallel copy controls concurrency for throughput, not error tolerance.',
      3: 'Staging routes the data through an intermediate store (often required for cross-cloud) — not a row-error setting.'
    },
    source: SRC,
    tags: ['copy-data', 'fault-tolerance']
  }),
  single({
    id: 'pipd-005', domain: 'prepare', subtopic: 'pipeline-activities', difficulty: 4,
    prompt: 'A Copy Data activity must move data from Snowflake to a Fabric Warehouse but the direct connector path is rejecting because of credential format constraints. Which Copy Data feature provides a workaround that lands the data through OneLake first?',
    options: [
      'Enable staging via a Lakehouse intermediate',
      'Switch the source to Lookup activity',
      'Enable fault tolerance and retry',
      'Use a Notebook activity instead of Copy Data'
    ],
    correct: 0,
    explanation: 'Copy Data supports a staging step where data is written to a Lakehouse (in OneLake) as Parquet, then loaded from the staging area into the final sink. This decouples source-to-sink connector compatibility issues.',
    whyWrong: {
      1: 'Lookup retrieves a small payload — it cannot move 200M rows.',
      2: 'Fault tolerance addresses bad rows, not connector compatibility.',
      3: 'Switching to a notebook abandons the connector ecosystem and the COPY-DATA-grade tooling (mapping UI, parallelism). Staging is the in-tool answer.'
    },
    source: SRC,
    tags: ['copy-data', 'staging', 'snowflake']
  }),
  // ── Lookup ────────────────────────────────────────────────────
  single({
    id: 'pipd-006', domain: 'prepare', subtopic: 'pipeline-activities', difficulty: 3,
    prompt: 'A Lookup activity is configured against a Lakehouse SQL endpoint with "First row only" CHECKED. Downstream activities reference its output. Which expression returns the value of the column `LoadId` from the result?',
    options: [
      "@activity('LookupLoadId').output.firstRow.LoadId",
      "@activity('LookupLoadId').output.value[0].LoadId",
      "@activity('LookupLoadId').LoadId",
      "@pipeline().LookupLoadId"
    ],
    correct: 0,
    explanation: 'When "First row only" is enabled, the Lookup output exposes a `firstRow` object whose properties are the column names. The expression is `@activity(\'name\').output.firstRow.ColumnName`.',
    whyWrong: {
      1: '`output.value[0]` is the shape used when "First row only" is UNCHECKED (returns an array of rows).',
      2: 'You cannot reach into activity columns at the top level; output must go through `.output`.',
      3: '`@pipeline()` exposes pipeline-level system variables (`RunId`, `TriggerTime`, etc.), not arbitrary activity output.'
    },
    source: SRC,
    tags: ['lookup', 'expressions']
  }),
  multi({
    id: 'pipd-007', domain: 'prepare', subtopic: 'pipeline-activities', difficulty: 4,
    prompt: 'Which statements about the Lookup activity in a Fabric pipeline are TRUE?',
    options: [
      'With "First row only" UNCHECKED, output is an array accessible via `@activity(\'L\').output.value`',
      'Lookup is the right tool to fetch a control table that drives a ForEach',
      'Lookup can be used to move 50M rows of data into a sink',
      'With "First row only" CHECKED, the result count is always exactly 1 — even if the query returns no rows'
    ],
    correct: [0, 1],
    explanation: 'Lookup is for fetching small control payloads — the output `.value` array (when First row only is off) is the canonical input for ForEach\'s `items` property. It is NOT a data movement activity (Copy Data is). When the query returns no rows, the activity succeeds with an empty result, so "always exactly 1" is wrong.',
    whyWrong: {
      2: 'Lookup is not a data movement activity. It has row limits (typically 5,000 rows / 4 MB) and is not designed for bulk loads.',
      3: 'If the query returns no rows, `firstRow` is empty / not populated. The activity does not synthesize a row.'
    },
    source: SRC,
    tags: ['lookup', 'foreach', 'control-table']
  }),
  // ── ForEach ───────────────────────────────────────────────────
  single({
    id: 'pipd-008', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 4,
    prompt: 'A ForEach activity iterates over a Lookup result. Inside the loop, you must reference the current item\'s `tableName` property. Which expression is correct?',
    options: [
      '@item().tableName',
      '@items().tableName',
      "@activity('ForEachTable').currentItem.tableName",
      '@variables(\'tableName\')'
    ],
    correct: 0,
    explanation: 'Inside a ForEach iteration, `@item()` returns the current element, and you access its properties with dot notation: `@item().tableName`.',
    whyWrong: {
      1: '`@items()` (with the s) is the function for the ForEach `items` PROPERTY definition, not the per-iteration current element.',
      2: 'There is no `currentItem` accessor on a ForEach activity output.',
      3: '`@variables()` reads a pipeline variable — not the loop element.'
    },
    source: SRC,
    tags: ['foreach', 'item', 'expressions']
  }),
  single({
    id: 'pipd-009', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 4,
    prompt: 'A ForEach has 100 items and is configured with `isSequential = false` and `batchCount = 10`. What is the runtime behavior?',
    options: [
      'Up to 10 iterations run in parallel; remaining iterations queue until a slot frees',
      'All 100 iterations run in parallel; batchCount is ignored',
      'Iterations run strictly one-at-a-time in order',
      'Exactly 10 iterations run, the other 90 are skipped'
    ],
    correct: 0,
    explanation: 'When `isSequential = false`, the ForEach runs iterations in parallel up to `batchCount` (default ~20, max 50). The other iterations queue and start as slots free. Sequential mode (`isSequential = true`) ignores batchCount and runs one at a time.',
    whyWrong: {
      1: 'batchCount caps parallelism — it is honored, not ignored.',
      2: 'That is the sequential mode behavior, which requires `isSequential = true`.',
      3: 'No iterations are skipped; only the concurrency is bounded.'
    },
    source: SRC,
    tags: ['foreach', 'parallel', 'batch-count']
  }),
  multi({
    id: 'pipd-010', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 4,
    prompt: 'Which scenarios FORCE sequential ForEach execution (or strongly recommend it)?',
    options: [
      'Each iteration depends on a pipeline variable mutated by the previous iteration',
      'Iterations append to the same Lakehouse Delta table and need ordered commit semantics',
      'Iterations call independent REST endpoints with no shared state',
      'Iterations write to disjoint sink tables in different Warehouses'
    ],
    correct: [0, 1],
    explanation: 'Mutating a shared pipeline variable inside a parallel ForEach is a classic race condition — Set Variable inside a parallel ForEach is unsafe. Ordered Delta commits also need sequential. Independent REST calls and disjoint sinks are the parallel sweet spot.',
    whyWrong: {
      2: 'Independent calls with no shared state are the canonical case for parallel — no reason to serialize.',
      3: 'Disjoint sinks have no contention; parallel is fine and faster.'
    },
    source: SRC,
    tags: ['foreach', 'sequential', 'race']
  }),
  // ── Until ─────────────────────────────────────────────────────
  single({
    id: 'pipd-011', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 4,
    prompt: 'A pipeline must poll a long-running export job until its status is `Completed`, then proceed. Which activity matches this pattern best?',
    options: [
      'Until activity (do-while) with a Web activity inside polling status',
      'ForEach with batchCount = 1',
      'If Condition with retry policy',
      'Wait activity in a loop'
    ],
    correct: 0,
    explanation: 'Until is the do-while construct: it runs its inner activities, then evaluates an expression; loop continues while the expression is FALSE (until it becomes true). A Web activity inside that polls status is the canonical async-job pattern.',
    whyWrong: {
      1: 'ForEach iterates a finite collection — there is no fixed item list when polling.',
      2: 'If Condition is a single branch, not a loop.',
      3: 'Wait is a sleep, not a loop construct. You would still need an enclosing loop.'
    },
    source: SRC,
    tags: ['until', 'polling', 'do-while']
  }),
  single({
    id: 'pipd-012', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 4,
    prompt: 'An Until activity\'s exit expression is `@equals(activity(\'GetStatus\').output.firstRow.Status, \'Completed\')`. The activity also has `Timeout = 0.00:30:00`. What happens after 30 minutes if the status never reaches `Completed`?',
    options: [
      'The Until activity fails with a timeout error',
      'The Until activity succeeds and the pipeline proceeds',
      'The Until activity restarts from iteration 1',
      'The pipeline is canceled silently'
    ],
    correct: 0,
    explanation: 'Until honors the Timeout setting. When the timeout elapses without the exit condition becoming true, the activity FAILS — surfacing a timeout error that can be caught by a downstream On Failure dependency.',
    whyWrong: {
      1: 'Success requires the exit expression to evaluate true within the timeout — not a timeout itself.',
      2: 'No automatic restart; the failure terminates the activity.',
      3: 'No silent cancellation — the failure is a real failed status visible in the run history.'
    },
    source: SRC,
    tags: ['until', 'timeout', 'error']
  }),
  // ── Parameters vs variables ──────────────────────────────────
  single({
    id: 'pipd-013', domain: 'prepare', subtopic: 'pipeline-parameters', difficulty: 3,
    prompt: 'Which statement about pipeline PARAMETERS vs VARIABLES is correct?',
    options: [
      'Parameters are set at trigger / invocation time and are READ-ONLY during the run; variables are mutable via Set Variable',
      'Variables are set by the trigger; parameters are mutated mid-run',
      'Both are mutable mid-run via Set Variable',
      'Neither can be referenced inside expressions'
    ],
    correct: 0,
    explanation: 'Parameters are bound at the start of the pipeline run (by the trigger or the invoking pipeline) and remain constant. Variables can be mutated mid-run with Set Variable / Append Variable activities.',
    whyWrong: {
      1: 'Reverse of the truth — variables are mutable, parameters are not.',
      2: 'Parameters are immutable during the run.',
      3: 'Both are referenced via `@parameters(\'name\')` and `@variables(\'name\')`.'
    },
    source: SRC,
    tags: ['parameters', 'variables']
  }),
  multi({
    id: 'pipd-014', domain: 'prepare', subtopic: 'pipeline-parameters', difficulty: 4,
    prompt: 'Which expression patterns are VALID for reading state in a pipeline?',
    options: [
      "@pipeline().RunId",
      "@parameters('SourceFolder')",
      "@variables('rowCount')",
      "@activity('CopyOrders').output.rowsCopied",
      "@output('rowCount')"
    ],
    correct: [0, 1, 2, 3],
    explanation: 'All four are valid. `@pipeline().RunId` is a system variable; `@parameters()` reads a parameter; `@variables()` reads a variable; `@activity().output.X` reads activity output. There is no `@output()` top-level function.',
    whyWrong: {
      4: '`@output()` is not a valid pipeline expression function. To read activity output, use `@activity(\'name\').output...`.'
    },
    source: SRC,
    tags: ['expressions', 'parameters', 'variables']
  }),
  // ── Expressions / code-reading ────────────────────────────────
  single({
    id: 'pipd-015', domain: 'prepare', subtopic: 'pipeline-expressions', difficulty: 4,
    prompt: 'A ForEach iterates over a Lookup output where each item has an `id` integer property. Inside the loop, a Copy Data activity uses this expression for the sink filename:\n\n```\n@concat(\'user_\', toString(item().id), \'.parquet\')\n```\n\nFor an item with `id = 42`, what filename is produced?',
    options: ['user_42.parquet', 'user_id.parquet', 'user_{42}.parquet', 'user_42'],
    correct: 0,
    explanation: '`item().id` evaluates to `42` (an int). `toString(42)` becomes the string `"42"`. `concat(\'user_\', \'42\', \'.parquet\')` produces `user_42.parquet`.',
    whyWrong: {
      1: '`item().id` resolves the property — it is not a literal `id`.',
      2: 'No braces are added; concat just joins the string parts.',
      3: 'The third concat argument `.parquet` is included in the result.'
    },
    source: SRC,
    tags: ['expressions', 'concat', 'item']
  }),
  single({
    id: 'pipd-016', domain: 'prepare', subtopic: 'pipeline-expressions', difficulty: 4,
    prompt: 'Given a Set Variable activity using this expression:\n\n```\n@formatDateTime(utcNow(), \'yyyyMMdd\')\n```\n\nIf the pipeline runs at `2026-05-05T18:42:00Z`, what value is stored in the variable?',
    options: ['20260505', '2026-05-05', '050520', '20260505184200'],
    correct: 0,
    explanation: '`utcNow()` returns the current UTC datetime. `formatDateTime` with the format string `yyyyMMdd` produces a 4-digit year, 2-digit month (capital M), 2-digit day. Result: `20260505`.',
    whyWrong: {
      1: 'That is the ISO date — but the format string `yyyyMMdd` has NO dashes.',
      2: 'That would be a US-style format — not what `yyyyMMdd` produces.',
      3: 'No time component is in the format string.'
    },
    source: SRC,
    tags: ['expressions', 'formatdatetime', 'utcnow']
  }),
  single({
    id: 'pipd-017', domain: 'prepare', subtopic: 'pipeline-expressions', difficulty: 5,
    prompt: 'A Lookup returns `firstRow = { "Status": "OK", "Count": 0 }`. A downstream If Condition uses this expression:\n\n```\n@and(equals(activity(\'L\').output.firstRow.Status, \'OK\'), greater(activity(\'L\').output.firstRow.Count, 0))\n```\n\nWhich branch executes?',
    options: ['False branch', 'True branch', 'Both branches', 'The activity errors at evaluation'],
    correct: 0,
    explanation: '`equals(\'OK\', \'OK\')` is `true`. `greater(0, 0)` is `false`. `and(true, false)` is `false` → False branch executes.',
    whyWrong: {
      1: 'True branch requires both clauses to be true; the second is false.',
      2: 'If Condition runs exactly one branch.',
      3: 'The expression is well-formed and types align — no error.'
    },
    source: SRC,
    tags: ['expressions', 'if-condition', 'logic']
  }),
  // ── Trigger types ─────────────────────────────────────────────
  single({
    id: 'pipd-018', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 3,
    prompt: 'Which trigger type fires a pipeline when a new file lands in a OneLake / ADLS Gen2 folder?',
    options: ['Storage event trigger', 'Schedule trigger', 'Manual run', 'Tumbling window trigger'],
    correct: 0,
    explanation: 'Storage event triggers fire on blob/file create or delete events from a configured storage path — the canonical "new file arrived, run the pipeline" pattern.',
    whyWrong: {
      1: 'Schedule triggers fire on a clock cadence, not in response to data arrival.',
      2: 'Manual is a one-off invocation — no automation.',
      3: 'Tumbling window is a fixed-size, contiguous time window — useful for periodic windowed processing, not file-arrival.'
    },
    source: SRC,
    tags: ['triggers', 'storage-event']
  }),
  // ── Error handling / dependencies ────────────────────────────
  multi({
    id: 'pipd-019', domain: 'prepare', subtopic: 'pipeline-error-handling', difficulty: 4,
    prompt: 'Which dependency conditions are AVAILABLE on the arrow connecting two pipeline activities?',
    options: ['Success', 'Failure', 'Completion', 'Skipped', 'Timeout', 'Cancelled'],
    correct: [0, 1, 2, 3],
    explanation: 'The four supported dependency conditions are Success, Failure, Completion (runs regardless of upstream success/failure), and Skipped (runs if upstream was skipped due to an unmet dependency). Timeout and Cancelled are not separate dependency types — timeout surfaces as Failure.',
    whyWrong: {
      4: 'Timeout manifests as a Failure status — it is not its own dependency type.',
      5: 'Cancellation also is not a dependency type.'
    },
    source: SRC,
    tags: ['dependencies', 'error-handling']
  }),
  single({
    id: 'pipd-020', domain: 'prepare', subtopic: 'pipeline-error-handling', difficulty: 5,
    prompt: 'You want a pipeline pattern equivalent to try/catch: run a Copy Data activity; if it fails, run a Web activity that posts an alert; if it succeeds, run a Notebook for downstream processing. Which dependency wiring achieves this?',
    options: [
      'Copy → (Failure) → Web alert; Copy → (Success) → Notebook',
      'Copy → (Completion) → Web alert; Copy → (Completion) → Notebook',
      'Copy → (Skipped) → Web alert; Copy → (Success) → Notebook',
      'Copy → (Failure) → Web alert AND Notebook in parallel'
    ],
    correct: 0,
    explanation: 'Two outgoing dependencies from Copy: a Failure edge to the Web alert, and a Success edge to the Notebook. This is the canonical try/catch pattern in Fabric pipelines.',
    whyWrong: {
      1: 'Completion fires regardless — both alert and notebook would always run, even on failure.',
      2: 'Skipped fires only when the upstream itself was skipped because ITS dependency was unmet — wrong semantics.',
      3: 'Wiring the notebook off Failure means it runs only when Copy fails — opposite of the requirement.'
    },
    source: SRC,
    tags: ['try-catch', 'dependencies', 'error-handling']
  }),
  // ── Monitoring ────────────────────────────────────────────────
  single({
    id: 'pipd-021', domain: 'prepare', subtopic: 'pipeline-monitoring', difficulty: 3,
    prompt: 'Where do you view per-activity row counts, durations, and error messages for a completed pipeline run in Fabric?',
    options: [
      'Pipeline run details → click into the run → activity output / input tabs',
      'Capacity Metrics App',
      'OneLake admin portal',
      'XMLA endpoint trace'
    ],
    correct: 0,
    explanation: 'The Pipeline Monitoring view (or the Monitoring Hub) lists each pipeline run; clicking a run shows per-activity input, output, and error details.',
    whyWrong: {
      1: 'Capacity Metrics shows CU consumption — not per-activity execution detail.',
      2: 'There is no "OneLake admin portal" with run history.',
      3: 'XMLA traces semantic-model query activity, not pipeline activities.'
    },
    source: SRC,
    tags: ['monitoring', 'run-details']
  }),
  // ── Invoke Pipeline ──────────────────────────────────────────
  single({
    id: 'pipd-022', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 4,
    prompt: 'You want a master pipeline to call several child pipelines, passing each one a different parameter set, and waiting for the child to finish before proceeding. Which activity supports this?',
    options: [
      'Invoke Pipeline activity (with Wait on completion enabled)',
      'Web activity calling the Fabric REST API',
      'ForEach with Lookup',
      'Switch activity'
    ],
    correct: 0,
    explanation: 'Invoke Pipeline (a.k.a. Execute Pipeline) is the native composition activity. It accepts the child pipeline reference, parameter values, and a "Wait on completion" toggle.',
    whyWrong: {
      1: 'You COULD call the REST API, but it is the workaround, not the native pattern. Auth, error handling, and parameter passing are all manual work.',
      2: 'ForEach iterates an array — it is not a pipeline-invocation activity.',
      3: 'Switch is a branching construct, not a pipeline composer.'
    },
    source: SRC,
    tags: ['invoke-pipeline', 'composition']
  }),
  // ── Ordering: pipeline build ─────────────────────────────────
  order({
    id: 'pipd-023', domain: 'prepare', subtopic: 'pipeline-orchestration', difficulty: 4,
    prompt: 'Order the steps to build a parameterized pipeline that loads N tables from a control table.',
    options: [
      'Define a pipeline parameter `controlTableName`',
      'Add a Lookup activity reading from `@parameters(\'controlTableName\')`, "First row only" UNCHECKED',
      'Add a ForEach activity with `items = @activity(\'L\').output.value`',
      'Inside the ForEach, add a Copy Data activity using `@item().tableName` for the source table',
      'Test the pipeline by running it manually with a parameter value, then verify outputs in the run details'
    ],
    explanation: 'Build outward: define inputs (parameter), fetch the control list (Lookup), iterate (ForEach), do the work per item (Copy Data), then verify (run + monitoring).',
    source: SRC,
    tags: ['ordering', 'control-table', 'parameterized']
  }),
  // ── Ordering: error-handling pattern ─────────────────────────
  order({
    id: 'pipd-024', domain: 'prepare', subtopic: 'pipeline-error-handling', difficulty: 4,
    prompt: 'Order the steps to add a try/catch-style alert path to an existing Copy Data activity.',
    options: [
      'Open the pipeline that contains the Copy Data activity',
      'Add a Web activity to the canvas configured to POST an alert payload',
      'Draw a dependency arrow from Copy Data to the Web activity and set the condition to Failure',
      'Optionally add a Set Variable on Success to record the success state',
      'Run the pipeline and verify the Failure path fires only when the Copy Data activity fails'
    ],
    explanation: 'Open the pipeline → add the alert handler activity → wire it on Failure → wire the success path → verify by triggering both branches.',
    source: SRC,
    tags: ['ordering', 'error-handling', 'try-catch']
  }),
  // ── Final scenario / multi ────────────────────────────────────
  multi({
    id: 'pipd-025', domain: 'prepare', subtopic: 'pipeline-monitoring', difficulty: 5,
    prompt: 'A pipeline failed last night. The team needs to determine WHY. Which actions in the Monitoring Hub / pipeline run details produce useful diagnostic information?',
    options: [
      'Open the failed run, find the failed activity, and inspect its Output tab for the error message',
      'Inspect the failed activity\'s Input tab to confirm parameter / expression values were what you expected',
      'Use the Rerun option to re-run from the failed activity onward (rather than the whole pipeline)',
      'Read OneLake table metadata to recover the row that triggered the failure',
      'Open the upstream activity\'s Output to see if its result shaped the failed activity\'s input incorrectly'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'All four diagnostic actions are first-line: error message in Output, input values to confirm expressions, rerun-from-failed to save time, and upstream Output to trace data-shape issues. OneLake metadata generally cannot point at the row that triggered a Copy Data failure (you would need the Fault Tolerance log instead).',
    whyWrong: {
      3: 'OneLake table metadata describes schemas and partitions, not a specific row that errored. The Copy Data Fault Tolerance log (when configured) is the place to find skipped/erroring rows.'
    },
    source: SRC,
    tags: ['monitoring', 'troubleshooting', 'rerun']
  })
];
