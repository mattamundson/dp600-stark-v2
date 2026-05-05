// Fabric CLI, Data Factory Pipelines, and Variable Libraries bank.
// 20 questions, all `fbcli-001..fbcli-020`.
// Domain: 'maintain' (all 20) — supports blueprint balance.
// Subtopics: fabric-cli, pipelines, variable-libraries, pipeline-activities,
//   orchestration, parameters, expressions, cicd.
// Type mix: 11 single, 5 multi, 2 ordering, 2 scenario-single.
//
// Sources:
//   learn.microsoft.com/en-us/fabric/data-factory/pipeline-*
//   learn.microsoft.com/en-us/fabric/cicd/variable-library*
//   learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/pipeline-automation
//   learn.microsoft.com/en-us/fabric/admin/fabric-cli
//   (reviewed 2026-05 for exam cycle)

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// Extend SRC locally for fabric-cli / variable-library anchors
const SRC_CLI = {
  fabricCli: { category: 'fabric-cli', note: 'fab command structure, auth, workspace and item sub-commands' },
  variableLibrary: { category: 'variable-library', note: 'Variable Libraries: per-workspace config, deployment-pipeline-aware binding' },
  pipelinesExpr: { category: 'pipeline-expressions', note: '@pipeline(), @variables(), @activity().output expression language' },
};

