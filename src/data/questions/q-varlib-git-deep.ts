import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

// Maintain-domain deep-dive: Variable Libraries (new 2024 Fabric feature) +
// Git Integration. 25 questions, ids `vlg-001..vlg-025`. Authored to lift
// Maintain-domain coverage above the 25% guard rail. Subtopics:
// variable-libraries, git-integration, cicd, deployment-pipelines,
// workspace-admin, lifecycle.

const SRC: Record<string, SourceAnchor> = {
  varlib: { category: 'fabric-varlib-git', note: 'Variable libraries: workspace-scoped vars, value sets, consumers' },
  varlibSets: { category: 'fabric-varlib-git', note: 'Active vs alternate value sets; environment overrides' },
  varlibConsume: { category: 'fabric-varlib-git', note: 'Consumers: notebooks, pipelines, Dataflow Gen2, semantic models, T-SQL' },
  varlibSecret: { category: 'fabric-varlib-git', note: 'Sensitive value handling and Key Vault integration' },
  git: { category: 'fabric-varlib-git', note: 'Git integration: workspace-per-branch, sync direction, conflict UI' },
  gitItems: { category: 'fabric-varlib-git', note: 'Git item-type support and metadata YAML/JSON file format' },
  gitBranchOut: { category: 'fabric-varlib-git', note: 'Branch out: spawn a workspace from a feature branch' },
  cicd: { category: 'fabric-varlib-git', note: 'CI/CD via Fabric REST APIs + Service Principal / workspace identity' },
  combo: { category: 'fabric-varlib-git', note: 'Combining Git + deployment pipelines + variable libraries for prod ALM' }
};