export const fabricCli: Question[] = [
  // ── Fabric CLI — structure & auth ─────────────────────────────

  single({
    id: 'fbcli-001',
    domain: 'maintain',
    subtopic: 'fabric-cli',
    difficulty: 2,
    prompt: 'You want to authenticate the Fabric CLI on a developer workstation for the first time. Which command initiates the interactive browser login flow?',
    options: [
      '`fab auth login`',
      '`fab login`',
      '`fab connect --tenant <tenantId>`',
      '`az login --resource https://api.fabric.microsoft.com`'
    ],
    correct: 1,
    explanation: '`fab login` is the canonical Fabric CLI authentication command. It opens the default browser to an Entra ID (AAD) interactive login prompt and persists the token locally. `fab auth login` follows the Azure CLI pattern but is not correct Fabric CLI syntax. `fab connect` does not exist as a top-level command. `az login` authenticates the Azure CLI, which is a separate tool — the Fabric CLI maintains its own credential store.',
    whyWrong: {
      0: '`fab auth login` is not valid — the Fabric CLI uses `fab login`, not an `auth` sub-group.',
      2: '`fab connect` is not a Fabric CLI command.',
      3: '`az login` authenticates the Azure CLI, not the Fabric CLI. Separate tools, separate credential stores.'
    },
    source: SRC_CLI.fabricCli,
    tags: ['fabric-cli', 'authentication', 'fab-login']
  }),

  single({
    id: 'fbcli-002',
    domain: 'maintain',
    subtopic: 'fabric-cli',
    difficulty: 3,
    prompt: 'A CI/CD pipeline must run `fab` commands unattended (no browser). Which credential strategy is supported?',
    options: [
      'Service principal with client-credentials grant — pass `--client-id` and `--client-secret` flags to `fab login`',
      'Interactive browser only — `fab login` has no non-interactive mode',
      'Managed Identity — set `FAB_USE_MSI=1` before running `fab` commands',
      'API key stored in the `FAB_API_KEY` environment variable'
    ],
    correct: 0,
    explanation: '`fab login --service-principal --client-id <id> --client-secret <secret> --tenant <tenant>` supports non-interactive service-principal authentication, which is the required pattern for CI/CD pipelines. Managed Identity support exists for Azure-hosted agents via `fab login --managed-identity`. There is no `FAB_USE_MSI` environment variable or `FAB_API_KEY` — those do not exist in the Fabric CLI.',
    whyWrong: {
      1: 'Non-interactive service-principal login IS supported — `fab login --service-principal`.',
      2: '`FAB_USE_MSI=1` is not a valid Fabric CLI environment variable. Managed identity is invoked with `fab login --managed-identity`.',
      3: 'There is no API-key authentication in the Fabric CLI; it uses Entra ID (OIDC/OAuth 2.0) exclusively.'
    },
    source: SRC_CLI.fabricCli,
    tags: ['fabric-cli', 'authentication', 'service-principal', 'cicd', 'non-interactive']
  }),

  single({
    id: 'fbcli-003',
    domain: 'maintain',
    subtopic: 'fabric-cli',
    difficulty: 3,
    prompt: 'You need to trigger a semantic model refresh from a shell script using the Fabric CLI. Which command is correct?',
    options: [
      '`fab item run --workspace <wsId> --type SemanticModel --id <modelId>`',
      '`fab semantic-model refresh --id <modelId>`',
      '`fab item refresh --workspace <wsId> --id <modelId>`',
      '`fab run refresh --workspace <wsId> --model <modelId>`'
    ],
    correct: 0,
    explanation: '`fab item run` is the verb for executing a Fabric item. For a semantic model, this triggers an on-demand refresh. The full form is `fab item run --workspace <wsId> --type SemanticModel --id <modelId>`. There is no `fab semantic-model` command group, no `fab item refresh` verb (the verb is `run`), and no `fab run refresh`.',
    whyWrong: {
      1: '`fab semantic-model` is not a valid Fabric CLI command group.',
      2: '`fab item refresh` is wrong — the verb for running/triggering an item is `run`, not `refresh`.',
      3: '`fab run refresh` is not a valid command structure in the Fabric CLI.'
    },
    source: SRC_CLI.fabricCli,
    tags: ['fabric-cli', 'semantic-model', 'refresh', 'fab-item-run']
  }),

  single({
    id: 'fbcli-004',
    domain: 'maintain',
    subtopic: 'fabric-cli',
    difficulty: 4,
    prompt: 'A team wants to deploy items from the Test stage to the Production stage of a deployment pipeline using the Fabric CLI as part of a release script. Which command performs this?',
    options: [
      '`fab pipeline deploy --id <pipelineId> --source-stage-order 1 --target-stage-order 2`',
      '`fab deploy --pipeline <pipelineId> --from Test --to Production`',
      '`fab pipeline promote --id <pipelineId> --stage Prod`',
      '`fab item publish --workspace <prodWsId> --source <testWsId>`'
    ],
    correct: 0,
    explanation: '`fab pipeline deploy` is the correct command. `--source-stage-order` and `--target-stage-order` use zero-based integers (0 = Dev, 1 = Test, 2 = Prod in a 3-stage pipeline). Stage names are not used directly — stage order indices are the required parameters. `fab deploy` and `fab pipeline promote` are not valid CLI commands. `fab item publish` copies items between workspaces but bypasses deployment-pipeline rules.',
    whyWrong: {
      1: '`fab deploy` is not a valid top-level Fabric CLI command.',
      2: '`fab pipeline promote` does not exist — the verb is `deploy`.',
      3: '`fab item publish` exists but bypasses pipeline stages and deployment rules — not the right tool for a staged release workflow.'
    },
    source: SRC_CLI.fabricCli,
    tags: ['fabric-cli', 'deployment-pipelines', 'pipeline-deploy', 'cicd']
  }),

  multi({
    id: 'fbcli-005',
    domain: 'maintain',
    subtopic: 'fabric-cli',
    difficulty: 4,
    prompt: 'Which `fab workspace` sub-commands are valid in the Fabric CLI? Select all that apply.',
    options: [
      '`fab workspace list` — lists all workspaces the caller has access to',
      '`fab workspace get --id <wsId>` — retrieves workspace metadata',
      '`fab workspace assign-capacity --id <wsId> --capacity-id <capId>` — binds a workspace to a capacity',
      '`fab workspace delete --id <wsId>` — permanently deletes the workspace immediately',
      '`fab workspace items --id <wsId>` — lists items within a workspace'
    ],
    correct: [0, 1, 2, 4],
    explanation: '`fab workspace list`, `get`, `assign-capacity`, and `items` (or `fab item list --workspace`) are valid sub-commands. `fab workspace delete` exists but prompts for confirmation and performs a soft-delete — it does NOT permanently delete immediately (the standard 7-day soft-delete window still applies). The word "permanently" and "immediately" in option D make it false.',
    whyWrong: {
      3: 'While `fab workspace delete` exists, it performs the standard Fabric soft-delete (7-day recoverable window) — it is not an immediate, permanent deletion.'
    },
    source: SRC_CLI.fabricCli,
    tags: ['fabric-cli', 'workspace', 'fab-workspace']
  }),

  // ── Pipeline activities ───────────────────────────────────────

  single({
    id: 'fbcli-006',
    domain: 'maintain',
    subtopic: 'pipeline-activities',
    difficulty: 2,
    prompt: 'A Fabric Data Factory pipeline must execute a PySpark transformation in a Lakehouse notebook and then load the result into a warehouse. Which activity sequence is correct?',
    options: [
      'Copy → Notebook → Stored Procedure',
      'Notebook → Copy',
      'Dataflow Gen2 → Notebook',
      'ForEach → Lookup → Notebook'
    ],
    correct: 1,
    explanation: 'The Notebook activity executes the PySpark transformation (writing results to a Delta table or Lakehouse). A Copy activity then reads that Delta output and writes it to the Warehouse. "Notebook → Copy" is the clean two-step pattern for this scenario. The other options add unnecessary activities or put Copy before the notebook runs.',
    whyWrong: {
      0: 'A Stored Procedure activity targets SQL databases, not Fabric Warehouse load scenarios from Delta. And Copy before Notebook runs before the transformed data exists.',
      2: 'A Dataflow Gen2 activity is a Power Query-based ingestion tool — it is not the right wrapper for a PySpark notebook.',
      3: 'ForEach + Lookup adds iteration and first-row lookup to what should be a simple sequential pair — unnecessary complexity for a single notebook + copy pattern.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'notebook-activity', 'copy-activity', 'orchestration']
  }),

  multi({
    id: 'fbcli-007',
    domain: 'maintain',
    subtopic: 'pipeline-activities',
    difficulty: 3,
    prompt: 'Which statements about the ForEach activity in Fabric Data Factory pipelines are TRUE? Select all that apply.',
    options: [
      'ForEach can run its inner activities in parallel up to the configured batch count',
      'Setting sequential to `true` forces items to process one at a time in order',
      'The maximum parallel batch count is unlimited — Fabric dynamically assigns threads',
      'Inner activities in ForEach can reference the current iteration item via `@item()`',
      'ForEach requires a Lookup activity upstream to produce the array it iterates over'
    ],
    correct: [0, 1, 3],
    explanation: 'ForEach supports parallel execution (batch count) and sequential mode. The `@item()` expression accesses the current iteration value inside the loop body. Maximum batch count is capped (default 20, configurable up to 50 per Microsoft docs) — it is NOT unlimited. A Lookup is a common pattern to feed ForEach but NOT required; any array expression or pipeline parameter can be the iterator.',
    whyWrong: {
      2: 'Parallel batch count is bounded. The default is 20 and the maximum configurable limit is 50 — not unlimited.',
      4: 'ForEach does not require a Lookup upstream. Any array-valued expression or parameter can supply the items collection.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'foreach-activity', 'parallel', 'batch-count', 'item-expression']
  }),

  single({
    id: 'fbcli-008',
    domain: 'maintain',
    subtopic: 'pipeline-activities',
    difficulty: 3,
    prompt: 'A Lookup activity is configured with "First row only" set to `false`. What does the pipeline return in `@activity(\'LookupName\').output`?',
    options: [
      'A single object with the first matching row',
      'An object with a `value` array containing ALL rows from the result set, and a `count` property',
      'A flat array of row values with no wrapper object',
      'An error — "First row only" must be `true` for downstream expression use'
    ],
    correct: 1,
    explanation: 'When "First row only" is `false`, the Lookup output shape is `{ "count": N, "value": [ { ...row1 }, { ...row2 }, ... ] }`. Downstream activities (typically ForEach) reference `@activity(\'LookupName\').output.value` to get the iterable array. When "First row only" is `true`, the output is the single row object directly.',
    whyWrong: {
      0: 'A single object is the output when "First row only" is `true`, not `false`.',
      2: 'The output is a wrapper object with `count` and `value`, not a flat array.',
      3: '`false` is a supported and commonly-used mode — no error is thrown.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'lookup-activity', 'output-shape', 'first-row-only']
  }),

  single({
    id: 'fbcli-009',
    domain: 'maintain',
    subtopic: 'pipeline-activities',
    difficulty: 4,
    prompt: 'An Until activity is configured to loop until a REST API endpoint returns `{"status":"complete"}`. The expression in the Until condition is `@equals(activity(\'CheckStatus\').output.status, \'complete\')`. After 3 iterations the API returns the expected payload, but the Until loop continues indefinitely. What is MOST likely wrong?',
    options: [
      'Until condition expressions cannot reference activity output — use a variable instead',
      'The Until condition is evaluated BEFORE the inner activities run on each iteration — the condition is reading stale output from a previous iteration\'s web activity, not the current one',
      'The Until activity has no built-in timeout — it runs forever once started',
      'The expression is missing the `@` prefix on `activity()`'
    ],
    correct: 1,
    explanation: 'The Until activity evaluates its exit condition at the TOP of each iteration cycle (before activities run). If the Web activity that calls the REST API is INSIDE the Until, the Until condition on the next loop check still sees the output from the PREVIOUS iteration\'s inner web call — this is a sequencing confusion. The correct pattern is: inner activity runs → evaluates → Until exits. The actual bug is most often a variable not being SET inside the loop to capture the fresh result, or the `@activity()` referencing the wrong scope. Verify the Web activity is inside the Until and the variable pattern is used.',
    whyWrong: {
      0: '`@activity()` can be used inside Until conditions — it references the last run of a named activity within the same Until scope.',
      2: 'Until activity DOES have a configurable timeout (default 7 days) — it will not run forever with no timeout.',
      3: 'The `@` prefix is required at the start of the expression string, not before every function call inside a string expression. The shown expression is syntactically correct inside a `@` string context.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'until-activity', 'expression', 'termination-condition', 'exam-trap']
  }),

  // ── Parameters, expressions, variables ───────────────────────

  single({
    id: 'fbcli-010',
    domain: 'maintain',
    subtopic: 'parameters',
    difficulty: 2,
    prompt: 'A pipeline has a parameter named `pLoadDate` and a variable named `vStatus`. Which expression correctly reads the parameter value inside an activity field?',
    options: [
      '`@variables(\'pLoadDate\')`',
      '`@pipeline().parameters.pLoadDate`',
      '`@parameter(\'pLoadDate\')`',
      '`@pipeline().variables.pLoadDate`'
    ],
    correct: 1,
    explanation: '`@pipeline().parameters.<name>` is the correct expression for reading a pipeline parameter. `@variables(\'<name>\')` reads a pipeline *variable* — not a parameter. `@parameter()` is not a valid expression function. `@pipeline().variables` is also not the correct path for parameters.',
    whyWrong: {
      0: '`@variables()` reads variables, not parameters. `pLoadDate` is a parameter, so this would return null or error.',
      2: '`@parameter()` is not a valid Data Factory expression function — the correct form is `@pipeline().parameters.<name>`.',
      3: '`@pipeline().variables` is the wrong property path; parameters live at `@pipeline().parameters`.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'parameters', 'expressions', 'pipeline-function']
  }),

  multi({
    id: 'fbcli-011',
    domain: 'maintain',
    subtopic: 'expressions',
    difficulty: 4,
    prompt: 'Which expressions are SYNTACTICALLY valid in Fabric Data Factory pipeline expression language? Select all that apply.',
    options: [
      "`@concat(pipeline().parameters.prefix, '-', formatDateTime(utcNow(), 'yyyyMMdd'))`",
      '`@activity(\'CopyData\').output.rowsCopied`',
      '`@if(equals(variables(\'vStatus\'), \'done\'), \'success\', \'retry\')`',
      '`@pipeline.parameters.env`  (dot access without parentheses on `pipeline`)',
      '`@string(activity(\'LookupRows\').output.count)`'
    ],
    correct: [0, 1, 2, 4],
    explanation: '`@concat`, `@activity().output.*`, `@if(equals(...))`, and `@string()` are all valid expression functions. `@pipeline.parameters.env` (option D) is INVALID — `pipeline` must be invoked as a function: `@pipeline().parameters.env`. Omitting the parentheses causes a parse error.',
    whyWrong: {
      3: '`pipeline` must be called as a function — `@pipeline()`. Writing `@pipeline.parameters.env` without parentheses is a parse error.'
    },
    source: { category: 'pipeline-expressions', note: 'Expression language functions: concat, if, equals, formatDateTime, string' },
    tags: ['pipelines', 'expressions', 'syntax', 'pipeline-function', 'exam-trap']
  }),

  single({
    id: 'fbcli-012',
    domain: 'maintain',
    subtopic: 'parameters',
    difficulty: 3,
    prompt: 'What is the key difference between a pipeline **parameter** and a pipeline **variable** in Fabric Data Factory?',
    options: [
      'Parameters are writable at runtime using a Set Variable activity; variables are read-only after pipeline start',
      'Parameters are set at pipeline invocation (design-time default or caller override) and are READ-ONLY during the run; variables are mutable at runtime using Set Variable activities',
      'Variables support object and array types; parameters only support string and integer',
      'Parameters are scoped to a single activity; variables are pipeline-wide'
    ],
    correct: 1,
    explanation: 'Parameters are supplied when a pipeline is triggered or called — they cannot be changed once the run starts. Variables are mutable: Set Variable and Append Variable activities can update them throughout a run, enabling state-machine patterns and loop counters. Both parameters and variables support multiple types including string, integer, boolean, array, and object.',
    whyWrong: {
      0: 'This is exactly backwards — Set Variable operates on *variables*, not parameters.',
      2: 'Both parameters and variables support string, integer, boolean, float, array, and object types.',
      3: 'Parameters are pipeline-scoped, not activity-scoped. Variables are also pipeline-scoped. Neither is activity-scoped.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'parameters', 'variables', 'set-variable', 'mutability']
  }),

  // ── Variable Libraries ────────────────────────────────────────

  single({
    id: 'fbcli-013',
    domain: 'maintain',
    subtopic: 'variable-libraries',
    difficulty: 2,
    prompt: 'A Variable Library is created in the Development workspace of a Fabric deployment pipeline. When the item is promoted to the Production workspace, how do Variable Library values behave?',
    options: [
      'The same values from Development are copied to Production unchanged',
      'The Variable Library promotes as a separate item per stage; each stage holds its OWN values so Production can store production-specific connection strings without modifying the Dev library',
      'Variable Libraries are blocked from deployment pipeline promotion — only Notebooks and Semantic Models are supported',
      'Values promote but are immediately encrypted and cannot be read from Production'
    ],
    correct: 1,
    explanation: 'Variable Libraries are deployment-pipeline-aware: the item is promoted to each stage, but each stage maintains its own set of values. This lets Dev hold dev endpoints and Prod hold prod endpoints without any hardcoded paths in notebooks or pipelines that reference the library. It is the recommended replacement for hardcoded workspace IDs or connection strings in pipeline expressions.',
    whyWrong: {
      0: 'Values are NOT copied across stages — that would defeat the purpose. Each stage is independently editable after the initial deploy.',
      2: 'Variable Library is a first-class Fabric item supported in deployment pipelines.',
      3: 'Values are readable within their stage. Encryption at rest applies to OneLake storage, not to making values unreadable from the same stage.'
    },
    source: SRC_CLI.variableLibrary,
    tags: ['variable-libraries', 'deployment-pipelines', 'stage-aware', 'configuration']
  }),

  single({
    id: 'fbcli-014',
    domain: 'maintain',
    subtopic: 'variable-libraries',
    difficulty: 3,
    prompt: 'A Fabric notebook references a Variable Library value using the Fabric SDK: `mssparkutils.credentials.getSecret(libraryName, keyName)`. The notebook runs in both Dev and Prod workspaces. Which statement is TRUE?',
    options: [
      'The call returns the Dev value in both workspaces because the library was authored in Dev',
      'The call returns the value configured on the Variable Library in the workspace where the notebook currently executes — Dev returns Dev values, Prod returns Prod values',
      'The call fails unless the notebook is connected to the specific Variable Library by workspace ID',
      'Variable Library values are only accessible via REST API, not the Spark SDK'
    ],
    correct: 1,
    explanation: 'Variable Library binding is workspace-local. `mssparkutils.credentials.getSecret(libraryName, keyName)` resolves against the Variable Library with that name in the **current** workspace. Because Dev and Prod are separate workspaces each holding their own library instance (with stage-specific values), the notebook automatically returns the right value in each environment without any code change.',
    whyWrong: {
      0: 'The runtime always resolves against the current execution workspace — never the authoring workspace.',
      2: 'No explicit workspace ID is required in the SDK call. The current workspace context is implicit.',
      3: 'The Fabric Spark SDK (`mssparkutils`) supports Variable Library access directly — no REST API redirect needed.'
    },
    source: SRC_CLI.variableLibrary,
    tags: ['variable-libraries', 'mssparkutils', 'workspace-binding', 'configuration']
  }),

  multi({
    id: 'fbcli-015',
    domain: 'maintain',
    subtopic: 'variable-libraries',
    difficulty: 4,
    prompt: 'Which of the following are VALID use cases for Variable Libraries in a Fabric solution? Select all that apply.',
    options: [
      'Storing the Lakehouse SQL connection string per deployment stage (Dev points to bronze-dev, Prod points to bronze-prod)',
      'Storing a secret password in plaintext that notebooks read at runtime',
      'Storing a feature flag (boolean) that enables or disables a transformation step per stage',
      'Replacing hardcoded workspace IDs in pipeline expressions to enable deployment without manual edits',
      'Storing large binary blobs (>1 MB JSON payloads) as library values'
    ],
    correct: [0, 2, 3],
    explanation: 'Variable Libraries are designed for per-stage configuration: connection identifiers, feature flags, and path/ID values that differ across environments. Storing plaintext passwords is a security anti-pattern — use Keyvault-backed secrets via Azure Key Vault or Microsoft Fabric\'s Key Vault integration instead. Large binary blobs (>1 MB) exceed the value-size limits of Variable Libraries.',
    whyWrong: {
      1: 'Plaintext passwords in Variable Libraries violate secret hygiene. Use Azure Key Vault references, not Library values, for credentials.',
      4: 'Variable Library values are for lightweight configuration strings and scalars. They have a size limit and are not intended for large JSON payloads — store those in a Lakehouse file instead.'
    },
    source: SRC_CLI.variableLibrary,
    tags: ['variable-libraries', 'use-cases', 'feature-flags', 'configuration', 'secret-hygiene']
  }),

  // ── CI/CD and Git integration ─────────────────────────────────

  multi({
    id: 'fbcli-016',
    domain: 'maintain',
    subtopic: 'cicd',
    difficulty: 4,
    prompt: 'A team adopts the Fabric Git + deployment pipeline CI/CD pattern. Which statements describe the CORRECT workflow? Select all that apply.',
    options: [
      'Developers branch from the main branch in Azure DevOps, make changes in a feature workspace, then open a PR back to main',
      'Merging to main triggers an "Update workspace" on the Development workspace to pull the latest Git state',
      'The deployment pipeline automatically monitors Git and promotes Dev → Test when the main branch is updated',
      'Promotion from Test to Production via the deployment pipeline is a manual (or scripted) release gate step',
      'Test and Production workspaces are typically NOT connected to Git — Git provides source control on Dev only'
    ],
    correct: [0, 1, 3, 4],
    explanation: 'The canonical pattern: feature branches in Git → PR to main → merge → "Update workspace" in Dev (can be scripted via CLI or REST API) → manual/scripted pipeline promotion to Test → second promotion gate to Prod. The deployment pipeline does NOT auto-promote on Git merge — that step must be triggered explicitly. Test and Prod workspaces are intentionally kept off Git to prevent direct edits bypassing the pipeline.',
    whyWrong: {
      2: 'Deployment pipelines do NOT auto-watch Git and auto-promote on merge. An "Update workspace" AND a separate `fab pipeline deploy` are required. Automatic promotion would bypass approval gates.'
    },
    source: SRC.deployment,
    tags: ['cicd', 'git-integration', 'deployment-pipelines', 'workflow', 'branch-strategy']
  }),

  single({
    id: 'fbcli-017',
    domain: 'maintain',
    subtopic: 'cicd',
    difficulty: 3,
    prompt: 'After a developer merges a hotfix PR to the main branch in Git, they run `fab workspace git update --workspace <devWsId>` from the CLI. What does this command do?',
    options: [
      'Pushes uncommitted workspace changes back to the Git branch',
      'Pulls the latest state from the connected Git branch into the Development workspace (equivalent to "Update workspace" in the UI)',
      'Creates a new commit in Git from the current workspace item states',
      'Disconnects the workspace from its Git branch and re-connects to the latest HEAD'
    ],
    correct: 1,
    explanation: '`fab workspace git update` is the CLI equivalent of clicking "Update workspace" in the Fabric UI — it pulls the latest commits from the connected Git branch and applies them to the workspace. This is the critical step that closes the loop between a Git merge and the workspace state being deployable. Without this step, the workspace still holds pre-merge content.',
    whyWrong: {
      0: 'Pushing workspace changes to Git is done with `fab workspace git commit` (or the UI "Commit" action), not `update`.',
      2: 'Creating a Git commit from workspace state is `fab workspace git commit`, not `update`.',
      3: '`update` applies the latest branch HEAD to the workspace — it does not disconnect or reconnect the Git binding.'
    },
    source: SRC_CLI.fabricCli,
    tags: ['fabric-cli', 'git-integration', 'workspace-git-update', 'cicd']
  }),

  // ── Pipeline triggers and monitoring ─────────────────────────

  single({
    id: 'fbcli-018',
    domain: 'maintain',
    subtopic: 'orchestration',
    difficulty: 3,
    prompt: 'A pipeline must run exactly once every hour AND each run must start only after the PREVIOUS run\'s window completes (no backfill overlap, backfill on missed windows). Which trigger type should you use?',
    options: [
      'Scheduled trigger with a 1-hour recurrence',
      'Tumbling Window trigger with a 1-hour window size',
      'Event-based trigger on a storage file-created event',
      'Manual trigger called from a master orchestration pipeline'
    ],
    correct: 1,
    explanation: 'Tumbling Window triggers are designed for exactly this: non-overlapping, contiguous time windows where each window must complete before the next starts, with built-in backfill for missed windows. Scheduled triggers also fire hourly but do NOT enforce backfill ordering — two instances can overlap if a run takes longer than an hour. Event-based and manual triggers are not time-window-based.',
    whyWrong: {
      0: 'Scheduled triggers fire on a clock-based cadence but allow concurrent instances. They do not enforce that the previous window completed before the next starts, and backfill behavior is different.',
      2: 'Event-based triggers fire on storage events (file creation/deletion), not on time windows.',
      3: 'A manual trigger in an orchestration pipeline is not a self-scheduling mechanism.'
    },
    source: SRC.pipelines,
    tags: ['pipelines', 'tumbling-window', 'scheduled-trigger', 'backfill', 'orchestration']
  }),

  // ── Ordering: Fabric CLI deployment flow ─────────────────────

  order({
    id: 'fbcli-019',
    domain: 'maintain',
    subtopic: 'cicd',
    difficulty: 4,
    prompt: 'Order the steps for a complete Fabric CLI–driven release: from a merged PR in Git to content live in Production.',
    options: [
      'Run `fab login --service-principal` with the release service principal credentials',
      'Run `fab workspace git update --workspace <devWsId>` to pull the merged branch HEAD into Dev',
      'Run `fab pipeline deploy --id <pipelineId> --source-stage-order 0 --target-stage-order 1` to promote Dev → Test',
      'Execute automated smoke tests against the Test workspace (e.g., trigger a semantic model refresh and validate row counts)',
      'Run `fab pipeline deploy --id <pipelineId> --source-stage-order 1 --target-stage-order 2` to promote Test → Prod',
      'Verify Production health — trigger a refresh or query and confirm expected output'
    ],
    shuffled: [
      'Execute automated smoke tests against the Test workspace (e.g., trigger a semantic model refresh and validate row counts)',
      'Run `fab pipeline deploy --id <pipelineId> --source-stage-order 1 --target-stage-order 2` to promote Test → Prod',
      'Run `fab login --service-principal` with the release service principal credentials',
      'Run `fab workspace git update --workspace <devWsId>` to pull the merged branch HEAD into Dev',
      'Verify Production health — trigger a refresh or query and confirm expected output',
      'Run `fab pipeline deploy --id <pipelineId> --source-stage-order 0 --target-stage-order 1` to promote Dev → Test'
    ],
    explanation: 'Auth first (fab login) → sync Dev workspace from Git → deploy Dev to Test → validate in Test → deploy Test to Prod → verify Prod. Skipping the `git update` means promoting stale pre-merge content; skipping Test validation means shipping untested artifacts; skipping Prod health check violates the "never claim done without verification" principle.',
    source: SRC_CLI.fabricCli,
    tags: ['fabric-cli', 'cicd', 'deployment-pipelines', 'ordering', 'release-workflow']
  }),

  // ── Ordering: ForEach + If conditional flow ───────────────────

  order({
    id: 'fbcli-020',
    domain: 'maintain',
    subtopic: 'pipeline-activities',
    difficulty: 4,
    prompt: 'A pipeline loads a list of tables from a control table, then processes each one with conditional logic: if a table has a "full" load type, run a Copy activity; otherwise run a Notebook activity. Order the pipeline activity steps correctly.',
    options: [
      'Lookup activity reads the control table and returns all rows (`First row only = false`)',
      'ForEach activity iterates over `@activity(\'LookupTables\').output.value`',
      'If Condition activity evaluates `@equals(item().loadType, \'full\')`',
      'True branch: Copy activity loads the full table from source to Lakehouse',
      'False branch: Notebook activity runs the incremental transformation',
      'Set Variable activity records the processed table name in a pipeline variable for audit logging'
    ],
    explanation: 'Lookup feeds ForEach, ForEach iterates each row, If Condition branches on the load type, True/False branches execute the appropriate activity, then the Set Variable captures the result for audit. The Lookup must complete before ForEach can iterate; the If Condition must be INSIDE ForEach (not before or after); the True and False branches are children of If Condition, not sequential siblings; Set Variable follows each branch resolution.',
    source: SRC.pipelines,
    tags: ['pipelines', 'foreach-activity', 'if-condition', 'lookup-activity', 'ordering', 'control-flow']
  })
];