export const varLibGitDeep: Question[] = [
  // ── Variable Libraries: fundamentals ──────────────────────────
  single({
    id: 'vlg-001', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 3,
    prompt: 'Variable Libraries are a 2024 Fabric item type introduced to centralize configuration. What is their scope?',
    options: [
      'Tenant-scoped — one global library per Fabric tenant',
      'Workspace-scoped — each variable library lives inside a single workspace and is consumed by items in that workspace',
      'Capacity-scoped — bound to an F-SKU and shared by all workspaces on that capacity',
      'User-scoped — each user maintains a personal variable library across their workspaces'
    ],
    correct: 1,
    explanation: 'Variable libraries are a workspace-scoped item type. They live inside a workspace alongside notebooks, pipelines, and semantic models, and are consumed by items in the same workspace. Cross-workspace consumption is not the binding model — promote the library through the deployment pipeline alongside its consumers.',
    whyWrong: {
      0: 'There is no tenant-level variable library. Configuration centralization is per-workspace.',
      2: 'Variable libraries are independent of capacity SKU.',
      3: 'No per-user library exists; they are shared workspace artifacts governed by workspace roles.'
    },
    source: SRC.varlib,
    tags: ['variable-libraries', 'scope', 'workspace-scoped', '2024-feature']
  }),

  single({
    id: 'vlg-002', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 3,
    prompt: 'A variable library defines an "active value set" and one or more "alternate value sets". What does the active value set represent?',
    options: [
      'The set of values that consumers currently bind to — exactly one value set is active per workspace at a time',
      'A historical archive of previously deployed values for rollback',
      'The default values the library was created with; alternates are merged on top',
      'A read-only set provided by Microsoft for common Azure regions'
    ],
    correct: 0,
    explanation: 'The active value set is the live binding for that workspace. Consumers (notebooks, pipelines, semantic models) read from whichever value set is currently active. Alternate value sets exist so that Dev / Test / Prod workspaces each activate the value set appropriate for their environment after promotion.',
    whyWrong: {
      1: 'Value sets are not historical archives; they are live alternate configurations.',
      2: 'There is no merge / overlay semantics — the active set is the resolved set, full stop.',
      3: 'Value sets are entirely user-defined; no Microsoft-provided defaults exist.'
    },
    source: SRC.varlibSets,
    tags: ['variable-libraries', 'active-value-set', 'value-sets']
  }),

  multi({
    id: 'vlg-003', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 4,
    prompt: 'Which Fabric item types can CONSUME values from a variable library in the same workspace? Select all that apply.',
    options: [
      'Notebooks (Spark / Python / SparkSQL)',
      'Data Pipelines (Data Factory in Fabric)',
      'Dataflow Gen2',
      'Semantic models (via parameterization)',
      'Fabric Warehouse T-SQL (via parameter binding in pipeline activities)',
      'Workspace role assignments (RLS roles)'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation: 'Variable library values are surfaced to notebooks, data pipelines, Dataflow Gen2, semantic models, and T-SQL paths invoked from pipelines. RLS role MEMBERSHIPS are NOT variable-driven — they are workspace-stage-specific assignments managed in the model security settings, not in a library.',
    whyWrong: {
      5: 'RLS role memberships are not variable-library consumers. Membership lives on the semantic model security configuration and does not promote via library values.'
    },
    source: SRC.varlibConsume,
    tags: ['variable-libraries', 'consumers', 'rls-membership-trap']
  }),

  single({
    id: 'vlg-004', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 4,
    prompt: 'A team currently uses Deployment Pipeline parameter rules to swap a SQL connection string between Dev / Test / Prod. They want to migrate to variable libraries. Why might this be the recommended modern pattern?',
    options: [
      'Variable libraries replace parameter rules entirely; pipeline rules are deprecated and removed',
      'Variable libraries centralize values once and let multiple consumers bind by name, while parameter rules must be re-declared per item on every target stage',
      'Variable libraries are required because parameter rules cannot bind SQL connection strings',
      'Variable libraries are faster at runtime than parameter rules'
    ],
    correct: 1,
    explanation: 'Variable libraries are the modern, DRY replacement for stage-by-stage parameter rules. You declare a value once per environment (in alternate value sets), and any consumer in any item can bind to it by name. Parameter rules require re-declaring an override for every parameterized item on every target stage and are case-sensitive on the parameter name (a known footgun).',
    whyWrong: {
      0: 'Parameter rules still work and are not removed. Variable libraries are an additional / preferred mechanism, not a forced replacement.',
      2: 'Parameter rules absolutely can bind connection strings — that is the original Data Source Rule use case.',
      3: 'Runtime performance is not the differentiator; authoring-time DRYness and centralization are.'
    },
    source: SRC.varlib,
    relatedIds: ['dpd-007', 'dpd-008'],
    tags: ['variable-libraries', 'vs-parameter-rules', 'modern-pattern']
  }),

  single({
    id: 'vlg-005', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 4,
    prompt: 'A notebook in the Dev workspace reads a variable named `bronze_path` from the workspace variable library. After promoting Dev → Test (with the library and notebook both deployed), the Test notebook reads which value?',
    options: [
      'Whatever value `bronze_path` had in Dev — the value travels with the notebook',
      'The value of `bronze_path` in the active value set of the Test workspace\'s library — bindings re-resolve in the target environment',
      'NULL until an admin manually re-binds the variable in Test',
      'The value cached in the deployment pipeline at promotion time'
    ],
    correct: 1,
    explanation: 'Variable bindings are resolved by name against the consuming workspace\'s active value set. After promotion, the Test notebook references the same variable name, but the value comes from Test\'s library / Test\'s active value set. This is the central reason variable libraries beat hard-coded values for environment-specific configuration.',
    whyWrong: {
      0: 'Values do not travel with the notebook — only the variable reference does. The library in the target workspace supplies the value.',
      2: 'Bindings resolve automatically; no manual re-bind step exists.',
      3: 'The pipeline does not snapshot or cache library values at promotion; resolution is lazy at consumer runtime.'
    },
    source: SRC.varlibSets,
    tags: ['variable-libraries', 'binding-resolution', 'promotion']
  }),

  single({
    id: 'vlg-006', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 4,
    prompt: 'You change the active value set of a variable library from "Dev" to "Test" inside a single workspace. What happens to existing consumers?',
    options: [
      'Consumers must be re-published before they pick up the new values',
      'Consumers re-resolve variable references on next execution and use the new active value set\'s values automatically',
      'Existing notebook sessions keep the old values; only newly-created items see the change',
      'The change is rejected unless all consumers are first detached from the library'
    ],
    correct: 1,
    explanation: 'Variable references are resolved at consumer execution time against the current active value set. Switching the active set from Dev to Test means the next pipeline run, notebook execution, or model refresh reads the new values — no re-publish needed. (Long-running cached sessions may still hold the old value until restart, but the binding itself is dynamic.)',
    whyWrong: {
      0: 'No re-publish is required; the binding is by name, resolved at runtime.',
      2: 'New items are not the differentiator — already-deployed consumers participate.',
      3: 'There is no detach-required gate on switching the active value set.'
    },
    source: SRC.varlibSets,
    tags: ['variable-libraries', 'active-set-switch', 'binding-model']
  }),

  multi({
    id: 'vlg-007', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 5,
    prompt: 'How should sensitive values (passwords, connection secrets) be handled in variable libraries? Select all that apply.',
    options: [
      'Store the secret value verbatim in the variable library — workspace roles gate access',
      'Reference an Azure Key Vault secret URI from the variable so resolution fetches the live secret at runtime',
      'Mark variables as sensitive so the value is masked in the UI and not exposed in plain text to viewers',
      'Combine variable libraries with workspace identity / Service Principal so the runtime that resolves the Key Vault reference has the right RBAC',
      'Embed the secret in the notebook directly to bypass the library — variable libraries cannot hold secrets'
    ],
    correct: [1, 2, 3],
    explanation: 'Best practice: keep the actual secret in Key Vault, store the URI (and optional metadata) in the variable library, mark sensitive values so the UI redacts them, and grant the workspace identity (or Service Principal) Key Vault access so the resolution path can fetch the live secret. Storing the raw secret in the library defeats the purpose, and variable libraries do support secret-style references — embedding the secret in the notebook is the worst option.',
    whyWrong: {
      0: 'Storing raw secrets in the library is a credential-hygiene failure — workspace role gating is not equivalent to a secret-vault access control.',
      4: 'Variable libraries explicitly support secret-style references; embedding the secret in code is exactly what libraries exist to prevent.'
    },
    source: SRC.varlibSecret,
    tags: ['variable-libraries', 'secrets', 'key-vault', 'workspace-identity']
  }),

  multi({
    id: 'vlg-008', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 4,
    prompt: 'Which statements about variable libraries combined with Git integration are TRUE? Select all that apply.',
    options: [
      'A variable library item is included in the workspace\'s Git sync — its definition (variable names, value sets, structure) lives in the connected repo',
      'Sensitive values stored in the library are committed to Git in plain text',
      'The active value set selection on a workspace is per-workspace state; you can keep different active sets in Dev / Test / Prod even though the library definition is shared via Git',
      'Variable libraries cannot be Git-tracked; they must be re-created manually per environment'
    ],
    correct: [0, 2],
    explanation: 'Variable library definitions ARE Git-tracked — variable names, structure, and the value-set scaffolding live in the repo as metadata. Sensitive values are NOT committed in plain text (Key Vault references or masked sensitive markers are what travel). And critically, "which value set is active" is per-workspace state — Dev activates its set, Test activates its set, even from the same Git source.',
    whyWrong: {
      1: 'Sensitive values are masked / referenced, not committed in plain text. This is the foundation of safe Git + library coexistence.',
      3: 'Variable libraries are first-class Git-tracked items; manual re-creation is exactly what they exist to prevent.'
    },
    source: SRC.combo,
    tags: ['variable-libraries', 'git-integration', 'sensitive-values', 'active-set-state']
  }),

  single({
    id: 'vlg-009', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 3,
    prompt: 'A consumer notebook references a variable name `lakehouse_uri` that does NOT exist in the workspace\'s variable library. What happens at execution time?',
    options: [
      'The notebook silently substitutes an empty string and continues',
      'Resolution fails — the consumer raises an error indicating the variable could not be resolved',
      'Fabric auto-creates the variable with a NULL value and continues',
      'The notebook is blocked from running until an admin defines the variable'
    ],
    correct: 1,
    explanation: 'Missing variable references fail loudly at resolution time. The runtime cannot infer a sensible default and refuses to silently substitute, which would be a silent-failure footgun. Define the variable in the library (or remove the reference) before promoting the consumer.',
    whyWrong: {
      0: 'Silent empty-string substitution would mask configuration mistakes — explicitly avoided.',
      2: 'No auto-creation; the library is authoritative.',
      3: 'No global block on the notebook; the failure surfaces at execution time on the specific reference.'
    },
    source: SRC.varlibConsume,
    tags: ['variable-libraries', 'missing-variable', 'fail-loud']
  }),

  single({
    id: 'vlg-010', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 5,
    prompt: 'A team wants ONE shared connection string consumed by 12 notebooks and 4 pipelines, with environment-specific values for Dev / Test / Prod. Which design is the LEAST coupled and easiest to maintain?',
    options: [
      'Hard-code the connection string per item; on promotion, rely on Deployment Pipeline parameter rules (one rule per item) to override',
      'Define a single variable in a workspace variable library; create alternate value sets per environment; have all 16 consumers bind to the variable name; activate the appropriate set in each workspace',
      'Pass the connection string as an input parameter from a master pipeline that wraps every notebook and pipeline call',
      'Store the connection string in a control table in the warehouse and SELECT it at the start of every notebook'
    ],
    correct: 1,
    explanation: 'A single library variable + per-environment value sets is the canonical centralized config pattern. One declaration, 16 consumers binding by name, environment differences expressed once per environment in the alternate value sets. The other options re-introduce per-item duplication, hidden coupling, or runtime fan-out — all of which the variable library was designed to eliminate.',
    whyWrong: {
      0: 'One parameter rule per item per stage is exactly the per-item duplication variable libraries fix.',
      2: 'Master-pipeline injection adds runtime coupling, breaks notebooks running standalone, and does not solve env-specific values without re-introducing parameterization.',
      3: 'Reading config from a warehouse table at every run adds network hops, latency, and a cross-cutting dependency for what is essentially static configuration.'
    },
    source: SRC.varlib,
    tags: ['variable-libraries', 'design-pattern', 'centralized-config']
  }),

  single({
    id: 'vlg-011', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 4,
    prompt: 'After updating a variable\'s value in the active value set of a workspace\'s library, when does a downstream Data Pipeline see the new value?',
    options: [
      'Only after the pipeline is re-published',
      'On the pipeline\'s NEXT execution — variable references resolve at run time against the current active value set',
      'After the workspace is restarted',
      'After a 24-hour cache TTL elapses'
    ],
    correct: 1,
    explanation: 'Variable resolution for pipelines is lazy: the value is read at activity execution time. Updating the value in the active set takes effect on the very next run. There is no publish, restart, or TTL gate.',
    whyWrong: {
      0: 'No re-publish is required; bindings are by name and resolved fresh per run.',
      2: 'Workspaces are not restarted in this sense; resolution is per-execution.',
      3: 'There is no 24-hour cache between the library and the pipeline; resolution is on-demand.'
    },
    source: SRC.varlibConsume,
    tags: ['variable-libraries', 'refresh-semantics', 'on-demand-resolution']
  }),

  single({
    id: 'vlg-012', domain: 'maintain', subtopic: 'variable-libraries', difficulty: 4,
    prompt: 'A semantic model in Direct Lake mode parameterizes its SQL endpoint via a value sourced from a variable library. After switching the active value set in Test from "Dev" to "Test", when does the semantic model start hitting the Test endpoint?',
    options: [
      'Immediately — Direct Lake auto-detects the new endpoint',
      'After the model is reframed (next refresh / on-demand reframe) which re-resolves the bound endpoint to the new active value',
      'Never — Direct Lake endpoints cannot be parameterized via variable libraries',
      'Only after the workspace capacity is restarted'
    ],
    correct: 1,
    explanation: 'Direct Lake binds to its source on framing. Updating the variable changes the value the model will read on the next reframe, but in-flight cached frames keep pointing at the old endpoint until reframed. Trigger a refresh or on-demand reframe to pick up the new binding cleanly.',
    whyWrong: {
      0: 'Direct Lake does not auto-poll for endpoint changes; reframing is the trigger.',
      2: 'Variable library values absolutely flow into model parameterization, including Direct Lake source bindings.',
      3: 'Capacity restart is not the mechanism; reframing the model is.'
    },
    source: SRC.varlibConsume,
    relatedIds: ['vlg-006', 'vlg-011'],
    tags: ['variable-libraries', 'direct-lake', 'reframing', 'binding-refresh']
  }),

  // ── Git Integration: fundamentals ─────────────────────────────
  single({
    id: 'vlg-013', domain: 'maintain', subtopic: 'git-integration', difficulty: 3,
    prompt: 'Fabric Git integration binds a workspace to a Git repository. Which Git providers are supported as of the 2024-2026 GA window?',
    options: [
      'Azure DevOps Repos only',
      'GitHub only',
      'Azure DevOps Repos AND GitHub',
      'Any provider that exposes a Git over HTTPS endpoint, including Bitbucket and self-hosted GitLab'
    ],
    correct: 2,
    explanation: 'Fabric Git integration supports Azure DevOps Repos and GitHub as first-class providers. Bitbucket / self-hosted GitLab are NOT in the supported list as of the 2024-2026 GA window. Pick whichever of the two matches your org\'s existing source-control standard.',
    whyWrong: {
      0: 'GitHub is supported; Azure DevOps is not the only option.',
      1: 'Azure DevOps Repos is supported; GitHub is not the only option.',
      3: 'Generic Git-over-HTTPS is not the integration model — only Azure DevOps Repos and GitHub are supported.'
    },
    source: SRC.git,
    tags: ['git-integration', 'providers', 'azure-devops', 'github']
  }),

  single({
    id: 'vlg-014', domain: 'maintain', subtopic: 'git-integration', difficulty: 4,
    prompt: 'A team adopts the canonical Fabric Git pattern: one workspace per branch. Where is the Dev workspace bound, where is the Test workspace bound, where is the Prod workspace bound?',
    options: [
      'All three workspaces bound to the `main` branch; differences emerge from deployment rules',
      'Dev → `dev` (or feature) branch; Test → `test` branch; Prod → `main` (or `release`) branch — each workspace tracks the branch that represents its environment',
      'Each workspace binds to a tag; branches are not used',
      'Workspaces share a single branch but use different commit ranges'
    ],
    correct: 1,
    explanation: 'Workspace-per-branch is the canonical pattern: each workspace is bound to the branch that represents its environment (Dev tracks the dev / feature branch, Test tracks test, Prod tracks main or release). Promotion through environments mirrors merging upward in Git, while the deployment pipeline still moves the materialized artifacts between workspace-stages.',
    whyWrong: {
      0: 'Binding all three to `main` defeats the branch-based promotion model.',
      2: 'Tags are not the binding unit; branches are.',
      3: 'Commit-range scoping is not how Fabric binds workspaces — branch is the only binding unit.'
    },
    source: SRC.git,
    tags: ['git-integration', 'workspace-per-branch', 'pattern']
  }),

  multi({
    id: 'vlg-015', domain: 'maintain', subtopic: 'git-integration', difficulty: 4,
    prompt: 'Which directions of sync are supported between a Git-connected Fabric workspace and its repo? Select all that apply.',
    options: [
      'Workspace → Git: commit current workspace state to the connected branch ("Source control" pane)',
      'Git → Workspace: pull the connected branch HEAD into the workspace ("Update workspace")',
      'Continuous bidirectional auto-sync without user action',
      'Cross-branch sync: a single workspace simultaneously bound to multiple branches'
    ],
    correct: [0, 1],
    explanation: 'Git integration is explicitly two-direction, BOTH user-triggered: commit workspace → Git, and Update workspace ← Git. There is no continuous auto-sync (a critical pause-point — silent auto-sync would race against in-progress edits). And a workspace binds to exactly one branch at a time.',
    whyWrong: {
      2: 'Auto-sync would race against edits — Fabric explicitly requires user-initiated sync in both directions.',
      3: 'A workspace is bound to one branch only; multi-branch binding is achieved via multiple workspaces (workspace-per-branch).'
    },
    source: SRC.git,
    tags: ['git-integration', 'sync-direction', 'manual-sync']
  }),

  single({
    id: 'vlg-016', domain: 'maintain', subtopic: 'git-integration', difficulty: 4,
    prompt: 'A developer commits a notebook change in the workspace, AND a colleague directly pushes a change to the same notebook on the same branch from outside Fabric. The developer then clicks "Update workspace". What does Fabric show?',
    options: [
      'Silent overwrite — the workspace state is replaced with the branch HEAD',
      'A conflict resolution UI in workspace settings prompting the developer to choose workspace, branch, or merge per item',
      'The Update is rejected — direct pushes outside Fabric are not allowed on connected branches',
      'A queued merge that auto-resolves on the next commit'
    ],
    correct: 1,
    explanation: 'When workspace state and branch HEAD diverge on the same item, Fabric surfaces a conflict resolution UI inside workspace settings. The developer chooses workspace-side, branch-side, or merges per item. Silent overwrite would lose work; rejection of out-of-Fabric pushes is not the model.',
    whyWrong: {
      0: 'Silent overwrite would destroy in-progress work — explicitly avoided.',
      2: 'Direct out-of-Fabric pushes are entirely allowed; that is the whole point of Git integration.',
      3: 'There is no auto-merge queue; resolution is interactive.'
    },
    source: SRC.git,
    tags: ['git-integration', 'conflict-resolution']
  }),

  multi({
    id: 'vlg-017', domain: 'maintain', subtopic: 'git-integration', difficulty: 4,
    prompt: 'Which Fabric item types are supported in Git integration as of the 2024-2026 GA window? Select all that apply.',
    options: [
      'Notebooks',
      'Data Pipelines',
      'Semantic Models',
      'Reports (Power BI)',
      'Lakehouses (metadata only — table data is NOT versioned in Git)',
      'Warehouses',
      'Workspace role assignments (membership)'
    ],
    correct: [0, 1, 2, 3, 4, 5],
    explanation: 'Notebooks, Data Pipelines, Semantic Models, Reports, Lakehouses (metadata only — Delta data lives in OneLake, not Git), and Warehouses are all supported. The supported set has expanded across 2024-2026 GA waves. Workspace role assignments (membership) are NOT a Git-tracked artifact — those live in workspace settings and travel via tenant directory groups, not Git.',
    whyWrong: {
      6: 'Workspace role membership is governance state, not an artifact. It is not represented in the Git sync.'
    },
    source: SRC.gitItems,
    tags: ['git-integration', 'supported-items', 'lakehouse-metadata']
  }),

  single({
    id: 'vlg-018', domain: 'maintain', subtopic: 'git-integration', difficulty: 4,
    prompt: 'How is a Fabric notebook represented in the connected Git repo?',
    options: [
      'As a single binary `.notebook` blob — opaque to text diffing',
      'As a logical folder containing metadata files (YAML / JSON) plus the notebook content (e.g. `.ipynb` or platform-equivalent), so diffs are reviewable in pull requests',
      'As a base64-encoded string inside a single `notebook.txt` file',
      'As a SQL Server backup (`.bak`) file'
    ],
    correct: 1,
    explanation: 'Items are serialized as logical folders containing metadata files (YAML / JSON) plus the artifact content (notebook source, model TMDL/TMSL, report visuals, etc.). This is what makes meaningful PR review and diffing possible — reviewers can see exactly which measure, cell, or visual changed.',
    whyWrong: {
      0: 'Opaque binary blobs would defeat the purpose of source control; deliberately avoided.',
      2: 'Base64 inside a single text file is not the format and would defeat diffing.',
      3: 'SQL backup format is unrelated.'
    },
    source: SRC.gitItems,
    tags: ['git-integration', 'file-format', 'metadata-yaml-json']
  }),

  single({
    id: 'vlg-019', domain: 'maintain', subtopic: 'git-integration', difficulty: 4,
    prompt: 'A developer wants to start a new feature in isolation without disturbing the main Dev workspace. Fabric\'s "Branch out" feature does what?',
    options: [
      'Forks the entire tenant into a sandbox',
      'Creates a new workspace, creates a new branch in the connected repo, and binds the new workspace to the new branch — letting the developer iterate in isolation and merge back later via a PR',
      'Creates a new branch in Git only — the developer must manually create and bind a workspace',
      'Adds a new stage to the deployment pipeline'
    ],
    correct: 1,
    explanation: '"Branch out" is the one-click pattern for feature isolation: new workspace + new branch + binding, all in one action. The developer iterates in their own workspace, commits to the feature branch, opens a PR to merge upstream, and then the main Dev workspace pulls the merged change.',
    whyWrong: {
      0: 'Tenant-level forking is not a Fabric concept and would be enormous.',
      2: 'Branch out also creates and binds the workspace — that is the value-add over a manual `git checkout -b`.',
      3: 'Deployment pipeline stages are unrelated to branching.'
    },
    source: SRC.gitBranchOut,
    tags: ['git-integration', 'branch-out', 'feature-isolation']
  }),

  multi({
    id: 'vlg-020', domain: 'maintain', subtopic: 'cicd', difficulty: 5,
    prompt: 'A team automates Fabric CI/CD via the Fabric REST APIs. Which authentication / identity options can drive automated deployments? Select all that apply.',
    options: [
      'Service Principal granted appropriate workspace roles and Fabric tenant settings enabled',
      'Workspace identity (Fabric-managed identity scoped to the workspace) for actions that support it',
      'A personal user access token from one developer\'s account',
      'Anonymous authentication if the workspace is set to public'
    ],
    correct: [0, 1],
    explanation: 'Service Principals (with the relevant tenant setting enabled and workspace roles assigned) and workspace identities are the supported automation paths. Personal user tokens are an anti-pattern (single-point-of-failure when the dev leaves) and there is no anonymous auth path — Fabric workspaces are not publicly accessible.',
    whyWrong: {
      2: 'Personal user tokens couple production deployments to one developer\'s account — explicitly anti-pattern even though technically possible.',
      3: 'There is no public / anonymous workspace access; Fabric requires authenticated identity for all operations.'
    },
    source: SRC.cicd,
    tags: ['cicd', 'service-principal', 'workspace-identity', 'rest-api']
  }),

  single({
    id: 'vlg-021', domain: 'maintain', subtopic: 'cicd', difficulty: 4,
    prompt: 'Which statement BEST captures the relationship between Git integration and Deployment Pipelines in Fabric?',
    options: [
      'Git replaces Deployment Pipelines — modern teams should drop pipelines',
      'Deployment Pipelines replace Git — Git is for hobby projects',
      'They are complementary: Git provides source control + branching + PR review; Deployment Pipelines provide the in-Fabric promotion mechanism (Dev → Test → Prod) with deployment rules and stage pairing',
      'They overlap so heavily that picking either alone is sufficient — they cannot coexist productively'
    ],
    correct: 2,
    explanation: 'Git and Deployment Pipelines solve different problems: Git is the source-control layer (branching, history, peer review, conflict detection); Deployment Pipelines are the in-Fabric promotion layer (stage pairing, deployment rules, selective deploy, backward deploy). Mature teams use both — Git on Dev for source control, pipelines for the Dev → Test → Prod handoff.',
    whyWrong: {
      0: 'Pipelines provide stage-paired promotion semantics that Git alone does not.',
      1: 'Git provides source control / branching / PR review that Pipelines alone do not.',
      3: 'They explicitly coexist productively and Microsoft documentation recommends the combo for production ALM.'
    },
    source: SRC.combo,
    relatedIds: ['dpd-013', 'dpd-014'],
    tags: ['cicd', 'git-vs-pipelines', 'complementary']
  }),

  // ── Ordering: end-to-end ALM workflow ─────────────────────────
  order({
    id: 'vlg-022', domain: 'maintain', subtopic: 'lifecycle', difficulty: 5,
    prompt: 'A team is standing up Git + Deployment Pipelines + Variable Libraries from scratch for a Dev / Test / Prod ALM. Place these setup steps in the correct order.',
    options: [
      'Create the Dev / Test / Prod workspaces and assign workspace roles',
      'Create a variable library in the Dev workspace defining variables needed by all consumers; configure alternate value sets for each environment',
      'Connect the Dev workspace to a Git repo on the appropriate branch (e.g. `dev`) and commit the initial workspace state including the variable library',
      'Create a Deployment Pipeline, pair Dev / Test / Prod workspaces into the three stages',
      'Promote Dev → Test through the pipeline so the variable library exists in Test; activate the "Test" value set on the Test workspace',
      'Promote Test → Prod through the pipeline; activate the "Prod" value set on the Prod workspace',
      'Wire a CI/CD job that uses a Service Principal to call the Fabric REST API for automated promotions on merge to `main`'
    ],
    explanation: 'Build foundation first: workspaces and roles → centralized config (variable library + value sets) → source control (Git on Dev) → in-Fabric promotion mechanism (deployment pipeline pairing) → promote forward and activate the env-appropriate value sets at each stage → finally automate via REST + Service Principal. Skipping the variable library before promotion forces parameter-rule sprawl on every item; skipping value-set activation post-promotion leaves Test / Prod pointing at Dev resources.',
    source: SRC.combo,
    tags: ['lifecycle', 'alm-setup', 'ordering', 'end-to-end']
  }),

  // ── Scenario combos ───────────────────────────────────────────
  single({
    id: 'vlg-023', domain: 'maintain', subtopic: 'workspace-admin', difficulty: 5,
    prompt: 'A team currently uses workspace-per-branch with Git, but does NOT use deployment pipelines — they merge branches and rely on workspaces auto-pulling latest. They want safer Dev → Test → Prod handoffs without abandoning Git. What should they add?',
    options: [
      'Replace Git integration with a deployment pipeline only',
      'Keep Git integration on each workspace, AND add a deployment pipeline that pairs the workspaces into stages — so promotions go through the pipeline UI with deployment rules, while Git still tracks history',
      'Add a separate Git repo per workspace to physically isolate environments',
      'Switch all three workspaces to track `main` so they stay aligned'
    ],
    correct: 1,
    explanation: 'The combo: Git stays for source control + branching + PR history; the deployment pipeline adds stage pairing, deployment rules, and a controlled promotion UI. Replacing Git would lose source control. Per-workspace separate repos breaks the workspace-per-branch model. Pointing all three workspaces at `main` collapses the environment isolation entirely.',
    whyWrong: {
      0: 'Replacing Git loses branch history, PR review, and commit-level diffs — significant regression.',
      2: 'Per-workspace separate repos breaks the canonical workspace-per-branch model and prevents merging features upward.',
      3: 'All three workspaces on `main` removes environment isolation — Test would see Dev work the moment it merges.'
    },
    source: SRC.combo,
    tags: ['workspace-admin', 'git-plus-pipelines', 'safer-promotion']
  }),

  multi({
    id: 'vlg-024', domain: 'maintain', subtopic: 'workspace-admin', difficulty: 5,
    prompt: 'A regulated-industry team needs strict ALM: PR-reviewed changes only, automated promotion on merge to `main`, env-specific connection strings, and zero secrets in the repo. Which combination is appropriate? Select all that apply.',
    options: [
      'Git integration on Dev (PRs reviewed in Azure DevOps / GitHub before merge to `main`)',
      'Variable libraries with Key Vault references for env-specific connection strings and secrets',
      'Deployment pipelines for Dev → Test → Prod promotion with deployment rules where library coverage is incomplete',
      'A Service Principal-driven CI job that triggers Fabric REST API promotions on successful merge to `main`',
      'Hard-coded production credentials in a notebook for "always-on" reliability',
      'A single shared workspace where all three environments coexist for simplicity'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'Regulated ALM combo: Git for PR review, variable libraries + Key Vault for env config and secrets, deployment pipelines for the stage-paired promotion (with rules as a fallback for any non-library-covered binding), and a Service Principal CI job for automation. Hard-coded prod creds in a notebook is a credential-hygiene incident; a single shared workspace eliminates environment isolation entirely.',
    whyWrong: {
      4: 'Hard-coded credentials in source files are a credential-hygiene incident — any plaintext secret in a notebook can leak via Git, exports, or screenshots.',
      5: 'A single shared workspace removes the environment boundary that the entire ALM model rests on.'
    },
    source: SRC.combo,
    tags: ['workspace-admin', 'regulated-alm', 'best-practice-combo']
  }),

  single({
    id: 'vlg-025', domain: 'maintain', subtopic: 'lifecycle', difficulty: 4,
    prompt: 'A developer pushed a fix to the `dev` branch from outside Fabric (via VS Code). They open the Dev workspace and immediately deploy Dev → Test through the pipeline. The fix is NOT in Test. Why?',
    options: [
      'The deployment pipeline reads from the Git branch — it must have failed to read the latest commit',
      'The Dev workspace has not yet pulled the new commit ("Update workspace"). The pipeline promotes the workspace state, not the branch HEAD — so the unapplied push did not promote',
      'The pipeline only deploys committed changes that originated in the workspace UI',
      'Test stage rejects pushes that did not originate from a PR'
    ],
    correct: 1,
    explanation: 'Deployment pipelines promote workspace STATE, not Git branch state. A push to the connected branch shows up as "pending updates" in the workspace; until someone clicks "Update workspace" (or runs the equivalent automation), the workspace state — and therefore what gets promoted — does not include the push. This is the most common Git + pipelines integration footgun.',
    whyWrong: {
      0: 'The pipeline does not read directly from Git; it reads workspace state.',
      2: 'There is no provenance gate based on where a commit originated.',
      3: 'There is no PR-gate at the pipeline layer — that gate lives in the Git provider, not in Fabric promotion.'
    },
    source: SRC.combo,
    relatedIds: ['dpd-014'],
    tags: ['lifecycle', 'git-plus-pipelines', 'pending-updates', 'silent-trap']
  })
];
